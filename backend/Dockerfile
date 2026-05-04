# Stage 1: Builder — install Python dependencies
FROM python:3.12-slim AS builder

WORKDIR /app

# Install system dependencies needed by markitdown[all]
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    exiftool \
    ffmpeg \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml .
RUN pip install --no-cache-dir --prefix=/install .

# Stage 2: Runtime
FROM python:3.12-slim AS runtime

WORKDIR /app

# Install runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    exiftool \
    ffmpeg \
    curl \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY app/ ./app/

# Create uploads directory
RUN mkdir -p /tmp/markitdown_uploads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
