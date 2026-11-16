from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from app.core.database import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g., TKT-2026-0042
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False)
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), default="technical_support")  # optical_fiber_break, high_latency, billing_dispute, router_config
    priority = Column(String(50), default="normal")             # low, normal, high, urgent
    status = Column(String(50), default="open")                 # open, in_progress, resolved, closed
    assigned_to = Column(String(36), ForeignKey("users.id"), nullable=True)
    escalation_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)
