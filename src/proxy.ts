import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Optimistic edge checks only (cookie presence). Real authorisation — role,
 * expiry, isActive — is enforced server-side in `requireAdmin()` / `requireAuth()`.
 */
const PROTECTED = ['/account'];
const ADMIN = '/admin';
const GUEST_ONLY = ['/login', '/register', '/forgot-password'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get('cf_session')?.value);

  if (!hasSession && (pathname.startsWith(ADMIN) || PROTECTED.some((p) => pathname.startsWith(p)))) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && GUEST_ONLY.some((p) => pathname === p)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const res = NextResponse.next();
  if (pathname.startsWith(ADMIN)) {
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg|uploads|.*\..*).*)'],
};
