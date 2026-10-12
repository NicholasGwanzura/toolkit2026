// What to do when an API call comes back 401 because the sign-in has expired (for example a tab left
// open overnight). Without this the page keeps asking, and failing, every minute.

const PUBLIC_PREFIXES = ['/login', '/forgot-password', '/reset-password', '/activate-account', '/accept-invite', '/join', '/verify', '/supplier-register', '/contact', '/about'];

/** Whether a 401 on this page means "send the person to sign in". Public pages manage their own errors. */
export function shouldRedirectToLogin(pathname: string): boolean {
  if (pathname === '/' || pathname === '') return false;
  return !PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}-`));
}

let redirecting = false;

/** Called on any 401 from the app's own API. Confirms the session really is gone, then goes to the login page once. */
export async function handleUnauthorized(): Promise<void> {
  if (typeof window === 'undefined' || redirecting || !shouldRedirectToLogin(window.location.pathname)) return;
  try {
    const response = await fetch('/api/auth/session', { credentials: 'include' });
    const data = await response.json().catch(() => ({})) as { user?: unknown };
    // A signed-in user means this 401 was a permissions problem, not an expired session.
    if (data.user) return;
  } catch {
    return; // Offline or the server is unreachable: do not log anyone out because of that.
  }
  redirecting = true;
  try {
    localStorage.removeItem('coolpro_user');
  } catch {
    // Storage can be unavailable; the redirect still works.
  }
  window.location.href = '/login';
}
