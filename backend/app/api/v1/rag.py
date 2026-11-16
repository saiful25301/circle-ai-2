import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, delete
from app.core.database import get_db
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk
from app.schemas.rag import (
    KnowledgeArticleCreate,
    KnowledgeArticleUpdate,
    KnowledgeArticleResponse,
    SearchQuery,
    SemanticSearchRequest,
    SemanticSearchResultItem,
    FileUploadResponse,
)
from app.services.rag.retriever import (
    index_document,
    semantic_search,
    generate_embedding,
    chunk_text,
)

router = APIRouter()


def slugify(text: str) -> str:
    """Generate URL-safe slug from text supporting English and Bangla."""
    clean = re.sub(r'[\s_]+', '-', text.strip().lower())
    clean = re.sub(r'[^\w\-]+', '', clean)
    return clean[:100] or f"doc-{str(uuid.uuid4())[:8]}"


# -----------------------------------------------------------------------------
# 1. List and Get Knowledge Documents
# -----------------------------------------------------------------------------

@router.get("/articles", response_model=List[dict])
async def list_articles(
    category: Optional[str] = None,
    search: Optional[str] = None,
    include_unpublished: bool = Query(default=False),
    db: AsyncSession = Depends(get_db)
):
    """
    List knowledge base documents persisted in database.
    Supports filtering by category, search term, and published status.
    """
    query = select(KnowledgeDocument)
    if not include_unpublished:
        query = query.where(KnowledgeDocument.is_published == True)

    if category and category != "all":
        query = query.where(KnowledgeDocument.category == category)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                KnowledgeDocument.title.ilike(s),
                KnowledgeDocument.content.ilike(s),
                KnowledgeDocument.summary.ilike(s),
                KnowledgeDocument.slug.ilike(s),
            )
        )

    result = await db.execute(query.order_by(KnowledgeDocument.citations_count.desc(), KnowledgeDocument.updated_at.desc()))
    articles = result.scalars().all()

    return [
        {
            "id": a.id,
            "title": a.title,
            "slug": a.slug,
            "category": a.category,
            "summary": a.summary or (a.content[:160] + "..."),
            "content": a.content,
            "keywords": a.keywords or [],
            "citations_count": a.citations_count,
            "citationsByAI": a.citations_count,
            "views": a.views_count,
            "views_count": a.views_count,
            "is_published": a.is_published,
            "author": a.author,
            "has_embedding": bool(a.embedding),
            "chunk_count": len(a.chunks) if a.chunks else 0,
            "lastUpdated": a.updated_at.strftime("%b %d, %Y") if a.updated_at else "Nov 2026",
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "updated_at": a.updated_at.isoformat() if a.updated_at else None,
        }
        for a in articles
    ]


@router.get("/articles/{article_id}")
async def get_article(article_id: str, db: AsyncSession = Depends(get_db)):
    """Get single knowledge document details with its indexed semantic chunks."""
    stmt = select(KnowledgeDocument).where(
        or_(KnowledgeDocument.id == article_id, KnowledgeDocument.slug == article_id)
    )
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found")

    # Increment view count
    doc.views_count += 1
    await db.commit()

    return {
        "id": doc.id,
        "title": doc.title,
        "slug": doc.slug,
        "category": doc.category,
        "summary": doc.summary or (doc.content[:160] + "..."),
        "content": doc.content,
        "keywords": doc.keywords or [],
        "citations_count": doc.citations_count,
        "citationsByAI": doc.citations_count,
        "views": doc.views_count,
        "is_published": doc.is_published,
        "author": doc.author,
        "has_embedding": bool(doc.embedding),
        "chunks": [
            {
                "id": c.id,
                "chunk_index": c.chunk_index,
                "content": c.content,
                "has_embedding": bool(c.embedding),
            }
            for c in (doc.chunks or [])
        ],
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
    }


# -----------------------------------------------------------------------------
# 2. Document CRUD Operations
# -----------------------------------------------------------------------------

