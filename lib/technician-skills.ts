// What a technician does within their RAC sub-sector. Stored as the value; shown as the label.
export const TECHNICIAN_SKILLS = [
  { value: 'installation_assembly', label: 'Local Assembly and Installation' },
  { value: 'servicing', label: 'Servicing' },
  { value: 'both', label: 'Both Local Assembly, Installation and Servicing' },
] as const;

export type TechnicianSkills = (typeof TECHNICIAN_SKILLS)[number]['value'];

export const isTechnicianSkills = (value: unknown): value is TechnicianSkills =>
  TECHNICIAN_SKILLS.some((option) => option.value === value);

/** The label to show. Technicians registered before this was asked show "Not recorded". */
export const technicianSkillsLabel = (value: string | null | undefined): string =>
  TECHNICIAN_SKILLS.find((option) => option.value === value)?.label ?? 'Not recorded';
