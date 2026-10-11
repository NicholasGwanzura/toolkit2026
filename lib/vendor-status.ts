// What a supplier needs to look at on their dashboard. Pure, so the rules can be tested.

import type { QuotaUsage } from '@/lib/supplier-quota';

export type VendorApplicationState = 'approved' | 'pending' | 'rejected' | 'none';

export interface VendorApplicationInfo {
  state: VendorApplicationState;
  /** The reviewer's note, shown when the application was rejected. */
  note?: string;
}

/** The supplier's current application: an approved one wins, then pending, then the newest rejection. */
export function vendorApplicationInfo(apps: Array<{ status: string; reviewNote?: string; submittedAt?: string }>): VendorApplicationInfo {
  if (apps.some((a) => a.status === 'approved')) return { state: 'approved' };
  if (apps.some((a) => a.status === 'submitted' || a.status === 'under-review')) return { state: 'pending' };
  const rejected = apps
    .filter((a) => a.status === 'rejected')
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))[0];
  return rejected ? { state: 'rejected', note: rejected.reviewNote } : { state: 'none' };
}

export interface AttentionItem {
  id: string;
  tone: 'danger' | 'warn';
  message: string;
  href: string;
  action: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function vendorAttention(input: {
  application: VendorApplicationInfo;
  quota: QuotaUsage;
  reorders: Array<{ status: string; createdAt: string; rejectedBy?: string }>;
  monthlyComplianceSubmitted: boolean;
  monthLabel: string;
  now: number;
}): AttentionItem[] {
  const items: AttentionItem[] = [];
  const { application, quota } = input;

  if (application.state === 'rejected') {
    items.push({ id: 'application-rejected', tone: 'danger', message: `Your supplier application was not approved${application.note ? `: ${application.note}` : '.'}`, href: '/suppliers', action: 'View application' });
  } else if (application.state === 'pending') {
    items.push({ id: 'application-pending', tone: 'warn', message: 'Your supplier application is waiting for review. Reorders and the ledger open once it is approved.', href: '/suppliers', action: 'View application' });
  }

  if (quota.status === 'exceeded') {
    items.push({ id: 'quota-exceeded', tone: 'danger', message: `You have sold ${Math.round(quota.salesKg).toLocaleString()} kg this year, above your ${quota.quotaKg?.toLocaleString()} kg import quota.`, href: '/suppliers', action: 'Review sales' });
  } else if (quota.status === 'near-limit') {
    items.push({ id: 'quota-near', tone: 'warn', message: `You have used ${Math.round(quota.usagePercent ?? 0)}% of your annual import quota.`, href: '/suppliers', action: 'Review sales' });
  }

  const recentRejections = input.reorders.filter((r) => r.status === 'rejected' && input.now - new Date(r.createdAt).getTime() <= 30 * DAY_MS).length;
  if (recentRejections > 0) {
    items.push({ id: 'reorders-rejected', tone: 'danger', message: `${recentRejections} reorder${recentRejections === 1 ? ' was' : 's were'} rejected in the last 30 days. Check the reason and resubmit.`, href: '/suppliers/reorder', action: 'See reorders' });
  }

  if (!input.monthlyComplianceSubmitted && application.state === 'approved') {
    items.push({ id: 'compliance-due', tone: 'warn', message: `No compliance certificate has been filed for ${input.monthLabel} yet.`, href: '/supplier-compliance', action: 'File it now' });
  }
  return items;
}

/** Remaining quota in kg, or null when no quota is set. Never negative. */
export function quotaRemainingKg(quota: QuotaUsage): number | null {
  return quota.quotaKg === null ? null : Math.max(0, quota.quotaKg - quota.salesKg);
}
