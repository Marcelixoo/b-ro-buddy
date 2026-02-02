/**
 * API client for BüroBuddy backend.
 * Server-side (SSR) uses API_URL_INTERNAL (e.g. http://api:8000 in Docker).
 * Client-side uses NEXT_PUBLIC_API_URL (e.g. http://localhost:8001).
 */
const API_URL =
  typeof window === "undefined"
    ? (process.env.API_URL_INTERNAL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:8000")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

export type DocumentOut = {
  id: number;
  filename: string;
  mimetype: string;
  status: string;
  created_at: string;
};

export type DocumentDetailOut = DocumentOut & {
  storage_path?: string | null;
  has_text: boolean;
  has_analysis: boolean;
};

export type ExtractTextOut = {
  document_id: number;
  text: string;
  extraction_method: string;
};

export type AnalysisOut = {
  document_id: number;
  analysis: DocumentAnalysis;
  model: string;
  created_at: string;
};

export type DocumentAnalysis = {
  language_detected: string;
  summary_en: string;
  overall_risk: "low" | "medium" | "high";
  actions: Array<{
    title_en: string;
    details_en: string;
    due_date: string | null;
    confidence: number;
    category: string;
    evidence: { quote_de: string; page?: number };
  }>;
  deadlines: Array<{
    date: string;
    meaning_en: string;
    confidence: number;
    evidence: { quote_de: string; page?: number };
  }>;
  entities: {
    sender: string | null;
    amount_eur: number | null;
    iban: string | null;
    reference_number: string | null;
    contact_phone: string | null;
    address: string | null;
  };
};

export type ChatMessageOut = {
  role: string;
  content: string;
  created_at: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  if (res.headers.get("content-type")?.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return undefined as T;
}

export async function uploadDocument(file: File): Promise<DocumentOut> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/documents`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${text || res.statusText}`);
  }
  return res.json();
}

export async function listDocuments(): Promise<DocumentOut[]> {
  return request<DocumentOut[]>("/documents");
}

export async function getDocument(id: number): Promise<DocumentDetailOut> {
  return request<DocumentDetailOut>(`/documents/${id}`);
}

export async function extractText(id: number): Promise<ExtractTextOut> {
  return request<ExtractTextOut>(`/documents/${id}/extract-text`, {
    method: "POST",
  });
}

export async function analyzeDocument(id: number): Promise<AnalysisOut> {
  return request<AnalysisOut>(`/documents/${id}/analyze`, {
    method: "POST",
  });
}

export async function getAnalysis(id: number): Promise<AnalysisOut | null> {
  const res = await fetch(`${API_URL}/documents/${id}/analysis`);
  if (!res.ok) return null;
  return res.json();
}

export async function getDocumentText(
  id: number,
): Promise<{ document_id: number; text: string; extraction_method: string }> {
  return request(`/documents/${id}/text`);
}

export async function sendChatMessage(
  documentId: number,
  content: string,
): Promise<ChatMessageOut> {
  return request<ChatMessageOut>(`/documents/${documentId}/chat`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function getChatMessages(
  documentId: number,
): Promise<ChatMessageOut[]> {
  return request<ChatMessageOut[]>(`/documents/${documentId}/messages`);
}

/** Delete one document and all related data (text, analysis, chat, file). */
export async function deleteDocument(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/documents/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete failed: ${text || res.statusText}`);
  }
}

/** Delete all documents and all related data. */
export async function deleteAllDocuments(): Promise<void> {
  const res = await fetch(`${API_URL}/documents`, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete all failed: ${text || res.statusText}`);
  }
}
