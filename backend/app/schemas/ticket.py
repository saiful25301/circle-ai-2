import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator


def sanitize_text(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, str):
        # Strip HTML tags and control characters
        cleaned = re.sub(r'<[^>]*>', '', v)
        cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', cleaned)
        return cleaned.strip()
    return v


class TicketCreate(BaseModel):
    customer_id: str
    conversation_id: Optional[str] = None
    title: str
    description: str
    category: str = "technical_support"
    priority: str = "normal"
    escalation_reason: Optional[str] = None

    @field_validator("title", "description", "escalation_reason", mode="before")
    @classmethod
    def sanitize_create_fields(cls, v):
        return sanitize_text(v)


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    category: Optional[str] = None

    @field_validator("assigned_to", "category", mode="before")
    @classmethod
    def sanitize_update_fields(cls, v):
        return sanitize_text(v)


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
