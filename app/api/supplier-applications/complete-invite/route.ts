import { NextResponse } from 'next/server';
import { and, eq, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { supplierApplications } from '@/db/schema/index';
import { readSessionFromRequest } from '@/lib/server/auth';
import { generateSupplierRegistrationNumber } from '@/lib/server/registration-number';
import { notifyAdminsOfNewApplication } from '@/lib/server/notify-admins';
import { supplierDetails } from '@/lib/application-details';
import { SITE_URL } from '@/lib/site-url';
import type { SupplierRegistration, SupplierSurveyData } from '@/types/index';

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

export async function POST(req: Request) {
  const session = await readSessionFromRequest(req);
  if (!session || session.role !== 'vendor') return NextResponse.json({ error: 'A supplier invitation is required.' }, { status: 403 });

  const body = await req.json() as Partial<SupplierRegistration>;
  if (!body.companyName || !body.contactName || !body.phone || !body.province || !body.city || !body.address || !body.refrigerantsSupplied?.length) {
    return NextResponse.json({ error: 'Complete all required company, contact, location, and refrigerant fields.' }, { status: 400 });
  }
  if (!isSupplierSurveyComplete(body.surveyData)) {
    return NextResponse.json({ error: 'Complete the supplier questionnaire before submitting.' }, { status: 400 });
  }
  const [existing] = await db.select({ id: supplierApplications.id }).from(supplierApplications).where(and(
    eq(supplierApplications.email, session.email),
    or(eq(supplierApplications.status, 'submitted'), eq(supplierApplications.status, 'under-review'), eq(supplierApplications.status, 'approved')),
  )).limit(1);
  if (existing) return NextResponse.json({ error: 'This supplier invite has already been completed.' }, { status: 409 });

  const [inserted] = await db.insert(supplierApplications).values({
    companyName: body.companyName.trim(), tradingName: body.tradingName ?? null,
    registrationNumber: await generateSupplierRegistrationNumber(),
    supplierType: (body.supplierType ?? 'distributor') as typeof supplierApplications.$inferInsert['supplierType'],
    contactName: body.contactName.trim(), email: session.email, passwordHash: null,
    phone: body.phone.trim(), province: body.province.trim(), city: body.city.trim(), address: body.address.trim(),
    refrigerantsSupplied: body.refrigerantsSupplied, taxNumber: body.taxNumber ?? null,
    website: body.website ?? null, notes: body.notes ?? null,
    surveyData: body.surveyData ?? null,
    status: 'submitted', submittedAt: new Date(), createdAt: new Date(),
  }).returning();
  notifyAdminsOfNewApplication({
    applicantName: inserted.contactName,
    applicantEmail: inserted.email,
    roleLabel: 'Supplier',
    reviewPath: `${SITE_URL}/admin/applications`,
    details: supplierDetails(inserted),
    emailConfirmed: true, // the invite already proved this address
    entityType: 'supplier_application',
    entityId: inserted.id,
  }).catch(() => {});
  return NextResponse.json({ ...inserted, submittedAt: inserted.submittedAt.toISOString() }, { status: 201 });
}
