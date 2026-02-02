"use client";

import {
  type AnalysisOut,
  type ChatMessageOut,
  analyzeDocument,
  deleteDocument,
  getAnalysis,
  getChatMessages,
  getDocumentText,
  sendChatMessage,
} from "@/lib/api";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type DocumentViewProps = {
  documentId: number;
  filename: string;
};

export function DocumentView({ documentId, filename }: DocumentViewProps) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AnalysisOut | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageOut[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalysis = useCallback(async () => {
    const a = await getAnalysis(documentId);
    setAnalysis(a ?? null);
  }, [documentId]);

  const loadMessages = useCallback(async () => {
    const m = await getChatMessages(documentId);
    setMessages(m);
  }, [documentId]);

  useEffect(() => {
    getAnalysis(documentId)
      .then((a) => setAnalysis(a ?? null))
      .catch(() => setAnalysis(null));
    getChatMessages(documentId)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [documentId]);

  const handleAnalyze = useCallback(async () => {
    setError(null);
    setAnalyzing(true);
    try {
      await analyzeDocument(documentId);
      await loadAnalysis();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }, [documentId, loadAnalysis]);

  const handleShowText = useCallback(async () => {
    setError(null);
    try {
      const t = await getDocumentText(documentId);
      setText(t.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load text");
    }
  }, [documentId]);

  const handleSendChat = useCallback(async () => {
    const content = chatInput.trim();
    if (!content || sending) return;
    setError(null);
    setSending(true);
    setChatInput("");
    try {
      const msg = await sendChatMessage(documentId, content);
      setMessages((prev) => [
        ...prev,
        { role: "user", content, created_at: new Date().toISOString() },
        msg,
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
      setChatInput(content);
    } finally {
      setSending(false);
    }
  }, [documentId, chatInput, sending]);

  const handleDeleteDocument = useCallback(async () => {
    if (
      !confirm(
        "Delete this document and all its data (text, analysis, chat)? This cannot be undone.",
      )
    )
      return;
    setError(null);
    setDeleting(true);
    try {
      await deleteDocument(documentId);
      router.push("/documents");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }, [documentId, router]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">{filename}</h1>
          <p className="text-sm text-stone-500">Document #{documentId}</p>
        </div>
        <button
          type="button"
          onClick={handleDeleteDocument}
          disabled={deleting}
          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete document"}
        </button>
      </div>

      {!analysis && (
        <div className="mb-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="mb-3 text-stone-600">
            No analysis yet. Extract text and run the LLM to get summary,
            actions, and deadlines.
          </p>
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {analyzing ? "Analyzing…" : "Extract & analyze"}
          </button>
        </div>
      )}

      {analysis && (
        <section className="mb-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-stone-800">Summary</h2>
          <p className="mb-4 text-stone-600">{analysis.analysis.summary_en}</p>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm font-medium text-stone-700">Risk:</span>
            <span
              className={`rounded px-2 py-0.5 text-sm font-medium ${
                analysis.analysis.overall_risk === "high"
                  ? "bg-red-100 text-red-800"
                  : analysis.analysis.overall_risk === "medium"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-green-100 text-green-800"
              }`}
            >
              {analysis.analysis.overall_risk}
            </span>
          </div>
          {analysis.analysis.actions.length > 0 && (
            <>
              <h3 className="mb-2 text-base font-semibold text-stone-800">
                Action items
              </h3>
              <ul className="mb-4 space-y-2">
                {analysis.analysis.actions.map((a) => (
                  <li
                    key={`${a.title_en}-${a.evidence.quote_de.slice(0, 30)}`}
                    className="rounded-lg border border-stone-100 bg-stone-50 p-3"
                  >
                    <span className="font-medium text-stone-800">
                      {a.title_en}
                    </span>
                    <p className="mt-1 text-sm text-stone-600">
                      {a.details_en}
                    </p>
                    {a.due_date && (
                      <p className="mt-1 text-xs text-stone-500">
                        Due: {a.due_date} · {a.category}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          {analysis.analysis.deadlines.length > 0 && (
            <>
              <h3 className="mb-2 text-base font-semibold text-stone-800">
                Deadlines
              </h3>
              <ul className="space-y-2">
                {analysis.analysis.deadlines.map((d) => (
                  <li
                    key={`${d.date}-${d.meaning_en.slice(0, 20)}`}
                    className="rounded-lg border border-amber-100 bg-amber-50/50 p-3"
                  >
                    <span className="font-medium text-stone-800">{d.date}</span>
                    <p className="text-sm text-stone-600">{d.meaning_en}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <section className="mb-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-stone-800">
          Extracted text
        </h2>
        <button
          type="button"
          onClick={handleShowText}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          {text !== null ? "Refresh text" : "Show extracted text"}
        </button>
        {text !== null && (
          <pre className="mt-4 max-h-64 overflow-auto rounded-lg border border-stone-100 bg-stone-50 p-4 text-xs text-stone-700 whitespace-pre-wrap">
            {text || "(empty)"}
          </pre>
        )}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-stone-800">
          Ask about this document
        </h2>
        <ul className="mb-4 space-y-2">
          {messages.map((m) => (
            <li
              key={`${m.created_at}-${m.content.slice(0, 20)}`}
              className={`rounded-lg p-3 ${
                m.role === "user"
                  ? "bg-stone-100 text-stone-800"
                  : "bg-stone-50 text-stone-700"
              }`}
            >
              <span className="text-xs font-medium text-stone-500">
                {m.role}
              </span>
              <p className="mt-1 text-sm">{m.content}</p>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendChat();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask a question…"
            className="flex-1 rounded-lg border border-stone-300 px-4 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !chatInput.trim()}
            className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </section>
    </>
  );
}
