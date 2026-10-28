import { describe, expect, it } from 'vitest';
import { cleanChargeKg, cleanRefrigerantCode, parseNameplateSuggestion } from './nameplate-ai';

describe('cleanRefrigerantCode', () => {
  it('normalises the forms technicians see on plates', () => {
    expect(cleanRefrigerantCode('R410A')).toBe('R-410A');
    expect(cleanRefrigerantCode('r 134a')).toBe('R-134A');
    expect(cleanRefrigerantCode('R-1234yf')).toBe('R-1234YF');
  });

  it('drops anything that is not a refrigerant code', () => {
    expect(cleanRefrigerantCode('410A')).toBeNull();
    expect(cleanRefrigerantCode('R-')).toBeNull();
    expect(cleanRefrigerantCode(null)).toBeNull();
  });
});

describe('cleanChargeKg', () => {
  it('accepts a plausible weight and rounds it', () => {
    expect(cleanChargeKg(0.9)).toBe(0.9);
    expect(cleanChargeKg('1,25')).toBe(1.25);
    expect(cleanChargeKg(2.34567)).toBe(2.346);
  });

  it('rejects nonsense', () => {
    expect(cleanChargeKg(0)).toBeNull();
    expect(cleanChargeKg(-1)).toBeNull();
    expect(cleanChargeKg(20000)).toBeNull();
    expect(cleanChargeKg('n/a')).toBeNull();
  });
});

describe('parseNameplateSuggestion', () => {
  it('reads plain JSON', () => {
    const result = parseNameplateSuggestion('{"manufacturer":"Danfoss","model":"SZ185S4CC","serialNumber":"QL11 4980907","refrigerantCode":"R410A","chargeKg":0.9,"note":"split serial joined"}');
    expect(result).toEqual({
      manufacturer: 'Danfoss',
      model: 'SZ185S4CC',
      serialNumber: 'QL11 4980907',
      refrigerantCode: 'R-410A',
      chargeKg: 0.9,
      note: 'split serial joined',
    });
  });

  it('tolerates markdown fences and surrounding prose', () => {
    const result = parseNameplateSuggestion('Here you go:\n```json\n{"model":"SZ185S4CC"}\n```');
    expect(result?.model).toBe('SZ185S4CC');
    expect(result?.manufacturer).toBeNull();
  });

  it('returns null when there is no JSON to read', () => {
    expect(parseNameplateSuggestion(null)).toBeNull();
    expect(parseNameplateSuggestion('I could not read that plate.')).toBeNull();
    expect(parseNameplateSuggestion('{"model":')).toBeNull();
  });

  it('ignores fields of the wrong type and caps long text', () => {
    const result = parseNameplateSuggestion(JSON.stringify({ model: 123, note: 'x'.repeat(500) }));
    expect(result?.model).toBeNull();
    expect(result?.note).toHaveLength(200);
  });
});
