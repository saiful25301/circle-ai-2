from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.core.database import get_db
from app.models.knowledge import KnowledgeDocument
from app.schemas.rag import SearchQuery

router = APIRouter()


@router.get("/articles", response_model=List[dict])
async def list_articles(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List knowledge base documents persisted in database."""
    query = select(KnowledgeDocument).where(KnowledgeDocument.is_published == True)
    if category and category != "all":
        query = query.where(KnowledgeDocument.category == category)
    if search:
        s = f"%{search}%"
        query = query.where(
            or_(
                KnowledgeDocument.title.ilike(s),
                KnowledgeDocument.content.ilike(s),
                KnowledgeDocument.summary.ilike(s),
            )
        )

    result = await db.execute(query.order_by(KnowledgeDocument.citations_count.desc()))
    articles = result.scalars().all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "slug": a.slug,
            "category": a.category,
            "summary": a.summary or a.content[:160] + "...",
            "content": a.content,
            "citations_count": a.citations_count,
            "citationsByAI": a.citations_count,
            "views": a.views_count,
            "author": a.author,
            "lastUpdated": a.updated_at.strftime("%b %d, %Y") if a.updated_at else "Nov 2026",
        }
        for a in articles
    ]


@router.post("/search")
async def search_articles(payload: SearchQuery, db: AsyncSession = Depends(get_db)):
    """Search knowledge documents by keyword."""
    s = f"%{payload.query}%"
    result = await db.execute(
        select(KnowledgeDocument).where(
            or_(
                KnowledgeDocument.title.ilike(s),
                KnowledgeDocument.content.ilike(s),
                KnowledgeDocument.summary.ilike(s)
            )
        ).limit(payload.limit or 5)
    )
    docs = result.scalars().all()
    return [
        {
            "id": d.id,
            "title": d.title,
            "category": d.category,
            "content": d.content,
            "relevance_score": 0.94,
        }
        for d in docs
    ]
