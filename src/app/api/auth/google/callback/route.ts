import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { googleConfigured, googleProfileFromCode, googleRedirectUri, requestOrigin } from '@/services/google';
import { AuthService, AuthServiceError } from '@/domains/auth/service';
import { safeRedirectPath } from '@/lib/security/sanitize';

export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'ls_google_oauth'; // set by ../route.ts

const sameString = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Google redirects here after the visitor picks an account. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const origin = requestOrigin(request.headers);
  const fail = (code: string) => {
    const url = new URL('/login', origin);
    url.searchParams.set('error', code);
    const res = NextResponse.redirect(url);
    res.cookies.delete({ name: STATE_COOKIE, path: '/api/auth/google' });
    return res;
  };

  if (!googleConfigured()) return fail('google_unavailable');
  if (sp.get('error')) return fail('google_cancelled'); // e.g. access_denied when the visitor backs out

  let saved: { state?: string; verifier?: string; redirect?: string; callback?: string } = {};
  try {
    saved = JSON.parse(request.cookies.get(STATE_COOKIE)?.value ?? '{}');
  } catch {
    /* treated as missing below */
  }
  const code = sp.get('code');
  const state = sp.get('state') ?? '';
  // CSRF protection: the state must match the one we issued to this browser.
  if (!code || !saved.state || !saved.verifier || !sameString(state, saved.state)) return fail('google_expired');

  try {
    const profile = await googleProfileFromCode(code, saved.verifier, saved.callback ?? googleRedirectUri(origin));
    const user = await AuthService.loginWithGoogle(profile);
    const admin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    const dest = safeRedirectPath(saved.redirect, admin ? '/admin/dashboard' : '/');
    const res = NextResponse.redirect(new URL(dest, origin));
    res.cookies.delete({ name: STATE_COOKIE, path: '/api/auth/google' });
    return res;
  } catch (e) {
    if (e instanceof AuthServiceError) return fail(e.message.includes('disabled') ? 'account_disabled' : 'google_unverified');
    console.error('Google sign-in failed:', e);
    return fail('google_failed');
  }
}
