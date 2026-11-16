import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine, Base
from app.core.exceptions import register_exception_handlers
from app.core.seeder import seed_database
from app.api.router import api_router
from app.api.v1 import websocket
# Import all 12 models to ensure they register on Base.metadata
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
    ToolLog,
    AIFeedback,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is created and initial data is seeded
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema verified/created successfully.")
        
        # Seed initial data
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            await seed_database(session)
    except Exception as e:
        logger.warning(f"Database schema auto-creation encountered notice: {e}")
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Circle AI — AI-first Customer Support Platform for Circle Network ISP (Bangladesh)",
    lifespan=lifespan
)

# Register centralized error handlers
register_exception_handlers(app)

# Configure CORS
origins = settings.BACKEND_CORS_ORIGINS
if not origins or "*" in origins:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
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
