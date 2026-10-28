import { describe, expect, it } from 'vitest';
import { validateTrainingSession, TRAINING_LIMITS } from './training-session';

const valid = {
  title: 'Low-GWP Refrigerants',
  summary: 'Handling, safety and recovery of low-GWP refrigerants.',
  venue: 'Harare Polytechnic',
  province: 'Harare',
  startDate: new Date('2026-11-02T08:00:00Z'),
  endDate: new Date('2026-11-03T16:00:00Z'),
  feeUsd: 120,
  seats: 20,
};

describe('validateTrainingSession', () => {
  it('trims text fields and returns normalized values', () => {
    const result = validateTrainingSession({ ...valid, title: '  Low-GWP Refrigerants  ' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.title).toBe('Low-GWP Refrigerants');
  });

  it('rejects blank required fields', () => {
    for (const field of ['title', 'summary', 'venue', 'province'] as const) {
      const result = validateTrainingSession({ ...valid, [field]: '   ' });
      expect(result.ok).toBe(false);
    }
  });

  it('enforces the text length limits', () => {
    const result = validateTrainingSession({ ...valid, summary: 'x'.repeat(TRAINING_LIMITS.summary + 1) });
    expect(result.ok).toBe(false);
  });

  it('requires whole positive seats and a non-negative finite fee', () => {
    expect(validateTrainingSession({ ...valid, seats: 0 }).ok).toBe(false);
    expect(validateTrainingSession({ ...valid, seats: 2.5 }).ok).toBe(false);
    expect(validateTrainingSession({ ...valid, feeUsd: -1 }).ok).toBe(false);
    expect(validateTrainingSession({ ...valid, feeUsd: Number.NaN }).ok).toBe(false);
  });

  it('requires the end date to be after the start date', () => {
    expect(validateTrainingSession({ ...valid, endDate: valid.startDate }).ok).toBe(false);
    expect(validateTrainingSession({ ...valid, endDate: new Date('2026-10-31T08:00:00Z') }).ok).toBe(false);
  });

  it('rejects invalid dates', () => {
    expect(validateTrainingSession({ ...valid, startDate: new Date('not-a-date') }).ok).toBe(false);
  });
});
