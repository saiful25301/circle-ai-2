import logging
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.core.exceptions import register_exception_handlers
from app.core.seeder import seed_database
from app.api.router import api_router
from app.api.v1 import websocket
# Import all models to ensure they register on Base.metadata
from app.models import (
    User,
    Agent,
    Package,
    Customer,
    Conversation,
    Message,
    Ticket,
    Payment,
    Lead,
    KnowledgeDocument,
    KnowledgeChunk,
    ToolLog,
    AIFeedback,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. On PostgreSQL, try enabling pgvector extension in its own isolated transaction
    try:
        async with engine.begin() as conn:
            if conn.dialect.name == "postgresql":
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                logger.info("PostgreSQL pgvector extension verified/enabled.")
    except Exception as ext_err:
        logger.warning(f"pgvector extension note (falling back to JSON): {ext_err}")

    # 2. Create all database tables in a clean isolated transaction
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema verified/created successfully.")
    except Exception as schema_err:
        logger.error(f"Database schema creation error: {schema_err}")

    # 3. Ensure optional embedding column exists in an isolated transaction
    try:
        async with engine.begin() as conn:
            await conn.execute(text("ALTER TABLE knowledge_documents ADD COLUMN embedding JSON"))
    except Exception:
        pass

    # 4. Seed initial data
    try:
        async with AsyncSessionLocal() as session:
            await seed_database(session)
        logger.info("Database seeding completed successfully.")
    except Exception as seed_err:
        logger.warning(f"Database seeding notice: {seed_err}")

    yield
    await engine.dispose()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    In-memory sliding-window rate limiting middleware.
    Enforces route-based request thresholds:
      - 10 req/min for auth login (/api/v1/auth/login)
      - 30 req/min for AI chat (/api/v1/ai/chat)
      - 120 req/min for general API routes
    Returns HTTP 429 Too Many Requests with Retry-After header.
    """
    def __init__(self, app):
        super().__init__(app)
        self.requests = defaultdict(list)
        self.last_cleanup = time.time()

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Exempt health checks, docs, and direct websocket connections
        if (
            path in ["/health", "/api/v1/health", "/docs", "/openapi.json", "/redoc"]
            or path.startswith("/ws/")
        ):
            return await call_next(request)

        # Extract client IP (handle proxies)
        forwarded = request.headers.get("x-forwarded-for")
        client_ip = (
            forwarded.split(",")[0].strip()
            if forwarded
            else (request.client.host if request.client else "127.0.0.1")
        )

        now = time.time()
        window = 60.0  # 60 seconds sliding window

        # Periodic cleanup of expired entries
        if now - self.last_cleanup > 300:
            cutoff = now - window
            expired_keys = [k for k, v in self.requests.items() if not any(t > cutoff for t in v)]
            for k in expired_keys:
                self.requests.pop(k, None)
            self.last_cleanup = now

        # Determine threshold by route group
        if path.startswith("/api/v1/auth/login"):
            limit = 10
            group = "auth"
        elif path.startswith("/api/v1/ai/chat"):
            limit = 30
            group = "ai_chat"
        else:
            limit = 120
            group = "general"

        key = f"{client_ip}:{group}"
        history = self.requests[key]

        # Prune timestamps outside current sliding window
        cutoff = now - window
        history = [t for t in history if t > cutoff]
        self.requests[key] = history

        if len(history) >= limit:
            oldest = history[0]
            retry_after = max(1, int(window - (now - oldest)))
            return JSONResponse(
                status_code=429,
                content={"detail": f"Rate limit exceeded for {group}. Please retry after {retry_after} seconds."},
                headers={"Retry-After": str(retry_after)}
            )

        history.append(now)
        return await call_next(request)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Circle AI — AI-first Customer Support Platform for Circle Network ISP (Bangladesh)",
    lifespan=lifespan
)

# Register centralized error handlers
register_exception_handlers(app)

# Register Rate Limiting Middleware
app.add_middleware(RateLimitMiddleware)

# Configure CORS
origins = [o for o in settings.cors_origins_list if o != "*"]
allow_origin_regex = r"https://.*\.onrender\.com"
if "*" in settings.cors_origins_list:
    allow_origin_regex = r".*"

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router and direct websocket routes
app.include_router(api_router, prefix="/api/v1")
app.include_router(websocket.router)


@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "isp": settings.ISP_NAME,
        "status": "operational",
        "docs": "/docs"
    }


@app.get("/health")
@app.get("/api/v1/health")
async def health_check():
    db_status = "unknown"
    dialect = "unknown"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            dialect = conn.dialect.name
            db_status = "connected"
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "database": {
            "status": db_status,
            "dialect": dialect,
            "url": settings.async_database_url.split("@")[-1] if "@" in settings.async_database_url else settings.async_database_url
        },
        "gemini_model": settings.GEMINI_MODEL,
        "isp": settings.ISP_NAME
    }