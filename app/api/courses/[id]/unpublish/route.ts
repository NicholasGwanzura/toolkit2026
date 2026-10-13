import { notifyUser } from '@/lib/server/notifications';
import { notificationTemplates } from '@/lib/notification-templates';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { courses } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { recordAuditEvent } from '@/lib/server/audit';
import { toManagedCourse } from '../../course-validation';

/**
 * Takes an approved course back out of the catalogue so its owner can correct it and resubmit.
 * It reuses the existing "rejected" state: the course becomes editable again, learners stop
 * seeing it, and the reason is shown to the owner. Existing exam submissions are kept.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { reason?: string };
  const reason = body.reason?.trim();
  if (!reason) return NextResponse.json({ error: 'A reason is required to return a course for correction.' }, { status: 400 });
  if (reason.length > 1000) return NextResponse.json({ error: 'Reason must be 1000 characters or fewer.' }, { status: 400 });

  const [row] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.status !== 'approved') {
    return NextResponse.json({ error: 'Only approved courses can be returned for correction.' }, { status: 409 });
  }

  const [updated] = await db
    .update(courses)
    .set({ status: 'rejected', rejectionReason: `Returned for correction: ${reason}`, updatedAt: new Date() })
    .where(eq(courses.id, id))
    .returning();

  await recordAuditEvent({
    entityType: 'course',
    entityId: id,
    action: 'course_returned_for_correction',
    previousStatus: 'approved',
    newStatus: 'rejected',
    performedBy: session.name,
    performedByRole: session.role,
    notes: reason,
  });

  await notifyUser(updated.lecturerId, notificationTemplates.courseDecision('returned', updated.title, reason));
  return NextResponse.json(toManagedCourse(updated, true));
}
