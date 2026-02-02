# BüroBuddy — Privacy

Letters contain personal data; we treat them as sensitive from day one.

## Principles

- **Store minimal data by default** — only what’s needed for summary, actions, deadlines, and Q&A.
- **No third-party sending unless user opts in** — analysis and chat send content to the LLM provider only when you use those features (upload → extract → analyze / chat). We don’t send docs to other services for marketing or training.
- **Delete early** — “Delete document” and “Delete all history” are available in the UI and API so you can remove data at any time.

## What we process

- **Uploaded files:** PDFs and images you upload are stored (locally in dev; S3/configurable in prod) and their text is extracted.
- **Extracted text:** Sent to the LLM provider (OpenAI or AWS Bedrock) only when you run analysis or chat. See the provider’s privacy policy for how they handle data.
- **Chat:** Questions and answers about a document are stored and sent to the LLM for follow-up replies when you use the Q&A feature.

## What we don’t do (MVP)

- We don’t sell or share your data with third parties for advertising.
- We don’t use your data to train models (per typical API terms).

## Storage

- **Dev:** Files and SQLite DB are on your machine (e.g. `apps/api/uploads`, `apps/api/data`).
- **Prod:** Configure blob storage (e.g. S3) and database; ensure access control and retention policies match your requirements.

## Your choices

- **Delete document** — removes the file, extracted text, analysis, and chat for that document (API: `DELETE /documents/:id`; UI: document page).
- **Delete all history** — removes all documents and all related data (API: `DELETE /documents`; UI: document history page).
- Don’t upload sensitive documents if you don’t want them processed by the chosen LLM provider.

## Updates

This page will be updated as features (e.g. Calendar, Inbox) and data flows change.
