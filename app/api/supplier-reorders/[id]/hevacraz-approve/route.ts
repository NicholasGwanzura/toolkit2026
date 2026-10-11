import { recordAuditEventSafe } from '@/lib/server/audit';
import { toSupplierReorder } from '@/lib/server/request-serializers';
import { notifyUser } from '@/lib/server/notifications';
import { notificationTemplates } from '@/lib/notification-templates';
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { supplierReorders } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const [updated] = await db
    .update(supplierReorders)
    .set({
      status: 'pending_nou',
      hevacrazReviewerId: session.id,
      hevacrazReviewedAt: new Date(),
    })
    .where(and(eq(supplierReorders.id, id), eq(supplierReorders.status, 'pending_hevacraz')))
    .returning();

  if (!updated) return NextResponse.json({ error: 'Reorder is missing or no longer awaiting HEVACRAZ review' }, { status: 409 });

  await notifyUser(updated.vendorId, notificationTemplates.reorderDecision({ approved: true, stage: 'hevacraz', gasType: updated.gasType, quantityKg: Number(updated.quantityKg), reason: updated.rejectionReason ?? undefined }));
  await recordAuditEventSafe({
    entityType: 'supplier_reorder',
    entityId: updated.id,
    action: 'hevacraz_approved',
    previousStatus: 'pending_hevacraz',
    newStatus: 'pending_nou',
    performedBy: session.name,
    performedByRole: session.role,
  });
  return NextResponse.json(toSupplierReorder(updated));
}
