import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema/index';
import { signSession, sessionCookie } from '@/lib/server/auth';
import { verifyPassword } from '@/lib/server/password';
import { checkRateLimit, getClientIp, isRateLimited, resetRateLimit } from '@/lib/server/rate-limit';
import { applicantLoginStateFor } from '@/lib/server/applicant-lookup';
import type { UserSession } from '@/lib/session-types';

const LOGIN_RATE_LIMIT = 30;
const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;
// Wrong passwords for one account, from any address, before it is paused for the window.
const ACCOUNT_FAILURE_LIMIT = 8;

function toUserSession(user: typeof users.$inferSelect, region?: string): UserSession {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserSession['role'],
    region: region ?? user.region,
    isDemo: user.isDemo,
  };
}

export async function POST(req: Request) {
  if (!checkRateLimit(`login:${getClientIp(req)}`, LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(LOGIN_RATE_WINDOW_MS / 1000) } },
    );
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password || email.length > 254 || password.length > 1024) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const failureKey = `login-fail:${email}`;
  if (isRateLimited(failureKey, ACCOUNT_FAILURE_LIMIT)) {
    return NextResponse.json(
      { error: 'Too many failed attempts for this account. Please wait 15 minutes or reset your password.' },
      { status: 429, headers: { 'Retry-After': String(LOGIN_RATE_WINDOW_MS / 1000) } },
    );
  }

  let user: typeof users.$inferSelect | undefined;
  try {
    [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
  } catch (err) {
    // Keep credentials and connection strings out of logs while retaining enough
    // detail to diagnose production connectivity/configuration failures.
    const errorCode =
      typeof err === 'object' && err !== null && 'code' in err && typeof err.code === 'string'
        ? err.code
        : 'unknown';
    console.error('[auth/login] DB lookup failed:', { errorCode });
    return NextResponse.json({ error: 'Login service unavailable' }, { status: 500 });
  }

  // Generic error for both "no such user" and "wrong password" to avoid leaking
  // which emails are registered.
  const invalidCredentials = () => {
    checkRateLimit(failureKey, ACCOUNT_FAILURE_LIMIT, LOGIN_RATE_WINDOW_MS);
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  };

  if (!user || !user.passwordHash) {
    // No account yet. If this is someone whose application is still being processed (they know the
    // password they chose), tell them so instead of a bare "invalid password".
    if (!user) {
      const applicantState = await applicantLoginStateFor(email, password).catch(() => null);
      if (applicantState) {
        return NextResponse.json({ error: applicantState.message, code: applicantState.code }, { status: 403 });
      }
    }
    return invalidCredentials();
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    return invalidCredentials();
  }

  if (user.status !== 'active') {
    return NextResponse.json({ error: 'Account is not active' }, { status: 403 });
  }

  const sessionPayload = {
    id: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    region: user.region,
    sessionVersion: user.sessionVersion,
  };

  resetRateLimit(failureKey);
  const token = signSession(sessionPayload);

  return NextResponse.json(
    { user: toUserSession(user) },
    { status: 200, headers: { 'Set-Cookie': sessionCookie(token) } },
  );
}
