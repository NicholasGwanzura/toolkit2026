import { recordAuditEventSafe } from '@/lib/server/audit';
import { toSupplierReorder } from '@/lib/server/request-serializers';
import { notifyUser } from '@/lib/server/notifications';
import { notificationTemplates } from '@/lib/notification-templates';
import { NextResponse } from 'next/server';
import { and, eq, isNotNull, ne } from 'drizzle-orm';
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
      status: 'approved',
      nouReviewerId: session.id,
      nouReviewedAt: new Date(),
    })
    .where(and(
      eq(supplierReorders.id, id),
      eq(supplierReorders.status, 'pending_nou'),
      isNotNull(supplierReorders.hevacrazReviewerId),
      ne(supplierReorders.hevacrazReviewerId, session.id),
    ))
    .returning();

  if (!updated) return NextResponse.json({ error: 'A different admin must review the HEVACRAZ-approved reorder before this action' }, { status: 409 });

  await notifyUser(updated.vendorId, notificationTemplates.reorderDecision({ approved: true, stage: 'nou', gasType: updated.gasType, quantityKg: Number(updated.quantityKg), reason: updated.rejectionReason ?? undefined }));
  await recordAuditEventSafe({
    entityType: 'supplier_reorder',
    entityId: updated.id,
    action: 'nou_approved',
    previousStatus: 'pending_nou',
    newStatus: 'approved',
    performedBy: session.name,
    performedByRole: session.role,
  });
  return NextResponse.json(toSupplierReorder(updated));
}
