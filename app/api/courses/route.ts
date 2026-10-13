import { NextResponse } from 'next/server';
import { MAX_LIST_ROWS } from '@/lib/server/list-limits';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { courses } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import type { ManagedCourse } from '@/lib/platformStore';
import { toManagedCourse, validateCourseBasics, validateCourseModules } from './course-validation';
import { isFieldWorkerRole } from '@/lib/field-worker';

export async function GET(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['lecturer', 'trainer', 'org_admin', 'student', 'technician', 'contractor']);
  } catch (e) {
    return e as Response;
  }

  let rows: (typeof courses.$inferSelect)[];

  if (session.role === 'lecturer' || session.role === 'trainer') {
    rows = await db.select().from(courses).where(eq(courses.lecturerId, session.id));
  } else if (session.role === 'student' || isFieldWorkerRole(session.role)) {
    rows = await db.select().from(courses).where(eq(courses.status, 'approved'));
  } else {
    rows = await db.select().from(courses).limit(MAX_LIST_ROWS);
  }

  // Only authors and administrators may see the answer key.
  const seesAnswers = session.role === 'lecturer' || session.role === 'trainer' || session.role === 'org_admin';
  return NextResponse.json(rows.map((row) => toManagedCourse(row, seesAnswers)));
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['lecturer', 'trainer', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const body = await req.json().catch(() => ({})) as Omit<ManagedCourse, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'passMark' | 'cpdCredits'> & { passMark?: number; cpdCredits?: number };
  const basics = validateCourseBasics(body);
  if (basics.error) return NextResponse.json({ error: basics.error }, { status: 400 });
  const modulesResult = validateCourseModules(body.modules);
  if (modulesResult.error) return NextResponse.json({ error: modulesResult.error }, { status: 400 });

  const now = new Date();

  const [inserted] = await db
    .insert(courses)
    .values({
      lecturerId: session.id,
      lecturerName: session.name,
      title: basics.title!,
      description: basics.description!,
      modules: modulesResult.modules!,
      ...(basics.passMark !== undefined ? { passMark: basics.passMark } : {}),
      ...(basics.cpdCredits !== undefined ? { cpdCredits: basics.cpdCredits } : {}),
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json(toManagedCourse(inserted, true), { status: 201 });
}
