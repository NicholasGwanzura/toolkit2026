import { NextResponse } from 'next/server';
import { MAX_LIST_ROWS } from '@/lib/server/list-limits';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { reclamationRecords } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { requireApprovedSupplier } from '@/lib/server/supplier-access';
import type { ReclamationRecord } from '@/types/index';

function batchNumber() {
  return `RCL-${Date.now().toString(36).toUpperCase()}`;
}

function toReclamationRecord(row: typeof reclamationRecords.$inferSelect): ReclamationRecord {
  return {
    id: row.id,
    batchNumber: row.batchNumber,
    refrigerantId: row.refrigerantId ?? undefined,
    refrigerantLabel: row.refrigerantLabel,
    sourceDescription: row.sourceDescription,
    quantityKg: Number(row.quantityKg),
    purityPercent: row.purityPercent ? Number(row.purityPercent) : undefined,
    testMethod: row.testMethod ?? undefined,
    facilityName: row.facilityName,
    technicianId: row.technicianId ?? undefined,
    technicianName: row.technicianName,
    status: row.status as ReclamationRecord['status'],
    testedDate: row.testedDate ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'vendor', 'org_admin']);
    if (session.role === 'vendor') session = await requireApprovedSupplier(req);
  } catch (e) {
    return e as Response;
  }

  const rows =
    session.role === 'org_admin'
      ? await db.select().from(reclamationRecords).orderBy(desc(reclamationRecords.createdAt)).limit(MAX_LIST_ROWS)
      : await db
          .select()
          .from(reclamationRecords)
          .where(eq(reclamationRecords.technicianId, session.id))
          .orderBy(desc(reclamationRecords.createdAt))
          .limit(MAX_LIST_ROWS);

  return NextResponse.json(rows.map(toReclamationRecord));
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'vendor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const body = await req.json().catch(() => ({})) as Partial<ReclamationRecord>;

  const required: Array<keyof ReclamationRecord> = ['refrigerantLabel', 'sourceDescription', 'quantityKg', 'facilityName'];
  for (const key of required) {
    if (!body[key]) {
      return NextResponse.json({ error: `${key} is required` }, { status: 400 });
    }
  }

  const [inserted] = await db
    .insert(reclamationRecords)
    .values({
      batchNumber: batchNumber(),
      refrigerantId: body.refrigerantId ?? null,
      refrigerantLabel: body.refrigerantLabel!,
      sourceDescription: body.sourceDescription!,
      quantityKg: body.quantityKg!.toString(),
      purityPercent: body.purityPercent != null ? body.purityPercent.toString() : null,
      testMethod: body.testMethod ?? null,
      facilityName: body.facilityName!,
      technicianId: session.id,
      technicianName: session.name,
      status: body.status ?? 'pending',
      testedDate: body.testedDate ?? null,
      notes: body.notes ?? null,
    })
    .returning();

  return NextResponse.json(toReclamationRecord(inserted), { status: 201 });
}
