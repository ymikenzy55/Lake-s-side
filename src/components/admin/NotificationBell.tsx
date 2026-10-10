'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { money } from '@/lib/utils';

interface Data {
  orderCount: number;
  messageCount: number;
  orders: { id: string; orderNumber: string; customerName: string; totalAmount: number; createdAt: string }[];
  messages: { id: string; name: string; subject: string; createdAt: string }[];
  lowCount: number;
  low: { id: string; name: string; left: number }[];
}

export const ADMIN_EVENT = 'cf-admin-event';

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

/** Bell with a badge for orders waiting to be handled and unread messages; updates live. */
export function NotificationBell({ align = 'right' }: { align?: 'left' | 'right' }) {
  const [data, setData] = useState<Data | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const path = usePathname();

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications', { cache: 'no-store' });
      if (res.ok) setData(await res.json());
    } catch {
      /* offline: keep the last numbers */
    }
  }, []);

  useEffect(() => {
    void load();
    const onEvent = () => void load();
    window.addEventListener(ADMIN_EVENT, onEvent);
    const t = window.setInterval(() => document.visibilityState === 'visible' && void load(), 60_000);
    return () => {
      window.removeEventListener(ADMIN_EVENT, onEvent);
      window.clearInterval(t);
    };
  }, [load, path]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const total = (data?.orderCount ?? 0) + (data?.messageCount ?? 0) + (data?.lowCount ?? 0);

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={`Notifications${total ? `, ${total} need attention` : ''}`} aria-expanded={open} className="relative grid h-11 w-11 place-items-center rounded-full bg-surface hover:bg-surface-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9ZM10 20a2 2 0 0 0 4 0" />
        </svg>
        {total > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-semibold text-white">{total > 99 ? '99+' : total}</span>}
      </button>

      {open && (
        <div className={`anim-rise fixed inset-x-3 top-16 z-[70] max-h-[75vh] overflow-y-auto rounded-2xl border border-line bg-white p-3 shadow-[0_24px_60px_-20px_rgba(11,18,32,.45)] sm:absolute sm:inset-x-auto sm:top-12 sm:w-[360px] ${align === 'right' ? 'sm:right-0' : 'sm:left-0'}`}>
          {!data || total === 0 ? (
            <p className="px-2 py-6 text-center text-[14px] text-muted">{data ? 'You are all caught up.' : 'Loading…'}</p>
          ) : (
            <>
              {data.orders.length > 0 && (
                <section>
                  <div className="flex items-center justify-between px-2 pb-1 pt-1"><p className="text-[12px] font-semibold uppercase tracking-wide text-muted">New orders ({data.orderCount})</p><Link href="/admin/orders" onClick={() => setOpen(false)} className="text-[12px] underline underline-offset-4">All</Link></div>
                  <ul>
                    {data.orders.map((o) => (
                      <li key={o.id}>
                        <Link href={`/admin/orders/${o.id}`} onClick={() => setOpen(false)} className="flex min-h-[56px] items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-surface">
                          <span className="min-w-0"><span className="block text-[14px] font-medium">{o.orderNumber}</span><span className="block truncate text-[12px] text-muted">{o.customerName} · {ago(o.createdAt)}</span></span>
                          <span className="shrink-0 text-[13px] font-semibold">{money(o.totalAmount)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {data.low.length > 0 && (
                <section className={data.orders.length ? 'mt-2 border-t border-line pt-2' : ''}>
                  <div className="flex items-center justify-between px-2 pb-1 pt-1"><p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Low stock ({data.lowCount})</p><Link href="/admin/inventory?view=low" onClick={() => setOpen(false)} className="text-[12px] underline underline-offset-4">All</Link></div>
                  <ul>
                    {data.low.map((l) => (
                      <li key={l.id}>
                        <Link href="/admin/inventory?view=low" onClick={() => setOpen(false)} className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-surface">
                          <span className="min-w-0 truncate text-[14px] font-medium">{l.name}</span>
                          <span className={`badge shrink-0 ${l.left === 0 ? 'badge-bad' : 'badge-warn'}`}>{l.left === 0 ? 'Sold out' : `${l.left} left`}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {data.messages.length > 0 && (
                <section className={data.orders.length || data.low.length ? 'mt-2 border-t border-line pt-2' : ''}>
                  <div className="flex items-center justify-between px-2 pb-1 pt-1"><p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Unread messages ({data.messageCount})</p><Link href="/admin/messages" onClick={() => setOpen(false)} className="text-[12px] underline underline-offset-4">All</Link></div>
                  <ul>
                    {data.messages.map((m) => (
                      <li key={m.id}>
                        <Link href="/admin/messages" onClick={() => setOpen(false)} className="block min-h-[56px] rounded-xl px-2 py-2 hover:bg-surface">
                          <span className="block truncate text-[14px] font-medium">{m.subject}</span>
                          <span className="block truncate text-[12px] text-muted">{m.name} · {ago(m.createdAt)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
