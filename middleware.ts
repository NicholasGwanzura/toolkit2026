import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parseSessionUnsafe } from '@/lib/server/auth-edge';

const PROTECTED_ROUTE_PREFIXES = [
    '/dashboard',
    '/learn',
    '/sizing-tool',
    '/field-toolkit',
    '/whatgas',
    '/job-planner',
    '/field-scheduling',
    '/nou-dashboard',
    '/suppliers',
    '/supplier-compliance',
    '/jobs',
    '/certifications',
    '/rewards',
    '/admin',
    '/safety',
    '/resources',
    '/health-safety',
    '/technician-registry',
    '/refrigerants',
    '/emergency-mode',
    '/contractor-onboarding',
    '/field-operations',
    '/supplier-onboarding',
] as const;

const ROUTE_ROLE_RULES: Array<{ prefix: string; roles: string[] }> = [
    // Specific admin sub-routes must come before generic /admin to avoid being masked
    { prefix: '/admin/lecturers', roles: ['org_admin'] },
    { prefix: '/admin/students', roles: ['org_admin'] },
    { prefix: '/admin/technicians', roles: ['org_admin'] },
    { prefix: '/admin/certification-engine', roles: ['org_admin'] },
    { prefix: '/admin/accidents', roles: ['org_admin'] },
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
    { prefix: '/field-scheduling', roles: ['technician', 'contractor', 'org_admin'] },
    { prefix: '/jobs/request-coc', roles: ['technician', 'contractor'] },
    { prefix: '/jobs', roles: ['technician', 'contractor', 'org_admin'] },
    // Specific learn sub-routes before generic /learn
    { prefix: '/learn/approvals', roles: ['org_admin'] },
    { prefix: '/learn/manage', roles: ['trainer', 'lecturer'] },
    { prefix: '/learn', roles: ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin', 'student'] },
    { prefix: '/sizing-tool', roles: ['technician', 'contractor'] },
    { prefix: '/field-toolkit', roles: ['technician', 'contractor', 'org_admin'] },
    { prefix: '/whatgas', roles: ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin', 'student'] },
    { prefix: '/certifications', roles: ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin', 'student'] },
    { prefix: '/rewards', roles: ['technician', 'contractor', 'vendor', 'org_admin'] },
    { prefix: '/resources', roles: ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin'] },
    { prefix: '/safety', roles: ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin', 'student'] },
    { prefix: '/health-safety', roles: ['technician', 'contractor', 'trainer', 'lecturer', 'org_admin', 'student'] },
    { prefix: '/emergency-mode', roles: ['technician', 'contractor', 'trainer', 'lecturer', 'student'] },
    { prefix: '/dashboard', roles: ['technician', 'trainer', 'lecturer', 'vendor', 'org_admin', 'student', 'contractor'] },
    { prefix: '/contractor-onboarding', roles: ['contractor', 'org_admin'] },
    { prefix: '/refrigerants', roles: ['technician', 'contractor', 'trainer', 'lecturer', 'vendor', 'org_admin', 'student'] },
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const matchesPath = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

    const sessionToken = request.cookies.get('coolpro_session')?.value ?? null;
    const session = sessionToken ? parseSessionUnsafe(sessionToken) : null;

    const isAuthenticated = session !== null;
    const role = session?.role ?? null;

    const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some(prefix => matchesPath(pathname, prefix));

    if (isProtectedRoute && !isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    const isSupplierFlow = pathname === '/login' && request.nextUrl.searchParams.get('flow') === 'supplier';

    if (pathname === '/login' && isAuthenticated && !isSupplierFlow) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (role === 'org_admin') {
        return NextResponse.next();
    }

    const matchedRule = ROUTE_ROLE_RULES.find(({ prefix }) => matchesPath(pathname, prefix));
    if (matchedRule) {
        if (!role || !matchedRule.roles.includes(role)) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    if (pathname === '/') {
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
