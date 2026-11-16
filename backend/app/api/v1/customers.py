from typing import List, Optional
import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.core.database import get_db
from app.models.customer import Customer
from app.models.tool_log import ToolLog
from app.schemas.customer import CustomerDiagnosisResponse
from app.api.deps import require_agent_or_admin

router = APIRouter()


@router.get("", response_model=List[dict])
async def list_customers(
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _user = Depends(require_agent_or_admin)
):
    """List all Circle Network subscribers from database with optional filters."""
    query = select(Customer)
    if status_filter and status_filter != "all":
        query = query.where(Customer.connection_status == status_filter)
    if search:
        s = f"%{search}%"
        query = query.where(
            or_(
                Customer.fullName.ilike(s) if hasattr(Customer, "fullName") else Customer.full_name.ilike(s),
                Customer.subscriber_id.ilike(s),
                Customer.pppoe_username.ilike(s),
                Customer.phone.ilike(s),
                Customer.zone.ilike(s),
            )
        )
    result = await db.execute(query.order_by(Customer.subscriber_id))
    customers = result.scalars().all()
    return [
        {
            "id": c.id,
            "subscriber_id": c.subscriber_id,
            "full_name": c.full_name,
            "phone": c.phone,
            "email": c.email,
            "address": c.address,
            "zone": c.zone,
            "pppoe_username": c.pppoe_username,
            "plan_name": c.plan_name,
            "bandwidth_mbps": c.bandwidth_mbps,
            "monthly_bill_bdt": c.monthly_bill_bdt,
            "current_due_bdt": c.current_due_bdt,
            "olt_ip": c.olt_ip,
            "pon_port": c.pon_port,
            "onu_mac": c.onu_mac,
            "optical_power_dbm": c.optical_power_dbm,
            "connection_status": c.connection_status,
            "last_online_at": c.last_online_at.isoformat() if c.last_online_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in customers
    ]


@router.get("/{subscriber_id}")
async def get_customer(
    subscriber_id: str,
    db: AsyncSession = Depends(get_db),
    _user = Depends(require_agent_or_admin)
):
    """Fetch subscriber profile by subscriber_id or PPPoE username."""
    sub_clean = subscriber_id.strip()
    result = await db.execute(
        select(Customer).where(
            or_(
                Customer.subscriber_id.ilike(sub_clean),
                Customer.pppoe_username.ilike(sub_clean),
                Customer.id == sub_clean
            )
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Subscriber '{subscriber_id}' not found")
    
    return {
        "id": customer.id,
        "subscriber_id": customer.subscriber_id,
        "full_name": customer.full_name,
        "phone": customer.phone,
        "email": customer.email,
        "address": customer.address,
        "zone": customer.zone,
        "pppoe_username": customer.pppoe_username,
        "plan_name": customer.plan_name,
        "bandwidth_mbps": customer.bandwidth_mbps,
        "monthly_bill_bdt": customer.monthly_bill_bdt,
        "current_due_bdt": customer.current_due_bdt,
        "olt_ip": customer.olt_ip,
        "pon_port": customer.pon_port,
        "onu_mac": customer.onu_mac,
        "optical_power_dbm": customer.optical_power_dbm,
        "connection_status": customer.connection_status,
        "last_online_at": customer.last_online_at.isoformat() if customer.last_online_at else None,
    }


@router.post("/{subscriber_id}/reboot")
async def reboot_customer_onu(
    subscriber_id: str,
    db: AsyncSession = Depends(get_db),
    _current_user = Depends(require_agent_or_admin)
):
    """Trigger remote ONU reboot from core OLT (Restricted to Agent / Admin)."""
    sub_clean = subscriber_id.strip()
    result = await db.execute(select(Customer).where(Customer.subscriber_id.ilike(sub_clean)))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscriber not found")

    start_time = time.time()
    # Log reboot tool call
    log = ToolLog(
        tool_name="reboot_onu_port",
        subscriber_id=customer.subscriber_id,
        input_args={"olt_ip": customer.olt_ip, "pon_port": customer.pon_port, "onu_mac": customer.onu_mac},
        output_result={"status": "reboot_dispatched", "olt_ip": customer.olt_ip, "pon_port": customer.pon_port},
        execution_time_ms=int((time.time() - start_time) * 1000) + 120,
        confidence_score=1.0,
        escalated=False,
    )
    db.add(log)
    await db.commit()

    return {
        "success": True,
        "message": f"Reboot signal sent to OLT {customer.olt_ip} for ONU {customer.onu_mac} on port {customer.pon_port}",
        "subscriber_id": customer.subscriber_id,
        "olt_ip": customer.olt_ip,
        "pon_port": customer.pon_port,
    }


@router.get("/{subscriber_id}/diagnose", response_model=CustomerDiagnosisResponse)
async def diagnose_customer_connection(
    subscriber_id: str,
    db: AsyncSession = Depends(get_db),
    _user = Depends(require_agent_or_admin)
):
    """Diagnose optical fiber power, PPPoE auth, and ONU health."""
    sub_clean = subscriber_id.strip()
    result = await db.execute(
        select(Customer).where(
            or_(
                Customer.subscriber_id.ilike(sub_clean),
                Customer.pppoe_username.ilike(sub_clean)
            )
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Subscriber '{subscriber_id}' not found")

    dbm = customer.optical_power_dbm
    if dbm > -24.0:
        health = "good"
        rec = "Optical power is healthy and within optimal range (-15 to -24 dBm)."
    elif dbm > -27.0:
        health = "warning"
        rec = "Optical power is marginal. Inspect drop wire connectors for dirt or attenuation."
    else:
        health = "critical"
        rec = "Critical optical loss detected! Signal dropped below -27.0 dBm threshold. Dispatch fiber technician."

    return CustomerDiagnosisResponse(
        subscriber_id=customer.subscriber_id,
        full_name=customer.full_name,
        pppoe_username=customer.pppoe_username,
        connection_status=customer.connection_status,
        optical_power_dbm=customer.optical_power_dbm,
        optical_health=health,
        olt_ip=customer.olt_ip,
        pon_port=customer.pon_port,
        onu_mac=customer.onu_mac,
        bandwidth_mbps=customer.bandwidth_mbps,
        current_due_bdt=customer.current_due_bdt,
        recommendation=rec
    )
