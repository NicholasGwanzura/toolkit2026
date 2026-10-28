import { describe, expect, it } from 'vitest';
import { isAuthorizedCronRequest } from './cron-auth';

describe('isAuthorizedCronRequest', () => {
  const secret = 'test-cron-secret';

  it('accepts the exact bearer token', () => {
    expect(isAuthorizedCronRequest(`Bearer ${secret}`, secret)).toBe(true);
  });

  it('rejects a wrong, missing, or malformed token', () => {
    expect(isAuthorizedCronRequest('Bearer wrong', secret)).toBe(false);
    expect(isAuthorizedCronRequest(secret, secret)).toBe(false);
    expect(isAuthorizedCronRequest('', secret)).toBe(false);
    expect(isAuthorizedCronRequest(null, secret)).toBe(false);
  });

  it('rejects every request when no secret is configured', () => {
    expect(isAuthorizedCronRequest(`Bearer ${secret}`, undefined)).toBe(false);
    expect(isAuthorizedCronRequest(`Bearer ${secret}`, '')).toBe(false);
  });

  it('rejects tokens that differ in length without throwing', () => {
    expect(isAuthorizedCronRequest(`Bearer ${secret}extra`, secret)).toBe(false);
  });
});
