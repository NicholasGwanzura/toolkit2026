import { describe, expect, it } from 'vitest';
import { filterResources, RESOURCE_CATEGORIES, SIZING_RESOURCES, TOOLKIT_RESOURCES } from './toolkit-resources';

describe('TOOLKIT_RESOURCES', () => {
  it('has unique ids, https links and a known category for every entry', () => {
    const ids = TOOLKIT_RESOURCES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of TOOLKIT_RESOURCES) {
      expect(r.url.startsWith('https://')).toBe(true);
      expect(RESOURCE_CATEGORIES).toContain(r.category);
      expect(r.usedIn.length).toBeGreaterThan(0);
    }
  });
  it('keeps every source the sizing report used before', () => {
    const urls = SIZING_RESOURCES.map((r) => r.url);
    expect(urls).toContain('https://www.danfoss.com/en/service-and-support/downloads/dcs/coolselector-2/');
    expect(urls).toContain('https://www.nist.gov/programs-projects/reference-fluid-thermodynamic-and-transport-properties-database-refprop');
    expect(SIZING_RESOURCES.length).toBeGreaterThanOrEqual(8);
  });
});

describe('filterResources', () => {
  it('filters by tool, category and text', () => {
    expect(filterResources(TOOLKIT_RESOURCES, { tool: 'WhatGas' }).every((r) => r.usedIn.includes('WhatGas'))).toBe(true);
    expect(filterResources(TOOLKIT_RESOURCES, { category: 'Refrigerant data' }).every((r) => r.category === 'Refrigerant data')).toBe(true);
    expect(filterResources(TOOLKIT_RESOURCES, { query: ' copeland ' }).map((r) => r.id)).toEqual(['copeland-selection']);
    expect(filterResources(TOOLKIT_RESOURCES, { query: 'zzzz' })).toEqual([]);
  });
  it('returns everything with no filter', () => {
    expect(filterResources(TOOLKIT_RESOURCES, {})).toHaveLength(TOOLKIT_RESOURCES.length);
  });
});
