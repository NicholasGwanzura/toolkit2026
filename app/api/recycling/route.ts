import { NextResponse } from 'next/server';
import { MAX_LIST_ROWS } from '@/lib/server/list-limits';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { recyclingRecords } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import type { RecyclingRecord } from '@/types/index';

function toRecyclingRecord(row: typeof recyclingRecords.$inferSelect): RecyclingRecord {
  return {
    id: row.id,
    equipmentId: row.equipmentId ?? undefined,
    refrigerantId: row.refrigerantId ?? undefined,
    refrigerantLabel: row.refrigerantLabel,
    quantityKg: Number(row.quantityKg),
    method: row.method,
    technicianId: row.technicianId,
    technicianName: row.technicianName,
    jobSite: row.jobSite,
    recycledDate: row.recycledDate,
    status: row.status as RecyclingRecord['status'],
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const rows =
    session.role === 'org_admin'
      ? await db.select().from(recyclingRecords).orderBy(desc(recyclingRecords.createdAt)).limit(MAX_LIST_ROWS)
      : await db
          .select()
          .from(recyclingRecords)
          .where(eq(recyclingRecords.technicianId, session.id))
          .orderBy(desc(recyclingRecords.createdAt))
          .limit(MAX_LIST_ROWS);

  return NextResponse.json(rows.map(toRecyclingRecord));
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const body = await req.json().catch(() => ({})) as Partial<RecyclingRecord>;

  const required: Array<keyof RecyclingRecord> = ['refrigerantLabel', 'quantityKg', 'jobSite', 'recycledDate'];
  for (const key of required) {
    if (!body[key]) {
      return NextResponse.json({ error: `${key} is required` }, { status: 400 });
    }
  }

  const [inserted] = await db
    .insert(recyclingRecords)
    .values({
      equipmentId: body.equipmentId ?? null,
      refrigerantId: body.refrigerantId ?? null,
      refrigerantLabel: body.refrigerantLabel!,
      quantityKg: body.quantityKg!.toString(),
      method: body.method ?? 'on-site-recycling',
      technicianId: session.id,
      technicianName: session.name,
      jobSite: body.jobSite!,
      recycledDate: body.recycledDate!,
      notes: body.notes ?? null,
    })
    .returning();

  return NextResponse.json(toRecyclingRecord(inserted), { status: 201 });
}
