from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class KnowledgeArticleBase(BaseModel):
    title: str
    slug: str
    category: str
    content: str
    keywords: List[str] = []


class KnowledgeArticleCreate(KnowledgeArticleBase):
    pass


class KnowledgeArticleResponse(KnowledgeArticleBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SearchQuery(BaseModel):
    query: str
    category: Optional[str] = None
    limit: int = 5
