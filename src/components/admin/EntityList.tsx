'use client';

import { useState } from 'react';
import type { FormResult } from '@/domains/admin/guard';
import { Flash, Toggle, useAdminRun } from './hooks';

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'date' | 'select' | 'switch';
  options?: { value: string; label: string }[];
  placeholder?: string;
  span?: 1 | 2;
  step?: string;
}

type Values = Record<string, string | boolean>;

function Row({
  fields, initial, onSave, onDelete, isNew, summary,
}: {
  fields: FieldDef[];
  initial: Values;
  onSave: (v: Values) => Promise<FormResult>;
  onDelete?: () => Promise<FormResult>;
  isNew?: boolean;
  summary?: string;
}) {
  const { run, pending, msg } = useAdminRun();
  const [v, setV] = useState<Values>(initial);
  const [open, setOpen] = useState(isNew ?? false);
  const set = (k: string, val: string | boolean) => setV((s) => ({ ...s, [k]: val }));

  return (
    <li className={`card ${isNew ? 'border-dashed' : ''}`}>
      {!isNew && (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-[60px] w-full items-center justify-between gap-3 px-4 text-left">
          <span className="min-w-0 truncate font-medium">{summary}</span>
          <span className="text-[13px] text-muted">{open ? 'Close' : 'Edit'}</span>
        </button>
      )}
      {open && (
        <form
          className={`grid gap-3 p-4 sm:grid-cols-2 ${isNew ? '' : 'border-t border-line'}`}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => onSave(v), { onDone: (r) => r.ok && isNew && setV(initial) });
          }}
        >
          {fields.map((f) => (
            <div key={f.key} className={f.span === 2 ? 'sm:col-span-2' : ''}>
              {f.type === 'switch' ? (
                <Toggle label={f.label} checked={Boolean(v[f.key])} onChange={(x) => set(f.key, x)} />
              ) : (
                <>
                  <label className="label" htmlFor={`${f.key}-${String(initial.id ?? 'new')}`}>{f.label}</label>
                  {f.type === 'select' ? (
                    <select id={`${f.key}-${String(initial.id ?? 'new')}`} className="field" value={String(v[f.key])} onChange={(e) => set(f.key, e.target.value)}>
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input
                      id={`${f.key}-${String(initial.id ?? 'new')}`}
                      className={`field ${f.type === 'color' ? '!p-1.5' : ''}`}
                      type={f.type}
                      step={f.step}
                      min={f.type === 'number' ? 0 : undefined}
                      inputMode={f.type === 'number' ? 'decimal' : undefined}
                      placeholder={f.placeholder}
                      value={String(v[f.key] ?? '')}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  )}
                </>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button className="btn btn-primary btn-sm" disabled={pending}>{pending ? 'Saving…' : isNew ? 'Add' : 'Save'}</button>
            {onDelete && <button type="button" className="btn btn-danger btn-sm" disabled={pending} onClick={() => run(onDelete, { confirm: 'Delete this item?' })}>Delete</button>}
            <div className="min-w-0 flex-1"><Flash msg={msg} /></div>
          </div>
        </form>
      )}
      {isNew && !open && null}
    </li>
  );
}

export function EntityList({
  fields, items, blank, onSave, onDelete, summary, addLabel,
}: {
  fields: FieldDef[];
  items: Values[];
  blank: Values;
  onSave: (v: Values) => Promise<FormResult>;
  onDelete?: (id: string) => Promise<FormResult>;
  summary: (v: Values) => string;
  addLabel: string;
}) {
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const SIZE = 8;
  const filtered = q.trim() ? items.filter((it) => summary(it).toLowerCase().includes(q.trim().toLowerCase())) : items;
  const pages = Math.max(1, Math.ceil(filtered.length / SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * SIZE, current * SIZE);
  return (
    <div className="grid gap-3">
      {adding ? (
        <ul><Row isNew fields={fields} initial={blank} onSave={onSave} /></ul>
      ) : (
        <button className="btn btn-primary w-fit" onClick={() => setAdding(true)}>{addLabel}</button>
      )}
      {items.length > SIZE || q ? (
        <input
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search…"
          aria-label="Search this list"
          className="field !rounded-full"
        />
      ) : null}
      <ul className="grid gap-3">
        {visible.length === 0 && <li className="rounded-2xl border border-dashed border-line p-8 text-center text-[13px] text-muted">{q ? 'No matches' : 'Nothing here yet'}</li>}
        {visible.map((it) => (
          <Row key={String(it.id)} fields={fields} initial={it} summary={summary(it)} onSave={onSave} onDelete={onDelete ? () => onDelete(String(it.id)) : undefined} />
        ))}
      </ul>
      {pages > 1 && (
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <button type="button" className="btn btn-ghost btn-sm" disabled={current <= 1} onClick={() => setPage(current - 1)}>‹ Previous</button>
          <span className="text-muted">Page {current} of {pages}</span>
          <button type="button" className="btn btn-ghost btn-sm" disabled={current >= pages} onClick={() => setPage(current + 1)}>Next ›</button>
        </div>
      )}
    </div>
  );
}
