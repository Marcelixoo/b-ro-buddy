"use client";

import {
  type AnalysisOut,
  type DocumentOut,
  analyzeDocument,
  extractText,
  getAnalysis,
  uploadDocument,
} from "@/lib/api";
import Link from "next/link";
import { useCallback, useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [doc, setDoc] = useState<DocumentOut | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const allowed = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg",
      ];
      if (!allowed.includes(f.type)) {
        setError("Please choose a PDF or image (JPG/PNG).");
        return;
      }
      setError(null);
      setFile(f);
      setDoc(null);
      setAnalysis(null);
    },
    [],
  );

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const d = await uploadDocument(file);
      setDoc(d);
      setAnalysis(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [file]);

  const handleAnalyze = useCallback(async () => {
    if (!doc) return;
    setError(null);
    setAnalyzing(true);
    try {
      await extractText(doc.id);
      const result = await analyzeDocument(doc.id);
      setAnalysis(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }, [doc]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-stone-800">
            BüroBuddy
          </Link>
          <Link
            href="/documents"
            className="text-sm font-medium text-stone-600 hover:text-stone-900"
          >
            Document history
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-semibold text-stone-800">
          Upload a letter
        </h1>
        <p className="mb-6 text-stone-600">
          PDF or photo of a German letter — get an English summary, action
          items, and deadlines.
        </p>

        <div className="mb-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <label
            htmlFor="file-upload"
            className="mb-2 block text-sm font-medium text-stone-700"
          >
            Choose file
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".pdf,image/jpeg,image/png,image/jpg"
            onChange={handleFileChange}
            className="block w-full text-sm text-stone-600 file:mr-4 file:rounded-md file:border-0 file:bg-stone-200 file:px-4 file:py-2 file:text-stone-800"
          />
          {file && (
            <p className="mt-2 text-sm text-stone-500">
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || uploading}
              className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
            {doc && (
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                {analyzing ? "Analyzing…" : "Extract & analyze"}
              </button>
            )}
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        {doc && (
          <div className="mb-6">
            <Link
              href={`/documents/${doc.id}`}
              className="text-sm font-medium text-stone-600 hover:text-stone-900"
            >
              Open document page →
            </Link>
          </div>
        )}

        {analysis && (
          <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-stone-800">
              Summary
            </h2>
            <p className="mb-4 text-stone-600">
              {analysis.analysis.summary_en}
            </p>
            <div className="mb-3 flex items-center gap-2">
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
                      <span className="font-medium text-stone-800">
                        {d.date}
                      </span>
                      <p className="text-sm text-stone-600">{d.meaning_en}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
