import { describe, expect, it } from 'vitest';
import { checkRateLimit, isRateLimited, publicLookupLimit, resetRateLimit } from './rate-limit';

describe('rate limit helpers', () => {
  it('checks without counting, and resets', () => {
    const key = `t-${Math.random()}`;
    expect(isRateLimited(key, 2)).toBe(false);
    checkRateLimit(key, 2, 60_000);
    checkRateLimit(key, 2, 60_000);
    expect(isRateLimited(key, 2)).toBe(true);
    expect(isRateLimited(key, 2)).toBe(true);
    resetRateLimit(key);
    expect(isRateLimited(key, 2)).toBe(false);
  });

  it('answers 429 with Retry-After once a visitor is over the public limit', async () => {
    const req = new Request('https://example.test/api/public/x', { headers: { 'x-real-ip': '203.0.113.9' } });
    const name = `n-${Math.random()}`;
    expect(publicLookupLimit(req, name, 2)).toBeNull();
    expect(publicLookupLimit(req, name, 2)).toBeNull();
    const blocked = publicLookupLimit(req, name, 2);
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get('Retry-After')).toBe('60');
  });

  it('counts visitors separately', () => {
    const name = `m-${Math.random()}`;
    const a = new Request('https://example.test', { headers: { 'x-real-ip': '203.0.113.1' } });
    const b = new Request('https://example.test', { headers: { 'x-real-ip': '203.0.113.2' } });
    expect(publicLookupLimit(a, name, 1)).toBeNull();
    expect(publicLookupLimit(a, name, 1)?.status).toBe(429);
    expect(publicLookupLimit(b, name, 1)).toBeNull();
  });
});
