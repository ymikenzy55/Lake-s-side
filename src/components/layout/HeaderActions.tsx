'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { IconBag, IconSearch, IconUser, IconClose } from './Icons';
import { useSession } from './SessionProvider';
import { SearchBox } from '@/components/store/SearchBox';

export function HeaderActions() {
  const { user, cartCount } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');
  const initial = (user?.firstName || user?.email || '?').charAt(0).toUpperCase();
  const iconBtn = 'relative grid h-9 w-9 place-items-center sm:h-10 sm:w-10 rounded-full transition-colors hover:bg-surface';

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Search" aria-expanded={open} className={iconBtn}>
        {open ? <IconClose width={20} height={20} /> : <IconSearch width={20} height={20} />}
      </button>

      <Link href="/cart" aria-label={`Bag, ${cartCount} items`} className={iconBtn}>
        <IconBag width={20} height={20} />
        {cartCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ink px-1 text-[10px] font-bold text-white">{cartCount}</span>
        )}
      </Link>

      <Link
        href={user ? (isAdmin ? '/admin/dashboard' : '/account') : '/login'}
        aria-label={user ? 'My account' : 'Sign in'}
        className={`${iconBtn} sm:hidden`}
      >
        {user ? <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[12px] font-semibold text-white">{initial}</span> : <IconUser width={20} height={20} />}
      </Link>

      <Link
        href={user ? (isAdmin ? '/admin/dashboard' : '/account') : '/login'}
        aria-label={user ? 'My account' : 'Sign in'}
        className="ml-1 hidden h-9 items-center gap-2 rounded-full bg-surface pl-1 pr-3.5 text-[13px] font-medium transition-colors hover:bg-surface-2 sm:inline-flex"
      >
        {user ? (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[12px] font-semibold text-white">{initial}</span>
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white"><IconUser width={16} height={16} /></span>
        )}
        {user ? (isAdmin ? 'Admin' : user.firstName || 'Account') : 'Sign in'}
      </Link>

      {open && (
        <div className="anim-fade absolute inset-x-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-line bg-white p-2.5 shadow-[0_24px_40px_-28px_rgba(0,0,0,.35)]">
          <div className="flex items-center rounded-full border border-line px-4">
            <SearchBox autoFocus className="w-full" placeholder="Search hoodies, tees, joggers…" onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
