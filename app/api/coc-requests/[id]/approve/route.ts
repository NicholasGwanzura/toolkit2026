import { recordAuditEventSafe } from '@/lib/server/audit';
import { notifyUser } from '@/lib/server/notifications';
import { notificationTemplates } from '@/lib/notification-templates';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { cocRequests, installations } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { toCocRequest } from '@/lib/server/request-serializers';

function generateVerificationToken() {
  return `verify-${randomBytes(32).toString('hex')}`;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const [existing] = await db.select().from(cocRequests).where(eq(cocRequests.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.status !== 'submitted') {
    return NextResponse.json({ error: 'Only submitted COC requests can be approved.' }, { status: 409 });
  }
  if (!existing.complianceCheck) {
    return NextResponse.json({ error: 'COC request is missing the technician compliance confirmation.' }, { status: 400 });
  }

  const updated = await db.transaction(async (tx) => {
    const now = new Date();
    const [request] = await tx.update(cocRequests)
      .set({
        status: 'approved',
        reviewedBy: session.name,
        reviewedAt: now,
        issuedDate: now.toISOString().slice(0, 10),
        reviewNote: null,
        verificationToken: existing.verificationToken ?? generateVerificationToken(),
      })
      .where(and(eq(cocRequests.id, id), eq(cocRequests.status, 'submitted')))
      .returning();
    if (!request) return null;
    if (request.installationId) {
      await tx.update(installations)
        .set({ status: 'approved', cocRequested: true, cocApproved: true, cocRequestId: request.id, cocApprovalDate: now, updatedAt: now })
        .where(eq(installations.id, request.installationId));
    }
    return request;
  });
  if (!updated) return NextResponse.json({ error: 'COC request is no longer pending review' }, { status: 409 });

  await notifyUser(updated.technicianId, notificationTemplates.cocDecision(true, updated.location));
  await recordAuditEventSafe({
    entityType: 'coc_request',
    entityId: updated.id,
    action: 'approved',
    previousStatus: 'submitted',
    newStatus: 'approved',
    performedBy: session.name,
    performedByRole: session.role,
  });
  return NextResponse.json(toCocRequest(updated));
}
