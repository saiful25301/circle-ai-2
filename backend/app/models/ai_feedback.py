from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class AIFeedback(Base):
    """Subscriber ratings and sentiment feedback on Circle AI responses."""
    __tablename__ = "ai_feedback"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    message_id = Column(String(36), ForeignKey("messages.id", ondelete="SET NULL"), nullable=True, index=True)
    rating = Column(Integer, nullable=False)  # 1 to 5 stars or thumbs up/down
    is_resolved = Column(Boolean, default=True, index=True)
    feedback_text = Column(Text, nullable=True)
    customer_sentiment = Column(String(50), default="positive", index=True)  # positive, neutral, negative
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    conversation = relationship("Conversation", back_populates="feedback")
    message = relationship("Message", back_populates="feedback")
