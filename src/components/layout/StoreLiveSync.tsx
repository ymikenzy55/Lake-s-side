'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Keeps open storefront pages current: checks a small catalogue fingerprint every `pollMs` (and when
 * the tab becomes visible again) and, if the shop changed, refreshes the page data in place.
 * router.refresh() keeps scroll position and anything typed into forms. `initial` is the fingerprint the
 * server rendered this page from.
 */
export function StoreLiveSync({ initial, pollMs = 30_000 }: { initial: string | null; pollMs?: number }) {
  const router = useRouter();
  const path = usePathname();
  // Fingerprint of the data this page was rendered from, so a change made while the tab was hidden still counts.
  const last = useRef<string | null>(initial);
  const again = useRef<number | undefined>(undefined);
  // Never pull the page out from under someone who is paying.
  const paused = path.startsWith('/checkout');

  useEffect(() => {
    if (paused) return;
    let stopped = false;
    const check = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch('/api/storefront-version', { cache: 'no-store' });
        if (!res.ok) return;
        const { v } = (await res.json()) as { v: string | null };
        if (stopped || !v) return;
        if (last.current && last.current !== v) {
          router.refresh();
          // The version endpoint has just cleared the server caches. One follow-up catches a page that
          // was mid-regeneration, or a request served by another server instance.
          window.clearTimeout(again.current);
          again.current = window.setTimeout(() => !stopped && router.refresh(), 8_000);
        }
        last.current = v;
      } catch {
        /* offline: try again on the next tick */
      }
    };
    void check();
    const t = window.setInterval(check, pollMs);
    const onVisible = () => void check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      window.clearInterval(t);
      window.clearTimeout(again.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [paused, pollMs, router]);

  return null;
}
