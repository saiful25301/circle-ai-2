from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class KnowledgeDocument(Base):
    """Knowledge base documents for Circle Network ISP troubleshooting, FAQ, and RAG retrieval."""
    __tablename__ = "knowledge_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), index=True, nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    category = Column(String(100), default="troubleshooting", index=True)  # troubleshooting, router_setup, billing, packages, coverage, company, installation, faq
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    keywords = Column(JSON, default=list)
    citations_count = Column(Integer, default=0)
    views_count = Column(Integer, default=0)
    is_published = Column(Boolean, default=True, index=True)
    author = Column(String(100), default="NOC Documentation Team")
    embedding = Column(JSON, nullable=True)  # Vector embedding stored as list of floats (dimension 768)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False, index=True)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False,
    )

    # Relationships
    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan", lazy="selectin")


class KnowledgeChunk(Base):
    """Fine-grained semantic chunks of knowledge documents with vector embeddings."""
    __tablename__ = "knowledge_chunks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, default=0, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=True)  # 768-dimensional float vector for semantic search
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    # Relationships
    document = relationship("KnowledgeDocument", back_populates="chunks")


# Alias for backward compatibility
KnowledgeArticle = KnowledgeDocument


