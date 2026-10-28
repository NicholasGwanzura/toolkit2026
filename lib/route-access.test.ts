import { describe, expect, it } from 'vitest';
import { isProtectedPath, matchesPath, routeRuleFor } from './route-access';

describe('matchesPath', () => {
  it('matches the exact path and its children only', () => {
    expect(matchesPath('/safety', '/safety')).toBe(true);
    expect(matchesPath('/safety/incidents', '/safety')).toBe(true);
    expect(matchesPath('/safety-center', '/safety')).toBe(false);
    expect(matchesPath('/safetyish', '/safety')).toBe(false);
  });
});

describe('isProtectedPath', () => {
  it('protects the safety center and its tabs', () => {
    expect(isProtectedPath('/safety-center')).toBe(true);
    expect(isProtectedPath('/safety-center/incidents')).toBe(true);
  });

  it('protects the existing dashboard and admin routes', () => {
    expect(isProtectedPath('/dashboard')).toBe(true);
    expect(isProtectedPath('/admin/users')).toBe(true);
    expect(isProtectedPath('/jobs/request-coc')).toBe(true);
  });

  it('leaves public pages open', () => {
    expect(isProtectedPath('/')).toBe(false);
    expect(isProtectedPath('/login')).toBe(false);
    expect(isProtectedPath('/verify-coc')).toBe(false);
    expect(isProtectedPath('/privacy')).toBe(false);
  });
});

describe('routeRuleFor', () => {
  it('uses the most specific rule regardless of declaration order', () => {
    expect(routeRuleFor('/suppliers/reorder')?.roles).toEqual(['vendor']);
    expect(routeRuleFor('/suppliers/approvals')?.roles).toEqual(['org_admin']);
    expect(routeRuleFor('/learn/manage/123')?.roles).toEqual(['trainer', 'lecturer']);
    expect(routeRuleFor('/jobs/request-coc')?.roles).toEqual(['technician', 'contractor']);
  });

  it('requires an authenticated role for the safety center', () => {
    expect(routeRuleFor('/safety-center')?.prefix).toBe('/safety-center');
    expect(routeRuleFor('/safety-center')?.roles).toContain('technician');
    expect(routeRuleFor('/safety-center')?.roles).toContain('student');
  });

  it('falls back to broader rules', () => {
    expect(routeRuleFor('/admin/users')?.prefix).toBe('/admin');
    expect(routeRuleFor('/suppliers')?.roles).toEqual(['vendor', 'org_admin']);
    expect(routeRuleFor('/learn')?.prefix).toBe('/learn');
  });

  it('returns nothing for unregistered paths', () => {
    expect(routeRuleFor('/')).toBeUndefined();
    expect(routeRuleFor('/verify-coc')).toBeUndefined();
  });
});
