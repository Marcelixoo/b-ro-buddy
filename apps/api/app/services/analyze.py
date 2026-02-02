"""
LLM analysis: send extracted text to OpenAI or Bedrock Nova and return structured JSON.
"""

import asyncio
import json
from typing import Any

from openai import AsyncOpenAI

from app.config import settings

# Prompt text aligned with shared package (keep in sync)
ANALYSIS_SYSTEM = """You are BüroBuddy, an expert at understanding German bureaucratic letters (Behörden, banks, insurance, tax, etc.).
Your task is to analyze the extracted text and return a structured JSON object.

Rules:
- Output ONLY valid JSON. No markdown, no explanation.
- Detect language (usually "de").
- Summarize in English (summary_en).
- Identify actions (what the recipient must do), each with title_en, details_en, due_date (YYYY-MM-DD or null), confidence (0-1), category, and evidence (quote_de, page).
- Identify deadlines with date, meaning_en, confidence, evidence.
- Extract entities: sender, amount_eur, iban, reference_number, contact_phone, address (use null if not found).
- Set overall_risk: "low" | "medium" | "high" based on urgency and consequences (e.g. late fees, legal, appointments).
- Use the exact schema: language_detected, summary_en, overall_risk, actions[], deadlines[], entities{}."""


def build_user_prompt(text: str) -> str:
    return f"""Analyze this German letter text and return the structured JSON:

---
{text}
---"""


async def analyze_document_text(text: str) -> dict[str, Any]:
    """
    Call LLM (OpenAI or Bedrock Nova) and parse JSON. Returns the analysis dict.
    """
    if settings.LLM_PROVIDER == "bedrock":
        return await _analyze_bedrock(text)
    if not settings.OPENAI_API_KEY:
        return _mock_analysis(text)
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": ANALYSIS_SYSTEM},
            {"role": "user", "content": build_user_prompt(text)},
        ],
        temperature=0.2,
    )
    raw = response.choices[0].message.content or "{}"
    # Strip markdown code block if present
    if raw.startswith("```"):
        lines = raw.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw = "\n".join(lines)
    return json.loads(raw)


def _call_bedrock_sync(text: str) -> dict[str, Any]:
    """Sync Bedrock Converse call (run in thread)."""
    import boto3
    from botocore.config import Config

    client = boto3.client(
        "bedrock-runtime",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        config=Config(read_timeout=120),
    )
    system = [{"text": ANALYSIS_SYSTEM}]
    messages = [{"role": "user", "content": [{"text": build_user_prompt(text)}]}]
    inference_config = {"maxTokens": 4096, "temperature": 0.2}
    resp = client.converse(
        modelId=settings.BEDROCK_MODEL_ID,
        system=system,
        messages=messages,
        inferenceConfig=inference_config,
    )
    output = resp.get("output", [])
    if not output or "message" not in output[0]:
        return _mock_analysis(text)
    content = output[0]["message"].get("content", [])
    raw = content[0].get("text", "{}") if content else "{}"
    if raw.startswith("```"):
        lines = raw.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        raw = "\n".join(lines)
    return json.loads(raw)


async def _analyze_bedrock(text: str) -> dict[str, Any]:
    """Call Bedrock Nova (Nova Micro). Stub when AWS creds not set."""
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        return _mock_analysis(text)
    try:
        return await asyncio.to_thread(_call_bedrock_sync, text)
    except Exception:
        return _mock_analysis(text)


def _mock_analysis(text: str) -> dict[str, Any]:
    """Return a stub when no LLM credentials are set."""
    return {
        "language_detected": "de",
        "summary_en": "Sample summary (set OPENAI_API_KEY for real analysis).",
        "overall_risk": "low",
        "actions": [],
        "deadlines": [],
        "entities": {
            "sender": None,
            "amount_eur": None,
            "iban": None,
            "reference_number": None,
            "contact_phone": None,
            "address": None,
        },
    }
