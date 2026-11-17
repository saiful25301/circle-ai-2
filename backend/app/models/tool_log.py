from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, JSON
from app.core.database import Base


class ToolLog(Base):
    """Audit log of Gemini AI ISP function calling and automated OLT / Billing actions."""
    __tablename__ = "tool_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tool_name = Column(String(100), index=True, nullable=False)
    conversation_id = Column(String(36), nullable=True, index=True)
    subscriber_id = Column(String(50), nullable=True, index=True)
    input_args = Column(JSON, default=dict)
    output_result = Column(JSON, default=dict)
    gemini_model = Column(String(50), default="gemini-1.5-flash")
    execution_time_ms = Column(Integer, default=0)
    confidence_score = Column(Float, default=0.95)
    escalated = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False, index=True)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False,
    )
