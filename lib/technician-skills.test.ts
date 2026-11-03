import { describe, expect, it } from 'vitest';
import { isTechnicianSkills, technicianSkillsLabel, TECHNICIAN_SKILLS } from './technician-skills';

describe('technician skills', () => {
  it('offers exactly the three choices, in order', () => {
    expect(TECHNICIAN_SKILLS.map((o) => o.label)).toEqual([
      'Local Assembly and Installation',
      'Servicing',
      'Both Local Assembly, Installation and Servicing',
    ]);
  });
  it('accepts only those choices', () => {
    expect(isTechnicianSkills('servicing')).toBe(true);
    expect(isTechnicianSkills('Servicing')).toBe(false);
    expect(isTechnicianSkills(undefined)).toBe(false);
  });
  it('shows older records honestly', () => {
    expect(technicianSkillsLabel('both')).toBe('Both Local Assembly, Installation and Servicing');
    expect(technicianSkillsLabel(null)).toBe('Not recorded');
  });
});
