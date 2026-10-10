import Link from 'next/link';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { getSessionUser } from '@/lib/auth/session';
import { PageHeader, Empty } from '@/components/admin/ui';
import { CustomerActions } from '@/components/admin/CustomerActions';
import { Pager } from '@/components/admin/Pager';
import { money } from '@/lib/utils';

export const metadata = { title: 'Users' };
const PAGE = 20;

const TABS = [
  { key: 'all', label: 'All users' },
  { key: 'customers', label: 'Customers' },
  { key: 'staff', label: 'Staff' },
  { key: 'guests', label: 'Guest buyers' },
] as const;
type Tab = (typeof TABS)[number]['key'];

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; tab?: string }> }) {
  const sp = await searchParams;
  const tab = (TABS.find((t) => t.key === sp.tab)?.key ?? 'all') as Tab;
  const q = sp.q?.trim().slice(0, 60);
  const page = Math.max(1, Number(sp.page) || 1);
  const me = await getSessionUser();

  const where: Prisma.UserWhereInput = {
    ...(tab === 'customers' && { role: 'CUSTOMER' }),
    ...(tab === 'staff' && { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }),
    ...(q && { OR: [{ email: { contains: q, mode: 'insensitive' } }, { firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] }),
  };

  const [counts, guestCount] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: true }),
    prisma.$queryRaw<{ n: bigint }[]>`SELECT count(DISTINCT "customerEmail") AS n FROM "Order" WHERE "userId" IS NULL`,
  ]);
  const byRole = Object.fromEntries(counts.map((c) => [c.role, c._count]));
  const tabCount: Record<Tab, number> = {
    all: counts.reduce((n, c) => n + c._count, 0),
    customers: byRole.CUSTOMER ?? 0,
    staff: (byRole.ADMIN ?? 0) + (byRole.SUPER_ADMIN ?? 0),
    guests: Number(guestCount[0]?.n ?? 0),
  };
  const href = (t: Tab) => `/admin/customers?${new URLSearchParams({ tab: t, ...(q ? { q } : {}) })}`;

  const body =
    tab === 'guests' ? await guests(q, page) : await registered(where, page, me?.id, me?.role);

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Everyone who has an account, the staff team, and guests who checked out without registering."
        actions={me?.role === 'SUPER_ADMIN' ? <Link href="/admin/team" className="btn btn-ghost btn-sm">Manage admins</Link> : undefined}
      />

      <div className="hide-scrollbar -mx-3 mb-4 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
        {TABS.map((t) => (
          <Link key={t.key} href={href(t.key)} className={`chip ${tab === t.key ? 'is-active' : ''}`}>
            {t.label} <span className="ml-1.5 opacity-60">{tabCount[t.key]}</span>
          </Link>
        ))}
      </div>

      <form className="mb-4 flex min-w-0 gap-2">
        <input type="hidden" name="tab" value={tab} />
        <input name="q" defaultValue={q} placeholder="Search name, email or phone" className="field min-w-0 flex-1" />
        <button className="btn btn-primary shrink-0">Search</button>
      </form>

      {body.rows.length === 0 ? <Empty>No users found</Empty> : <ul className="grid gap-3">{body.rows}</ul>}
      <Pager base="/admin/customers" page={page} total={body.total} size={PAGE} params={{ q, tab: tab === 'all' ? undefined : tab }} />
    </>
  );
}

