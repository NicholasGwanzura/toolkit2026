import { describe, expect, it } from 'vitest';
import {
  currentMonthKey,
  monthlyComplianceStatus,
  studentCards,
  technicianCards,
  trainerCards,
  vendorCards,
} from './dashboard-stats';

const NOW = Date.parse('2026-10-10T10:00:00Z');
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);
const byLabel = <T extends { label: string }>(cards: T[], label: string): T => cards.find((c) => c.label === label) as T;

describe('technicianCards', () => {
  const base = {
    jobs: [
      { scheduledDate: hoursAgo(2), status: 'completed' },
      { scheduledDate: daysAgo(3), status: 'completed' },
      { scheduledDate: daysAgo(40), status: 'completed' },
      { scheduledDate: hoursAgo(1), status: 'scheduled' },
    ],
    cocRequests: [
      { status: 'submitted' },
      { status: 'approved', expiryDate: new Date(NOW + 10 * 86400_000).toISOString() },
      { status: 'approved', expiryDate: new Date(NOW + 200 * 86400_000).toISOString() },
      { status: 'rejected' },
    ],
    gasLogs: [
      { timestamp: hoursAgo(3), actionType: 'Recovery', amount: 4.25 },
      { timestamp: daysAgo(5), actionType: 'Recovery', amount: 10 },
      { timestamp: hoursAgo(2), actionType: 'Charge', amount: 99 },
      { timestamp: daysAgo(60), actionType: 'Recovery', amount: 500 },
    ],
    now: NOW,
  };

  it('counts completed jobs inside the selected period only', () => {
    expect(byLabel(technicianCards({ ...base, range: 'today' }), 'Jobs Completed').value).toBe('1');
    expect(byLabel(technicianCards({ ...base, range: 'week' }), 'Jobs Completed').value).toBe('2');
    expect(byLabel(technicianCards({ ...base, range: 'month' }), 'Jobs Completed').value).toBe('2');
  });

  it('adds recovery entries in the period, ignoring charges and old entries', () => {
    expect(byLabel(technicianCards({ ...base, range: 'today' }), 'Refrigerant Recovered').value).toBe('4.3 kg');
    expect(byLabel(technicianCards({ ...base, range: 'week' }), 'Refrigerant Recovered').value).toBe('14.3 kg');
    expect(byLabel(technicianCards({ ...base, range: 'month' }), 'Refrigerant Recovered').value).toBe('14.3 kg');
  });

  it('keeps state cards independent of the period', () => {
    for (const range of ['today', 'week', 'month'] as const) {
      const cards = technicianCards({ ...base, range });
      expect(byLabel(cards, 'Pending COCs').value).toBe('1');
      expect(byLabel(cards, 'COCs on Record').value).toBe('2');
      expect(byLabel(cards, 'COCs on Record').note).toBe('1 expiring within 30 days');
    }
  });

  it('handles empty data without producing NaN', () => {
    const cards = technicianCards({ jobs: [], cocRequests: [], gasLogs: [], range: 'week', now: NOW });
    expect(cards.map((c) => c.value)).toEqual(['0', '0', '0 kg', '0']);
    expect(cards.some((c) => c.value.includes('NaN'))).toBe(false);
  });

  it('ignores bad timestamps and amounts', () => {
    const cards = technicianCards({
      jobs: [{ scheduledDate: 'not a date', status: 'completed' }],
      cocRequests: [],
      gasLogs: [{ timestamp: 'nope', actionType: 'Recovery', amount: 5 }, { timestamp: hoursAgo(1), actionType: 'Recovery', amount: Number.NaN }],
      range: 'month',
      now: NOW,
    });
    expect(byLabel(cards, 'Jobs Completed').value).toBe('0');
    expect(byLabel(cards, 'Refrigerant Recovered').value).toBe('0 kg');
  });
});

describe('vendorCards recovery returns', () => {
  it('does not count recovery returns as approved stock and dates by approval', () => {
    const cards = vendorCards({
      reorders: [
        { status: 'approved', quantityKg: 100, createdAt: daysAgo(60), nouReviewedAt: hoursAgo(3), reorderType: 'purchase' },
        { status: 'approved', quantityKg: 40, createdAt: hoursAgo(5), reorderType: 'recovery' },
      ],
      complianceApps: [], ledger: [], range: 'today', now: NOW,
    });
    expect(byLabel(cards, 'Approved Volume').value).toBe('100 kg');
  });
});

describe('vendorCards', () => {
  const input = {
    reorders: [
      { status: 'pending_hevacraz', quantityKg: 100, createdAt: hoursAgo(1) },
      { status: 'pending_nou', quantityKg: 50, createdAt: daysAgo(1) },
      { status: 'approved', quantityKg: 200, createdAt: hoursAgo(5) },
      { status: 'approved', quantityKg: 300, createdAt: daysAgo(20) },
      { status: 'approved', quantityKg: 900, createdAt: daysAgo(90) },
    ],
    complianceApps: [
      { status: 'approved', monthCoverage: '2026-09' },
      { status: 'submitted', monthCoverage: '2026-10' },
    ],
    ledger: [
      { totalValueUsd: 120.5, transactionDate: hoursAgo(2), direction: 'sale' },
      { totalValueUsd: 1000, transactionDate: daysAgo(10), direction: 'sale' },
      { totalValueUsd: 700, transactionDate: daysAgo(5), direction: 'purchase' },
      { totalValueUsd: 5000, transactionDate: daysAgo(100), direction: 'sale' },
    ],
    now: NOW,
  };

  it('limits volume and ledger to the period but not the pending count', () => {
    const today = vendorCards({ ...input, range: 'today' });
    expect(byLabel(today, 'Pending Reorders').value).toBe('2');
    expect(byLabel(today, 'Approved Volume').value).toBe('200 kg');
    expect(byLabel(today, 'Sales Value').value).toBe('$120.5');

    const month = vendorCards({ ...input, range: 'month' });
    expect(byLabel(month, 'Approved Volume').value).toBe('500 kg');
    expect(byLabel(month, 'Sales Value').value).toBe('$1,120.5');
    expect(byLabel(month, 'Sales Value').note).toContain('purchases $700');
  });

  it('reports approved certificates with pending ones in the note', () => {
    const cards = vendorCards({ ...input, range: 'week' });
    expect(byLabel(cards, 'Compliance Certificates').value).toBe('1');
    expect(byLabel(cards, 'Compliance Certificates').note).toBe('1 pending review');
  });
});

