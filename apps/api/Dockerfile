# BüroBuddy API — FastAPI + uv
FROM python:3.12-slim

WORKDIR /app

# System deps: poppler (pdf2image), tesseract (pytesseract OCR)
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Dependencies (lockfile for reproducible installs)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Application
COPY . .

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
