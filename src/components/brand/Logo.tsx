import Link from 'next/link';

/** Vector mark: a "C" with a stitched inner seam and the signature underscore. */
export function LogoMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} role="img" aria-label="Comfort_fit GH logo" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="14" fill="#0B1220" />
      <path d="M33.5 15.2A12.5 12.5 0 1 0 33.5 32.8" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <path d="M30.6 18.4A8.2 8.2 0 1 0 30.6 29.6" fill="none" stroke="#9fb4e8" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2.6 3" />
      <rect x="26" y="35" width="13" height="3.6" rx="1.8" fill="#fff" />
    </svg>
  );
}

export function Logo({ href = '/', light = false, compact = false }: { href?: string; light?: boolean; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex min-w-0 shrink-0 items-center gap-2" aria-label="Comfort_fit GH home">
      <LogoMark size={compact ? 32 : 38} />
      <span className={`flex flex-col leading-none ${light ? 'text-white' : 'text-ink'}`}>
        <span className="whitespace-nowrap text-[17px] font-black uppercase tracking-[-0.02em] sm:text-[19px]">
          Comfort<span className="mx-[1px] inline-block h-[3px] w-[9px] translate-y-[1px] rounded-full bg-current align-baseline" />Fit
        </span>
        <span className="mt-[3px] text-[9px] font-semibold uppercase tracking-[0.42em] opacity-70">Ghana</span>
      </span>
    </Link>
  );
}
