import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { installations } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import type { Installation } from '@/types/index';
import { isFieldWorkerRole } from '@/lib/field-worker';
import { checklistSchema } from '@/lib/server/installation-checklist';

function toInstallation(row: typeof installations.$inferSelect): Installation {
  return {
    id: row.id,
    technicianId: row.technicianId,
    technicianName: row.technicianName,
    clientName: row.clientName,
    location: row.location ?? undefined,
    jobDetails: row.jobDetails,
    floorSpace: row.floorSpace ?? '',
    jobType: row.jobType as Installation['jobType'],
    installationDate: row.installationDate.toISOString(),
    equipmentId: row.equipmentId ?? undefined,
    status: row.status as Installation['status'],
    images: row.images,
    checklistSnapshot: row.checklistSnapshot ?? null,
    cocRequested: row.cocRequested,
    cocApproved: row.cocApproved,
    cocRequestId: row.cocRequestId ?? undefined,
    cocApprovalDate: row.cocApprovalDate?.toISOString() ?? undefined,
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
  const body = await req.json().catch(() => ({})) as Partial<Installation>;

  const [existing] = await db
    .select()
    .from(installations)
    .where(eq(installations.id, id));

  if (!existing) {
    return NextResponse.json({ error: 'Installation not found' }, { status: 404 });
  }

  if (isFieldWorkerRole(session.role) && existing.technicianId !== session.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  if (session.role !== 'org_admin' && (body.cocApproved !== undefined || body.cocApprovalDate !== undefined)) {
    return NextResponse.json({ error: 'Only administrators can approve a certificate of compliance.' }, { status: 403 });
  }
  if (isFieldWorkerRole(session.role) && body.status && body.status !== existing.status) {
    return NextResponse.json({ error: 'Technicians cannot change installation review status.' }, { status: 403 });
  }
  if (isFieldWorkerRole(session.role) && body.cocRequested === false && existing.cocRequested) {
    return NextResponse.json({ error: 'Submitted COC requests cannot be withdrawn here.' }, { status: 409 });
  }
  if (session.role === 'org_admin' && body.cocApproved && !existing.cocRequested) {
    return NextResponse.json({ error: 'COC approval requires a technician request first.' }, { status: 409 });
  }

  // A COC request is made only through the COC request endpoint, which checks the checklist and site.
  // Setting the flag here would skip those checks.
  if (isFieldWorkerRole(session.role) && body.cocRequested !== undefined) {
    return NextResponse.json({ error: 'Request a COC from the installation card, not by editing the record.' }, { status: 403 });
  }
  // The saved checklist is evidence. It can be replaced until a COC is requested, never afterwards,
  // and always has to pass the same checks as when it was first saved.
  if (body.checklistSnapshot !== undefined) {
    if (isFieldWorkerRole(session.role) && existing.cocRequested) {
      return NextResponse.json({ error: 'The checklist is locked once a COC has been requested.' }, { status: 409 });
    }
    if (!checklistSchema.safeParse(body.checklistSnapshot).success) {
      return NextResponse.json({ error: 'Invalid checklist snapshot' }, { status: 400 });
    }
  }

  const updateFields: Record<string, unknown> = {};
  if (session.role === 'org_admin' && body.status) updateFields.status = body.status;
  if (session.role === 'org_admin' && body.cocRequested !== undefined) updateFields.cocRequested = body.cocRequested;
  if (body.checklistSnapshot !== undefined) updateFields.checklistSnapshot = body.checklistSnapshot;
  if (session.role === 'org_admin' && body.cocApproved !== undefined) updateFields.cocApproved = body.cocApproved;
  if (session.role === 'org_admin' && body.cocApprovalDate !== undefined) updateFields.cocApprovalDate = body.cocApprovalDate ? new Date(body.cocApprovalDate) : null;
  updateFields.updatedAt = new Date();

  const [updated] = await db
    .update(installations)
    .set(updateFields)
    .where(eq(installations.id, id))
    .returning();

  return NextResponse.json(toInstallation(updated));
}
