import { describe, expect, it } from 'vitest';
import { cleanText, safeHref, safeRedirectPath, isHexColor } from '@/lib/security/sanitize';
import { randomToken, sha256, sign, unsign } from '@/lib/security/tokens';
import { rateLimit } from '@/lib/security/rate-limit';

describe('sanitize', () => {
  it('strips control characters and collapses whitespace', () => {
    expect(cleanText('  Ama \n\t Mensah\u0000 ')).toBe('Ama Mensah');
  });
  it('truncates to max length', () => {
    expect(cleanText('x'.repeat(50), 10)).toHaveLength(10);
  });
  it('only allows same-site redirects', () => {
    expect(safeRedirectPath('/account')).toBe('/account');
    expect(safeRedirectPath('//evil.com')).toBe('/');
    expect(safeRedirectPath('https://evil.com')).toBe('/');
    expect(safeRedirectPath('/\\evil.com')).toBe('/');
    expect(safeRedirectPath(null, '/x')).toBe('/x');
  });
  it('rejects javascript: links', () => {
    expect(safeHref('javascript:alert(1)')).toBe('/products');
    expect(safeHref('/products?x=1')).toBe('/products?x=1');
    expect(safeHref('https://example.com/a')).toBe('https://example.com/a');
    expect(safeHref('//evil.com')).toBe('/products');
  });
  it('validates hex colours', () => {
    expect(isHexColor('#a1B2c3')).toBe(true);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor('#fff')).toBe(false);
  });
});

describe('tokens', () => {
  it('generates unique url-safe tokens', () => {
    const a = randomToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(randomToken()).not.toBe(a);
  });
  it('hashes deterministically and irreversibly', () => {
    expect(sha256('abc')).toBe(sha256('abc'));
    expect(sha256('abc')).not.toContain('abc');
  });
  it('signs and verifies values, rejecting tampering', () => {
    const signed = sign('LS-123');
    expect(unsign(signed)).toBe('LS-123');
    expect(unsign(signed.replace('LS-123', 'LS-999'))).toBeNull();
    expect(unsign('LS-123.deadbeef')).toBeNull();
    expect(unsign(undefined)).toBeNull();
  });
});

describe('rateLimit', () => {
  it('blocks after the limit within the window', () => {
    const key = `t:${Math.random()}`;
    expect(rateLimit(key, 2, 1000).ok).toBe(true);
    expect(rateLimit(key, 2, 1000).ok).toBe(true);
    const third = rateLimit(key, 2, 1000);
    expect(third.ok).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });
  it('tracks keys independently', () => {
    expect(rateLimit(`a:${Math.random()}`, 1, 1000).ok).toBe(true);
    expect(rateLimit(`b:${Math.random()}`, 1, 1000).ok).toBe(true);
  });
});
