import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { OrderSummary } from '@/components/store/OrderSummary';
import { OrderActions } from '@/components/admin/OrderActions';
import { PageHeader, Panel } from '@/components/admin/ui';
import { STATUS_FLOW } from '@/domains/orders/service';
import { isUuid } from '@/lib/utils';

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [order, history] = await Promise.all([
    prisma.order.findUnique({ where: { id }, relationLoadStrategy: 'join', include: { items: true, payment: true } }),
    prisma.auditLog.findMany({ where: { entityType: 'Order', entityId: id }, orderBy: { createdAt: 'desc' }, take: 30 }),
  ]);
  if (!order) notFound();
  const actors = await prisma.user.findMany({ where: { id: { in: [...new Set(history.map((h) => h.userId).filter((x): x is string => !!x))] } }, select: { id: true, email: true } });
  const actorEmail = new Map(actors.map((a) => [a.id, a.email]));

  return (
    <>
      <Link href="/admin/orders" className="mb-3 inline-flex h-11 items-center text-[14px] text-muted hover:text-ink">Back to orders</Link>
      <PageHeader title={order.orderNumber} subtitle={`Placed ${order.createdAt.toLocaleString('en-GH')}`} />
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
        <OrderSummary order={order} />
        <div className="order-first grid gap-4 xl:sticky xl:top-6 xl:order-none">
          <Panel title="Update order">
            <OrderActions orderId={order.id} status={order.status} next={STATUS_FLOW[order.status]} canMarkPaid={order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED'} />
          </Panel>
          <Panel title="History">
            <ol className="grid gap-3 text-[13px]">
              {history.map((h) => {
                const c = (h.changes ?? {}) as { from?: string; to?: string };
                return (
                  <li key={h.id} className="border-l-2 border-line pl-3">
                    <p className="font-medium">{h.action === 'ORDER_MARK_PAID' ? 'Marked as paid' : c.to ? `${(c.from ?? '').replace(/_/g, ' ').toLowerCase()} → ${c.to.replace(/_/g, ' ').toLowerCase()}` : h.action}</p>
                    <p className="text-[12px] text-muted">{h.createdAt.toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}{h.userId ? ` · ${actorEmail.get(h.userId) ?? 'admin'}` : ''}</p>
                  </li>
                );
              })}
              <li className="border-l-2 border-ink pl-3">
                <p className="font-medium">Order placed</p>
                <p className="text-[12px] text-muted">{order.createdAt.toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })} · {order.paymentMethod === 'PAYSTACK' ? 'online payment' : 'cash on delivery'}</p>
              </li>
            </ol>
          </Panel>
          <Panel title="Customer">
            <p className="font-medium">{order.customerName}</p>
            <a className="block text-[14px] text-muted underline" href={`tel:${order.customerPhone}`}>{order.customerPhone}</a>
            <a className="block text-[14px] text-muted underline" href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a>
            {order.notes && <p className="mt-3 rounded-xl bg-surface p-3 text-[13px]">Note: {order.notes}</p>}
            <a className="btn btn-soft btn-sm mt-4 w-full" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`}>Message on WhatsApp</a>
          </Panel>
        </div>
      </div>
    </>
  );
}
