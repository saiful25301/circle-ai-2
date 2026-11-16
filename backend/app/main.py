from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables if not present
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Circle AI — AI-first Customer Support Platform for Circle Network ISP (Bangladesh)",
    lifespan=lifespan
)

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

app.include_router(api_router, prefix="/api/v1")


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
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "gemini_model": settings.GEMINI_MODEL
    }
