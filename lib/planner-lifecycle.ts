// Job lifecycle rules shared by the planner API (enforcement) and the UI (guidance).
import type { PlannerJob, PlannerJobStatus, PlannerSafetyChecklistItem, RefrigerantSafetyClass } from '@/types/index';

export const STATUS_TRANSITIONS: Record<PlannerJobStatus, PlannerJobStatus[]> = {
    scheduled: ['in-progress', 'completed', 'follow-up', 'cancelled'],
    'in-progress': ['completed', 'follow-up', 'cancelled'],
    completed: ['follow-up'],
    'follow-up': ['completed', 'cancelled'],
    cancelled: [],
};

export function isFlammableClass(refrigerantClass: RefrigerantSafetyClass | string): boolean {
    return refrigerantClass === 'A2L' || refrigerantClass === 'A3';
}

export function applicableItems(
    items: PlannerSafetyChecklistItem[],
    refrigerantClass: RefrigerantSafetyClass | string,
): PlannerSafetyChecklistItem[] {
    return items.filter(item =>
        item.required && (item.appliesTo === 'all' || item.appliesTo.includes(refrigerantClass as RefrigerantSafetyClass)),
    );
}

/** Items that still block the job. A flammable-refrigerant job with no checklist at all is blocked too. */
export function outstandingChecklist(
    items: PlannerSafetyChecklistItem[],
    refrigerantClass: RefrigerantSafetyClass | string,
): string[] {
    const required = applicableItems(items, refrigerantClass);
    if (required.length === 0 && isFlammableClass(refrigerantClass)) {
        return ['Safety checklist has not been recorded for this job'];
    }
    return required.filter(item => !item.completed).map(item => item.label);
}

/**
 * Stamp who ticked each item and when. Items that were already complete keep their original
 * stamp; items un-ticked lose it. Client-supplied stamps are ignored so they cannot be forged.
 */
export function stampChecklist(
    existing: PlannerSafetyChecklistItem[],
    incoming: PlannerSafetyChecklistItem[],
    who: string,
    now: Date,
): PlannerSafetyChecklistItem[] {
    const before = new Map(existing.map(item => [item.id, item]));
    return incoming.map(item => {
        const { completedBy: _by, completedAt: _at, ...rest } = item;
        if (!item.completed) return { ...rest, completed: false };
        const prior = before.get(item.id);
        if (prior?.completed && prior.completedBy && prior.completedAt) {
            return { ...rest, completedBy: prior.completedBy, completedAt: prior.completedAt };
        }
        return { ...rest, completedBy: who, completedAt: now.toISOString() };
    });
}

export interface TransitionInput {
    from: PlannerJobStatus;
    to: PlannerJobStatus;
    refrigerantClass: string;
    checklist: PlannerSafetyChecklistItem[];
    /** The note supplied with this transition (not the job's existing notes). */
    note?: string | null;
    amount?: number | null;
    /** New systems must record the gas and charge before they can be completed. */
    newSystem?: boolean;
    refrigerantType?: string | null;
}

/** Returns an error message, or null when the transition is allowed. */
export function validateTransition(input: TransitionInput): string | null {
    const { from, to, refrigerantClass, checklist, note, amount, newSystem, refrigerantType } = input;
    if (!(STATUS_TRANSITIONS[from] ?? []).includes(to)) {
        return `Cannot transition from "${from}" to "${to}"`;
    }

    if (to === 'in-progress' || (to === 'completed' && from === 'scheduled')) {
        const outstanding = outstandingChecklist(checklist, refrigerantClass);
        if (outstanding.length > 0) {
            return `Complete the safety checklist before starting work: ${outstanding.join(', ')}.`;
        }
    }

    if (to === 'completed' && from !== 'completed' && !note?.trim()) {
        return 'Add a completion note describing the work done before completing the job.';
    }
    if (to === 'completed' && from !== 'completed' && newSystem) {
        if (!refrigerantType?.trim()) return 'Record the gas used in this new system before completing the job.';
        if (amount == null || !Number.isFinite(amount) || amount <= 0) return 'Record the charge in kg for this new system before completing the job.';
    }
    if (to === 'cancelled' && !note?.trim()) {
        return 'Add a reason for cancelling the job.';
    }
    if (to === 'follow-up' && !note?.trim()) {
        return 'Add a note explaining what follow-up is needed.';
    }
    if (amount != null && (!Number.isFinite(amount) || amount < 0)) {
        return 'Refrigerant amount must be zero or more.';
    }
    return null;
}

export function checklistFullyComplete(job: Pick<PlannerJob, 'checklistItems' | 'refrigerantClass'>): boolean {
    return outstandingChecklist(job.checklistItems, job.refrigerantClass).length === 0;
}

/** Append a dated, attributed entry to the job's running notes. */
export function appendJobNote(existing: string | null | undefined, note: string, who: string, now: Date): string {
    const entry = `[${now.toISOString().slice(0, 10)} ${who}] ${note.trim()}`;
    return existing?.trim() ? `${existing.trim()}\n${entry}` : entry;
}
