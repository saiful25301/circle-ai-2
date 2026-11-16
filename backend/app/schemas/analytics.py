from typing import Dict, Any, List, Optional
from pydantic import BaseModel


class DashboardStatsResponse(BaseModel):
    time_range: str = "last_30_days"
    total_conversations: int
    active_conversations: int
    ai_handled_conversations: int = 0
    human_handled_conversations: int = 0
    ai_resolved_percentage: float
    human_escalated_percentage: float
    total_tickets: int
    open_tickets: int
    resolved_tickets: int = 0
    active_agents_count: int = 0
    average_response_time_seconds: float
    average_response_time_ms: int = 0
    customer_satisfaction_score: float
    total_csat_ratings: int = 0
    csat_distribution: Dict[str, int] = {}
    tool_execution_stats: Dict[str, Any] = {}
    top_issues: List[Dict[str, Any]] = []
    timeline_activity: List[Dict[str, Any]] = []
    calculation_methodology: Optional[Dict[str, str]] = None
