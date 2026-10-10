import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[22px] md:text-[24px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className = '', actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`card p-4 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-[18px]">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: 'warn' | 'bad' }) {
  return (
    <div className="card min-w-0 p-4 sm:p-5">
      <p className="truncate text-[12px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-2 break-words text-[clamp(18px,5.2vw,22px)] font-semibold leading-tight tracking-tight sm:text-[26px] lg:text-[30px] ${tone === 'bad' ? 'text-danger' : tone === 'warn' ? 'text-[#b45309]' : ''}`}>{value}</p>
      {hint && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line p-10 text-center text-[14px] text-muted">{children}</div>;
}
