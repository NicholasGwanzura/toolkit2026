import { describe, expect, it } from 'vitest';
import { detectedFields, hasAnyDetails, overallConfidence, scanScore } from './nameplate-quality';

const profile = { id: 1 } as never;

describe('detectedFields', () => {
  it('counts only fields with text', () => {
    expect(detectedFields({ refrigerantCode: 'R-290', model: ' ', serialNumber: undefined, manufacturer: 'Danfoss' })).toBe(2);
    expect(hasAnyDetails({})).toBe(false);
  });
});

describe('scanScore', () => {
  it('prefers the attempt that found a registry refrigerant', () => {
    const withRegistry = scanScore({ refrigerantCode: 'R-134A', whatGasMatch: profile }, 40);
    const modelOnly = scanScore({ model: 'SZ185', serialNumber: 'QL11' }, 80);
    expect(withRegistry).toBeGreaterThan(modelOnly - 1);
    expect(scanScore({}, 90)).toBeLessThan(1);
  });
});

describe('overallConfidence', () => {
  it('averages the found fields and gives nothing for an empty scan', () => {
    expect(overallConfidence({ model: 'A1', serialNumber: 'B2' }, { model: 90, serialNumber: 70 })).toBe(0.8);
    expect(overallConfidence({}, {})).toBe(0);
  });
  it('caps a refrigerant the registry does not know at 0.5', () => {
    expect(overallConfidence({ refrigerantCode: 'R-999' }, { refrigerantCode: 95 })).toBe(0.5);
    expect(overallConfidence({ refrigerantCode: 'R-134A', whatGasMatch: profile }, { refrigerantCode: 95 })).toBe(0.95);
  });
});
