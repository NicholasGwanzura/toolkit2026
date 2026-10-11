import { describe, expect, it } from 'vitest';
import { INSTALLATION_CHECKLIST, REGASSING_CHECKLIST, checklistFor, checklistItemId } from './checklists';
import { ApiError } from '@/lib/api';
import { isRetryable } from '@/lib/gas-log-queue';

describe('checklists', () => {
  it('have content in every category', () => {
    for (const list of [INSTALLATION_CHECKLIST, REGASSING_CHECKLIST]) {
      expect(list.length).toBeGreaterThan(0);
      for (const category of list) expect(category.items.length).toBeGreaterThan(0);
    }
  });
  it('give every line a unique id', () => {
    const ids = (['installation', 'regassing'] as const).flatMap(type =>
      checklistFor(type).flatMap((category, c) => category.items.map((_, i) => checklistItemId(type, c, i))),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('isRetryable', () => {
  it('retries network failures, expired sessions and server faults', () => {
    expect(isRetryable(new TypeError('Failed to fetch'))).toBe(true);
    expect(isRetryable(new ApiError('Request failed: 401', 401))).toBe(true);
    expect(isRetryable(new ApiError('boom', 503))).toBe(true);
    expect(isRetryable(new ApiError('slow down', 429))).toBe(true);
  });
  it('does not retry data the server refused', () => {
    expect(isRetryable(new ApiError('amount must be positive', 400))).toBe(false);
    expect(isRetryable(new ApiError('Not found', 404))).toBe(false);
    expect(isRetryable(new Error('other'))).toBe(false);
  });
});
