from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel


class KnowledgeArticleBase(BaseModel):
    title: str
    category: str = "troubleshooting"
    content: str
    summary: Optional[str] = None
    slug: Optional[str] = None
    keywords: List[str] = []
    is_published: bool = True
    author: Optional[str] = "NOC Documentation Team"


class KnowledgeArticleCreate(KnowledgeArticleBase):
    pass


class KnowledgeArticleUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    keywords: Optional[List[str]] = None
    is_published: Optional[bool] = None
    author: Optional[str] = None


class KnowledgeArticleResponse(BaseModel):
    id: str
    title: str
    slug: str
    category: str
    content: str
    summary: Optional[str] = None
    keywords: List[str] = []
    citations_count: int = 0
    citationsByAI: int = 0
    views_count: int = 0
    views: int = 0
    is_published: bool = True
    author: str = "NOC Documentation Team"
    chunk_count: int = 0
    lastUpdated: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SearchQuery(BaseModel):
    query: str
    category: Optional[str] = None
    limit: Optional[int] = 5


class SemanticSearchRequest(BaseModel):
    query: str
    category: Optional[str] = None
    top_k: int = 4
    min_score: float = 0.4


class SemanticSearchResultItem(BaseModel):
    id: str
    document_id: str
    title: str
    category: str
    content: str
    snippet: str
    similarity_score: float
    source_reference: str


class FileUploadResponse(BaseModel):
    filename: str
    title: str
    category: str
    document_id: str
    chunks_created: int
    message: str

