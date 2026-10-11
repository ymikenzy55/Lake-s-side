import { createHash } from 'crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { socialLinks, whatsappLink, whatsappNumbers } from '@/lib/social';
import { googleAuthUrl, googleConfigured, googleRedirectUri, pkceChallenge } from '@/services/google';

describe('whatsapp numbers', () => {
  it('parses several numbers and strips formatting', () => {
    expect(whatsappNumbers('+233 598223472, +233 20-476-8685')).toEqual(['233598223472', '233204768685']);
  });
  it('ignores blanks and fragments', () => {
    expect(whatsappNumbers(' , 12, ')).toEqual([]);
  });
  it('builds wa.me links with an encoded message', () => {
    expect(whatsappLink('233598223472', 'Hi & hello')).toBe('https://wa.me/233598223472?text=Hi%20%26%20hello');
  });
  it('labels each WhatsApp line and keeps numbers out of labels', () => {
    const links = socialLinks({ whatsapp: '233598223472,233204768685', contact_phone: '+233 59 822 3472', contact_email: 'a@b.c', instagram: '', tiktok: 'https://tiktok.com/@x' });
    expect(links.map((l) => l.kind)).toEqual(['whatsapp', 'whatsapp', 'tiktok', 'phone', 'mail']);
    expect(links.every((l) => !/\d{6,}/.test(l.label))).toBe(true);
  });
});

describe('google sign-in', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('is off until both credentials are set', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(googleConfigured()).toBe(false);
    process.env.GOOGLE_CLIENT_ID = 'id';
    expect(googleConfigured()).toBe(false);
    process.env.GOOGLE_CLIENT_SECRET = 'secret';
    expect(googleConfigured()).toBe(true);
  });

  it('uses an S256 PKCE challenge', () => {
    const v = 'a'.repeat(64);
    expect(pkceChallenge(v)).toBe(createHash('sha256').update(v).digest('base64url'));
  });

  it('builds the authorisation URL with state, PKCE and the callback', () => {
    process.env.GOOGLE_CLIENT_ID = 'client-123';
    const url = new URL(googleAuthUrl('st4te', 'b'.repeat(64)));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('client-123');
    expect(url.searchParams.get('state')).toBe('st4te');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('redirect_uri')).toBe(googleRedirectUri());
    expect(googleRedirectUri()).toMatch(/\/api\/auth\/google\/callback$/);
  });
});
