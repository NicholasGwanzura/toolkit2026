// Static checklist content for the Field Toolkit. Defined once, outside the components, so it
// is not rebuilt on every render and can be tested or reviewed on its own.
import type { JobType } from '@/types/index';
import { TOOLKIT_RESOURCES } from '@/lib/toolkit-resources';

export interface ChecklistItem {
  text: string;
  source: string | null;
  url: string | null;
}

export interface ChecklistCategory {
  category: string;
  items: ChecklistItem[];
}

export type ChecklistType = 'installation' | 'regassing';

/**
 * Bump this whenever the wording or the items change, so a saved checklist records which version
 * the technician actually ticked.
 */
export const CHECKLIST_VERSION = '2026-10-12';

const FLAMMABLE_CONTROLS: ChecklistCategory = {
  category: 'Flammable refrigerants (R-290, A2L and A3). Tick each line as done, or as not applicable for a non-flammable gas',
  items: [
    { text: 'Ignition sources identified, and removed or isolated from the work area', source: 'Manufacturer instructions and the refrigerant safety data sheet', url: null },
    { text: 'Flammable-gas leak detector available and tested before work starts', source: 'Manufacturer instructions and the refrigerant safety data sheet', url: null },
    { text: 'Work area ventilated, with no pits, drains or low spaces where gas can collect', source: 'Manufacturer instructions and the refrigerant safety data sheet', url: null },
    { text: 'Charge quantity checked against the maximum charge stated for this equipment and room', source: 'Nameplate and manufacturer instructions', url: null },
  ],
};

const resourceUrl = (id: string) => TOOLKIT_RESOURCES.find((r) => r.id === id)?.url ?? null;
const SABS = resourceUrl('sans-sabs');
const FGAS = resourceUrl('fgas');

const item = (text: string, source: string | null = null, url: string | null = null): ChecklistItem => ({ text, source, url });

export const INSTALLATION_CHECKLIST: ChecklistCategory[] = [
  { category: 'Pre-installation', items: [
    item('Site survey completed and documented', 'Industry Standard'),
    item('Equipment specification matches site requirements', 'Manufacturer Manual'),
    item('Adequate ventilation assessed', 'SANS 5001-1', SABS),
    item('Electrical supply verified (voltage, phase, earth)', 'SANS 10142-1', SABS),
  ] },
  { category: 'Nitrogen inert gas brazing', items: [
    item('Nitrogen cylinder with regulator in place', 'F-Gas Regulation', FGAS),
    item('Nitrogen flow rate set to 3-5 SCFH (slow bubble)', 'Manufacturer Guidelines'),
    item('All joints purged with nitrogen during brazing', 'Industry Best Practice'),
    item('No open flame without nitrogen protection', 'Safety Protocol'),
  ] },
  { category: 'Pressure test with dry nitrogen', items: [
    item('System isolated from compressors', 'SANS 5001-1', SABS),
    item('Test pressure selected from manufacturer limits and applicable approved procedure', 'Manufacturer Spec'),
    item('Record actual high-side and low-side test pressures and verify component ratings', 'Manufacturer Spec'),
    item('Pressure hold duration selected from the approved procedure and documented', 'Approved Procedure'),
    item('No pressure drop recorded', 'SANS 5001-1', SABS),
  ] },
  { category: 'Evacuation', items: [
    item('Deep vacuum pump connected (2-stage)', 'Equipment Manual'),
    item('Evacuation to 500 microns or lower', 'SANS 5001-1', SABS),
    item('Vacuum hold test: 30 minutes minimum', 'Manufacturer Guidelines'),
    item('Triple evacuation performed for systems >5m line set', 'Best Practice'),
  ] },
  FLAMMABLE_CONTROLS,
  { category: 'Charging the system', items: [
    item('Weighed charging method used (for HFC systems)', 'SANS 5001-1', SABS),
    item('Manufacturer-specified charge quantity verified', 'Nameplate Data'),
    item('Superheat and subcooling checked and adjusted', 'Manufacturer Guidelines'),
    item('System operating within design parameters', 'Commissioning Standard'),
  ] },
];

export const REGASSING_CHECKLIST: ChecklistCategory[] = [
  { category: 'Pre-service assessment', items: [
    item('Leak test performed and any leaks repaired', 'SANS 5001-1', SABS),
    item('System operating history reviewed', 'Service Protocol'),
    item('Correct refrigerant type confirmed from nameplate', 'Manufacturer Spec'),
    item('Recovery equipment tested and functional', 'F-Gas Certification', FGAS),
  ] },
  { category: 'Recovery', items: [
    item('Old refrigerant recovered using certified equipment', 'F-Gas Regulation', FGAS),
    item('Recovery cylinder labeled with refrigerant type and date', 'Environmental Act', resourceUrl('zim-environment')),
    item('Refrigerant recovered to 80% cylinder capacity', 'Best Practice'),
    item('Recovery log completed with weight recovered', 'Compliance Record'),
  ] },
  FLAMMABLE_CONTROLS,
  { category: 'Vacuum and recharge', items: [
    item('System evacuated to 500 microns', 'SANS 5001-1', SABS),
    item('Leak check performed after vacuum', 'Manufacturer Guidelines'),
    item('Weighed charging method used', 'SANS 5001-1', SABS),
    item('Charge quantity matches manufacturer specification', 'Nameplate'),
  ] },
  { category: 'Post-service verification', items: [
    item('System performance tested (amps, pressures, temps)', 'Commissioning'),
    item('Leak detection spray applied to all connections', 'Best Practice'),
    item('Customer briefed on system operation', 'Service Standard'),
    item('Service record completed and signed', 'Compliance'),
  ] },
];

export function checklistFor(type: ChecklistType): ChecklistCategory[] {
  return type === 'installation' ? INSTALLATION_CHECKLIST : REGASSING_CHECKLIST;
}

/** Stable id for a checklist line, used to remember what was ticked. */
export const checklistItemId = (type: ChecklistType, categoryIndex: number, itemIndex: number) => `${type}-${categoryIndex}-${itemIndex}`;

export const JOB_TYPE_OPTIONS: Array<{ value: JobType; label: string }> = [
  { value: 'COLD_ROOM', label: 'Cold Room' },
  { value: 'FREEZER_ROOM', label: 'Freezer Room' },
  { value: 'C40_FREEZER', label: 'C40 Freezer' },
  { value: 'C60_FREEZER', label: 'C60 Freezer' },
  { value: 'C90_FREEZER', label: 'C90 Freezer' },
];
