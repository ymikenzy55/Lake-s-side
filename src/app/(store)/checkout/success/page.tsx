import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OrderService } from '@/domains/orders/service';
import { OrderSummary } from '@/components/store/OrderSummary';
import { CopyId } from '@/components/store/CopyId';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { LiveRefresh } from '@/components/layout/LiveRefresh';
import { canAccessOrder } from '@/lib/order-access';
import { IconCheck } from '@/components/layout/Icons';
import { emailProvider } from '@/services/brevo';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Order confirmed', robots: { index: false } };

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ order?: string; status?: string }> }) {
  const sp = await searchParams;
  const number = (sp.order ?? '').slice(0, 40).toUpperCase();
  if (!number) notFound();

  const order = await OrderService.getByNumber(number);
  if (!order || !(await canAccessOrder(order))) notFound();

  const unpaid = sp.status === 'unpaid' && order.paymentStatus !== 'PAID';

  return (
    <div className="container-x pt-6 md:pt-8">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }, { label: 'Checkout', href: '/checkout' }, { label: 'Confirmation' }]} />
      <LiveRefresh stream={`/api/orders/${order.orderNumber}/stream`} />

      <div className="mx-auto mb-8 mt-8 max-w-xl text-center">
        <span className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${unpaid ? 'bg-[#fde3e0] text-danger' : 'bg-ink text-white'}`}>
          {unpaid ? <span className="text-xl font-bold">!</span> : <IconCheck width={26} height={26} />}
        </span>
        <h1 className="mt-4 text-[26px] font-semibold md:text-[32px]">{unpaid ? 'Payment not completed' : 'Thank you, order placed'}</h1>
        <p className="mt-2 text-muted">
          {unpaid
            ? 'We could not confirm your payment. If you were charged, it will be confirmed automatically in a few minutes.'
            : emailProvider()
              ? `Your receipt has been sent to ${order.customerEmail}. Keep your tracking ID below to follow the order.`
              : 'Keep your tracking ID below to follow the order. You can view or print your receipt any time.'}
        </p>
        <div className="mt-5 grid justify-items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Your tracking ID</p>
          <CopyId value={order.orderNumber} />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={`/receipt/${order.orderNumber}`} className="btn btn-primary">View receipt</Link>
          <Link href={`/track?order=${order.orderNumber}`} className="btn btn-ghost">Track order</Link>
          <Link href="/products" className="btn btn-soft">Continue shopping</Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl"><OrderSummary order={order} /></div>
    </div>
  );
}
