'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { trackOrderAction, type TrackedOrder } from '@/domains/orders/actions';
import { STATUS_LABEL, statusBadge } from './OrderSummary';
import { money } from '@/lib/utils';

const STEPS = ['PENDING', 'PROCESSING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export function TrackClient({ initialOrder }: { initialOrder: string }) {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const creds = useRef<{ number: string; email: string } | null>(null);

  // Live status: once an order is shown, the server pushes changes and we silently refresh it.
  const number = order?.orderNumber;
  useEffect(() => {
    if (!number) return;
    const refresh = async () => {
      if (!creds.current) return;
      const r = await trackOrderAction(creds.current.number, creds.current.email);
      if (r.success && r.order) setOrder(r.order);
    };
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/orders/${encodeURIComponent(number)}/stream`);
      es.onmessage = () => void refresh();
    } catch {
      /* falls back to the poll below */
    }
    const poll = window.setInterval(() => document.visibilityState === 'visible' && void refresh(), 30_000);
    return () => {
      es?.close();
      window.clearInterval(poll);
    };
  }, [number]);

  return (
    <div className="mx-auto max-w-2xl">
      <form
        method="post"
        className="card grid gap-4 p-5 md:p-7"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const num = String(f.get('order')).trim();
          const email = String(f.get('email')).trim();
          setError(null);
          start(async () => {
            const r = await trackOrderAction(num, email);
            if (r.success && r.order) {
              creds.current = { number: num, email };
              setOrder(r.order);
            } else {
              setOrder(null);
              setError(r.error ?? 'Not found');
            }
          });
        }}
      >
        <div>
          <label className="label" htmlFor="order">Tracking ID</label>
          <input id="order" name="order" required defaultValue={initialOrder} placeholder="CF-261010-K7M2" className="field font-mono uppercase" autoComplete="off" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email used at checkout</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="field" />
        </div>
        <button className="btn btn-primary" disabled={pending}>{pending ? 'Looking…' : 'Track order'}</button>
        {error && <p role="alert" className="alert alert-error">{error}</p>}
      </form>

      {order && (
        <div className="card mt-6 p-5 md:p-7" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[18px] font-bold tracking-wider">{order.orderNumber}</p>
            <span className={`badge ${statusBadge(order.status)}`}>{STATUS_LABEL[order.status]}</span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" aria-hidden /> Live: this updates automatically
          </p>
          {order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && (
            <ol className="mt-5 grid grid-cols-5 gap-1">
              {STEPS.map((s, i) => (
                <li key={s}>
                  <div className={`h-1.5 rounded-full ${i <= STEPS.indexOf(order.status) ? 'bg-ink' : 'bg-surface-2'}`} />
                  <p className="mt-2 text-center text-[11px] text-muted">{STATUS_LABEL[s]}</p>
                </li>
              ))}
            </ol>
          )}
          <ul className="mt-6 grid gap-2 text-[13px]">
            {order.items.map((i, n) => (
              <li key={n} className="flex justify-between gap-3">
                <span>{i.name} <span className="text-muted">· {i.variant} × {i.quantity}</span></span>
                <span>{money(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex justify-between border-t border-line pt-3 font-bold"><span>Total</span><span>{money(order.total)}</span></p>
          <Link href={`/receipt/${order.orderNumber}`} className="btn btn-ghost mt-5 w-full">View receipt</Link>
        </div>
      )}
    </div>
  );
}
