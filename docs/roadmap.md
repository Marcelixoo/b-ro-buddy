# BüroBuddy — Roadmap

## Phase 1 — MVP (Upload → Understand → Actions)

**Goal:** Upload a PDF/photo and get English summary, action items, deadlines, risk flags, evidence quotes.

**User flow**
1. Upload PDF/image (mobile-friendly web upload)
2. Extract text (PDF text, OCR fallback for photos/scans)
3. LLM returns structured JSON (summary/actions/deadlines)
4. UI shows results + “Ask questions” chat about the document
5. Document history list

**Done when**
- A random German letter becomes usable action points in < 30 seconds
- Works great for machine PDFs, “good enough” for photos

---

## Phase 2 — Calendar (Actions → Scheduled)

**Goal:** Convert actions/deadlines into calendar entries.

- Google OAuth
- Add deadline events / tasks / focus blocks
- Reminders

**Done when**
- One click turns a deadline into a calendar event with link + context

---

## Phase 3 — Inbox (Email → Auto-triage)

**Goal:** Connect Gmail and auto-process “bureaucracy” emails.

- Detect relevant emails (rules + LLM classification)
- Extract attachments → same pipeline as Phase 1
- Weekly digest + reminders

**Done when**
- Bureaucracy emails get summarized and scheduled with minimal manual work
