import Image from 'next/image';
import Link from 'next/link';
import { BRAND } from '@/lib/config/brand';

/** Emblem: moonlit mountains over the lake, cropped from the official logo. */
export function LogoMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-[28%] bg-black ring-1 ring-black/5 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image src="/brand/lakeside-icon-512.png" alt={`${BRAND.name} logo`} fill sizes={`${size * 2}px`} className="object-cover" priority />
    </span>
  );
}

/** The complete lock-up (emblem, wordmark and tagline). It has a black background, so use it on dark surfaces. */
export function LogoFull({ width = 240, className = '' }: { width?: number; className?: string }) {
  return (
    <Image
      src="/brand/lakeside-logo.png"
      alt={`${BRAND.name}: ${BRAND.tagline}`}
      width={width}
      height={Math.round((width * 738) / 1134)}
      sizes={`${width}px`}
      className={className}
    />
  );
}

export function Logo({ href = '/', light = false, compact = false }: { href?: string; light?: boolean; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex min-w-0 shrink-0 items-center gap-2" aria-label={`${BRAND.name} home`}>
      <LogoMark size={compact ? 32 : 38} />
      <span className={`flex flex-col leading-none ${light ? 'text-white' : 'text-ink'}`}>
        <span className="text-[9px] font-semibold uppercase tracking-[0.42em] opacity-70">The</span>
        <span className="mt-[3px] whitespace-nowrap text-[17px] font-black uppercase tracking-[-0.02em] sm:text-[19px]">
          Lake<span className="text-lake">side</span>
        </span>
      </span>
    </Link>
  );
}
