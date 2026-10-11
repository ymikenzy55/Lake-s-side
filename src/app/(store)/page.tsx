import Link from 'next/link';
import Image from 'next/image';
import { HeroSlider } from '@/components/store/HeroSlider';
import { ProductCard } from '@/components/store/ProductCard';
import { ShopSearchBar } from '@/components/store/ShopSearchBar';
import { InfiniteProducts } from '@/components/store/InfiniteProducts';
import { Carousel } from '@/components/store/Carousel';
import { Reveal } from '@/components/ui/Reveal';
import { IconArrow, IconReturn, IconShield, IconSpark, IconTruck } from '@/components/layout/Icons';
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

      {first.products.length > 0 && (
        <section className="container-x mt-14" aria-labelledby="feat-h">
          <div className="mb-4 flex items-end justify-between">
            <h2 id="feat-h" className="text-[20px] font-bold tracking-tight md:text-[22px]">All products</h2>
            <Link href="/products" className="text-[13px] font-medium underline underline-offset-4">Filter &amp; sort</Link>
          </div>
          <InfiniteProducts initial={first.products} hasMore={first.pagination.totalPages > 1} />
        </section>
      )}

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
