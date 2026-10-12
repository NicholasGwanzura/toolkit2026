'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Check, ExternalLink, Save } from 'lucide-react';
import type { InstallationChecklistSnapshot } from '@/types/index';
import { CHECKLIST_VERSION, checklistFor, checklistItemId, type ChecklistType } from './checklists';

interface ChecklistTabProps {
  saved: InstallationChecklistSnapshot | null;
  onSave: (snapshot: InstallationChecklistSnapshot) => void;
  onGoToInstallations: () => void;
}

export default function ChecklistTab({ saved, onSave, onGoToInstallations }: ChecklistTabProps) {
  const { user } = useAuth();
  const draftKey = user?.id ? `coolpro_checklist_draft:${user.id}` : null;
  const [type, setType] = useState<ChecklistType>('installation');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState('');
  const [restoredFor, setRestoredFor] = useState<string | null>(null);

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
  const totalItems = useMemo(() => categories.reduce((sum, category) => sum + category.items.length, 0), [categories]);
  const doneItems = checked.size;
  const percent = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100);

  const switchType = (next: ChecklistType) => {
    if (next === type) return;
    if (checked.size > 0 && !window.confirm('Switching checklist clears the items you have ticked. Continue?')) return;
    setType(next);
    setChecked(new Set());
    setNotice('');
  };

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setNotice('');
  };

  const save = () => {
    const items = categories.flatMap((category, categoryIndex) =>
      category.items.map((entry, itemIndex) => {
        const id = checklistItemId(type, categoryIndex, itemIndex);
        return { id, category: category.category, text: entry.text, checked: checked.has(id), source: entry.source };
      }),
    );
    onSave({ checklistType: type, version: CHECKLIST_VERSION, completedItems: doneItems, totalItems, completedAt: new Date().toISOString(), items });
    setNotice(
      doneItems === totalItems
        ? 'Checklist saved and complete. It will attach to the next installation you save.'
        : `Checklist saved with ${doneItems} of ${totalItems} items ticked. A COC request needs every item ticked.`,
    );
  };

  return (
    <div className="space-y-5 pb-20 sm:pb-0">
      <div className="inline-flex w-full border border-stone-200 bg-stone-100 p-1 sm:w-auto" role="group" aria-label="Checklist type">
        {([['installation', 'New installation'], ['regassing', 'Regassing and service']] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => switchType(value)}
            aria-pressed={type === value}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold transition sm:flex-none ${type === value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-lg font-semibold text-stone-900">{type === 'installation' ? 'New installation verification' : 'Regassing and service checklist'}</h3>
          <p className="text-sm font-semibold text-stone-700" aria-live="polite">{doneItems} of {totalItems}</p>
        </div>
        <div className="mt-2 h-2 w-full bg-stone-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Checklist progress">
          <div className={`h-2 transition-all ${percent === 100 ? 'bg-emerald-500' : 'bg-[#D97706]'}`} style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="space-y-6">
        {categories.map((category, categoryIndex) => {
          const done = category.items.filter((_, itemIndex) => checked.has(checklistItemId(type, categoryIndex, itemIndex))).length;
          return (
            <section key={category.category} aria-label={category.category}>
              <h4 className="flex items-center justify-between bg-stone-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-stone-700">
                <span>{category.category}</span>
                <span className={done === category.items.length ? 'text-emerald-700' : 'text-stone-500'}>
                  {done === category.items.length ? <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Done</span> : `${done}/${category.items.length}`}
                </span>
              </h4>
              <ul className="mt-2 space-y-2">
                {category.items.map((entry, itemIndex) => {
                  const id = checklistItemId(type, categoryIndex, itemIndex);
                  const isChecked = checked.has(id);
                  return (
                    <li key={id}>
                      <label className={`flex min-h-14 cursor-pointer items-start gap-3 border p-3 transition ${isChecked ? 'border-emerald-200 bg-emerald-50/60' : 'border-stone-200 bg-white hover:bg-stone-50'}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(id)}
                          className="mt-0.5 h-6 w-6 shrink-0 rounded border-stone-300 text-[#D97706] focus:ring-[#D97706]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className={`block font-medium ${isChecked ? 'text-stone-500' : 'text-stone-800'}`}>{entry.text}</span>
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
                            <span className="mt-1 block text-xs text-stone-500">Source: {entry.source}</span>
                          ))}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white p-3 sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={save}
            className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#1C1917] px-6 py-2.5 font-semibold text-white transition hover:bg-[#292524]"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Save checklist
          </button>
          {saved && (
            <button type="button" onClick={onGoToInstallations} className="inline-flex min-h-11 items-center justify-center px-2 text-sm font-semibold text-[#b45309] underline">
              Continue to installations
            </button>
          )}
        </div>
        {notice && <p role="status" className="mt-2 text-sm font-medium text-emerald-700">{notice}</p>}
      </div>
    </div>
  );
}
