import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { technicians } from '@/db/schema/index';
import { ACTIVATION_PUBLIC_MESSAGE } from '@/lib/activation-eligibility';
import { issueActivationInvite } from '@/lib/server/activation-invite';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

// A registry technician with no login asks for an activation link. The link goes only to the email
// already on their registry record, and the answer is the same whether or not anything matched.
const PER_VISITOR_LIMIT = 6;
const PER_EMAIL_LIMIT = 3;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { registrationNumber?: unknown; email?: unknown };
  const registrationNumber = typeof body.registrationNumber === 'string' ? body.registrationNumber.trim().toUpperCase() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!registrationNumber || !email || registrationNumber.length > 40 || email.length > 254 || !email.includes('@')) {
    return NextResponse.json({ error: 'Enter your registration number and the email address on your registry record.' }, { status: 400 });
  }
  if (!checkRateLimit(`activate:${getClientIp(req)}`, PER_VISITOR_LIMIT, WINDOW_MS) || !checkRateLimit(`activate-email:${email}`, PER_EMAIL_LIMIT, WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many requests. Please try again in a few minutes.' }, { status: 429, headers: { 'Retry-After': '900' } });
  }

  try {
    const [match] = await db
      .select({ id: technicians.id, name: technicians.name, email: technicians.email, region: technicians.region })
      .from(technicians)
      .where(sql`upper(${technicians.registrationNumber}) = ${registrationNumber} AND lower(trim(${technicians.email})) = ${email}`)
      .limit(1);
    if (match) {
      await issueActivationInvite({
        email: match.email,
        region: match.region,
        invitedBy: 'self-service',
        invitedByName: 'the HEVACRAZ registry',
        log: { entityType: 'technician', entityId: match.id, label: match.name },
      });
    }
  } catch (error) {
    console.error('[activate-account] failed', error instanceof Error ? error.message : error);
  }
  return NextResponse.json({ message: ACTIVATION_PUBLIC_MESSAGE });
}
