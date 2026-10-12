import { NextResponse } from 'next/server';
import { and, asc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { emailLog, technicians, users } from '@/db/schema/index';
import { activationEligibility, type ActivationEligibility } from '@/lib/activation-eligibility';
import { requireRole } from '@/lib/server/auth';
import { issueActivationInvite } from '@/lib/server/activation-invite';

// Registry technicians who were imported without a login. GET counts who is waiting; POST emails
// activation links to a batch of them. Batches keep each request short and the email volume steady.
const BATCH_SIZE = 40;
// A link emailed this recently, and not failed or bounced, is not sent again by the batch button.
const RECENT_DAYS = 7;
// The mail provider allows only a couple of sends a second.
const PAUSE_BETWEEN_SENDS_MS = 600;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function classify() {
  const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);
  const [techs, accounts, recent] = await Promise.all([
    db.select({ id: technicians.id, name: technicians.name, email: technicians.email, region: technicians.region })
      .from(technicians).orderBy(asc(technicians.registrationNumber)),
    db.select({ email: users.email }).from(users).where(sql`${users.passwordHash} IS NOT NULL`),
    db.select({ email: emailLog.recipientEmail }).from(emailLog).where(and(
      eq(emailLog.emailType, 'account_activation'),
      inArray(emailLog.status, ['sent', 'delivered', 'delayed']),
      gte(emailLog.sentAt, since),
    )),
  ]);
  const withAccount = new Set(accounts.map((a) => a.email.toLowerCase()));
  const recentlyEmailed = new Set(recent.map((r) => r.email.trim().toLowerCase()));
  let awaiting = 0;
  const counts: Record<ActivationEligibility, number> = { eligible: 0, 'has-account': 0, 'no-email': 0, undeliverable: 0 };
  const eligible: typeof techs = [];
  for (const t of techs) {
    const state = activationEligibility({ email: t.email, hasWorkingAccount: !!t.email && withAccount.has(t.email.trim().toLowerCase()) });
    counts[state] += 1;
    if (state === 'eligible') {
      if (t.email && recentlyEmailed.has(t.email.trim().toLowerCase())) awaiting += 1;
      else eligible.push(t);
    }
  }
  return { total: techs.length, counts, eligible, awaiting };
}

export async function GET(req: Request) {
  try {
    await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }
  const { total, counts, eligible, awaiting } = await classify();
  return NextResponse.json({
    total,
    waiting: eligible.length,
    emailedAwaiting: awaiting,
    hasAccount: counts['has-account'],
    noEmail: counts['no-email'],
    undeliverable: counts.undeliverable,
  });
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
    let stoppedForQuota = false;
    const failed: Array<{ name: string; reason: string }> = [];
    for (const [index, t] of batch.entries()) {
      if (index > 0) await sleep(PAUSE_BETWEEN_SENDS_MS);
      const result = await issueActivationInvite({
        email: t.email,
        region: t.region,
        invitedBy: session.email,
        invitedByName: session.name,
        log: { entityType: 'technician', entityId: t.id, label: t.name },
      });
      if (result.outcome === 'sent') sent += 1;
      else if (result.outcome === 'failed') {
        failed.push({ name: t.name, reason: result.error ?? 'Not sent' });
        // Once the daily quota is used up every further send fails too, so stop and say so.
        if (/quota|rate limit|too many/i.test(result.error ?? '')) {
          stoppedForQuota = true;
          break;
        }
      }
    }
    const attempted = sent + failed.length;
    return NextResponse.json({ sent, failed, stoppedForQuota, remaining: Math.max(0, pool.length - attempted) });
  } catch (error) {
    console.error('[activation-invites] failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Could not send the activation links.' }, { status: 500 });
  }
}

