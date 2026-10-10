'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ProductArt } from '@/components/svg/ProductArt';
import { money } from '@/lib/utils';

interface Item { n: string; s: string; c: string; p: number; i: string | null; g: string; h: string | null; t: string }

// Module-level cache: the index is fetched once per page load and shared by every search box.
let index: Item[] | null = null;
let loading: Promise<Item[]> | null = null;
function loadIndex(): Promise<Item[]> {
  if (index) return Promise.resolve(index);
  loading ??= fetch('/api/search-index')
    .then((r) => (r.ok ? (r.json() as Promise<Item[]>) : []))
    .then((d) => (index = d))
    .catch(() => {
      loading = null;
      return [];
    });
  return loading;
}

/** Rank products against the typed words; all words must match. Pure and instant. */
export function searchItems(items: Item[], query: string, limit = 8): Item[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored: { it: Item; score: number }[] = [];
  for (const it of items) {
    const name = it.n.toLowerCase();
    const hay = `${name} ${it.c.toLowerCase()} ${it.t}`;
    let score = 0;
    let ok = true;
    for (const w of words) {
      if (name.startsWith(w)) score += 6;
      else if (name.includes(` ${w}`)) score += 4;
      else if (name.includes(w)) score += 3;
      else if (hay.includes(w)) score += 1;
      else {
        ok = false;
        break;
      }
    }
    if (ok) scored.push({ it, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.it.n.localeCompare(b.it.n)).slice(0, limit).map((x) => x.it);
}

function Highlight({ text, q }: { text: string; q: string }) {
  const words = q.split(/\s+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!words.length) return <>{text}</>;
  const parts = text.split(new RegExp(`(${words.join('|')})`, 'ig'));
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <mark key={i} className="rounded bg-transparent font-bold text-ink">{p}</mark> : <span key={i}>{p}</span>))}
    </>
  );
}

interface Props {
  placeholder?: string;
  defaultValue?: string;
  autoFocus?: boolean;
  /** extra query params kept when pressing Enter (e.g. category) */
  hidden?: Record<string, string | undefined>;
  className?: string;
  inputClassName?: string;
  onNavigate?: () => void;
  /** show a submit button after the input (the black "Search" button on the shop banner) */
  button?: string;
}

/** Search-as-you-type with a results dropdown. Falls back to a normal GET form without JavaScript. */
export function SearchBox({ placeholder = 'Search products', defaultValue = '', autoFocus, hidden = {}, className = '', inputClassName = '', onNavigate, button }: Props) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [items, setItems] = useState<Item[] | null>(index);
  const box = useRef<HTMLDivElement>(null);

  // warm the index as soon as the box exists (idle) so the first keystroke is already instant
  useEffect(() => {
    const t = window.setTimeout(() => void loadIndex().then(setItems), 150);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const away = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const results = useMemo(() => (items ? searchItems(items, q) : []), [items, q]);
  const term = q.trim();
  const showPanel = open && term.length > 0;

  function go(href: string) {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  }
  function submit() {
    if (active >= 0 && results[active]) return go(`/products/${results[active].s}`);
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(hidden)) if (v) u.set(k, v);
    if (term) u.set('search', term);
    go(`/products${u.size ? `?${u}` : ''}`);
  }

  return (
    <div ref={box} className={`relative ${className}`}>
      <form
        action="/products"
        method="get"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2"
      >
        {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden className="shrink-0 text-muted"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          name="search"
          value={q}
          autoFocus={autoFocus}
          autoComplete="off"
          maxLength={80}
          placeholder={placeholder}
          aria-label="Search products"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(-1, a - 1));
            } else if (e.key === 'Escape') setOpen(false);
          }}
          className={`h-10 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted md:text-[13px] ${inputClassName}`}
        />
        {q && (
          <button type="button" aria-label="Clear search" onClick={() => { setQ(''); setActive(-1); }} className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted hover:bg-surface">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        )}
        {button && <button className="btn btn-primary !min-h-10 shrink-0">{button}</button>}
      </form>

      {showPanel && (
        <div className="absolute inset-x-0 top-[calc(100%+10px)] z-[70] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_28px_60px_-24px_rgba(11,18,32,.5)] sm:min-w-[380px]">
          <ul id={listId} role="listbox" aria-label="Matching products" className="max-h-[min(70vh,420px)] overflow-y-auto p-1.5">
            {results.map((r, i) => (
              <li key={r.s} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <Link
                  href={`/products/${r.s}`}
                  onClick={() => { setOpen(false); onNavigate?.(); }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex items-center gap-3 rounded-xl p-2 ${i === active ? 'bg-surface' : 'hover:bg-surface'}`}
                >
                  <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-surface">
                    <ProductArt imageUrl={r.i} garmentType={r.g} color={r.h} alt="" sizes="48px" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold"><Highlight text={r.n} q={term} /></span>
                    <span className="block truncate text-[11px] text-muted">{r.c}</span>
                  </span>
                  <span className="shrink-0 text-[13px] font-bold">{money(r.p)}</span>
                </Link>
              </li>
            ))}
            {items && results.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-muted">No products match &ldquo;{term}&rdquo;</li>}
            {!items && <li className="px-3 py-6 text-center text-[13px] text-muted">Loading…</li>}
          </ul>
          {results.length > 0 && (
            <button type="button" onClick={submit} className="flex w-full items-center justify-between border-t border-line px-4 py-3 text-left text-[13px] font-medium hover:bg-surface">
              <span>See all results for &ldquo;{term}&rdquo;</span>
              <span aria-hidden>→</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
