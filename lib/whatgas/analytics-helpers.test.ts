import { describe, expect, it } from 'vitest';
import { fillMonths, mergeUsage, normalizeRefrigerantName } from './analytics-helpers';

describe('normalizeRefrigerantName', () => {
  it('treats spelling variants as one gas', () => {
    for (const v of ['R410A', 'r-410a', ' R 410A ', '410A', 'R-410a']) expect(normalizeRefrigerantName(v)).toBe('R-410A');
    expect(normalizeRefrigerantName('r22')).toBe('R-22');
    expect(normalizeRefrigerantName('R-134a')).toBe('R-134A');
  });
  it('keeps non-R names and fills blanks', () => {
    expect(normalizeRefrigerantName(' Propane ')).toBe('Propane');
    expect(normalizeRefrigerantName('')).toBe('Unspecified');
    expect(normalizeRefrigerantName(null)).toBe('Unspecified');
  });
});

describe('mergeUsage', () => {
  it('adds variants together, sorts and limits', () => {
    const out = mergeUsage([
      { refrigerant: 'R410A', totalKg: 5, count: 1 },
      { refrigerant: 'R-410A', totalKg: 7, count: 2 },
      { refrigerant: 'R22', totalKg: 10, count: 1 },
      { refrigerant: 'R32', totalKg: 1, count: 1 },
    ], 2);
    expect(out).toEqual([
      { refrigerant: 'R-410A', totalKg: 12, count: 3 },
      { refrigerant: 'R-22', totalKg: 10, count: 1 },
    ]);
  });
  it('can sort by count', () => {
    const out = mergeUsage([{ refrigerant: 'R22', totalKg: 100, count: 1 }, { refrigerant: 'R32', totalKg: 1, count: 5 }], 5, 'count');
    expect(out[0].refrigerant).toBe('R-32');
  });
});

describe('fillMonths', () => {
  it('returns every month, zero where there is no data, across a year boundary', () => {
    const out = fillMonths([{ month: '2026-11', totalKg: 3.5 }], new Date('2027-02-10T00:00:00Z'), 4);
    expect(out).toEqual([
      { month: '2026-11', totalKg: 3.5 },
      { month: '2026-12', totalKg: 0 },
      { month: '2027-01', totalKg: 0 },
      { month: '2027-02', totalKg: 0 },
    ]);
  });
});
