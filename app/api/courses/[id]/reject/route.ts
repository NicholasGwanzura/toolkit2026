import { recordAuditEventSafe } from '@/lib/server/audit';
import { notifyUser } from '@/lib/server/notifications';
import { notificationTemplates } from '@/lib/notification-templates';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { courses } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { toManagedCourse } from '../../course-validation';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const body = await req.json() as { reason?: string };
  const [row] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.status !== 'pending_nou') {
    return NextResponse.json({ error: 'Only courses pending NOU approval can be rejected.' }, { status: 409 });
  }
  if (!body.reason?.trim()) {
    return NextResponse.json({ error: 'A rejection reason is required.' }, { status: 400 });
  }

  const [updated] = await db
    .update(courses)
    .set({ status: 'rejected', rejectionReason: body.reason.trim(), updatedAt: new Date() })
    .where(eq(courses.id, id))
    .returning();

  await notifyUser(updated.lecturerId, notificationTemplates.courseDecision('rejected', updated.title, updated.rejectionReason ?? undefined));
  await recordAuditEventSafe({
    entityType: 'course',
    entityId: updated.id,
    action: 'rejected',
    previousStatus: row.status,
    newStatus: 'rejected',
    performedBy: session.name,
    performedByRole: session.role,
    notes: body.reason?.trim(),
  });
  return NextResponse.json(toManagedCourse(updated));
}
