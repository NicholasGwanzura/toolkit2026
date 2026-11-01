import { and, eq, isNull, or, sql } from 'drizzle-orm';
import type { db } from '@/db/client';
import { equipmentRecords, plannerJobs } from '@/db/schema/index';
import { addServiceRecord, equipmentStatus, isIsoDate, nextServiceAfter } from '@/lib/equipment-record';
import type { EquipmentRecord, PlannerServiceRecord } from '@/types/index';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Row = typeof equipmentRecords.$inferSelect;

const today = (now = new Date()) => now.toISOString().slice(0, 10);

export function toEquipmentRecord(row: Row): EquipmentRecord {
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
    // Worked out on every read: a stored status would go out of date as the days pass.
    status: isIsoDate(row.nextServiceDue) ? equipmentStatus(row.nextServiceDue, today()) : row.status as EquipmentRecord['status'],
    technicianId: row.technicianId ?? undefined,
    technicianName: row.technicianName,
    serviceHistory: row.serviceHistory as EquipmentRecord['serviceHistory'],
    predictedFailureReason: row.predictedFailureReason ?? undefined,
    recommendedAction: row.recommendedAction ?? undefined,
  };
}

/** A person's equipment: by id, or by name only for old records no single account could claim. */
export const ownedBy = (person: { id: string; name: string }) =>
  or(eq(equipmentRecords.technicianId, person.id), and(isNull(equipmentRecords.technicianId), eq(equipmentRecords.technicianName, person.name)));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A finished job moves its equipment on: last service becomes today, the next one keeps the same
 * interval, and the job joins the history. Completing the same job again changes nothing extra.
 * Returns false when the job's equipment cannot be found, which never blocks completing the job.
 */
export async function recordEquipmentService(tx: Tx, job: typeof plannerJobs.$inferSelect, note: string | undefined, now: Date): Promise<boolean> {
  if (!job.equipmentId) return false;
  // Jobs raised from the register keep the record's id as their client id, which survives reassignment.
  const [record] = await tx
    .select()
    .from(equipmentRecords)
    .where(and(
      isNull(equipmentRecords.archivedAt),
      UUID.test(job.clientId)
        ? eq(equipmentRecords.id, job.clientId)
        : and(eq(equipmentRecords.equipmentId, job.equipmentId), ownedBy({ id: job.technicianId, name: job.technicianName })),
    ))
    .limit(1);
  if (!record) return false;

  const date = today(now);
  const nextServiceDue = nextServiceAfter(record.lastServiceDate, record.nextServiceDue, date);
  const entry: PlannerServiceRecord = { id: job.id, date, notes: note?.trim() || 'Service job completed.', technicianName: job.technicianName, status: 'completed' };
  await tx
    .update(equipmentRecords)
    .set({
      lastServiceDate: date,
      nextServiceDue,
      status: equipmentStatus(nextServiceDue, date),
      serviceHistory: addServiceRecord(record.serviceHistory as PlannerServiceRecord[], entry),
      updatedAt: sql`now()`,
    })
    .where(eq(equipmentRecords.id, record.id));
  return true;
}
