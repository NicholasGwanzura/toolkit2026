import { describe, expect, it } from 'vitest';
import { daysUntil, describeReminder, dueReminders, reminderKey, stageFor, type ExpiryItem } from './expiry-reminders';

const NOW = new Date('2026-10-10T08:00:00Z');
const item = (over: Partial<ExpiryItem> = {}): ExpiryItem => ({ kind: 'registration', id: 'r1', technicianId: 't1', name: 'Tendai', email: 't@example.com', expiryDate: '2026-10-20', ...over });

describe('daysUntil', () => {
  it('counts whole days and handles the past', () => {
    expect(daysUntil('2026-10-10', NOW)).toBe(0);
    expect(daysUntil('2026-10-20', NOW)).toBe(10);
    expect(daysUntil('2026-10-05', NOW)).toBe(-5);
  });
  it('ignores anything that is not a date', () => {
    expect(daysUntil('soon', NOW)).toBeNull();
    expect(daysUntil('', NOW)).toBeNull();
  });
});

describe('stageFor', () => {
  it('picks the stage by days left', () => {
    expect(stageFor(45)).toBeNull();
    expect(stageFor(30)).toBe('30-days');
    expect(stageFor(8)).toBe('30-days');
    expect(stageFor(7)).toBe('7-days');
    expect(stageFor(0)).toBe('7-days');
    expect(stageFor(-1)).toBe('expired');
    expect(stageFor(-30)).toBe('expired');
    expect(stageFor(-31)).toBeNull();
  });
});

describe('dueReminders', () => {
  it('returns one reminder per record at its current stage', () => {
    const r = dueReminders([item(), item({ id: 'r2', expiryDate: '2026-10-12' }), item({ id: 'r3', expiryDate: '2027-03-01' })], NOW, new Set());
    expect(r.map((x) => [x.id, x.stage])).toEqual([['r1', '30-days'], ['r2', '7-days']]);
  });
  it('skips reminders already sent, and records with no email', () => {
    const sent = new Set([reminderKey(item(), '30-days')]);
    expect(dueReminders([item()], NOW, sent)).toEqual([]);
    expect(dueReminders([item({ email: null })], NOW, new Set())).toEqual([]);
  });
  it('starts a fresh cycle when a renewal moves the expiry date', () => {
    const sent = new Set([reminderKey(item(), '30-days')]);
    expect(dueReminders([item({ expiryDate: '2026-10-25' })], NOW, sent)).toHaveLength(1);
  });
});

describe('describeReminder', () => {
  it('words each stage', () => {
    expect(describeReminder({ kind: 'registration', stage: '7-days', daysLeft: 1, expiryDate: '2026-10-11' }).subject).toBe('Your HEVACRAZ registration expires tomorrow');
    expect(describeReminder({ kind: 'membership', stage: '30-days', daysLeft: 20, expiryDate: '2026-10-30' }).subject).toContain('in 20 days');
    expect(describeReminder({ kind: 'membership', stage: 'expired', daysLeft: -3, expiryDate: '2026-10-07' }).subject).toContain('expired');
  });
});
