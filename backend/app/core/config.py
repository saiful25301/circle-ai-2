import json
import os
from typing import List, Union, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_ENV_FILE_PATH = os.path.join(_BACKEND_DIR, ".env")


class Settings(BaseSettings):
    PROJECT_NAME: str = "Circle AI"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Security & Authentication
    SECRET_KEY: str = "circle-ai-secret-key-development-minimum-32-characters-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # PostgreSQL Database Settings
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "circle_ai"

    # Direct database connection string (can override individual postgres parameters)
    DATABASE_URL: Optional[str] = None
    SYNC_DATABASE_URL: Optional[str] = None

    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return url
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def sync_database_url(self) -> str:
        if self.SYNC_DATABASE_URL:
            return self.SYNC_DATABASE_URL
        if self.DATABASE_URL:
            # Convert async driver to sync driver for alembic/psycopg2
            url = self.DATABASE_URL
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+psycopg2://", 1)
            elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
            elif "postgresql+asyncpg" in url:
                return url.replace("postgresql+asyncpg", "postgresql+psycopg2")
            elif "sqlite+aiosqlite" in url:
                return url.replace("sqlite+aiosqlite", "sqlite")
            return url
        return f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Google Gemini API
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    GEMINI_FALLBACK_MODELS: List[str] = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.8-flash"]
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"
    EMBEDDING_DIMENSION: int = 768

    # CORS
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    CORS_ORIGINS: Optional[Union[List[str], str]] = None

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        elif isinstance(v, list):
            return v
        return []

    @property
    def cors_origins_list(self) -> List[str]:
        raw = self.CORS_ORIGINS or self.BACKEND_CORS_ORIGINS
        origins: List[str] = []
        if isinstance(raw, str):
            if raw.startswith("["):
                try:
                    origins = json.loads(raw)
                except Exception:
                    origins = [i.strip() for i in raw.split(",") if i.strip()]
            else:
                origins = [i.strip() for i in raw.split(",") if i.strip()]
        elif isinstance(raw, list):
            origins = list(raw)

        # Include standard local development origins
        for default_origin in ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]:
            if default_origin not in origins:
                origins.append(default_origin)
        return origins

    # ISP Meta
    ISP_NAME: str = "Circle Network"
    ISP_SUPPORT_HOTLINE: str = "16207"
    ISP_NEW_CONNECTION_HOTLINE: str = "01611411211"
    ISP_OFFICE_ADDRESS: str = "Unique Heights, Level-8, 117 Kazi Nazrul Islam Avenue, Eskaton, Dhaka, Bangladesh"
    ISP_WEBSITE: str = "https://www.circlenetworkbd.net/bn"
    ISP_SUPPORT_EMAIL: str = "support@circlenetworkbd.net"
    ISP_BKASH_MERCHANT_NO: str = "01844XXXXXX"

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE_PATH,
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
