// One list of every reference the toolkit relies on. The Sizing Tool report, the Field Toolkit
// checklists and the Resources page all read from here so a link is fixed in one place.

export type ToolkitTool = 'Sizing Tool' | 'Field Toolkit' | 'WhatGas' | 'Safety Center';

export type ResourceCategory = 'Load and sizing' | 'Equipment selection' | 'Standards and regulation' | 'Refrigerant data';

export interface ToolkitResource {
  id: string;
  name: string;
  description: string;
  url: string;
  category: ResourceCategory;
  usedIn: ToolkitTool[];
}

export const RESOURCE_CATEGORIES: ResourceCategory[] = ['Load and sizing', 'Equipment selection', 'Standards and regulation', 'Refrigerant data'];

export const TOOLKIT_RESOURCES: ToolkitResource[] = [
  {
    id: 'ashrae-ch24',
    name: 'ASHRAE Handbook — Refrigerated-Facility Loads, Chapter 24 (2026)',
    description: 'Load categories and calculation guidance for transmission, product, infiltration, internal and equipment loads.',
    url: 'https://handbook.ashrae.org/Handbooks/R26/IP/R26_Ch24/r26_ch24_ip.aspx',
    category: 'Load and sizing',
    usedIn: ['Sizing Tool'],
  },
  {
    id: 'ashrae-ch19',
    name: 'ASHRAE Handbook — Thermal Properties of Foods, Chapter 19 (2026)',
    description: 'Food-specific thermal properties; values vary with composition and temperature.',
    url: 'https://handbook.ashrae.org/Handbooks/R26/IP/R26_Ch19/R26_ch19_ip.aspx',
    category: 'Load and sizing',
    usedIn: ['Sizing Tool'],
  },
  {
    id: 'ashrae-ch20',
    name: 'ASHRAE Handbook — Cooling and Freezing Times of Foods, Chapter 20 (2026)',
    description: 'Cooling and freezing-time methods and their dependence on product geometry, properties and heat transfer.',
    url: 'https://handbook.ashrae.org/Handbooks/R26/IP/R26_Ch20/r26_ch20_ip.aspx',
    category: 'Load and sizing',
    usedIn: ['Sizing Tool'],
  },
  {
    id: 'ashrae-handbook',
    name: 'ASHRAE Handbook — Refrigeration volume',
    description: 'Background for the indicative equipment and line sizes: system practices, line sizing velocities and oil return. Open the current edition and the chapter for your refrigerant.',
    url: 'https://handbook.ashrae.org/',
    category: 'Equipment selection',
    usedIn: ['Sizing Tool'],
  },
  {
    id: 'danfoss-coolselector',
    name: 'Danfoss Coolselector®2',
    description: 'Manufacturer component-selection and operating-condition cross-check; not a substitute for a room-load calculation.',
    url: 'https://www.danfoss.com/en/service-and-support/downloads/dcs/coolselector-2/',
    category: 'Equipment selection',
    usedIn: ['Sizing Tool'],
  },
  {
    id: 'copeland-selection',
    name: 'Copeland Product Selection Software',
    description: 'Manufacturer compressor and system performance and application-envelope cross-check.',
    url: 'https://www.copeland.com/en-us/tools-resources/product-selection-software',
    category: 'Equipment selection',
    usedIn: ['Sizing Tool'],
  },
  {
    id: 'ashrae-15-34',
    name: 'ASHRAE Refrigeration Resources — Standards 15 and 34',
    description: 'Refrigeration-system safety and refrigerant designation and classification; check current editions and applicable local rules.',
    url: 'https://www.ashrae.org/technical-resources/bookstore/ashrae-refrigeration-resources',
    category: 'Standards and regulation',
    usedIn: ['Sizing Tool', 'Safety Center'],
  },
  {
    id: 'sans-sabs',
    name: 'SANS 5001-1 and SANS 10142-1 (SABS)',
    description: 'Refrigeration installation practice and wiring of premises, referenced by the installation and re-gassing checklists. Standards are bought from SABS.',
    url: 'https://www.sabs.co.za',
    category: 'Standards and regulation',
    usedIn: ['Field Toolkit'],
  },
  {
    id: 'fgas',
    name: 'Fluorinated greenhouse gases (UNECE)',
    description: 'Overview of F-gas rules behind the nitrogen, leak-check and certification checklist items.',
    url: 'https://unece.org/environment-policy/air/environment-management-gases-fluoro-greenhouse-gases',
    category: 'Standards and regulation',
    usedIn: ['Field Toolkit'],
  },
  {
    id: 'zim-si-49',
    name: 'Zimbabwe S.I. 49 of 2023',
    description: 'Local regulatory context for controlled substances and related equipment; not a refrigeration sizing standard.',
    url: 'https://ozone.unep.org/sites/default/files/additional-reported-information/Licensing/Zimbabwe-S.I.%2049%20of%202023.pdf',
    category: 'Standards and regulation',
    usedIn: ['Sizing Tool', 'Field Toolkit'],
  },
  {
    id: 'zim-environment',
    name: 'Ministry of Environment (Zimbabwe)',
    description: 'Home of the Environmental Management Act, referenced for labelling and handling recovered refrigerant.',
    url: 'https://www.dmr.gov.zw',
    category: 'Standards and regulation',
    usedIn: ['Field Toolkit'],
  },
  {
    id: 'ozone-secretariat',
    name: 'UNEP Ozone Secretariat — Montreal Protocol and Kigali Amendment',
    description: 'Controlled substances, phase-down schedules and country information behind the classification flags.',
    url: 'https://ozone.unep.org',
    category: 'Standards and regulation',
    usedIn: ['WhatGas'],
  },
  {
    id: 'nist-refprop',
    name: 'NIST REFPROP',
    description: 'Reference thermodynamic and transport-property data for refrigerants and mixtures; software may require a license. The toolkit\'s own property estimates are approximate; use this for exact values.',
    url: 'https://www.nist.gov/programs-projects/reference-fluid-thermodynamic-and-transport-properties-database-refprop',
    category: 'Refrigerant data',
    usedIn: ['Sizing Tool'],
  },
  {
    id: 'ozonaction',
    name: 'UNEP OzonAction',
    description: 'Source of the trade-name and refrigerant data that WhatGas synchronises.',
    url: 'https://www.unep.org/ozonaction',
    category: 'Refrigerant data',
    usedIn: ['WhatGas'],
  },
];

export interface ResourceFilter {
  category?: ResourceCategory | 'all';
  tool?: ToolkitTool | 'all';
  query?: string;
}

/** Resources matching every filter. The query matches the name, description and tool names. */
export function filterResources(resources: ToolkitResource[], filter: ResourceFilter): ToolkitResource[] {
  const query = (filter.query ?? '').trim().toLowerCase();
  return resources.filter((r) => {
    if (filter.category && filter.category !== 'all' && r.category !== filter.category) return false;
    if (filter.tool && filter.tool !== 'all' && !r.usedIn.includes(filter.tool)) return false;
    if (!query) return true;
    return `${r.name} ${r.description} ${r.usedIn.join(' ')}`.toLowerCase().includes(query);
  });
}

/** The references the Sizing Tool report lists. */
export const SIZING_RESOURCES = TOOLKIT_RESOURCES.filter((r) => r.usedIn.includes('Sizing Tool'));
