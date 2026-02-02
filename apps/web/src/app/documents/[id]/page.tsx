import { type DocumentDetailOut, getDocument } from "@/lib/api";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentView } from "./DocumentView";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const docId = Number.parseInt(id, 10);
  if (Number.isNaN(docId)) notFound();
  let doc: DocumentDetailOut;
  try {
    doc = await getDocument(docId);
  } catch {
    notFound();
  }
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
            History
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <DocumentView documentId={docId} filename={doc.filename} />
      </main>
    </div>
  );
}
