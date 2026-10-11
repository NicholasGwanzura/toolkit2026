'use client';

import { useState } from 'react';
import { useAuditLogPage } from '@/lib/api';
import { useDebouncedValue } from '@/lib/use-debounced-value';

const ENTITY_LABELS: Record<string, string> = {
  technician_application: 'Technician application',
  student_application: 'Student application',
  supplier_application: 'Supplier application',
  registration_application: 'Registration application',
  membership: 'Membership',
  user: 'User',
  course: 'Course',
  exam_submission: 'Exam grading',
  certificate_request: 'Certificate request',
  coc_request: 'COC request',
  supplier_reorder: 'Refrigerant reorder',
  trade_permit: 'Trade permit',
  supplier_compliance: 'Supplier compliance',
  accident: 'Accident investigation',
};

const labelFor = (type: string) => ENTITY_LABELS[type] ?? type.replace(/_/g, ' ');
const words = (value: string) => value.replace(/[_-]/g, ' ');

export default function AuditTrailPage() {
  const [entityType, setEntityType] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim(), 300);
  const { data, error, isLoading, mutate } = useAuditLogPage({ entityType, q, from, to, page });

  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const field = 'mt-1 w-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
        <p className="mt-1 text-sm text-gray-500">Who made each review decision, and when. Every approval, rejection and investigation update is recorded here.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold text-gray-600">Record type
          <select className={field} value={entityType} onChange={(e) => reset(setEntityType)(e.target.value)}>
            <option value="">All types</option>
            {(data?.entityTypes ?? []).map((t) => <option key={t} value={t}>{labelFor(t)}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-gray-600">Search (person, action, note)
          <input className={field} value={search} onChange={(e) => reset(setSearch)(e.target.value)} placeholder="e.g. Alfred or rejected" />
        </label>
        <label className="text-xs font-semibold text-gray-600">From
          <input type="date" className={field} value={from} onChange={(e) => reset(setFrom)(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-gray-600">To
          <input type="date" className={field} value={to} onChange={(e) => reset(setTo)(e.target.value)} />
        </label>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <span>The audit trail could not be loaded.</span>
          <button type="button" onClick={() => mutate()} className="border border-rose-300 bg-white px-3 py-1.5 font-semibold hover:bg-rose-100">Try again</button>
        </div>
      )}

      {isLoading && !data && <p className="text-sm text-gray-500">Loading…</p>}

      {data && (
        <div className="border border-gray-200 bg-white">
          <p className="border-b border-gray-100 px-4 py-2 text-xs text-gray-500">{data.total.toLocaleString()} {data.total === 1 ? 'entry' : 'entries'}</p>
          {data.items.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">Nothing matches these filters.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.items.map((e) => (
                <li key={e.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {labelFor(e.entityType)} <span className="font-normal text-gray-500">·</span> <span className="capitalize">{words(e.action)}</span>
                    </p>
                    <time className="text-xs text-gray-500" dateTime={e.createdAt}>{new Date(e.createdAt).toLocaleString('en-ZW', { dateStyle: 'medium', timeStyle: 'short' })}</time>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-600">
                    By {e.performedBy}{e.performedByRole ? ` (${words(e.performedByRole)})` : ''}
                    {(e.previousStatus || e.newStatus) && <> · <span className="capitalize">{words(e.previousStatus ?? 'none')}</span> → <span className="font-semibold capitalize">{words(e.newStatus ?? 'none')}</span></>}
                  </p>
                  {e.notes && <p className="mt-1 text-xs text-gray-700">Note: {e.notes}</p>}
                  <p className="mt-1 break-all text-[11px] text-gray-400">Record {e.entityId}</p>
                </li>
              ))}
            </ul>
          )}
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="border border-gray-200 px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button>
              <span className="text-gray-600">Page {page} of {pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="border border-gray-200 px-3 py-1.5 font-semibold disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
