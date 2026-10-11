'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { ProductArt } from '@/components/svg/ProductArt';
import { IconCheck, IconMinus, IconPlus, IconShare, IconWhatsApp } from '@/components/layout/Icons';
import { whatsappLink } from '@/lib/social';
import { addToCartAction } from '@/domains/cart/actions';
import { bumpCart } from '@/lib/cart-events';
import { money } from '@/lib/utils';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export interface DetailProduct {
  id: string;
  name: string;
  description: string | null;
  material: string | null;
  careInfo: string | null;
  badge: string | null;
  garmentType: string;
  category: string;
  categorySlug: string;
  isNew: boolean;
  images: { id: string; url: string; alt: string | null; colorId: string | null }[];
  variants: {
    id: string;
    sku: string;
    price: number;
    comparePrice: number | null;
    size: { id: string; name: string; sortOrder: number };
    color: { id: string; name: string; hex: string };
    stock: number;
  }[];
}

const FALLBACK_VIEWS = ['svg:front', 'svg:back', 'svg:detail', 'svg:studio'];

export function ProductDetail({ product, whatsapp, url }: { product: DetailProduct; whatsapp?: string; url?: string }) {
  const colors = useMemo(() => {
    const m = new Map<string, DetailProduct['variants'][number]['color']>();
    product.variants.forEach((v) => m.has(v.color.id) || m.set(v.color.id, v.color));
    return [...m.values()];
  }, [product.variants]);

  const firstAvailable = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [colorId, setColorId] = useState(firstAvailable?.color.id ?? colors[0]?.id);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [shared, setShared] = useState(false);
  const share = async () => {
    const data = { title: product.name, text: `${product.name} by The Lakeside: Where calm meets clarity.`, url: window.location.href };
    try {
      if (navigator.share) return await navigator.share(data);
      await navigator.clipboard.writeText(data.url);
      setShared(true);
      window.setTimeout(() => setShared(false), 2000);
    } catch {
      /* share sheet dismissed */
    }
  };
  const [pending, start] = useTransition();
  const router = useRouter();

  const color = colors.find((c) => c.id === colorId);
  const forColor = product.variants.filter((v) => v.color.id === colorId);
  const sizes = [...new Map(product.variants.map((v) => [v.size.id, v.size])).values()].sort((a, b) => a.sortOrder - b.sortOrder);
  const variant = forColor.find((v) => v.size.id === sizeId);

  // gallery: photos for this colour (or colour-agnostic), else generated vector views tinted to the colour
  const gallery = useMemo(() => {
    const own = product.images.filter((i) => !i.colorId || i.colorId === colorId);
    if (own.length) return own.map((i) => ({ id: i.id, url: i.url, alt: i.alt }));
    return FALLBACK_VIEWS.map((u) => ({ id: u, url: u, alt: null }));
  }, [product.images, colorId]);
  const current = gallery[Math.min(active, gallery.length - 1)];

  const prices = (variant ? [variant] : forColor.length ? forColor : product.variants).map((v) => v.price);
  const unit = Math.min(...prices);
  const compare = (variant ?? forColor[0])?.comparePrice ?? null;
  const discount = compare && compare > unit ? Math.round((1 - unit / compare) * 100) : 0;
  const maxQty = Math.max(1, Math.min(variant?.stock ?? 1, 20));

  function add(goToBag = false) {
    if (!variant) return setMsg({ ok: false, text: 'Please select a size' });
    if (variant.stock < 1) return setMsg({ ok: false, text: 'That size is sold out in this colour' });
    const q = qty;
    bumpCart(q); // optimistic: badge + confirmation show instantly, rolled back if the server refuses
    if (!goToBag) setMsg({ ok: true, text: `${product.name} added to your bag` });
    else setMsg(null);
    start(async () => {
      const res = await addToCartAction({ variantId: variant.id, quantity: q });
      if (res.success) {
        if (goToBag) router.push('/cart');
      } else {
        bumpCart(-q);
        setMsg({ ok: false, text: res.error ?? 'Could not add to bag' });
      }
    });
  }

  return (
    <div className="container-x pt-4 md:pt-10">
      <Breadcrumbs
        className="mb-5"
        items={[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/products' }, { label: product.category, href: `/products?category=${product.categorySlug}` }, { label: product.name }]}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
        {/* gallery: large image + vertical thumbnails on the right */}
        <div className="flex min-w-0 gap-3 md:gap-4">
          <div className="relative aspect-[4/5] min-w-0 flex-1 overflow-hidden rounded-[16px] bg-surface">
            <div key={current?.id + (color?.id ?? '')} className="anim-fade absolute inset-0">
              <ProductArt imageUrl={current?.url} garmentType={product.garmentType} color={color?.hex} alt={current?.alt || `${product.name} in ${color?.name ?? ''}`} priority sizes="(max-width:1024px) 80vw, 560px" />
            </div>
            <div className="absolute bottom-4 left-4 flex gap-2">
              {product.isNew && <span className="badge badge-orange">New</span>}
              {discount > 0 && <span className="badge badge-green">Discount {discount}%</span>}
              {product.badge && !(product.isNew && /^new$/i.test(product.badge)) && <span className="badge badge-ink">{product.badge}</span>}
            </div>
          </div>
          <ul className="flex w-[64px] shrink-0 flex-col gap-2.5 md:w-[84px]" aria-label="Product images">
            {gallery.map((g, i) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Show image ${i + 1}`}
                  aria-current={i === active}
                  className={`relative block aspect-square w-full overflow-hidden rounded-xl bg-surface transition-all ${i === active ? 'ring-2 ring-ink ring-offset-2' : 'opacity-70 hover:opacity-100'}`}
                >
                  <ProductArt imageUrl={g.url} garmentType={product.garmentType} color={color?.hex} alt="" sizes="84px" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* details */}
        <div className="min-w-0 lg:pt-2">
          <p className="eyebrow">{product.category}</p>
          <h1 className="mt-2 text-[26px] font-semibold md:text-[34px]">{product.name}</h1>

          <div className="mt-4 flex items-baseline gap-3">
            <p className="text-[22px] font-bold tracking-tight">{variant ? money(unit * qty) : money(unit)}</p>
            {!variant && prices.length > 1 && Math.max(...prices) !== unit && <span className="text-[13px] text-muted">from</span>}
            {discount > 0 && compare && <span className="text-[16px] text-muted line-through">{money(compare)}</span>}
          </div>

          {product.description && <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-2">{product.description}</p>}

          <section className="mt-7" aria-label="Colour">
            <p className="label">Colour: <span className="font-normal text-muted">{color?.name}</span></p>
            <div className="flex flex-wrap gap-3">
              {colors.map((c) => {
                const out = !product.variants.some((v) => v.color.id === c.id && v.stock > 0);
                return (
                  <button
                    key={c.id}
                    type="button"
                    title={c.name + (out ? ' (sold out)' : '')}
                    aria-label={c.name}
                    aria-pressed={c.id === colorId}
                    onClick={() => { setColorId(c.id); setActive(0); setSizeId(null); setQty(1); setMsg(null); }}
                    className={`relative h-10 w-10 rounded-full border border-black/15 ring-offset-2 transition-all ${c.id === colorId ? 'ring-2 ring-ink' : 'hover:ring-2 hover:ring-line'} ${out ? 'opacity-40' : ''}`}
                    style={{ background: c.hex }}
                  />
                );
              })}
            </div>
          </section>

          <section className="mt-6" aria-label="Size">
            <div className="mb-2 flex items-center justify-between">
              <p className="label !mb-0">Select size</p>
              <Link href="/about#size-guide" className="text-[13px] text-muted underline underline-offset-4">Size guide</Link>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {sizes.map((s) => {
                const v = forColor.find((x) => x.size.id === s.id);
                const disabled = !v || v.stock < 1;
                const on = sizeId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={disabled}
                    aria-pressed={on}
                    onClick={() => { setSizeId(s.id); setQty(1); setMsg(null); }}
                    className={`grid h-10 min-w-10 place-items-center rounded-full border px-3.5 text-[13px] font-medium transition-all ${on ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink'} ${disabled ? 'cursor-not-allowed text-muted line-through opacity-50' : ''}`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
            {variant && variant.stock <= 5 && variant.stock > 0 && <p className="mt-2 text-[13px] font-medium text-[#b45309]">Only {variant.stock} left</p>}
          </section>

          <div className="mt-7 flex items-end justify-between gap-4">
            <div>
              <p className="label">Qty</p>
              <div className="inline-flex items-center gap-1 rounded-full bg-surface p-1">
                <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-sm disabled:opacity-40" disabled={qty <= 1}><IconMinus /></button>
                <span className="w-10 text-center text-[16px] font-medium tabular-nums" aria-live="polite">{qty}</span>
                <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white disabled:opacity-40" disabled={qty >= maxQty}><IconPlus /></button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-muted">Total price</p>
              <p className="text-[26px] font-semibold tracking-tight">{money(unit * qty)}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
            {whatsapp && (
              <a
                href={whatsappLink(
                  whatsapp,
                  `Hi The Lakeside, I'd like to order the ${product.name}` +
                    `${color ? ` (${color.name}` : ''}${variant ? `, size ${variant.size.name}` : ''}${color ? ')' : ''}` +
                    ` x${qty}.${url ? ` ${url}` : ''}`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="btn h-12 border border-[#25D366] bg-[#25D366]/10 text-[#0d7a3b] hover:bg-[#25D366] hover:text-white"
              >
                <IconWhatsApp width={20} height={20} /> Order on WhatsApp
              </a>
            )}
            <button type="button" onClick={share} className="btn btn-soft h-12 px-4" aria-label="Share this tee">
              <IconShare width={20} height={20} /> <span className="hidden sm:inline">{shared ? 'Link copied' : 'Share'}</span>
            </button>
          </div>

          {msg && (
            <p role="status" className={`alert mt-4 flex items-center gap-2 ${msg.ok ? 'alert-ok' : 'alert-error'}`}>
              {msg.ok && <IconCheck />} {msg.text}
              {msg.ok && <Link href="/cart" className="ml-auto font-semibold underline">View bag</Link>}
            </p>
          )}

          <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 p-3 backdrop-blur md:static md:z-auto md:mt-5 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            <div className="mx-auto flex max-w-[1240px] gap-3 md:max-w-none">
              <button type="button" onClick={() => add(false)} disabled={pending} className="btn btn-primary h-12 flex-1">
                {pending ? 'Adding…' : 'Add to Cart'}
              </button>
              <button type="button" onClick={() => add(true)} disabled={pending} className="btn btn-ghost h-12 flex-1">Buy Now</button>
            </div>
          </div>

          {(product.material || product.careInfo) && (
            <dl className="mt-8 grid gap-4 border-t border-line pt-6 text-[14px]">
              {product.material && (<div><dt className="font-medium">Material</dt><dd className="text-muted">{product.material}</dd></div>)}
              {product.careInfo && (<div><dt className="font-medium">Care</dt><dd className="text-muted">{product.careInfo}</dd></div>)}
            </dl>
          )}
        </div>
      </div>
      <div className="h-24 md:hidden" aria-hidden />
    </div>
  );
}
