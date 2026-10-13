import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { courses } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { describeAttachmentProblems, findAttachmentProblems } from '@/lib/server/course-materials';
import { toManagedCourse, validateCourseBasics, validateCourseModules } from '../../course-validation';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['lecturer', 'trainer', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const [row] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (session.role !== 'org_admin' && row.lecturerId !== session.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (row.status !== 'draft' && row.status !== 'rejected') {
    return NextResponse.json({ error: 'Can only submit draft or rejected courses.' }, { status: 409 });
  }
  const basics = validateCourseBasics(row);
  if (basics.error) return NextResponse.json({ error: basics.error }, { status: 400 });
  const modulesResult = validateCourseModules(row.modules, id);
  if (modulesResult.error) return NextResponse.json({ error: modulesResult.error }, { status: 400 });

  if (!Array.isArray(row.examQuestions) || row.examQuestions.length === 0) {
    return NextResponse.json({ error: 'Add at least one exam question before submitting. Learners cannot pass a course without an exam.' }, { status: 400 });
  }

  let problemMessage: string | null;
  try {
    problemMessage = describeAttachmentProblems(await findAttachmentProblems(modulesResult.modules!));
  } catch (err) {
    console.error('Failed to verify course materials in storage:', err);
    return NextResponse.json({ error: 'Could not verify the uploaded files. Please try again.' }, { status: 502 });
  }
  if (problemMessage) return NextResponse.json({ error: problemMessage }, { status: 409 });

  const [updated] = await db
    .update(courses)
    .set({ status: 'pending_nou', rejectionReason: null, modules: modulesResult.modules!, updatedAt: new Date() })
    .where(eq(courses.id, id))
    .returning();

  return NextResponse.json(toManagedCourse(updated, true));
}
