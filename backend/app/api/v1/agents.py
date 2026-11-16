from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.agent import Agent

router = APIRouter()


@router.get("/", response_model=List[dict])
async def list_agents(db: AsyncSession = Depends(get_db)):
    """List all NOC & customer support agents."""
    result = await db.execute(select(Agent))
    agents = result.scalars().all()
    return [
        {
            "id": a.id,
            "name": a.name,
            "role": a.role,
            "avatar": a.avatar,
            "is_online": a.is_online,
            "max_active_chats": a.max_active_chats,
            "active_chats_count": a.active_chats_count,
            "resolved_today_count": a.resolved_today_count,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in agents
    ]


@router.get("/{agent_id}")
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    """Get single agent details by ID."""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return {
        "id": agent.id,
        "name": agent.name,
        "role": agent.role,
        "avatar": agent.avatar,
        "is_online": agent.is_online,
        "max_active_chats": agent.max_active_chats,
        "active_chats_count": agent.active_chats_count,
        "resolved_today_count": agent.resolved_today_count,
    }
