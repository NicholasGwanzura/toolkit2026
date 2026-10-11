import { NextResponse } from 'next/server';
import { MAX_LIST_ROWS } from '@/lib/server/list-limits';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { equipmentRecords } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import type { EquipmentRecord } from '@/types/index';
import { isFieldWorkerRole } from '@/lib/field-worker';

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
