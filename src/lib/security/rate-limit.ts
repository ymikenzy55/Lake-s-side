import { headers } from 'next/headers';

/**
 * Small in-memory sliding-window limiter. Good enough for a single Node
 * instance; on serverless/multi-instance hosting swap `hits` for Redis/Upstash
 * (same interface) — see docs/SECURITY.md.
 */
const hits = new Map<string, number[]>();
let lastSweep = Date.now();

/**
 * X-Forwarded-For can be forged by any client unless a trusted proxy overwrites it. Only honour it
 * when TRUST_PROXY=true (e.g. behind Vercel / Nginx / Cloudflare); otherwise all callers share one
 * bucket per action+email, which still throttles brute force without being bypassable by a header.
 */
export async function getClientIp(): Promise<string> {
  if (process.env.TRUST_PROXY !== 'true') return 'direct';
  const h = await headers();
  const fwd = h.get('x-forwarded-for');
  // the right-most entry is the one appended by our own proxy
  return (fwd?.split(',').pop() ?? h.get('x-real-ip') ?? 'unknown').trim();
}

export interface LimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): LimitResult {
  const now = Date.now();
  if (now - lastSweep > 5 * 60_000) {
    lastSweep = now;
    for (const [k, v] of hits) {
      if (!v.length || now - v[v.length - 1] > 60 * 60_000) hits.delete(k);
    }
  }
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retryAfterSeconds: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  return { ok: true, retryAfterSeconds: 0 };
}

/** Convenience: limit by client IP (+ optional extra discriminator, e.g. email). */
export async function limitByIp(
  scope: string,
  limit: number,
  windowMs: number,
  extra = ''
): Promise<LimitResult> {
  const ip = await getClientIp();
  return rateLimit(`${scope}:${ip}:${extra.toLowerCase()}`, limit, windowMs);
}
