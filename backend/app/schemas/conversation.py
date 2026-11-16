import re
from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, field_validator


def sanitize_text(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, str):
        cleaned = re.sub(r'<[^>]*>', '', v)
        cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', cleaned)
        return cleaned.strip()
    return v


class MessageCreate(BaseModel):
    content: str
    sender_type: str = "customer"  # customer, human_agent
    sender_name: Optional[str] = None

    @field_validator("content", "sender_name", mode="before")
    @classmethod
    def sanitize_msg(cls, v):
        return sanitize_text(v)


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_type: str
    sender_name: Optional[str] = None
    content: str
    tool_calls: Optional[Any] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationCreate(BaseModel):
    customer_id: Optional[str] = None
    channel: str = "webchat"
    initial_message: Optional[str] = None


class ConversationStatusUpdate(BaseModel):
    status: str  # ai_handling, agent_handling, resolved, closed
    priority: Optional[str] = None
    assigned_agent_id: Optional[str] = None


class ConversationAssignRequest(BaseModel):
    agent_id: str


class ConversationTransferRequest(BaseModel):
    to_agent_id: str
    reason: str


class ConversationFeedbackCreate(BaseModel):
    rating: int  # 1 to 5
    feedback_text: Optional[str] = None
    customer_sentiment: Optional[str] = "positive"  # positive, neutral, negative

    @field_validator("feedback_text", mode="before")
    @classmethod
    def sanitize_feedback(cls, v):
        return sanitize_text(v)


class ConversationResponse(BaseModel):
    id: str
    customer_id: Optional[str] = None
    channel: str
    status: str
    priority: str
    assigned_agent_id: Optional[str] = None
    metadata_info: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True
