"""
Document Q&A: chat with context of document text + analysis.
"""

from openai import AsyncOpenAI

from app.config import settings


async def chat_with_document(
    document_text: str,
    analysis_summary: str,
    history: list[dict[str, str]],
    user_message: str,
) -> str:
    """
    Send user message + document context to LLM, return assistant reply.
    """
    if not settings.OPENAI_API_KEY:
        return "Chat is disabled. Set OPENAI_API_KEY to enable document Q&A."

    system = f"""You are BüroBuddy. Answer questions about this German letter based ONLY on the following.

Document (extracted text):
{document_text}

Analysis summary:
{analysis_summary}

Answer in English. Be concise. If the answer is not in the document, say so."""

    messages: list[dict[str, str]] = [{"role": "system", "content": system}]
    for h in history:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_message})

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        temperature=0.3,
    )
    return (response.choices[0].message.content or "").strip()
