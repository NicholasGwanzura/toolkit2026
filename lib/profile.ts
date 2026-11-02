import { ZIMBABWE_PROVINCES } from '@/constants/registry';

export const MAX_NAME = 120;

/** What a person may change about themselves: a real-looking name and a province. */
export function validateProfile(value: unknown): { ok: true; profile: { name: string; region: string } } | { ok: false; error: string } {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name.trim().replace(/\s+/g, ' ') : '';
  const region = typeof raw.region === 'string' ? raw.region.trim() : '';
  if (name.length < 2) return { ok: false, error: 'Enter your full name.' };
  if (name.length > MAX_NAME) return { ok: false, error: `Your name must be ${MAX_NAME} characters or fewer.` };
  if (!/^[\p{L}][\p{L}\p{M}' .-]*$/u.test(name)) return { ok: false, error: 'Use letters, spaces, hyphens or apostrophes in your name.' };
  if (!ZIMBABWE_PROVINCES.some((province) => province.name === region)) return { ok: false, error: 'Choose your province.' };
  return { ok: true, profile: { name, region } };
}
