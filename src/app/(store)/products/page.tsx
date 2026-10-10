import Link from 'next/link';
import type { Metadata } from 'next';
import { ProductService, type ProductListOptions } from '@/domains/products/service';
import { ProductCard } from '@/components/store/ProductCard';
import { PageBanner } from '@/components/store/PageBanner';
import { ShopSearchBar } from '@/components/store/ShopSearchBar';
import { ShopSidebar } from '@/components/store/ShopSidebar';
import { Carousel } from '@/components/store/Carousel';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { GENDERS } from '@/lib/config/brand';
import type { Gender } from '@prisma/client';

export const metadata: Metadata = { title: 'Shop' };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const many = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const numOrU = (v: string | undefined) => (v && v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : undefined);

const SORTS: { value: NonNullable<ProductListOptions['sort']>; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A-Z' },
];

/** 1 … 4 5 6 … 12 style page list */
function pageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) out.push('…');
    out.push(n);
  });
  return out;
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Math.floor(Number(one(sp.page))) || 1);
  const category = one(sp.category);
  const genderRaw = one(sp.gender);
  const gender = GENDERS.some((g) => g.value === genderRaw) ? (genderRaw as Gender) : undefined;
  const sizes = many(sp.size).slice(0, 10);
  const colors = many(sp.color).slice(0, 10);
  const search = one(sp.search)?.trim().slice(0, 80) || undefined;
  const minPrice = numOrU(one(sp.min));
  const maxPrice = numOrU(one(sp.max));
  const sortRaw = one(sp.sort);
  const sort = SORTS.find((s) => s.value === sortRaw)?.value ?? 'newest';
  const featured = one(sp.featured) === '1';
  const sale = one(sp.sale) === '1';

  const [{ products, pagination }, categories, allSizes, allColors, recommended] = await Promise.all([
    ProductService.getProducts({ categorySlug: category, gender, sizes, colors, search, minPrice, maxPrice, featured, onSale: sale }, { page, limit: 12, sort }),
    ProductService.getCategories(),
    ProductService.getSizes(),
    ProductService.getColors(),
    ProductService.getFeaturedProducts(8),
  ]);

  const href = (over: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const base: Record<string, string | string[] | undefined> = {
      category, gender, search, min: minPrice?.toString(), max: maxPrice?.toString(),
      sort: sort === 'newest' ? undefined : sort, featured: featured ? '1' : undefined, sale: sale ? '1' : undefined, size: sizes, color: colors,
    };
    for (const [k, v] of Object.entries({ ...base, ...over })) {
      if (Array.isArray(v)) v.forEach((x) => u.append(k, x));
      else if (v) u.set(k, v);
    }
    const s = u.toString();
    return s ? `/products?${s}` : '/products';
  };

  const allCount = categories.reduce((n, c) => n + c._count.products, 0);
  const state = { category, gender, search, sort, featured, sale, min: minPrice, max: maxPrice, sizes, colors };
  const sidebar = <ShopSidebar state={state} total={pagination.total} categories={categories} sizes={allSizes} colors={allColors} sorts={SORTS} href={href} allCount={allCount} />;
  const activeFilters = sizes.length + colors.length + (minPrice != null ? 1 : 0) + (maxPrice != null ? 1 : 0) + (gender ? 1 : 0) + (sale ? 1 : 0) + (featured ? 1 : 0);
  const heading = search ? `Results for "${search}"` : (categories.find((c) => c.slug === category)?.name ?? 'All products');

  return (
    <>
      <PageBanner word="Shop" />
      <ShopSearchBar defaultValue={search} hidden={{ category }} />

      <div className="container-x mt-8 grid items-start gap-8 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="sticky top-20 hidden lg:block" aria-label="Filters">{sidebar}</aside>

        <div className="min-w-0">
          {/* phones: category chips + collapsible filters */}
          <div className="lg:hidden">
            <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              <Link href={href({ category: undefined, page: undefined })} className={`chip ${!category ? 'is-active' : ''}`}>All</Link>
              {categories.map((c) => (
                <Link key={c.id} href={href({ category: c.slug, page: undefined })} className={`chip ${category === c.slug ? 'is-active' : ''}`}>{c.name}</Link>
              ))}
            </div>
            <details className="card mt-3" open={activeFilters > 0}>
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-[13px] font-semibold">
                <span>Filters {activeFilters > 0 && <span className="badge badge-ink ml-2">{activeFilters}</span>}</span>
                <span className="font-normal text-muted">{pagination.total} items</span>
              </summary>
              <div className="border-t border-line p-4">{sidebar}</div>
            </details>
          </div>

          <Breadcrumbs
            className="mt-5 lg:mt-0"
            items={[
              { label: 'Home', href: '/' },
              { label: 'Shop', href: category || search || gender || featured || sale ? '/products' : undefined },
              ...(category ? [{ label: categories.find((c) => c.slug === category)?.name ?? category }] : []),
              ...(search ? [{ label: `Search: ${search}` }] : []),
              ...(!category && !search && featured ? [{ label: 'Featured' }] : []),
              ...(!category && !search && sale ? [{ label: 'On discount' }] : []),
            ]}
          />
          <div className="mb-4 mt-3 flex items-end justify-between gap-3">
            <h2 className="text-[18px] font-bold md:text-[20px]">{heading}</h2>
            <p className="text-[12px] text-muted">{pagination.total} item{pagination.total === 1 ? '' : 's'}</p>
          </div>

          {products.length === 0 ? (
            <div className="card-soft p-12 text-center">
              <p className="text-[18px] font-semibold">Nothing matches those filters</p>
              <p className="mt-1 text-muted">Try removing a filter or searching for something else.</p>
              <Link href="/products" className="btn btn-primary mt-5">Clear all</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-3 md:gap-x-4">
              {products.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 3} />)}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[13px]">
              <div>
                {page > 1 ? <Link href={href({ page: page - 1 === 1 ? undefined : String(page - 1) })} className="inline-flex items-center gap-1 rounded-full px-2 py-2 font-medium hover:bg-surface">‹ Previous</Link> : <span className="px-2 py-2 text-muted/50">‹ Previous</span>}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1">
                {pageList(pagination.page, pagination.totalPages).map((n, i) =>
                  n === '…' ? <span key={`e${i}`} className="px-1 text-muted">…</span> : (
                    <Link key={n} href={href({ page: n === 1 ? undefined : String(n) })} aria-current={n === pagination.page ? 'page' : undefined} className={`grid h-8 min-w-8 place-items-center rounded-full px-2 font-medium ${n === pagination.page ? 'bg-ink text-white' : 'hover:bg-surface'}`}>{n}</Link>
                  ),
                )}
              </div>
              <div className="text-right">
                {page < pagination.totalPages ? <Link href={href({ page: String(page + 1) })} className="inline-flex items-center gap-1 rounded-full px-2 py-2 font-medium hover:bg-surface">Next ›</Link> : <span className="px-2 py-2 text-muted/50">Next ›</span>}
              </div>
            </nav>
          )}
        </div>
      </div>

      {recommended.length > 0 && (
        <Carousel title="Explore our recommendations">
          {recommended.map((p) => (
            <div key={p.id} className="w-[200px] shrink-0 snap-start sm:w-[230px]"><ProductCard p={p} /></div>
          ))}
        </Carousel>
      )}
    </>
  );
}
