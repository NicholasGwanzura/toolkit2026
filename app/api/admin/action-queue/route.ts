import { NextResponse } from 'next/server';
import { count, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  courses,
  occupationalAccidents,
  rewardRedemptions,
  supplierComplianceApplications,
  supplierReorders,
  trainerCertificateRequests,
  cocRequests,
} from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { loadApplicationCounts } from '@/lib/server/application-counts';
import { buildActionQueue, totalWaiting, type ActionCounts } from '@/lib/action-queue';

/** Everything currently waiting on an administrator, counted in the database. */
export async function GET(req: Request) {
  try {
    await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const n = async (query: Promise<Array<{ total: number }>>) => Number((await query)[0]?.total ?? 0);

  const [applicationCounts, coc, certApprovals, certToIssue, courseApprovals, reorders, compliance, accidents, rewards] = await Promise.all([
    loadApplicationCounts(),
    n(db.select({ total: count() }).from(cocRequests).where(eq(cocRequests.status, 'submitted'))),
    n(db.select({ total: count() }).from(trainerCertificateRequests).where(eq(trainerCertificateRequests.status, 'submitted-for-admin-approval'))),
    n(db.select({ total: count() }).from(trainerCertificateRequests).where(eq(trainerCertificateRequests.status, 'admin-approved'))),
    n(db.select({ total: count() }).from(courses).where(eq(courses.status, 'pending_nou'))),
    n(db.select({ total: count() }).from(supplierReorders).where(inArray(supplierReorders.status, ['pending_hevacraz', 'pending_nou']))),
    n(db.select({ total: count() }).from(supplierComplianceApplications).where(inArray(supplierComplianceApplications.status, ['submitted', 'under-review']))),
    n(db.select({ total: count() }).from(occupationalAccidents).where(inArray(occupationalAccidents.status, ['Open', 'Under Investigation']))),
    n(db.select({ total: count() }).from(rewardRedemptions).where(eq(rewardRedemptions.status, 'requested'))),
  ]);

  const counts: ActionCounts = {
    applications: applicationCounts.total.awaitingReview,
    applicationsAwaitingEmail: applicationCounts.total.awaitingEmail,
    cocRequests: coc,
    certificateApprovals: certApprovals,
    certificatesToIssue: certToIssue,
    courseApprovals,
    reorderReviews: reorders,
    supplierCompliance: compliance,
    openAccidents: accidents,
    rewardRequests: rewards,
  };
  const items = buildActionQueue(counts);
  return NextResponse.json({ items, total: totalWaiting(items) });
}
