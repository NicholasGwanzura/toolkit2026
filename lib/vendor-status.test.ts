import { describe, expect, it } from 'vitest';
import { quotaUsage } from './supplier-quota';
import { quotaRemainingKg, vendorApplicationInfo, vendorAttention } from './vendor-status';

const NOW = Date.parse('2026-10-10T10:00:00Z');
const noQuota = quotaUsage({ sales: [], quotaKg: null, now: NOW });
const base = { application: { state: 'approved' as const }, quota: noQuota, reorders: [], monthlyComplianceSubmitted: true, monthLabel: '2026-10', now: NOW };

describe('vendorApplicationInfo', () => {
  it('prefers approved, then pending, then the newest rejection', () => {
    expect(vendorApplicationInfo([{ status: 'rejected' }, { status: 'approved' }]).state).toBe('approved');
    expect(vendorApplicationInfo([{ status: 'rejected' }, { status: 'under-review' }]).state).toBe('pending');
    const r = vendorApplicationInfo([
      { status: 'rejected', reviewNote: 'old', submittedAt: '2026-01-01' },
      { status: 'rejected', reviewNote: 'new', submittedAt: '2026-06-01' },
    ]);
    expect(r).toEqual({ state: 'rejected', note: 'new' });
    expect(vendorApplicationInfo([]).state).toBe('none');
  });
});

describe('vendorAttention', () => {
  it('is empty when everything is in order', () => {
    expect(vendorAttention(base)).toEqual([]);
  });
  it('flags an unapproved application and a missing certificate only for approved suppliers', () => {
    const pending = vendorAttention({ ...base, application: { state: 'pending' }, monthlyComplianceSubmitted: false });
    expect(pending.map((i) => i.id)).toEqual(['application-pending']);
    const due = vendorAttention({ ...base, monthlyComplianceSubmitted: false });
    expect(due.map((i) => i.id)).toEqual(['compliance-due']);
  });
  it('flags quota near the limit and exceeded', () => {
    const near = quotaUsage({ sales: [{ quantityKg: 900, transactionDate: '2026-05-01' }], quotaKg: 1000, now: NOW });
    expect(vendorAttention({ ...base, quota: near })[0]).toMatchObject({ id: 'quota-near', tone: 'warn' });
    const over = quotaUsage({ sales: [{ quantityKg: 1200, transactionDate: '2026-05-01' }], quotaKg: 1000, now: NOW });
    expect(vendorAttention({ ...base, quota: over })[0]).toMatchObject({ id: 'quota-exceeded', tone: 'danger' });
  });
  it('counts only recent rejected reorders', () => {
    const items = vendorAttention({ ...base, reorders: [
      { status: 'rejected', createdAt: '2026-10-01T00:00:00Z' },
      { status: 'rejected', createdAt: '2026-05-01T00:00:00Z' },
      { status: 'approved', createdAt: '2026-10-02T00:00:00Z' },
    ] });
    expect(items[0].message).toContain('1 reorder was rejected');
  });
});

describe('quotaRemainingKg', () => {
  it('is null without a quota and never negative', () => {
    expect(quotaRemainingKg(noQuota)).toBeNull();
    expect(quotaRemainingKg(quotaUsage({ sales: [{ quantityKg: 1200, transactionDate: '2026-05-01' }], quotaKg: 1000, now: NOW }))).toBe(0);
    expect(quotaRemainingKg(quotaUsage({ sales: [{ quantityKg: 300, transactionDate: '2026-05-01' }], quotaKg: 1000, now: NOW }))).toBe(700);
  });
});
