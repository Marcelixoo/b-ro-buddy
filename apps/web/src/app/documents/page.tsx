import Link from "next/link";
import { DocumentsList } from "./DocumentsList";

export default function DocumentsPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-stone-800">
            BüroBuddy
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-stone-600 hover:text-stone-900"
          >
            Upload
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-stone-800">
          Document history
        </h1>
        <DocumentsList />
      </main>
    </div>
  );
}
