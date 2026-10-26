// Converts what a technician knows (panel core and thickness) into the overall U-value the load calculation needs.

export type InsulationType = 'PU' | 'PIR' | 'EPS' | 'XPS' | 'MINERAL_WOOL';

export const INSULATION_TYPES: Record<InsulationType, { label: string; conductivity: number }> = {
  // Aged design conductivity, W/m·K.
  PU: { label: 'PU (polyurethane) panel', conductivity: 0.023 },
  PIR: { label: 'PIR panel', conductivity: 0.022 },
  EPS: { label: 'EPS (polystyrene) panel', conductivity: 0.036 },
  XPS: { label: 'XPS (extruded polystyrene)', conductivity: 0.034 },
  MINERAL_WOOL: { label: 'Mineral wool panel', conductivity: 0.040 },
};

export const COMMON_PANEL_THICKNESSES_MM = [50, 75, 80, 100, 120, 125, 150, 200];

// Inside + outside surface resistances (0.13 + 0.04 m²·K/W).
const SURFACE_RESISTANCE = 0.17;
// 150 mm concrete floor slab over the insulation (k ≈ 1.4 W/m·K).
const FLOOR_SLAB_RESISTANCE = 0.15 / 1.4;

export function panelUValue(type: InsulationType, thicknessMm: number): number {
  const insulation = Math.max(0, thicknessMm) / 1000 / INSULATION_TYPES[type].conductivity;
  return 1 / (SURFACE_RESISTANCE + insulation);
}

export function floorUValue(type: InsulationType, insulationMm: number): number {
  const insulation = Math.max(0, insulationMm) / 1000 / INSULATION_TYPES[type].conductivity;
  return 1 / (SURFACE_RESISTANCE + FLOOR_SLAB_RESISTANCE + insulation);
}
