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
  const [row] = await db.select().from(rewardRedemptions).where(eq(rewardRedemptions.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.status !== 'requested') {
    return NextResponse.json({ error: `Cannot fulfill a redemption in status "${row.status}"` }, { status: 400 });
  }

  const [updated] = await db
    .update(rewardRedemptions)
    .set({ status: 'fulfilled', resolvedAt: new Date(), resolvedBy: session.name })
    .where(and(eq(rewardRedemptions.id, id), eq(rewardRedemptions.status, 'requested')))
    .returning();
  if (!updated) return NextResponse.json({ error: 'This redemption was already resolved by someone else.' }, { status: 409 });

  await notifyUser(updated.userId, notificationTemplates.rewardDecision({ fulfilled: true, rewardTitle: updated.rewardTitle, points: updated.pointsCost }));
  return NextResponse.json(toRewardRedemption(updated));
}
