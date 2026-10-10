'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Keeps a server-rendered page fresh: when the server pushes an event on `stream` the page data is
 * re-fetched immediately. A slow poll (and refresh on tab focus) is the safety net if the stream drops.
 */
export function LiveRefresh({ stream, pollMs = 30_000, onEvent }: { stream: string; pollMs?: number; onEvent?: (data: unknown) => void }) {
  const router = useRouter();
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const refresh = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => router.refresh(), 250); // collapse bursts
    };

    let es: EventSource | null = null;
    try {
      es = new EventSource(stream);
      es.onmessage = (e) => {
        try {
          onEvent?.(JSON.parse(e.data));
        } catch {
          /* ignore malformed */
        }
        refresh();
      };
    } catch {
      /* EventSource unavailable: polling below still works */
    }

    const poll = window.setInterval(() => document.visibilityState === 'visible' && router.refresh(), pollMs);
    const onVisible = () => document.visibilityState === 'visible' && router.refresh();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      es?.close();
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [stream, pollMs, router, onEvent]);

  return null;
}
