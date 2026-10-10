'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ProductCard } from './ProductCard';
import type { ProductCard as Card } from '@/domains/products/service';

const LIMIT = 12;

/** Product grid that keeps loading the next page as the shopper scrolls near the bottom. */
export function InfiniteProducts({ initial, hasMore: initialMore }: { initial: Card[]; hasMore: boolean }) {
  const [items, setItems] = useState(initial);
  const [hasMore, setHasMore] = useState(initialMore);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const page = useRef(1);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/products?page=${page.current + 1}&limit=${LIMIT}`);
      if (!res.ok) throw new Error('bad');
      const data = (await res.json()) as { products: Card[]; hasMore: boolean };
      page.current += 1;
      setItems((cur) => {
        const seen = new Set(cur.map((p) => p.id));
        return [...cur, ...data.products.filter((p) => !seen.has(p.id))];
      });
      setHasMore(data.hasMore);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || failed) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && void loadMore(), { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, failed, loadMore, items.length]);

  return (
    <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-3 lg:grid-cols-4 md:gap-x-4">
        {items.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
      </div>
      <div ref={sentinel} className="mt-8 flex min-h-12 items-center justify-center text-[13px] text-muted" aria-live="polite">
        {loading && <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-ink" />Loading more…</span>}
        {failed && <button type="button" className="btn btn-soft btn-sm" onClick={() => void loadMore()}>Could not load more. Try again</button>}
        {!hasMore && !loading && items.length > LIMIT && <span>You have seen everything.</span>}
      </div>
    </>
  );
}
