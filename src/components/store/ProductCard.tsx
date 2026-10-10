import Link from 'next/link';
import { ProductArt, isSvgArt } from '@/components/svg/ProductArt';
import { QuickBuy } from './QuickBuy';
import { money } from '@/lib/utils';
import type { ProductCard as Card } from '@/domains/products/service';

export function ProductCard({ p, priority, compact }: { p: Card; priority?: boolean; compact?: boolean }) {
  const first = p.colors[0]?.hex;
  const discount = p.comparePrice && p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : 0;
  // hover swap: generated art flips to the back view, photos use the second image
  const hover = p.imageUrl2 ?? (isSvgArt(p.imageUrl) || !p.imageUrl ? 'svg:back' : null);
  const href = `/products/${p.slug}`;

  return (
    <article className="group">
      <Link href={href} className="relative block aspect-[4/5] overflow-hidden rounded-[14px] bg-surface" aria-label={p.name}>
        <div className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-0">
          <ProductArt imageUrl={p.imageUrl} garmentType={p.garmentType} color={first} alt={p.name} priority={priority} />
        </div>
        {hover && (
          <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
            <ProductArt imageUrl={hover} garmentType={p.garmentType} color={first} alt="" />
          </div>
        )}
        <span className="absolute right-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-ink-2 shadow-sm">{p.category}</span>
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1">
          {p.isNew && <span className="badge badge-orange">New</span>}
          {discount > 0 && <span className="badge badge-green">-{discount}%</span>}
        </div>
        {!p.inStock && <span className="absolute inset-x-2.5 bottom-2.5 rounded-full bg-white/95 py-1 text-center text-[11px] font-semibold">Sold out</span>}
      </Link>

      <div className="px-0.5 pt-3">
        <Link href={href} className="block truncate text-[13px] font-semibold leading-tight hover:underline">{p.name}</Link>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="text-[14px] font-bold">{money(p.price)}</span>
          {discount > 0 && p.comparePrice && <span className="text-[12px] text-muted line-through">{money(p.comparePrice)}</span>}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted">
          <ul className="flex -space-x-1" aria-label="Available colours">
            {p.colors.slice(0, 5).map((c) => (
              <li key={c.name} title={c.name} className="h-3.5 w-3.5 rounded-full border border-black/15" style={{ background: c.hex }} />
            ))}
            {p.colors.length > 5 && <li className="pl-2">+{p.colors.length - 5}</li>}
          </ul>
          <span className={p.inStock ? 'text-ok' : 'text-danger'}>{p.inStock ? 'In stock' : 'Out of stock'}</span>
        </div>
        {!compact && <QuickBuy p={p} />}
      </div>
    </article>
  );
}
