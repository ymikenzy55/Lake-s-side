/** Strip control chars & collapse whitespace for single-line user text. */
export function cleanText(v: unknown, max = 200): string {
  return String(v ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Only allow same-site relative redirects ("/foo"), never "//evil.com". */
export function safeRedirectPath(path: string | null | undefined, fallback = '/'): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return fallback;
  return path;
}

const HEX = /^#[0-9a-fA-F]{6}$/;
export function isHexColor(v: string): boolean {
  return HEX.test(v);
}

/** Allow internal paths or http(s) links only (no javascript: URLs in CTA links). */
export function safeHref(v: string | null | undefined, fallback = '/products'): string {
  if (!v) return fallback;
  if (v.startsWith('/') && !v.startsWith('//')) return v;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:' ? v : fallback;
  } catch {
    return fallback;
  }
}
