// Shared by the Reporting API and page: how a report range becomes a start date, and how counts
// per status become the approved / pending / rejected buckets shown on the cards.

export type ReportRange = 'all' | 'today' | 'week' | 'month';

const DAY_MS = 24 * 60 * 60 * 1000;

export function isReportRange(value: string | null): value is ReportRange {
  return value === 'all' || value === 'today' || value === 'week' || value === 'month';
}

/** Start of the range, or null for all time. `today` means the last 24 hours, as on the dashboards. */
export function rangeStart(range: ReportRange, now: Date = new Date()): Date | null {
  if (range === 'all') return null;
  const days = range === 'today' ? 1 : range === 'week' ? 7 : 30;
  return new Date(now.getTime() - days * DAY_MS);
}

export interface Pipeline {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

const PENDING = new Set(['submitted', 'under-review', 'draft', 'pending_nou', 'pending_hevacraz']);

/** Buckets rows of `{ status, count }`. Statuses that are none of the three still count toward the total. */
export function bucketStatuses(rows: { status: string; count: number }[]): Pipeline {
  const out: Pipeline = { total: 0, approved: 0, pending: 0, rejected: 0 };
  for (const { status, count } of rows) {
    out.total += count;
    if (status === 'approved') out.approved += count;
    else if (status === 'rejected') out.rejected += count;
    else if (PENDING.has(status)) out.pending += count;
  }
  return out;
}

export interface ReportingSummary {
  range: ReportRange;
  students: Pipeline;
  technicianApplications: Pipeline;
  /** Trainers, lecturers and contractors who applied from the Join page. */
  otherRoles: Pipeline & { byRole: Record<string, Pipeline> };
  courses: Pipeline;
  suppliers: Pipeline;
  reorders: Pipeline;
  /** Whole registry, not filtered by the range. */
  registry: { registered: number; active: number };
}
