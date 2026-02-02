"use client";

import {
  type DocumentOut,
  deleteAllDocuments,
  deleteDocument,
  listDocuments,
} from "@/lib/api";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function DocumentsList() {
  const [docs, setDocs] = useState<DocumentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    listDocuments()
      .then(setDocs)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDeleteAll = useCallback(async () => {
    if (
      !confirm(
        "Delete all documents and all data (text, analysis, chat)? This cannot be undone.",
      )
    )
      return;
    setError(null);
    setDeletingAll(true);
    try {
      await deleteAllDocuments();
      setDocs([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete all failed");
    } finally {
      setDeletingAll(false);
    }
  }, []);

  const handleDeleteOne = useCallback(
    async (e: React.MouseEvent, id: number) => {
      e.preventDefault();
      e.stopPropagation();
      if (
        !confirm(
          "Delete this document and all its data? This cannot be undone.",
        )
      )
        return;
      setError(null);
      setDeletingId(id);
      try {
        await deleteDocument(id);
        setDocs((prev) => prev.filter((d) => d.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      } finally {
        setDeletingId(null);
      }
    },
    [],
  );

  return (
    <>
      {loading && <p className="text-stone-500">Loading documents…</p>}
      {error && (
        <div>
          <p className="text-red-600" role="alert">
            {error}
          </p>
          <button
            type="button"
            onClick={refresh}
            className="mt-2 text-sm font-medium text-stone-600 hover:text-stone-900 underline"
          >
            Retry
          </button>
        </div>
      )}
      {!loading && !error && docs.length === 0 && (
        <p className="text-stone-600">
          No documents yet.{" "}
          <Link href="/" className="font-medium text-stone-800 hover:underline">
            Upload one
          </Link>
          .
        </p>
      )}
      {!loading && !error && docs.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {deletingAll ? "Deleting…" : "Delete all history"}
            </button>
          </div>
          <ul className="space-y-2">
            {docs.map((d) => (
              <li key={d.id} className="group relative">
                <Link
                  href={`/documents/${d.id}`}
                  className="block rounded-lg border border-stone-200 bg-white px-4 py-3 pr-24 shadow-sm hover:border-stone-300 hover:bg-stone-50"
                >
                  <span className="font-medium text-stone-800">
                    {d.filename}
                  </span>
                  <span className="ml-2 text-sm text-stone-500">
                    {new Date(d.created_at).toLocaleDateString()}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={(e) => handleDeleteOne(e, d.id)}
                  disabled={deletingId === d.id}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-600 opacity-0 hover:bg-red-50 hover:text-red-700 group-hover:opacity-100 disabled:opacity-50"
                  aria-label={`Delete ${d.filename}`}
                >
                  {deletingId === d.id ? "…" : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
