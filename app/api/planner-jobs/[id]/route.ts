import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { plannerJobs, users } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import type { PlannerJob } from '@/types/index';
import { isFieldWorkerRole } from '@/lib/field-worker';
import { isValidIsoDate } from '@/lib/planner-conflicts';
import { appendJobNote, outstandingChecklist, stampChecklist, validateTransition } from '@/lib/planner-lifecycle';
import { recordEquipmentService } from '@/lib/server/equipment-records';
import { lockTechnicianCharges, recordNewSystemCharge, removeNewSystemCharge } from '@/lib/server/planner-charge-log';

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
    newSystem: row.newSystem,
    preJobChecklistComplete: row.preJobChecklistComplete,
    checklistItems: row.checklistItems as PlannerJob['checklistItems'],
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as Partial<PlannerJob> & { note?: string };

  const [existing] = await db.select().from(plannerJobs).where(eq(plannerJobs.id, id));
  if (!existing) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  // Technicians can only change their own jobs, whatever the field being changed.
  if (isFieldWorkerRole(session.role) && existing.technicianId !== session.id) {
    return NextResponse.json({ error: 'Not authorized to update this job' }, { status: 403 });
  }

  const now = new Date();
  const existingItems = (existing.checklistItems ?? []) as PlannerJob['checklistItems'];
  const checklist = body.checklistItems !== undefined
    ? stampChecklist(existingItems, body.checklistItems, session.name, now)
    : existingItems;

  const amount = body.amount !== undefined ? body.amount : undefined;
  // The gas actually used can be recorded or corrected until the job is closed.
  const changesGas = Number.isInteger(body.refrigerantId) && typeof body.refrigerantType === 'string' && body.refrigerantType.trim() !== '';
  if (changesGas && (existing.status === 'completed' || existing.status === 'cancelled')) {
    return NextResponse.json({ error: 'The gas on a completed or cancelled job cannot be changed.' }, { status: 400 });
  }
  if (body.status && body.status !== existing.status) {
    const problem = validateTransition({
      from: existing.status as PlannerJob['status'],
      to: body.status,
      refrigerantClass: existing.refrigerantClass,
      checklist,
      note: body.note,
      amount: amount !== undefined ? amount : existing.amount != null ? Number(existing.amount) : null,
      newSystem: existing.newSystem,
      refrigerantType: changesGas ? body.refrigerantType : existing.refrigerantType,
    });
    if (problem) {
      return NextResponse.json({ error: problem }, { status: 400 });
    }
  } else if (amount != null && (!Number.isFinite(amount) || amount < 0)) {
    return NextResponse.json({ error: 'Refrigerant amount must be zero or more.' }, { status: 400 });
  }

  const updateFields: Record<string, unknown> = {};

  // Editing the visit itself: only while the job is still open.
  const edits = ['scheduledDate', 'location', 'technicianId'].some(key => body[key as keyof typeof body] !== undefined);
  if (edits) {
    if (existing.status === 'completed' || existing.status === 'cancelled') {
      return NextResponse.json({ error: 'A completed or cancelled job cannot be rescheduled or reassigned. Flag a completed job for follow-up instead.' }, { status: 400 });
    }
    if (body.scheduledDate !== undefined) {
      if (!isValidIsoDate(body.scheduledDate)) {
        return NextResponse.json({ error: 'scheduledDate must be a valid YYYY-MM-DD date.' }, { status: 400 });
      }
      updateFields.scheduledDate = body.scheduledDate;
    }
    if (body.location !== undefined) {
      if (!body.location.trim()) {
        return NextResponse.json({ error: 'location cannot be empty.' }, { status: 400 });
      }
      updateFields.location = body.location.trim();
    }
    if (body.technicianId !== undefined && body.technicianId !== existing.technicianId) {
      if (session.role !== 'org_admin') {
        return NextResponse.json({ error: 'Only an organisation admin can reassign a job.' }, { status: 403 });
      }
      const [assignee] = await db
        .select({ id: users.id, name: users.name, role: users.role, status: users.status })
        .from(users)
        .where(eq(users.id, body.technicianId))
        .limit(1);
      if (!assignee || assignee.status !== 'active' || !isFieldWorkerRole(assignee.role)) {
        return NextResponse.json({ error: 'The new assignee must be an active technician or contractor.' }, { status: 400 });
      }
      updateFields.technicianId = assignee.id;
      updateFields.technicianName = assignee.name;
    }
  }

  if (body.status) updateFields.status = body.status;
  if (body.note?.trim()) updateFields.notes = appendJobNote(existing.notes, body.note, session.name, now);
  else if (body.notes !== undefined) updateFields.notes = body.notes;
  if (body.checklistItems !== undefined) {
    updateFields.checklistItems = checklist;
    // Derived from the items, never trusted from the client.
    updateFields.preJobChecklistComplete = outstandingChecklist(checklist, existing.refrigerantClass).length === 0;
  }
  if (amount !== undefined) updateFields.amount = amount == null ? null : amount.toString();
  if (changesGas) {
    updateFields.refrigerantId = body.refrigerantId;
    updateFields.refrigerantType = body.refrigerantType!.trim();
  }
  updateFields.updatedAt = now;

  // The job and its gas record change together: a job is never completed without its charge being counted.
  const statusChanged = Boolean(body.status) && body.status !== existing.status;
  const [updated] = await db.transaction(async (tx) => {
    const rows = await tx
      .update(plannerJobs)
      .set(updateFields)
      .where(eq(plannerJobs.id, id))
      .returning();
    if (statusChanged && body.status === 'completed') await recordEquipmentService(tx, rows[0], body.note, now);
    if (existing.newSystem && statusChanged && (body.status === 'completed' || body.status === 'cancelled')) {
      await lockTechnicianCharges(tx, existing.technicianId);
      if (body.status === 'completed') await recordNewSystemCharge(tx, rows[0], now);
      else await removeNewSystemCharge(tx, id);
    }
    return rows;
  });

  return NextResponse.json(toPlannerJob(updated));
}
