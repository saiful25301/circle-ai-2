from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.lead import Lead

router = APIRouter()


class LeadCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    zone: str
    address: str
    package_id: Optional[str] = None
    notes: Optional[str] = None


@router.get("/", response_model=List[dict])
async def list_leads(db: AsyncSession = Depends(get_db)):
    """List prospective customer leads for new fiber connections."""
    result = await db.execute(select(Lead).order_by(Lead.created_at.desc()))
    leads = result.scalars().all()
    return [
        {
            "id": l.id,
            "name": l.name,
            "phone": l.phone,
            "email": l.email,
            "zone": l.zone,
            "address": l.address,
            "status": l.status,
            "notes": l.notes,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in leads
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_lead(payload: LeadCreate, db: AsyncSession = Depends(get_db)):
    """Capture a new prospective connection lead (e.g. from customer webchat)."""
    lead = Lead(
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        zone=payload.zone,
        address=payload.address,
        package_id=payload.package_id,
        notes=payload.notes,
        status="new"
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return {"id": lead.id, "name": lead.name, "status": lead.status, "message": "Lead registered successfully"}
