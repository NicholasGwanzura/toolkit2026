import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema/users';
import { SITE_URL } from '@/lib/site-url';
import { requireRole } from '@/lib/server/auth';
import { recordAuditEventSafe } from '@/lib/server/audit';
import { sendPasswordResetEmail } from '@/lib/server/email';
import { issuePasswordResetToken } from '@/lib/server/password-reset';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireRole(req, ['org_admin']);
  } catch (error) {
    return error as Response;
  }

  const { id } = await params;
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  if (user.id === session.id) {
    return NextResponse.json({ error: 'Use your own password settings to change your password.' }, { status: 400 });
  }
  if (user.status !== 'active' || !user.passwordHash) {
    return NextResponse.json({ error: 'This account cannot use password reset. Use the invitation workflow instead.' }, { status: 400 });
  }

  try {
    const { token } = await issuePasswordResetToken(user.id, { email: session.email, role: session.role });
    const resetUrl = new URL('/reset-password', SITE_URL);
    resetUrl.searchParams.set('token', token);
    const result = await sendPasswordResetEmail({ email: user.email, resetUrl: resetUrl.toString(), log: { entityType: 'user', entityId: user.id, label: user.name } });
    if (!result.sent) {
      return NextResponse.json({ error: 'The reset email could not be sent. Check the email service configuration and retry.' }, { status: 503 });
    }
    await recordAuditEventSafe({
      entityType: 'user',
      entityId: user.id,
      action: 'password-reset-link-sent',
      performedBy: session.name,
      performedByRole: session.role,
      notes: `Reset link emailed to ${user.email}`,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : 'unknown';
    console.error('[admin/password-reset] Link issuance failed:', { errorCode });
    return NextResponse.json({ error: 'Unable to issue a password reset link right now.' }, { status: 500 });
  }
}
