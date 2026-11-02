import { describe, expect, it } from 'vitest';
import { validateProfile } from './profile';

describe('validateProfile', () => {
  it('accepts and tidies a name and province', () => {
    expect(validateProfile({ name: '  Tariro   Moyo-Dube ', region: 'Harare' })).toEqual({ ok: true, profile: { name: 'Tariro Moyo-Dube', region: 'Harare' } });
    expect(validateProfile({ name: "N'Dlovu", region: 'Bulawayo' }).ok).toBe(true);
  });
  it('rejects a missing or odd name, or an unknown province', () => {
    expect(validateProfile({ name: 'T', region: 'Harare' }).ok).toBe(false);
    expect(validateProfile({ name: '<script>', region: 'Harare' }).ok).toBe(false);
    expect(validateProfile({ name: 'Tariro', region: 'Atlantis' }).ok).toBe(false);
    expect(validateProfile(null).ok).toBe(false);
  });
});
