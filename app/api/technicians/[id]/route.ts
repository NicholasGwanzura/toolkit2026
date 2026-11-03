import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { technicians } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { createMaterialDownloadUrl } from '@/lib/server/r2';
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
    technicianSkills: row.technicianSkills ?? undefined,
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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const [row] = await db.select().from(technicians).where(eq(technicians.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const technician = toTechnician(row, session.role === 'org_admin');
  if (row.photoKey) {
    technician.photoUrl = await createMaterialDownloadUrl(row.photoKey).catch(() => undefined);
  }
  return NextResponse.json(technician);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['trainer', 'lecturer', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;

  const [existing] = await db.select().from(technicians).where(eq(technicians.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json() as Partial<Pick<Technician, 'status' | 'name' | 'registrationNumber' | 'region' | 'certifications'>> & { photoKey?: string };

  // Trainers/lecturers may only attach a photo — every other field stays org_admin-only.
  const isPhotoOnlyUpdate = Object.keys(body).every((key) => key === 'photoKey');
  if (!isPhotoOnlyUpdate && session.role !== 'org_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updates: Partial<typeof technicians.$inferInsert> = {};
  if (body.status !== undefined) updates.status = body.status as typeof existing.status;
  if (body.name !== undefined) updates.name = body.name;
  if (body.registrationNumber !== undefined) updates.registrationNumber = body.registrationNumber;
  if (body.region !== undefined) updates.region = body.region;
  if (body.certifications !== undefined) updates.certifications = body.certifications;
  if (body.photoKey !== undefined) updates.photoKey = body.photoKey;

  const [updated] = await db
    .update(technicians)
    .set(updates)
    .where(eq(technicians.id, id))
    .returning();

  const technician = toTechnician(updated);
  if (updated.photoKey) {
    technician.photoUrl = await createMaterialDownloadUrl(updated.photoKey).catch(() => undefined);
  }
  return NextResponse.json(technician);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;

  const [existing] = await db.select().from(technicians).where(eq(technicians.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.delete(technicians).where(eq(technicians.id, id));

  return new Response(null, { status: 204 });
}
