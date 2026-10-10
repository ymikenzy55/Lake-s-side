import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

/** Cryptographically random URL-safe token (hex). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/** One-way hash used to store session / reset tokens at rest. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET must be set (min 32 chars) in production');
    }
    return 'dev-only-insecure-secret-change-me-0000000000';
  }
  return s;
}

export function sign(value: string): string {
  const mac = createHmac('sha256', secret()).update(value).digest('hex');
  return `${value}.${mac}`;
}

/** Returns the original value if the signature is valid, otherwise null. */
export function unsign(signed: string | undefined | null): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf('.');
  if (idx < 1) return null;
  const value = signed.slice(0, idx);
  const expected = sign(value);
  const a = Buffer.from(expected);
  const b = Buffer.from(signed);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return value;
}
