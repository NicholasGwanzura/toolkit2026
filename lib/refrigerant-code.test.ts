import { describe, expect, it } from 'vitest';
import { extractCharge, extractRefrigerantCandidates, extractRefrigerantCode, normaliseRefrigerantCode } from './refrigerant-code';

describe('extractRefrigerantCode', () => {
  it('keeps four-digit codes whole instead of cutting them to another refrigerant', () => {
    expect(extractRefrigerantCode('Refrigerant R-1234yf')).toBe('R-1234YF');
    expect(extractRefrigerantCode('R-1234ze charge')).toBe('R-1234ZE');
    expect(extractRefrigerantCode('R-1233zd')).toBe('R-1233ZD');
    expect(extractRefrigerantCode('R-1270')).toBe('R-1270');
  });
  it('reads the usual codes however they are written', () => {
    expect(extractRefrigerantCode('TYPE R-134a')).toBe('R-134A');
    expect(extractRefrigerantCode('r404a')).toBe('R-404A');
    expect(extractRefrigerantCode('R 410A')).toBe('R-410A');
    expect(extractRefrigerantCode('R290 propane')).toBe('R-290');
    expect(extractRefrigerantCode('R-600a')).toBe('R-600A');
  });
  it('repairs the letter O or l read in place of a digit', () => {
    expect(extractRefrigerantCode('R-4O4A')).toBe('R-404A');
    expect(extractRefrigerantCode('R-l34a')).toBe('R-134A');
  });
  it('does not match inside other words or numbers', () => {
    expect(extractRefrigerantCode('CAUTION DO NOT OPEN')).toBeUndefined();
    expect(extractRefrigerantCode('model RX12345')).toBeUndefined();
    expect(extractRefrigerantCode('serial R1234567890')).toBeUndefined();
  });
  it('prefers the code next to the refrigerant label over one elsewhere', () => {
    const text = 'MODEL R32A-100 spare tag R-22 \n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n REFRIGERANT R-410A';
    expect(extractRefrigerantCandidates(text)[0]).toBe('R-410A');
  });
  it('returns every candidate so the caller can try each against the registry', () => {
    expect(extractRefrigerantCandidates('REFRIGERANT R-134a ... also R-22')).toEqual(['R-134A', 'R-22']);
  });
});

describe('normaliseRefrigerantCode', () => {
  it('gives one stored form', () => {
    expect(normaliseRefrigerantCode('r404a')).toBe('R-404A');
    expect(normaliseRefrigerantCode('R 410a')).toBe('R-410A');
  });
});

describe('extractCharge', () => {
  it('reads kilograms and grams', () => {
    expect(extractCharge('AMOUNT 0.90 ± 0.05 kg (1.98 lb)')).toEqual({ kg: 0.9, text: '0.90 kg' });
    expect(extractCharge('Charge: 450 g')).toEqual({ kg: 0.45, text: '450 g' });
    expect(extractCharge('quantite 1,2 kg')).toEqual({ kg: 1.2, text: '1,2 kg' });
  });
  it('ignores weights not tied to a charge word, and nonsense', () => {
    expect(extractCharge('unit weight 45 kg')).toBeUndefined();
    expect(extractCharge('amount 0 kg')).toBeUndefined();
    expect(extractCharge('')).toBeUndefined();
  });
});
