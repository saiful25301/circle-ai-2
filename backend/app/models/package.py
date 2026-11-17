from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class Package(Base):
    __tablename__ = "packages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, index=True, nullable=False)  # e.g., "Circle Fast 30 Mbps"
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "CF-30"
    bandwidth_mbps = Column(Integer, nullable=False)
    bdix_speed_mbps = Column(Integer, default=100)
    monthly_price_bdt = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False,
    )

    # Relationships
    customers = relationship("Customer", back_populates="package")
    leads = relationship("Lead", back_populates="package")
