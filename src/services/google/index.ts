// Server-side only: "Sign in with Google" (OAuth 2.0 authorization code flow with PKCE).
// Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET; the redirect URI registered in Google Cloud must be
// exactly `${NEXT_PUBLIC_APP_URL}/api/auth/google/callback`.
import { createHash } from 'crypto';
import { APP_URL } from '@/lib/constants';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  givenName: string | null;
  familyName: string | null;
}

export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const googleRedirectUri = () => `${APP_URL.replace(/\/$/, '')}/api/auth/google/callback`;

/** PKCE S256 challenge for a verifier. */
export const pkceChallenge = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');

export function googleAuthUrl(state: string, verifier: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: pkceChallenge(verifier),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return `${AUTH_URL}?${params}`;
}

/** Exchanges the one-time code for tokens, then reads the profile straight from Google over TLS. */
export async function googleProfileFromCode(code: string, verifier: string): Promise<GoogleProfile> {
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(),
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenRes.ok) throw new Error(`Google token exchange failed (${tokenRes.status})`);
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) throw new Error('Google returned no access token');

  const infoRes = await fetch(USERINFO_URL, {
    headers: { authorization: `Bearer ${access_token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!infoRes.ok) throw new Error(`Google profile request failed (${infoRes.status})`);
  const info = (await infoRes.json()) as { sub?: string; email?: string; email_verified?: boolean; given_name?: string; family_name?: string };
  if (!info.sub || !info.email) throw new Error('Google profile is missing an id or email');

  return {
    sub: info.sub,
    email: info.email.toLowerCase(),
    emailVerified: info.email_verified === true,
    givenName: info.given_name?.slice(0, 60) ?? null,
    familyName: info.family_name?.slice(0, 60) ?? null,
  };
}
