'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ProductArt } from '@/components/svg/ProductArt';
import { PRODUCT_TYPES } from '@/components/svg/garments';
import { GENDERS } from '@/lib/config/brand';
import { Flash, Toggle, useAdminRun } from './hooks';
import { ImagePicker } from './ImagePicker';
import { saveSizeAction } from '@/domains/admin/catalog-actions';
import { autofillProductAction, generateDescriptionAction } from '@/domains/admin/ai-actions';
import { deleteProductAction, saveCategoryAction, saveProductAction } from '@/domains/admin/catalog-actions';

interface Opt { id: string; name: string; hex?: string | null }
interface ImageRow { url: string; colorId: string | null; alt: string }
interface VariantRow { sizeId: string; colorId: string; sku: string; price: string; comparePrice: string; stock: string; lowStock: string; isActive: boolean }

export interface EditorProduct {
  id?: string;
  name: string;
  description: string;
  categoryId: string;
  gender: string;
  garmentType: string;
  material: string;
  careInfo: string;
  badge: string;
  tags: string;
  featured: boolean;
  isActive: boolean;
  images: ImageRow[];
  variants: VariantRow[];
}

const VIEWS = [
  { v: 'svg:front', l: 'Front' },
  { v: 'svg:back', l: 'Back' },
  { v: 'svg:detail', l: 'Detail' },
  { v: 'svg:studio', l: 'Studio' },
];

