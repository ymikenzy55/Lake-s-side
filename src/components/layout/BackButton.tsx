'use client';

import { usePathname, useRouter } from 'next/navigation';
import { IconBack } from './Icons';

/** Back button for phones: goes to the previous page, or to `fallback` when there is no history. */
export function BackButton({ fallback = '/', hideOn = ['/'], className = '' }: { fallback?: string; hideOn?: string[]; className?: string }) {
  const path = usePathname();
  const router = useRouter();
  if (hideOn.includes(path)) return null;
  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface transition-colors hover:bg-surface-2 active:scale-95 ${className}`}
    >
      <IconBack width={20} height={20} />
    </button>
  );
}
