from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.payment import Payment

router = APIRouter()


@router.get("/", response_model=List[dict])
async def list_payments(db: AsyncSession = Depends(get_db)):
    """List subscriber billing payments and bKash transaction reconciliations."""
    result = await db.execute(select(Payment).order_by(Payment.created_at.desc()))
    payments = result.scalars().all()
    return [
        {
            "id": p.id,
            "customer_id": p.customer_id,
            "transaction_id": p.transaction_id,
            "amount_bdt": p.amount_bdt,
            "payment_method": p.payment_method,
            "status": p.status,
            "billing_month": p.billing_month,
            "phone": p.phone,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in payments
    ]


@router.get("/{payment_id}")
async def get_payment(payment_id: str, db: AsyncSession = Depends(get_db)):
    """Get single payment transaction details."""
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment record not found")
    return {
        "id": payment.id,
        "customer_id": payment.customer_id,
        "transaction_id": payment.transaction_id,
        "amount_bdt": payment.amount_bdt,
        "payment_method": payment.payment_method,
        "status": payment.status,
        "billing_month": payment.billing_month,
        "phone": payment.phone,
        "metadata_info": payment.metadata_info,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
    }
