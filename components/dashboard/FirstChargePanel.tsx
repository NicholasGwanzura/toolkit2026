'use client';

import { Sparkles } from 'lucide-react';
import { useFirstChargeTotals } from '@/lib/api';

const kg = (value: number) => `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;

/** First-time charges of new systems, nationally, for the NOU. */
export function FirstChargePanel() {
  const { data, error, isLoading } = useFirstChargeTotals();

  return (
    <section aria-labelledby="first-charges-title" className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 text-slate-600" aria-hidden="true" />
        <div>
          <h2 id="first-charges-title" className="text-lg font-semibold text-gray-900">First-Time Charges of New Systems</h2>
          <p className="text-sm text-gray-500">Refrigerant put into newly installed systems, reported separately from top-ups and repairs.</p>
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">Could not load first-time charges. {error.message}</p>}
      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {data && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Figure label="New systems charged" value={data.count.toLocaleString()} hint="All time" />
            <Figure label="Refrigerant charged" value={kg(data.kg)} hint="All time" />
            <Figure label="CO2-eq now in service" value={`${data.co2eTonnes.toLocaleString(undefined, { maximumFractionDigits: 1 })} t`} hint="Released if it all leaked" />
            <Figure label="Last 30 days" value={kg(data.last30Days.kg)} hint={`${data.last30Days.count} new system${data.last30Days.count === 1 ? '' : 's'}`} />
          </div>
          {data.count === 0 ? (
            <p className="text-sm text-gray-500">No first-time charges recorded yet. They appear when a new-system job is completed or a technician logs one.</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">By refrigerant</h3>
                <ul className="divide-y divide-gray-100">
                  {data.byRefrigerant.map((row) => (
                    <li key={row.refrigerant} className="flex justify-between gap-3 py-2 text-sm">
                      <span className="font-medium text-gray-800">{row.refrigerant}</span>
                      <span className="tabular-nums text-gray-700">{kg(row.kg)} in {row.count} system{row.count === 1 ? '' : 's'}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Most recent</h3>
                <ul className="divide-y divide-gray-100">
                  {data.recent.map((row) => (
                    <li key={row.id} className="py-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="font-medium text-gray-800">{row.clientName}</span>
                        <span className="shrink-0 tabular-nums text-gray-700">{row.refrigerantType}, {kg(row.amount)}</span>
                      </div>
                      <p className="text-xs text-gray-500">{new Date(row.timestamp).toLocaleDateString('en-ZW')} by {row.technicianName}{row.location ? `, ${row.location}` : ''}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
}
