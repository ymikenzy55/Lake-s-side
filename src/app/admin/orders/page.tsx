import Link from 'next/link';
import { prisma } from '@/lib/db';
import type { OrderStatus, Prisma } from '@prisma/client';
import { PageHeader, Empty } from '@/components/admin/ui';
import { STATUS_LABEL, statusBadge } from '@/components/store/OrderSummary';
import { money } from '@/lib/utils';
import { StaleOrdersButton } from '@/components/admin/OrderActions';
import { Pager } from '@/components/admin/Pager';

const FILTERS: (OrderStatus | 'ALL')[] = ['ALL', 'PENDING', 'PROCESSING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
const PAGE = 20;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = FILTERS.includes(sp.status as OrderStatus) && sp.status !== 'ALL' ? (sp.status as OrderStatus) : undefined;
  const q = sp.q?.trim().slice(0, 60);
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.OrderWhereInput = {
    ...(status && { status }),
    ...(q && { OR: [{ orderNumber: { contains: q, mode: 'insensitive' } }, { customerName: { contains: q, mode: 'insensitive' } }, { customerEmail: { contains: q, mode: 'insensitive' } }, { customerPhone: { contains: q } }] }),
  };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE, take: PAGE, include: { _count: { select: { items: true } } } }),
    prisma.order.count({ where }),
  ]);
  const href = (o: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ status: sp.status, q, ...o })) if (v && v !== 'ALL') u.set(k, v);
    return `/admin/orders${u.size ? `?${u}` : ''}`;
  };

  return (
    <>
      <PageHeader title="Orders" subtitle={`${total} order${total === 1 ? '' : 's'}`} actions={<StaleOrdersButton />} />

      <form className="mb-4 flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} placeholder="Search order no., name, email, phone" className="field" />
        <button className="btn btn-primary shrink-0">Search</button>
      </form>
      <div className="hide-scrollbar -mx-3 mb-5 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERS.map((f) => (
          <Link key={f} href={href({ status: f, page: undefined })} className={`chip ${(status ?? 'ALL') === f ? 'is-active' : ''}`}>{f === 'ALL' ? 'All' : STATUS_LABEL[f]}</Link>
        ))}
      </div>

      {orders.length === 0 ? <Empty>No orders found</Empty> : (
        <ul className="grid gap-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="card grid gap-2 p-4 transition-shadow hover:shadow-[var(--shadow-card)] sm:grid-cols-[1.2fr_1fr_auto_auto] sm:items-center sm:gap-4">
                <div className="min-w-0"><p className="font-semibold">{o.orderNumber}</p><p className="truncate text-[13px] text-muted">{o.customerName} · {o.customerPhone}</p></div>
                <p className="text-[13px] text-muted">{o._count.items} item{o._count.items === 1 ? '' : 's'} · {o.createdAt.toLocaleString('en-GH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                <div className="flex gap-1.5"><span className={`badge ${statusBadge(o.status)}`}>{STATUS_LABEL[o.status]}</span><span className={`badge ${o.paymentStatus === 'PAID' ? 'badge-ok' : o.paymentStatus === 'PENDING' ? 'badge-warn' : 'badge-bad'}`}>{o.paymentMethod === 'CASH_ON_DELIVERY' && o.paymentStatus === 'PENDING' ? 'COD' : o.paymentStatus.toLowerCase()}</span></div>
                <p className="text-[17px] font-semibold sm:text-right">{money(Number(o.totalAmount))}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pager base="/admin/orders" page={page} total={total} size={PAGE} params={{ status: status, q }} />
    </>
  );
}
