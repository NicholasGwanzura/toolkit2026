import { describe, expect, it } from 'vitest';
import { addServiceRecord, equipmentStatus, nextServiceAfter, validateNewEquipment } from './equipment-record';

const good = { equipmentId: ' CR-01 ', clientName: 'Simbisa', province: 'Harare', refrigerantType: 'R-32', ashraeSafetyClass: 'A2L', lastServiceDate: '2026-10-01', nextServiceDue: '2027-04-01' };

describe('equipmentStatus', () => {
  it('works from the next service date', () => {
    expect(equipmentStatus('2026-10-31', '2026-11-01')).toBe('overdue');
    expect(equipmentStatus('2026-11-01', '2026-11-01')).toBe('due-soon');
    expect(equipmentStatus('2026-12-01', '2026-11-01')).toBe('due-soon');
    expect(equipmentStatus('2026-12-02', '2026-11-01')).toBe('normal');
  });
});

describe('validateNewEquipment', () => {
  it('accepts and tidies a complete record', () => {
    const result = validateNewEquipment(good);
    expect(result.ok && result.equipment.equipmentId).toBe('CR-01');
  });
  it('names what is missing', () => {
    expect(validateNewEquipment({ ...good, equipmentId: '' })).toEqual({ ok: false, error: 'Enter an equipment ID.' });
    expect(validateNewEquipment({ ...good, ashraeSafetyClass: 'X' })).toEqual({ ok: false, error: 'Choose the refrigerant safety class.' });
    expect(validateNewEquipment(null).ok).toBe(false);
  });
  it('rejects bad dates', () => {
    expect(validateNewEquipment({ ...good, lastServiceDate: 'soon' }).ok).toBe(false);
    expect(validateNewEquipment({ ...good, nextServiceDue: '2026-09-01' }).ok).toBe(false);
  });
});

describe('nextServiceAfter', () => {
  it('keeps the interval the record had', () => {
    expect(nextServiceAfter('2026-01-01', '2026-04-01', '2026-11-01')).toBe('2027-01-30');
  });
  it('falls back to 180 days when the dates give no interval', () => {
    expect(nextServiceAfter('unknown', '2026-04-01', '2026-11-01')).toBe('2027-04-30');
    expect(nextServiceAfter('2026-04-01', '2026-04-01', '2026-11-01')).toBe('2027-04-30');
  });
});

describe('addServiceRecord', () => {
  const entry = (id: string, notes: string) => ({ id, date: '2026-11-01', notes, technicianName: 'T', status: 'completed' as const });
  it('puts the newest first', () => {
    expect(addServiceRecord([entry('a', 'old')], entry('b', 'new')).map((r) => r.id)).toEqual(['b', 'a']);
  });
  it('replaces the entry when the same job completes again', () => {
    const result = addServiceRecord([entry('a', 'first')], entry('a', 'second'));
    expect(result).toHaveLength(1);
    expect(result[0].notes).toBe('second');
  });
  it('copes with no history', () => {
    expect(addServiceRecord(null, entry('a', 'x'))).toHaveLength(1);
  });
});
