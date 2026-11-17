from datetime import datetime, timezone
from typing import AsyncGenerator
import logging
from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, Session
from app.core.config import settings

logger = logging.getLogger(__name__)

# Primary async engine
engine = create_async_engine(
    settings.async_database_url,
    echo=False,
    future=True,
    connect_args={"check_same_thread": False} if "sqlite" in settings.async_database_url else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

Base = declarative_base()


def utcnow_naive() -> datetime:
    """Return timezone-naive UTC datetime for PostgreSQL asyncpg compatibility."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


@event.listens_for(Session, "before_flush")
def _strip_timezone_before_flush(session, flush_context, instances):
    """Ensure all datetime values are timezone-naive UTC for PostgreSQL asyncpg compatibility."""
    try:
        for obj in list(session.new) + list(session.dirty):
            for attr in obj.__mapper__.column_attrs:
                val = getattr(obj, attr.key, None)
                if isinstance(val, datetime) and val.tzinfo is not None:
                    setattr(obj, attr.key, val.astimezone(timezone.utc).replace(tzinfo=None))
    except Exception as e:
        logger.debug(f"before_flush timezone check notice: {e}")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()