from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TicketCreate(BaseModel):
    customer_id: str
    conversation_id: Optional[str] = None
    title: str
    description: str
    category: str = "technical_support"
    priority: str = "normal"
    escalation_reason: Optional[str] = None


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    category: Optional[str] = None


class TicketResponse(BaseModel):
    id: str
    ticket_number: str
    customer_id: str
    conversation_id: Optional[str] = None
    title: str
    description: str
    category: str
    priority: str
    status: str
    assigned_to: Optional[str] = None
    escalation_reason: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True
