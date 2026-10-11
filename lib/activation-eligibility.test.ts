import { describe, expect, it } from 'vitest';
import { activationEligibility } from './activation-eligibility';

describe('activationEligibility', () => {
  it('is eligible with a real address and no working account', () => {
    expect(activationEligibility({ email: 'tendai@gmail.com', hasWorkingAccount: false })).toBe('eligible');
  });
  it('skips people who can already sign in', () => {
    expect(activationEligibility({ email: 'tendai@gmail.com', hasWorkingAccount: true })).toBe('has-account');
  });
  it('cannot invite without an email, or to a placeholder address', () => {
    expect(activationEligibility({ email: '  ', hasWorkingAccount: false })).toBe('no-email');
    expect(activationEligibility({ email: null, hasWorkingAccount: false })).toBe('no-email');
    expect(activationEligibility({ email: 'org@coolpro.demo', hasWorkingAccount: false })).toBe('undeliverable');
  });
});
