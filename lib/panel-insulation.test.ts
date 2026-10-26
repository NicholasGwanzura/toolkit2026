import { describe, expect, it } from 'vitest';
import { floorUValue, panelUValue } from './panel-insulation';

describe('panelUValue', () => {
  it('matches typical panel maker figures', () => {
    // 100 mm PU panel is quoted around 0.21–0.23 W/m²·K.
    expect(panelUValue('PU', 100)).toBeGreaterThan(0.2);
    expect(panelUValue('PU', 100)).toBeLessThan(0.24);
    // 150 mm PU freezer panel around 0.15.
    expect(panelUValue('PU', 150)).toBeGreaterThan(0.14);
    expect(panelUValue('PU', 150)).toBeLessThan(0.16);
  });

  it('gets worse with thinner panels and weaker cores', () => {
    expect(panelUValue('PU', 75)).toBeGreaterThan(panelUValue('PU', 100));
    expect(panelUValue('EPS', 100)).toBeGreaterThan(panelUValue('PU', 100));
  });
});

describe('floorUValue', () => {
  it('stays finite for an uninsulated slab', () => {
    expect(Number.isFinite(floorUValue('XPS', 0))).toBe(true);
    expect(floorUValue('XPS', 100)).toBeLessThan(floorUValue('XPS', 0));
  });
});
