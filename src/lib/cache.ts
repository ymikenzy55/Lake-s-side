/**
 * Tiny in-process TTL cache. The database is remote (each round trip is 200-800 ms), so
 * hot, rarely-changing lookups (sessions, settings, cart ids) are memoised for a few seconds.
 * Per-instance only; on a multi-instance deployment use a short TTL (as here) or Redis.
 */
export class TtlCache<V> {
  private store = new Map<string, { v: V; exp: number }>();
  constructor(private ttlMs: number, private max = 2000) {}

  get(key: string): V | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.exp < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.v;
  }

  set(key: string, v: V): void {
    if (this.store.size >= this.max) this.store.delete(this.store.keys().next().value as string);
    this.store.set(key, { v, exp: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Stale-while-error read cache for catalogue data. Fresh for `ttlMs`; after that a refresh is
 * attempted, but if the database is unreachable the last good value is served (up to `staleMs`).
 * Concurrent callers share one in-flight fetch. Cleared by `clearReadCache()` after admin edits.
 */
// Kept on globalThis: Next bundles route handlers and pages separately, each with its own copy of this
// module, so a module-level Map cleared from an API route would not be the one pages read from.
const g = globalThis as unknown as { __lsReadStore?: Map<string, { v: unknown; fresh: number; stale: number }>; __lsInflight?: Map<string, Promise<unknown>> };
const readStore = (g.__lsReadStore ??= new Map());
const inflight = (g.__lsInflight ??= new Map());

export async function cachedRead<T>(key: string, ttlMs: number, fn: () => Promise<T>, staleMs = 15 * 60_000): Promise<T> {
  const now = Date.now();
  const hit = readStore.get(key);
  if (hit && hit.fresh > now) return hit.v as T;

  let p = inflight.get(key) as Promise<T> | undefined;
  if (!p) {
    p = fn()
      .then((v) => {
        readStore.set(key, { v, fresh: Date.now() + ttlMs, stale: Date.now() + staleMs });
        if (readStore.size > 500) readStore.delete(readStore.keys().next().value as string);
        return v;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  try {
    return await p;
  } catch (e) {
    if (hit && hit.stale > Date.now()) return hit.v as T; // DB down: serve last known good data
    throw e;
  }
}

export function clearReadCache(): void {
  readStore.clear();
}
