"""Application configuration loaded from environment variables."""

import os

from dotenv import load_dotenv

load_dotenv()

# Upload limits
UPLOAD_MAX_SIZE_MB: int = int(os.getenv("UPLOAD_MAX_SIZE_MB", "50"))
UPLOAD_MAX_SIZE_BYTES: int = UPLOAD_MAX_SIZE_MB * 1024 * 1024

# Upload directory
UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/tmp/markitdown_uploads")

# ExifTool path (optional)
EXIFTOOL_PATH: str | None = os.getenv("EXIFTOOL_PATH")

# LLM provider API keys
OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
AZURE_OPENAI_API_KEY: str | None = os.getenv("AZURE_OPENAI_API_KEY")
GOOGLE_API_KEY: str | None = os.getenv("GOOGLE_API_KEY")
TOGETHER_API_KEY: str | None = os.getenv("TOGETHER_API_KEY")
GROQ_API_KEY: str | None = os.getenv("GROQ_API_KEY")

# Allowed file extensions for upload (Requirement 1.1)
ALLOWED_EXTENSIONS: set[str] = {
    ".pdf",
    ".docx",
    ".xlsx",
    ".xls",
    ".pptx",
    ".html",
    ".csv",
    ".json",
    ".xml",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".tiff",
    ".mp3",
    ".wav",
    ".zip",
    ".epub",
    ".ipynb",
}
