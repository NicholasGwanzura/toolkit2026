import { NextResponse } from 'next/server';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { courseEnrollments, examSubmissions, courses } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import type { ExamSubmission } from '@/lib/platformStore';
import { isFieldWorkerRole } from '@/lib/field-worker';

function toExamSubmission(row: typeof examSubmissions.$inferSelect): ExamSubmission {
  return {
    id: row.id,
    courseId: row.courseId,
    courseTitle: row.courseTitle,
    studentId: row.studentId,
    studentName: row.studentName,
    answers: row.answers as ExamSubmission['answers'],
    score: row.score !== null ? Number(row.score) : undefined,
    passed: row.passed ?? undefined,
    feedback: row.feedback ?? undefined,
    status: row.status as ExamSubmission['status'],
    submittedAt: row.submittedAt.toISOString(),
    gradedAt: row.gradedAt?.toISOString() ?? undefined,
  };
}

/** Adds when each learner's attempts were last reset, so staff can see who has really run out. */
async function withAttemptResets(rows: Array<typeof examSubmissions.$inferSelect>): Promise<ExamSubmission[]> {
  const courseIds = [...new Set(rows.map((row) => row.courseId))];
  const resets = courseIds.length === 0 ? [] : await db
    .select({ courseId: courseEnrollments.courseId, userId: courseEnrollments.userId, resetAt: courseEnrollments.examAttemptsResetAt })
    .from(courseEnrollments)
    .where(and(inArray(courseEnrollments.courseId, courseIds), isNotNull(courseEnrollments.examAttemptsResetAt)));
  const byLearner = new Map(resets.map((reset) => [`${reset.courseId}:${reset.userId}`, reset.resetAt]));
  return rows.map((row) => ({ ...toExamSubmission(row), attemptsResetAt: byLearner.get(`${row.courseId}:${row.studentId}`)?.toISOString() }));
}

export async function GET(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'student', 'trainer', 'lecturer', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  if (isFieldWorkerRole(session.role) || session.role === 'student') {
    const rows = await db
      .select()
      .from(examSubmissions)
      .where(eq(examSubmissions.studentId, session.id));
    return NextResponse.json(rows.map(toExamSubmission));
  }

  if (session.role === 'trainer' || session.role === 'lecturer') {
    const ownCourses = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.lecturerId, session.id));
    const courseIds = ownCourses.map(c => c.id);
    if (courseIds.length === 0) return NextResponse.json([]);
    const rows = await db
      .select()
      .from(examSubmissions)
      .where(inArray(examSubmissions.courseId, courseIds));
    return NextResponse.json(await withAttemptResets(rows));
  }

  const rows = await db.select().from(examSubmissions);
  return NextResponse.json(await withAttemptResets(rows));
}

// Exams are taken from the course page (POST /api/courses/[id]/exam), where the questions come from the course
// and are marked on the server. This older route accepted whatever answers the browser sent for any course id.
export async function POST() {
  return NextResponse.json({ error: 'Exams are now taken from the course page. Open the course in the Learning Hub and choose Take the exam.' }, { status: 410 });
}
