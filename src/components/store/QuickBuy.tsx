'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { IconCheck, IconClose } from '@/components/layout/Icons';
import { addToCartAction } from '@/domains/cart/actions';
import { bumpCart } from '@/lib/cart-events';
import { money } from '@/lib/utils';
import type { ProductCard } from '@/domains/products/service';

/** Add to Cart / Buy Now buttons that open a small colour + size picker. */
export function QuickBuy({ p }: { p: ProductCard }) {
  const router = useRouter();
  const [open, setOpen] = useState<null | 'cart' | 'buy'>(null);
  const [color, setColor] = useState(p.colors[0]?.name ?? '');
  const [variantId, setVariantId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const sizes = useMemo(() => p.variants.filter((v) => v.color === color).sort((a, b) => a.sortOrder - b.sortOrder), [p.variants, color]);
  const chosen = sizes.find((v) => v.id === variantId);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  function confirm() {
    if (!chosen) return setMsg({ ok: false, text: 'Please choose a size' });
    setMsg(null);
    if (open === 'cart') {
      bumpCart(1); // optimistic
      setMsg({ ok: true, text: 'Added to your cart' });
    }
    start(async () => {
      const r = await addToCartAction({ variantId: chosen.id, quantity: 1 });
      if (!r.success) {
        if (open === 'cart') bumpCart(-1);
        return setMsg({ ok: false, text: r.error ?? 'Could not add to cart' });
      }
      if (open === 'buy') router.push('/checkout');
    });
  }

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" disabled={!p.inStock} onClick={() => { setOpen('cart'); setMsg(null); }} className="btn btn-ghost !min-h-9 !px-2 text-[12px]">Add to Cart</button>
        <button type="button" disabled={!p.inStock} onClick={() => { setOpen('buy'); setMsg(null); }} className="btn btn-primary !min-h-9 !px-2 text-[12px]">Buy Now</button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Choose options for ${p.name}`}>
          <button className="anim-fade absolute inset-0 bg-black/40" aria-label="Close" onClick={() => setOpen(null)} />
          <div className="anim-rise relative w-full max-w-sm rounded-t-[24px] bg-white p-5 shadow-2xl sm:rounded-[24px]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">{p.name}</p>
                <p className="text-[13px] text-muted">{money(chosen?.price ?? p.price)}</p>
              </div>
              <button aria-label="Close" onClick={() => setOpen(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface"><IconClose width={18} height={18} /></button>
            </div>

            <p className="label mt-5">Colour: <span className="font-normal text-muted">{color}</span></p>
            <div className="flex flex-wrap gap-2.5">
              {p.colors.map((c) => (
                <button key={c.name} type="button" title={c.name} aria-label={c.name} aria-pressed={c.name === color} onClick={() => { setColor(c.name); setVariantId(null); }} className={`h-8 w-8 rounded-full border border-black/15 ring-offset-2 ${c.name === color ? 'ring-2 ring-ink' : ''}`} style={{ background: c.hex }} />
              ))}
            </div>

            <p className="label mt-4">Size</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((v) => (
                <button key={v.id} type="button" disabled={v.stock < 1} aria-pressed={v.id === variantId} onClick={() => setVariantId(v.id)} className={`grid h-10 min-w-10 place-items-center rounded-full px-3 text-[13px] font-medium ${v.id === variantId ? 'bg-ink text-white' : 'bg-surface'} disabled:line-through disabled:opacity-40`}>{v.size}</button>
              ))}
            </div>

            {msg && (
              <p role="status" className={`alert mt-4 flex items-center gap-2 ${msg.ok ? 'alert-ok' : 'alert-error'}`}>
                {msg.ok && <IconCheck />}{msg.text}
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              {msg?.ok ? (
                <>
                  <button className="btn btn-ghost" onClick={() => setOpen(null)}>Keep shopping</button>
                  <button className="btn btn-primary" onClick={() => router.push('/cart')}>View cart</button>
                </>
              ) : (
                <button className="btn btn-primary col-span-2" disabled={pending} onClick={confirm}>{pending ? 'Working…' : open === 'buy' ? 'Buy now' : 'Add to cart'}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
