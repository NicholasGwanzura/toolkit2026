import { randomBytes } from 'crypto';
import { and, eq, lt, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { invites, users } from '@/db/schema/index';
import { activationEligibility, ACTIVATION_INVITE_DAYS } from '@/lib/activation-eligibility';
import { sendInviteEmail, type EmailLogContext } from '@/lib/server/email';
import { SITE_URL } from '@/lib/site-url';

export type ActivationOutcome = 'sent' | 'has-account' | 'no-email' | 'undeliverable' | 'failed';

/**
 * Emails a registry technician a link to create their password. Safe to call again: an out-of-date
 * pending invite is retired first (it would otherwise block the new one and leave the emailed link
 * pointing at nothing), and a link that is still valid is sent again instead of a second being made.
 * Never throws.
 */
export async function issueActivationInvite(input: {
  email: string | null | undefined;
  region: string;
  invitedBy: string;
  invitedByName: string;
  log?: EmailLogContext;
}): Promise<{ outcome: ActivationOutcome; error?: string }> {
  const email = input.email?.trim().toLowerCase() ?? '';
  try {
    const [account] = email ? await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.email, email)).limit(1) : [];
    const eligibility = activationEligibility({ email, hasWorkingAccount: !!account?.passwordHash });
    if (eligibility !== 'eligible') return { outcome: eligibility };

    await db.update(invites).set({ status: 'expired' }).where(and(eq(invites.email, email), eq(invites.status, 'pending'), lt(invites.expiresAt, sql`now()`)));

    let [pending] = await db.select({ token: invites.token }).from(invites).where(and(eq(invites.email, email), eq(invites.status, 'pending'))).limit(1);
    if (!pending) {
      const token = randomBytes(24).toString('base64url');
      const expiresAt = new Date(Date.now() + ACTIVATION_INVITE_DAYS * 24 * 60 * 60 * 1000);
      try {
        await db.insert(invites).values({ email, role: 'technician', region: input.region, token, invitedBy: input.invitedBy, expiresAt });
        pending = { token };
      } catch {
        // Another request created it a moment ago; use that one.
        [pending] = await db.select({ token: invites.token }).from(invites).where(and(eq(invites.email, email), eq(invites.status, 'pending'))).limit(1);
      }
    }
    if (!pending) return { outcome: 'failed', error: 'Could not create the activation link.' };

    const result = await sendInviteEmail({
      email,
      inviteUrl: `${SITE_URL}/accept-invite?token=${pending.token}`,
      role: 'technician',
      invitedBy: input.invitedByName,
      log: { type: 'account_activation', ...input.log },
    });
    return result.sent ? { outcome: 'sent' } : { outcome: 'failed', error: result.error };
  } catch (error) {
    console.error('[activation-invite] failed', error instanceof Error ? error.message : error);
    return { outcome: 'failed', error: 'Could not send the activation link.' };
  }
}
