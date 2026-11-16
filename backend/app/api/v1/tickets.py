from datetime import datetime, timezone
from typing import List
import uuid
from fastapi import APIRouter, HTTPException
from app.schemas.ticket import TicketCreate, TicketResponse, TicketUpdate

router = APIRouter()

STORED_TICKETS = {
    "tkt-1": {
        "id": "tkt-1",
        "ticket_number": "TKT-2026-0819",
        "customer_id": "CN-99412",
        "conversation_id": "conv-demo-dhanmondi",
        "title": "Critical Optical Loss (-28.9 dBm) - Fiber Inspection Needed",
        "description": "ONU optical power is degraded below -27dBm threshold on GPON0/1:7. Customer experiencing packet loss in Dhanmondi.",
        "category": "optical_fiber_break",
        "priority": "urgent",
        "status": "open",
        "assigned_to": None,
        "escalation_reason": "Automated AI diagnosis detected critical fiber loss.",
        "created_at": datetime.now(timezone.utc),
        "resolved_at": None,
    }
}


@router.get("", response_model=List[TicketResponse])
async def list_tickets():
    return list(STORED_TICKETS.values())


@router.post("", response_model=TicketResponse)
async def create_ticket(payload: TicketCreate):
    tid = f"tkt-{str(uuid.uuid4())[:8]}"
    tkt_num = f"TKT-{datetime.now().year}-{str(uuid.uuid4().int)[:4]}"
    data = {
        "id": tid,
        "ticket_number": tkt_num,
        "customer_id": payload.customer_id,
        "conversation_id": payload.conversation_id,
        "title": payload.title,
        "description": payload.description,
        "category": payload.category,
        "priority": payload.priority,
        "status": "open",
        "assigned_to": None,
        "escalation_reason": payload.escalation_reason,
        "created_at": datetime.now(timezone.utc),
        "resolved_at": None,
    }
    STORED_TICKETS[tid] = data
    return TicketResponse(**data)


@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(ticket_id: str, payload: TicketUpdate):
    tkt = STORED_TICKETS.get(ticket_id)
    if not tkt:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if payload.status:
        tkt["status"] = payload.status
        if payload.status == "resolved":
            tkt["resolved_at"] = datetime.now(timezone.utc)
    if payload.priority:
        tkt["priority"] = payload.priority
    if payload.assigned_to:
        tkt["assigned_to"] = payload.assigned_to
    if payload.category:
        tkt["category"] = payload.category

    return TicketResponse(**tkt)
