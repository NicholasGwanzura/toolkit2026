'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  History,
  Loader2,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { searchRefrigerantsOnce, useApprovedSuppliers, useGasLogs, usePlannerJobs } from '@/lib/api';
import { useGasLogQueue } from '@/lib/gas-log-queue';
import { downloadGasLogPdf } from '@/lib/gas-log-pdf';
import { RefrigerantAutocomplete, refrigerantLabel } from '@/components/RefrigerantAutocomplete';
import { Modal } from '@/components/ui/Modal';
import { JobTypeLabels, type JobType, type Refrigerant, type RefrigerantLog } from '@/types/index';
import { JOB_TYPE_OPTIONS } from './checklists';

const inputClass = 'min-h-11 w-full rounded-lg border border-[#E7E5E4] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20';
export const ACTIONS = ['Charge', 'Recovery', 'Leak Repair'] as const;
export type Action = (typeof ACTIONS)[number];
type LogState = 'synced' | 'pending' | 'failed';

const EMPTY_FORM = {
  clientName: '',
  location: '',
  jobType: 'COLD_ROOM' as JobType,
  refrigerant: null as Refrigerant | null,
  refrigerantType: '',
  amount: '',
  actionType: 'Charge' as Action,
  approvedSupplierId: '',
  plannerJobId: '',
};

