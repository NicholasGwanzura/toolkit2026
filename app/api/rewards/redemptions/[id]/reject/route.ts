import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { rewardRedemptions } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { toRewardRedemption } from '@/lib/server/reward-serializer';
import { notifyUser } from '@/lib/server/notifications';
import { notificationTemplates } from '@/lib/notification-templates';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { notes?: string };
  const reason = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : '';
  if (reason.length < 3) {
    return NextResponse.json({ error: 'Give the person a reason for rejecting this request.' }, { status: 400 });
  }

  const [row] = await db.select().from(rewardRedemptions).where(eq(rewardRedemptions.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.status !== 'requested') {
    return NextResponse.json({ error: `Cannot reject a redemption in status "${row.status}"` }, { status: 400 });
  }

  const [updated] = await db
    .update(rewardRedemptions)
    .set({ status: 'rejected', resolvedAt: new Date(), resolvedBy: session.name, notes: reason })
    .where(and(eq(rewardRedemptions.id, id), eq(rewardRedemptions.status, 'requested')))
    .returning();
  if (!updated) return NextResponse.json({ error: 'This redemption was already resolved by someone else.' }, { status: 409 });

  await notifyUser(updated.userId, notificationTemplates.rewardDecision({ fulfilled: false, rewardTitle: updated.rewardTitle, points: updated.pointsCost, reason }));
  return NextResponse.json(toRewardRedemption(updated));
}
