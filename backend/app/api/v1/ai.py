from fastapi import APIRouter
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
