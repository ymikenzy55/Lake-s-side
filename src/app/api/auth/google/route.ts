import { NextResponse, type NextRequest } from 'next/server';
import { googleAuthUrl, googleConfigured, googleRedirectUri, requestOrigin } from '@/services/google';
import { randomToken } from '@/lib/security/tokens';
import { safeRedirectPath } from '@/lib/security/sanitize';
import { limitByIp } from '@/lib/security/rate-limit';
import { COOKIE_SECURE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const GOOGLE_STATE_COOKIE = 'ls_google_oauth'; // read back in ./callback/route.ts

/** Starts "Continue with Google": remembers state + PKCE verifier in a short-lived cookie, then hands off to Google. */
export async function GET(request: NextRequest) {
  const origin = requestOrigin(request.headers);
  const back = new URL('/login', origin);
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
  // Come back to the site the visitor is on (localhost, Vercel, custom domain), so this cookie is there
  // when Google returns. Google only accepts callbacks registered for the client, so the host can't be abused.
  const callback = googleRedirectUri(origin);

  const res = NextResponse.redirect(googleAuthUrl(state, verifier, callback));
  res.cookies.set(GOOGLE_STATE_COOKIE, JSON.stringify({ state, verifier, redirect, callback }), {
    httpOnly: true,
    secure: COOKIE_SECURE || origin.startsWith('https:'),
    sameSite: 'lax', // sent on Google's top-level redirect back to us
    maxAge: 10 * 60,
    path: '/api/auth/google',
  });
  return res;
}
