from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.tool_log import ToolLog
from app.schemas.ai import AgentChatRequest, AgentChatResponse
from app.services.ai.agent import process_chat, ISP_TOOLS_DEFINITIONS

router = APIRouter()


@router.post("/chat", response_model=AgentChatResponse)
async def chat_with_agent(payload: AgentChatRequest):
    result = await process_chat(
        conversation_id=payload.conversation_id,
        user_message=payload.message,
        customer_id=payload.customer_id
    )
    return AgentChatResponse(**result)


@router.get("/tools")
async def list_tools():
    return {
        "tools": ISP_TOOLS_DEFINITIONS
    }


@router.get("/logs", response_model=List[dict])
async def list_tool_logs(
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Fetch live audit trail of Gemini function executions from database."""
    result = await db.execute(select(ToolLog).order_by(ToolLog.created_at.desc()).limit(limit))
    logs = result.scalars().all()
    return [
        {
            "id": l.id,
            "toolName": l.tool_name,
            "conversationId": l.conversation_id or "conv-session",
            "subscriberId": l.subscriber_id or "CN-88214",
            "inputArgs": l.input_args or {},
            "outputResult": l.output_result or {},
            "geminiModel": l.gemini_model,
            "executionTimeMs": l.execution_time_ms,
            "confidenceScore": l.confidence_score,
            "escalated": l.escalated,
            "timestamp": l.created_at.strftime("%H:%M:%S") if l.created_at else "Just now",
        }
        for l in logs
    ]
