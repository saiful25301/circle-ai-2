from fastapi import APIRouter
from app.api.v1 import (
    auth,
    users,
    customers,
    agents,
    conversations,
    tickets,
    packages,
    payments,
    leads,
    ai,
    rag,
    analytics,
    websocket,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users & Staff"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers & ISP Telemetry"])
api_router.include_router(agents.router, prefix="/agents", tags=["Support & NOC Agents"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["Conversations & Messages"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["Complaint Tickets"])
api_router.include_router(packages.router, prefix="/packages", tags=["Internet Packages"])
api_router.include_router(payments.router, prefix="/payments", tags=["Billing & Payments"])
api_router.include_router(leads.router, prefix="/leads", tags=["Connection Leads"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Agent & Function Calling"])
api_router.include_router(ai.router, prefix="/chat", tags=["AI Agent Chat"])
api_router.include_router(rag.router, prefix="/rag", tags=["Knowledge Base & RAG"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics & Reports"])
api_router.include_router(websocket.router, tags=["WebSocket Real-Time"])
