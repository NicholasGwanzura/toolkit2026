import { describe, expect, it } from 'vitest';
import type { PlannerSafetyChecklistItem } from '@/types/index';
import { appendJobNote, outstandingChecklist, stampChecklist, validateTransition } from './planner-lifecycle';

const item = (id: string, completed: boolean, appliesTo: PlannerSafetyChecklistItem['appliesTo'] = 'all'): PlannerSafetyChecklistItem =>
    ({ id, label: id, required: true, completed, appliesTo });

describe('outstandingChecklist', () => {
    it('ignores items that do not apply to the refrigerant class', () => {
        expect(outstandingChecklist([item('a', true), item('flammable-only', false, ['A3'])], 'A1')).toEqual([]);
    });
    it('lists open items for flammable refrigerants', () => {
        expect(outstandingChecklist([item('a', true), item('flammable-only', false, ['A3'])], 'A3')).toEqual(['flammable-only']);
    });
    it('blocks a flammable job with no checklist, but not a safe one', () => {
        expect(outstandingChecklist([], 'A2L')).toHaveLength(1);
        expect(outstandingChecklist([], 'A1')).toEqual([]);
    });
});

describe('validateTransition for a new system', () => {
    const base = { from: 'in-progress' as const, to: 'completed' as const, refrigerantClass: 'A1', checklist: [], note: 'Installed', newSystem: true };
    it('needs the gas and a charge above zero', () => {
        expect(validateTransition({ ...base, amount: 4.5 })).toMatch(/gas used/);
        expect(validateTransition({ ...base, refrigerantType: 'R-32' })).toMatch(/charge in kg/);
        expect(validateTransition({ ...base, refrigerantType: 'R-32', amount: 0 })).toMatch(/charge in kg/);
    });
    it('completes once both are recorded', () => {
        expect(validateTransition({ ...base, refrigerantType: 'R-32', amount: 4.5 })).toBeNull();
    });
    it('does not ask other jobs for them', () => {
        expect(validateTransition({ ...base, newSystem: false })).toBeNull();
    });
    it('only applies on completion', () => {
        expect(validateTransition({ ...base, to: 'follow-up' })).toBeNull();
    });
});

describe('validateTransition', () => {
    const base = { from: 'scheduled' as const, to: 'in-progress' as const, refrigerantClass: 'A3', checklist: [item('a', true)] };
    it('allows starting with a complete checklist', () => {
        expect(validateTransition(base)).toBeNull();
    });
    it('blocks starting with an open checklist', () => {
        expect(validateTransition({ ...base, checklist: [item('a', false)] })).toMatch(/safety checklist/i);
    });
    it('requires a note to complete and to flag follow-up', () => {
        expect(validateTransition({ ...base, from: 'in-progress', to: 'completed' })).toMatch(/completion note/i);
        expect(validateTransition({ ...base, from: 'in-progress', to: 'completed', note: 'Recharged' })).toBeNull();
        expect(validateTransition({ ...base, from: 'in-progress', to: 'follow-up' })).toMatch(/follow-up/i);
    });
    it('does not let a scheduled job skip the checklist by completing directly', () => {
        expect(validateTransition({ ...base, to: 'completed', note: 'done', checklist: [item('a', false)] })).toMatch(/safety checklist/i);
    });
    it('rejects invalid transitions and negative amounts', () => {
        expect(validateTransition({ ...base, from: 'completed', to: 'in-progress' })).toMatch(/cannot transition/i);
        expect(validateTransition({ ...base, from: 'in-progress', to: 'completed', note: 'x', amount: -1 })).toMatch(/amount/i);
    });
});

describe('cancelling', () => {
    const base = { refrigerantClass: 'A1', checklist: [] as PlannerSafetyChecklistItem[] };
    it('needs a reason and is allowed from open states', () => {
        expect(validateTransition({ ...base, from: 'scheduled', to: 'cancelled' })).toMatch(/reason/i);
        expect(validateTransition({ ...base, from: 'scheduled', to: 'cancelled', note: 'Client closed' })).toBeNull();
        expect(validateTransition({ ...base, from: 'in-progress', to: 'cancelled', note: 'x' })).toBeNull();
    });
    it('cannot cancel a completed job or revive a cancelled one', () => {
        expect(validateTransition({ ...base, from: 'completed', to: 'cancelled', note: 'x' })).toMatch(/cannot transition/i);
        expect(validateTransition({ ...base, from: 'cancelled', to: 'scheduled' })).toMatch(/cannot transition/i);
    });
});

describe('stampChecklist', () => {
    const now = new Date('2026-10-10T09:00:00Z');
    it('stamps newly ticked items and keeps earlier stamps', () => {
        const existing = [{ ...item('a', true), completedBy: 'Sam', completedAt: '2026-10-09T08:00:00.000Z' }, item('b', false)];
        const out = stampChecklist(existing, [item('a', true), item('b', true)], 'Lee', now);
        expect(out[0]).toMatchObject({ completedBy: 'Sam', completedAt: '2026-10-09T08:00:00.000Z' });
        expect(out[1]).toMatchObject({ completedBy: 'Lee', completedAt: now.toISOString() });
    });
    it('ignores forged stamps and clears them on un-tick', () => {
        const forged = { ...item('a', true), completedBy: 'Boss', completedAt: '2020-01-01T00:00:00.000Z' };
        expect(stampChecklist([item('a', false)], [forged], 'Lee', now)[0].completedBy).toBe('Lee');
        const cleared = stampChecklist([forged], [{ ...forged, completed: false }], 'Lee', now)[0];
        expect(cleared.completedBy).toBeUndefined();
    });
});

describe('appendJobNote', () => {
    it('appends a dated entry', () => {
        expect(appendJobNote('First', ' Fixed ', 'Lee', new Date('2026-10-10T09:00:00Z'))).toBe('First\n[2026-10-10 Lee] Fixed');
        expect(appendJobNote(null, 'x', 'Lee', new Date('2026-10-10T09:00:00Z'))).toBe('[2026-10-10 Lee] x');
    });
});
