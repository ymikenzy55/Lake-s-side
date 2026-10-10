import Link from 'next/link';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { PageHeader, Empty } from '@/components/admin/ui';
import { ProductArt } from '@/components/svg/ProductArt';
import { Pager } from '@/components/admin/Pager';
import { ProductRowToggles } from '@/components/admin/ProductRowToggles';
import { money } from '@/lib/utils';

const PAGE = 20;

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; category?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 60);
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = {
    ...(q && { OR: [{ name: { contains: q, mode: 'insensitive' } }, { variants: { some: { sku: { contains: q, mode: 'insensitive' } } } }] }),
    ...(sp.category && { category: { slug: sp.category } }),
  };
  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: {
        category: { select: { name: true } },
        images: { orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }], take: 1 },
        variants: { select: { color: { select: { hexCode: true } }, inventory: { select: { quantity: true } } } },
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { displayOrder: 'asc' }, select: { slug: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader title="Products" subtitle={`${total} product${total === 1 ? '' : 's'}`} actions={<Link href="/admin/products/new" className="btn btn-primary btn-sm">Add product</Link>} />

      <form className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input name="q" defaultValue={q} placeholder="Search name or SKU" className="field" />
        <select name="category" defaultValue={sp.category ?? ''} className="field sm:max-w-[220px]"><option value="">All categories</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
        <button className="btn btn-primary shrink-0">Filter</button>
      </form>

      {products.length === 0 ? <Empty>No products yet. <Link href="/admin/products/new" className="underline">Add your first one</Link>.</Empty> : (
        <ul className="grid gap-3">
          {products.map((p) => {
            const stock = p.variants.reduce((n, v) => n + (v.inventory?.quantity ?? 0), 0);
            return (
              <li key={p.id} className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4">
                <Link href={`/admin/products/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-surface"><ProductArt imageUrl={p.images[0]?.imageUrl} garmentType={p.garmentType} color={p.variants[0]?.color.hexCode} alt="" sizes="64px" /></div>
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-medium">{p.name}</p>
                    <p className="text-[13px] text-muted">{p.category.name} · {p.variants.length} variants · from {money(Number(p.minPrice))}</p>
                    <p className={`text-[13px] font-medium ${stock === 0 ? 'text-danger' : stock < 10 ? 'text-[#b45309]' : 'text-muted'}`}>{stock} in stock</p>
                  </div>
                </Link>
                <ProductRowToggles id={p.id} isActive={p.isActive} featured={p.featured} />
              </li>
            );
          })}
        </ul>
      )}

      <Pager base="/admin/products" page={page} total={total} size={PAGE} params={{ q, category: sp.category }} />
    </>
  );
}
