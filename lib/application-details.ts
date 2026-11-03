import { technicianSkillsLabel } from '@/lib/technician-skills';
// The facts an administrator sees about an applicant in the "new application" email.
// Pure, so it can be tested without a database.

export interface DetailRow {
  label: string;
  value: string;
}

function rows(entries: Array<[string, unknown]>): DetailRow[] {
  return entries
    .map(([label, value]) => [label, value === null || value === undefined ? '' : String(value).trim()] as const)
    .filter(([, value]) => value !== '')
    .map(([label, value]) => ({ label, value }));
}

function excerpt(text: string, max = 280): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function technicianDetails(row: {
  contactNumber: string;
  province: string;
  district: string;
  specialization: string;
  technicianSkills?: string | null;
  employmentStatus: string;
  employer: string | null;
  yearsExperience: number;
  registrationNumber: string;
}): DetailRow[] {
  return rows([
    ['Phone', row.contactNumber],
    ['Location', [row.district, row.province].filter(Boolean).join(', ')],
    ['RAC Sub-sector', row.specialization],
    ['Technician Skills', technicianSkillsLabel(row.technicianSkills)],
    ['Employment', row.employer ? `${row.employmentStatus} at ${row.employer}` : row.employmentStatus],
    ['Experience', `${row.yearsExperience} years`],
    ['Registry number', row.registrationNumber],
  ]);
}

export function studentDetails(row: {
  phone: string;
  polytech: string;
  fieldOfStudy: string;
  studentIdNumber: string;
  enrolmentYear: number;
}): DetailRow[] {
  return rows([
    ['Phone', row.phone],
    ['Institution', row.polytech],
    ['Field of study', row.fieldOfStudy],
    ['Student ID', row.studentIdNumber],
    ['Enrolment year', row.enrolmentYear],
  ]);
}

export function supplierDetails(row: {
  companyName: string;
  phone: string;
  province: string;
  city: string;
  supplierType: string;
  registrationNumber: string;
}): DetailRow[] {
  return rows([
    ['Company', row.companyName],
    ['Type', row.supplierType],
    ['Phone', row.phone],
    ['Location', [row.city, row.province].filter(Boolean).join(', ')],
    ['Company registration', row.registrationNumber],
  ]);
}

export function professionalDetails(row: {
  role: string;
  phone: string;
  region: string;
  organisation: string | null;
  experienceSummary: string;
  details: unknown;
}): DetailRow[] {
  const extra = (row.details && typeof row.details === 'object' ? row.details : {}) as Record<string, unknown>;
  return rows([
    [row.role === 'contractor' ? 'Company' : 'Institution', row.organisation],
    ['Phone', row.phone],
    ['Province', row.region],
    ...(row.role === 'contractor'
      ? ([
          ['Main trade', extra.tradeSpecialization],
          ['Team size', extra.teamSize],
          ['Years operating', extra.yearsInOperation],
          ['Safety certification', extra.hasSafetyCertification],
        ] as Array<[string, unknown]>)
      : []),
    ['About them', excerpt(row.experienceSummary)],
  ]);
}
