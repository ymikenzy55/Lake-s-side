import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { IconChevron } from './Icons';
import { HeaderActions } from './HeaderActions';
import { BackButton } from './BackButton';
import { GENDERS } from '@/lib/config/brand';
import { ProductService } from '@/domains/products/service';

const navLink = 'inline-flex h-10 items-center gap-1 rounded-full px-3.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface hover:text-ink';
const dropdown =
  'invisible absolute left-1/2 top-full z-50 min-w-[200px] -translate-x-1/2 translate-y-1 rounded-2xl border border-line bg-white p-1.5 opacity-0 shadow-[0_24px_44px_-22px_rgba(0,0,0,.35)] transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100';
const dropItem = 'block rounded-xl px-3 py-2 text-[13px] text-ink-2 transition-colors hover:bg-surface hover:text-ink';

export async function Header() {
  const categories = await ProductService.getCategories();

  return (
    <header className="sticky top-0 z-40 h-0 print:hidden">
      <div className="px-3 pt-3 md:px-6">
      <div className="mx-auto max-w-[1180px]">
        <div className="relative flex h-14 items-center justify-between gap-3 rounded-xl border border-white/60 bg-white/95 px-3 shadow-[0_10px_30px_-18px_rgba(11,18,32,.45)] backdrop-blur md:px-4">
          <div className="flex items-center gap-1">
            <BackButton className="md:hidden" />
            <Logo />
          </div>

          <nav aria-label="Main" className="absolute left-1/2 hidden -translate-x-1/2 items-center md:flex">
            <div className="group relative">
              <Link href="/products" className={navLink}>Collections <IconChevron /></Link>
              <div className={dropdown}>
                {categories.map((c) => (
                  <Link key={c.id} href={`/products?category=${c.slug}`} className={dropItem}>{c.name}</Link>
                ))}
              </div>
            </div>
            <div className="group relative">
              <Link href="/products" className={navLink}>Shop <IconChevron /></Link>
              <div className={dropdown}>
                {GENDERS.map((g) => (
                  <Link key={g.value} href={`/products?gender=${g.value}`} className={dropItem}>{g.label}</Link>
                ))}
              </div>
            </div>
            <Link href="/products?sort=newest" className={navLink}>New in</Link>
            <Link href="/track" className={navLink}>Track order</Link>
            <Link href="/visit" className={navLink}>Visit us</Link>
            <Link href="/about" className={navLink}>About</Link>
          </nav>

          <HeaderActions />
        </div>
      </div>
      </div>
    </header>
  );
}
