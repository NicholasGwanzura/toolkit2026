import { describe, expect, it } from 'vitest';
import { whatGasCatalogueStale, whatGasSyncDue } from './freshness';

const now = new Date('2026-11-01T12:00:00Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

describe('whatGasSyncDue', () => {
  it('runs when it has never run', () => {
    expect(whatGasSyncDue(null, null, now)).toBe(true);
  });
  it('waits a day after a success', () => {
    expect(whatGasSyncDue(hoursAgo(23), hoursAgo(23), now)).toBe(false);
    expect(whatGasSyncDue(hoursAgo(25), hoursAgo(25), now)).toBe(true);
  });
  it('waits an hour after a failed or running attempt', () => {
    expect(whatGasSyncDue(hoursAgo(30), hoursAgo(0.5), now)).toBe(false);
    expect(whatGasSyncDue(hoursAgo(30), hoursAgo(1), now)).toBe(true);
    expect(whatGasSyncDue(null, hoursAgo(0.5), now)).toBe(false);
  });
});

describe('whatGasCatalogueStale', () => {
  it('warns once a day has been missed, or if it has never run', () => {
    expect(whatGasCatalogueStale(hoursAgo(30), now)).toBe(false);
    expect(whatGasCatalogueStale(hoursAgo(37), now)).toBe(true);
    expect(whatGasCatalogueStale(null, now)).toBe(true);
  });
});
