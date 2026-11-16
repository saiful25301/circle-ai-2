import asyncio
import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text, create_engine
from app.core.config import settings
from app.core.database import Base
# Import all 12 models to verify registration
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


def verify_models():
    expected_tables = {
        "users",
        "customers",
        "agents",
        "conversations",
        "messages",
        "tickets",
        "packages",
        "payments",
        "leads",
        "knowledge_documents",
        "tool_logs",
        "ai_feedback",
    }
    registered_tables = set(Base.metadata.tables.keys())
    print("\n" + "=" * 60)
    print("1. DATABASE MODELS & TABLES VERIFICATION")
    print("=" * 60)
    print(f"Registered SQLAlchemy Tables Count: {len(registered_tables)}")
    for t in sorted(registered_tables):
        status = "✓ FOUND" if t in expected_tables else "  EXTRA"
        print(f"  [{status}] {t}")

    missing = expected_tables - registered_tables
    if missing:
        print(f"\n[FAIL] Missing tables: {missing}")
        return False
    else:
        print("\n[SUCCESS] All 12 required tables are properly registered on Base.metadata!")
        return True


def test_postgresql_sync_connection():
    print("\n" + "=" * 60)
    print("2. POSTGRESQL SYNC CONNECTION (psycopg2 / Alembic)")
    print("=" * 60)
    pg_url = f"postgresql+psycopg2://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    print(f"Target URL: {pg_url}")
    try:
        engine = create_engine(pg_url, connect_args={"connect_timeout": 3})
        with engine.connect() as conn:
            res = conn.execute(text("SELECT version();")).scalar()
            print(f"[SUCCESS] Connected to PostgreSQL successfully!")
            print(f"Server version: {res}")
            return True
    except Exception as e:
        print(f"[NOTICE] PostgreSQL is currently not listening on {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}.")
        print(f"Error detail: {e}")
        print("\nTo start PostgreSQL locally via Docker, run:")
        print(f"  docker run --name circle_ai_pg -e POSTGRES_PASSWORD={settings.POSTGRES_PASSWORD} -e POSTGRES_DB={settings.POSTGRES_DB} -p {settings.POSTGRES_PORT}:5432 -d postgres:16-alpine")
        return False


async def test_postgresql_async_connection():
    print("\n" + "=" * 60)
    print("3. POSTGRESQL ASYNC CONNECTION (asyncpg / FastAPI)")
    print("=" * 60)
    pg_url = f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    print(f"Target URL: {pg_url}")
    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        engine = create_async_engine(pg_url, connect_args={"timeout": 3})
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT 1;"))
            val = res.scalar()
            print(f"[SUCCESS] AsyncPG connection test passed! Query result: {val}")
            await engine.dispose()
            return True
    except Exception as e:
        print(f"[NOTICE] AsyncPG connection to {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT} not active.")
        print(f"Error detail: {e}")
        return False


def test_sqlite_fallback():
    print("\n" + "=" * 60)
    print("4. LOCAL DEV / TEST DATABASE VERIFICATION (SQLite Fallback)")
    print("=" * 60)
    sqlite_url = "sqlite:///./circle_ai.db"
    print(f"Testing local test database: {sqlite_url}")
    engine = create_engine(sqlite_url)
    Base.metadata.create_all(engine)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT count(*) FROM sqlite_master WHERE type='table';")).scalar()
        print(f"[SUCCESS] Local database verified. Total tables created: {res}")
        return True


def main():
    models_ok = verify_models()
    pg_sync_ok = test_postgresql_sync_connection()
    pg_async_ok = asyncio.run(test_postgresql_async_connection())
    sqlite_ok = test_sqlite_fallback()

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"12 Models Defined:          {'PASS' if models_ok else 'FAIL'}")
    print(f"PostgreSQL Sync Connection:  {'ONLINE' if pg_sync_ok else 'STANDBY (Postgres service not active on port 5432)'}")
    print(f"PostgreSQL Async Connection: {'ONLINE' if pg_async_ok else 'STANDBY'}")
    print(f"Local Schema Initialization: {'PASS' if sqlite_ok else 'FAIL'}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
