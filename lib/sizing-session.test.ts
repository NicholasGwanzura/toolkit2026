import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SizingInputs } from '@/types/index';
import {
  clearSizingDraft,
  deleteSizingSession,
  readSizingDraft,
  readSizingSessions,
  saveSizingSession,
  writeSizingDraft,
  type SizingSession,
} from './sizing-session';

const inputs = { step: 2, jobType: 'COLD_ROOM', roomWidth: 4, roomLength: 5 } as SizingInputs;

function session(overrides: Partial<SizingSession> = {}): SizingSession {
  return {
    id: crypto.randomUUID(),
    label: 'Case',
    savedAt: new Date().toISOString(),
    step: 2,
    calculator: 'wizard',
    inputs,
    superheatInputs: { suctionPressure: 3.2, suctionTemp: 8, liquidTemp: 28, liquidPressure: 7.7 },
    leakInputs: { leakRate: 12, refrigerantCode: 'R-32' },
    converter: { type: 'temperature', value: 25, from: 'C', to: 'F' },
    refrigerant: 'R-290',
    loadKw: 8.4,
    ...overrides,
  };
}

describe('sizing sessions', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as Record<string, unknown>).window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    };
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window;
  });

  it('migrates unnamed legacy cases into the technician store once', () => {
    const storage = (globalThis as unknown as { window: { localStorage: Storage } }).window.localStorage;
    storage.setItem('hevacraz-sizing-cases', JSON.stringify([{ id: 'old-1', savedAt: '2026-01-04T10:00:00.000Z', inputs, calculatedLoadKw: 6.1 }]));

    const migrated = readSizingSessions('tech-1');
    expect(migrated).toHaveLength(1);
    expect(migrated[0].id).toBe('old-1');
    expect(migrated[0].label).toBe('Untitled sizing case');
    expect(migrated[0].loadKw).toBe(6.1);
    expect(storage.getItem('hevacraz-sizing-cases')).toBeNull();

    const other = readSizingSessions('tech-2');
    expect(other).toEqual([]);
  });

  it('ignores legacy records without usable inputs', () => {
    (globalThis as unknown as { window: { localStorage: Storage } }).window.localStorage
      .setItem('hevacraz-sizing-cases', JSON.stringify([{ id: 'broken', inputs: { roomWidth: 'wide' } }]));
    expect(readSizingSessions('tech-1')).toEqual([]);
  });

  it('prepends new cases, dedupes by id and caps the store at 20', () => {
    let saved = saveSizingSession('tech-1', session({ id: 'a', label: 'A' }));
    for (let i = 0; i < 25; i += 1) saved = saveSizingSession('tech-1', session({ id: `n${i}` }));
    expect(saved).toHaveLength(20);
    expect(saved[0].id).toBe('n24');
    expect(saved.some((item) => item.id === 'a')).toBe(false);

    const again = saveSizingSession('tech-1', session({ id: 'n24', label: 'Renamed' }));
    expect(again).toHaveLength(20);
    expect(again[0].label).toBe('Renamed');
    expect(again.filter((item) => item.id === 'n24')).toHaveLength(1);
  });

  it('keeps drafts per technician and drops them when a case is saved', () => {
    writeSizingDraft('tech-1', { savedAt: '2026-05-05T08:00:00.000Z', step: 3, calculator: 'superheat', inputs, superheatInputs: { suctionPressure: 1, suctionTemp: 2, liquidTemp: 3, liquidPressure: 4 }, leakInputs: { leakRate: 1, refrigerantCode: 'R-744' }, converter: { type: 'mass', value: 1, from: 'kg', to: 'lb' }, refrigerant: 'R-744', loadKw: 0 });
    expect(readSizingDraft('tech-1')?.step).toBe(3);
    expect(readSizingDraft('tech-2')).toBeNull();

    saveSizingSession('tech-1', session());
    expect(readSizingDraft('tech-1')).toBeNull();

    clearSizingDraft('tech-2');
    expect(readSizingDraft('tech-2')).toBeNull();
  });

  it('deletes a single case without touching the others', () => {
    saveSizingSession('tech-1', session({ id: 'keep' }));
    const withDrop = saveSizingSession('tech-1', session({ id: 'drop' }));
    expect(withDrop).toHaveLength(2);
    const after = deleteSizingSession('tech-1', 'drop');
    expect(after.map((item) => item.id)).toEqual(['keep']);
  });

  it('lists the newest saved case first', () => {
    saveSizingSession('tech-1', session({ id: 'older', savedAt: '2026-02-02T00:00:00.000Z' }));
    saveSizingSession('tech-1', session({ id: 'newer', savedAt: '2026-09-09T00:00:00.000Z' }));
    const storage = (globalThis as unknown as { window: { localStorage: Storage } }).window.localStorage;
    storage.setItem('hevacraz-sizing-sessions:tech-1', JSON.stringify([session({ id: 'oldest', savedAt: '2026-01-01T00:00:00.000Z' }), session({ id: 'middle', savedAt: '2026-06-06T00:00:00.000Z' })]));

    expect(readSizingSessions('tech-1').map((item) => item.id)).toEqual(['middle', 'oldest']);
  });

  it('treats unreadable stored data as empty', () => {
    (globalThis as unknown as { window: { localStorage: Storage } }).window.localStorage
      .setItem('hevacraz-sizing-sessions:tech-1', '{not json');
    expect(readSizingSessions('tech-1')).toEqual([]);
  });
});
