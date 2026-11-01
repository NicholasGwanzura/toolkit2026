'use client';

import { useState } from 'react';
import {
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Database,
  Search,
  Loader2,
} from 'lucide-react';
import { useWhatGasSyncStatus, triggerWhatGasSync, useRefrigerants } from '@/lib/api';
import { refrigerantLabel } from '@/components/RefrigerantAutocomplete';
import type { WhatGasSyncLog } from '@/types/index';

const STATUS_STYLES: Record<WhatGasSyncLog['status'], string> = {
  running: 'bg-blue-50 text-blue-700 border-blue-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_ICONS: Record<WhatGasSyncLog['status'], typeof CheckCircle2> = {
  running: Clock,
  success: CheckCircle2,
  partial: AlertTriangle,
  failed: XCircle,
};

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

type FilterKey = 'isHFC' | 'isHCFC' | 'isCFC' | 'isSingle' | 'highGwp' | 'isODP' | 'kigali' | 'montreal';

const FILTER_CHIPS: { key: FilterKey; label: string; value: boolean }[] = [
  { key: 'isHFC', label: 'HFC', value: true },
  { key: 'isHCFC', label: 'HCFC', value: true },
  { key: 'isCFC', label: 'CFC', value: true },
  { key: 'isSingle', label: 'Blend', value: false },
  { key: 'isSingle', label: 'Single Component', value: true },
  { key: 'highGwp', label: 'High GWP', value: true },
  { key: 'isODP', label: 'ODP', value: true },
  { key: 'kigali', label: 'Kigali Controlled', value: true },
  { key: 'montreal', label: 'Montreal Controlled', value: true },
];

export default function AdminRefrigerantsPage() {
  const { data: syncStatus, isLoading: syncLoading } = useWhatGasSyncStatus();
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Partial<Record<FilterKey, boolean>>>({});
  const [page, setPage] = useState(1);

  const { data: refrigerantsData, isLoading: refrigerantsLoading } = useRefrigerants({
    q: searchTerm || undefined,
    page,
    pageSize: 25,
    ...activeFilters,
  });

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await triggerWhatGasSync();
      setSyncMessage(`Sync ${result.status}. Statistics updated below.`);
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Sync failed to start.');
    } finally {
      setSyncing(false);
    }
  };

  const toggleFilter = (chip: { key: FilterKey; value: boolean }) => {
    setPage(1);
    setActiveFilters((prev) => {
      const isActive = prev[chip.key] === chip.value;
      const next = { ...prev };
      delete next[chip.key];
      if (!isActive) next[chip.key] = chip.value;
      return next;
    });
  };

  const lastSync = syncStatus?.lastSuccessfulSync ?? null;
  const logs = syncStatus?.logs ?? [];
  const failedImports = logs.flatMap((l) => l.failures.map((f) => ({ ...f, logId: l.id, startedAt: l.startedAt })));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Refrigerants — WhatGas Sync</h1>
          <p className="mt-1 text-gray-500">
            UNEP OzonAction WhatGas is the authoritative source for refrigerant reference data.
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href="/admin/refrigerant-analytics"
            className="rounded-lg inline-flex items-center gap-2 border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            View Analytics
          </a>
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="inline-flex items-center gap-2 bg-[#B45309] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#92400E] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
          {syncMessage}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-500">Total Refrigerants</p>
            <span className="bg-blue-50 p-2 text-blue-600"><Database className="h-4 w-4" /></span>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">{syncStatus?.totalRefrigerants ?? '—'}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-500">Last Successful Sync</p>
            <span className="bg-emerald-50 p-2 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></span>
          </div>
          <p className="mt-3 text-base font-bold text-gray-900">{formatDateTime(lastSync?.finishedAt ?? null)}</p>
          <p className="text-xs text-gray-400">{lastSync?.syncType ?? 'No sync yet'}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-500">Last Sync Created / Updated</p>
            <span className="bg-amber-50 p-2 text-amber-600"><RefreshCcw className="h-4 w-4" /></span>
          </div>
          <p className="mt-3 text-base font-bold text-gray-900">
            {lastSync ? `${lastSync.createdRecords} new / ${lastSync.updatedRecords} updated` : '—'}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-500">Failed Imports (last sync)</p>
            <span className="bg-rose-50 p-2 text-rose-600"><AlertTriangle className="h-4 w-4" /></span>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">{logs[0]?.failedRecords ?? 0}</p>
        </div>
      </div>

      {/* Sync history */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">Sync History</h2>
          <p className="text-sm text-gray-500">Manual, daily-incremental, and weekly-full sync runs.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Started</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Duration</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Total / Created / Updated / Failed</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Triggered By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {syncLoading && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-500">Loading sync history…</td></tr>
              )}
              {!syncLoading && logs.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-500">No syncs have run yet. Click &ldquo;Sync Now&rdquo; to populate the registry.</td></tr>
              )}
              {logs.map((log) => {
                const Icon = STATUS_ICONS[log.status];
                return (
                  <tr key={log.id} className="hover:bg-gray-50/80">
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[log.status]}`}>
                        <Icon className="h-3.5 w-3.5" /> {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">{log.syncType}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{formatDateTime(log.startedAt)}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">
                      {log.totalRecords} / {log.createdRecords} / {log.updatedRecords} / {log.failedRecords}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{log.triggeredBy ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Failed imports */}
      {failedImports.length > 0 && (
        <div className="border border-rose-200 bg-white shadow-sm">
          <div className="border-b border-rose-100 bg-rose-50 px-5 py-4">
            <h2 className="text-lg font-bold text-rose-900">Failed Imports</h2>
            <p className="text-sm text-rose-700">Records that failed Zod validation during the most recent syncs.</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {failedImports.slice(0, 25).map((f, i) => (
              <li key={`${f.logId}-${i}`} className="px-5 py-3 text-sm">
                <span className="font-mono text-xs text-gray-500">id: {String(f.id ?? 'unknown')}</span>
                <p className="text-gray-700">{f.error}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Search & filter registry */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search synced refrigerants…"
            className="rounded-lg w-full border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-300 focus:bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTER_CHIPS.map((chip) => {
            const active = activeFilters[chip.key] === chip.value;
            return (
              <button
                key={`${chip.key}-${chip.label}`}
                onClick={() => toggleFilter(chip)}
                className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
                  active ? 'border-[#D97706] bg-[#D97706]/10 text-[#D97706]' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Refrigerant</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Chemical Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">GWP</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">ODP</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {refrigerantsLoading && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-500">Loading…</td></tr>
              )}
              {!refrigerantsLoading && (refrigerantsData?.data.length ?? 0) === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-500">No refrigerants match the current filters.</td></tr>
              )}
              {refrigerantsData?.data.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/80">
                  <td className="px-5 py-3">
                    <a href={`/refrigerants/${r.id}`} className="font-semibold text-gray-900 hover:text-[#D97706]">
                      {refrigerantLabel(r)}
                    </a>
                    <p className="text-xs text-gray-500">{r.odsName}</p>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{r.chemicalType || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{r.gwp || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{r.odp || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.isHFC && <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700">HFC</span>}
                      {r.isHCFC && <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700">HCFC</span>}
                      {r.isCFC && <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700">CFC</span>}
                      {!r.isSingle && <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600">Blend</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {refrigerantsData && refrigerantsData.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-sm text-gray-500">
            <span>Page {refrigerantsData.page} of {refrigerantsData.totalPages} ({refrigerantsData.total} total)</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(refrigerantsData.totalPages, p + 1))}
                disabled={page >= refrigerantsData.totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
