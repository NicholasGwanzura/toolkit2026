import { toSupplierRegistration } from '@/lib/server/request-serializers';
import { ACCOUNT_EXISTS_MESSAGE, accountExistsFor } from '@/lib/server/applicant-lookup';
import { NextResponse } from 'next/server';
import { and, eq, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { supplierApplications } from '@/db/schema/index';
import { readSessionFromRequest } from '@/lib/server/auth';
import { hashPassword, isPasswordStrongEnough, MIN_PASSWORD_LENGTH } from '@/lib/server/password';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { startApplicantVerification } from '@/lib/server/application-flow';
import { pendingVerificationIds } from '@/lib/server/email-verification';
import { generateSupplierRegistrationNumber } from '@/lib/server/registration-number';
import { SELF_SIGNUP_OPEN } from '@/lib/signup-config';
import type { SupplierRegistration, SupplierSurveyData } from '@/types/index';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGNUP_RATE_LIMIT = 5;
const SIGNUP_RATE_WINDOW_MS = 15 * 60 * 1000;
const REQUIRED_SURVEY_KEYS: Array<keyof SupplierSurveyData> = [
  'employeeCountBand',
  'yearsInOperation',
  'recoveryEquipmentAccess',
  'storageComplianceConfidence',
  'lowGwpRegulationConfidence',
  'loadSheddingFrequency',
  'preferredLanguage',
  'biggestDistributionChallenge',
];

function isSupplierSurveyComplete(data: SupplierSurveyData | undefined): boolean {
  if (!data) return false;
  return REQUIRED_SURVEY_KEYS.every((key) => data[key] !== undefined && data[key] !== '');
}

export async function GET(req: Request) {
  const session = await readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role === 'vendor') {
    const rows = await db
      .select()
      .from(supplierApplications)
      .where(eq(supplierApplications.email, session.email));
    return NextResponse.json(rows.map(toSupplierRegistration));
  }

  if (session.role === 'org_admin') {
    const rows = await db.select().from(supplierApplications);
    const unconfirmed = await pendingVerificationIds('supplier_application', rows.map((row) => row.id));
    return NextResponse.json(rows.map((row) => ({ ...toSupplierRegistration(row), emailUnconfirmed: unconfirmed.has(row.id) })));
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(req: Request) {
  if (!SELF_SIGNUP_OPEN.supplier) {
    return NextResponse.json({ error: 'Supplier access is invitation-only. Contact HEVACRAZ or your organisation administrator to request onboarding.' }, { status: 403 });
  }
  if (!checkRateLimit(`supplier-application:${getClientIp(req)}`, SIGNUP_RATE_LIMIT, SIGNUP_RATE_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many applications from this address. Try again later.' }, { status: 429 });
  }

  const body = await req.json() as Partial<SupplierRegistration> & { password?: string };

  if (!body.companyName || !body.contactName || !body.email) {
    return NextResponse.json({ error: 'companyName, contactName, and email are required' }, { status: 400 });
  }

  if (!isPasswordStrongEnough(body.password ?? '')) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 },
    );
  }
  if (!isSupplierSurveyComplete(body.surveyData)) {
    return NextResponse.json({ error: 'Complete the supplier questionnaire before submitting.' }, { status: 400 });
  }

  const email = String(body.email).trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  if (await accountExistsFor(email)) {
    return NextResponse.json({ error: ACCOUNT_EXISTS_MESSAGE }, { status: 409 });
  }

  const dupes = await db
    .select({ id: supplierApplications.id, status: supplierApplications.status })
    .from(supplierApplications)
    .where(
      and(
        eq(supplierApplications.email, email),
        or(
          eq(supplierApplications.status, 'submitted'),
          eq(supplierApplications.status, 'under-review'),
          eq(supplierApplications.status, 'approved'),
        ),
      ),
    )
    .limit(1);

  if (dupes.length > 0) {
    return NextResponse.json(
      { error: 'A supplier with this email already has an active application.' },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(body.password!);
  const registrationNumber = await generateSupplierRegistrationNumber();

  const [inserted] = await db
    .insert(supplierApplications)
    .values({
      companyName: body.companyName.trim(),
      tradingName: body.tradingName ?? null,
      registrationNumber,
      supplierType: (body.supplierType ?? 'distributor') as typeof supplierApplications.$inferInsert['supplierType'],
      contactName: body.contactName.trim(),
      email,
      passwordHash,
      phone: body.phone ?? '',
      province: body.province ?? '',
      city: body.city ?? '',
      address: body.address ?? '',
      refrigerantsSupplied: body.refrigerantsSupplied ?? [],
      taxNumber: body.taxNumber ?? null,
      website: body.website ?? null,
      notes: body.notes ?? null,
      surveyData: body.surveyData ?? null,
      status: 'submitted',
      submittedAt: new Date(),
      createdAt: new Date(),
    })
    .returning();

  // Ask the applicant to confirm their email. Admins are told once it is confirmed.
  await startApplicantVerification({
    entityType: 'supplier_application',
    entityId: inserted.id,
    role: 'supplier',
    name: inserted.contactName,
    email: inserted.email,
  });

  return NextResponse.json(toSupplierRegistration(inserted), { status: 201 });
}
