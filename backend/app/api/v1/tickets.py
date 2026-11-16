from datetime import datetime, timezone
from typing import List, Optional
import uuid
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.ticket import Ticket
from app.models.customer import Customer
from app.schemas.ticket import TicketCreate, TicketResponse, TicketUpdate
from app.api.deps import require_agent_or_admin

router = APIRouter()


@router.get("", response_model=List[dict])
async def list_tickets(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _user = Depends(require_agent_or_admin)
):
    """List all NOC & customer tickets from database with customer details."""
    query = select(Ticket).order_by(Ticket.created_at.desc())
    if status_filter and status_filter != "all":
        query = query.where(Ticket.status == status_filter)

    result = await db.execute(query)
    tickets = result.scalars().all()

    # Pre-fetch customer names
    customer_ids = [t.customer_id for t in tickets if t.customer_id]
    customers_map = {}
    if customer_ids:
        c_res = await db.execute(select(Customer).where(Customer.id.in_(customer_ids)))
        for c in c_res.scalars().all():
            customers_map[c.id] = c
            customers_map[c.subscriber_id] = c

    out = []
    for t in tickets:
        cust = customers_map.get(t.customer_id)
        sub_name = cust.full_name if cust else "Subscriber"
        sub_id = cust.subscriber_id if cust else t.customer_id

        out.append({
            "id": t.id,
            "ticket_number": t.ticket_number,
            "customer_id": t.customer_id,
            "subscriber_id": sub_id,
            "subscriber_name": sub_name,
            "conversation_id": t.conversation_id,
            "assigned_agent": t.assigned_agent_id or "NOC On-Call Engineer",
            "title": t.title,
            "description": t.description,
            "category": t.category,
            "priority": t.priority,
            "status": t.status,
            "optical_loss_dbm": t.optical_loss_dbm,
            "resolution_notes": t.resolution_notes,
            "created_at": t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else "",
            "resolved_at": t.resolved_at.strftime("%Y-%m-%d %H:%M") if t.resolved_at else None,
            "sla_remaining_hours": 2 if t.priority == "urgent" else (4 if t.priority == "high" else 12),
        })
    return out


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    payload: TicketCreate,
    db: AsyncSession = Depends(get_db),
    _user = Depends(require_agent_or_admin)
):
    """Create a new NOC complaint ticket in database."""
    tid = f"tkt-{str(uuid.uuid4())[:8]}"
    tkt_num = f"TKT-{datetime.now().year}-{str(uuid.uuid4().int)[:4]}"

    # Lookup customer ID if subscriber ID was passed
    cid = payload.customer_id
    c_res = await db.execute(select(Customer).where(Customer.subscriber_id == payload.customer_id))
    cust = c_res.scalar_one_or_none()
    if cust:
        cid = cust.id

    ticket = Ticket(
        id=tid,
        ticket_number=tkt_num,
        customer_id=cid,
        conversation_id=payload.conversation_id,
        assigned_agent_id=getattr(payload, "assigned_to", None) or "Farhan Kabir",
        title=payload.title,
        description=payload.description,
        category=payload.category,
        priority=payload.priority,
        status="open",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    return {
        "id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "title": ticket.title,
        "status": ticket.status,
        "priority": ticket.priority,
        "category": ticket.category,
        "message": f"Ticket {ticket.ticket_number} created successfully"
    }


@router.patch("/{ticket_id}", response_model=dict)
async def update_ticket(
    ticket_id: str,
    payload: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    _user = Depends(require_agent_or_admin)
):
    """Update ticket status, priority, or assigned NOC engineer."""
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    tkt = result.scalar_one_or_none()
    if not tkt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if payload.status:
        tkt.status = payload.status
        if payload.status == "resolved":
            tkt.resolved_at = datetime.now(timezone.utc)
    if payload.priority:
        tkt.priority = payload.priority
    if payload.assigned_to:
        tkt.assigned_agent_id = payload.assigned_to
    if payload.category:
        tkt.category = payload.category

    tkt.updated_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "id": tkt.id,
        "ticket_number": tkt.ticket_number,
        "status": tkt.status,
        "priority": tkt.priority,
        "assigned_agent": tkt.assigned_agent_id,
        "message": f"Ticket {tkt.ticket_number} updated to {tkt.status}"
    }
