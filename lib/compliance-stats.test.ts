import { describe, expect, it } from 'vitest';
import { expiringCertificates, monthlyApprovedKg, periodStart, summarizeReorderTotals } from './compliance-stats';

const NOW = Date.parse('2026-10-10T10:00:00Z');
const gwp: Record<string, number> = { 'R-410A': 2088, 'R-290': 3 };
const natural = new Set(['R-290']);
const reorder = (status: string, gasType: string, quantityKg: number, createdAt: string) => ({ status, gasType, quantityKg, createdAt });

const reorders = [
  reorder('approved', 'R-410A', 100, '2026-09-01T00:00:00Z'),
  reorder('approved', 'R-290', 300, '2026-02-10T00:00:00Z'),
  reorder('approved', 'R-410A', 500, '2025-11-15T00:00:00Z'),
  reorder('approved', 'R-410A', 900, '2024-03-01T00:00:00Z'),
  reorder('rejected', 'R-410A', 700, '2026-09-05T00:00:00Z'),
  reorder('pending_nou', 'R-410A', 50, '2026-10-01T00:00:00Z'),
];
// The database has already applied the period filter, so these are the grouped totals it returns.
const ytdGroups = [
  { status: 'approved', gasType: 'R-410A', quantityKg: 100 },
  { status: 'approved', gasType: 'R-290', quantityKg: 300 },
  { status: 'rejected', gasType: 'R-410A', quantityKg: 700 },
  { status: 'pending_nou', gasType: 'R-410A', quantityKg: 50 },
];
const kpis = (groups: Array<{ status: string; gasType: string; quantityKg: number }>, pendingReviewCount = 1) =>
  summarizeReorderTotals(groups, { pendingReviewCount, gwpOf: (g) => gwp[g], naturalGases: natural });

describe('summarizeReorderTotals', () => {
  it('counts only approved volume and weights it by GWP', () => {
    expect(kpis(ytdGroups)).toMatchObject({ approvedKg: 400, naturalSharePct: 75, pendingReviewCount: 1 });
    expect(kpis(ytdGroups).gwpImpactTonnes).toBe(Math.round((100 * 2088) / 1000 + (300 * 3) / 1000));
  });

  it('leaves out rejected and pending reorders from volume but keeps the backlog count', () => {
    expect(kpis(ytdGroups, 7)).toMatchObject({ approvedKg: 400, pendingReviewCount: 7 });
  });

  it('has no natural share when nothing was approved', () => {
    expect(summarizeReorderTotals([], { pendingReviewCount: 0, gwpOf: () => 1, naturalGases: natural })).toEqual({
      approvedKg: 0, gwpImpactTonnes: 0, naturalSharePct: 0, pendingReviewCount: 0,
    });
  });

  it('ignores a group whose quantity is not a finite number', () => {
    expect(kpis([{ status: 'approved', gasType: 'R-290', quantityKg: Number.NaN }]).approvedKg).toBe(0);
  });
});

describe('periodStart', () => {
  it('knows where each period begins', () => {
    expect(periodStart('ytd', NOW)).toBe(Date.UTC(2026, 0, 1));
    expect(periodStart('12m', NOW)).toBe(Date.UTC(2025, 9, 10));
    expect(periodStart('all', NOW)).toBeNull();
  });
});

describe('monthlyApprovedKg', () => {
  it('buckets approved volume by calendar month, oldest first', () => {
    const six = monthlyApprovedKg(reorders, 6, NOW);
    expect(six.map((b) => b.month)).toEqual(['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']);
    expect(six.find((b) => b.month === 'Sep')?.kg).toBe(100);
    expect(six.reduce((sum, b) => sum + b.kg, 0)).toBe(100);
  });

  it('adds the year to the labels on a long view, and leaves out rejected reorders', () => {
    const twelve = monthlyApprovedKg(reorders, 12, NOW);
    expect(twelve).toHaveLength(12);
    expect(twelve[0].month).toBe('Nov 25');
    expect(twelve.find((b) => b.month === 'Nov 25')?.kg).toBe(500);
    expect(twelve.find((b) => b.month === 'Sep 26')?.kg).toBe(100);
  });
});

describe('expiringCertificates', () => {
  const day = (n: number) => new Date(NOW + n * 86_400_000).toISOString().slice(0, 10);
  const technicians = [
    { id: '1', name: 'Ada', status: 'active', certifications: [{ name: 'RAC', expiryDate: day(20) }, { name: 'Safety', expiryDate: day(400) }] },
    { id: '2', name: 'Ben', status: 'active', certifications: [{ name: 'Brazing', expiryDate: day(-10) }] },
    { id: '3', name: 'Cy', status: 'suspended', certifications: [{ name: 'RAC', expiryDate: day(5) }] },
    { id: '4', name: 'Di', status: 'active', certifications: [{ name: 'Bad', expiryDate: null }, { name: 'Bad2', expiryDate: 'nope' }] },
  ];

  it('lists expired and soon-to-expire certificates, soonest first, for active technicians only', () => {
    const rows = expiringCertificates(technicians, NOW);
    expect(rows.map((r) => [r.technicianName, r.certificate])).toEqual([['Ben', 'Brazing'], ['Ada', 'RAC']]);
    expect(rows[0].daysLeft).toBeLessThan(0);
  });

  it('respects the window and the limit', () => {
    expect(expiringCertificates(technicians, NOW, 10).map((r) => r.technicianName)).toEqual(['Ben']);
    const many = Array.from({ length: 10 }, (_, i) => ({ id: String(i), name: `T${i}`, status: 'active', certifications: [{ name: 'c', expiryDate: day(i + 1) }] }));
    expect(expiringCertificates(many, NOW, 90, 3)).toHaveLength(3);
  });
});
