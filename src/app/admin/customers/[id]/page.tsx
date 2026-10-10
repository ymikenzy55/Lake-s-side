import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { PageHeader, Panel, Stat, Empty } from '@/components/admin/ui';
import { CustomerActions } from '@/components/admin/CustomerActions';
import { STATUS_LABEL, statusBadge } from '@/components/store/OrderSummary';
import { isUuid, money } from '@/lib/utils';

export const metadata = { title: 'User' };

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const me = await getSessionUser();
  const [u, orders, spend] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isActive: true, createdAt: true, lastLoginAt: true } }),
    prisma.order.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true, _count: { select: { items: true } } } }),
    prisma.order.aggregate({ where: { userId: id, paymentStatus: 'PAID' }, _sum: { totalAmount: true } }),
  ]);
  if (!u) notFound();
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'No name';
  const staff = u.role !== 'CUSTOMER';

  return (
    <>
      <PageHeader
        title={name}
        subtitle={staff ? (u.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin') : 'Customer'}
        actions={staff && me?.role === 'SUPER_ADMIN' ? <Link href="/admin/team" className="btn btn-ghost btn-sm">Manage admins</Link> : undefined}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Orders" value={orders.length} />
        <Stat label="Paid" value={money(Number(spend._sum.totalAmount ?? 0))} />
        <Stat label="Joined" value={u.createdAt.toLocaleDateString('en-GH', { month: 'short', year: 'numeric' })} />
        <Stat label="Status" value={u.isActive ? 'Active' : 'Disabled'} tone={u.isActive ? undefined : 'bad'} />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Orders">
          {orders.length === 0 ? <Empty>No orders yet</Empty> : (
            <ul className="divide-y divide-line">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex min-h-[60px] items-center justify-between gap-3 py-2 hover:opacity-80">
                    <div className="min-w-0"><p className="font-medium">{o.orderNumber}</p><p className="truncate text-[13px] text-muted">{o._count.items} item{o._count.items === 1 ? '' : 's'} · {o.createdAt.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                    <div className="text-right"><p className="font-semibold">{money(Number(o.totalAmount))}</p><span className={`badge ${statusBadge(o.status)}`}>{STATUS_LABEL[o.status]}</span></div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Details">
          <dl className="grid gap-3 text-[14px]">
            <div className="min-w-0"><dt className="text-[12px] text-muted">Email</dt><dd className="break-all"><a className="underline" href={`mailto:${u.email}`}>{u.email}</a></dd></div>
            <div><dt className="text-[12px] text-muted">Phone</dt><dd>{u.phone ? <a className="underline" href={`tel:${u.phone}`}>{u.phone}</a> : 'Not provided'}</dd></div>
            <div><dt className="text-[12px] text-muted">Last seen</dt><dd>{u.lastLoginAt ? u.lastLoginAt.toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never'}</dd></div>
          </dl>
          {u.role === 'CUSTOMER' && u.id !== me?.id && <div className="mt-5"><CustomerActions id={u.id} isActive={u.isActive} /></div>}
        </Panel>
      </div>
    </>
  );
}
