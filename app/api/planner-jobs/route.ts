import { NextResponse } from 'next/server';
import { MAX_LIST_ROWS } from '@/lib/server/list-limits';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { plannerJobs } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import type { PlannerJob } from '@/types/index';
import { isFieldWorkerRole } from '@/lib/field-worker';

function toPlannerJob(row: typeof plannerJobs.$inferSelect): PlannerJob {
  return {
    id: row.id,
    clientId: row.clientId,
    clientName: row.clientName,
    equipmentId: row.equipmentId ?? undefined,
    location: row.location,
    province: row.province,
    district: row.district ?? undefined,
    technicianId: row.technicianId,
    technicianName: row.technicianName,
    jobType: row.jobType as PlannerJob['jobType'],
    refrigerantClass: row.refrigerantClass as PlannerJob['refrigerantClass'],
    refrigerantId: row.refrigerantId ?? undefined,
    refrigerantType: row.refrigerantType ?? undefined,
    amount: row.amount ? Number(row.amount) : undefined,
    scheduledDate: row.scheduledDate,
    status: row.status as PlannerJob['status'],
    preJobChecklistComplete: row.preJobChecklistComplete,
    checklistItems: row.checklistItems as PlannerJob['checklistItems'],
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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
    isFieldWorkerRole(session.role)
      ? await db
          .select()
          .from(plannerJobs)
          .where(eq(plannerJobs.technicianId, session.id))
          .orderBy(desc(plannerJobs.scheduledDate))
          .limit(MAX_LIST_ROWS)
      : await db.select().from(plannerJobs).orderBy(desc(plannerJobs.scheduledDate)).limit(MAX_LIST_ROWS);

  return NextResponse.json(rows.map(toPlannerJob));
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const body = await req.json().catch(() => ({})) as Partial<PlannerJob>;

  const required: Array<keyof PlannerJob> = [
    'clientId', 'clientName', 'location', 'province',
    'jobType', 'refrigerantClass', 'scheduledDate',
  ];
  for (const key of required) {
    if (!body[key]) {
      return NextResponse.json({ error: `${key} is required` }, { status: 400 });
    }
  }

  // FK integrity: if refrigerantType is provided, refrigerantId must also be set
  if (body.refrigerantType && !body.refrigerantId) {
    return NextResponse.json({ error: 'refrigerantId is required when refrigerantType is provided' }, { status: 400 });
  }

  // Technicians can only schedule jobs under their own identity.
  const technicianId = isFieldWorkerRole(session.role) ? session.id : (body.technicianId ?? session.id);
  const technicianName = isFieldWorkerRole(session.role) ? session.name : (body.technicianName ?? session.name);

  const [inserted] = await db
    .insert(plannerJobs)
    .values({
      clientId: body.clientId!,
      clientName: body.clientName!,
      equipmentId: body.equipmentId ?? null,
      location: body.location!,
      province: body.province!,
      district: body.district ?? null,
      technicianId,
      technicianName,
      jobType: body.jobType!,
      refrigerantClass: body.refrigerantClass!,
      refrigerantId: body.refrigerantId ?? null,
      refrigerantType: body.refrigerantType ?? null,
      amount: body.amount != null ? body.amount.toString() : null,
      scheduledDate: body.scheduledDate!,
      status: body.status ?? 'scheduled',
      preJobChecklistComplete: body.preJobChecklistComplete ?? false,
      checklistItems: body.checklistItems ?? [],
      notes: body.notes ?? null,
    })
    .returning();

  return NextResponse.json(toPlannerJob(inserted), { status: 201 });
}
