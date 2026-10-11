import { recordAuditEventSafe } from '@/lib/server/audit';
import { notifyUser } from '@/lib/server/notifications';
import { notificationTemplates } from '@/lib/notification-templates';
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { cocRequests, installations } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { toCocRequest } from '@/lib/server/request-serializers';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { notes?: string };
  const [existing] = await db.select().from(cocRequests).where(eq(cocRequests.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.status !== 'submitted') {
    return NextResponse.json({ error: 'Only submitted COC requests can be rejected.' }, { status: 409 });
  }
  if (!body.notes?.trim()) {
    return NextResponse.json({ error: 'A rejection note is required.' }, { status: 400 });
  }

  const updated = await db.transaction(async (tx) => {
    const now = new Date();
    const [request] = await tx.update(cocRequests)
      .set({ status: 'rejected', reviewedBy: session.name, reviewedAt: now, reviewNote: body.notes!.trim(), issuedDate: null, verificationToken: null })
      .where(and(eq(cocRequests.id, id), eq(cocRequests.status, 'submitted')))
      .returning();
    if (!request) return null;
    if (request.installationId) {
      await tx.update(installations)
        .set({ status: 'rejected', cocRequested: true, cocApproved: false, cocRequestId: request.id, cocApprovalDate: null, updatedAt: now })
        .where(eq(installations.id, request.installationId));
    }
    return request;
  });
  if (!updated) return NextResponse.json({ error: 'COC request is no longer pending review' }, { status: 409 });

  await notifyUser(updated.technicianId, notificationTemplates.cocDecision(false, updated.location));
  await recordAuditEventSafe({
    entityType: 'coc_request',
    entityId: updated.id,
    action: 'rejected',
    previousStatus: 'submitted',
    newStatus: 'rejected',
    performedBy: session.name,
    performedByRole: session.role,
    notes: body.notes?.trim(),
  });
  return NextResponse.json(toCocRequest(updated));
}
