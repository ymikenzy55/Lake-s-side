import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { OrderService } from '@/domains/orders/service';
import { OrderSummary } from '@/components/store/OrderSummary';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { LiveRefresh } from '@/components/layout/LiveRefresh';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Order details', robots: { index: false } };

export default async function AccountOrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const { orderNumber } = await params;
  const order = await OrderService.getByNumber(orderNumber.slice(0, 40));
  if (!order || order.userId !== user.id) notFound();

  return (
    <div className="container-x pt-8 md:pt-12">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'My account', href: '/account' }, { label: order.orderNumber }]} />
      <LiveRefresh stream={`/api/orders/${order.orderNumber}/stream`} />
      <div className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-semibold md:text-[32px]">Order {order.orderNumber}</h1>
        <Link href={`/receipt/${order.orderNumber}`} className="btn btn-ghost">View receipt</Link>
      </div>
      <OrderSummary order={order} />
    </div>
  );
}
