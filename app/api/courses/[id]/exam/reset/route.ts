import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { courseEnrollments, courses } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { recordAuditEvent } from '@/lib/server/audit';
import { notifyUser } from '@/lib/server/notifications';
import { notificationTemplates } from '@/lib/notification-templates';

/** Gives a learner a fresh set of exam attempts. Their earlier results stay on record. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['trainer', 'lecturer', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { studentId?: unknown } | null;
  if (typeof body?.studentId !== 'string') return NextResponse.json({ error: 'Choose the learner to reset.' }, { status: 400 });

  const [course] = await db.select({ title: courses.title, lecturerId: courses.lecturerId }).from(courses).where(eq(courses.id, id)).limit(1);
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (session.role !== 'org_admin' && course.lecturerId !== session.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [enrollment] = await db
    .update(courseEnrollments)
    .set({ examAttemptsResetAt: new Date() })
    .where(and(eq(courseEnrollments.courseId, id), eq(courseEnrollments.userId, body.studentId)))
    .returning({ id: courseEnrollments.id });
  if (!enrollment) return NextResponse.json({ error: 'This learner is not enrolled in the course.' }, { status: 404 });

  await recordAuditEvent({
    entityType: 'course_enrollment',
    entityId: enrollment.id,
    action: 'exam_attempts_reset',
    previousStatus: 'attempts used',
    newStatus: 'attempts reset',
    performedBy: session.name,
    performedByRole: session.role,
  }).catch(() => {});
  await notifyUser(body.studentId, notificationTemplates.examAttemptsReset(course.title));
  return NextResponse.json({ ok: true });
}
