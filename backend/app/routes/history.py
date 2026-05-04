"""History API routes — CRUD for documents and versions."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..services import history_service as hs

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class AddVersionRequest(BaseModel):
    version_type: str  # 'raw_ocr' | 'clean_regex' | 'llm_cleanup' | 'manual_edit'
    content: str
    label: Optional[str] = None
    metadata: Optional[dict] = None


class UpdateVersionRequest(BaseModel):
    content: str
    label: Optional[str] = None


class UpdateNotesRequest(BaseModel):
    notes: str


# ---------------------------------------------------------------------------
# Document endpoints
# ---------------------------------------------------------------------------

@router.get("/history/documents")
async def list_documents(limit: int = 50, offset: int = 0) -> list[dict]:
    """List all documents ordered by most recently updated."""
    return hs.list_documents(limit=limit, offset=offset)


@router.get("/history/documents/{doc_id}")
async def get_document(doc_id: int) -> dict:
    doc = hs.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
    return doc


@router.patch("/history/documents/{doc_id}/notes")
async def update_notes(doc_id: int, body: UpdateNotesRequest) -> dict:
    if not hs.get_document(doc_id):
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
    hs.update_document_notes(doc_id, body.notes)
    return {"ok": True}


@router.delete("/history/documents/{doc_id}", status_code=204)
async def delete_document(doc_id: int) -> None:
    if not hs.get_document(doc_id):
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
    hs.delete_document(doc_id)


# ---------------------------------------------------------------------------
# Version endpoints
# ---------------------------------------------------------------------------

@router.get("/history/documents/{doc_id}/versions")
async def list_versions(doc_id: int) -> list[dict]:
    if not hs.get_document(doc_id):
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
    return hs.list_versions(doc_id)


@router.post("/history/documents/{doc_id}/versions", status_code=201)
async def add_version(doc_id: int, body: AddVersionRequest) -> dict:
    if not hs.get_document(doc_id):
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
    version_id = hs.add_version(
        document_id=doc_id,
        version_type=body.version_type,
        content=body.content,
        label=body.label,
        metadata=body.metadata,
    )
    return {"id": version_id}


@router.get("/history/versions/{version_id}")
async def get_version(version_id: int) -> dict:
    v = hs.get_version(version_id)
    if not v:
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")
    return v


@router.patch("/history/versions/{version_id}")
async def update_version(version_id: int, body: UpdateVersionRequest) -> dict:
    if not hs.get_version(version_id):
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")
    hs.update_version_content(version_id, body.content, body.label)
    return {"ok": True}


@router.delete("/history/versions/{version_id}", status_code=204)
async def delete_version(version_id: int) -> None:
    if not hs.get_version(version_id):
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")
    hs.delete_version(version_id)


# ---------------------------------------------------------------------------
# Settings endpoints
# ---------------------------------------------------------------------------

class SaveSettingsRequest(BaseModel):
    # LLM config (no api_key)
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    llm_base_url: Optional[str] = None
    llm_azure_endpoint: Optional[str] = None
    llm_azure_api_version: Optional[str] = None
    llm_azure_deployment: Optional[str] = None
    llm_prompt: Optional[str] = None
    # MarkItDown config
    enable_plugins: Optional[bool] = None
    enable_builtins: Optional[bool] = None
    style_map: Optional[str] = None
    exiftool_path: Optional[str] = None
    # UI preferences
    selected_method: Optional[str] = None
    stream_info: Optional[dict] = None


@router.get("/settings")
async def get_settings() -> dict:
    """Load persisted UI settings (no API keys)."""
    return hs.load_settings()


@router.post("/settings")
async def save_settings(body: SaveSettingsRequest) -> dict:
    """Save UI settings to backend SQLite. API keys are never stored."""
    hs.save_settings(body.model_dump(exclude_none=True))
    return {"ok": True}
