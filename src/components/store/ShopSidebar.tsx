import Link from 'next/link';
import { GENDERS } from '@/lib/config/brand';

export interface SidebarState {
  category?: string;
  gender?: string;
  search?: string;
  sort: string;
  featured: boolean;
  sale: boolean;
  min?: number;
  max?: number;
  sizes: string[];
  colors: string[];
}

interface Props {
  state: SidebarState;
  total: number;
  categories: { id: string; name: string; slug: string; _count: { products: number } }[];
  sizes: { id: string; name: string }[];
  colors: { id: string; name: string; hexCode: string | null }[];
  sorts: { value: string; label: string }[];
  href: (over: Record<string, string | undefined>) => string;
  allCount: number;
}

const item = 'flex min-h-9 items-center justify-between gap-2 rounded-full px-3 text-[13px] transition-colors';

/** Category tree + filters. Rendered on desktop as a sidebar and on phones inside a collapsible panel. */
export function ShopSidebar({ state, categories, sizes, colors, sorts, href, allCount }: Props) {
  const quick = [
    { label: 'New arrivals', to: href({ sort: 'newest', featured: undefined, sale: undefined, page: undefined }), active: state.sort === 'newest' && !state.featured && !state.sale && false },
    { label: 'Best sellers', to: href({ featured: '1', sale: undefined, page: undefined }), active: state.featured },
    { label: 'On discount', to: href({ sale: '1', featured: undefined, page: undefined }), active: state.sale },
  ];

  return (
    <div className="grid gap-6 text-[13px]">
      <nav aria-label="Categories">
        <p className="mb-2 text-[14px] font-bold">Category</p>
        <ul className="grid gap-0.5">
          <li>
            <Link href={href({ category: undefined, page: undefined })} className={`${item} ${!state.category ? 'bg-surface font-semibold' : 'text-ink-2 hover:bg-surface'}`}>
              <span>All Product</span>
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[10px] font-bold text-white">{allCount}</span>
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.id} className="ml-3 border-l border-line pl-1.5">
              <Link href={href({ category: c.slug, page: undefined })} className={`${item} ${state.category === c.slug ? 'bg-surface font-semibold' : 'text-ink-2 hover:bg-surface'}`}>
                <span className="truncate">{c.name}</span>
                <span className="text-[11px] text-muted">{c._count.products}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="Collections">
        <p className="mb-2 text-[14px] font-bold">Collections</p>
        <ul className="grid gap-0.5">
          {quick.map((q) => (
            <li key={q.label}>
              <Link href={q.to} className={`${item} ${q.active ? 'bg-surface font-semibold' : 'text-ink-2 hover:bg-surface'}`}>{q.label}</Link>
            </li>
          ))}
        </ul>
      </nav>

      <form action="/products" method="get" className="grid gap-5 border-t border-line pt-5">
        {state.category && <input type="hidden" name="category" value={state.category} />}
        {state.search && <input type="hidden" name="search" value={state.search} />}
        {state.featured && <input type="hidden" name="featured" value="1" />}
        {state.sale && <input type="hidden" name="sale" value="1" />}

        <fieldset>
          <legend className="mb-2 text-[14px] font-bold">Size</legend>
          <div className="flex flex-wrap gap-1.5">
            {sizes.map((s) => (
              <label key={s.id} className="cursor-pointer">
                <input type="checkbox" name="size" value={s.name} defaultChecked={state.sizes.includes(s.name)} className="peer sr-only" />
                <span className="grid h-8 min-w-8 place-items-center rounded-full border border-line px-2.5 text-[12px] font-medium peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-ink">{s.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-[14px] font-bold">Colour</legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <label key={c.id} className="cursor-pointer" title={c.name}>
                <input type="checkbox" name="color" value={c.name} defaultChecked={state.colors.includes(c.name)} className="peer sr-only" />
                <span className="block h-6 w-6 rounded-full border border-black/15 ring-offset-2 peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink" style={{ background: c.hexCode ?? '#111' }} />
                <span className="sr-only">{c.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-1.5">
          <span className="text-[14px] font-bold">Fit for</span>
          <select name="gender" defaultValue={state.gender ?? ''} className="field !min-h-10 !rounded-full">
            <option value="">Everyone</option>
            {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </label>

        <div>
          <p className="mb-2 text-[14px] font-bold">Price (GHS)</p>
          <div className="grid grid-cols-2 gap-2">
            <input name="min" type="number" min={0} inputMode="numeric" placeholder="Min" defaultValue={state.min} aria-label="Minimum price" className="field !min-h-10 !rounded-full" />
            <input name="max" type="number" min={0} inputMode="numeric" placeholder="Max" defaultValue={state.max} aria-label="Maximum price" className="field !min-h-10 !rounded-full" />
          </div>
        </div>

        <label className="grid gap-1.5">
          <span className="text-[14px] font-bold">Sort by</span>
          <select name="sort" defaultValue={state.sort} className="field !min-h-10 !rounded-full">
            {sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-primary btn-sm">Apply</button>
          <Link href={href({ size: undefined, color: undefined, min: undefined, max: undefined, gender: undefined, sort: undefined, sale: undefined, featured: undefined, page: undefined })} className="btn btn-ghost btn-sm">Reset</Link>
        </div>
      </form>
    </div>
  );
}
