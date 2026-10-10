'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ProductArt } from '@/components/svg/ProductArt';
import { IconMinus, IconPlus, IconTrash } from '@/components/layout/Icons';
import { clearCartAction, getCartAction, removeFromCartAction, updateCartItemAction } from '@/domains/cart/actions';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { setCartCount } from '@/lib/cart-events';
import type { CartView } from '@/domains/cart/service';
import { money } from '@/lib/utils';

/** Recompute totals locally so quantity changes feel instant (the server result replaces this). */
function withItems(cart: CartView, items: CartView['items']): CartView {
  const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0);
  const shipping = items.length === 0 || subtotal >= cart.freeShippingThreshold ? 0 : cart.baseShipping;
  return { ...cart, items, subtotal, shipping, total: subtotal + shipping, itemCount: items.reduce((n, i) => n + i.quantity, 0) };
}

export function CartClient() {
  const [cart, setCart] = useState<CartView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const apply = useCallback((c: CartView) => {
    setCart(c);
    setCartCount(c.itemCount);
  }, []);

  useEffect(() => {
    let alive = true;
    void getCartAction().then((res) => {
      if (!alive) return;
      if (res.success && res.data) apply(res.data);
      else setError(res.error ?? 'Could not load your bag');
    });
    return () => {
      alive = false;
    };
  }, [apply]);

  /** Optimistic mutation: update the screen now, confirm with the server, roll back on failure. */
  async function mutate(optimistic: CartView, run: () => Promise<{ success: boolean; error?: string; data?: CartView }>, previous: CartView) {
    setError(null);
    apply(optimistic);
    inflight.current++;
    const r = await run();
    inflight.current--;
    if (r.success && r.data) {
      if (inflight.current === 0) apply(r.data); // ignore stale results while newer clicks are in flight
    } else {
      setError(r.error ?? 'Something went wrong');
      apply(previous);
    }
  }

  const setQty = (id: string, quantity: number) => {
    if (!cart) return;
    const previous = cart;
    const next = withItems(cart, cart.items.map((i) => (i.id === id ? { ...i, quantity } : i)));
    void mutate(next, () => updateCartItemAction({ itemId: id, quantity }), previous);
  };
  const remove = (id: string) => {
    if (!cart) return;
    const previous = cart;
    void mutate(withItems(cart, cart.items.filter((i) => i.id !== id)), () => removeFromCartAction({ itemId: id }), previous);
  };

  async function clearAll() {
    if (!cart) return;
    setClearing(true);
    const previous = cart;
    apply(withItems(cart, [])); // instant: the screen empties now, rolled back if the server refuses
    setConfirmClear(false);
    const r = await clearCartAction();
    setClearing(false);
    if (r.success && r.data) apply(r.data);
    else {
      setError(r.error ?? 'Could not clear your cart');
      apply(previous);
    }
  }

  if (!cart && !error) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]" aria-busy>
        <div className="grid gap-4">{[0, 1].map((i) => <div key={i} className="skeleton h-32" />)}</div>
        <div className="skeleton h-64" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="card-soft grid place-items-center gap-3 px-6 py-16 text-center">
        <p className="text-[20px] font-semibold">Your cart is empty</p>
        <p className="max-w-sm text-muted">Looks like you have not added anything yet.</p>
        <Link href="/products" className="btn btn-primary">Start shopping</Link>
      </div>
    );
  }

  const gap = Math.max(0, cart.freeShippingThreshold - cart.subtotal);
  const blocked = cart.items.some((i) => !i.active || i.stock < i.quantity);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div>
        {error && <p role="alert" className="alert alert-error mb-4">{error}</p>}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13px] text-muted">{cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} in your cart</p>
          <button type="button" onClick={() => setConfirmClear(true)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium text-danger transition-colors hover:bg-[#fff1f0]">
            <IconTrash /> Clear cart
          </button>
        </div>
        <ConfirmDialog
          open={confirmClear}
          danger
          busy={clearing}
          title="Clear your cart?"
          message="This removes every item from your cart. You can always add them again from the shop."
          confirmLabel="Yes, clear cart"
          cancelLabel="Keep my items"
          onConfirm={() => void clearAll()}
          onCancel={() => setConfirmClear(false)}
        />
        <ul className="grid gap-3">
          {cart.items.map((it) => (
            <li key={it.id} className="card flex gap-4 p-3">
              <Link href={`/products/${it.slug}`} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-[12px] bg-surface sm:h-32 sm:w-28">
                <ProductArt imageUrl={it.imageUrl} garmentType={it.garmentType} color={it.colorHex} alt={it.name} sizes="128px" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/products/${it.slug}`} className="block truncate text-[14px] font-semibold">{it.name}</Link>
                    <p className="mt-1 flex items-center gap-2 text-[12px] text-muted">
                      <span className="h-3 w-3 rounded-full border border-black/15" style={{ background: it.colorHex }} />
                      {it.color} · Size {it.size}
                    </p>
                    {(!it.active || it.stock < it.quantity) && (
                      <p className="mt-1 text-[12px] font-medium text-danger">{!it.active ? 'No longer available' : it.stock === 0 ? 'Sold out' : `Only ${it.stock} left`}</p>
                    )}
                  </div>
                  <button type="button" aria-label={`Remove ${it.name}`} onClick={() => remove(it.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface hover:text-danger"><IconTrash /></button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="inline-flex items-center gap-1 rounded-full bg-surface p-1">
                    <button type="button" aria-label="Decrease" disabled={it.quantity <= 1} onClick={() => setQty(it.id, it.quantity - 1)} className="grid h-8 w-8 place-items-center rounded-full bg-white shadow-sm disabled:opacity-40"><IconMinus /></button>
                    <span className="w-8 text-center text-[13px] font-semibold tabular-nums">{it.quantity}</span>
                    <button type="button" aria-label="Increase" disabled={it.quantity >= Math.min(it.stock, 20)} onClick={() => setQty(it.id, it.quantity + 1)} className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white disabled:opacity-40"><IconPlus /></button>
                  </div>
                  <p className="text-[15px] font-bold">{money(it.price * it.quantity)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="card-soft p-5 lg:sticky lg:top-20">
        <h2 className="text-[18px]">Order summary</h2>
        {gap > 0 ? (
          <div className="mt-4">
            <p className="text-[12px] text-ink-2">Add <b>{money(gap)}</b> more for free delivery</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-ink transition-all duration-500" style={{ width: `${Math.min(100, (cart.subtotal / cart.freeShippingThreshold) * 100)}%` }} /></div>
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-white px-3 py-2 text-[12px] font-semibold text-ok">You unlocked free delivery</p>
        )}
        <dl className="mt-5 grid gap-2.5 text-[13px]">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money(cart.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{cart.shipping === 0 ? 'Free' : money(cart.shipping)}</dd></div>
          <div className="flex justify-between border-t border-line pt-3 text-[16px] font-bold"><dt>Total</dt><dd>{money(cart.total)}</dd></div>
        </dl>
        <Link href="/checkout" aria-disabled={blocked} className={`btn btn-primary btn-block mt-5 h-12 ${blocked ? 'pointer-events-none opacity-45' : ''}`}>Checkout</Link>
        {blocked && <p className="mt-2 text-center text-[12px] text-danger">Fix the highlighted items to continue</p>}
        <Link href="/products" className="mt-3 block text-center text-[13px] text-muted underline underline-offset-4">Continue shopping</Link>
      </aside>
    </div>
  );
}
