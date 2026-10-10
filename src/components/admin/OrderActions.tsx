'use client';

import type { OrderStatus } from '@prisma/client';
import { useAdminRun, Flash } from './hooks';
import { expireStaleOrdersAction, markOrderPaidAction, updateOrderStatusAction } from '@/domains/admin/content-actions';
import { STATUS_LABEL } from '@/components/store/OrderSummary';

export function OrderActions({ orderId, status, next, canMarkPaid }: { orderId: string; status: OrderStatus; next: OrderStatus[]; canMarkPaid: boolean }) {
  const { run, pending, msg } = useAdminRun();
  return (
    <div className="grid gap-3">
      <p className="text-[13px] text-muted">Current status: <b className="text-ink">{STATUS_LABEL[status]}</b></p>
      {next.length === 0 && <p className="text-[13px] text-muted">This order is closed.</p>}
      {next.map((s) => {
        const bad = s === 'CANCELLED' || s === 'REFUNDED';
        return (
          <button
            key={s}
            disabled={pending}
            className={`btn ${bad ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => run(() => updateOrderStatusAction(orderId, s), { confirm: bad ? `Are you sure you want to mark this order as ${STATUS_LABEL[s].toLowerCase()}? Stock will be returned.` : undefined })}
          >
            {bad ? `Mark ${STATUS_LABEL[s].toLowerCase()}` : `Move to: ${STATUS_LABEL[s]}`}
          </button>
        );
      })}
      {canMarkPaid && (
        <button disabled={pending} className="btn btn-ghost" onClick={() => run(() => markOrderPaidAction(orderId), { confirm: 'Confirm payment was received for this order?' })}>Mark as paid</button>
      )}
      <Flash msg={msg} />
    </div>
  );
}

export function StaleOrdersButton() {
  const { run, pending, msg } = useAdminRun();
  return (
    <div className="flex flex-col items-end gap-1">
      <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => expireStaleOrdersAction(), { confirm: 'Cancel unpaid online orders older than 1 hour and release their stock?' })}>Clear abandoned</button>
      {msg && <span className={`text-[12px] ${msg.ok ? 'text-ok' : 'text-danger'}`}>{msg.text}</span>}
    </div>
  );
}
