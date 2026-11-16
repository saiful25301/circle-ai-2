from fastapi import APIRouter
from app.api.v1 import (
    auth,
    customers,
    conversations,
    tickets,
    ai,
    rag,
    analytics,
    websocket,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(customers.router, prefix="/customers", tags=["Customers & ISP Telemetry"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["Conversations"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["Tickets & Escalation"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Agent & Function Calling"])
api_router.include_router(rag.router, prefix="/rag", tags=["Knowledge Base & RAG"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(websocket.router, tags=["WebSocket Real-Time"])
