import { isIP } from 'node:net';

/**
 * In-memory, per-process rate limiter. Deliberately simple — this only holds correctly on a
 * single running instance (fine for the current one-instance deploy). If this service
 * is ever scaled to multiple instances, replace with a shared store (Redis, or a DB table)
 * since each instance would otherwise track its own independent counters.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

// Opportunistic cleanup so the map doesn't grow unbounded under sustained traffic.
const CLEANUP_THRESHOLD = 5000;

function cleanupExpired(now: number) {
  if (buckets.size < CLEANUP_THRESHOLD) return;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  cleanupExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** True when the key has already used up its allowance. Does not count as an attempt. */
export function isRateLimited(key: string, limit: number): boolean {
  const bucket = buckets.get(key);
  return !!bucket && Date.now() <= bucket.resetAt && bucket.count >= limit;
}

/** Forgets a key, for example after a successful login clears earlier failures. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * Limits a public lookup by visitor address. Returns a 429 response to send back when the visitor is
 * over the limit, or null when the request may go ahead.
 */
export function publicLookupLimit(req: Request, name: string, limit = 60, windowMs = 60_000): Response | null {
  if (checkRateLimit(`public:${name}:${getClientIp(req)}`, limit, windowMs)) return null;
  return new Response(JSON.stringify({ error: 'Too many requests. Please slow down and try again shortly.' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(windowMs / 1000)) },
  });
}

/**
 * The visitor's address, for rate limiting. Behind the reverse proxy the proxy sets X-Real-IP, or
 * appends the connecting address to the END of X-Forwarded-For. Anything a visitor sends themselves
 * sits earlier in that list, so only the last entry is trusted. If neither header yields a valid
 * address, everyone shares one bucket rather than being able to choose their own.
 */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp && isIP(realIp)) return realIp;

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const last = forwarded.split(',').map((part) => part.trim()).filter(Boolean).at(-1);
    if (last && isIP(last)) return last;
  }
  return 'unknown';
}
