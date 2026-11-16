from typing import Dict, Any, List
from pydantic import BaseModel


class DashboardStatsResponse(BaseModel):
    total_conversations: int
    active_conversations: int
    ai_resolved_percentage: float
    human_escalated_percentage: float
    total_tickets: int
    open_tickets: int
    average_response_time_seconds: float
    customer_satisfaction_score: float
    top_issues: List[Dict[str, Any]]
