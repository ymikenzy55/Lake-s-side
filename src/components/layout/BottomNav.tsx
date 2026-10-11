'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconBag, IconGrid, IconHome, IconUser, IconTruck, IconPin } from './Icons';
import { useSession } from './SessionProvider';

/** Floating pill tab bar for phones, modelled on the reference mobile app. */
export function BottomNav() {
  const path = usePathname();
  const { cartCount, user, loaded } = useSession();
  const authed = user || !loaded; // avoid a 'Sign in' flash before the session loads
  // Product pages and checkout have their own sticky action bar.
  if (/^\/products\/[^/]+/.test(path) || path.startsWith('/checkout')) return null;
  const items = [
    { href: '/', label: 'Home', icon: IconHome, match: (p: string) => p === '/', badge: 0 },
    { href: '/products', label: 'Shop', icon: IconGrid, match: (p: string) => p.startsWith('/products'), badge: 0 },
    { href: '/track', label: 'Track', icon: IconTruck, match: (p: string) => p.startsWith('/track') || p.startsWith('/receipt'), badge: 0 },
    { href: '/visit', label: 'Visit', icon: IconPin, match: (p: string) => p.startsWith('/visit'), badge: 0 },
    { href: '/cart', label: 'Cart', icon: IconBag, match: (p: string) => p.startsWith('/cart') || p.startsWith('/checkout'), badge: cartCount },
    { href: authed ? '/account' : '/login', label: authed ? 'Account' : 'Sign in', icon: IconUser, match: (p: string) => p.startsWith('/account') || p === '/login', badge: 0 },
  ];

  return (
    <nav aria-label="Primary" className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 print:hidden md:hidden">
      <ul className="pointer-events-auto mx-auto flex max-w-[420px] items-center justify-between rounded-full bg-ink p-1.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,.55)]">
        {items.map(({ href, label, icon: Icon, match, badge }) => {
          const active = match(path);
          return (
            <li key={label} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-12 items-center justify-center gap-2 rounded-full text-[12px] font-medium transition-all duration-300 ${active ? 'bg-white text-ink' : 'text-white/80'}`}
              >
                <Icon width={20} height={20} />
                {active && <span>{label}</span>}
                {badge > 0 && (
                  <span className="absolute right-3 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-ink">
                    {badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
