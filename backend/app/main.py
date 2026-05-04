"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import UPLOAD_DIR
from .routes.convert import router as convert_router
from .routes.upload import router as upload_router
from .routes.history import router as history_router
from .ws.handler import ws_router
from .services import history_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan: create upload dir on startup, clean up on shutdown."""
    # Startup: ensure upload directory exists
    upload_dir = Path(UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    # Initialize SQLite history database
    history_service.init_db()

    yield

    # Shutdown: remove all files in the upload directory (keep the directory itself)
    if upload_dir.exists():
        for file in upload_dir.iterdir():
            if file.is_file():
                file.unlink()


app = FastAPI(title="MarkItDown Test UI API", lifespan=lifespan)

# CORS middleware — allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(upload_router, prefix="/api")
app.include_router(convert_router, prefix="/api")
app.include_router(history_router, prefix="/api")
app.include_router(ws_router)


@app.get("/")
async def root() -> dict:
    """Root endpoint."""
    return {"message": "MarkItDown Test UI API"}
