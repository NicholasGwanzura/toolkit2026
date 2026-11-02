'use client';

import { CloudOff, Loader2, RefreshCw, Trash2 } from 'lucide-react';

export interface WaitingItem {
  ref: string;
  title: string;
  detail: string;
  savedAt: string;
  /** The server's reason, when it refused the record. */
  problem?: string;
}

/** Records saved on this device and not yet on the server, with what to do about each. */
export function WaitingToSync({ label, items, isOnline, syncing, storageProblem, onRetry, onRetryItem, onDiscard }: {
  label: string;
  items: WaitingItem[];
  isOnline: boolean;
  syncing: boolean;
  storageProblem?: string;
  onRetry: () => void;
  onRetryItem: (ref: string) => void;
  onDiscard: (ref: string) => void;
}) {
  if (items.length === 0 && !storageProblem) return null;
  return (
    <section aria-label={`${label} waiting to sync`} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      {storageProblem && <p role="alert" className="text-sm font-medium text-rose-700">{storageProblem}</p>}
      {items.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-950">
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CloudOff className="h-4 w-4" aria-hidden="true" />}
              {syncing ? 'Syncing…' : `${items.length} ${label.toLowerCase()} saved on this device`}
            </p>
            {!syncing && (
              <button type="button" onClick={onRetry} disabled={!isOnline} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-950 disabled:opacity-60">
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> {isOnline ? 'Sync now' : 'Waiting for signal'}
              </button>
            )}
          </div>
          <p className="text-xs text-amber-900">They send automatically when you are online. Do not clear this browser&apos;s data until they have synced.</p>
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.ref} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2">
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-600">{item.detail}. Saved {new Date(item.savedAt).toLocaleString('en-ZW', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  {item.problem && <p className="mt-1 text-xs font-medium text-rose-700">Not accepted: {item.problem}</p>}
                </div>
                {item.problem && (
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => onRetryItem(item.ref)} className="min-h-11 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-800">Try again</button>
                    <button type="button" onClick={() => onDiscard(item.ref)} aria-label={`Discard ${item.title}`} className="min-h-11 rounded-lg border border-gray-300 px-3 text-gray-700"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
