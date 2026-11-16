from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, JSON
from app.core.database import Base


class KnowledgeDocument(Base):
    """Knowledge base documents for Circle Network ISP troubleshooting, FAQ, and RAG retrieval."""
    __tablename__ = "knowledge_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), index=True, nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    category = Column(String(100), default="troubleshooting", index=True)  # troubleshooting, router_setup, billing, bdix, packages
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    keywords = Column(JSON, default=list)
    citations_count = Column(Integer, default=0)
    views_count = Column(Integer, default=0)
    is_published = Column(Boolean, default=True, index=True)
    author = Column(String(100), default="NOC Documentation Team")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


# Alias for backward compatibility
KnowledgeArticle = KnowledgeDocument

