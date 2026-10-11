// The numbers shown on the role dashboards. Pure functions, so every rule can be tested.
//
// Rule for the Today / Week / Month filter: a card follows the filter only when it measures
// activity (jobs done, gas recovered, volume ordered, sales). Cards that show a current state
// (pending approvals, certificates on record) always show "right now", and say so in their note.

import { rangeMsFor, type SimpleDateRange } from '@/lib/dateRange';

export interface StatCard {
  label: string;
  value: string;
  note: string;
  /** Short explanation of how the number is counted, shown under the card. */
  definition: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function periodLabel(range: SimpleDateRange): string {
  return range === 'today' ? 'today' : range === 'week' ? 'in the last 7 days' : 'in the last 30 days';
}

function inPeriod(timestamp: string, range: SimpleDateRange, now: number): boolean {
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return false;
  return time >= now - rangeMsFor(range) && time <= now;
}

function kg(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;
}

// ---------------------------------------------------------------------------
// Technician and contractor
// ---------------------------------------------------------------------------

export function technicianCards(input: {
  jobs: Array<{ scheduledDate: string; status: string }>;
  cocRequests: Array<{ status: string; expiryDate?: string }>;
  gasLogs: Array<{ timestamp: string; actionType: string; amount: number }>;
  range: SimpleDateRange;
  now: number;
}): StatCard[] {
  const { range, now } = input;
  const jobsDone = input.jobs.filter((job) => job.status === 'completed' && inPeriod(job.scheduledDate, range, now)).length;
  const recovered = input.gasLogs
    .filter((log) => log.actionType === 'Recovery' && inPeriod(log.timestamp, range, now))
    .reduce((sum, log) => sum + (Number.isFinite(log.amount) ? log.amount : 0), 0);
  const pending = input.cocRequests.filter((coc) => coc.status === 'submitted').length;
  const approved = input.cocRequests.filter((coc) => coc.status === 'approved');
  const expiringSoon = approved.filter((coc) => {
    const expiry = coc.expiryDate ? new Date(coc.expiryDate).getTime() : Number.NaN;
    return Number.isFinite(expiry) && expiry > now && expiry <= now + 30 * DAY_MS;
  }).length;

  return [
    {
      label: 'Jobs Completed',
      value: String(jobsDone),
      note: periodLabel(range),
      definition: 'Planner jobs marked completed whose scheduled date falls in the selected period.',
    },
    {
      label: 'Pending COCs',
      value: String(pending),
      note: `${approved.length} approved so far`,
      definition: 'Certificate of Compliance requests you have submitted that are still waiting for an administrator. Not affected by the period.',
    },
    {
      label: 'Refrigerant Recovered',
      value: kg(recovered),
      note: periodLabel(range),
      definition: 'Total of your recovery entries in the refrigerant log whose time falls in the selected period.',
    },
    {
      label: 'COCs on Record',
      value: String(approved.length),
      note: expiringSoon > 0 ? `${expiringSoon} expiring within 30 days` : 'None expiring within 30 days',
      definition: 'Approved Certificates of Compliance you hold, and how many expire within 30 days. Not affected by the period.',
    },
  ];
}

// ---------------------------------------------------------------------------
// Vendor
// ---------------------------------------------------------------------------

export function currentMonthKey(now: number): string {
  return new Date(now).toISOString().slice(0, 7);
}

export function vendorCards(input: {
  reorders: Array<{ status: string; quantityKg: number; createdAt: string; reorderType?: string; nouReviewedAt?: string }>;
  complianceApps: Array<{ status: string; monthCoverage: string }>;
  ledger: Array<{ totalValueUsd: number; transactionDate: string; direction?: string }>;
  range: SimpleDateRange;
  now: number;
}): StatCard[] {
  const { range, now } = input;
  const pendingReorders = input.reorders.filter((r) => r.status === 'pending_hevacraz' || r.status === 'pending_nou').length;
  // Approved stock purchases, dated by the final approval. Returned (recovered) gas is not stock bought.
  const approvedInPeriod = input.reorders.filter(
    (r) => r.status === 'approved' && r.reorderType !== 'recovery' && inPeriod(r.nouReviewedAt ?? r.createdAt, range, now),
  );
  const approvedKg = approvedInPeriod.reduce((sum, r) => sum + r.quantityKg, 0);
  const approvedCompliance = input.complianceApps.filter((a) => a.status === 'approved').length;
  const openCompliance = input.complianceApps.filter((a) => a.status === 'submitted' || a.status === 'under-review').length;
  const ledgerInPeriod = input.ledger.filter((entry) => inPeriod(entry.transactionDate, range, now));
  const valueOf = (entry: { totalValueUsd: number }) => (Number.isFinite(entry.totalValueUsd) ? entry.totalValueUsd : 0);
  const sales = ledgerInPeriod.filter((entry) => entry.direction !== 'purchase');
  const purchases = ledgerInPeriod.filter((entry) => entry.direction === 'purchase');
  const salesTotal = sales.reduce((sum, entry) => sum + valueOf(entry), 0);
  const purchasesTotal = purchases.reduce((sum, entry) => sum + valueOf(entry), 0);
  const money = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return [
    {
      label: 'Pending Reorders',
      value: String(pendingReorders),
      note: 'Awaiting HEVACRAZ or NOU review',
      definition: 'Your reorder requests still waiting for HEVACRAZ or NOU. Not affected by the period.',
    },
    {
      label: 'Approved Volume',
      value: kg(approvedKg),
      note: `${approvedInPeriod.length} approved ${periodLabel(range)}`,
      definition: 'Stock you bought on reorders approved in the selected period. Recovery returns are not counted.',
    },
    {
      label: 'Compliance Certificates',
      value: String(approvedCompliance),
      note: openCompliance > 0 ? `${openCompliance} pending review` : 'None pending review',
      definition: 'Approved compliance applications. Pending ones are counted in the note. Not affected by the period.',
    },
    {
      label: 'Sales Value',
      value: money(salesTotal),
      note: `${sales.length} sale${sales.length === 1 ? '' : 's'} ${periodLabel(range)} · purchases ${money(purchasesTotal)}`,
      definition: 'Value of the sales in your ledger dated in the selected period. Purchases are shown in the note and are not added in.',
    },
  ];
}

/** Whether a compliance certificate has been submitted for the current month. */
export function monthlyComplianceStatus(
  complianceApps: Array<{ status: string; monthCoverage: string }>,
  now: number,
): { month: string; submitted: boolean } {
  const month = currentMonthKey(now);
  const submitted = complianceApps.some((app) => app.monthCoverage === month && app.status !== 'rejected');
  return { month, submitted };
}

// ---------------------------------------------------------------------------
// Trainer and lecturer
// ---------------------------------------------------------------------------

export function trainerCards(input: {
  courses: Array<{ status: string }>;
  submissions: Array<{ status: string }>;
  certRequests: Array<{ status: string }>;
}): StatCard[] {
  const count = (status: string) => input.courses.filter((course) => course.status === status).length;
  const approved = count('approved');
  const drafts = count('draft');
  const awaiting = count('pending_nou');
  const needsAttention = count('rejected');
  const pendingGrading = input.submissions.filter((s) => s.status === 'pending').length;
  const certsWaiting = input.certRequests.filter((r) => r.status === 'submitted-for-admin-approval').length;

  return [
    {
      label: 'Approved Courses',
      value: String(approved),
      note: `${awaiting} awaiting approval, ${drafts} draft${drafts === 1 ? '' : 's'}`,
      definition: 'Your courses an administrator has approved and learners can see. Drafts and courses awaiting approval are listed in the note.',
    },
    {
      label: 'Needs Your Attention',
      value: String(needsAttention),
      note: needsAttention > 0 ? 'Rejected or returned for correction' : 'Nothing to fix',
      definition: 'Courses an administrator rejected or sent back for correction. Edit them and resubmit.',
    },
    {
      label: 'Pending Grading',
      value: String(pendingGrading),
      note: `${input.submissions.length} submission${input.submissions.length === 1 ? '' : 's'} in total`,
      definition: 'Exam submissions on your courses that are still waiting to be graded.',
    },
    {
      label: 'Certificate Requests',
      value: String(certsWaiting),
      note: 'Awaiting administrator approval',
      definition: 'Certificate requests you submitted that an administrator has not yet approved.',
    },
  ];
}

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------

export function studentCards(input: {
  courses: Array<{ id: string; status: string }>;
  enrolledCourseIds: string[];
  submissions: Array<{ status: string; passed?: boolean | null }>;
}): StatCard[] {
  const approved = input.courses.filter((course) => course.status === 'approved');
  const enrolled = approved.filter((course) => input.enrolledCourseIds.includes(course.id)).length;
  const passed = input.submissions.filter((s) => s.status === 'graded' && s.passed === true).length;
  const awaiting = input.submissions.filter((s) => s.status === 'pending').length;

  return [
    {
      label: 'My Courses',
      value: String(enrolled),
      note: `${approved.length} available in total`,
      definition: 'Approved courses you have enrolled in, out of all approved courses.',
    },
    {
      label: 'Exams Passed',
      value: String(passed),
      note: `${input.submissions.length} submitted`,
      definition: 'Your graded exams that met the course pass mark.',
    },
    {
      label: 'Awaiting Grading',
      value: String(awaiting),
      note: awaiting > 0 ? 'Your trainer has not marked these yet' : 'Nothing waiting',
      definition: 'Exams you have submitted that are still waiting to be graded.',
    },
    {
      label: 'Available Courses',
      value: String(approved.length - enrolled),
      note: 'Open for enrolment',
      definition: 'Approved courses you have not enrolled in yet.',
    },
  ];
}

// ---------------------------------------------------------------------------
// Administrator
// ---------------------------------------------------------------------------

export interface AdminSummary {
  technicians: { total: number; active: number };
  regionsWithTechnicians: number;
  reorders: { pendingReviews: number; volumeKgInPeriod: number };
}

export function adminCards(summary: AdminSummary, range: SimpleDateRange, province: string): StatCard[] {
  const scope = province === 'all' ? 'all provinces' : province;
  return [
    {
      label: 'Active Techs',
      value: String(summary.technicians.active),
      note: scope,
      definition: 'Technicians marked active in the registry, in the selected province. Not affected by the period.',
    },
    {
      label: 'Total Technicians',
      value: String(summary.technicians.total),
      note: scope,
      definition: 'Everyone in the technician registry for the selected province, whatever their status. Not affected by the period.',
    },
    {
      label: 'Pending Reorder Reviews',
      value: String(summary.reorders.pendingReviews),
      note: 'All provinces, awaiting HEVACRAZ or NOU',
      definition: 'Supplier reorders waiting for HEVACRAZ or NOU review. This is a current total across every province and ignores both filters.',
    },
    {
      label: 'Provinces',
      value: String(summary.regionsWithTechnicians),
      note: province === 'all' ? 'With registered technicians' : 'Selected province',
      definition: 'Provinces that have at least one registered technician. Not affected by the period.',
    },
    {
      label: 'Refrigerant Reordered',
      value: kg(summary.reorders.volumeKgInPeriod),
      note: `Requested ${periodLabel(range)}, all provinces`,
      definition: 'Quantity on supplier reorders created in the selected period, whatever their status. This is what was requested, not what was used.',
    },
  ];
}

// ---------------------------------------------------------------------------
// Loading and failure
// ---------------------------------------------------------------------------

/**
 * Cards must never show a made-up zero. While data loads they show an ellipsis; if it failed they
 * show a dash and say so, so nobody mistakes "could not load" for "none".
 */
export function maskCards(cards: StatCard[], state: 'ready' | 'loading' | 'error'): StatCard[] {
  if (state === 'ready') return cards;
  return cards.map((card) => ({
    ...card,
    value: state === 'loading' ? '…' : '–',
    note: state === 'loading' ? 'Loading' : 'Could not load. Refresh to try again.',
  }));
}

/** The worst state among several data sources: any failure wins, then loading. */
export function combineStates(sources: Array<{ isLoading: boolean; error: unknown }>): 'ready' | 'loading' | 'error' {
  if (sources.some((source) => source.error)) return 'error';
  if (sources.some((source) => source.isLoading)) return 'loading';
  return 'ready';
}
