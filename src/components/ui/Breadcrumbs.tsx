import Link from 'next/link';

export interface Crumb {
  label: string;
  href?: string;
}

/** Accessible breadcrumb trail. The last item is the current page (no link). */
export function Breadcrumbs({ items, className = '' }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={`text-[12px] text-muted ${className}`}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {c.href && !last ? (
                <Link href={c.href} className="transition-colors hover:text-ink hover:underline">{c.label}</Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={last ? 'max-w-[60vw] truncate font-medium text-ink' : ''}>{c.label}</span>
              )}
              {!last && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m9 6 6 6-6 6" />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** schema.org BreadcrumbList for search engines. */
export function breadcrumbJsonLd(items: Crumb[], origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${origin}${c.href}` } : {}),
    })),
  };
}
