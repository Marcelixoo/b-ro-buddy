# BüroBuddy

Turns German letters (PDFs/photos) into **clear English insights + action points + deadlines**. Later: schedule in Google Calendar and triage from email.

## Quick start

```bash
npm install

# API (FastAPI, uses uv): once install deps, then run
cd apps/api && uv sync
npm run dev:api   # from repo root, or from apps/api: uv run uvicorn main:app --reload

# Web (Next.js), in another terminal
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000) for the app and [http://localhost:8000/docs](http://localhost:8000/docs) for API docs.

**Docker (one command):**

```bash
docker compose up --build
```

Then open http://localhost:3000 and http://localhost:8000/docs. Optional: add `apps/api/.env` with `OPENAI_API_KEY` for real LLM analysis.

## Project structure

```
burobuddy/
  apps/
    web/          # Next.js — upload, results, document history, Q&A
    api/          # FastAPI — upload, extract, analyze, chat
  packages/
    shared/       # Schemas, prompt templates, shared types
  docs/
    roadmap.md
    privacy.md
    threat-model.md
```

## Phases

- **Phase 1 (MVP):** Upload → extract text → LLM analysis → English summary, actions, deadlines, risk flags.
- **Phase 2:** Google Calendar — turn deadlines into events.
- **Phase 3:** Gmail inbox — auto-triage bureaucracy emails.

See [docs/roadmap.md](docs/roadmap.md) for details.

## Environment

- **API:** See `apps/api/README.md` for `OPENAI_API_KEY`, storage paths, etc.
- **Web:** Set `NEXT_PUBLIC_API_URL=http://localhost:8000` if the API is elsewhere.