@router.post("/articles", status_code=status.HTTP_201_CREATED)
async def create_article(payload: KnowledgeArticleCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new knowledge base document and automatically generate vector embeddings and chunks.
    """
    now = datetime.now(timezone.utc)
    doc_id = f"kb-{str(uuid.uuid4())[:8]}"
    base_slug = payload.slug or slugify(payload.title)

    # Ensure unique slug
    chk_slug = await db.execute(select(KnowledgeDocument).where(KnowledgeDocument.slug == base_slug))
    if chk_slug.scalar_one_or_none():
        base_slug = f"{base_slug}-{str(uuid.uuid4())[:4]}"

    doc = KnowledgeDocument(
        id=doc_id,
        title=payload.title.strip(),
        slug=base_slug,
        category=payload.category,
        content=payload.content.strip(),
        summary=payload.summary.strip() if payload.summary else (payload.content.strip()[:180] + "..."),
        keywords=payload.keywords or [],
        is_published=payload.is_published,
        author=payload.author or "NOC Documentation Team",
        citations_count=0,
        views_count=1,
        created_at=now,
        updated_at=now,
    )
    db.add(doc)
    await db.flush()

    # Automatically chunk document and compute embeddings
    chunks_created = await index_document(doc, db)
    await db.commit()
    await db.refresh(doc)

    return {
        "status": "success",
        "message": f"Document created and indexed successfully with {chunks_created} semantic chunks.",
        "id": doc.id,
        "title": doc.title,
        "slug": doc.slug,
        "category": doc.category,
        "chunks_count": chunks_created,
    }


@router.put("/articles/{article_id}")
async def update_article(
    article_id: str,
    payload: KnowledgeArticleUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update document metadata and content, regenerating vector embeddings if content changed.
    """
    stmt = select(KnowledgeDocument).where(KnowledgeDocument.id == article_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found")

    content_changed = False
    if payload.title is not None and payload.title.strip():
        doc.title = payload.title.strip()
        content_changed = True
    if payload.category is not None:
        doc.category = payload.category
    if payload.content is not None and payload.content.strip():
        doc.content = payload.content.strip()
        content_changed = True
    if payload.summary is not None:
        doc.summary = payload.summary
    if payload.keywords is not None:
        doc.keywords = payload.keywords
    if payload.is_published is not None:
        doc.is_published = payload.is_published
    if payload.author is not None:
        doc.author = payload.author

    doc.updated_at = datetime.now(timezone.utc)

    # Re-index if content changed
    chunks_count = len(doc.chunks) if doc.chunks else 0
    if content_changed:
        chunks_count = await index_document(doc, db)

    await db.commit()
    await db.refresh(doc)

    return {
        "status": "success",
        "message": "Document updated and re-indexed successfully.",
        "id": doc.id,
        "title": doc.title,
        "chunks_count": chunks_count,
        "is_published": doc.is_published,
    }


@router.delete("/articles/{article_id}")
async def delete_article(article_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a knowledge document and its associated vector chunks."""
    stmt = select(KnowledgeDocument).where(KnowledgeDocument.id == article_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found")

    await db.delete(doc)
    await db.commit()

    return {
        "status": "success",
        "message": f"Document '{doc.title}' deleted successfully.",
        "id": article_id,
    }


@router.patch("/articles/{article_id}/toggle-active")
async def toggle_article_active(article_id: str, db: AsyncSession = Depends(get_db)):
    """Toggle document published/active status."""
    stmt = select(KnowledgeDocument).where(KnowledgeDocument.id == article_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge document not found")

    doc.is_published = not doc.is_published
    doc.updated_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "status": "success",
        "id": doc.id,
        "title": doc.title,
        "is_published": doc.is_published,
    }


# -----------------------------------------------------------------------------
# 3. File Upload (.txt / .md) Support
# -----------------------------------------------------------------------------

@router.post("/articles/upload", response_model=FileUploadResponse)
async def upload_article_file(
    file: UploadFile = File(...),
    category: Optional[str] = Form(default="troubleshooting"),
    author: Optional[str] = Form(default="NOC Field Engineering"),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a .txt or .md technical documentation file, automatically creating and vector-indexing it.
    """
    if not file.filename.endswith(('.txt', '.md', '.markdown')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload .txt or .md files only."
        )

    content_bytes = await file.read()
    try:
        content_text = content_bytes.decode('utf-8')
    except UnicodeDecodeError:
        content_text = content_bytes.decode('latin-1', errors='replace')

    if not content_text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    # Extract title from first markdown heading or clean filename
    lines = content_text.strip().split('\n')
    title = file.filename.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ').title()
    for line in lines[:5]:
        stripped = line.strip()
        if stripped.startswith('# '):
            title = stripped.replace('# ', '').strip()
            break

    doc_id = f"kb-up-{str(uuid.uuid4())[:8]}"
    slug = slugify(title)
    chk = await db.execute(select(KnowledgeDocument).where(KnowledgeDocument.slug == slug))
    if chk.scalar_one_or_none():
        slug = f"{slug}-{str(uuid.uuid4())[:4]}"

    doc = KnowledgeDocument(
        id=doc_id,
        title=title,
        slug=slug,
        category=category or "troubleshooting",
        content=content_text.strip(),
        summary=content_text.strip()[:200] + "...",
        keywords=[k.lower() for k in re.findall(r'\w+', title) if len(k) > 3],
        is_published=True,
        author=author or "NOC Documentation Team",
        citations_count=0,
        views_count=1,
    )
    db.add(doc)
    await db.flush()

    chunks_count = await index_document(doc, db)
    await db.commit()

    return FileUploadResponse(
        filename=file.filename,
        title=doc.title,
        category=doc.category,
        document_id=doc.id,
        chunks_created=chunks_count,
        message=f"File successfully uploaded, parsed, and indexed with {chunks_count} semantic vector chunks."
    )


# -----------------------------------------------------------------------------
# 4. Semantic RAG Search Endpoints
# -----------------------------------------------------------------------------

@router.post("/search/semantic", response_model=List[SemanticSearchResultItem])
async def search_semantic_articles(
    payload: SemanticSearchRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Search knowledge documents using semantic embeddings and cosine similarity.
    Returns relevance scores and authoritative source references.
    """
    results = await semantic_search(
        query=payload.query,
        category=payload.category,
        top_k=payload.top_k,
        min_score=payload.min_score,
        db=db
    )
    return [
        SemanticSearchResultItem(
            id=r["id"],
            document_id=r["document_id"],
            title=r["title"],
            category=r["category"],
            content=r["content"],
            snippet=r["snippet"],
            similarity_score=r["similarity_score"],
            source_reference=r["source_reference"],
        )
        for r in results
    ]


@router.post("/search")
async def search_articles_legacy(payload: SearchQuery, db: AsyncSession = Depends(get_db)):
    """Legacy keyword/semantic search endpoint."""
    results = await semantic_search(
        query=payload.query,
        category=payload.category,
        top_k=payload.limit or 5,
        min_score=0.2,
        db=db
    )
    if not results:
        # Fallback to text match
        s = f"%{payload.query}%"
        res = await db.execute(
            select(KnowledgeDocument).where(
                or_(
                    KnowledgeDocument.title.ilike(s),
                    KnowledgeDocument.content.ilike(s),
                )
            ).limit(payload.limit or 5)
        )
        docs = res.scalars().all()
        return [
            {
                "id": d.id,
                "title": d.title,
                "category": d.category,
                "content": d.content,
                "relevance_score": 0.85,
            }
            for d in docs
        ]

    return [
        {
            "id": r["id"],
            "title": r["title"],
            "category": r["category"],
            "content": r["content"],
            "relevance_score": r["similarity_score"],
        }
        for r in results
    ]
