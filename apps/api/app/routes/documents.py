"""
Document routes: upload, get, extract-text, analyze, chat.
"""

import contextlib
import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Document, DocumentAnalysis, DocumentMessage, DocumentText
from app.schemas import (
    AnalysisOut,
    ChatMessageIn,
    ChatMessageOut,
    DocumentDetailOut,
    DocumentOut,
    ExtractTextOut,
)
from app.services.analyze import analyze_document_text
from app.services.chat import chat_with_document
from app.services.extract import extract_text

router = APIRouter()
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _create_document(
    file: UploadFile,
    db: AsyncSession,
):
    """Shared upload logic."""
    if not file.filename:
        raise HTTPException(400, "Missing filename")
    allowed = (
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg",
    )
    if file.content_type not in allowed:
        raise HTTPException(400, f"Unsupported type: {file.content_type}")

    ext = Path(file.filename).suffix or ".bin"
    storage_name = f"{uuid4().hex}{ext}"
    storage_path = UPLOAD_DIR / storage_name
    with storage_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    doc = Document(
        filename=file.filename,
        mimetype=file.content_type or "application/octet-stream",
        storage_path=str(storage_path),
        status="uploaded",
    )
    db.add(doc)
    return doc


@router.post("", response_model=DocumentOut)
@router.post("/", response_model=DocumentOut)
async def create_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a PDF or image. File is stored locally."""
    doc = _create_document(file, db)
    await db.flush()
    await db.refresh(doc)
    return doc


@router.get("", response_model=list[DocumentOut])
@router.get("/", response_model=list[DocumentOut])
async def list_documents(db: AsyncSession = Depends(get_db)):
    """List all documents (newest first)."""
    result = await db.execute(select(Document).order_by(Document.created_at.desc()))
    return list(result.scalars().all())


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a document and all related data (text, analysis, chat). Removes file from disk."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")

    # Delete children first (order matters for FK)
    await db.execute(delete(DocumentMessage).where(DocumentMessage.document_id == document_id))
    await db.execute(delete(DocumentAnalysis).where(DocumentAnalysis.document_id == document_id))
    await db.execute(delete(DocumentText).where(DocumentText.document_id == document_id))
    await db.execute(delete(Document).where(Document.id == document_id))
    await db.flush()

    # Remove file from disk
    if doc.storage_path:
        path = Path(doc.storage_path)
        if path.exists():
            with contextlib.suppress(OSError):
                path.unlink()
    return None


@router.delete("", status_code=204)
@router.delete("/", status_code=204)
async def delete_all_documents(db: AsyncSession = Depends(get_db)):
    """Delete all documents and all related data. Removes all uploaded files from disk."""
    result = await db.execute(select(Document))
    docs = list(result.scalars().all())
    for doc in docs:
        if doc.storage_path:
            path = Path(doc.storage_path)
            if path.exists():
                with contextlib.suppress(OSError):
                    path.unlink()
    await db.execute(delete(DocumentMessage))
    await db.execute(delete(DocumentAnalysis))
    await db.execute(delete(DocumentText))
    await db.execute(delete(Document))
    await db.flush()
    return None


@router.get("/{document_id}", response_model=DocumentDetailOut)
async def get_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get document metadata and whether text/analysis exist."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")

    # Check for text and latest analysis
    text_result = await db.execute(
        select(DocumentText).where(DocumentText.document_id == document_id)
    )
    analysis_result = await db.execute(
        select(DocumentAnalysis).where(DocumentAnalysis.document_id == document_id)
    )
    return DocumentDetailOut(
        id=doc.id,
        filename=doc.filename,
        mimetype=doc.mimetype,
        status=doc.status,
        created_at=doc.created_at,
        storage_path=doc.storage_path,
        has_text=text_result.scalar_one_or_none() is not None,
        has_analysis=analysis_result.scalar_one_or_none() is not None,
    )


@router.post("/{document_id}/extract-text", response_model=ExtractTextOut)
async def extract_document_text(
    document_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Extract text from the document (PDF or OCR for images)."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc or not doc.storage_path:
        raise HTTPException(404, "Document not found")

    path = Path(doc.storage_path)
    if not path.exists():
        raise HTTPException(404, "File not found on disk")

    text, method = extract_text(path, doc.mimetype)

    # Upsert document_text
    existing = await db.execute(select(DocumentText).where(DocumentText.document_id == document_id))
    row = existing.scalar_one_or_none()
    if row:
        row.text = text
        row.extraction_method = method
    else:
        row = DocumentText(
            document_id=document_id,
            text=text,
            extraction_method=method,
        )
        db.add(row)
    await db.flush()

    return ExtractTextOut(
        document_id=document_id,
        text=text,
        extraction_method=method,
    )


@router.post("/{document_id}/analyze", response_model=AnalysisOut)
async def analyze_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Run LLM analysis on extracted text. Extracts text first if missing."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")

    text_result = await db.execute(
        select(DocumentText).where(DocumentText.document_id == document_id)
    )
    text_row = text_result.scalar_one_or_none()
    if not text_row:
        if not doc.storage_path or not Path(doc.storage_path).exists():
            raise HTTPException(400, "Extract text first or file missing")
        path = Path(doc.storage_path)
        text, method = extract_text(path, doc.mimetype)
        text_row = DocumentText(
            document_id=document_id,
            text=text,
            extraction_method=method,
        )
        db.add(text_row)
        await db.flush()

    analysis_json = await analyze_document_text(text_row.text)

    analysis_row = DocumentAnalysis(
        document_id=document_id,
        json=analysis_json,
        model=settings.OPENAI_MODEL,
    )
    db.add(analysis_row)
    await db.flush()
    await db.refresh(analysis_row)

    return AnalysisOut(
        document_id=document_id,
        analysis=analysis_json,
        model=settings.OPENAI_MODEL,
        created_at=analysis_row.created_at,
    )


@router.get("/{document_id}/analysis", response_model=AnalysisOut)
async def get_latest_analysis(
    document_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get the latest analysis for a document. 404 if none."""
    result = await db.execute(
        select(DocumentAnalysis)
        .where(DocumentAnalysis.document_id == document_id)
        .order_by(DocumentAnalysis.created_at.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "No analysis yet")
    return AnalysisOut(
        document_id=document_id,
        analysis=row.json,
        model=row.model,
        created_at=row.created_at,
    )


@router.get("/{document_id}/text")
async def get_document_text(
    document_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get extracted text. Returns 404 if not extracted yet."""
    result = await db.execute(select(DocumentText).where(DocumentText.document_id == document_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Text not extracted. Call POST /extract-text first.")
    return {
        "document_id": document_id,
        "text": row.text,
        "extraction_method": row.extraction_method,
    }


@router.post("/{document_id}/chat", response_model=ChatMessageOut)
async def document_chat(
    document_id: int,
    body: ChatMessageIn,
    db: AsyncSession = Depends(get_db),
):
    """Send a message about the document; get an assistant reply (Q&A)."""
    doc_result = await db.execute(select(Document).where(Document.id == document_id))
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")

    text_result = await db.execute(
        select(DocumentText).where(DocumentText.document_id == document_id)
    )
    text_row = text_result.scalar_one_or_none()
    if not text_row:
        raise HTTPException(400, "Extract text first")

    analysis_result = await db.execute(
        select(DocumentAnalysis)
        .where(DocumentAnalysis.document_id == document_id)
        .order_by(DocumentAnalysis.created_at.desc())
        .limit(1)
    )
    analysis_row = analysis_result.scalar_one_or_none()
    summary = analysis_row.json.get("summary_en", "") if analysis_row else ""

    messages_result = await db.execute(
        select(DocumentMessage)
        .where(DocumentMessage.document_id == document_id)
        .order_by(DocumentMessage.created_at.asc())
    )
    history = [{"role": m.role, "content": m.content} for m in messages_result.scalars().all()]

    reply = await chat_with_document(
        document_text=text_row.text,
        analysis_summary=summary,
        history=history,
        user_message=body.content,
    )

    user_msg = DocumentMessage(
        document_id=document_id,
        role="user",
        content=body.content,
    )
    db.add(user_msg)
    await db.flush()
    assistant_msg = DocumentMessage(
        document_id=document_id,
        role="assistant",
        content=reply,
    )
    db.add(assistant_msg)
    await db.flush()
    await db.refresh(assistant_msg)

    return ChatMessageOut(
        role="assistant",
        content=reply,
        created_at=assistant_msg.created_at,
    )


@router.get("/{document_id}/messages", response_model=list[ChatMessageOut])
async def list_chat_messages(
    document_id: int,
    db: AsyncSession = Depends(get_db),
):
    """List chat messages for the document."""
    result = await db.execute(
        select(DocumentMessage)
        .where(DocumentMessage.document_id == document_id)
        .order_by(DocumentMessage.created_at.asc())
    )
    return [
        ChatMessageOut(role=m.role, content=m.content, created_at=m.created_at)
        for m in result.scalars().all()
    ]