describe('monthlyComplianceStatus', () => {
  it('knows whether this month has a certificate on file', () => {
    expect(currentMonthKey(NOW)).toBe('2026-10');
    expect(monthlyComplianceStatus([{ status: 'submitted', monthCoverage: '2026-10' }], NOW)).toEqual({ month: '2026-10', submitted: true });
    expect(monthlyComplianceStatus([{ status: 'rejected', monthCoverage: '2026-10' }], NOW).submitted).toBe(false);
    expect(monthlyComplianceStatus([{ status: 'approved', monthCoverage: '2026-09' }], NOW).submitted).toBe(false);
  });
});

describe('trainerCards', () => {
  it('separates drafts, awaiting approval and courses needing attention', () => {
    const cards = trainerCards({
      courses: [
        { status: 'approved' }, { status: 'approved' }, { status: 'draft' }, { status: 'draft' },
        { status: 'pending_nou' }, { status: 'rejected' },
      ],
      submissions: [{ status: 'pending' }, { status: 'graded' }, { status: 'pending' }],
      certRequests: [{ status: 'submitted-for-admin-approval' }, { status: 'issued' }],
    });
    expect(byLabel(cards, 'Approved Courses')).toMatchObject({ value: '2', note: '1 awaiting approval, 2 drafts' });
    expect(byLabel(cards, 'Needs Your Attention')).toMatchObject({ value: '1', note: 'Rejected or returned for correction' });
    expect(byLabel(cards, 'Pending Grading')).toMatchObject({ value: '2', note: '3 submissions in total' });
    expect(byLabel(cards, 'Certificate Requests').value).toBe('1');
  });

  it('does not count a draft as awaiting approval', () => {
    const cards = trainerCards({ courses: [{ status: 'draft' }], submissions: [], certRequests: [] });
    expect(byLabel(cards, 'Approved Courses').note).toBe('0 awaiting approval, 1 draft');
  });
});

describe('studentCards', () => {
  it('shows enrolled courses, passes and what is waiting', () => {
    const cards = studentCards({
      courses: [{ id: 'a', status: 'approved' }, { id: 'b', status: 'approved' }, { id: 'c', status: 'approved' }, { id: 'd', status: 'draft' }],
      enrolledCourseIds: ['a', 'd', 'zzz'],
      submissions: [{ status: 'graded', passed: true }, { status: 'graded', passed: false }, { status: 'pending' }],
    });
    expect(byLabel(cards, 'My Courses')).toMatchObject({ value: '1', note: '3 available in total' });
    expect(byLabel(cards, 'Exams Passed')).toMatchObject({ value: '1', note: '3 submitted' });
    expect(byLabel(cards, 'Awaiting Grading').value).toBe('1');
    expect(byLabel(cards, 'Available Courses').value).toBe('2');
  });
});

import { adminCards, combineStates, maskCards } from './dashboard-stats';

describe('adminCards', () => {
  const summary = {
    technicians: { total: 120, active: 98 },
    regionsWithTechnicians: 8,
    reorders: { pendingReviews: 5, volumeKgInPeriod: 1250.5 },
  };

  it('describes the scope of each figure honestly', () => {
    const all = adminCards(summary, 'week', 'all');
    expect(byLabel(all, 'Active Techs')).toMatchObject({ value: '98', note: 'all provinces' });
    expect(byLabel(all, 'Pending Reorder Reviews').note).toBe('All provinces, awaiting HEVACRAZ or NOU');
    expect(byLabel(all, 'Refrigerant Reordered')).toMatchObject({ value: '1,250.5 kg', note: 'Requested in the last 7 days, all provinces' });
    expect(byLabel(all, 'Provinces').note).toBe('With registered technicians');
  });

  it('names the province when one is chosen', () => {
    const harare = adminCards(summary, 'today', 'Harare');
    expect(byLabel(harare, 'Total Technicians').note).toBe('Harare');
    expect(byLabel(harare, 'Provinces').note).toBe('Selected province');
  });
});

describe('maskCards and combineStates', () => {
  const cards = [{ label: 'A', value: '0', note: 'n', definition: 'd' }];

  it('never shows a zero while loading or after a failure', () => {
    expect(maskCards(cards, 'ready')).toEqual(cards);
    expect(maskCards(cards, 'loading')[0]).toMatchObject({ value: '…', note: 'Loading', label: 'A' });
    expect(maskCards(cards, 'error')[0]).toMatchObject({ value: '–' });
    expect(maskCards(cards, 'error')[0].note).toMatch(/Could not load/);
  });

  it('lets a failure win over loading, and loading win over ready', () => {
    expect(combineStates([{ isLoading: false, error: undefined }])).toBe('ready');
    expect(combineStates([{ isLoading: true, error: undefined }, { isLoading: false, error: undefined }])).toBe('loading');
    expect(combineStates([{ isLoading: true, error: undefined }, { isLoading: false, error: new Error('x') }])).toBe('error');
    expect(combineStates([])).toBe('ready');
  });
});
