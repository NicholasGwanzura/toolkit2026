'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Check, CheckCircle2, ExternalLink, FileDown, Loader2, RotateCcw, Save } from 'lucide-react';
import type { InstallationChecklistSnapshot } from '@/types/index';
import { downloadChecklistPdf } from '@/lib/checklist-pdf';
import { Modal } from '@/components/ui/Modal';
import { CHECKLIST_VERSION, checklistFor, checklistItemId, type ChecklistType } from './checklists';

interface ChecklistTabProps {
  saved: InstallationChecklistSnapshot | null;
  onSave: (snapshot: InstallationChecklistSnapshot) => void;
  onGoToInstallations: () => void;
}

type StatusFilter = 'all' | 'outstanding' | 'completed';

const FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All items' },
  { value: 'outstanding', label: 'Outstanding only' },
  { value: 'completed', label: 'Completed only' },
];

export default function ChecklistTab({ saved, onSave, onGoToInstallations }: ChecklistTabProps) {
  const { user } = useAuth();
  const draftKey = user?.id ? `coolpro_checklist_draft:${user.id}` : null;
  const [type, setType] = useState<ChecklistType>('installation');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [restoredFor, setRestoredFor] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [pendingSwitch, setPendingSwitch] = useState<ChecklistType | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  // Ticks survive a reload or a dropped connection: they are kept on this device until the checklist is saved.
  useEffect(() => {
    if (!draftKey || restoredFor === draftKey) return;
    try {
      const stored = JSON.parse(window.localStorage.getItem(draftKey) ?? 'null') as { version?: string; type?: ChecklistType; checked?: string[] } | null;
      // A draft made against older wording is dropped, because its item ids may no longer mean the same lines.
      if (stored && stored.version === CHECKLIST_VERSION && (stored.type === 'installation' || stored.type === 'regassing')) {
        setType(stored.type);
        setChecked(new Set(stored.checked ?? []));
      }
    } catch { /* unreadable draft: start fresh */ }
    setRestoredFor(draftKey);
  }, [draftKey, restoredFor]);

  useEffect(() => {
    if (!draftKey || restoredFor !== draftKey) return;
    try {
      window.localStorage.setItem(draftKey, JSON.stringify({ version: CHECKLIST_VERSION, type, checked: [...checked] }));
    } catch { /* storage full or blocked: ticks are kept in memory only */ }
  }, [draftKey, restoredFor, type, checked]);

  const categories = checklistFor(type);
  const rows = useMemo(
    () => categories.map((category, categoryIndex) => ({
      category,
      items: category.items.map((entry, itemIndex) => ({ entry, id: checklistItemId(type, categoryIndex, itemIndex) })),
    })),
    [categories, type],
  );
  const totalItems = useMemo(() => categories.reduce((sum, category) => sum + category.items.length, 0), [categories]);
  const doneItems = checked.size;
  const percent = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100);
  const complete = totalItems > 0 && doneItems === totalItems;

  const visibleRows = useMemo(() => rows
    .map(row => ({
      ...row,
      items: row.items.filter(({ id }) => {
        const isChecked = checked.has(id);
        return filter === 'all' || (filter === 'completed' ? isChecked : !isChecked);
      }),
    }))
    .filter(row => row.items.length > 0), [rows, checked, filter]);

  const switchType = (next: ChecklistType) => {
    if (next === type) return;
    if (checked.size > 0) {
      setPendingSwitch(next);
      return;
    }
    setType(next);
    setFilter('all');
    setNotice(null);
  };

  const confirmSwitch = () => {
    if (pendingSwitch) {
      setType(pendingSwitch);
      setChecked(new Set());
      setFilter('all');
      setNotice(null);
    }
    setPendingSwitch(null);
  };

  const confirmReset = () => {
    setChecked(new Set());
    setNotice(null);
    setResetOpen(false);
  };

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setNotice(null);
  };

  const save = () => {
    const items = categories.flatMap((category, categoryIndex) =>
      category.items.map((entry, itemIndex) => {
        const id = checklistItemId(type, categoryIndex, itemIndex);
        return { id, category: category.category, text: entry.text, checked: checked.has(id), source: entry.source };
      }),
    );
    onSave({ checklistType: type, version: CHECKLIST_VERSION, completedItems: doneItems, totalItems, completedAt: new Date().toISOString(), items });
    setNotice({
      kind: 'ok',
      text: doneItems === totalItems
        ? 'Checklist saved and complete. Download the branded PDF for the site file, and it will attach to the next installation you save.'
        : `Checklist saved with ${doneItems} of ${totalItems} items ticked. A COC request needs every item ticked.`,
    });
  };

  const downloadPdf = async () => {
    if (!saved) return;
    setPdfBusy(true);
    setNotice(null);
    try {
      await downloadChecklistPdf(saved, { technicianName: user?.name || 'Field technician', technicianId: user?.id });
    } catch {
      setNotice({ kind: 'error', text: 'The PDF could not be produced. Please try again.' });
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 sm:pb-0">
      <div className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white">
        <div className="flex flex-col gap-4 border-b border-[#E7E5E4] bg-[#FAFAF9] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="inline-flex w-full rounded-xl border border-[#E7E5E4] bg-white p-1 sm:w-auto" role="group" aria-label="Checklist type">
            {([['installation', 'New installation'], ['regassing', 'Regassing and service']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => switchType(value)}
                aria-pressed={type === value}
                className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                  type === value ? 'bg-[#1C1917] text-white shadow-sm' : 'text-[#78716C] hover:bg-[#FAFAF9] hover:text-[#1C1917]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <span className="sr-only">Filter checklist items</span>
              <select
                value={filter}
                onChange={event => setFilter(event.target.value as StatusFilter)}
                className="min-h-10 rounded-lg border border-[#E7E5E4] bg-white px-3 py-2 text-sm font-medium text-[#1C1917] outline-none transition focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20"
              >
                {FILTER_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {doneItems > 0 && (
              <button
                type="button"
                onClick={() => setResetOpen(true)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#E7E5E4] bg-white px-3 py-2 text-sm font-semibold text-[#78716C] transition hover:border-[#D97706] hover:text-[#b45309]"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Clear ticks
              </button>
            )}
          </div>
        </div>

        <div className="px-4 py-4 sm:px-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-lg font-semibold text-[#1C1917]">{type === 'installation' ? 'New installation verification' : 'Regassing and service checklist'}</h3>
            <p className="text-sm font-semibold text-[#1C1917]" aria-live="polite">{doneItems} of {totalItems} · {percent}%</p>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E7E5E4]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Checklist progress">
            <div className={`h-2 rounded-full transition-all ${complete ? 'bg-[#5A7D5A]' : 'bg-[#D97706]'}`} style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-xs text-[#78716C]">
            {complete
              ? 'Every item is ticked. Save the checklist, then use it on an installation.'
              : doneItems === 0
                ? 'Tick each line as you complete it. Ticks are kept on this device until you save.'
                : `${totalItems - doneItems} item${totalItems - doneItems === 1 ? '' : 's'} still outstanding.`}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {visibleRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E7E5E4] bg-[#FAFAF9] px-6 py-12 text-center">
            <p className="text-sm font-semibold text-[#1C1917]">
              {filter === 'completed' ? 'No completed items yet.' : 'Every item in this checklist is ticked.'}
            </p>
            <p className="mt-1 text-sm text-[#78716C]">
              {filter === 'completed' ? 'Tick items above and they will appear here.' : 'Switch the filter to All items to review the full checklist.'}
            </p>
            {filter !== 'all' && (
              <button type="button" onClick={() => setFilter('all')} className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-[#E7E5E4] bg-white px-4 text-sm font-semibold text-[#1C1917] transition hover:border-[#D97706] hover:text-[#b45309]">
                Show all items
              </button>
            )}
          </div>
        ) : visibleRows.map(row => {
          const done = row.items.filter(({ id }) => checked.has(id)).length;
          const categoryComplete = done === row.items.length;
          return (
            <section key={row.category.category} aria-label={row.category.category} className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white">
              <h4 className="flex items-center justify-between gap-3 bg-[#FAFAF9] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#57534E]">
                <span className="min-w-0">{row.category.category}</span>
                <span className={`shrink-0 ${categoryComplete ? 'text-[#5A7D5A]' : 'text-[#78716C]'}`}>
                  {categoryComplete
                    ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Done</span>
                    : `${done}/${row.items.length}`}
                </span>
              </h4>
              <ul className="divide-y divide-[#F5F5F4]">
                {row.items.map(({ entry, id }) => {
                  const isChecked = checked.has(id);
                  return (
                    <li key={id}>
                      <label className={`flex min-h-14 cursor-pointer items-start gap-3 px-4 py-3 transition ${isChecked ? 'bg-[#F0F5EF]' : 'hover:bg-[#FAFAF9]'}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(id)}
                          className="mt-0.5 h-6 w-6 shrink-0 rounded border-[#D6D3D1] text-[#D97706] focus:ring-[#D97706]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className={`block font-medium ${isChecked ? 'text-[#78716C] line-through decoration-[#A8A29E]' : 'text-[#1C1917]'}`}>{entry.text}</span>
                          {entry.source && (entry.url ? (
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={event => event.stopPropagation()}
                              className="mt-1 inline-flex items-center gap-1 text-xs text-[#b45309] hover:underline"
                            >
                              Source: {entry.source}
                              <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                          ) : (
                            <span className="mt-1 block text-xs text-[#78716C]">Source: {entry.source}</span>
                          ))}
                        </span>
                        {isChecked && <Check className="mt-1 h-5 w-5 shrink-0 text-[#5A7D5A]" aria-hidden="true" />}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E7E5E4] bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(28,25,23,0.06)] sm:static sm:rounded-2xl sm:border sm:px-5 sm:py-4 sm:shadow-none">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            {notice ? (
              <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`text-sm font-medium ${notice.kind === 'error' ? 'text-rose-700' : 'text-[#5A7D5A]'}`}>{notice.text}</p>
            ) : (
              <p className="text-sm text-[#78716C]">{doneItems} of {totalItems} items ticked · {percent}%</p>
            )}
            {saved && !notice && (
              <p className="text-xs text-[#78716C]">Last saved {new Date(saved.completedAt).toLocaleDateString('en-ZW')} at {new Date(saved.completedAt).toLocaleTimeString('en-ZW', { hour: '2-digit', minute: '2-digit' })}.</p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {saved && (
              <button type="button" onClick={onGoToInstallations} className="inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-semibold text-[#b45309] underline underline-offset-4 transition hover:text-[#92400e]">
                Continue to installations
              </button>
            )}
            <button
              type="button"
              onClick={downloadPdf}
              disabled={!saved || pdfBusy}
              title={saved ? 'Download the saved checklist as a branded PDF' : 'Save the checklist to unlock the branded PDF'}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#D97706] bg-white px-5 py-2.5 text-sm font-semibold text-[#b45309] transition hover:bg-[#FFF7ED] disabled:cursor-not-allowed disabled:border-[#E7E5E4] disabled:bg-[#FAFAF9] disabled:text-[#A8A29E]"
            >
              {pdfBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileDown className="h-4 w-4" aria-hidden="true" />}
              {pdfBusy ? 'Building PDF…' : 'Branded PDF'}
            </button>
            <button
              type="button"
              onClick={save}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1C1917] px-6 py-2.5 font-semibold text-white transition hover:bg-[#292524] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save checklist
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={pendingSwitch !== null}
        onClose={() => setPendingSwitch(null)}
        title="Switch checklist type?"
        description="Switching clears the items you have ticked in this checklist."
        size="sm"
        icon={<RotateCcw className="h-5 w-5" aria-hidden="true" />}
        footer={(
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setPendingSwitch(null)}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#E7E5E4] bg-white px-4 text-sm font-semibold text-[#1C1917] transition hover:border-[#D6D3D1]"
            >
              Keep this checklist
            </button>
            <button
              type="button"
              onClick={confirmSwitch}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#D97706] px-4 text-sm font-semibold text-white transition hover:bg-[#b45309]"
            >
              Switch and clear ticks
            </button>
          </div>
        )}
      >
        <p className="text-sm leading-6 text-[#57534E]">
          {doneItems} ticked item{doneItems === 1 ? '' : 's'} in the {type === 'installation' ? 'new installation' : 'regassing and service'} checklist will be removed.
          Saved checklists already attached to an installation are not affected.
        </p>
      </Modal>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Clear all ticks?"
        description="Every item in this checklist goes back to outstanding."
        size="sm"
        icon={<RotateCcw className="h-5 w-5" aria-hidden="true" />}
        footer={(
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setResetOpen(false)}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#E7E5E4] bg-white px-4 text-sm font-semibold text-[#1C1917] transition hover:border-[#D6D3D1]"
            >
              Keep ticks
            </button>
            <button
              type="button"
              onClick={confirmReset}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Clear all ticks
            </button>
          </div>
        )}
      >
        <p className="text-sm leading-6 text-[#57534E]">
          {doneItems} ticked item{doneItems === 1 ? '' : 's'} will be cleared on this device. Any checklist already saved to an installation keeps its own copy.
        </p>
      </Modal>
    </div>
  );
}
