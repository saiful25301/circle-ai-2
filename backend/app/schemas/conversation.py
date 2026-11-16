from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel


class MessageCreate(BaseModel):
    content: str
    sender_type: str = "customer"  # customer, human_agent
    sender_name: Optional[str] = None


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
