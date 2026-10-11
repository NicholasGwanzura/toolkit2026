import { NextResponse } from 'next/server';
import { MAX_LIST_ROWS } from '@/lib/server/list-limits';
import { ilike, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { technicians } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import type { Technician } from '@/types/index';

function toTechnician(row: typeof technicians.$inferSelect, includeSensitive = false): Technician {
  return {
    id: row.id,
    name: row.name,
    nationalId: includeSensitive ? row.nationalId : '',
    registrationNumber: row.registrationNumber,
    region: row.region,
    province: row.province,
    district: row.district,
    contactNumber: includeSensitive ? row.contactNumber : '',
    email: includeSensitive ? row.email ?? undefined : undefined,
    specialization: row.specialization,
    certifications: row.certifications as Technician['certifications'],
    trainingHistory: row.trainingHistory as Technician['trainingHistory'],
    employmentStatus: row.employmentStatus as Technician['employmentStatus'],
    employer: row.employer ?? undefined,
    refrigerantsHandled: row.refrigerantsHandled as string[],
    supplierId: row.supplierId ?? undefined,
    registrationDate: row.registrationDate,
    expiryDate: row.expiryDate,
    status: row.status as Technician['status'],
    lastRenewalDate: row.lastRenewalDate ?? undefined,
    nextRenewalDate: row.nextRenewalDate ?? undefined,
    surveyData: includeSensitive ? (row.surveyData as Technician['surveyData']) ?? undefined : undefined,
  };
}

export async function GET(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const url = new URL(req.url);
  const q = url.searchParams.get('q');

  if (q) {
    const rows = await db
      .select()
      .from(technicians)
      .where(or(ilike(technicians.name, `%${q}%`), ilike(technicians.registrationNumber, `%${q}%`)))
      .limit(MAX_LIST_ROWS);
    return NextResponse.json(rows.map((row) => toTechnician(row, session.role === 'org_admin')));
  }

  const rows = await db.select().from(technicians).limit(MAX_LIST_ROWS);
  return NextResponse.json(rows.map((row) => toTechnician(row, session.role === 'org_admin')));
}

export async function POST(req: Request) {
  try {
    await requireRole(req, ['trainer', 'lecturer', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const body = (await req.json().catch(() => ({}))) as Partial<Technician>;

  const required: Array<keyof Technician> = [
    'name', 'nationalId', 'registrationNumber', 'region', 'province',
    'district', 'contactNumber', 'specialization',
  ];
  for (const key of required) {
    if (!body[key]) {
      return NextResponse.json({ error: `${key} is required` }, { status: 400 });
    }
  }

  const today = new Date();
  const expiry = new Date(today);
  expiry.setFullYear(today.getFullYear() + 2);

  const [inserted] = await db
    .insert(technicians)
    .values({
      name: String(body.name).trim(),
      nationalId: String(body.nationalId).trim(),
      registrationNumber: String(body.registrationNumber).trim(),
      region: String(body.region).trim(),
      province: String(body.province).trim(),
      district: String(body.district).trim(),
      contactNumber: String(body.contactNumber).trim(),
      email: body.email ?? null,
      specialization: String(body.specialization).trim(),
      certifications: body.certifications ?? [],
      trainingHistory: body.trainingHistory ?? [],
      employmentStatus: (body.employmentStatus ?? 'employed') as 'employed' | 'self-employed' | 'unemployed',
      employer: body.employer ?? null,
      refrigerantsHandled: body.refrigerantsHandled ?? [],
      registrationDate: body.registrationDate ?? today.toISOString().split('T')[0],
      expiryDate: body.expiryDate ?? expiry.toISOString().split('T')[0],
      status: (body.status ?? 'pending') as 'active' | 'inactive' | 'suspended' | 'pending',
      surveyData: body.surveyData ?? null,
    })
    .returning();

  return NextResponse.json(toTechnician(inserted), { status: 201 });
}
