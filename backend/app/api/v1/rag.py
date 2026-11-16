from typing import List
from fastapi import APIRouter
from app.services.rag.retriever import DEFAULT_KNOWLEDGE_BASE, search_knowledge_base
from app.schemas.rag import SearchQuery

router = APIRouter()


@router.get("/articles")
async def list_articles():
    return DEFAULT_KNOWLEDGE_BASE


@router.post("/search")
async def search_articles(payload: SearchQuery):
    results = search_knowledge_base(payload.query, top_k=payload.limit)
    return results
