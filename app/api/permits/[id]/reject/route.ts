import { recordAuditEventSafe } from '@/lib/server/audit';
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { tradePermits } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { toTradePermit } from '@/lib/server/request-serializers';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { notes?: string };

  const [updated] = await db
    .update(tradePermits)
    .set({ status: 'rejected', reviewedBy: session.name, reviewedAt: new Date(), reviewNote: body.notes ?? null })
    .where(and(eq(tradePermits.id, id), eq(tradePermits.status, 'pending')))
    .returning();

  if (!updated) return NextResponse.json({ error: 'Permit is missing or no longer pending review' }, { status: 409 });
  await recordAuditEventSafe({
    entityType: 'trade_permit',
    entityId: updated.id,
    action: 'rejected',
    previousStatus: 'pending',
    newStatus: 'rejected',
    performedBy: session.name,
    performedByRole: session.role,
    notes: body.notes ?? undefined,
  });
  return NextResponse.json(toTradePermit(updated));
}
