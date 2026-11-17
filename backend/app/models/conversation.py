from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_agent_id = Column(String(36), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True, index=True)
    channel = Column(String(50), default="webchat", index=True)  # webchat, whatsapp, messenger
    status = Column(String(50), default="ai_handling", index=True)  # ai_handling, agent_handling, resolved, closed
    priority = Column(String(50), default="normal", index=True)  # low, normal, high, urgent
    customer_name = Column(String(255), nullable=True)
    customer_phone = Column(String(50), nullable=True)
    subscriber_id = Column(String(50), nullable=True, index=True)
    is_ai_handled = Column(Boolean, default=True, index=True)
    metadata_info = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False, index=True)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False,
    )

    # Relationships
    customer = relationship("Customer", back_populates="conversations")
    assigned_agent = relationship("Agent", back_populates="assigned_conversations")
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at"
    )
    tickets = relationship("Ticket", back_populates="conversation")
    feedback = relationship("AIFeedback", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_type = Column(String(50), nullable=False, index=True)  # customer, ai_agent, human_agent, system
    sender_name = Column(String(100), nullable=True)
    content = Column(Text, nullable=False)
    tool_calls = Column(JSON, nullable=True)  # Captured tool call executions
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False, index=True)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False,
    )

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    feedback = relationship("AIFeedback", back_populates="message")
