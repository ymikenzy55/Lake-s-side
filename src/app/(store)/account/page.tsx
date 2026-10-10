import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { OrderService } from '@/domains/orders/service';
import { AccountForms } from '@/components/store/AccountForms';
import { STATUS_LABEL, statusBadge } from '@/components/store/OrderSummary';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { logoutAction } from '@/domains/auth/actions';
import { money } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My account', robots: { index: false } };

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?redirect=/account');
  const [profile, orders] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { firstName: true, lastName: true, phone: true, email: true } }),
    OrderService.listForUser(user.id),
  ]);

  return (
    <div className="container-x pt-8 md:pt-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'My account' }]} />
          <h1 className="mt-3 text-[26px] font-semibold md:text-[32px]">Hi, {profile?.firstName || 'there'}</h1>
        </div>
        <div className="flex gap-2">
          {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && <Link href="/admin/dashboard" className="btn btn-primary btn-sm">Admin dashboard</Link>}
          <form action={logoutAction}><button className="btn btn-ghost btn-sm">Sign out</button></form>
        </div>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[1.3fr_1fr]">
        <section aria-labelledby="orders-h">
          <h2 id="orders-h" className="mb-4 text-[22px]">Your orders</h2>
          {orders.length === 0 ? (
            <div className="card-soft p-10 text-center"><p className="text-muted">No orders yet.</p><Link href="/products" className="btn btn-primary mt-4">Start shopping</Link></div>
          ) : (
            <ul className="grid gap-3">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/account/orders/${o.orderNumber}`} className="card flex items-center justify-between gap-3 p-4 transition-shadow hover:shadow-[var(--shadow-card)]">
                    <div className="min-w-0">
                      <p className="font-semibold">{o.orderNumber}</p>
                      <p className="truncate text-[13px] text-muted">{o.items.length} item{o.items.length === 1 ? '' : 's'} · {o.createdAt.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="text-right"><p className="font-semibold">{money(Number(o.totalAmount))}</p><span className={`badge mt-1 ${statusBadge(o.status)}`}>{STATUS_LABEL[o.status]}</span></div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <AccountForms profile={{ firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '', phone: profile?.phone ?? '', email: profile?.email ?? '' }} />
      </div>
    </div>
  );
}
