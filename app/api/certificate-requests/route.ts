import { NextResponse } from 'next/server';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { trainerCertificateRequests, technicians, examSubmissions, courses, users } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { recordAuditEvent } from '@/lib/server/audit';
import { validateCertificateRequest } from '@/lib/server/lms-validation';
import { toTrainerCertificateRequest } from '@/lib/server/request-serializers';
import { isFieldWorkerRole } from '@/lib/field-worker';

export async function GET(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['trainer', 'lecturer', 'org_admin', 'technician', 'contractor', 'student']);
  } catch (e) {
    return e as Response;
  }

  let rows;
  if (session.role === 'org_admin') {
    rows = await db.select().from(trainerCertificateRequests).orderBy(desc(trainerCertificateRequests.submittedAt));
  } else if (isFieldWorkerRole(session.role) || session.role === 'student') {
    const matchingTechnicians = await db.select({ id: technicians.id }).from(technicians).where(eq(technicians.email, session.email));
    const technicianIds = [session.id, ...matchingTechnicians.map((technician) => technician.id)];
    rows = await db
      .select()
      .from(trainerCertificateRequests)
      .where(inArray(trainerCertificateRequests.technicianId, technicianIds))
      .orderBy(desc(trainerCertificateRequests.submittedAt));
  } else {
    rows = await db
      .select()
      .from(trainerCertificateRequests)
      .where(eq(trainerCertificateRequests.trainerEmail, session.email))
      .orderBy(desc(trainerCertificateRequests.submittedAt));
  }

  return NextResponse.json(rows.map(toTrainerCertificateRequest));
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['trainer', 'lecturer']);
  } catch (e) {
    return e as Response;
  }

  const input = validateCertificateRequest(await req.json().catch(() => null));
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
  const request = input.value;

  // Identity comes from the registry record, never from what the form says.
  const [technician] = await db
    .select({
      id: technicians.id,
      name: technicians.name,
      registrationNumber: technicians.registrationNumber,
      employer: technicians.employer,
      email: technicians.email,
      status: technicians.status,
    })
    .from(technicians)
    .where(eq(technicians.id, request.technicianId))
    .limit(1);
  if (!technician) {
    return NextResponse.json({ error: 'That technician is not in the registry.' }, { status: 404 });
  }
  if (technician.registrationNumber.toUpperCase() !== request.technicianRegistrationNumber) {
    return NextResponse.json({ error: 'The registration number does not match that technician.' }, { status: 400 });
  }
  if (technician.status === 'suspended') {
    return NextResponse.json({ error: 'A suspended technician cannot be put forward for a certificate.' }, { status: 409 });
  }

  // Marks are never assumed: each must be a real score the trainer entered.
  const isMark = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
  if (!isMark(request.practicalScore) || (!request.examSubmissionId && !isMark(request.theoryScore))) {
    return NextResponse.json({ error: 'Enter the scores the learner actually earned, from 0 to 100.' }, { status: 400 });
  }

  // Work out what the certificate is based on. A linked request takes its course, date, theory
  // score and CPD credits from the graded exam; a manual one uses what the trainer entered.
  let courseTitle = request.courseTitle;
  let examDate = request.examDate;
  let theoryScore = request.theoryScore ?? 0;
  let cpdCredits: number | null = null;

  if (request.examSubmissionId) {
    const [exam] = await db
      .select()
      .from(examSubmissions)
      .where(eq(examSubmissions.id, request.examSubmissionId))
      .limit(1);
    const [course] = exam
      ? await db.select().from(courses).where(eq(courses.id, exam.courseId)).limit(1)
      : [];
    if (!exam || !course || course.lecturerId !== session.id) {
      return NextResponse.json({ error: 'That exam was not found among your courses.' }, { status: 404 });
    }
    if (exam.status !== 'graded' || exam.passed !== true || exam.score === null || !exam.gradedAt) {
      return NextResponse.json({ error: 'Only a graded, passed exam can be used for a certificate.' }, { status: 409 });
    }
    const [learner] = await db.select({ email: users.email }).from(users).where(eq(users.id, exam.studentId)).limit(1);
    if (!technician.email || !learner || learner.email.toLowerCase() !== technician.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This exam was not taken by that technician. The registry email must match the learner account.' },
        { status: 409 },
      );
    }
    courseTitle = exam.courseTitle;
    examDate = exam.gradedAt.toISOString().slice(0, 10);
    theoryScore = Math.round(Number(exam.score));
    cpdCredits = course.cpdCredits;
  }

  const [duplicate] = await db
    .select({ id: trainerCertificateRequests.id })
    .from(trainerCertificateRequests)
    .where(and(
      eq(trainerCertificateRequests.technicianId, technician.id),
      request.examSubmissionId
        ? eq(trainerCertificateRequests.examSubmissionId, request.examSubmissionId)
        : and(
            eq(trainerCertificateRequests.courseTitle, courseTitle),
            eq(trainerCertificateRequests.examDate, examDate),
          ),
      inArray(trainerCertificateRequests.status, ['submitted-for-admin-approval', 'admin-approved', 'issued']),
    ))
    .limit(1);
  if (duplicate) {
    return NextResponse.json({ error: 'A certificate request for this technician and exam already exists.' }, { status: 409 });
  }

  const [inserted] = await db
    .insert(trainerCertificateRequests)
    .values({
      examSubmissionId: request.examSubmissionId,
      technicianId: technician.id,
      technicianName: technician.name,
      technicianRegistrationNumber: technician.registrationNumber,
      technicianCompany: technician.employer ?? 'Independent technician',
      trainerName: session.name,
      trainerEmail: session.email,
      courseTitle,
      examDate,
      theoryScore,
      practicalScore: request.practicalScore,
      overallScore: Math.round((theoryScore + request.practicalScore) / 2),
      notes: request.notes,
      status: 'submitted-for-admin-approval',
      cpdCredits,
    })
    .returning();

  await recordAuditEvent({
    entityType: 'certificate_request',
    entityId: inserted.id,
    action: request.examSubmissionId ? 'certificate_requested_from_exam' : 'certificate_requested_manual',
    newStatus: inserted.status,
    performedBy: session.name,
    performedByRole: session.role,
  });

  return NextResponse.json(toTrainerCertificateRequest(inserted), { status: 201 });
}
