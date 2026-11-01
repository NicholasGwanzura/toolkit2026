import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { routeRuleFor } from '@/lib/route-access';
import { ADMIN_NAV_SECTIONS, NAV_SECTIONS, activeHref, sectionsForRole, showsEmergencyMode } from './sidebar-nav';

const ROLES = ['technician', 'contractor', 'trainer', 'lecturer', 'vendor', 'student', 'org_admin'];
const allItems = [...NAV_SECTIONS, ...ADMIN_NAV_SECTIONS].flatMap((section) => section.items);

describe('sidebar links', () => {
  it('all lead to a page that exists', () => {
    for (const item of allItems) {
      expect(existsSync(join(process.cwd(), 'app/(app)', item.href, 'page.tsx')), item.href).toBe(true);
    }
  });
  it('never offer a role a page that would turn it away', () => {
    for (const role of ROLES.filter((r) => r !== 'org_admin')) {
      for (const section of sectionsForRole(role)) {
        for (const item of section.items) {
          expect(routeRuleFor(item.href)?.roles, `${role} -> ${item.href}`).toContain(role);
        }
      }
    }
  });
  it('appear once per menu', () => {
    for (const role of ROLES) {
      const hrefs = sectionsForRole(role).flatMap((s) => s.items.map((i) => i.href));
      expect(new Set(hrefs).size, role).toBe(hrefs.length);
    }
  });
  it('have no sections with a single item once filtered, apart from the top one', () => {
    for (const section of ADMIN_NAV_SECTIONS.filter((s) => s.label)) expect(section.items.length, section.label).toBeGreaterThan(1);
  });
});

describe('activeHref', () => {
  const trainer = sectionsForRole('trainer').flatMap((s) => s.items);
  const vendor = sectionsForRole('vendor').flatMap((s) => s.items);
  const admin = sectionsForRole('org_admin').flatMap((s) => s.items);
  it('picks the closest item only', () => {
    expect(activeHref(trainer, '/learn/manage')).toBe('/learn/manage');
    expect(activeHref(trainer, '/learn/manage/abc')).toBe('/learn/manage');
    expect(activeHref(trainer, '/learn')).toBe('/learn');
    expect(activeHref(vendor, '/suppliers/reorder')).toBe('/suppliers/reorder');
  });
  it('keeps a course page under the Learning Hub', () => {
    expect(activeHref(trainer, '/learn/some-course')).toBe('/learn');
  });
  it('does not treat every admin page as the Compliance Report', () => {
    expect(activeHref(admin, '/admin')).toBe('/admin');
    expect(activeHref(admin, '/admin/users/1')).toBe('/admin/users');
    expect(activeHref(admin, '/admin/unknown')).toBeNull();
  });
});

describe('showsEmergencyMode', () => {
  it('is hidden from suppliers and administrators', () => {
    expect(showsEmergencyMode('vendor')).toBe(false);
    expect(showsEmergencyMode('org_admin')).toBe(false);
    expect(showsEmergencyMode('technician')).toBe(true);
  });
});
