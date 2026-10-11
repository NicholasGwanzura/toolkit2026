// Whether a registry technician can be sent a link to create their login. Pure, so it can be tested.

import { isUndeliverableAddress } from '@/lib/deliverable-address';

export type ActivationEligibility = 'eligible' | 'has-account' | 'no-email' | 'undeliverable';

export function activationEligibility(input: { email: string | null | undefined; hasWorkingAccount: boolean }): ActivationEligibility {
  const email = input.email?.trim() ?? '';
  if (!email) return 'no-email';
  if (isUndeliverableAddress(email)) return 'undeliverable';
  if (input.hasWorkingAccount) return 'has-account';
  return 'eligible';
}

export const ACTIVATION_INVITE_DAYS = 14;

/** What the public "activate my account" form answers, whatever the outcome, so it cannot be used to probe the registry. */
export const ACTIVATION_PUBLIC_MESSAGE =
  'If those details match a technician in the HEVACRAZ registry, we have emailed a link to the address on file so you can create your password. Check your spam folder too. The link works for 14 days.';
