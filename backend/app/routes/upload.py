"""Upload routes for file management."""

import mimetypes
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..config import ALLOWED_EXTENSIONS, UPLOAD_DIR, UPLOAD_MAX_SIZE_BYTES
from ..models.schemas import UploadResponse

router = APIRouter()


def _detect_mimetype(filename: str, data: bytes) -> str:
    """Detect MIME type using python-magic if available, falling back to mimetypes."""
    try:
        import magic  # type: ignore

        mime = magic.from_buffer(data, mime=True)
        if mime:
            return mime
    except ImportError:
        pass

    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


async def _save_upload(file: UploadFile) -> UploadResponse:
    """Validate and save a single uploaded file. Returns UploadResponse."""
    original_filename = file.filename or ""
    extension = Path(original_filename).suffix.lower()

    # Validate extension
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File extension '{extension}' is not allowed. "
            f"Allowed extensions: {sorted(ALLOWED_EXTENSIONS)}",
        )

    # Read file content
    data = await file.read()
    file_size = len(data)

    # Validate size
    if file_size > UPLOAD_MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File size {file_size} bytes exceeds the maximum allowed size "
            f"of {UPLOAD_MAX_SIZE_BYTES} bytes.",
        )

    # Generate unique file ID and save
    file_id = str(uuid.uuid4())
    upload_dir = Path(UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    dest_path = upload_dir / f"{file_id}{extension}"
    dest_path.write_bytes(data)

    # Detect MIME type
    mimetype = _detect_mimetype(original_filename, data)

    return UploadResponse(
        file_id=file_id,
        filename=original_filename,
        size=file_size,
        mimetype=mimetype,
    )


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)) -> UploadResponse:
    """Upload a single file and return its metadata."""
    return await _save_upload(file)


@router.post("/upload/batch", response_model=list[UploadResponse])
async def upload_batch(files: list[UploadFile] = File(...)) -> list[UploadResponse]:
    """Upload multiple files and return their metadata."""
    results: list[UploadResponse] = []
    for file in files:
        result = await _save_upload(file)
        results.append(result)
    return results


@router.delete("/upload/{file_id}", status_code=204)
async def delete_upload(file_id: str) -> None:
    """Delete an uploaded file by its file_id."""
    upload_dir = Path(UPLOAD_DIR)

    # Find the file matching the file_id prefix
    if upload_dir.exists():
        for candidate in upload_dir.iterdir():
            if candidate.stem == file_id:
                candidate.unlink()
                return

    raise HTTPException(
        status_code=404,
        detail=f"File with id '{file_id}' not found.",
    )
