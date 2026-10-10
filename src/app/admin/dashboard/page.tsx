import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PageHeader, Panel, Stat, Empty } from '@/components/admin/ui';
import { STATUS_LABEL, statusBadge } from '@/components/store/OrderSummary';
import { money } from '@/lib/utils';
import { SalesChart } from '@/components/admin/SalesChart';

interface Dash {
  revenue: number;
  todayTotal: number;
  todayCount: number;
  open: number;
  orders: number;
  customers: number;
  products: number;
  low: number;
  out: number;
  stockValue: number;
  variants: number;
  recent: { id: string; orderNumber: string; customerName: string; totalAmount: number; status: string; createdAt: string }[];
  daily: { day: string; total: number; orders: number }[];
  statusMix: { status: string; n: number }[];
  top: { name: string; qty: number }[];
}

function dateRanges() {
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const since = new Date(startToday.getTime() - 89 * 86_400_000);
  return { since, startToday };
}

export default async function DashboardPage() {
  const { since, startToday } = dateRanges();

  // Everything the dashboard needs in ONE query / ONE round trip (the database is remote).
  const [row] = await prisma.$queryRaw<{ data: Dash }[]>`
    SELECT json_build_object(
      'revenue',    (SELECT COALESCE(sum("totalAmount"), 0)::float FROM "Order" WHERE "paymentStatus" = 'PAID' AND status NOT IN ('CANCELLED', 'REFUNDED')),
      'todayTotal', (SELECT COALESCE(sum("totalAmount"), 0)::float FROM "Order" WHERE "createdAt" >= ${startToday} AND status <> 'CANCELLED'),
      'todayCount', (SELECT count(*)::int FROM "Order" WHERE "createdAt" >= ${startToday} AND status <> 'CANCELLED'),
      'open',       (SELECT count(*)::int FROM "Order" WHERE status IN ('PENDING', 'PROCESSING')),
      'orders',     (SELECT count(*)::int FROM "Order"),
      'customers',  (SELECT count(*)::int FROM "User" WHERE role = 'CUSTOMER'),
      'products',   (SELECT count(*)::int FROM "Product" WHERE "isActive"),
      'low',        (SELECT count(*)::int FROM "Inventory" i JOIN "ProductVariant" v ON v.id = i."variantId" JOIN "Product" p ON p.id = v."productId" WHERE v."isActive" AND p."isActive" AND i.quantity > 0 AND i.quantity <= i."lowStockThreshold"),
      'out',        (SELECT count(*)::int FROM "Inventory" i JOIN "ProductVariant" v ON v.id = i."variantId" JOIN "Product" p ON p.id = v."productId" WHERE v."isActive" AND p."isActive" AND i.quantity <= 0),
      'stockValue', (SELECT COALESCE(sum(i.quantity * v.price), 0)::float FROM "Inventory" i JOIN "ProductVariant" v ON v.id = i."variantId" JOIN "Product" p ON p.id = v."productId" WHERE v."isActive" AND p."isActive"),
      'variants',   (SELECT count(*)::int FROM "Inventory" i JOIN "ProductVariant" v ON v.id = i."variantId" JOIN "Product" p ON p.id = v."productId" WHERE v."isActive" AND p."isActive"),
      'recent',     (SELECT COALESCE(json_agg(r), '[]'::json) FROM (SELECT id, "orderNumber", "customerName", "totalAmount"::float AS "totalAmount", status, "createdAt" FROM "Order" ORDER BY "createdAt" DESC LIMIT 6) r),
      'daily',      (SELECT COALESCE(json_agg(d), '[]'::json) FROM (SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day, sum("totalAmount")::float AS total, count(*)::int AS orders FROM "Order" WHERE "createdAt" >= ${since} AND status <> 'CANCELLED' GROUP BY 1) d),
      'statusMix',  (SELECT COALESCE(json_agg(m), '[]'::json) FROM (SELECT status, count(*)::int AS n FROM "Order" GROUP BY status ORDER BY 2 DESC) m),
      'top',        (SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT oi."productName" AS name, sum(oi.quantity)::int AS qty FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" WHERE o.status NOT IN ('CANCELLED', 'REFUNDED') GROUP BY 1 ORDER BY 2 DESC LIMIT 5) t)
    ) AS data`;
  const d = row.data;

  const days = Array.from({ length: 90 }, (_, i) => {
    const date = new Date(since.getTime() + i * 86_400_000);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const hit = d.daily.find((x) => x.day === key);
    return { key, total: hit?.total ?? 0, orders: hit?.orders ?? 0 };
  });
  const statusTotal = Math.max(1, d.statusMix.reduce((n, m) => n + m.n, 0));

  return (
    <>
      <PageHeader title="Dashboard" subtitle="How the store is doing right now. Updates live as orders come in." actions={<Link href="/admin/products/new" className="btn btn-primary btn-sm">Add product</Link>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue (paid)" value={money(d.revenue)} />
        <Stat label="Today" value={money(d.todayTotal)} hint={`${d.todayCount} order${d.todayCount === 1 ? '' : 's'}`} />
        <Stat label="Open orders" value={d.open} hint={`${d.orders} total`} tone={d.open > 0 ? 'warn' : undefined} />
        <Stat label="Customers" value={d.customers} hint={`${d.products} active products`} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Low stock" value={d.low} tone={d.low ? 'warn' : undefined} />
        <Stat label="Sold out" value={d.out} tone={d.out ? 'bad' : undefined} />
        <Stat label="Stock value" value={money(d.stockValue)} />
        <Stat label="Variants" value={d.variants} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Sales overview">
          <SalesChart days={days} />
        </Panel>
        <Panel title="Best sellers">
          {d.top.length === 0 ? <Empty>No sales yet</Empty> : (
            <ol className="grid gap-3">
              {d.top.map((t, i) => (<li key={t.name} className="flex items-center gap-3 text-[14px]"><span className="grid h-7 w-7 place-items-center rounded-full bg-surface text-[12px] font-semibold">{i + 1}</span><span className="flex-1 truncate">{t.name}</span><span className="text-muted">{t.qty} sold</span></li>))}
            </ol>
          )}
        </Panel>
      </div>

      <Panel title="Orders by status" className="mt-6">
        {d.statusMix.length === 0 ? <Empty>No orders yet</Empty> : (
          <>
            <div className="flex h-3 overflow-hidden rounded-full bg-surface" role="img" aria-label="Orders by status">
              {d.statusMix.map((m, i) => <div key={m.status} style={{ width: `${(m.n / statusTotal) * 100}%`, opacity: 1 - i * 0.14 }} className="bg-ink" title={`${STATUS_LABEL[m.status] ?? m.status}: ${m.n}`} />)}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
              {d.statusMix.map((m, i) => <li key={m.status} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-ink" style={{ opacity: 1 - i * 0.14 }} />{STATUS_LABEL[m.status] ?? m.status} <span className="text-muted">{m.n}</span></li>)}
            </ul>
          </>
        )}
      </Panel>

      <Panel title="Recent orders" className="mt-6" actions={<Link href="/admin/orders" className="text-[13px] underline underline-offset-4">All orders</Link>}>
        {d.recent.length === 0 ? <Empty>Orders will appear here</Empty> : (
          <ul className="divide-y divide-line">
            {d.recent.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex min-h-[64px] items-center justify-between gap-3 py-2 hover:opacity-80">
                  <div className="min-w-0"><p className="font-medium">{o.orderNumber}</p><p className="truncate text-[13px] text-muted">{o.customerName} · {new Date(o.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}</p></div>
                  <div className="text-right"><p className="font-semibold">{money(o.totalAmount)}</p><span className={`badge ${statusBadge(o.status)}`}>{STATUS_LABEL[o.status]}</span></div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
