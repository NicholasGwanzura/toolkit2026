import { NextResponse } from 'next/server';
import { MAX_LIST_ROWS } from '@/lib/server/list-limits';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { equipmentRecords } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { isFieldWorkerRole } from '@/lib/field-worker';
import { ownedBy, toEquipmentRecord } from '@/lib/server/equipment-records';
import { equipmentStatus, validateNewEquipment } from '@/lib/equipment-record';

export async function GET(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const rows = isFieldWorkerRole(session.role)
    ? await db.select().from(equipmentRecords).where(and(isNull(equipmentRecords.archivedAt), ownedBy(session))).limit(MAX_LIST_ROWS)
    : await db.select().from(equipmentRecords).where(isNull(equipmentRecords.archivedAt)).limit(MAX_LIST_ROWS);
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
    .where(and(eq(equipmentRecords.equipmentId, equipment.equipmentId), isNull(equipmentRecords.archivedAt), ownedBy(session)))
    .limit(1);
  if (existing) return NextResponse.json({ error: `${equipment.equipmentId} is already on your register.` }, { status: 409 });

  const [inserted] = await db
    .insert(equipmentRecords)
    .values({
      ...equipment,
      refrigerantClass: equipment.ashraeSafetyClass,
      status: equipmentStatus(equipment.nextServiceDue, new Date().toISOString().slice(0, 10)),
      technicianId: session.id,
      technicianName: session.name,
    })
    .returning();
  return NextResponse.json(toEquipmentRecord(inserted), { status: 201 });
}
