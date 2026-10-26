import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

// Every API route must check who is calling, unless it is on this reviewed list of public routes.
// Adding a route here is a deliberate decision: say why in the comment beside it.
const PUBLIC_ROUTES: Record<string, string> = {
  'auth/login': 'sign-in',
  'auth/logout': 'clears the cookie',
  'auth/activate-account': 'registry technician asks for an activation link, rate limited, same answer every time',
  'auth/password-reset/request': 'forgotten password, rate limited',
  'auth/password-reset/complete': 'token from the email',
  'contact': 'public contact form, rate limited',
  'invites/[token]': 'token in the link',
  'invites/[token]/accept': 'token in the link',
  'applications/verify-email': 'token in the email link',
  'applications/resend-verification': 'applicant flow, rate limited',
  'applications/documents': 'applicant upload, protected by the application token',
  'applications/documents/list': 'applicant flow, protected by the application token',
  'applications/documents/remove': 'applicant flow, protected by the application token',
  'public/certificates': 'public verification, rate limited',
  'public/coc-requests': 'public verification, rate limited',
  'public/refrigerants': 'public reference data, rate limited',
  'public/technicians': 'public verification, rate limited',
  'health': 'uptime check, reveals nothing',
};

const AUTH_MARKERS = [
  'requireRole', 'readSessionFromRequest', 'requireApprovedSupplier', 'requireSession',
  'CRON_SECRET', 'verifySvixSignature', 'verifyWebhookSignature', 'RESEND_WEBHOOK_SECRET',
];

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? routeFiles(full) : name === 'route.ts' ? [full] : [];
  });
}

describe('API route authentication', () => {
  const root = join(process.cwd(), 'app', 'api');
  const routes = routeFiles(root).map((file) => ({
    path: relative(root, file).split(sep).slice(0, -1).join('/'),
    source: readFileSync(file, 'utf8'),
  }));

  it('finds the routes', () => {
    expect(routes.length).toBeGreaterThan(100);
  });

  it('checks the caller in every route that is not on the public list', () => {
    const unguarded = routes
      .filter((r) => !(r.path in PUBLIC_ROUTES))
      .filter((r) => !AUTH_MARKERS.some((marker) => r.source.includes(marker)))
      .map((r) => r.path);
    expect(unguarded).toEqual([]);
  });

  it('does not keep public-list entries for routes that no longer exist', () => {
    const existing = new Set(routes.map((r) => r.path));
    expect(Object.keys(PUBLIC_ROUTES).filter((p) => !existing.has(p))).toEqual([]);
  });
});
