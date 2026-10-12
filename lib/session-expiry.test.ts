import { describe, expect, it } from 'vitest';
import { shouldRedirectToLogin } from './session-expiry';

describe('shouldRedirectToLogin', () => {
  it('redirects from signed-in pages', () => {
    for (const path of ['/dashboard', '/admin/email-log', '/learn/manage', '/technician-registry', '/field-toolkit']) {
      expect(shouldRedirectToLogin(path)).toBe(true);
    }
  });
  it('leaves public pages alone', () => {
    for (const path of ['/', '/login', '/forgot-password', '/reset-password', '/activate-account', '/accept-invite', '/join', '/join/technician', '/verify-technician', '/verify-coc', '/verify-permit', '/contact', '/about']) {
      expect(shouldRedirectToLogin(path)).toBe(false);
    }
  });
});
