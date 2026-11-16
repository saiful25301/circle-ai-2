from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, DateTime, JSON
from app.core.database import Base


class KnowledgeArticle(Base):
    """Knowledge base documents for Circle Network ISP troubleshooting & FAQ."""
    __tablename__ = "knowledge_articles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), index=True, nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    category = Column(String(100), default="troubleshooting")  # router_setup, billing, packages, fiber_los
    content = Column(Text, nullable=False)
    keywords = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
