import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { and, desc, eq, lt } from 'drizzle-orm';
import { db } from '@/db/client';
import { invites, users } from '@/db/schema/index';
import { requireRole } from '@/lib/server/auth';
import { recordAuditEventSafe } from '@/lib/server/audit';
import { sendInviteEmail } from '@/lib/server/email';
import { VALID_ROLES, type ValidRole } from '@/lib/roles';
import { SITE_URL } from '@/lib/site-url';

const INVITE_TTL_DAYS = 7;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITABLE_ROLES = VALID_ROLES as readonly string[];

function generateInviteToken() {
  return randomBytes(24).toString('base64url');
}

function inviteUrl(token: string) {
  return `${SITE_URL}/accept-invite?token=${token}`;
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const maybe = err as { code?: string; cause?: { code?: string } };
  return maybe.code === '23505' || maybe.cause?.code === '23505';
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  const body = await req.json().catch(() => ({})) as {
    email?: string;
    role?: string;
    region?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const role = body.role;
  const region = body.region?.trim();

  if (!email || !role || !region) {
    return NextResponse.json({ error: 'email, role, and region are required' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }
  if (!INVITABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Unknown role' }, { status: 400 });
  }
  if (role === 'vendor' || role === 'technician') {
    return NextResponse.json(
      { error: role === 'vendor'
        ? 'Supplier invitations must be created through Supplier Management so the invited business completes the supplier onboarding questionnaire.'
        : 'Technician access is created only after an approved technician application or an approved registry membership.' },
      { status: 400 },
    );
  }

  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser) {
    return NextResponse.json({ error: 'A user with that email already exists' }, { status: 409 });
  }

  await db
    .update(invites)
    .set({ status: 'expired' })
    .where(and(eq(invites.status, 'pending'), lt(invites.expiresAt, new Date())));

  const [existingInvite] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.email, email), eq(invites.status, 'pending')))
    .limit(1);
  if (existingInvite) {
    return NextResponse.json({ error: 'A pending invite already exists for that email' }, { status: 409 });
  }

  const token = generateInviteToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  let invite;
  try {
    [invite] = await db
      .insert(invites)
      .values({
        email,
        role: role as ValidRole,
        region,
        token,
        invitedBy: session.email,
        expiresAt,
      })
      .returning();
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: 'A pending invite already exists for that email' }, { status: 409 });
    }
    throw err;
  }

  const url = inviteUrl(token);
  const emailResult = await sendInviteEmail({
    email, inviteUrl: url, role, invitedBy: session.name,
    log: { entityType: 'invite', entityId: invite.id, label: role.replace('_', ' ') },
  });

  await recordAuditEventSafe({
    entityType: 'invite',
    entityId: invite.id,
    action: 'invited',
    newStatus: 'pending',
    performedBy: session.name,
    performedByRole: session.role,
    notes: `${role.replace('_', ' ')} invite for ${email}`,
  });

  return NextResponse.json({ invite, inviteUrl: url, emailSent: emailResult.sent }, { status: 201 });
}

export async function GET(req: Request) {
  try {
    await requireRole(req, ['org_admin']);
  } catch (e) {
    return e as Response;
  }

  await db
    .update(invites)
    .set({ status: 'expired' })
    .where(and(eq(invites.status, 'pending'), lt(invites.expiresAt, new Date())));

  const rows = await db.select().from(invites).orderBy(desc(invites.createdAt));
  return NextResponse.json({
    data: rows.map(row => ({
      ...row,
      token: row.status === 'pending' ? row.token : null,
    })),
  });
}