const ACTION_STYLES: Record<Action, { chip: string; rail: string }> = {
  Charge: { chip: 'bg-emerald-100 text-emerald-700', rail: 'bg-emerald-500' },
  Recovery: { chip: 'bg-amber-100 text-amber-700', rail: 'bg-amber-500' },
  'Leak Repair': { chip: 'bg-rose-100 text-rose-700', rail: 'bg-rose-500' },
};

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-wide text-[#78716C]">
        {label}
        {hint && <span className="ml-2 text-[11px] font-medium normal-case tracking-normal text-[#A8A29E]">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export interface GasRegisterPrefill {
  /** Refrigerant code, from the nameplate scanner or a voice command. */
  code?: string;
  amount?: string;
  action?: Action;
  client?: string;
  source: 'scan' | 'voice';
}

interface GasRegisterTabProps {
  prefill?: GasRegisterPrefill;
  onPrefillConsumed?: () => void;
}

type Notice = { kind: 'ok' | 'error'; text: string };

export default function GasRegisterTab({ prefill, onPrefillConsumed }: GasRegisterTabProps) {
  const { user } = useAuth();
  const { data: suppliers = [], error: suppliersError, isLoading: suppliersLoading } = useApprovedSuppliers();
  const { data: plannerJobs = [] } = usePlannerJobs();
  const { data: savedLogs = [] } = useGasLogs(undefined, undefined, 50);
  const { queue, failed, isOnline, syncing, submit, retry, retryFailed, discard } = useGasLogQueue(user?.id);

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [prefillNotice, setPrefillNotice] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | Action>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | '30' | 'month'>('all');
  // The cutoff is fixed when the period is chosen, so the visible list does not shift mid-render.
  const [periodStart, setPeriodStart] = useState<number | null>(null);
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);

  const choosePeriod = (value: 'all' | '30' | 'month') => {
    setPeriodFilter(value);
    if (value === 'all') return setPeriodStart(null);
    if (value === '30') return setPeriodStart(Date.now() - 30 * 86_400_000);
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    setPeriodStart(start.getTime());
  };

  // Only technicians and contractors can record logs; administrators can look at them.
  const canLog = user?.role === 'technician' || user?.role === 'contractor';

  const openJobs = useMemo(() => plannerJobs.filter(job => job.status !== 'completed' && job.status !== 'cancelled'), [plannerJobs]);

  // Apply details from a nameplate scan or a voice command. Nothing is saved: the person reviews and presses Save.
  const prefillKey = prefill ? JSON.stringify(prefill) : '';
  useEffect(() => {
    if (!prefill) return;
    let cancelled = false;
    (async () => {
      let refrigerant: Refrigerant | null = null;
      if (prefill.code) {
        try {
          refrigerant = (await searchRefrigerantsOnce({ q: prefill.code, pageSize: 1 })).data[0] ?? null;
        } catch (err) {
          console.error('Could not look up the refrigerant:', err);
        }
      }
      if (cancelled) return;
      setForm(prev => ({
        ...prev,
        ...(prefill.code ? { refrigerant, refrigerantType: refrigerant ? refrigerantLabel(refrigerant) : prefill.code } : {}),
        ...(prefill.amount ? { amount: prefill.amount } : {}),
        ...(prefill.action ? { actionType: prefill.action } : {}),
        ...(prefill.client ? { clientName: prefill.client } : {}),
      }));
      setPrefillNotice(prefill.source === 'voice' ? 'Filled from your voice command. Check every field, then press Save.' : `Filled from nameplate scan: ${prefill.code}`);
      setFormOpen(true);
      onPrefillConsumed?.();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillKey]);

  const chooseJob = (jobId: string) => {
    const job = openJobs.find(item => item.id === jobId);
    setForm(prev => ({
      ...prev,
      plannerJobId: jobId,
      // Fill the obvious details from the job, without overwriting what the person already typed.
      clientName: prev.clientName || job?.clientName || '',
      location: prev.location || job?.location || '',
      jobType: job ? job.jobType : prev.jobType,
    }));
  };

  // One list: what is on the server, plus anything still waiting on this device.
  const history = useMemo(() => {
    const byId = new Map<string, { log: RefrigerantLog; state: LogState; reason?: string }>();
    for (const log of savedLogs) byId.set(log.id, { log, state: 'synced' });
    for (const log of queue) byId.set(log.id, { log, state: failed[log.id] ? 'failed' : 'pending', reason: failed[log.id] });
    return [...byId.values()].sort((a, b) => new Date(b.log.timestamp).getTime() - new Date(a.log.timestamp).getTime());
  }, [savedLogs, queue, failed]);

  const pendingCount = queue.filter(log => !failed[log.id]).length;
  const failedLogs = queue.filter(log => failed[log.id]);

  const stats = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const thisMonth = history.filter(item => new Date(item.log.timestamp) >= monthStart);
    return {
      logs: history.length,
      kg: history.reduce((total, item) => total + item.log.amount, 0),
      monthKg: thisMonth.reduce((total, item) => total + item.log.amount, 0),
      verified: history.filter(item => item.log.supplierVerified).length,
    };
  }, [history]);

  const visibleHistory = useMemo(() => {
    const term = query.trim().toLowerCase();
    return history.filter(({ log }) => {
      if (actionFilter !== 'all' && log.actionType !== actionFilter) return false;
      if (periodStart !== null && new Date(log.timestamp).getTime() < periodStart) return false;
      if (!term) return true;
      return [log.clientName, log.location, log.refrigerantType, log.approvedSupplierName ?? '', log.technicianName]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [history, query, actionFilter, periodStart]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.clientName.trim()) next.clientName = 'Enter the client name.';
    // It must come from the registry list, so the safety class, GWP and ODP are recorded with the log.
    if (!form.refrigerant) next.refrigerant = form.refrigerantType.trim() ? 'That refrigerant is not in the registry list. Search for it and pick it from the list.' : 'Choose the refrigerant from the list.';
    const amount = Number(form.amount);
    if (!form.amount.trim() || !Number.isFinite(amount) || amount <= 0) next.amount = 'Enter a weight greater than zero.';
    else if (amount > 10000) next.amount = 'That is more than 10,000 kg. Check the figure.';
    return next;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const supplier = suppliers.find(item => item.id === form.approvedSupplierId);
    const log: RefrigerantLog = {
      id: crypto.randomUUID(),
      technicianId: user?.id || 'unknown',
      technicianName: user?.name || 'Anonymous',
      clientName: form.clientName.trim(),
      location: form.location.trim(),
      plannerJobId: form.plannerJobId || undefined,
      jobType: form.jobType,
      refrigerantId: form.refrigerant?.id,
      refrigerantType: form.refrigerantType,
      amount: Number(form.amount),
      actionType: form.actionType,
      approvedSupplierId: supplier?.id,
      approvedSupplierName: supplier?.name,
      supplierVerified: Boolean(supplier),
      timestamp: new Date().toISOString(),
    };
    submit(log);
    setForm(EMPTY_FORM);
    setPrefillNotice('');
    setFormOpen(false);
    setNotice({
      kind: 'ok',
      text: isOnline ? 'Log saved. Syncing to the central database.' : 'Log saved on this device. It will sync when you are back online.',
    });
  };

  const handlePdf = async (log: RefrigerantLog) => {
    setPdfBusyId(log.id);
    setNotice(null);
    try {
      await downloadGasLogPdf(log);
    } catch {
      setNotice({ kind: 'error', text: 'The PDF could not be generated on this device. Try again.' });
    } finally {
      setPdfBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#1C1917]">Refrigerant register</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#78716C]">
            Record every charge, recovery and leak repair. Entries sync automatically and each one exports as a branded service record.
          </p>
        </div>
        {canLog && (
          <button
            type="button"
            onClick={() => { setErrors({}); setFormOpen(true); }}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#D97706] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#D97706]/30 transition hover:bg-[#b45309] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            New log entry
          </button>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-4">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#5A7D5A]" aria-hidden="true" />
        <p className="text-xs leading-5 text-[#57534E]">
          <span className="font-semibold text-[#1C1917]">Compliance: </span>
          The Field Toolkit supports refrigerants compliant with SI 49 of 2023 and the Kigali Amendment. Only R-290, R-744 (CO₂) and R-32 are permitted for new entries.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Logs on record" value={String(stats.logs)} hint={`${stats.verified} with verified supplier`} />
        <StatCard label="Refrigerant recorded" value={`${stats.kg.toLocaleString()} kg`} hint={`${stats.monthKg.toLocaleString()} kg this month`} tone="sage" />
        <StatCard label="Awaiting sync" value={String(pendingCount)} hint={isOnline ? 'Saved on this device' : 'You are offline'} tone="amber" />
        <StatCard label="Refused by server" value={String(failedLogs.length)} hint={failedLogs.length ? 'Needs attention' : 'Nothing to fix'} tone={failedLogs.length ? 'rose' : 'stone'} />
      </div>

      <SyncBanner isOnline={isOnline} syncing={syncing} pending={pendingCount} failedCount={failedLogs.length} onRetry={retry} />

      {notice && (
        <p
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${notice.kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
        >
          {notice.text}
        </p>
      )}

      {!canLog && (
        <p role="note" className="rounded-xl border border-[#E7E5E4] bg-white p-4 text-sm text-[#57534E]">
          Gas logs are recorded by technicians and contractors under their own login. As an administrator you can review the activity below.
        </p>
      )}

      {failedLogs.length > 0 && (
        <section aria-label="Logs the server refused" className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-rose-800"><AlertTriangle className="h-4 w-4" aria-hidden="true" />{failedLogs.length} log{failedLogs.length === 1 ? ' was' : 's were'} refused by the server</p>
          <ul className="space-y-2">
            {failedLogs.map(log => (
              <li key={log.id} className="flex flex-col gap-2 rounded-lg bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span><strong>{log.clientName}</strong>, {log.amount} kg {log.refrigerantType}. <span className="text-rose-700">{failed[log.id]}</span></span>
                <span className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => retryFailed(log.id)} className="rounded-lg border border-[#E7E5E4] px-3 py-1.5 text-xs font-semibold text-[#57534E] hover:bg-[#FAFAF9]">Try again</button>
                  <button type="button" onClick={() => discard(log.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Remove</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-[#E7E5E4] bg-white" aria-label="Recent activity">
        <div className="border-b border-[#E7E5E4] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-base font-bold text-[#1C1917]">
              <History className="h-4 w-4 text-[#78716C]" aria-hidden="true" />
              Recent activity
              {user && <span className="text-sm font-medium text-[#b45309]">for {user.name}</span>}
            </h3>
            <span className="text-xs font-medium text-[#A8A29E]">{visibleHistory.length} of {history.length} shown</span>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_170px_170px]">
            <label className="relative block">
              <span className="sr-only">Search logs</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A8A29E]" aria-hidden="true" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search client, site or refrigerant" className={`${inputClass} pl-9`} />
            </label>
            <label className="block">
              <span className="sr-only">Filter by action</span>
              <select value={actionFilter} onChange={e => setActionFilter(e.target.value as 'all' | Action)} className={inputClass}>
                <option value="all">All actions</option>
                {ACTIONS.map(action => <option key={action} value={action}>{action}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Filter by period</span>
              <select value={periodFilter} onChange={e => choosePeriod(e.target.value as 'all' | '30' | 'month')} className={inputClass}>
                <option value="all">All time</option>
                <option value="month">This month</option>
                <option value="30">Last 30 days</option>
              </select>
            </label>
          </div>
        </div>

        {visibleHistory.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <History className="mx-auto h-8 w-8 text-[#D6D3D1]" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-[#57534E]">{history.length === 0 ? 'No logs recorded yet.' : 'No logs match these filters.'}</p>
            <p className="mt-1 text-sm text-[#A8A29E]">{history.length === 0 ? 'Use “New log entry” to record your first charge or recovery.' : 'Clear the search or pick a different action or period.'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#F1F0EE]">
            {visibleHistory.map(({ log, state }) => {
              const actionStyle = ACTION_STYLES[log.actionType] ?? ACTION_STYLES.Charge;
              return (
                <li key={log.id} className="relative flex flex-col gap-3 px-4 py-4 transition hover:bg-[#FAFAF9] sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <span className={`absolute inset-y-0 left-0 w-1 ${actionStyle.rail}`} aria-hidden="true" />
                  <div className="min-w-0 space-y-1.5 pl-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${actionStyle.chip}`}>{log.actionType}</span>
                      <SyncChip state={state} />
                      <span className="text-xs text-[#A8A29E]">
                        {new Date(log.timestamp).toLocaleDateString('en-ZW')} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 className="truncate text-base font-semibold text-[#1C1917]">{log.clientName}</h4>
                    <p className="text-sm text-[#57534E]">
                      <span className="font-semibold text-[#1C1917]">{log.amount} kg</span> of {log.refrigerantType}
                      {log.location ? ` · ${log.location}` : ''} · {JobTypeLabels[log.jobType] || log.jobType}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-[#78716C]">
                      <ShieldCheck className={`h-3.5 w-3.5 ${log.supplierVerified ? 'text-[#5A7D5A]' : 'text-[#D97706]'}`} aria-hidden="true" />
                      {log.supplierVerified ? 'Verified supplier' : 'Unverified supplier'}{log.approvedSupplierName ? `: ${log.approvedSupplierName}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handlePdf(log)}
                    disabled={pdfBusyId === log.id}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-semibold text-[#1C1917] transition hover:border-[#D97706] hover:text-[#b45309] disabled:opacity-60"
                  >
                    {pdfBusyId === log.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                    Branded PDF
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="New log entry"
        description="Record the refrigerant work for this site. Fields marked with an error must be fixed before saving."
        icon={<PlusCircle className="h-5 w-5" />}
        size="lg"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#A8A29E]">{isOnline ? 'Saves to the central database immediately.' : 'Saves on this device and syncs when you are back online.'}</p>
            <div className="flex gap-2 sm:justify-end">
              <button type="button" onClick={() => setFormOpen(false)} className="min-h-11 rounded-xl border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-semibold text-[#57534E] transition hover:bg-[#FAFAF9]">
                Cancel
              </button>
              <button type="submit" form="new-gas-log" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#D97706] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b45309]">
                <Save className="h-4 w-4" aria-hidden="true" />
                Save log entry
              </button>
            </div>
          </div>
        }
      >
        <form id="new-gas-log" onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="New log entry">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#78716C]">What did you do?</legend>
            <div className="grid grid-cols-3 gap-2">
              {ACTIONS.map(action => (
                <button
                  key={action}
                  type="button"
                  onClick={() => setForm({ ...form, actionType: action })}
                  aria-pressed={form.actionType === action}
                  className={`min-h-12 rounded-xl border px-2 py-2 text-sm font-semibold transition ${
                    form.actionType === action
                      ? 'border-[#D97706] bg-[#D97706] text-white shadow-sm'
                      : 'border-[#E7E5E4] bg-white text-[#57534E] hover:border-[#D97706] hover:text-[#b45309]'
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Planner job" hint="Optional · fills client and site" htmlFor="log-job">
              <select id="log-job" value={form.plannerJobId} onChange={e => chooseJob(e.target.value)} className={inputClass}>
                <option value="">Not linked to a job</option>
                {openJobs.map(job => <option key={job.id} value={job.id}>{job.clientName}, {job.scheduledDate}</option>)}
              </select>
            </Field>
            <Field label="Job type" htmlFor="log-type">
              <select id="log-type" value={form.jobType} onChange={e => setForm({ ...form, jobType: e.target.value as JobType })} className={inputClass}>
                {JOB_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Client name" htmlFor="log-client">
              <input id="log-client" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} aria-invalid={Boolean(errors.clientName)} className={inputClass} placeholder="Shoprite Bulawayo" />
              {errors.clientName && <p role="alert" className="text-xs text-rose-700">{errors.clientName}</p>}
            </Field>
            <Field label="Work location" htmlFor="log-location">
              <input id="log-location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className={inputClass} placeholder="Unit 3 roof, aisle 4 freezer" />
            </Field>
            <Field label="Refrigerant">
              <RefrigerantAutocomplete
                value={form.refrigerant}
                onSelect={refrigerant => {
                  setForm({ ...form, refrigerant, refrigerantType: refrigerant ? refrigerantLabel(refrigerant) : '' });
                  setPrefillNotice('');
                }}
              />
              {errors.refrigerant && <p role="alert" className="text-xs text-rose-700">{errors.refrigerant}</p>}
              {prefillNotice && <p className="text-xs font-medium text-emerald-700">{prefillNotice}</p>}
            </Field>
            <Field label="Amount (kg)" htmlFor="log-amount">
              <input id="log-amount" type="number" inputMode="decimal" min="0" step="0.001" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} aria-invalid={Boolean(errors.amount)} className={inputClass} placeholder="0.00" />
              {errors.amount && <p role="alert" className="text-xs text-rose-700">{errors.amount}</p>}
            </Field>
            <Field label="Approved supplier" htmlFor="log-supplier">
              <select id="log-supplier" value={form.approvedSupplierId} onChange={e => setForm({ ...form, approvedSupplierId: e.target.value })} disabled={suppliersLoading} className={`${inputClass} disabled:bg-[#F5F5F4] disabled:text-[#A8A29E]`}>
                <option value="">{suppliersLoading ? 'Loading suppliers…' : 'No approved supplier'}</option>
                {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
              {suppliersError && <p className="text-xs text-rose-700">Could not load approved suppliers. Check your connection.</p>}
            </Field>
          </div>

          {!form.approvedSupplierId && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
              Purchases from unapproved suppliers are not eligible for rewards points and are flagged in the NOU compliance report.
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}

function StatCard({ label, value, hint, tone = 'stone' }: { label: string; value: string; hint: string; tone?: 'stone' | 'sage' | 'amber' | 'rose' }) {
  const tones = {
    stone: 'bg-[#A8A29E]',
    sage: 'bg-[#5A7D5A]',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  } as const;
  return (
    <div className="rounded-xl border border-[#E7E5E4] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">{label}</p>
        <span className={`h-2 w-2 rounded-full ${tones[tone]}`} aria-hidden="true" />
      </div>
      <p className="mt-2 text-xl font-bold text-[#1C1917]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#A8A29E]">{hint}</p>
    </div>
  );
}

function SyncChip({ state }: { state: LogState }) {
  const map = {
    synced: { label: 'Synced', className: 'bg-emerald-50 text-emerald-700' },
    pending: { label: 'On this device', className: 'bg-amber-50 text-amber-700' },
    failed: { label: 'Refused', className: 'bg-rose-50 text-rose-700' },
  } as const;
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[state].className}`}>{map[state].label}</span>;
}

function SyncBanner({ isOnline, syncing, pending, failedCount, onRetry }: { isOnline: boolean; syncing: boolean; pending: number; failedCount: number; onRetry: () => void }) {
  if (!isOnline) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <WifiOff className="mt-0.5 h-5 w-5 text-amber-600" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold text-amber-900">You are offline</p>
          <p className="mt-1 text-xs text-amber-700">{pending > 0 ? `${pending} log${pending === 1 ? '' : 's'} saved on this device. They sync automatically when you are back online.` : 'New logs are saved on this device and sync when you are back online.'}</p>
        </div>
      </div>
    );
  }
  if (pending > 0) {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <RefreshCw className={`mt-0.5 h-5 w-5 text-amber-600 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-amber-900">{syncing ? 'Syncing…' : `${pending} log${pending === 1 ? '' : 's'} waiting to sync`}</p>
            <p className="mt-1 text-xs text-amber-700">Saved on this device, not yet on the central database.</p>
          </div>
        </div>
        {!syncing && <button type="button" onClick={onRetry} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#D97706] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b45309]"><RefreshCw className="h-4 w-4" aria-hidden="true" />Sync now</button>}
      </div>
    );
  }
  if (failedCount > 0) return null;
  return (
    <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
      <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
      <p className="text-sm font-medium text-emerald-800">All logs are synced to the central database.</p>
    </div>
  );
}
