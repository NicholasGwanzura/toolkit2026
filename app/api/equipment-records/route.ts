import { NextResponse } from 'next/server';
import { MAX_LIST_ROWS } from '@/lib/server/list-limits';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { equipmentRecords } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import type { EquipmentRecord } from '@/types/index';
import { isFieldWorkerRole } from '@/lib/field-worker';
import { equipmentStatus, validateNewEquipment } from '@/lib/equipment-record';

function toEquipmentRecord(row: typeof equipmentRecords.$inferSelect): EquipmentRecord {
  return {
    id: row.id,
    clientId: row.clientId ?? undefined,
    equipmentId: row.equipmentId,
    clientName: row.clientName,
    manufacturer: row.manufacturer ?? undefined,
    model: row.model ?? undefined,
    province: row.province,
    refrigerantId: row.refrigerantId ?? undefined,
    refrigerantType: row.refrigerantType,
    refrigerantClass: (row.refrigerantClass ?? undefined) as EquipmentRecord['refrigerantClass'],
    ashraeSafetyClass: row.ashraeSafetyClass as EquipmentRecord['ashraeSafetyClass'],
    serialNumber: row.serialNumber ?? undefined,
    healthStatus: (row.healthStatus ?? undefined) as EquipmentRecord['healthStatus'],
    lastServiceDate: row.lastServiceDate,
    nextServiceDue: row.nextServiceDue,
    status: row.status as EquipmentRecord['status'],
    technicianName: row.technicianName,
    serviceHistory: row.serviceHistory as EquipmentRecord['serviceHistory'],
    predictedFailureReason: row.predictedFailureReason ?? undefined,
    recommendedAction: row.recommendedAction ?? undefined,
  };
}

export async function GET(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const rows = isFieldWorkerRole(session.role)
    ? await db.select().from(equipmentRecords).where(eq(equipmentRecords.technicianName, session.name)).limit(MAX_LIST_ROWS)
    : await db.select().from(equipmentRecords).limit(MAX_LIST_ROWS);
  return NextResponse.json(rows.map(toEquipmentRecord));
}

/** Adds a piece of equipment to the signed-in person's register. Its status comes from the dates. */
export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const checked = validateNewEquipment(await req.json().catch(() => null));
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
  const { equipment } = checked;

  const [existing] = await db
    .select({ id: equipmentRecords.id })
    .from(equipmentRecords)
    .where(and(eq(equipmentRecords.equipmentId, equipment.equipmentId), eq(equipmentRecords.technicianName, session.name)))
    .limit(1);
  if (existing) return NextResponse.json({ error: `${equipment.equipmentId} is already on your register.` }, { status: 409 });

  const [inserted] = await db
    .insert(equipmentRecords)
    .values({
      ...equipment,
      refrigerantClass: equipment.ashraeSafetyClass,
      status: equipmentStatus(equipment.nextServiceDue, new Date().toISOString().slice(0, 10)),
      technicianName: session.name,
    })
    .returning();
  return NextResponse.json(toEquipmentRecord(inserted), { status: 201 });
}
