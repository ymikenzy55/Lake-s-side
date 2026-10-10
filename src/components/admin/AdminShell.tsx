'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import { IconClose, IconMenu } from '@/components/layout/Icons';
import { logoutAction } from '@/domains/auth/actions';
import { AdminLive } from './AdminLive';
import { BackButton } from '@/components/layout/BackButton';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { NotificationBell } from './NotificationBell';

const NAV: { href: string; label: string; d: string; superOnly?: boolean }[] = [
  { href: '/admin/dashboard', label: 'Dashboard', d: 'M3 12 12 3l9 9M5 10v10h5v-6h4v6h5V10' },
  { href: '/admin/orders', label: 'Orders', d: 'M5 8h14l-1 12H6L5 8ZM9 8V6a3 3 0 0 1 6 0v2' },
  { href: '/admin/products', label: 'Products', d: 'M12 3 3 7.5 12 12l9-4.5L12 3ZM3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5' },
  { href: '/admin/inventory', label: 'Inventory', d: 'M3 7h18v13H3zM3 7l3-4h12l3 4M9 12h6' },
  { href: '/admin/hero', label: 'Hero banner', d: 'M3 5h18v10H3zM8 19h8M12 15v4' },
  { href: '/admin/categories', label: 'Categories', d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
  { href: '/admin/attributes', label: 'Sizes & colours', d: 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2s0-2 1.5-2h2a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z' },
  { href: '/admin/discounts', label: 'Discounts', d: 'M19 5 5 19M7 7h.01M17 17h.01' },
  { href: '/admin/customers', label: 'Users', d: 'M16 11a4 4 0 1 0-8 0M4 21c0-4 3.6-6 8-6s8 2 8 6' },
  { href: '/admin/messages', label: 'Messages', d: 'M4 5h16v11H8l-4 4V5Z' },
  { href: '/admin/team', label: 'Admin team', superOnly: true, d: 'M12 3 4 6v6c0 4.5 3.2 7.6 8 9 4.8-1.4 8-4.5 8-9V6l-8-3ZM9 12l2 2 4-4' },
  { href: '/admin/account', label: 'My account', d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.6-6 8-6s8 2 8 6' },
  { href: '/admin/settings', label: 'Settings', d: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2L10 21h4l.6-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z' },
];

const TABS = ['/admin/dashboard', '/admin/orders', '/admin/products', '/admin/inventory'];

function Icon({ d }: { d: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function AdminShell({ name, role, children }: { name: string; role: string; children: React.ReactNode }) {
  const path = usePathname();
  // The drawer is tied to the path it was opened on, so navigating closes it without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === path;
  const setOpen = (v: boolean) => setOpenAt(v ? path : null);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const active = (href: string) => path === href || path.startsWith(href + '/');
  const nav = NAV.filter((n) => !n.superOnly || role === 'SUPER_ADMIN');

  // breadcrumbs from the URL: Admin > Orders > Details
  const LABELS: Record<string, string> = Object.fromEntries(NAV.map((n) => [n.href.split('/')[2], n.label]));
  const parts = path.split('/').filter(Boolean).slice(1);
  const crumbs = [
    { label: 'Admin', href: '/admin/dashboard' },
    ...parts.map((seg, i) => ({
      label: LABELS[seg] ?? (seg === 'new' ? 'New' : seg.length > 12 ? 'Details' : seg.charAt(0).toUpperCase() + seg.slice(1)),
      href: i < parts.length - 1 ? '/admin/' + parts.slice(0, i + 1).join('/') : undefined,
    })),
  ];

  const links = (
    <nav aria-label="Admin" className="grid gap-1">
      {nav.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={active(n.href) ? 'page' : undefined}
          className={`flex h-12 items-center gap-3 rounded-2xl px-3.5 text-[15px] font-medium transition-colors ${active(n.href) ? 'bg-ink text-white' : 'text-ink-2 hover:bg-surface'}`}
        >
          <Icon d={n.d} />
          {n.label}
        </Link>
      ))}
    </nav>
  );

  const account = (
    <div className="grid gap-2 border-t border-line pt-4">
      <div className="px-1"><p className="truncate text-[14px] font-medium">{name}</p><p className="text-[12px] text-muted">{role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin'}</p></div>
      <Link href="/" className="btn btn-ghost btn-sm">View store</Link>
      <form action={logoutAction}><button className="btn btn-soft btn-sm btn-block">Sign out</button></form>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col gap-6 border-r border-line bg-white p-5 lg:flex">
        <div className="flex items-center justify-between gap-2"><Logo href="/admin/dashboard" compact /><NotificationBell align="left" /></div>
        <div className="flex-1 overflow-y-auto">{links}</div>
        {account}
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-white/95 px-3 backdrop-blur lg:hidden">
        <BackButton fallback="/admin/dashboard" hideOn={['/admin/dashboard']} />
        <Logo href="/admin/dashboard" compact />
        <div className="flex items-center gap-2"><NotificationBell /><Link href="/" className="btn btn-soft btn-sm">Store</Link></div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button className="anim-fade absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="anim-rise absolute inset-y-0 left-0 flex w-[86%] max-w-[340px] flex-col gap-5 bg-white p-4">
            <div className="flex items-center justify-between"><Logo href="/admin/dashboard" compact /><button aria-label="Close" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-full bg-surface"><IconClose /></button></div>
            <div className="flex-1 overflow-y-auto">{links}</div>
            {account}
          </div>
        </div>
      )}

      <main className="px-3 pb-28 pt-5 sm:px-6 lg:ml-[264px] lg:px-10 lg:pb-12 lg:pt-8">
        <div className="mx-auto max-w-[1180px]">
          <AdminLive />
          {parts.length > 0 && parts[0] !== 'dashboard' && <Breadcrumbs items={crumbs} className="mb-3" />}
          {children}
        </div>
      </main>

      {/* mobile bottom tabs */}
      <nav aria-label="Quick admin tabs" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-2 pt-2 backdrop-blur lg:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map((t) => {
            const n = NAV.find((x) => x.href === t)!;
            return (
              <li key={t}>
                <Link href={t} aria-current={active(t) ? 'page' : undefined} className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium ${active(t) ? 'text-ink' : 'text-muted'}`}>
                  <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${active(t) ? 'bg-ink text-white' : ''}`}><Icon d={n.d} /></span>
                  {n.label.split(' ')[0]}
                </Link>
              </li>
            );
          })}
          <li>
            <button onClick={() => setOpen(true)} className="flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium text-muted"><span className="grid h-7 w-12 place-items-center"><IconMenu /></span>More</button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
