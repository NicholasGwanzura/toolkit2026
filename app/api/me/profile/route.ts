import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema/index';
import { readSessionFromRequest, sessionCookie, signSession } from '@/lib/server/auth';
import { recordAuditEventSafe } from '@/lib/server/audit';
import { validateProfile } from '@/lib/profile';
import type { UserSession } from '@/lib/session-types';

/** People edit their own name and region. Email and role stay with an administrator. */
export async function PATCH(req: Request) {
  const session = await readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Sign in again to change your profile.' }, { status: 401 });

  const checked = validateProfile(await req.json().catch(() => null));
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

  const [updated] = await db
    .update(users)
    .set({ name: checked.profile.name, region: checked.profile.region, updatedAt: new Date() })
    .where(and(eq(users.id, session.id), eq(users.status, 'active')))
    .returning();
  if (!updated) return NextResponse.json({ error: 'This account is no longer active.' }, { status: 403 });

  if (updated.name !== session.name || updated.region !== session.region) {
    await recordAuditEventSafe({
      entityType: 'user',
      entityId: updated.id,
      action: 'profile_updated',
      previousStatus: `${session.name}, ${session.region}`,
      newStatus: `${updated.name}, ${updated.region}`,
      performedBy: updated.name,
      performedByRole: session.role,
    });
  }

  const user: UserSession = { id: updated.id, name: updated.name, email: updated.email, role: updated.role as UserSession['role'], region: updated.region, isDemo: updated.isDemo };
  // A fresh session carries the new name, so new records are signed with it straight away.
  const { exp: _exp, ...claims } = session;
  return NextResponse.json({ user }, { headers: { 'Set-Cookie': sessionCookie(signSession({ ...claims, name: updated.name, region: updated.region })) } });
}
