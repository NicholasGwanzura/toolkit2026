import { NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { rewardRedemptions } from '@/db/schema/index';
import { readSessionFromRequest, requireRole } from '@/lib/server/auth';
import { requireApprovedSupplier } from '@/lib/server/supplier-access';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { computeTechnicianRewardSummary, computeVendorRewardSummary } from '@/lib/server/rewards';
import { TECHNICIAN_REWARDS, VENDOR_REWARDS } from '@/constants/rewards';
import { toRewardRedemption } from '@/lib/server/reward-serializer';

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function GET(req: Request) {
  const session = await readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows =
    session.role === 'org_admin'
      ? await db.select().from(rewardRedemptions).orderBy(desc(rewardRedemptions.requestedAt))
      : await db
          .select()
          .from(rewardRedemptions)
          .where(eq(rewardRedemptions.userId, session.id))
          .orderBy(desc(rewardRedemptions.requestedAt));

  return NextResponse.json(rows.map(toRewardRedemption));
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['technician', 'contractor', 'vendor']);
    if (session.role === 'vendor') session = await requireApprovedSupplier(req);
  } catch (e) {
    return e as Response;
  }

  if (!checkRateLimit(`reward-redemption:${session.id}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many redemption requests. Try again shortly.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({})) as { rewardId?: string };
  const catalog = session.role === 'vendor' ? VENDOR_REWARDS : TECHNICIAN_REWARDS;
  const reward = catalog.find(r => r.id === body.rewardId);
  if (!reward) {
    return NextResponse.json({ error: 'Unknown rewardId' }, { status: 400 });
  }

  const userId = session.id;
  const result = await db.transaction(async (tx) => {
    // Serialise redemptions per person: the balance check and the insert must not interleave with
    // another request from the same account, or the same points could be spent twice.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}::text))`);

    const summary = session.role === 'vendor'
      ? await computeVendorRewardSummary(session.id, session.email)
      : await computeTechnicianRewardSummary(session.id);
    if (summary.availablePoints < reward.points) {
      return { error: `Not enough points. Available: ${summary.availablePoints}, required: ${reward.points}.` } as const;
    }

    const [row] = await tx
      .insert(rewardRedemptions)
      .values({
        userId: session.id,
        userName: session.name,
        userEmail: session.email,
        userRole: session.role as typeof rewardRedemptions.$inferInsert['userRole'],
        rewardId: reward.id,
        rewardTitle: reward.title,
        pointsCost: reward.points,
        status: 'requested',
        requestedAt: new Date(),
      })
      .returning();
    return { inserted: row } as const;
  });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  const inserted = result.inserted;

  return NextResponse.json(toRewardRedemption(inserted), { status: 201 });
}
