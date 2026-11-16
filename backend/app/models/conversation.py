from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=True)
    channel = Column(String(50), default="webchat")  # webchat, whatsapp, messenger
    status = Column(String(50), default="ai_handling")  # ai_handling, agent_handling, resolved, closed
    priority = Column(String(50), default="normal")     # low, normal, high, urgent
    assigned_agent_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    metadata_info = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False)
    sender_type = Column(String(50), nullable=False)  # customer, ai_agent, human_agent, system
    sender_name = Column(String(100), nullable=True)
    content = Column(Text, nullable=False)
    tool_calls = Column(JSON, nullable=True)  # Captured tool call executions
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    conversation = relationship("Conversation", back_populates="messages")
