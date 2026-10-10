'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Flash, ImageUploader, Toggle, useAdminRun } from './hooks';
import { deleteHeroSlideAction, saveHeroSlideAction } from '@/domains/admin/content-actions';

export interface SlideForm {
  id?: string;
  line1: string; line2: string; line3: string; line4: string;
  tagline: string; subtitle: string; ctaLabel: string; ctaHref: string;
  garment: string; garmentColor: string; bgFrom: string; bgTo: string;
  imageUrl: string; displayOrder: string; isActive: boolean;
}

const BLANK: SlideForm = {
  line1: 'Autumn', line2: 'Winter', line3: '2026', line4: 'Collection',
  tagline: 'Comfort that moves with you.', subtitle: 'Soft layers made for the everyday.',
  ctaLabel: 'View the Collection', ctaHref: '/products', garment: 'hoodie',
  garmentColor: '#d9dce3', bgFrom: '#1b2540', bgTo: '#0b1220', imageUrl: '', displayOrder: '0', isActive: true,
};

function Preview({ s }: { s: SlideForm }) {
  const meta = [s.line2, s.line3, s.line4].filter(Boolean).join(' · ');
  return (
    <div className="relative aspect-[16/8] overflow-hidden rounded-2xl" style={{ background: `linear-gradient(135deg, ${s.bgFrom}, ${s.bgTo})` }} aria-label="Preview">
      {s.imageUrl && <Image src={s.imageUrl} alt="" fill sizes="600px" className="object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220]/60 to-[#0b1220]/15" />
      {meta && <p className="absolute left-3 top-3 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold text-white">{meta}</p>}
      <p className="absolute -bottom-[0.12em] left-1/2 -translate-x-1/2 whitespace-nowrap text-[72px] font-semibold leading-[0.8] tracking-[-0.06em] text-white sm:text-[96px]">{s.line1}</p>
    </div>
  );
}

function SlideEditor({ initial, isNew }: { initial: SlideForm; isNew?: boolean }) {
  const { run, pending, msg } = useAdminRun();
  const [s, setS] = useState(initial);
  const [open, setOpen] = useState(!!isNew);
  const set = <K extends keyof SlideForm>(k: K, v: SlideForm[K]) => setS((x) => ({ ...x, [k]: v }));
  const text = (k: keyof SlideForm, label: string, max = 40, span = false) => (
    <div className={span ? 'sm:col-span-2' : ''}><label className="label" htmlFor={`${k}-${initial.id ?? 'n'}`}>{label}</label><input id={`${k}-${initial.id ?? 'n'}`} className="field" maxLength={max} value={String(s[k])} onChange={(e) => set(k, e.target.value as never)} /></div>
  );

  return (
    <li className="card overflow-hidden">
      {!isNew && (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-[64px] w-full items-center justify-between gap-3 px-4 text-left">
          <span className="min-w-0"><span className="block truncate font-medium">{s.line1} {s.line2}</span><span className="text-[12px] text-muted">Order {s.displayOrder} · {s.isActive ? 'Live' : 'Hidden'}</span></span>
          <span className="text-[13px] text-muted">{open ? 'Close' : 'Edit'}</span>
        </button>
      )}
      {open && (
        <div className={`grid gap-5 p-4 ${isNew ? '' : 'border-t border-line'}`}>
          <Preview s={s} />
          <div className="grid gap-3 sm:grid-cols-2">
            {text('line1', 'Giant word (shown across the banner)', 16)}
            {text('line2', 'Small label 1 (e.g. Summer)', 24)}
            {text('line3', 'Small label 2 (e.g. 2026)', 16)}
            {text('line4', 'Small label 3 (e.g. Collection)', 24)}
            {text('tagline', 'Tagline (right side)', 80, true)}
            {text('subtitle', 'Subtitle (right side)', 160, true)}
            {text('ctaLabel', 'Button text', 32)}
            {text('ctaHref', 'Button link', 300)}
            <div><label className="label" htmlFor={`o-${initial.id ?? 'n'}`}>Slide order (0 = first)</label><input id={`o-${initial.id ?? 'n'}`} type="number" min={0} className="field" value={s.displayOrder} onChange={(e) => set('displayOrder', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3 sm:col-span-2">
              <div><label className="label">Fallback colour (left)</label><input type="color" className="field !p-1.5" value={s.bgFrom} onChange={(e) => set('bgFrom', e.target.value)} /></div>
              <div><label className="label">Fallback colour (right)</label><input type="color" className="field !p-1.5" value={s.bgTo} onChange={(e) => set('bgTo', e.target.value)} /></div>
            </div>
            <div className="sm:col-span-2">
              <p className="label">Banner photo</p>
              <p className="hint mb-2">Upload a wide landscape photo (about 2000px wide). The giant word sits over it.</p>
              <div className="flex flex-wrap items-center gap-2">
                <ImageUploader folder="hero" label="Upload banner photo" onUploaded={(u) => set('imageUrl', u)} />
                {s.imageUrl && <button type="button" className="btn btn-soft btn-sm" onClick={() => set('imageUrl', '')}>Remove photo</button>}
              </div>
            </div>
            <div className="sm:col-span-2"><Toggle label="Show this slide" checked={s.isActive} onChange={(v) => set('isActive', v)} /></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-primary" disabled={pending} onClick={() => run(() => saveHeroSlideAction({ ...s, id: s.id }), { onDone: (r) => r.ok && isNew && setS(BLANK) })}>{pending ? 'Saving…' : isNew ? 'Add slide' : 'Save slide'}</button>
            {initial.id && <button className="btn btn-danger" disabled={pending} onClick={() => run(() => deleteHeroSlideAction(initial.id!), { confirm: 'Delete this slide?' })}>Delete</button>}
            <div className="min-w-0 flex-1"><Flash msg={msg} /></div>
          </div>
        </div>
      )}
    </li>
  );
}

export function HeroManager({ slides }: { slides: SlideForm[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="grid gap-4">
      {adding ? <ul><SlideEditor isNew initial={{ ...BLANK, displayOrder: String(slides.length) }} /></ul> : <button className="btn btn-primary w-fit" onClick={() => setAdding(true)}>Add slide</button>}
      <ul className="grid gap-3">{slides.map((s) => <SlideEditor key={s.id} initial={s} />)}</ul>
    </div>
  );
}
