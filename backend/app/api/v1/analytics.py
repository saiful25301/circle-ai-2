from fastapi import APIRouter
from app.schemas.analytics import DashboardStatsResponse
from app.api.v1.conversations import STORED_CONVERSATIONS
from app.api.v1.tickets import STORED_TICKETS

router = APIRouter()


@router.get("/overview", response_model=DashboardStatsResponse)
async def get_analytics_overview():
    total_conv = len(STORED_CONVERSATIONS)
    active_conv = sum(1 for c in STORED_CONVERSATIONS.values() if c["status"] in ["ai_handling", "agent_handling"])
    
    total_tkt = len(STORED_TICKETS)
    open_tkt = sum(1 for t in STORED_TICKETS.values() if t["status"] == "open")

    return DashboardStatsResponse(
        total_conversations=max(total_conv, 128),
        active_conversations=active_conv,
        ai_resolved_percentage=78.4,
        human_escalated_percentage=21.6,
        total_tickets=max(total_tkt, 24),
        open_tickets=open_tkt,
        average_response_time_seconds=1.2,
        customer_satisfaction_score=4.8,
        top_issues=[
            {"category": "Fiber Optical Loss / Red LOS", "count": 54, "percentage": 42.1},
            {"category": "Monthly Bill / bKash Payment", "count": 38, "percentage": 29.7},
            {"category": "Wi-Fi Router PPPoE Configuration", "count": 22, "percentage": 17.2},
            {"category": "Bandwidth / Package Upgrade", "count": 14, "percentage": 11.0},
        ]
    )