export function ProductEditor({ initial, categories: serverCategories, sizes: serverSizes, colors }: { initial: EditorProduct; categories: Opt[]; sizes: Opt[]; colors: Opt[] }) {
  const router = useRouter();
  const { run, pending, msg, setMsg } = useAdminRun();
  const [p, setP] = useState(initial);
  const [extraCats, setExtraCats] = useState<Opt[]>([]);
  const [extraSizes, setExtraSizes] = useState<Opt[]>([]);
  const sizes = useMemo(() => [...serverSizes, ...extraSizes.filter((x) => !serverSizes.some((s) => s.id === x.id))], [serverSizes, extraSizes]);
  const categories = useMemo(() => [...serverCategories, ...extraCats.filter((c) => !serverCategories.some((s) => s.id === c.id))], [serverCategories, extraCats]);
  const [newCat, setNewCat] = useState<string | null>(null);
  const [catBusy, setCatBusy] = useState(false);
  const [catError, setCatError] = useState('');
  const [writing, setWriting] = useState(false);
  const [writeNote, setWriteNote] = useState('');

  async function generateDescription() {
    if (p.description.trim().length > 20 && !window.confirm('Replace the current description with a generated one?')) return;
    setWriting(true);
    setWriteNote('');
    const r = await generateDescriptionAction({
      name: p.name,
      category: categories.find((c) => c.id === p.categoryId)?.name,
      gender: p.gender,
      material: p.material,
      care: p.careInfo,
      colors: colors.filter((c) => pickColors.includes(c.id)).map((c) => c.name),
      sizes: sizes.filter((x) => pickSizes.includes(x.id)).map((x) => x.name),
      tags: p.tags,
    });
    setWriting(false);
    if (!r.ok || !r.text) return setWriteNote(r.message ?? 'Could not generate a description.');
    set('description', r.text);
    setWriteNote(r.source === 'ai' ? 'Written by AI from your product details. Please review it.' : 'Written from your product details. Edit it however you like.');
  }

  async function addCategory() {
    const name = (newCat ?? '').trim();
    if (name.length < 2) return setCatError('Enter a category name');
    setCatBusy(true);
    setCatError('');
    const r = await saveCategoryAction({ name, isActive: true });
    setCatBusy(false);
    if (!r.ok || !r.id) return setCatError(r.message ?? 'Could not add the category');
    setExtraCats((c) => [...c, { id: r.id!, name }]);
    set('categoryId', r.id);
    setNewCat(null);
  }
  const [pickSizes, setPickSizes] = useState<string[]>(() => [...new Set(initial.variants.map((v) => v.sizeId))]);
  const [pickColors, setPickColors] = useState<string[]>(() => [...new Set(initial.variants.map((v) => v.colorId))]);
  const [basePrice, setBasePrice] = useState(initial.variants[0]?.price ?? '');
  const [baseStock, setBaseStock] = useState('10');

  const set = <K extends keyof EditorProduct>(k: K, v: EditorProduct[K]) => setP((s) => ({ ...s, [k]: v }));
  const [filling, setFilling] = useState(false);
  const [fillNote, setFillNote] = useState('');

  async function autofill() {
    const hasWork = p.description.trim() || p.material.trim() || p.tags.trim();
    if (hasWork && !window.confirm('Fill in the details from the name? This replaces the description, material, care, tags and the chosen sizes and colours.')) return;
    setFilling(true);
    setFillNote('');
    const r = await autofillProductAction({ name: p.name, categories: categories.map((c) => c.name), sizes: sizes.map((x) => x.name), colors: colors.map((c) => c.name) });
    setFilling(false);
    if (!r.ok || !r.data) return setFillNote(r.message ?? 'Could not fill in the details.');
    const d = r.data;
    const cat = d.category ? categories.find((c) => c.name === d.category) : undefined;

    // sizes this product needs that are not in the system yet (e.g. shoe sizes) are created for you
    const known = new Map(sizes.map((x) => [x.name.toLowerCase(), x]));
    const picked: string[] = [];
    const created: Opt[] = [];
    for (const [i, name] of d.sizes.entries()) {
      const hit = known.get(name.toLowerCase());
      if (hit) { picked.push(hit.id); continue; }
      const made = await saveSizeAction({ name, sortOrder: 100 + i, isActive: true });
      if (made.ok && made.id) { created.push({ id: made.id, name: name.toUpperCase() }); picked.push(made.id); }
    }
    if (created.length) setExtraSizes((c) => [...c, ...created]);

    setP((x) => ({
      ...x, description: d.description, gender: d.gender, garmentType: d.garment, material: d.material, careInfo: d.care, tags: d.tags,
      ...(cat ? { categoryId: cat.id } : {}),
      // generated clothing artwork only makes sense for clothes; other products wait for the admin's own photos
      ...(d.clothing ? {} : { images: x.images.filter((im) => !im.url.startsWith('svg:')) }),
    }));
    if (!cat) setNewCat(d.suggestedCategory);
    setPickSizes(picked);
    setPickColors(colors.filter((c) => d.colors.includes(c.name)).map((c) => c.id));
    setFillNote(
      `Filled in from the name${cat ? '' : ` — no matching category yet, so "${d.suggestedCategory}" is ready to add under Category`}${created.length ? `. Added ${created.length} new size${created.length === 1 ? '' : 's'}` : ''}. Now choose your photos, enter the price and press Generate variants. You can edit anything.`
    );
  }
  const sizeMap = useMemo(() => new Map(sizes.map((s) => [s.id, s])), [sizes]);
  const colorMap = useMemo(() => new Map(colors.map((c) => [c.id, c])), [colors]);
  const previewColor = colorMap.get(pickColors[0] ?? '')?.hex ?? '#1f1f24';

  const toggle = (id: string, setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    setter((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));

  function generate() {
    if (!basePrice || Number(basePrice) <= 0) return setMsg({ ok: false, text: 'Enter a base price first' });
    setP((s) => {
      const have = new Map(s.variants.map((v) => [`${v.sizeId}:${v.colorId}`, v]));
      const next: VariantRow[] = [];
      for (const colorId of pickColors) for (const sizeId of pickSizes) {
        next.push(have.get(`${sizeId}:${colorId}`) ?? { sizeId, colorId, sku: '', price: String(basePrice), comparePrice: '', stock: baseStock || '0', lowStock: '5', isActive: true });
      }
      return { ...s, variants: next };
    });
    setMsg(null);
  }

  const updateVariant = (key: string, patch: Partial<VariantRow>) =>
    setP((s) => ({ ...s, variants: s.variants.map((v) => (`${v.sizeId}:${v.colorId}` === key ? { ...v, ...patch } : v)) }));

  const addImage = (url: string) => set('images', [...p.images, { url, colorId: null, alt: '' }]);
  const moveImage = (i: number, d: -1 | 1) => {
    const arr = [...p.images];
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set('images', arr);
  };

  function save() {
    run(
      () =>
        saveProductAction({
          id: p.id,
          name: p.name,
          description: p.description,
          categoryId: p.categoryId,
          gender: p.gender,
          garmentType: p.garmentType,
          material: p.material,
          careInfo: p.careInfo,
          badge: p.badge,
          tags: p.tags.split(',').map((t) => t.trim()).filter(Boolean),
          featured: p.featured,
          isActive: p.isActive,
          images: p.images.map((i) => ({ url: i.url, colorId: i.colorId, alt: i.alt })),
          variants: p.variants.map((v) => ({
            sizeId: v.sizeId, colorId: v.colorId, sku: v.sku || undefined,
            price: Number(v.price), comparePrice: v.comparePrice ? Number(v.comparePrice) : null,
            stock: Number(v.stock || 0), lowStock: Number(v.lowStock || 5), isActive: v.isActive,
          })),
        }),
      { onDone: (r) => r.ok && (p.id ? null : router.push(`/admin/products/${r.id}`)) }
    );
  }

  const field = 'grid gap-1.5';

  return (
    <div className="grid gap-6">
      {/* basics */}
      <section className="card grid gap-4 p-4 sm:p-6">
        <h2 className="text-[18px]">Details</h2>
        <div className={field}>
          <div className="flex flex-wrap items-center justify-between gap-2"><label className="label !mb-0" htmlFor="pn">Product name</label><button type="button" className="btn btn-primary btn-sm" disabled={filling} onClick={() => void autofill()}>{filling ? 'Filling in…' : 'Auto-fill from name'}</button></div>
          <input id="pn" className="field" value={p.name} onChange={(e) => set('name', e.target.value)} maxLength={120} placeholder="e.g. Cloud Zip Hoodie" />
          <p className="hint">Type the name, then press Auto-fill to complete the rest. You only need to add photos and the price.</p>
          {fillNote && <p role="status" className="text-[12px] text-ink-2">{fillNote}</p>}
        </div>
        <div className={field}><div className="flex flex-wrap items-center justify-between gap-2"><label className="label !mb-0" htmlFor="pd">Description</label><button type="button" className="btn btn-soft btn-sm" disabled={writing} onClick={() => void generateDescription()}>{writing ? 'Writing…' : 'Generate description'}</button></div><textarea id="pd" className="field" rows={5} value={p.description} onChange={(e) => set('description', e.target.value)} maxLength={4000} />{writeNote && <p role="status" className="text-[12px] text-muted">{writeNote}</p>}</div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="min-w-0">
            <label className="label" htmlFor="pc">Category</label>
            <select id="pc" className="field" value={p.categoryId} onChange={(e) => set('categoryId', e.target.value)}><option value="">Choose…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            {newCat === null ? (
              <button type="button" className="mt-2 text-[13px] font-medium underline underline-offset-4" onClick={() => setNewCat('')}>+ Add a new category</button>
            ) : (
              <div className="mt-2 grid gap-2">
                <input className="field" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addCategory(); } }} placeholder="e.g. Hoodies" maxLength={60} autoFocus aria-label="New category name" />
                <div className="flex gap-2">
                  <button type="button" className="btn btn-primary btn-sm" disabled={catBusy} onClick={() => void addCategory()}>{catBusy ? 'Adding…' : 'Add category'}</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setNewCat(null); setCatError(''); }}>Cancel</button>
                </div>
                {catError && <p role="alert" className="text-[12px] text-danger">{catError}</p>}
              </div>
            )}
          </div>
          <div><label className="label" htmlFor="pg">Audience</label><select id="pg" className="field" value={p.gender} onChange={(e) => set('gender', e.target.value)}>{GENDERS.map((g) => <option key={g.value} value={g.value}>{g.value === 'UNISEX' ? 'Unisex / everyone' : g.label}</option>)}</select></div>
          <div><label className="label" htmlFor="pt">Product type</label><select id="pt" className="field" value={p.garmentType} onChange={(e) => set('garmentType', e.target.value)}>{PRODUCT_TYPES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</select></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="pm">Material</label><input id="pm" className="field" value={p.material} onChange={(e) => set('material', e.target.value)} placeholder="100% heavyweight cotton" /></div>
          <div><label className="label" htmlFor="pcare">Care</label><input id="pcare" className="field" value={p.careInfo} onChange={(e) => set('careInfo', e.target.value)} placeholder="Machine wash cold" /></div>
          <div><label className="label" htmlFor="pb">Badge (optional)</label><input id="pb" className="field" value={p.badge} onChange={(e) => set('badge', e.target.value)} maxLength={24} placeholder="Best seller" /></div>
          <div><label className="label" htmlFor="ptg">Search tags (comma separated)</label><input id="ptg" className="field" value={p.tags} onChange={(e) => set('tags', e.target.value)} placeholder="oversized, streetwear" /></div>
        </div>
        <div className="flex flex-wrap gap-x-8"><Toggle label="Visible in store" checked={p.isActive} onChange={(v) => set('isActive', v)} /><Toggle label="Featured on home page" checked={p.featured} onChange={(v) => set('featured', v)} /></div>
      </section>

      {/* images */}
      <section className="card grid gap-4 p-4 sm:p-6">
        <div>
          <h2 className="text-[18px]">Images</h2>
          <p className="hint">The first image is the main picture. Generated artwork recolours automatically to the colour the shopper selects. Choose real photos from your device (optionally tie each to one colour).</p>
        </div>
        {p.images.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {p.images.map((im, i) => (
              <li key={i} className="grid gap-2 rounded-2xl border border-line p-2">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-surface">
                  {im.url.startsWith('svg:') ? <ProductArt imageUrl={im.url} garmentType={p.garmentType} color={colorMap.get(im.colorId ?? pickColors[0] ?? '')?.hex ?? previewColor} alt="" sizes="200px" /> : <Image src={im.url} alt={im.alt || ''} fill sizes="200px" className="object-cover" unoptimized={im.url.startsWith('https://') ? false : undefined} />}
                  {i === 0 && <span className="badge badge-ink absolute left-2 top-2">Main</span>}
                </div>
                <select aria-label="Show for colour" className="field !min-h-10 !py-1 text-[13px]" value={im.colorId ?? ''} onChange={(e) => set('images', p.images.map((x, n) => (n === i ? { ...x, colorId: e.target.value || null } : x)))}>
                  <option value="">All colours</option>{colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="flex gap-1">
                  <button type="button" className="btn btn-soft btn-sm flex-1" disabled={i === 0} onClick={() => moveImage(i, -1)} aria-label="Move earlier">←</button>
                  <button type="button" className="btn btn-soft btn-sm flex-1" disabled={i === p.images.length - 1} onClick={() => moveImage(i, 1)} aria-label="Move later">→</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => set('images', p.images.filter((_, n) => n !== i))} aria-label="Remove image">✕</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <ImagePicker onUploaded={addImage} />
        <details className="text-[13px]">
          <summary className="cursor-pointer text-muted">No photos yet? Use generated artwork instead</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {VIEWS.map((v) => <button key={v.v} type="button" className="btn btn-soft btn-sm" onClick={() => addImage(v.v)}>+ {v.l} art</button>)}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => set('images', VIEWS.map((v) => ({ url: v.v, colorId: null, alt: '' })))}>Use all 4 art views</button>
          </div>
        </details>
      </section>

      {/* variants */}
      <section className="card grid gap-5 p-4 sm:p-6">
        <div><h2 className="text-[18px]">Sizes, colours & stock</h2><p className="hint">Pick the sizes and colours you sell, set a base price, then generate. Edit any row afterwards.</p></div>
        <div>
          <p className="label">Sizes</p>
          <div className="flex flex-wrap gap-2">{sizes.map((s) => (<button type="button" key={s.id} aria-pressed={pickSizes.includes(s.id)} onClick={() => toggle(s.id, setPickSizes)} className={`grid h-11 min-w-11 place-items-center rounded-full px-3 text-[14px] font-medium ${pickSizes.includes(s.id) ? 'bg-ink text-white' : 'bg-surface'}`}>{s.name}</button>))}</div>
        </div>
        <div>
          <p className="label">Colours</p>
          <div className="flex flex-wrap gap-2">{colors.map((c) => (<button type="button" key={c.id} aria-pressed={pickColors.includes(c.id)} onClick={() => toggle(c.id, setPickColors)} className={`inline-flex h-11 items-center gap-2 rounded-full px-3 text-[14px] font-medium ${pickColors.includes(c.id) ? 'bg-ink text-white' : 'bg-surface'}`}><span className="h-5 w-5 rounded-full border border-black/20" style={{ background: c.hex ?? '#111' }} />{c.name}</button>))}</div>
        </div>
        <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div><label className="label" htmlFor="bp">Base price (GHS)</label><input id="bp" type="number" min={0} step="0.01" inputMode="decimal" className="field" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} /></div>
          <div><label className="label" htmlFor="bs">Starting stock each</label><input id="bs" type="number" min={0} inputMode="numeric" className="field" value={baseStock} onChange={(e) => setBaseStock(e.target.value)} /></div>
          <button type="button" className="btn btn-primary col-span-2 sm:col-span-1" onClick={generate} disabled={!pickSizes.length || !pickColors.length}>Generate {pickSizes.length * pickColors.length || ''} variants</button>
        </div>

        {p.variants.length > 0 && (
          <div className="grid gap-4">
            {pickColors.concat(p.variants.map((v) => v.colorId)).filter((c, i, a) => a.indexOf(c) === i).map((cid) => {
              const rows = p.variants.filter((v) => v.colorId === cid);
              if (!rows.length) return null;
              return (
                <div key={cid} className="rounded-2xl border border-line">
                  <p className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5 text-[14px] font-medium"><span className="h-4 w-4 rounded-full border border-black/20" style={{ background: colorMap.get(cid)?.hex ?? '#111' }} />{colorMap.get(cid)?.name}</p>
                  <ul className="divide-y divide-line">
                    {rows.map((v) => {
                      const key = `${v.sizeId}:${v.colorId}`;
                      return (
                        <li key={key} className="grid grid-cols-[48px_1fr_1fr_1fr_auto] items-end gap-2 p-3 max-sm:grid-cols-3">
                          <p className="pb-3 text-[15px] font-semibold max-sm:col-span-3 max-sm:pb-0">{sizeMap.get(v.sizeId)?.name}</p>
                          <div><label className="label !text-[11px]">Price</label><input type="number" min={0} step="0.01" inputMode="decimal" className="field !min-h-11 !px-3" value={v.price} onChange={(e) => updateVariant(key, { price: e.target.value })} /></div>
                          <div><label className="label !text-[11px]">Was (opt.)</label><input type="number" min={0} step="0.01" inputMode="decimal" className="field !min-h-11 !px-3" value={v.comparePrice} onChange={(e) => updateVariant(key, { comparePrice: e.target.value })} /></div>
                          <div><label className="label !text-[11px]">Stock</label><input type="number" min={0} inputMode="numeric" className="field !min-h-11 !px-3" value={v.stock} onChange={(e) => updateVariant(key, { stock: e.target.value })} /></div>
                          <div className="flex items-center gap-1 max-sm:col-span-3 max-sm:justify-between">
                            <Toggle label="On" checked={v.isActive} onChange={(x) => updateVariant(key, { isActive: x })} />
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => set('variants', p.variants.filter((x) => `${x.sizeId}:${x.colorId}` !== key))} aria-label="Remove variant">✕</button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="pb-safe sticky bottom-[76px] z-20 grid gap-3 rounded-3xl border border-line bg-white/95 p-3 shadow-[0_20px_40px_-20px_rgba(0,0,0,.3)] backdrop-blur lg:bottom-4">
        <Flash msg={msg} />
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary flex-1" disabled={pending} onClick={save}>{pending ? 'Saving…' : p.id ? 'Save changes' : 'Create product'}</button>
          <Link href="/admin/products" className="btn btn-ghost">Cancel</Link>
          {p.id && <button className="btn btn-danger" disabled={pending} onClick={() => run(() => deleteProductAction(p.id!), { confirm: 'Delete this product? Products with past orders are hidden instead.', onDone: (r) => r.ok && router.push('/admin/products') })}>Delete</button>}
        </div>
      </div>
    </div>
  );
}
