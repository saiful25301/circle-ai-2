from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_id = Column(String(100), unique=True, index=True, nullable=False)  # e.g., "BKH-2026-99214"
    amount_bdt = Column(Float, nullable=False)
    payment_method = Column(String(50), default="bkash", index=True)  # bkash, nagad, rocket, bank_transfer, cash
    status = Column(String(50), default="paid", index=True)  # paid, pending, failed, refunded
    billing_month = Column(String(50), nullable=False, index=True)  # e.g., "November 2026"
    phone = Column(String(50), nullable=True)
    metadata_info = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    customer = relationship("Customer", back_populates="payments")
