import { ProductArt } from '@/components/svg/ProductArt';
import { money } from '@/lib/utils';
import { IconBag } from '@/components/layout/Icons';
import type { Prisma } from '@prisma/client';

type OrderFull = Prisma.OrderGetPayload<{ include: { items: true; payment: true } }>;

const STEPS = [
  { key: 'PENDING', label: 'Placed' },
  { key: 'PROCESSING', label: 'Preparing' },
  { key: 'READY_FOR_DELIVERY', label: 'Packed' },
  { key: 'OUT_FOR_DELIVERY', label: 'On the way' },
  { key: 'DELIVERED', label: 'Delivered' },
] as const;

export const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Placed',
  PROCESSING: 'Preparing',
  READY_FOR_DELIVERY: 'Packed',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export function statusBadge(status: string) {
  if (status === 'DELIVERED') return 'badge-ok';
  if (status === 'CANCELLED' || status === 'REFUNDED') return 'badge-bad';
  if (status === 'PENDING') return 'badge-warn';
  return 'badge-ink';
}

export function OrderSummary({ order }: { order: OrderFull }) {
  const idx = STEPS.findIndex((s) => s.key === order.status);
  const dead = order.status === 'CANCELLED' || order.status === 'REFUNDED';
  const addr = (order.shippingAddress ?? {}) as Record<string, string>;

  return (
    <div className="grid gap-6">
      <div className="card p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[12px] text-muted">Order</p>
            <p className="text-[22px] font-semibold tracking-tight">{order.orderNumber}</p>
          </div>
          <div className="flex gap-2">
            <span className={`badge ${statusBadge(order.status)}`}>{STATUS_LABEL[order.status]}</span>
            <span className={`badge ${order.paymentStatus === 'PAID' ? 'badge-ok' : order.paymentStatus === 'FAILED' ? 'badge-bad' : 'badge-warn'}`}>
              {order.paymentStatus === 'PAID' ? 'Paid' : order.paymentStatus === 'FAILED' ? 'Payment failed' : order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Pay on delivery' : 'Awaiting payment'}
            </span>
          </div>
        </div>

        {!dead && (
          <ol className="mt-7 grid grid-cols-5 gap-1" aria-label="Order progress">
            {STEPS.map((s, i) => (
              <li key={s.key} className="text-center">
                <div className={`mx-auto h-1.5 rounded-full ${i <= idx ? 'bg-ink' : 'bg-surface-2'}`} />
                <p className={`mt-2 text-[11px] sm:text-[12px] ${i <= idx ? 'font-medium text-ink' : 'text-muted'}`}>{s.label}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div className="card p-5 md:p-7">
          <h2 className="mb-4 text-[18px]">Items</h2>
          <ul className="grid gap-4">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-surface">{i.imageUrl && !i.imageUrl.startsWith('svg:') ? <ProductArt imageUrl={i.imageUrl} alt="" sizes="56px" /> : <span className="absolute inset-0 grid place-items-center text-muted"><IconBag width={22} height={22} /></span>}</div>
                <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-medium">{i.productName}</p><p className="text-[13px] text-muted">{i.variantName} × {i.quantity}</p></div>
                <p className="text-[15px] font-medium">{money(Number(i.price) * i.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid gap-2 border-t border-line pt-4 text-[14px]">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money(Number(order.subtotal))}</dd></div>
            {Number(order.discountAmount) > 0 && <div className="flex justify-between text-ok"><dt>Discount {order.discountCode && `(${order.discountCode})`}</dt><dd>-{money(Number(order.discountAmount))}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{Number(order.shippingFee) === 0 ? 'Free' : money(Number(order.shippingFee))}</dd></div>
            <div className="flex justify-between pt-1 text-[17px] font-semibold"><dt>Total</dt><dd>{money(Number(order.totalAmount))}</dd></div>
          </dl>
        </div>
        <div className="card-soft p-5 md:p-7 text-[14px]">
          <h2 className="mb-3 text-[18px]">Delivery to</h2>
          <p className="font-medium">{addr.fullName ?? order.customerName}</p>
          <p className="text-muted">{[addr.streetAddress, addr.area, addr.city, addr.region].filter(Boolean).join(', ')}</p>
          {addr.landmark && <p className="text-muted">Near {addr.landmark}</p>}
          <p className="mt-2 text-muted">{order.customerPhone}</p>
          <p className="text-muted">{order.customerEmail}</p>
        </div>
      </div>
    </div>
  );
}
