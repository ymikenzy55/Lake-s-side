'use client';

import { useMemo, useState } from 'react';

export interface DayPoint { key: string; total: number; orders: number }

const RANGES = [{ d: 7, l: '7 days' }, { d: 30, l: '30 days' }, { d: 90, l: '90 days' }] as const;
const fmt = (n: number) => `GHS ${n.toLocaleString('en-GH', { maximumFractionDigits: 0 })}`;

/** Revenue / orders area chart with a range switch. Pure SVG, no chart library. */
export function SalesChart({ days }: { days: DayPoint[] }) {
  const [range, setRange] = useState<number>(30);
  const [metric, setMetric] = useState<'total' | 'orders'>('total');
  const [hover, setHover] = useState<number | null>(null);

  const pts = useMemo(() => days.slice(-range), [days, range]);
  const val = (p: DayPoint) => (metric === 'total' ? p.total : p.orders);
  const sumTotal = pts.reduce((n, p) => n + p.total, 0);
  const sumOrders = pts.reduce((n, p) => n + p.orders, 0);
  const max = Math.max(1, ...pts.map(val));

  const W = 600, H = 220, L = 8, R = 8, T = 12, B = 24;
  const x = (i: number) => L + (pts.length < 2 ? 0 : (i / (pts.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(val(p)).toFixed(1)}`).join(' ');
  const area = pts.length ? `${line} L${x(pts.length - 1).toFixed(1)},${H - B} L${x(0).toFixed(1)},${H - B} Z` : '';
  const labelEvery = Math.ceil(pts.length / 6);
  const active = hover != null ? pts[hover] : null;
  const dateLabel = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' });

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-full bg-surface p-1 text-[12px]" role="tablist" aria-label="Metric">
          {(['total', 'orders'] as const).map((m) => (
            <button key={m} role="tab" aria-selected={metric === m} onClick={() => setMetric(m)} className={`h-8 rounded-full px-3 font-medium ${metric === m ? 'bg-ink text-white' : 'text-muted'}`}>{m === 'total' ? 'Revenue' : 'Orders'}</button>
          ))}
        </div>
        <div className="inline-flex rounded-full bg-surface p-1 text-[12px]" role="tablist" aria-label="Range">
          {RANGES.map((r) => (
            <button key={r.d} role="tab" aria-selected={range === r.d} onClick={() => setRange(r.d)} className={`h-8 rounded-full px-3 font-medium ${range === r.d ? 'bg-ink text-white' : 'text-muted'}`}>{r.l}</button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <p className="text-[26px] font-semibold leading-none">{fmt(sumTotal)}</p>
        <p className="text-[13px] text-muted">{sumOrders} order{sumOrders === 1 ? '' : 's'} in the last {range} days</p>
      </div>

      <div className="relative mt-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-pan-y"
          role="img"
          aria-label={`${metric === 'total' ? 'Revenue' : 'Orders'} per day, last ${range} days`}
          onMouseLeave={() => setHover(null)}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const rel = ((e.clientX - r.left) / r.width) * W;
            setHover(Math.max(0, Math.min(pts.length - 1, Math.round(((rel - L) / (W - L - R)) * (pts.length - 1)))));
          }}
        >
          <defs>
            <linearGradient id="sc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b1220" stopOpacity="0.22" />
              <stop offset="1" stopColor="#0b1220" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((f) => <line key={f} x1={L} x2={W - R} y1={T + f * (H - T - B)} y2={T + f * (H - T - B)} stroke="currentColor" className="text-line" strokeWidth="1" />)}
          {area && <path d={area} fill="url(#sc-fill)" />}
          {line && <path d={line} fill="none" stroke="#0b1220" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />}
          {pts.map((p, i) => i % labelEvery === 0 && <text key={p.key} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : 'middle'} className="fill-muted" fontSize="15">{dateLabel(p.key)}</text>)}
          {active && hover != null && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="#0b1220" strokeOpacity=".25" />
              <circle cx={x(hover)} cy={y(val(active))} r="4.5" fill="#0b1220" stroke="#fff" strokeWidth="2" />
            </>
          )}
        </svg>
        {active && hover != null && (
          <div className="pointer-events-none absolute top-0 rounded-xl bg-ink px-3 py-1.5 text-[12px] text-white shadow-lg" style={{ left: `${Math.min(70, Math.max(0, (x(hover) / W) * 100 - 10))}%` }}>
            <p className="font-semibold">{dateLabel(active.key)}</p>
            <p>{fmt(active.total)} · {active.orders} order{active.orders === 1 ? '' : 's'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
