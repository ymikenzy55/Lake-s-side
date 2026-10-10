'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { LiveRefresh } from '@/components/layout/LiveRefresh';
import { money } from '@/lib/utils';
import { ADMIN_EVENT } from './NotificationBell';

interface Toast {
  id: number;
  title: string;
  text: string;
  href: string;
}

/** Admin live feed: refreshes the current admin page on any order event and pops a toast for new orders. */
export function AdminLive() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const onEvent = useCallback((d: unknown) => {
    const e = d as { type?: string; orderNumber?: string; total?: number; customer?: string; status?: string; name?: string; subject?: string; items?: { name: string; left: number }[] };
    if (!e?.type) return;
    window.dispatchEvent(new Event(ADMIN_EVENT));
    let toast: Toast;
    if (e.type === 'stock.low') {
      const first = e.items?.[0];
      toast = { id: Date.now(), title: 'Low stock', text: first ? `${first.name}: ${first.left === 0 ? 'sold out' : `${first.left} left`}${(e.items?.length ?? 0) > 1 ? ` (+${(e.items?.length ?? 1) - 1} more)` : ''}` : 'Some items are running low', href: '/admin/inventory?view=low' };
      setToasts((t) => [toast, ...t].slice(0, 3));
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toast.id)), 9000);
      return;
    }
    if (e.type === 'contact.created') toast = { id: Date.now(), title: 'New message', text: `${e.name ?? ''} · ${e.subject ?? ''}`, href: '/admin/messages' };
    else if (!e.orderNumber) return;
    else if (e.type === 'order.created') toast = { id: Date.now(), title: 'New order', text: `${e.orderNumber} · ${e.customer ?? ''} · ${money(e.total ?? 0)}`, href: '/admin/orders' };
    else toast = { id: Date.now(), title: 'Order updated', text: `${e.orderNumber} is now ${String(e.status ?? '').toLowerCase().replace(/_/g, ' ')}`, href: '/admin/orders' };
    setToasts((t) => [toast, ...t].slice(0, 3));
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toast.id)), 7000);
  }, []);

  return (
    <>
      <LiveRefresh stream="/api/admin/stream" onEvent={onEvent} />
      <div className="pointer-events-none fixed right-3 top-16 z-[60] grid w-[min(92vw,360px)] gap-2 lg:right-6 lg:top-5" aria-live="polite">
        {toasts.map((t) => (
          <Link key={t.id} href={t.href} className="anim-rise pointer-events-auto rounded-2xl border border-line bg-white p-3.5 shadow-[0_18px_40px_-18px_rgba(11,18,32,.5)]">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t.title}</p>
            <p className="mt-0.5 text-[14px] font-medium">{t.text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
