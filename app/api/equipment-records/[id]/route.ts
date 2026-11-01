import { NextResponse } from 'next/server';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { db } from '@/db/client';
import { equipmentRecords } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { isFieldWorkerRole } from '@/lib/field-worker';
import { equipmentStatus, validateNewEquipment } from '@/lib/equipment-record';
import { ownedBy, toEquipmentRecord } from '@/lib/server/equipment-records';

type Session = { id: string; name: string; role: string };

/** The record, if this person may change it. Administrators may change any. */
async function loadForChange(id: string, session: Session) {
  const [row] = await db
    .select()
    .from(equipmentRecords)
    .where(and(
      eq(equipmentRecords.id, id),
      isNull(equipmentRecords.archivedAt),
      ...(isFieldWorkerRole(session.role) ? [ownedBy(session)] : []),
    ))
    .limit(1);
  return row;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }
  const { id } = await params;
  const row = await loadForChange(id, session);
  if (!row) return NextResponse.json({ error: 'Equipment not found.' }, { status: 404 });

  const checked = validateNewEquipment(await req.json().catch(() => null));
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
  const { equipment } = checked;

  const [clash] = await db
    .select({ id: equipmentRecords.id })
    .from(equipmentRecords)
    .where(and(
      eq(equipmentRecords.equipmentId, equipment.equipmentId),
      ne(equipmentRecords.id, id),
      isNull(equipmentRecords.archivedAt),
      ownedBy({ id: row.technicianId ?? session.id, name: row.technicianName }),
    ))
    .limit(1);
  if (clash) return NextResponse.json({ error: `${equipment.equipmentId} is already on this register.` }, { status: 409 });

  const [updated] = await db
    .update(equipmentRecords)
    .set({
      equipmentId: equipment.equipmentId,
      clientName: equipment.clientName,
      province: equipment.province,
      manufacturer: equipment.manufacturer ?? null,
      model: equipment.model ?? null,
      serialNumber: equipment.serialNumber ?? null,
      refrigerantId: equipment.refrigerantId ?? null,
      refrigerantType: equipment.refrigerantType,
      refrigerantClass: equipment.ashraeSafetyClass,
      ashraeSafetyClass: equipment.ashraeSafetyClass,
      lastServiceDate: equipment.lastServiceDate,
      nextServiceDue: equipment.nextServiceDue,
      status: equipmentStatus(equipment.nextServiceDue, new Date().toISOString().slice(0, 10)),
      updatedAt: new Date(),
    })
    .where(eq(equipmentRecords.id, id))
    .returning();
  return NextResponse.json(toEquipmentRecord(updated));
}

/** Archives rather than deletes, so service history and old jobs keep their meaning. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }
  const { id } = await params;
  const row = await loadForChange(id, session);
  if (!row) return NextResponse.json({ error: 'Equipment not found.' }, { status: 404 });
  await db.update(equipmentRecords).set({ archivedAt: new Date(), updatedAt: new Date() }).where(eq(equipmentRecords.id, id));
  return NextResponse.json({ ok: true });
}
