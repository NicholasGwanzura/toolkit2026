import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parseSessionUnsafe } from '@/lib/server/auth-edge';
import { isProtectedPath, routeRuleFor } from '@/lib/route-access';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const sessionToken = request.cookies.get('coolpro_session')?.value ?? null;
    const session = sessionToken ? parseSessionUnsafe(sessionToken) : null;

    const isAuthenticated = session !== null;
    const role = session?.role ?? null;

    if (isProtectedPath(pathname) && !isAuthenticated) {
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

    const matchedRule = routeRuleFor(pathname);
    if (matchedRule && (!role || !matchedRule.roles.includes(role))) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
