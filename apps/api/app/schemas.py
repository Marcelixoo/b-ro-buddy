from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class DocumentCreate(BaseModel):
    filename: str
    mimetype: str


class DocumentOut(BaseModel):
    id: int
    filename: str
    mimetype: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentDetailOut(DocumentOut):
    storage_path: str | None = None
    has_text: bool = False
    has_analysis: bool = False


class ExtractTextOut(BaseModel):
    document_id: int
    text: str
    language: str | None = None
    extraction_method: str


class AnalysisOut(BaseModel):
    document_id: int
    analysis: dict[str, Any]
    model: str
    created_at: datetime


class ChatMessageIn(BaseModel):
    content: str = Field(..., min_length=1, max_length=4096)


class ChatMessageOut(BaseModel):
    role: str
    content: str
    created_at: datetime
