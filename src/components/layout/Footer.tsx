import Link from 'next/link';
import { Logo, LogoFull } from '@/components/brand/Logo';
import { getSettings } from '@/domains/settings/service';
import { SocialLinks } from './SocialLinks';
import { IconPin } from './Icons';

export async function Footer() {
  const s = await getSettings();
  const col = 'grid content-start gap-2 text-[13px] text-muted [&>a]:transition-colors [&>a:hover]:text-ink';
  const h = 'mb-1 text-[12px] font-semibold text-ink';
  return (
    <footer className="mt-16 border-t border-line pb-28 pt-12 print:hidden md:pb-10">
      <div className="container-x grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="md:hidden"><Logo /></div>
          <LogoFull width={200} className="hidden rounded-2xl md:block" />
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted">{s.tagline} Premium everyday wear made to slow down in, in every size, colour and fit.</p>
        </div>
        <div className={col}>
          <p className={h}>Shop</p>
          <Link href="/products">All products</Link>
          <Link href="/products?sort=newest">New arrivals</Link>
          <Link href="/products?featured=1">Featured</Link>
          <Link href="/products?gender=WOMEN">Women</Link>
          <Link href="/products?gender=MEN">Men</Link>
        </div>
        <div className={col}>
          <p className={h}>Help</p>
          <Link href="/track">Track your order</Link>
          <Link href="/contact">Contact us</Link>
          <Link href="/visit">Visit our store</Link>
          <Link href="/about#delivery">Delivery</Link>
          <Link href="/about#returns">Returns</Link>
          <Link href="/about#size-guide">Size guide</Link>
        </div>
        <div className={col}>
          <p className={h}>Connect</p>
          <SocialLinks settings={s} size="sm" />
          <Link href="/visit" className="mt-2 inline-flex items-center gap-1.5"><IconPin width={16} height={16} /> Find us in Nkawkaw</Link>
        </div>
      </div>
      <div className="container-x mt-10 flex flex-col gap-1 border-t border-line pt-5 text-[12px] text-muted md:flex-row md:justify-between">
        <p>© {new Date().getFullYear()} {s.store_name}. All rights reserved.</p>
        <p>Secure checkout · Cash on delivery available</p>
      </div>
    </footer>
  );
}
