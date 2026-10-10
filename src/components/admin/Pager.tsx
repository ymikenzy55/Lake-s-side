import Link from 'next/link';

/** Previous / numbered / Next pager for admin lists. Server component driven by ?page=. */
export function Pager({ base, page, total, size, params = {} }: { base: string; page: number; total: number; size: number; params?: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  const href = (n: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
    if (n > 1) u.set('page', String(n));
    return `${base}${u.size ? `?${u}` : ''}`;
  };
  const set = new Set([1, 2, pages - 1, pages, page - 1, page, page + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const items: (number | '…')[] = [];
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) items.push('…');
    items.push(n);
  });
  const from = (page - 1) * size + 1;
  const to = Math.min(total, page * size);

  return (
    <nav aria-label="Pagination" className="mt-6 grid gap-3">
      <p className="text-center text-[12px] text-muted">Showing {from}–{to} of {total}</p>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-[13px]">
        {page > 1 ? <Link href={href(page - 1)} className="btn btn-ghost btn-sm">‹ Previous</Link> : <span className="btn btn-sm opacity-40">‹ Previous</span>}
        <div className="flex flex-wrap items-center justify-center gap-1">
          {items.map((n, i) =>
            n === '…' ? (
              <span key={`e${i}`} className="px-1 text-muted">…</span>
            ) : (
              <Link key={n} href={href(n)} aria-current={n === page ? 'page' : undefined} className={`grid h-8 min-w-8 place-items-center rounded-full px-2 font-medium ${n === page ? 'bg-ink text-white' : 'hover:bg-surface'}`}>{n}</Link>
            )
          )}
        </div>
        {page < pages ? <Link href={href(page + 1)} className="btn btn-ghost btn-sm">Next ›</Link> : <span className="btn btn-sm opacity-40">Next ›</span>}
      </div>
    </nav>
  );
}
