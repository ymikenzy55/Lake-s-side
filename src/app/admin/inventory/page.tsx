import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { InventoryService } from '@/domains/inventory/service';
import { PageHeader, Stat, Empty } from '@/components/admin/ui';
import { Pager } from '@/components/admin/Pager';
import { StockEditor } from '@/components/admin/StockEditor';
import { money } from '@/lib/utils';
import Link from 'next/link';

export const metadata = { title: 'Inventory' };
const PAGE = 30;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; view?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 60);
  const view = sp.view === 'low' || sp.view === 'out' ? sp.view : 'all';
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.InventoryWhereInput = {
    variant: { product: { isActive: true }, ...(q && { OR: [{ sku: { contains: q, mode: 'insensitive' } }, { product: { name: { contains: q, mode: 'insensitive' } } }] }) },
    ...(view === 'out' && { quantity: { lte: 0 } }),
  };

  const [summary, rows, total] = await Promise.all([
    InventoryService.getInventorySummary(),
    view === 'low'
      ? prisma.$queryRaw<{ id: string }[]>`SELECT i.id FROM "Inventory" i WHERE i."quantity" <= i."lowStockThreshold" AND i."quantity" > 0`.then((ids) =>
          prisma.inventory.findMany({ where: { ...where, id: { in: ids.map((x) => x.id) } }, include: { variant: { include: { product: { select: { name: true } }, size: true, color: true } } }, orderBy: { quantity: 'asc' }, take: PAGE, skip: (page - 1) * PAGE }))
      : prisma.inventory.findMany({ where, include: { variant: { include: { product: { select: { name: true } }, size: true, color: true } } }, orderBy: [{ quantity: 'asc' }], take: PAGE, skip: (page - 1) * PAGE }),
    prisma.inventory.count({ where }),
  ]);
  const tab = (v: string, label: string) => (
    <Link href={`/admin/inventory?${new URLSearchParams({ ...(q ? { q } : {}), ...(v !== 'all' ? { view: v } : {}) })}`} className={`chip ${view === v ? 'is-active' : ''}`}>{label}</Link>
  );

  return (
    <>
      <PageHeader title="Inventory" subtitle="Set stock levels. Changes are logged." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Variants" value={summary.totalVariants} />
        <Stat label="Low stock" value={summary.lowStockCount} tone={summary.lowStockCount ? 'warn' : undefined} />
        <Stat label="Sold out" value={summary.outOfStockCount} tone={summary.outOfStockCount ? 'bad' : undefined} />
        <Stat label="Stock value" value={money(summary.totalValue)} />
      </div>
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder="Search product or SKU" className="field" />{view !== 'all' && <input type="hidden" name="view" value={view} />}<button className="btn btn-primary shrink-0">Search</button></form>
      <div className="mb-5 flex gap-2">{tab('all', 'All')}{tab('low', 'Low stock')}{tab('out', 'Sold out')}</div>

      {rows.length === 0 ? <Empty>Nothing here</Empty> : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.id} className="card grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.variant.product.name}</p>
                <p className="flex items-center gap-2 text-[13px] text-muted"><span className="h-3.5 w-3.5 rounded-full border border-black/15" style={{ background: r.variant.color.hexCode ?? '#111' }} />{r.variant.color.name} · {r.variant.size.name} · <span className="font-mono text-[12px]">{r.variant.sku}</span></p>
                {r.reservedQuantity > 0 && <p className="text-[12px] text-[#b45309]">{r.reservedQuantity} reserved in open orders</p>}
              </div>
              <StockEditor variantId={r.variantId} quantity={r.quantity} threshold={r.lowStockThreshold} />
            </li>
          ))}
        </ul>
      )}
      <Pager base="/admin/inventory" page={page} total={total} size={PAGE} params={{ q, view: view !== 'all' ? view : undefined }} />
    </>
  );
}
