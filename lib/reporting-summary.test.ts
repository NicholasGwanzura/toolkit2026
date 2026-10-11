import { describe, expect, it } from 'vitest';
import { bucketStatuses, isReportRange, rangeStart } from './reporting-summary';

describe('bucketStatuses', () => {
  it('groups statuses and counts everything toward the total', () => {
    expect(bucketStatuses([
      { status: 'submitted', count: 2 },
      { status: 'under-review', count: 1 },
      { status: 'approved', count: 5 },
      { status: 'rejected', count: 3 },
      { status: 'something-new', count: 4 },
    ])).toEqual({ total: 15, approved: 5, pending: 3, rejected: 3 });
  });
  it('treats course drafts and reorder stages as pending', () => {
    expect(bucketStatuses([{ status: 'draft', count: 1 }, { status: 'pending_nou', count: 2 }, { status: 'pending_hevacraz', count: 3 }]).pending).toBe(6);
  });
  it('is all zero for no rows', () => {
    expect(bucketStatuses([])).toEqual({ total: 0, approved: 0, pending: 0, rejected: 0 });
  });
});

describe('rangeStart', () => {
  const now = new Date('2026-10-10T12:00:00Z');
  it('is null for all time', () => expect(rangeStart('all', now)).toBeNull());
  it('goes back 1, 7 and 30 days', () => {
    expect(rangeStart('today', now)?.toISOString()).toBe('2026-10-09T12:00:00.000Z');
    expect(rangeStart('week', now)?.toISOString()).toBe('2026-10-03T12:00:00.000Z');
    expect(rangeStart('month', now)?.toISOString()).toBe('2026-09-10T12:00:00.000Z');
  });
});

describe('isReportRange', () => {
  it('only accepts the four ranges', () => {
    expect(isReportRange('week')).toBe(true);
    expect(isReportRange('year')).toBe(false);
    expect(isReportRange(null)).toBe(false);
  });
});
