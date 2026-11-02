import { describe, expect, it } from 'vitest';
import { recordedTime, validClientRef } from './offline-record';

const now = new Date('2026-11-02T12:00:00Z');

describe('validClientRef', () => {
  it('accepts a device reference and nothing else', () => {
    expect(validClientRef('3f2b8c1e-9a4d-4c6b-8e2f-1a2b3c4d5e6f')).toBe('3f2b8c1e-9a4d-4c6b-8e2f-1a2b3c4d5e6f');
    expect(validClientRef('anything')).toBeNull();
    expect(validClientRef(undefined)).toBeNull();
  });
});

describe('recordedTime', () => {
  it('keeps the time the work was saved offline', () => {
    expect(recordedTime('2026-10-30T08:00:00Z', now).toISOString()).toBe('2026-10-30T08:00:00.000Z');
  });
  it('falls back to now for missing, future or very old times', () => {
    expect(recordedTime(undefined, now)).toBe(now);
    expect(recordedTime('2026-11-05T00:00:00Z', now)).toBe(now);
    expect(recordedTime('2025-01-01T00:00:00Z', now)).toBe(now);
    expect(recordedTime('nonsense', now)).toBe(now);
  });
});
