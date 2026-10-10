'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { ProductArt } from '@/components/svg/ProductArt';
import { getCartAction } from '@/domains/cart/actions';
import { applyPromoAction, getCheckoutOptionsAction, placeOrderAction } from '@/domains/checkout/actions';
import type { CartView } from '@/domains/cart/service';
import { money } from '@/lib/utils';

const REGIONS = ['Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern', 'Volta', 'Northern', 'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo', 'Oti', 'Savannah', 'North East', 'Western North'];

type Options = Awaited<ReturnType<typeof getCheckoutOptionsAction>>;

export function CheckoutClient() {
  const [cart, setCart] = useState<CartView | null>(null);
  const [opts, setOpts] = useState<Options | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<'PAYSTACK' | 'CASH_ON_DELIVERY'>('CASH_ON_DELIVERY');
  const [promo, setPromo] = useState('');
  const [promoState, setPromoState] = useState<{ ok: boolean; text: string; amount?: number } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    void (async () => {
      const [c, o] = await Promise.all([getCartAction(), getCheckoutOptionsAction()]);
      if (c.success && c.data) setCart(c.data);
      setOpts(o);
      setMethod(o.paystack ? 'PAYSTACK' : 'CASH_ON_DELIVERY');
    })();
  }, []);

  if (!cart || !opts) return <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"><div className="skeleton h-96" /><div className="skeleton h-72" /></div>;

  if (cart.items.length === 0) {
    return (
      <div className="card-soft grid place-items-center gap-4 px-6 py-20 text-center">
        <p className="text-[24px] font-medium">Your bag is empty</p>
        <Link href="/products" className="btn btn-primary">Browse products</Link>
      </div>
    );
  }

  const discount = promoState?.ok ? (promoState.amount ?? 0) : 0;
  const total = Math.max(0, cart.subtotal - discount + cart.shipping);
  const p = opts.profile;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? '');
    start(async () => {
      const res = await placeOrderAction({
        email: g('email'),
        name: g('name'),
        phone: g('phone'),
        paymentMethod: method,
        discountCode: promoState?.ok ? promo : undefined,
        notes: g('notes'),
        address: { fullName: g('name'), phone: g('phone'), region: g('region'), city: g('city'), streetAddress: g('street'), landmark: g('landmark') },
      });
      if (res.success && res.redirectUrl) window.location.assign(res.redirectUrl);
      else setError(res.error ?? 'Could not place your order');
    });
  }

  return (
    <form method="post" onSubmit={onSubmit} className="grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="grid gap-6">
        {error && <p role="alert" className="alert alert-error">{error}</p>}

        {!p && (
          <p className="alert flex flex-wrap items-center justify-between gap-2 border border-line bg-surface">
            <span><b>Checking out as a guest.</b> No account needed. You will get a receipt and a tracking ID by email.</span>
            <Link href="/login?redirect=/checkout" className="font-semibold underline underline-offset-4">Sign in instead</Link>
          </p>
        )}

        <section className="card p-5 md:p-7">
          <h2 className="mb-4 text-[20px]">Contact</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2"><label className="label" htmlFor="name">Full name</label><input id="name" name="name" required minLength={2} autoComplete="name" defaultValue={[p?.firstName, p?.lastName].filter(Boolean).join(' ')} className="field" /></div>
            <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" defaultValue={p?.email} className="field" /></div>
            <div><label className="label" htmlFor="phone">Phone / MoMo number</label><input id="phone" name="phone" type="tel" required inputMode="tel" autoComplete="tel" defaultValue={p?.phone ?? ''} placeholder="024 000 0000" className="field" /></div>
          </div>
        </section>

        <section className="card p-5 md:p-7">
          <h2 className="mb-4 text-[20px]">Delivery address</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="label" htmlFor="region">Region</label>
              <select id="region" name="region" required defaultValue="Greater Accra" className="field">{REGIONS.map((r) => <option key={r}>{r}</option>)}</select></div>
            <div><label className="label" htmlFor="city">City / town</label><input id="city" name="city" required autoComplete="address-level2" className="field" /></div>
                        <div><label className="label" htmlFor="landmark">Landmark (optional)</label><input id="landmark" name="landmark" className="field" /></div>
            <div className="md:col-span-2"><label className="label" htmlFor="street">Street / house number / GhanaPost GPS (optional)</label><input id="street" name="street" autoComplete="street-address" className="field" /></div>
            <div className="md:col-span-2"><label className="label" htmlFor="notes">Delivery notes (optional)</label><textarea id="notes" name="notes" maxLength={300} className="field" /></div>
          </div>
        </section>

        <section className="card p-5 md:p-7">
          <h2 className="mb-4 text-[20px]">Payment</h2>
          <div className="grid gap-3">
            {opts.paystack && (
              <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${method === 'PAYSTACK' ? 'border-ink bg-surface' : 'border-line'}`}>
                <input type="radio" name="pm" checked={method === 'PAYSTACK'} onChange={() => setMethod('PAYSTACK')} className="mt-1 h-4 w-4 accent-black" />
                <span><span className="block font-medium">Mobile money or card</span><span className="text-[13px] text-muted">Pay securely online with Paystack (MTN MoMo, Vodafone Cash, AirtelTigo, Visa, Mastercard).</span></span>
              </label>
            )}
            {opts.cod && (
              <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${method === 'CASH_ON_DELIVERY' ? 'border-ink bg-surface' : 'border-line'}`}>
                <input type="radio" name="pm" checked={method === 'CASH_ON_DELIVERY'} onChange={() => setMethod('CASH_ON_DELIVERY')} className="mt-1 h-4 w-4 accent-black" />
                <span><span className="block font-medium">Cash on delivery</span><span className="text-[13px] text-muted">Pay the rider when your order arrives.</span></span>
              </label>
            )}
            {!opts.paystack && !opts.cod && <p className="alert alert-error">No payment methods are available right now. Please contact us.</p>}
          </div>
        </section>
      </div>

      <aside className="card-soft p-5 md:p-7 lg:sticky lg:top-6">
        <h2 className="text-[22px]">Summary</h2>
        <ul className="mt-4 grid gap-3">
          {cart.items.map((it) => (
            <li key={it.id} className="flex items-center gap-3">
              <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-white"><ProductArt imageUrl={it.imageUrl} garmentType={it.garmentType} color={it.colorHex} alt="" sizes="56px" /></div>
              <div className="min-w-0 flex-1 text-[14px]"><p className="truncate font-medium">{it.name}</p><p className="text-[12px] text-muted">{it.color} · {it.size} × {it.quantity}</p></div>
              <p className="text-[14px] font-medium">{money(it.price * it.quantity)}</p>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex gap-2">
          <input value={promo} onChange={(e) => { setPromo(e.target.value.toUpperCase()); setPromoState(null); }} placeholder="Promo code" className="field !min-h-11 uppercase" maxLength={40} aria-label="Promo code" />
          <button type="button" className="btn btn-ghost !min-h-11" disabled={!promo || pending} onClick={() => start(async () => { const r = await applyPromoAction(promo); setPromoState(r.success ? { ok: true, text: `Saved ${money(r.amount ?? 0)}`, amount: r.amount } : { ok: false, text: r.error ?? 'Invalid code' }); })}>Apply</button>
        </div>
        {promoState && <p className={`mt-2 text-[13px] ${promoState.ok ? 'text-ok' : 'text-danger'}`}>{promoState.text}</p>}

        <dl className="mt-5 grid gap-3 text-[15px]">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money(cart.subtotal)}</dd></div>
          {discount > 0 && <div className="flex justify-between text-ok"><dt>Discount</dt><dd>-{money(discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{cart.shipping === 0 ? 'Free' : money(cart.shipping)}</dd></div>
          <div className="flex justify-between border-t border-line pt-3 text-[19px] font-semibold"><dt>Total</dt><dd>{money(total)}</dd></div>
        </dl>
        <button type="submit" disabled={pending || (!opts.paystack && !opts.cod)} className="btn btn-primary btn-block mt-6 h-[56px] !rounded-[18px]">
          {pending ? 'Placing order…' : method === 'PAYSTACK' ? `Pay ${money(total)}` : 'Place order'}
        </button>
        <p className="mt-3 text-center text-[12px] text-muted">By placing your order you agree to our delivery and returns policy.</p>
      </aside>
    </form>
  );
}
