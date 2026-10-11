import { recordAuditEventSafe } from '@/lib/server/audit';
import { notifyUser } from '@/lib/server/notifications';
import { notificationTemplates } from '@/lib/notification-templates';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { courses } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { toManagedCourse, validateCourseBasics, validateCourseModules } from '../../course-validation';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const [row] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.status !== 'pending_nou') {
    return NextResponse.json({ error: 'Only courses pending NOU approval can be approved.' }, { status: 409 });
  }
  const basics = validateCourseBasics(row);
  if (basics.error) return NextResponse.json({ error: basics.error }, { status: 400 });
  const modulesResult = validateCourseModules(row.modules, id);
  if (modulesResult.error) return NextResponse.json({ error: modulesResult.error }, { status: 400 });

  const [updated] = await db
    .update(courses)
    .set({ status: 'approved', rejectionReason: null, modules: modulesResult.modules!, updatedAt: new Date() })
    .where(eq(courses.id, id))
    .returning();

  await notifyUser(updated.lecturerId, notificationTemplates.courseDecision('approved', updated.title));
  await recordAuditEventSafe({
    entityType: 'course',
    entityId: updated.id,
    action: 'approved',
    previousStatus: row.status,
    newStatus: 'approved',
    performedBy: session.name,
    performedByRole: session.role,
  });
  return NextResponse.json(toManagedCourse(updated));
}
