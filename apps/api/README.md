# BüroBuddy API

FastAPI + Pydantic backend: upload documents, extract text (PDF + OCR), run LLM analysis, document Q&A.

## Setup

[uv](https://docs.astral.sh/uv/) is used for the Python environment and dependencies.

```bash
cd apps/api
uv sync
```

This creates a virtualenv (if needed) and installs dependencies from `pyproject.toml`. To activate the venv and run commands manually: `source .venv/bin/activate` (or `.venv\Scripts\activate` on Windows), then `uvicorn main:app --reload`.

## Environment

Create `.env` in `apps/api/`:

**DB**

- `DATABASE_URL` — SQLite locally: `sqlite+aiosqlite:///./data/burobuddy.db`. Postgres in prod: `postgresql+asyncpg://user:pass@host/db`.

**Storage**

- `UPLOAD_DIR` — default `uploads` (local). S3 later via storage backend.
- `DATA_DIR` — default `data` (SQLite file path).

**LLM** (letters contain personal data; only send to provider when user opts in by using analysis/chat)

- `LLM_PROVIDER` — `openai` (default) or `bedrock`.
- **OpenAI:** `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-4o-mini`).
- **Bedrock (Nova Micro):** `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BEDROCK_MODEL_ID` (default `amazon.nova-micro-v1:0`).

**Other**

- `CORS_ORIGINS` — comma-separated origins (default includes localhost:3000).

## Run

```bash
uv run uvicorn main:app --reload
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs).

**Docker:** From repo root, `docker compose up --build` runs API + Web. The API container uses the same image as built from this Dockerfile; uploads and DB are in named volumes.

## Endpoints

- `POST /documents` — upload PDF/image.
- `GET /documents` — list documents.
- `GET /documents/:id` — document detail (has_text, has_analysis).
- `DELETE /documents/:id` — delete one document and all data (text, analysis, chat, file).
- `DELETE /documents` — delete all documents and all data.
- `POST /documents/:id/extract-text` — extract text (PDF/OCR).
- `POST /documents/:id/analyze` — run LLM analysis (extracts text if needed).
- `GET /documents/:id/analysis` — latest analysis JSON.
- `GET /documents/:id/text` — extracted text.
- `POST /documents/:id/chat` — send a message, get Q&A reply.
- `GET /documents/:id/messages` — chat history.

## OCR

- **Start:** Tesseract (local). Install Tesseract + German: `brew install tesseract tesseract-lang` (macOS), `apt install tesseract-ocr tesseract-ocr-deu` (Ubuntu). Optional: `pdf2image` needs poppler (`brew install poppler`).
- **Upgrade:** AWS Textract for higher quality when needed (not wired in MVP).
