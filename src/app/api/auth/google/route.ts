import { NextResponse, type NextRequest } from 'next/server';
import { googleAuthUrl, googleConfigured } from '@/services/google';
import { randomToken } from '@/lib/security/tokens';
import { safeRedirectPath } from '@/lib/security/sanitize';
import { limitByIp } from '@/lib/security/rate-limit';
import { COOKIE_SECURE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const GOOGLE_STATE_COOKIE = 'ls_google_oauth'; // read back in ./callback/route.ts

/** Starts "Continue with Google": remembers state + PKCE verifier in a short-lived cookie, then hands off to Google. */
export async function GET(request: NextRequest) {
  const back = new URL('/login', request.url);
  if (!googleConfigured()) {
    back.searchParams.set('error', 'google_unavailable');
    return NextResponse.redirect(back);
  }
  if (!(await limitByIp('google-start', 20, 10 * 60_000)).ok) {
    back.searchParams.set('error', 'google_busy');
    return NextResponse.redirect(back);
  }

  const state = randomToken(16);
  const verifier = randomToken(32); // 64 hex chars: a valid PKCE code_verifier
  const redirect = safeRedirectPath(request.nextUrl.searchParams.get('redirect'), '');

  const res = NextResponse.redirect(googleAuthUrl(state, verifier));
  res.cookies.set(GOOGLE_STATE_COOKIE, JSON.stringify({ state, verifier, redirect }), {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax', // sent on Google's top-level redirect back to us
    maxAge: 10 * 60,
    path: '/api/auth/google',
  });
  return res;
}
