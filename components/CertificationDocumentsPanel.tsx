'use client';

import { useRef, useState } from 'react';
import { FileText, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { checkDocumentFile, DOCUMENT_ACCEPT, MAX_DOCUMENT_BYTES } from '@/lib/application-documents';
import {
  removeCertificationDocument,
  uploadCertificationDocument,
  useMyCertificationDocuments,
} from '@/lib/api';

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Lets a signed-in technician attach the documents reviewers need for certification: national ID,
 * trade and training certificates. Uploads are stored against their registry record so trainers and
 * administrators can open them from the technician's profile.
 */
export function CertificationDocumentsPanel() {
  const { data, error, isLoading } = useMyCertificationDocuments();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const documents = data?.documents ?? [];
  const limit = data?.limit ?? 6;
  const full = documents.length >= limit;
  const loadError = error instanceof Error ? error.message : error ? 'Could not load your documents.' : null;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setMessage(null);
    setBusy(true);
    let added = 0;
    for (const file of Array.from(files)) {
      const problem = checkDocumentFile({ name: file.name, type: file.type, size: file.size });
      if (problem) {
        setMessage({ tone: 'error', text: `${file.name}: ${problem}` });
        continue;
      }
      try {
        await uploadCertificationDocument(file);
        added += 1;
      } catch (err) {
        setMessage({ tone: 'error', text: `${file.name}: ${err instanceof Error ? err.message : 'upload failed.'}` });
        break;
      }
      if (documents.length + added >= limit) break;
    }
    if (inputRef.current) inputRef.current.value = '';
    if (added > 0) {
      setMessage((current) => current ?? { tone: 'ok', text: `${added} document${added === 1 ? '' : 's'} uploaded.` });
    }
    setBusy(false);
  }

  async function handleRemove(id: string) {
    setBusy(true);
    setMessage(null);
    try {
      await removeCertificationDocument(id);
    } catch {
      setMessage({ tone: 'error', text: 'Could not remove that document.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-gray-900">
        <UploadCloud className="h-5 w-5 text-gray-500" />
        Certification documents
      </h2>
      <p className="text-sm leading-6 text-gray-600">
        {data?.hint ?? 'Upload a copy of your national ID and any trade or training certificates.'} PDF, JPG or PNG,
        up to {MAX_DOCUMENT_BYTES / 1024 / 1024} MB each, {limit} files at most. Only you, your trainer and HEVACRAZ
        administrators can open them.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-400">Loading…</p>
      ) : loadError ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</p>
      ) : (
        <>
          {documents.length > 0 && (
            <ul className="mt-4 space-y-2">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm text-gray-900">
                    <FileText className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                    <span className="truncate">{doc.fileName}</span>
                    <span className="shrink-0 text-xs text-gray-500">{formatSize(doc.sizeBytes)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleRemove(doc.id)}
                    disabled={busy}
                    className="shrink-0 text-gray-400 transition hover:text-rose-600 disabled:opacity-50"
                    aria-label={`Remove ${doc.fileName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label
            className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm transition ${
              full || busy
                ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                : 'border-gray-300 text-gray-600 hover:border-[#D97706] hover:bg-amber-50'
            }`}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
            <span className="font-semibold">
              {full ? 'You have uploaded the maximum number of files' : busy ? 'Uploading…' : 'Choose files to upload'}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept={DOCUMENT_ACCEPT}
              multiple
              disabled={full || busy}
              onChange={(e) => void handleFiles(e.target.files)}
              className="sr-only"
            />
          </label>
        </>
      )}

      {message && (
        <p
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`mt-3 text-sm ${message.tone === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
