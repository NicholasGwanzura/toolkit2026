'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Award, BadgeCheck, CheckCircle2, Circle, GraduationCap, ShieldCheck, X } from 'lucide-react';
import type { MyStanding } from '@/lib/api';
import { describeRenewal, renewalState, summariseCertifications, type ChecklistItem, type RenewalState } from '@/lib/membership-status';
import { examState, progressPercent } from '@/lib/course-progress';
import type { ReadyForCertificate } from '@/lib/course-stats';
import type { AttentionItem } from '@/lib/vendor-status';
import type { QuotaUsage } from '@/lib/supplier-quota';
import { quotaRemainingKg } from '@/lib/vendor-status';

const CARD = 'rounded-lg overflow-hidden bg-white border border-[#E7E5E4]';
const STATE_STYLE: Record<RenewalState, string> = {
  expired: 'bg-red-50 text-red-700 border-red-200',
  'due-soon': 'bg-amber-50 text-amber-800 border-amber-200',
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  unknown: 'bg-gray-50 text-gray-600 border-gray-200',
};

function Header({ title, subtitle, action }: { title: string; subtitle?: string; action?: { href: string; label: string } }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5E4]">
      <div>
        <h2 className="text-base font-semibold text-[#1C1917]">{title}</h2>
        {subtitle && <p className="text-xs text-[#78716C] mt-0.5">{subtitle}</p>}
      </div>
      {action && (
        <Link href={action.href} className="inline-flex items-center gap-1 text-xs font-semibold text-[#D97706] hover:text-[#b45309]">
          {action.label} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/** A technician's registration, membership and certificates, with renewal warnings. */
export function StandingPanel({ standing, now }: { standing: MyStanding | undefined; now: number }) {
  if (!standing) return <div className="h-40 animate-pulse rounded-lg border border-[#E7E5E4] bg-[#FAFAF9]" aria-label="Loading your standing" />;
  const { technician, membership } = standing;

  if (!technician && !membership) {
    return (
      <section className={CARD} aria-label="Registration and membership">
        <Header title="Registration and membership" />
        <p className="px-6 py-5 text-sm text-[#78716C]">
          We could not find a technician registry record linked to your email. If you expect one, contact HEVACRAZ at info@hevacraz.co.zw.
        </p>
      </section>
    );
  }

  const certSummary = summariseCertifications(technician?.certifications ?? [], now);
  const rows: Array<{ label: string; value: string; detail: string; state: RenewalState }> = [];
  if (technician) {
    rows.push({ label: `Registry ${technician.registrationNumber}`, value: technician.status, detail: describeRenewal(technician.expiryDate, now), state: renewalState(technician.expiryDate, now) });
  }
  if (membership) {
    rows.push({ label: `Membership ${membership.membershipNumber}`, value: membership.status, detail: describeRenewal(membership.expiryDate, now), state: membership.status === 'expired' ? 'expired' : renewalState(membership.expiryDate, now) });
  }
  const needsRenewal = rows.some((row) => row.state === 'expired' || row.state === 'due-soon');

  return (
    <section className={CARD} aria-label="Registration and membership">
      <Header title="Registration and membership" subtitle="Your registry record, membership and certificates" />
      <div className="divide-y divide-[#E7E5E4]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1C1917] truncate">{row.label}</p>
              <p className="text-xs text-[#78716C] mt-0.5 capitalize">{row.value}</p>
            </div>
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATE_STYLE[row.state]}`}>{row.detail}</span>
          </div>
        ))}
        {technician && (
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <p className="text-sm font-semibold text-[#1C1917]">Your certificates</p>
            <p className="text-xs text-[#44403C]">
              <span className="font-semibold text-emerald-700">{certSummary.valid} valid</span>
              {certSummary.expiringSoon > 0 && <span className="ml-2 font-semibold text-amber-700">{certSummary.expiringSoon} expiring within 90 days</span>}
              {certSummary.expired > 0 && <span className="ml-2 font-semibold text-red-700">{certSummary.expired} expired</span>}
            </p>
          </div>
        )}
      </div>
      {needsRenewal && (
        <p className="border-t border-amber-200 bg-amber-50 px-6 py-3 text-xs text-amber-900">
          Something is due for renewal. Email{' '}
          <a href="mailto:info@hevacraz.co.zw?subject=Renewal" className="font-semibold underline">info@hevacraz.co.zw</a>{' '}
          with your registry number to renew.
        </p>
      )}
    </section>
  );
}

/** First steps for someone new. Dismissible, and hidden once every step is done. */
export function GettingStartedChecklist({ items, storageKey }: { items: ChecklistItem[]; storageKey: string }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  });
  const remaining = items.filter((item) => !item.done).length;
  if (dismissed || remaining === 0) return null;

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, '1');
    } catch {
      // The checklist simply comes back next visit; nothing is lost.
    }
  }

  return (
    <section className="rounded-lg border border-blue-200 bg-blue-50 p-5" aria-label="Getting started">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-blue-950">Getting started</h2>
          <p className="text-xs text-blue-900 mt-0.5">{remaining} step{remaining === 1 ? '' : 's'} left to make the most of the registry</p>
        </div>
        <button type="button" onClick={dismiss} aria-label="Hide getting started" className="text-blue-700 hover:text-blue-900">
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.key}>
            <Link href={item.href} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-[#1C1917] border border-blue-100 hover:border-blue-300">
              {item.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-gray-400" />}
              <span className={item.done ? 'line-through text-[#A8A29E]' : ''}>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ContractorOnboardingBanner() {
  return (
    <Link href="/contractor-onboarding" className="flex flex-col gap-1 rounded-lg border border-amber-300 bg-amber-50 p-4 transition hover:bg-amber-100 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-semibold text-amber-900 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Finish setting up your business profile</span>
      <span className="text-xs text-amber-800">It takes two minutes. Complete onboarding <ArrowRight className="ml-1 inline h-3 w-3" /></span>
    </Link>
  );
}

/** Learners who passed an exam and are waiting for a certificate request. */
export function ReadyForCertificatePanel({ items }: { items: ReadyForCertificate[] | undefined }) {
  return (
    <section className={CARD} aria-label="Ready for a certificate">
      <Header title="Ready for a certificate" subtitle="Passed an exam, no certificate request yet" action={{ href: '/certifications', label: 'Open certificates' }} />
      {!items ? (
        <div className="px-6 py-6 text-sm text-[#78716C]">Loading…</div>
      ) : items.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <Award className="h-8 w-8 text-[#D1C5C0] mx-auto mb-2" />
          <p className="text-sm text-[#78716C]">No one is waiting. Learners who pass an exam on your courses appear here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#E7E5E4]">
          {items.map((item) => (
            <li key={item.submissionId} className="flex items-center justify-between gap-4 px-6 py-3">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#1C1917] truncate">{item.studentName}</span>
                <span className="block text-xs text-[#78716C] truncate">{item.courseTitle}</span>
              </span>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{item.score}%</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export interface LearnerCourse {
  id: string;
  title: string;
  moduleCount: number;
  completedModules: number;
  enrolled: boolean;
  submissions: Array<{ status: string; passed?: boolean | null }>;
}

const EXAM_LABEL = { 'not-taken': 'Exam not taken', 'awaiting-grading': 'Awaiting grading', passed: 'Exam passed', failed: 'Exam not passed' } as const;
const EXAM_STYLE = {
  'not-taken': 'bg-gray-50 text-gray-600 border-gray-200',
  'awaiting-grading': 'bg-amber-50 text-amber-800 border-amber-200',
  passed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
} as const;

/** A learner's enrolled courses, with progress and exam result. */
export function MyCoursesPanel({ courses, loading }: { courses: LearnerCourse[]; loading: boolean }) {
  const enrolled = courses.filter((course) => course.enrolled);
  return (
    <section className={CARD} aria-label="My courses">
      <Header title="My courses" subtitle="Progress and exam results" action={{ href: '/learn', label: 'Open Learning Hub' }} />
      {loading ? (
        <div className="px-6 py-6 text-sm text-[#78716C]">Loading…</div>
      ) : enrolled.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <GraduationCap className="h-8 w-8 text-[#D1C5C0] mx-auto mb-2" />
          <p className="text-sm text-[#78716C]">You have not started a course yet.</p>
          <Link href="/learn" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#D97706]">
            Browse courses <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-[#E7E5E4]">
          {enrolled.map((course) => {
            const percent = progressPercent(course.completedModules, course.moduleCount);
            const exam = examState(course.submissions);
            return (
              <li key={course.id} className="px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#1C1917] truncate">{course.title}</p>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${EXAM_STYLE[exam.state]}`}>
                    {EXAM_LABEL[exam.state]}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${course.title} progress`}>
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="text-xs text-[#78716C] tabular-nums">{course.completedModules}/{course.moduleCount} modules</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Reminds a supplier to file this month's compliance certificate. */
export function MonthlyCompliancePrompt({ month, submitted }: { month: string; submitted: boolean }) {
  return submitted ? (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
      <BadgeCheck className="h-4 w-4" /> Your compliance certificate for {month} has been submitted.
    </div>
  ) : (
    <Link href="/supplier-compliance" className="flex flex-col gap-1 rounded-lg border border-amber-300 bg-amber-50 p-4 transition hover:bg-amber-100 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-semibold text-amber-900 flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> No compliance certificate filed for {month} yet</span>
      <span className="text-xs text-amber-800">Submit it now <ArrowRight className="ml-1 inline h-3 w-3" /></span>
    </Link>
  );
}

/** A supplier's latest buyer verifications. */
export function RecentBuyerChecksPanel({ checks }: { checks: Array<{ id: string; query: string; result: string; createdAt: string }> | undefined }) {
  return (
    <section className={CARD} aria-label="Recent buyer checks">
      <Header title="Recent buyer checks" subtitle="Technician verifications you ran" action={{ href: '/suppliers/verify-buyer', label: 'Verify a buyer' }} />
      {!checks ? (
        <div className="px-6 py-6 text-sm text-[#78716C]">Loading…</div>
      ) : checks.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-[#78716C]">You have not verified a buyer yet. Check a technician is registered before each sale.</p>
      ) : (
        <ul className="divide-y divide-[#E7E5E4]">
          {checks.map((check) => (
            <li key={check.id} className="flex items-center justify-between gap-4 px-6 py-3">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#1C1917] truncate">{check.query}</span>
                <span className="block text-xs text-[#78716C]">{new Date(check.createdAt).toLocaleDateString('en-ZW')}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold capitalize text-[#44403C]">{check.result.replace(/[-_]/g, ' ')}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** What a supplier needs to act on now. Renders nothing when there is nothing to do. */
export function VendorAttentionPanel({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Needs your attention" className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`flex flex-col gap-1 rounded-lg border p-4 transition sm:flex-row sm:items-center sm:justify-between ${
            item.tone === 'danger' ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'border-amber-300 bg-amber-50 hover:bg-amber-100'
          }`}
        >
          <span className={`flex items-start gap-2 text-sm font-semibold ${item.tone === 'danger' ? 'text-red-900' : 'text-amber-900'}`}>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {item.message}
          </span>
          <span className={`shrink-0 text-xs font-semibold ${item.tone === 'danger' ? 'text-red-800' : 'text-amber-800'}`}>{item.action} <ArrowRight className="ml-1 inline h-3 w-3" /></span>
        </Link>
      ))}
    </section>
  );
}

const QUOTA_BAR: Record<QuotaUsage['status'], string> = {
  'no-quota': 'bg-gray-300',
  'within-quota': 'bg-emerald-500',
  'near-limit': 'bg-amber-500',
  exceeded: 'bg-red-500',
};

/** The supplier's own annual import quota and how much of it this year's sales have used. */
export function VendorQuotaPanel({ quota }: { quota: QuotaUsage }) {
  const remaining = quotaRemainingKg(quota);
  const percent = Math.min(100, Math.round(quota.usagePercent ?? 0));
  return (
    <section className={CARD} aria-label="Annual import quota">
      <Header title="Annual import quota" subtitle="Sales this calendar year against the quota set for your company" />
      <div className="space-y-3 px-6 py-5">
        {quota.quotaKg === null ? (
          <p className="text-sm text-[#78716C]">No quota has been set for your company yet. {Math.round(quota.salesKg).toLocaleString()} kg sold so far this year. Contact HEVACRAZ to have one set.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-[#1C1917]">{Math.round(quota.salesKg).toLocaleString()} of {quota.quotaKg.toLocaleString()} kg sold</p>
              <p className="text-xs text-[#78716C]">{remaining !== null && remaining > 0 ? `${Math.round(remaining).toLocaleString()} kg left this year` : 'Quota used up'}</p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#F5F5F4]" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Quota used">
              <div className={`h-full ${QUOTA_BAR[quota.status]}`} style={{ width: `${percent}%` }} />
            </div>
            <p className="text-xs text-[#78716C]">
              {quota.status === 'exceeded' ? 'You are over your quota.' : quota.status === 'near-limit' ? 'Close to your quota. Check before the next sale.' : `${percent}% used.`}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

const REORDER_STAGE: Record<string, { label: string; style: string }> = {
  pending_hevacraz: { label: 'With HEVACRAZ', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending_nou: { label: 'With NOU', style: 'bg-blue-50 text-blue-700 border-blue-200' },
  approved: { label: 'Approved', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', style: 'bg-red-50 text-red-700 border-red-200' },
};

export interface ReorderRow {
  id: string;
  gasType: string;
  quantityKg: number;
  purpose: string;
  reorderType?: string;
  status: string;
  rejectionReason?: string;
  rejectedBy?: string;
  createdAt: string;
}

/** A supplier's latest reorders, with the stage each one has reached and why any were rejected. */
export function VendorReordersPanel({ reorders }: { reorders: ReorderRow[] }) {
  return (
    <section className={CARD} aria-label="Recent reorders">
      <Header title="Recent Reorders" subtitle="Your submitted gas reorder requests" action={{ href: '/suppliers/reorder', label: 'View all' }} />
      {reorders.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm text-[#78716C]">No reorders submitted yet.</p>
          <Link href="/suppliers/reorder" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#D97706] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#b45309]">
            Submit a Reorder <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-[#E7E5E4]">
          {reorders.slice(0, 5).map((reorder) => {
            const stage = REORDER_STAGE[reorder.status] ?? { label: reorder.status.replace(/_/g, ' '), style: 'bg-gray-50 text-gray-600 border-gray-200' };
            return (
              <li key={reorder.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#1C1917]">{reorder.gasType} · {reorder.quantityKg.toLocaleString()} kg</p>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${stage.style}`}>{stage.label}</span>
                      {reorder.reorderType === 'recovery' && <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">Recovery return</span>}
                    </div>
                    <p className="mt-1 text-xs text-[#78716C]">{reorder.purpose}</p>
                  </div>
                  <span className="shrink-0 text-xs text-[#78716C]">{new Date(reorder.createdAt).toLocaleDateString('en-ZW')}</span>
                </div>
                {reorder.status === 'rejected' && (
                  <p className="mt-2 text-xs text-red-700">
                    Rejected{reorder.rejectedBy ? ` by ${reorder.rejectedBy === 'nou' ? 'NOU' : 'HEVACRAZ'}` : ''}{reorder.rejectionReason ? `: ${reorder.rejectionReason}` : '.'}{' '}
                    <Link href="/suppliers/reorder" className="font-semibold underline">Submit a corrected reorder</Link>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const COMPLIANCE_STYLE: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  submitted: 'bg-amber-50 text-amber-700 border-amber-200',
  'under-review': 'bg-amber-50 text-amber-700 border-amber-200',
  draft: 'bg-gray-50 text-gray-600 border-gray-200',
};

export interface ComplianceRow {
  id: string;
  certificateType: string;
  monthCoverage: string;
  sitesCovered: number;
  status: string;
  notes?: string;
}

/** A supplier's latest compliance applications, colour-coded, with the reviewer's note when one was rejected. */
export function VendorCompliancePanel({ apps }: { apps: ComplianceRow[] }) {
  return (
    <section className={CARD} aria-label="Compliance certificates">
      <Header title="Compliance Certificates" subtitle="Distribution compliance and NOU reporting status" action={{ href: '/supplier-compliance', label: 'Manage' }} />
      {apps.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm text-[#78716C]">No compliance applications submitted yet.</p>
          <Link href="/supplier-compliance" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#D97706]">
            Apply for a compliance certificate <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-[#E7E5E4]">
          {apps.slice(0, 5).map((app) => (
            <li key={app.id} className="px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold capitalize text-[#1C1917]">{app.certificateType.replace(/-/g, ' ')}</p>
                  <p className="mt-0.5 text-xs text-[#78716C]">{app.monthCoverage} · {app.sitesCovered} site{Number(app.sitesCovered) === 1 ? '' : 's'}</p>
                </div>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${COMPLIANCE_STYLE[app.status] ?? COMPLIANCE_STYLE.draft}`}>{app.status.replace('-', ' ')}</span>
              </div>
              {app.status === 'rejected' && app.notes && <p className="mt-2 text-xs text-red-700">Reviewer note: {app.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
