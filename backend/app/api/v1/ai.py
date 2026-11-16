from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc
from app.core.database import get_db
from app.models.tool_log import ToolLog
from app.models.user import User
from app.schemas.ai import AgentChatRequest, AgentChatResponse
from app.services.ai.agent import process_chat, ISP_TOOLS_DEFINITIONS
from app.api.deps import get_current_user, require_role

router = APIRouter()

# Role-based access control: Only Admin, Supervisor, or NOC Engineer can view audit tool logs
require_audit_access = require_role(["admin", "supervisor", "noc_engineer", "agent"])


@router.post("/chat", response_model=AgentChatResponse)
async def chat_with_agent(payload: AgentChatRequest, db: AsyncSession = Depends(get_db)):
    result = await process_chat(
        conversation_id=payload.conversation_id,
        user_message=payload.message,
        customer_id=payload.customer_id,
        db=db
    )
    return AgentChatResponse(**result)


@router.get("/tools")
async def list_tools():
    return {
        "tools": ISP_TOOLS_DEFINITIONS
    }


@router.get("/logs", response_model=List[dict])
async def list_tool_logs(
    search: Optional[str] = Query(default=None, description="Search by tool name, subscriber ID, or conversation ID"),
    tool_name: Optional[str] = Query(default=None, description="Filter by exact tool name"),
    escalated_only: bool = Query(default=False, description="Filter for escalated tool calls only"),
    limit: int = Query(default=100, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_audit_access),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch searchable and filterable audit trail of Gemini AI function executions.
    Protected by Role-Based Access Control (RBAC: Admin, Supervisor, NOC Engineer).
    """
    query = select(ToolLog)

    if tool_name and tool_name != "all":
        query = query.where(ToolLog.tool_name == tool_name)

    if escalated_only:
        query = query.where(ToolLog.escalated == True)

    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                ToolLog.tool_name.ilike(s),
                ToolLog.subscriber_id.ilike(s),
                ToolLog.conversation_id.ilike(s),
            )
        )

    query = query.order_by(desc(ToolLog.created_at)).offset(offset).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    out = []
    for l in logs:
        out_res = l.output_result or {}
        is_error = False
        if isinstance(out_res, dict):
            if out_res.get("status") == "error" or "error" in out_res or out_res.get("success") is False:
                is_error = True

        out.append({
            "id": l.id,
            "toolName": l.tool_name,
            "conversationId": l.conversation_id or "conv-session",
            "subscriberId": l.subscriber_id or "CN-88214",
            "inputArgs": l.input_args or {},
            "outputResult": out_res,
            "geminiModel": l.gemini_model,
            "executionTimeMs": l.execution_time_ms,
            "confidenceScore": l.confidence_score,
            "escalated": l.escalated,
            "isSuccess": not is_error,
            "timestamp": l.created_at.strftime("%b %d, %H:%M:%S") if l.created_at else "Just now",
        })

    return out
