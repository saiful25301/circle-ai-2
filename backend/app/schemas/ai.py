from typing import List, Optional, Any, Dict
from pydantic import BaseModel


class ToolCallLog(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]
    result: Any


class AgentChatRequest(BaseModel):
    conversation_id: str
    message: str
    customer_id: Optional[str] = None


class AgentChatResponse(BaseModel):
    conversation_id: str
    reply: str
    tool_calls: List[ToolCallLog] = []
    rag_sources: List[str] = []
    should_escalate: bool = False
    escalation_reason: Optional[str] = None
