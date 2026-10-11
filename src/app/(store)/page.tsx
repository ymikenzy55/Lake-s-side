import Link from 'next/link';
import Image from 'next/image';
import { HeroSlider } from '@/components/store/HeroSlider';
import { ProductCard } from '@/components/store/ProductCard';
import { ShopSearchBar } from '@/components/store/ShopSearchBar';
import { InfiniteProducts } from '@/components/store/InfiniteProducts';
import { Carousel } from '@/components/store/Carousel';
import { Reveal } from '@/components/ui/Reveal';
import { IconArrow, IconPin, IconReturn, IconShield, IconSpark, IconTikTok, IconTruck } from '@/components/layout/Icons';
import { mapLinks } from '@/lib/maps';
import { getActiveSlides } from '@/domains/hero/service';
import { ProductService } from '@/domains/products/service';
import { getSettings, num } from '@/domains/settings/service';

export const revalidate = 60;

export default async function HomePage() {
  const [slides, categories, arrivals, first, settings] = await Promise.all([
    getActiveSlides(),
    ProductService.getCategories(),
    ProductService.getNewArrivals(8),
    ProductService.getProducts({}, { page: 1, limit: 12, sort: 'newest' }),
    getSettings(),
  ]);

  const perks = [
    { icon: IconTruck, title: 'Fast delivery', text: `Free over GHS ${num(settings.free_shipping_threshold, 500)}` },
    { icon: IconShield, title: 'Secure checkout', text: 'MoMo, cards or cash' },
    { icon: IconReturn, title: 'Easy returns', text: '7-day exchanges' },
    { icon: IconSpark, title: 'Calm by design', text: 'Soft, durable fabrics' },
  ];

  return (
    <>
      <HeroSlider
        autoplayMs={num(settings.hero_autoplay_ms, 4000)}
        slides={slides.map((s) => ({
          id: s.id, line1: s.line1, line2: s.line2, line3: s.line3, line4: s.line4, tagline: s.tagline, subtitle: s.subtitle,
          ctaLabel: s.ctaLabel, ctaHref: s.ctaHref, garment: s.garment, garmentColor: s.garmentColor,
          bgFrom: s.bgFrom, bgTo: s.bgTo, imageUrl: s.imageUrl,
        }))}
      />
      <ShopSearchBar />

      {/* slogan ticker */}
      <div className="marquee mt-8 overflow-hidden border-y border-line bg-ink py-3 text-white" aria-label={`${settings.tagline} Dream, explore, live.`}>
        <div className="marquee-track" aria-hidden>
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center">
              {['Where calm meets clarity', 'Dream', 'Explore', 'Live', 'Find peace by the water', 'Est. 2026', 'Nkawkaw, Ghana'].map((t) => (
                <span key={t} className="flex items-center whitespace-nowrap px-5 text-[13px] font-semibold uppercase tracking-[0.22em]">
                  {t}<span className="ml-10 text-lake-soft">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* categories */}
      <section className="container-x mt-8" aria-label="Browse by category">
        <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          <Link href="/products" className="chip is-active">All</Link>
          {categories.map((c) => <Link key={c.id} href={`/products?category=${c.slug}`} className="chip">{c.name}</Link>)}
        </div>
      </section>

      {arrivals.length > 0 && (
        <Carousel title="New popular items">
          {arrivals.map((p, i) => (
            <div key={p.id} className="w-[200px] shrink-0 snap-start sm:w-[230px]"><ProductCard p={p} priority={i < 4} /></div>
          ))}
        </Carousel>
      )}

      {/* promo */}
      <section className="container-x mt-14">
        <Reveal>
          <div className="relative grid overflow-hidden rounded-[20px] bg-surface md:grid-cols-2">
            <div className="flex flex-col justify-center p-7 md:p-12">
              <p className="eyebrow">The Lakeside drop</p>
              <h2 className="mt-3 max-w-md text-[28px] font-semibold leading-[1.05] md:text-[40px]">Where calm meets clarity.</h2>
              <p className="mt-3 max-w-sm text-[14px] text-muted">Our first tees: Where Calm Meets Clarity in white and Find Peace By The Water in black. Heavyweight cotton, relaxed fit, sizes S to XXL.</p>
              <Link href="/products?category=t-shirts" className="btn btn-primary mt-6 w-fit">Shop the tees <IconArrow /></Link>
            </div>
            <div className="relative min-h-[260px] md:min-h-[360px]">
              <Image src="/photos/lakeside-couple.jpg" alt="Two people wearing the white Where Calm Meets Clarity Tee" fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover object-top" />
            </div>
          </div>
        </Reveal>
      </section>

      {/* lookbook: real customers and products, every tile shops the look */}
      <section className="container-x mt-14" aria-labelledby="look-h">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Lookbook</p>
            <h2 id="look-h" className="mt-1 text-[26px] font-semibold md:text-[34px]">Worn by the Lakeside crew</h2>
          </div>
          {settings.tiktok && (
            <a href={settings.tiktok} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
              <IconTikTok width={16} height={16} /> See more on TikTok
            </a>
          )}
        </div>
        <div className="grid auto-rows-[220px] grid-cols-2 gap-3 md:auto-rows-[260px] md:grid-cols-4">
          {[
            { src: '/photos/lakeside-crew.jpg', alt: 'The Lakeside crew in black and white tees', label: 'The crew', href: '/products/find-peace-by-the-water-tee', span: 'md:col-span-2 md:row-span-2' },
            { src: '/photos/where-calm-meets-clarity-tee-ghana-edition-2.jpg', alt: 'Ghana Edition back print', label: 'Ghana Edition', href: '/products/where-calm-meets-clarity-tee-ghana-edition', span: '' },
            { src: '/photos/find-peace-by-the-water-tee-3.jpg', alt: 'Find Peace By The Water back print', label: 'Find Peace By The Water', href: '/products/find-peace-by-the-water-tee', span: '' },
            { src: '/photos/lakeside-couple.jpg', alt: 'A couple in the white Where Calm Meets Clarity Tee', label: 'Where Calm Meets Clarity', href: '/products/where-calm-meets-clarity-tee', span: '' },
            { src: '/photos/where-calm-meets-clarity-tee-ghana-edition-1.jpg', alt: 'Ghana Edition front print', label: 'Red, gold & green', href: '/products/where-calm-meets-clarity-tee-ghana-edition', span: '' },
          ].map((t) => (
            <Link key={t.src} href={t.href} className={`group relative overflow-hidden rounded-[18px] bg-surface ${t.span}`}>
              <Image src={t.src} alt={t.alt} fill sizes="(max-width:768px) 50vw, 25vw" className="zoom-img object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-80 transition-opacity group-hover:opacity-100" />
              <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 text-white">
                <span className="text-[13px] font-semibold md:text-[15px]">{t.label}</span>
                <span className="flex translate-y-1 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-ink opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">Shop <IconArrow width={14} height={14} /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {first.products.length > 0 && (
        <section className="container-x mt-14" aria-labelledby="feat-h">
          <div className="mb-4 flex items-end justify-between">
            <h2 id="feat-h" className="text-[20px] font-bold tracking-tight md:text-[22px]">All products</h2>
            <Link href="/products" className="text-[13px] font-medium underline underline-offset-4">Filter &amp; sort</Link>
          </div>
          <InfiniteProducts initial={first.products} hasMore={first.pagination.totalPages > 1} />
        </section>
      )}

      {/* visit strip */}
      <section className="container-x mt-14">
        <Reveal>
          <div className="relative overflow-hidden rounded-[20px] bg-black p-7 text-white md:p-10">
            <Image src="/brand/lakeside-icon-512.png" alt="" width={320} height={320} className="pointer-events-none absolute -right-10 -top-10 w-[240px] opacity-30 md:w-[320px]" />
            <p className="eyebrow !text-lake-soft">Visit the shop</p>
            <h2 className="mt-2 max-w-md text-[26px] font-semibold leading-tight md:text-[36px]">Find us at Nkawkaw New Station.</h2>
            <p className="mt-2 max-w-md text-[14px] text-white/70">Try your size, feel the fabric and pick up your order in person.</p>
            <div className="relative mt-6 flex flex-wrap gap-2">
              <a href={mapLinks(settings.address).directions} target="_blank" rel="noopener noreferrer" className="btn bg-white text-ink hover:bg-lake-soft"><IconPin width={18} height={18} /> Get directions</a>
              <Link href="/visit" className="btn border border-white/40 text-white hover:bg-white hover:text-ink">View map</Link>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="container-x mt-14">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {perks.map(({ icon: Icon, title, text }) => (
            <li key={title} className="card-soft flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white"><Icon width={18} height={18} /></span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold">{title}</p>
                <p className="truncate text-[12px] text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