async function registered(where: Prisma.UserWhereInput, page: number, myId?: string, myRole?: string) {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isActive: true, createdAt: true, lastLoginAt: true, _count: { select: { orders: true } } },
    }),
    prisma.user.count({ where }),
  ]);
  const spend = await prisma.order.groupBy({ by: ['userId'], where: { userId: { in: users.map((u) => u.id) }, paymentStatus: 'PAID' }, _sum: { totalAmount: true } });
  const spendMap = new Map(spend.map((s) => [s.userId, Number(s._sum.totalAmount ?? 0)]));

  const rows = users.map((u) => (
    <li key={u.id} className="card relative grid min-w-0 gap-3 transition-shadow hover:shadow-[var(--shadow-card)] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <Link href={`/admin/customers/${u.id}`} aria-label={`Open ${u.email}`} className="absolute inset-0 z-0 rounded-[inherit]" />
        <p className="flex min-w-0 flex-wrap items-center gap-2 break-words font-medium">
          {[u.firstName, u.lastName].filter(Boolean).join(' ') || 'No name'}
          {u.role !== 'CUSTOMER' && <span className="badge badge-ink">{u.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin'}</span>}
          {u.id === myId && <span className="badge badge-ok">You</span>}
          {!u.isActive && <span className="badge badge-bad">Disabled</span>}
        </p>
        <p className="break-all text-[13px] text-muted">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
        <p className="break-words text-[12px] text-muted">
          {u._count.orders} orders · {money(spendMap.get(u.id) ?? 0)} spent · joined {u.createdAt.toLocaleDateString('en-GH', { month: 'short', year: 'numeric' })}
          {u.lastLoginAt ? ` · last seen ${u.lastLoginAt.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}` : ''}
        </p>
      </div>
      {u.id !== myId && (u.role === 'CUSTOMER' || myRole === 'SUPER_ADMIN') && u.role !== 'SUPER_ADMIN' ? (
        <div className="relative z-10">{u.role === 'CUSTOMER' ? <CustomerActions id={u.id} isActive={u.isActive} /> : <Link href="/admin/team" className="btn btn-ghost btn-sm">Manage</Link>}</div>
      ) : null}
    </li>
  ));
  return { rows, total };
}

async function guests(q: string | undefined, page: number) {
  const like = q ? `%${q}%` : null;
  const [list, totalRows] = await Promise.all([
    prisma.$queryRaw<{ email: string; name: string; phone: string; orders: bigint; spent: number | null; last: Date }[]>`
      SELECT "customerEmail" AS email, (array_agg("customerName" ORDER BY "createdAt" DESC))[1] AS name,
             (array_agg("customerPhone" ORDER BY "createdAt" DESC))[1] AS phone, count(*) AS orders,
             sum("totalAmount") FILTER (WHERE "paymentStatus" = 'PAID')::float AS spent, max("createdAt") AS last
      FROM "Order" WHERE "userId" IS NULL
        AND (${like}::text IS NULL OR "customerEmail" ILIKE ${like} OR "customerName" ILIKE ${like} OR "customerPhone" ILIKE ${like})
      GROUP BY "customerEmail" ORDER BY max("createdAt") DESC LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`,
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(DISTINCT "customerEmail") AS n FROM "Order" WHERE "userId" IS NULL
        AND (${like}::text IS NULL OR "customerEmail" ILIKE ${like} OR "customerName" ILIKE ${like} OR "customerPhone" ILIKE ${like})`,
  ]);
  const rows = list.map((g) => (
    <li key={g.email} className="card relative min-w-0 p-4 transition-shadow hover:shadow-[var(--shadow-card)]">
      <Link href={`/admin/orders?q=${encodeURIComponent(g.email)}`} aria-label={`Orders from ${g.email}`} className="absolute inset-0 rounded-[inherit]" />
      <p className="flex min-w-0 flex-wrap items-center gap-2 break-words font-medium">{g.name}<span className="badge">Guest</span></p>
      <p className="break-all text-[13px] text-muted">{g.email} · {g.phone}</p>
      <p className="break-words text-[12px] text-muted">{Number(g.orders)} order{Number(g.orders) === 1 ? '' : 's'} · {money(g.spent ?? 0)} paid · last order {new Date(g.last).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      <Link href={`/admin/orders?q=${encodeURIComponent(g.email)}`} className="relative mt-2 inline-block text-[13px] font-medium underline underline-offset-4">View their orders</Link>
    </li>
  ));
  return { rows, total: Number(totalRows[0]?.n ?? 0) };
}
