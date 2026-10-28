export const PROTECTED_ROUTE_PREFIXES = [
  '/dashboard',
  '/learn',
  '/sizing-tool',
  '/field-toolkit',
  '/whatgas',
  '/job-planner',
  '/nou-dashboard',
  '/suppliers',
  '/supplier-compliance',
  '/jobs',
  '/certifications',
  '/rewards',
  '/admin',
  '/safety',
  '/safety-center',
  '/resources',
  '/health-safety',
  '/technician-registry',
  '/refrigerants',
  '/emergency-mode',
  '/contractor-onboarding',
  '/field-operations',
  '/supplier-onboarding',
] as const;

export interface RouteRoleRule {
  prefix: string;
  roles: readonly string[];
}

export const ROUTE_ROLE_RULES: readonly RouteRoleRule[] = [
  { prefix: '/admin/reporting', roles: ['org_admin'] },
  { prefix: '/admin/refrigerants', roles: ['org_admin'] },
  { prefix: '/admin/contractors', roles: ['org_admin'] },
  { prefix: '/admin', roles: ['org_admin'] },
  { prefix: '/nou-dashboard', roles: ['org_admin'] },
  { prefix: '/suppliers/approvals', roles: ['org_admin'] },
  { prefix: '/suppliers/reorder', roles: ['vendor'] },
  { prefix: '/suppliers/verify-buyer', roles: ['vendor'] },
  { prefix: '/suppliers', roles: ['vendor', 'org_admin'] },
  { prefix: '/supplier-compliance', roles: ['vendor'] },
  { prefix: '/supplier-onboarding', roles: ['vendor', 'org_admin'] },
  { prefix: '/technician-registry', roles: ['trainer', 'lecturer', 'org_admin'] },
  { prefix: '/job-planner', roles: ['technician', 'contractor'] },
  { prefix: '/field-operations', roles: ['technician', 'contractor', 'org_admin'] },
  { prefix: '/jobs/request-coc', roles: ['technician', 'contractor'] },
  { prefix: '/jobs', roles: ['technician', 'contractor', 'org_admin'] },
  { prefix: '/learn/approvals', roles: ['org_admin'] },
  { prefix: '/learn/manage', roles: ['trainer', 'lecturer'] },
  { prefix: '/learn', roles: ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin', 'student'] },
  { prefix: '/sizing-tool', roles: ['technician', 'contractor'] },
  { prefix: '/field-toolkit', roles: ['technician', 'contractor', 'org_admin'] },
  { prefix: '/whatgas', roles: ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin', 'student'] },
  { prefix: '/certifications', roles: ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin', 'student'] },
  { prefix: '/rewards', roles: ['technician', 'contractor', 'vendor', 'org_admin'] },
  { prefix: '/resources', roles: ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin'] },
  { prefix: '/safety-center', roles: ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin', 'student'] },
  { prefix: '/safety', roles: ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin', 'student'] },
  { prefix: '/health-safety', roles: ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin', 'student'] },
  { prefix: '/emergency-mode', roles: ['technician', 'contractor', 'trainer', 'lecturer', 'student'] },
  { prefix: '/dashboard', roles: ['technician', 'trainer', 'lecturer', 'vendor', 'org_admin', 'student', 'contractor'] },
  { prefix: '/contractor-onboarding', roles: ['contractor', 'org_admin'] },
  { prefix: '/refrigerants', roles: ['technician', 'contractor', 'trainer', 'lecturer', 'vendor', 'org_admin', 'student'] },
];

export function matchesPath(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => matchesPath(pathname, prefix));
}

/**
 * Returns the most specific rule for a path. Longest-prefix matching keeps the result stable
 * regardless of declaration order, so adding a narrower rule cannot be masked by a broader one.
 */
export function routeRuleFor(pathname: string): RouteRoleRule | undefined {
  let matched: RouteRoleRule | undefined;
  for (const rule of ROUTE_ROLE_RULES) {
    if (!matchesPath(pathname, rule.prefix)) continue;
    if (!matched || rule.prefix.length > matched.prefix.length) matched = rule;
  }
  return matched;
}
