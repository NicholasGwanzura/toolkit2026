import { isTechnicianSkills, SHOW_TECHNICIAN_SKILLS } from '@/lib/technician-skills';
import { ACCOUNT_EXISTS_MESSAGE, accountExistsFor } from '@/lib/server/applicant-lookup';
import { NextResponse } from 'next/server';
import { and, desc, eq, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { technicianApplications } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { hashPassword, isPasswordStrongEnough, MIN_PASSWORD_LENGTH } from '@/lib/server/password';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { startApplicantVerification } from '@/lib/server/application-flow';
import { pendingVerificationIds } from '@/lib/server/email-verification';
import { generateTechnicianRegistrationNumber } from '@/lib/server/registration-number';
import { SELF_SIGNUP_OPEN } from '@/lib/signup-config';
import type { TechnicianApplication } from '@/types/index';

const SIGNUP_RATE_LIMIT = 5;
const SIGNUP_RATE_WINDOW_MS = 15 * 60 * 1000;

function toTechnicianApplication(
  row: typeof technicianApplications.$inferSelect,
): TechnicianApplication {
  return {
    id: row.id,
    name: row.name,
    nationalId: row.nationalId,
    registrationNumber: row.registrationNumber,
    email: row.email,
    contactNumber: row.contactNumber,
    province: row.province,
    district: row.district,
    region: row.region,
    specialization: row.specialization,
    technicianSkills: row.technicianSkills ?? undefined,
    employmentStatus: row.employmentStatus as TechnicianApplication['employmentStatus'],
    employer: row.employer ?? undefined,
    yearsExperience: row.yearsExperience,
    certifications: row.certifications as TechnicianApplication['certifications'],
    refrigerantsHandled: row.refrigerantsHandled as string[],
    surveyData: (row.surveyData as TechnicianApplication['surveyData']) ?? undefined,
    status: row.status as TechnicianApplication['status'],
    reviewedAt: row.reviewedAt?.toISOString() ?? undefined,
    reviewedBy: row.reviewedBy ?? undefined,
    reviewNote: row.reviewNote ?? undefined,
    approvedTechnicianId: row.approvedTechnicianId ?? undefined,
    submittedAt: row.submittedAt.toISOString(),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req: Request) {
  try {
    await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const rows = await db
    .select()
    .from(technicianApplications)
    .orderBy(desc(technicianApplications.submittedAt));
  const unconfirmed = await pendingVerificationIds('technician_application', rows.map((row) => row.id));
  return NextResponse.json(rows.map((row) => ({ ...toTechnicianApplication(row), emailUnconfirmed: unconfirmed.has(row.id) })));
}

export async function POST(req: Request) {
  if (!SELF_SIGNUP_OPEN.technician) {
    return NextResponse.json({ error: 'Technician self-registration is currently closed.' }, { status: 403 });
  }
  if (!checkRateLimit(`technician-application:${getClientIp(req)}`, SIGNUP_RATE_LIMIT, SIGNUP_RATE_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many applications from this address. Try again later.' }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<TechnicianApplication> & { password?: string };

  const required: Array<keyof TechnicianApplication> = [
    'name', 'nationalId', 'email',
    'contactNumber', 'province', 'district', 'specialization',
  ];
  for (const key of required) {
    if (!body[key]) {
      return NextResponse.json({ error: `${key === 'specialization' ? 'RAC sub-sector' : key} is required` }, { status: 400 });
    }
  }

  if (!isPasswordStrongEnough(body.password ?? '')) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 },
    );
  }

  const email = String(body.email).trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  if (await accountExistsFor(email)) {
    return NextResponse.json({ error: ACCOUNT_EXISTS_MESSAGE }, { status: 409 });
  }

  const [duplicate] = await db
    .select({ id: technicianApplications.id, status: technicianApplications.status })
    .from(technicianApplications)
    .where(
      and(
        eq(technicianApplications.email, email),
        or(
          eq(technicianApplications.status, 'submitted'),
          eq(technicianApplications.status, 'under-review'),
        ),
      ),
    )
    .limit(1);

  if (duplicate) {
    return NextResponse.json(
      { error: 'An application with this email is already under review.' },
      { status: 409 },
    );
  }

  // Required only while the question is shown on the sign-up form.
  if (SHOW_TECHNICIAN_SKILLS && !isTechnicianSkills(body.technicianSkills)) {
    return NextResponse.json({ error: 'Choose your technician skills.' }, { status: 400 });
  }

  const passwordHash = await hashPassword(body.password!);
  const registrationNumber = await generateTechnicianRegistrationNumber();

  const [inserted] = await db
    .insert(technicianApplications)
    .values({
      name: String(body.name).trim(),
      nationalId: String(body.nationalId).trim(),
      registrationNumber,
      email,
      passwordHash,
      contactNumber: String(body.contactNumber).trim(),
      province: String(body.province).trim(),
      district: String(body.district).trim(),
      region: String(body.region ?? body.province).trim(),
      specialization: String(body.specialization).trim(),
      technicianSkills: isTechnicianSkills(body.technicianSkills) ? body.technicianSkills : null,
      employmentStatus: (body.employmentStatus ?? 'employed') as 'employed' | 'self-employed' | 'unemployed',
      employer: body.employer ?? null,
      yearsExperience: Number(body.yearsExperience ?? 0),
      certifications: body.certifications ?? [],
      refrigerantsHandled: body.refrigerantsHandled ?? [],
      surveyData: body.surveyData ?? null,
      status: 'submitted',
    })
    .returning();

  // Ask the applicant to confirm their email. Admins are told once it is confirmed.
  await startApplicantVerification({
    entityType: 'technician_application',
    entityId: inserted.id,
    role: 'technician',
    name: inserted.name,
    email: inserted.email,
  });

  return NextResponse.json(toTechnicianApplication(inserted), { status: 201 });
}
