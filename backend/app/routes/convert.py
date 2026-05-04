"""Synchronous conversion REST endpoints."""

from __future__ import annotations

import importlib.metadata
import time
from pathlib import Path

from pydantic import BaseModel
from typing import Optional

from fastapi import APIRouter, HTTPException

from ..config import UPLOAD_DIR
from ..models.schemas import (
    ConnectionTestResult,
    ConversionResult,
    ConvertRequest,
    LLMConfig,
)
from ..services.llm_factory import LLMClientFactory
from ..services.test_runner import TestRunner

_start_time = time.time()

router = APIRouter()


async def _noop_callback(update) -> None:
    """No-op progress callback for synchronous REST routes."""
    pass


@router.post("/convert", response_model=ConversionResult)
async def convert_file(request: ConvertRequest) -> ConversionResult:
    """Synchronous single file conversion.

    Looks up the uploaded file by file_id, then runs the conversion using
    the requested API method and configuration.
    """
    if request.file_id is None:
        raise HTTPException(status_code=400, detail="file_id is required for file conversion")

    # Glob for the file — it may have any extension appended
    matches = list(Path(UPLOAD_DIR).glob(f"{request.file_id}*"))
    if not matches:
        raise HTTPException(
            status_code=404,
            detail=f"No uploaded file found for file_id: {request.file_id}",
        )

    file_path = str(matches[0])

    result = await TestRunner().execute_conversion(
        file_path=file_path,
        url=None,
        api_method=request.api_method,
        stream_info_config=request.stream_info,
        config=request.config,
        llm_config=request.llm_config,
        progress_callback=_noop_callback,
    )
    return result


@router.post("/convert/url", response_model=ConversionResult)
async def convert_url(request: ConvertRequest) -> ConversionResult:
    """Synchronous URL conversion.

    Converts the URL provided in the request body using the requested
    API method and configuration.
    """
    if request.url is None:
        raise HTTPException(status_code=400, detail="url is required for URL conversion")

    result = await TestRunner().execute_conversion(
        file_path=None,
        url=request.url,
        api_method=request.api_method,
        stream_info_config=request.stream_info,
        config=request.config,
        llm_config=request.llm_config,
        progress_callback=_noop_callback,
    )
    return result


@router.post("/llm/test-connection", response_model=ConnectionTestResult)
async def test_llm_connection(config: LLMConfig) -> ConnectionTestResult:
    """Test LLM provider connectivity.

    Attempts to list models from the configured provider to verify that
    the credentials and endpoint are reachable.
    """
    result = await LLMClientFactory.test_connection(config)
    return result


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint for Docker and monitoring.

    Returns the application status, installed markitdown version, and
    how long the process has been running.
    """
    try:
        markitdown_version = importlib.metadata.version("markitdown")
    except Exception:
        markitdown_version = "unknown"

    return {
        "status": "ok",
        "markitdown_version": markitdown_version,
        "uptime_seconds": time.time() - _start_time,
    }


@router.get("/config/defaults")
async def get_defaults() -> dict:
    """Return default LLM endpoint URLs so the frontend can show correct placeholders."""
    import os
    return {
        "lm_studio_base_url": os.getenv("LM_STUDIO_BASE_URL", "http://localhost:1234/v1"),
        "ollama_base_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
    }


# ---------------------------------------------------------------------------
# Post-processing endpoints
# ---------------------------------------------------------------------------

class CleanRequest(BaseModel):
    content: str


class LLMCleanupRequest(BaseModel):
    content: str
    custom_prompt: Optional[str] = None


class SaveVersionRequest(BaseModel):
    filename: str
    source_type: str = "file"
    source_url: Optional[str] = None
    page_count: Optional[int] = None
    llm_model: Optional[str] = None
    llm_provider: Optional[str] = None
    version_type: str = "raw_ocr"
    content: str
    label: Optional[str] = None
    metadata: Optional[dict] = None


@router.post("/postprocess/clean")
async def clean_text(body: CleanRequest) -> dict:
    """Apply regex-based cleaning to Markdown text."""
    from ..services.postprocess_service import clean_regex
    cleaned = clean_regex(body.content)
    return {"content": cleaned}


@router.post("/postprocess/llm-cleanup")
async def llm_cleanup_text(body: LLMCleanupRequest, llm_config: LLMConfig = None) -> dict:
    """Send Markdown to LLM for cleanup. Requires LLM config in request body."""
    raise HTTPException(status_code=400, detail="Use WebSocket action 'llm_cleanup' for LLM-based cleanup")


@router.post("/history/save", status_code=201)
async def save_to_history(body: SaveVersionRequest) -> dict:
    """Create a document + first version in history."""
    from ..services import history_service as hs
    doc_id = hs.create_document(
        filename=body.filename,
        source_type=body.source_type,
        source_url=body.source_url,
        page_count=body.page_count,
        llm_model=body.llm_model,
        llm_provider=body.llm_provider,
    )
    version_id = hs.add_version(
        document_id=doc_id,
        version_type=body.version_type,
        content=body.content,
        label=body.label,
        metadata=body.metadata,
    )
    return {"document_id": doc_id, "version_id": version_id}
