'use client';

import { useState } from 'react';
import { ChevronDown, ClipboardCheck, ListChecks, Play } from 'lucide-react';
import { updatePlannerJob } from '@/lib/api';
import { DEFAULT_PLANNER_SAFETY_CHECKLIST } from '@/constants/job-planner';
import { isFlammableClass, outstandingChecklist } from '@/lib/planner-lifecycle';
import { findConflicts, isPastDate } from '@/lib/planner-conflicts';
import { RefrigerantAutocomplete, refrigerantLabel } from '@/components/RefrigerantAutocomplete';
import type { PlannerJob, Refrigerant, Technician } from '@/types/index';

type Panel = 'none' | 'checklist' | 'complete' | 'follow-up' | 'edit' | 'cancel';

const button = 'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60';

/** Start / checklist / complete / follow-up controls for one planner job card. */
interface JobActionsProps {
    job: PlannerJob;
    allJobs: PlannerJob[];
    /** Present only for org admins, who may reassign. */
    technicians?: Technician[];
    today: string;
}

export default function JobActions({ job, allJobs, technicians, today }: JobActionsProps) {
    const [panel, setPanel] = useState<Panel>('none');
    const [more, setMore] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [note, setNote] = useState('');
    const [editDate, setEditDate] = useState(job.scheduledDate);
    const [editLocation, setEditLocation] = useState(job.location);
    const [editTechnician, setEditTechnician] = useState(job.technicianId);
    // On a new system the planned amount is only an estimate, so the real charge starts blank.
    const [amount, setAmount] = useState(job.amount != null && !job.newSystem ? String(job.amount) : '');
    const [gas, setGas] = useState<Refrigerant | null>(null);

    // A flammable job saved without a checklist would otherwise be stuck, with nothing to tick.
    const checklistItems = job.checklistItems.length === 0 && isFlammableClass(job.refrigerantClass)
        ? DEFAULT_PLANNER_SAFETY_CHECKLIST.map(item => ({ ...item, completed: false }))
        : job.checklistItems;
    const outstanding = outstandingChecklist(checklistItems, job.refrigerantClass);
    const blocked = outstanding.length > 0;

    const run = async (action: () => Promise<unknown>, after?: () => void) => {
        if (busy) return;
        setBusy(true);
        setError('');
        try {
            await action();
            after?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'That action failed. Try again.');
        } finally {
            setBusy(false);
        }
    };

    const toggleItem = (itemId: string, completed: boolean) =>
        run(() => updatePlannerJob(job.id, {
            checklistItems: checklistItems.map(item => (item.id === itemId ? { ...item, completed } : item)),
        }));

    const conflicts = findConflicts(allJobs, editTechnician, editDate, job.id);
    const saveEdit = () => run(
        () => updatePlannerJob(job.id, {
            ...(editDate !== job.scheduledDate ? { scheduledDate: editDate } : {}),
            ...(editLocation.trim() !== job.location ? { location: editLocation } : {}),
            ...(editTechnician !== job.technicianId ? { technicianId: editTechnician } : {}),
        }),
        () => setPanel('none'),
    );

    const submitStatus = (status: 'completed' | 'follow-up' | 'cancelled') => {
        const parsed = amount.trim() === '' ? undefined : Number(amount);
        return run(
            () => updatePlannerJob(job.id, { status, note, ...(status === 'completed' && parsed !== undefined ? { amount: parsed } : {}), ...(status === 'completed' && gas ? { refrigerantId: gas.id, refrigerantType: refrigerantLabel(gas) } : {}) }),
            () => { setPanel('none'); setNote(''); },
        );
    };

    const isDone = job.status === 'completed' || job.status === 'cancelled';
    const newSystemIncomplete = job.newSystem && !isDone && (!(gas || job.refrigerantType) || !(Number(amount) > 0));
    if (job.status === 'cancelled') return null;

    return (
        <div className="mt-3 space-y-2">
            {!isDone && <div className="flex gap-2">
                {job.status === 'scheduled' && (blocked ? (
                    <button type="button" onClick={() => setPanel(panel === 'checklist' ? 'none' : 'checklist')}
                        className={`${button} min-h-11 border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}>
                        <ListChecks className="h-3.5 w-3.5" /> Checklist ({outstanding.length} open)
                    </button>
                ) : (
                    <button type="button" disabled={busy} onClick={() => run(() => updatePlannerJob(job.id, { status: 'in-progress' }))}
                        className={`${button} min-h-11 border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}>
                        <Play className="h-3.5 w-3.5" /> Start job
                    </button>
                ))}
                <button type="button" onClick={() => setPanel(panel === 'complete' ? 'none' : 'complete')}
                    className={`${button} min-h-11 border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100`}>
                    <ClipboardCheck className="h-3.5 w-3.5" /> Complete
                </button>
                <button type="button" onClick={() => setMore(open => !open)} aria-expanded={more}
                    className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                    More <ChevronDown className={`h-3.5 w-3.5 transition ${more ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
            </div>}
            {(more || isDone) && <div className="flex flex-wrap gap-2">
                {!isDone && !(blocked && job.status === 'scheduled') && <button type="button" onClick={() => setPanel(panel === 'checklist' ? 'none' : 'checklist')}
                    className={`${button} min-h-11 border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}>
                    Checklist {blocked ? `(${outstanding.length} open)` : '✓'}
                </button>}
                <button type="button" onClick={() => setPanel(panel === 'follow-up' ? 'none' : 'follow-up')}
                    className={`${button} min-h-11 border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}>
                    Needs follow-up
                </button>
                {!isDone && (
                    <button type="button" onClick={() => setPanel(panel === 'edit' ? 'none' : 'edit')}
                        className={`${button} min-h-11 border-gray-200 bg-white text-gray-700 hover:bg-gray-50`}>
                        Edit
                    </button>
                )}
                {!isDone && (
                    <button type="button" onClick={() => setPanel(panel === 'cancel' ? 'none' : 'cancel')}
                        className={`${button} min-h-11 border-rose-100 bg-white text-rose-700 hover:bg-rose-50`}>
                        Cancel job
                    </button>
                )}
            </div>}

            {blocked && job.status === 'scheduled' && !isDone && (
                <p className="text-xs text-amber-700">Tick every required checklist item to start this job.</p>
            )}

            {(panel === 'checklist' || (panel === 'complete' && blocked && job.status === 'scheduled')) && (
                <div className="space-y-1.5 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    {checklistItems.length === 0 && <p className="text-xs text-gray-500">No checklist recorded for this job.</p>}
                    {checklistItems.map(item => (
                        <label key={item.id} className="flex items-start gap-2 text-xs text-gray-700">
                            <input type="checkbox" checked={item.completed} disabled={busy} onChange={event => toggleItem(item.id, event.target.checked)} className="mt-0.5" />
                            <span>
                                {item.label}
                                {item.completed && item.completedBy && (
                                    <span className="block text-[11px] text-gray-400">{item.completedBy}, {item.completedAt?.slice(0, 16).replace('T', ' ')}</span>
                                )}
                            </span>
                        </label>
                    ))}
                </div>
            )}

            {panel === 'edit' && !isDone && (
                <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <label className="block text-xs font-semibold text-gray-600">
                        Date
                        <input type="date" value={editDate} onChange={event => setEditDate(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-300" />
                    </label>
                    <label className="block text-xs font-semibold text-gray-600">
                        Site / location
                        <input value={editLocation} onChange={event => setEditLocation(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-300" />
                    </label>
                    {technicians && (
                        <label className="block text-xs font-semibold text-gray-600">
                            Technician
                            <select value={editTechnician} onChange={event => setEditTechnician(event.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-300">
                                {!technicians.some(t => t.id === job.technicianId) && <option value={job.technicianId}>{job.technicianName}</option>}
                                {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </label>
                    )}
                    {isPastDate(editDate, today) && editDate !== job.scheduledDate && (
                        <p className="text-xs text-amber-700">This date is in the past.</p>
                    )}
                    {conflicts.length > 0 && (
                        <p className="text-xs text-amber-700">
                            Already booked that day: {conflicts.map(c => c.clientName).join(', ')}.
                        </p>
                    )}
                    <button type="button" disabled={busy || !editDate || !editLocation.trim()} onClick={saveEdit}
                        className="w-full rounded-lg bg-[#B45309] px-3 py-2 text-xs font-semibold text-white hover:bg-[#92400E] disabled:opacity-60">
                        {busy ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            )}

            {(panel === 'complete' || panel === 'follow-up' || panel === 'cancel') && (
                <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <label className="block text-xs font-semibold text-gray-600">
                        {panel === 'complete' ? 'What was done? (required)' : panel === 'cancel' ? 'Reason for cancelling (required)' : 'What follow-up is needed? (required)'}
                        <textarea value={note} onChange={event => setNote(event.target.value)} rows={3}
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-300" />
                    </label>
                    {panel === 'complete' && !isDone && job.newSystem && (
                        <>
                            <div className="text-xs font-semibold text-gray-600">
                                <p className="mb-1">Gas used (required)</p>
                                <RefrigerantAutocomplete value={gas} onSelect={setGas}
                                    placeholder={job.refrigerantType ? `Planned: ${job.refrigerantType}. Search to change` : 'Search gas, e.g. R290, R-32'} />
                            </div>
                            <label className="block text-xs font-semibold text-gray-600">
                                Charge, kg (required)
                                <input type="number" min="0" step="0.001" value={amount} onChange={event => setAmount(event.target.value)}
                                    placeholder={job.amount ? `Estimated ${job.amount} kg` : 'e.g. 4.5'}
                                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-300" />
                            </label>
                        </>
                    )}
                    {panel === 'complete' && !isDone && !job.newSystem && job.refrigerantType && (
                        <label className="block text-xs font-semibold text-gray-600">
                            Refrigerant used ({job.refrigerantType}), kg
                            <input type="number" min="0" step="0.001" value={amount} onChange={event => setAmount(event.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-300" />
                        </label>
                    )}
                    <button type="button" disabled={busy || !note.trim() || (panel === 'complete' && newSystemIncomplete)} onClick={() => submitStatus(panel === 'complete' ? 'completed' : panel === 'cancel' ? 'cancelled' : 'follow-up')}
                        className="w-full rounded-lg bg-[#B45309] px-3 py-2 text-xs font-semibold text-white hover:bg-[#92400E] disabled:opacity-60">
                        {busy ? 'Saving…' : panel === 'complete' ? 'Mark job complete' : panel === 'cancel' ? 'Cancel this job' : 'Save follow-up'}
                    </button>
                </div>
            )}

            {error && <p role="alert" className="text-xs font-medium text-rose-700">{error}</p>}
        </div>
    );
}
