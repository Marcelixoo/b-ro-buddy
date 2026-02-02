# BüroBuddy — Threat Model (MVP)

## Scope

- Web app (Next.js) and API (FastAPI)
- Local/SQLite storage and file uploads
- LLM provider (e.g. OpenAI) for analysis and chat

## Assets

- User-uploaded documents (often sensitive: letters, IDs, financials) — **treated as sensitive from day one**
- Extracted text and analysis results
- Chat history

## Privacy by design (MVP)

- **Minimal storage** — only document metadata, extracted text, analysis JSON, and chat messages; no secondary analytics store.
- **Third-party sending only on use** — docs/text are sent to the LLM provider only when the user runs analysis or chat (opt-in by action).
- **Delete document + Delete all history** — available in API and UI so users can remove data at any time.

## Threats (MVP)

| Threat | Mitigation |
|--------|------------|
| **Data leakage to third parties** | LLM calls go only to configured provider; no arbitrary exfiltration. Use provider’s compliance options (e.g. no training) where needed. |
| **Unauthorized access to stored files** | Dev: local disk, single-user. Prod: restrict blob/DB access (IAM, network), auth on API. |
| **Injection / prompt abuse** | User content is passed to LLM; standard prompt-injection risks. No privileged backend actions driven by user text in MVP. |
| **Malicious uploads** | Accept only PDF/images; store with safe names; no server-side execution of file content. |
| **CORS / XSS** | CORS restricted to known origins; frontend uses standard frameworks (Next.js, React). |

## Out of scope (MVP)

- Authn/authz (single-user or dev-only)
- Rate limiting, DDoS
- Full supply-chain and dependency audit

## Later phases

- **Calendar / Gmail:** OAuth and token storage; treat tokens and calendar/email access as high-value assets.
- **Inbox:** Email content and attachments same sensitivity as uploaded documents; apply same storage and LLM policies.
