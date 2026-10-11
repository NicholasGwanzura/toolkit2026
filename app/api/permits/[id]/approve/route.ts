import { recordAuditEventSafe } from '@/lib/server/audit';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { tradePermits } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { toTradePermit } from '@/lib/server/request-serializers';

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
  const issuedDate = new Date().toISOString().slice(0, 10);
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1);

  const [updated] = await db
    .update(tradePermits)
    .set({
      status: 'approved',
      reviewedBy: session.name,
      reviewedAt: new Date(),
      issuedDate,
      expiryDate: expiry.toISOString().slice(0, 10),
      verificationToken: generateVerificationToken(),
    })
    .where(and(eq(tradePermits.id, id), eq(tradePermits.status, 'pending')))
    .returning();

  if (!updated) return NextResponse.json({ error: 'Permit is missing or no longer pending review' }, { status: 409 });

  await recordAuditEventSafe({
    entityType: 'trade_permit',
    entityId: updated.id,
    action: 'approved',
    previousStatus: 'pending',
    newStatus: 'approved',
    performedBy: session.name,
    performedByRole: session.role,
  });
  return NextResponse.json(toTradePermit(updated));
}
