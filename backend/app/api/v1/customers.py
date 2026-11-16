from typing import List
from fastapi import APIRouter, HTTPException
from app.services.isp_tools.tools import MOCK_SUBSCRIBERS, diagnose_onu_status
from app.schemas.customer import CustomerDiagnosisResponse

router = APIRouter()


@router.get("", response_model=List[dict])
async def list_customers():
    return list(MOCK_SUBSCRIBERS.values())


@router.get("/{subscriber_id}")
async def get_customer(subscriber_id: str):
    sub = MOCK_SUBSCRIBERS.get(subscriber_id.upper())
    if not sub:
        # Search by pppoe
        for s in MOCK_SUBSCRIBERS.values():
            if s["pppoe_username"] == subscriber_id:
                return s
        raise HTTPException(status_code=404, detail="Subscriber not found")
    return sub


@router.get("/{subscriber_id}/diagnose", response_model=CustomerDiagnosisResponse)
async def diagnose_customer_connection(subscriber_id: str):
    result = diagnose_onu_status(subscriber_id)
    if result.get("status") != "success":
        raise HTTPException(status_code=404, detail=result.get("message"))
    
    sub = MOCK_SUBSCRIBERS.get(result["subscriber_id"], {})
    return CustomerDiagnosisResponse(
        subscriber_id=result["subscriber_id"],
        full_name=result["full_name"],
        pppoe_username=result["pppoe_username"],
        connection_status=result["connection_state"],
        optical_power_dbm=result["optical_power_dbm"],
        optical_health=result["optical_health"],
        olt_ip=result["olt_ip"],
        pon_port=result["pon_port"],
        onu_mac=result["onu_mac"],
        bandwidth_mbps=sub.get("bandwidth_mbps", 30),
        current_due_bdt=sub.get("current_due_bdt", 0.0),
        recommendation=result["recommendation"]
    )
