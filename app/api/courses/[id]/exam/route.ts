import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { courseEnrollments, courses, examSubmissions } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { recordAuditEvent } from '@/lib/server/audit';
import { notifyUser } from '@/lib/server/notifications';
import { notificationTemplates } from '@/lib/notification-templates';
import { MAX_EXAM_ATTEMPTS } from '@/lib/server/lms-validation';
import { checkSubmittedAnswers, markExam, toLearnerQuestions, type ExamQuestion } from '@/lib/exam';

// The exam a learner takes from a course page. Questions come from the course the trainer wrote.
// The answer key never leaves this file: learners get the questions only, and are marked here.

const LEARNER_ROLES = ['student', 'technician', 'contractor'];

async function loadContext(courseId: string, userId: string) {
  const [course] = await db
    .select({ id: courses.id, title: courses.title, status: courses.status, passMark: courses.passMark, examQuestions: courses.examQuestions })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);
  if (!course || course.status !== 'approved') return { error: NextResponse.json({ error: 'This course is not available.' }, { status: 404 }) } as const;

  const [enrollment] = await db
    .select({ id: courseEnrollments.id })
    .from(courseEnrollments)
    .where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.userId, userId)))
    .limit(1);
  if (!enrollment) return { error: NextResponse.json({ error: 'Start the course before taking its exam.' }, { status: 403 }) } as const;

  const attempts = await db
    .select({ status: examSubmissions.status, passed: examSubmissions.passed, score: examSubmissions.score, feedback: examSubmissions.feedback, submittedAt: examSubmissions.submittedAt })
    .from(examSubmissions)
    .where(and(eq(examSubmissions.courseId, courseId), eq(examSubmissions.studentId, userId)));

  const graded = attempts.filter((attempt) => attempt.status === 'graded');
  const passed = graded.some((attempt) => attempt.passed === true);
  const waiting = attempts.some((attempt) => attempt.status === 'pending');
  const last = [...attempts].sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())[0];
  return {
    course,
    questions: (course.examQuestions ?? []) as ExamQuestion[],
    gradedCount: graded.length,
    passed,
    waiting,
    last: last ? { status: last.status, score: last.score !== null ? Number(last.score) : undefined, passed: last.passed ?? undefined, feedback: last.feedback ?? undefined } : undefined,
  } as const;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, LEARNER_ROLES);
  } catch (e) {
    return e as Response;
  }
  const { id } = await params;
  const context = await loadContext(id, session.id);
  if ('error' in context) return context.error;

  const attemptsLeft = Math.max(0, MAX_EXAM_ATTEMPTS - context.gradedCount);
  const canAttempt = context.questions.length > 0 && !context.passed && !context.waiting && attemptsLeft > 0;
  return NextResponse.json({
    courseId: context.course.id,
    courseTitle: context.course.title,
    passMark: context.course.passMark,
    hasExam: context.questions.length > 0,
    maxAttempts: MAX_EXAM_ATTEMPTS,
    attemptsLeft,
    passed: context.passed,
    waitingForGrading: context.waiting,
    last: context.last,
    canAttempt,
    // Questions are only handed out when an attempt can be made.
    questions: canAttempt ? toLearnerQuestions(context.questions) : [],
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, LEARNER_ROLES);
  } catch (e) {
    return e as Response;
  }
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { answers?: unknown } | null;

  const outcome = await db.transaction(async (tx) => {
    // One attempt at a time per learner and course, so two quick submissions cannot both pass the attempt check.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${session.id}:${id}`}))`);

    const context = await loadContext(id, session.id);
    if ('error' in context) return { response: context.error } as const;
    if (context.questions.length === 0) return { response: NextResponse.json({ error: 'This course has no exam yet.' }, { status: 409 }) } as const;
    if (context.passed) return { response: NextResponse.json({ error: 'You have already passed this course exam.' }, { status: 409 }) } as const;
    if (context.waiting) return { response: NextResponse.json({ error: 'You already have a submission waiting to be graded.' }, { status: 409 }) } as const;
    if (context.gradedCount >= MAX_EXAM_ATTEMPTS) {
      return { response: NextResponse.json({ error: `You have used all ${MAX_EXAM_ATTEMPTS} attempts. Ask your trainer or HEVACRAZ to reset the exam.` }, { status: 409 }) } as const;
    }

    const checked = checkSubmittedAnswers(context.questions, body?.answers);
    if (!checked.ok) return { response: NextResponse.json({ error: checked.error }, { status: 400 }) } as const;
    const result = markExam(context.questions, checked.answers);

    const now = new Date();
    const autoGraded = !result.needsTrainer;
    const passed = autoGraded ? result.score >= context.course.passMark : undefined;
    const [inserted] = await tx
      .insert(examSubmissions)
      .values({
        courseId: context.course.id,
        courseTitle: context.course.title,
        studentId: session.id,
        studentName: session.name,
        answers: result.answers,
        status: autoGraded ? 'graded' : 'pending',
        submittedAt: now,
        ...(autoGraded ? { score: String(result.score), passed, feedback: 'Marked automatically.', gradedAt: now } : {}),
      })
      .returning();
    return { inserted, result, passed, autoGraded, course: context.course } as const;
  });

  if ('response' in outcome) return outcome.response;
  const { inserted, result, passed, autoGraded, course } = outcome;

  if (autoGraded) {
    await recordAuditEvent({
      entityType: 'exam_submission',
      entityId: inserted.id,
      action: 'exam_auto_graded',
      previousStatus: 'submitted',
      newStatus: `${passed ? 'passed' : 'failed'} (${result.score})`,
      performedBy: 'Automatic marking',
      performedByRole: 'system',
    }).catch(() => {});
    await notifyUser(session.id, notificationTemplates.examGraded(course.title, passed === true, result.score));
  }

  // The result is the score and pass or fail only. Which answers were wrong is not revealed, so the key cannot be learned over attempts.
  return NextResponse.json({
    submissionId: inserted.id,
    status: autoGraded ? 'graded' : 'pending',
    score: autoGraded ? result.score : undefined,
    passed,
    passMark: course.passMark,
    needsTrainer: result.needsTrainer,
  }, { status: 201 });
}
