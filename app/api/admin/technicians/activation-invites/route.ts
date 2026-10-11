import { NextResponse } from 'next/server';
import { asc, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { technicians, users } from '@/db/schema/index';
import { activationEligibility, type ActivationEligibility } from '@/lib/activation-eligibility';
import { requireRole } from '@/lib/server/auth';
import { issueActivationInvite } from '@/lib/server/activation-invite';

// Registry technicians who were imported without a login. GET counts who is waiting; POST emails
// activation links to a batch of them. Batches keep each request short and the email volume steady.
const BATCH_SIZE = 40;

async function classify() {
  const [techs, accounts] = await Promise.all([
    db.select({ id: technicians.id, name: technicians.name, email: technicians.email, region: technicians.region })
      .from(technicians).orderBy(asc(technicians.registrationNumber)),
    db.select({ email: users.email }).from(users).where(sql`${users.passwordHash} IS NOT NULL`),
  ]);
  const withAccount = new Set(accounts.map((a) => a.email.toLowerCase()));
  const counts: Record<ActivationEligibility, number> = { eligible: 0, 'has-account': 0, 'no-email': 0, undeliverable: 0 };
  const eligible: typeof techs = [];
  for (const t of techs) {
    const state = activationEligibility({ email: t.email, hasWorkingAccount: !!t.email && withAccount.has(t.email.trim().toLowerCase()) });
    counts[state] += 1;
    if (state === 'eligible') eligible.push(t);
  }
  return { total: techs.length, counts, eligible };
}

export async function GET(req: Request) {
  try {
    await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }
  const { total, counts } = await classify();
  return NextResponse.json({ total, waiting: counts.eligible, hasAccount: counts['has-account'], noEmail: counts['no-email'], undeliverable: counts.undeliverable });
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const body = await req.json().catch(() => ({})) as { ids?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.filter((v): v is string => typeof v === 'string').slice(0, BATCH_SIZE) : null;

  try {
    const { eligible } = await classify();
    const pool = ids ? eligible.filter((t) => ids.includes(t.id)) : eligible;
    const batch = pool.slice(0, BATCH_SIZE);

    let sent = 0;
    const failed: Array<{ name: string; reason: string }> = [];
    for (const t of batch) {
      const result = await issueActivationInvite({
        email: t.email,
        region: t.region,
        invitedBy: session.email,
        invitedByName: session.name,
        log: { entityType: 'technician', entityId: t.id, label: t.name },
      });
      if (result.outcome === 'sent') sent += 1;
      else if (result.outcome === 'failed') failed.push({ name: t.name, reason: result.error ?? 'Not sent' });
    }
    return NextResponse.json({ sent, failed, remaining: Math.max(0, pool.length - batch.length) });
  } catch (error) {
    console.error('[activation-invites] failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Could not send the activation links.' }, { status: 500 });
  }
}

