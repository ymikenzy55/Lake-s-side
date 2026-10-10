import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OrderService } from '@/domains/orders/service';
import { canAccessOrder } from '@/lib/order-access';
import { getSettings } from '@/domains/settings/service';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { PrintButton } from '@/components/store/PrintButton';
import { LiveRefresh } from '@/components/layout/LiveRefresh';
import { STATUS_LABEL } from '@/components/store/OrderSummary';
import { BRAND } from '@/lib/config/brand';
import { APP_URL } from '@/lib/constants';
import { money } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Receipt', robots: { index: false } };

export default async function ReceiptPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const order = await OrderService.getByNumber(orderNumber.slice(0, 40).toUpperCase());
  if (!order || !(await canAccessOrder(order))) notFound();
  const s = await getSettings();
  const addr = (order.shippingAddress ?? {}) as Record<string, string>;
  const paid = order.paymentStatus === 'PAID';

  return (
    <div className="container-x max-w-3xl pb-6 pt-6">
      <div className="print:hidden">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Track order', href: `/track?order=${order.orderNumber}` }, { label: `Receipt ${order.orderNumber}` }]} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[26px] font-semibold">Your receipt</h1>
          <div className="flex gap-2">
            <Link href={`/track?order=${order.orderNumber}`} className="btn btn-ghost">Track order</Link>
            <PrintButton />
          </div>
        </div>
      </div>
      <LiveRefresh stream={`/api/orders/${order.orderNumber}/stream`} />

      <article className="mt-5 rounded-[18px] border border-line bg-white p-6 shadow-sm print:mt-0 print:border-0 print:p-0 print:shadow-none md:p-9" aria-label={`Receipt ${order.orderNumber}`}>
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
          <div>
            <p className="text-[20px] font-black uppercase tracking-tight">{BRAND.name}</p>
            <p className="mt-1 text-[12px] text-muted">{s.address}</p>
            <p className="text-[12px] text-muted">{s.contact_email} · {s.contact_phone}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Receipt / Tracking ID</p>
            <p className="font-mono text-[20px] font-bold tracking-wider">{order.orderNumber}</p>
            <p className="text-[12px] text-muted">{order.createdAt.toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
        </header>

        <section className="grid gap-5 py-6 text-[13px] sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Billed to</p>
            <p className="mt-1 font-semibold">{order.customerName}</p>
            <p className="text-muted">{order.customerEmail}</p>
            <p className="text-muted">{order.customerPhone}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Deliver to</p>
            <p className="mt-1 text-muted">{[addr.streetAddress, addr.area, addr.city, addr.region].filter(Boolean).join(', ')}</p>
            {addr.landmark && <p className="text-muted">Near {addr.landmark}</p>}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Payment &amp; status</p>
            <p className="mt-1 font-semibold">{order.paymentMethod === 'PAYSTACK' ? 'Paid online (Paystack)' : 'Cash on delivery'}</p>
            <p className={paid ? 'font-medium text-ok' : 'text-muted'}>{paid ? `Paid ${order.paidAt?.toLocaleDateString('en-GH') ?? ''}` : order.paymentStatus === 'FAILED' ? 'Payment failed' : 'Payment due'}</p>
            <p className="text-muted">Order status: {STATUS_LABEL[order.status]}</p>
          </div>
        </section>

        <table className="w-full text-left text-[13px]">
          <thead className="border-y border-line text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="py-2.5 font-semibold">Item</th>
              <th className="py-2.5 text-right font-semibold">Qty</th>
              <th className="py-2.5 text-right font-semibold">Price</th>
              <th className="py-2.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id} className="border-b border-line align-top">
                <td className="py-3">
                  <p className="font-medium">{i.productName}</p>
                  <p className="text-[12px] text-muted">{i.variantName}{i.sku ? ` · ${i.sku}` : ''}</p>
                </td>
                <td className="py-3 text-right tabular-nums">{i.quantity}</td>
                <td className="py-3 text-right tabular-nums">{money(Number(i.price))}</td>
                <td className="py-3 text-right font-medium tabular-nums">{money(Number(i.price) * i.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-5 grid max-w-xs gap-2 text-[13px]">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{money(Number(order.subtotal))}</dd></div>
          {Number(order.discountAmount) > 0 && (
            <div className="flex justify-between"><dt className="text-muted">Discount {order.discountCode && `(${order.discountCode})`}</dt><dd className="tabular-nums">-{money(Number(order.discountAmount))}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd className="tabular-nums">{Number(order.shippingFee) === 0 ? 'Free' : money(Number(order.shippingFee))}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-[16px] font-bold"><dt>Total</dt><dd className="tabular-nums">{money(Number(order.totalAmount))}</dd></div>
        </dl>

        <footer className="mt-8 border-t border-line pt-5 text-[12px] text-muted">
          <p>Track this order any time at <b className="text-ink">{APP_URL}/track</b> with your tracking ID and the email used at checkout.</p>
          <p className="mt-1">Thank you for shopping with {BRAND.name}. Exchanges within 7 days of delivery with this receipt.</p>
        </footer>
      </article>
    </div>
  );
}
