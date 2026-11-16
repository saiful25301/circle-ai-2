from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Lead(Base):
    """Prospective customer inquiries for new Circle Network fiber internet connection."""
    __tablename__ = "leads"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    phone = Column(String(50), index=True, nullable=False)
    email = Column(String(255), nullable=True)
    zone = Column(String(100), index=True, nullable=False)  # e.g., Dhanmondi, Uttara
    address = Column(Text, nullable=False)
    package_id = Column(String(36), ForeignKey("packages.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(50), default="new", index=True)  # new, contacted, survey_scheduled, installed, cancelled
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    package = relationship("Package", back_populates="leads")
