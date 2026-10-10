'use server';

import { adminAction, AdminError } from './guard';
import { rateLimit } from '@/lib/security/rate-limit';
import { cleanText } from '@/lib/security/sanitize';
import { autofillFromName, type Autofill } from '@/lib/product-autofill';

export interface DescribeInput {
  name: string;
  category?: string;
  kind?: string;
  use?: string;
  gender?: string;
  material?: string;
  care?: string;
  colors?: string[];
  sizes?: string[];
  tags?: string;
}

const FIT: Record<string, string> = { MEN: "men's", WOMEN: "women's", KIDS: "kids'" };
const article = (w: string) => (/^[aeiou]/i.test(w) ? 'an' : 'a');

function list(a: string[]) {
  return a.length < 3 ? a.join(' and ') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
}

/** Offline fallback: a tidy, factual description built from the product's own details. */
function templateDescription(d: DescribeInput): string {
  const fit = FIT[d.gender ?? ''] ?? '';
  const kind = (d.kind || d.category || 'item').toLowerCase();
  const pair = kind.startsWith('pair of ');
  const lead = pair ? `pair of ${fit ? `${fit} ` : ''}${kind.slice(8)}` : `${fit ? `${fit} ` : ''}${kind}`;
  const opener = `${d.name} is ${article(lead)} ${lead} ${d.use || 'made to be useful every day'}.`;
  const fabric = d.material ? `Made from ${d.material.charAt(0).toLowerCase()}${d.material.slice(1).replace(/\.$/, '')}, it is built to feel good and last.` : 'It is built with care to feel good and last.';
  const real = (d.sizes ?? []).filter((s) => !/^(one size|os|free size)$/i.test(s));
  const colours = d.colors?.length ? `Available in ${list(d.colors)}` : '';
  const sizes = real.length ? `${colours ? ' and in sizes ' : 'Available in sizes '}${real.length > 1 ? `${real[0]} to ${real[real.length - 1]}` : real[0]}.` : colours ? '.' : '';
  const care = d.care ? ` Care: ${d.care.replace(/\.$/, '')}.` : '';
  return `${opener} ${fabric} ${colours}${sizes}${care}`.replace(/\s+/g, ' ').replace(/\s\./g, '.').trim();
}

const SYSTEM =
  'You write product details for Comfort_fit GH, an online shop in Ghana that mainly sells clothing but can sell any product. Use a warm, clear, honest tone. Use only what the name and the given facts support; never invent specific materials, features, prices or claims you cannot reasonably infer. Plain text, no markdown, no emojis.';

async function callClaude(user: string, maxTokens: number): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5', max_tokens: maxTokens, system: SYSTEM, messages: [{ role: 'user', content: user }] }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    return data.content?.filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim() || null;
  } catch {
    return null;
  }
}

const factsOf = (d: DescribeInput) =>
  [
    `Name: ${d.name}`, d.kind && `Kind of product: ${d.kind}`, d.category && `Category: ${d.category}`, d.gender && d.gender !== 'UNISEX' && `For: ${d.gender}`, d.material && `Material: ${d.material}`,
    d.care && `Care: ${d.care}`, d.colors?.length && `Colours: ${d.colors.join(', ')}`, d.sizes?.length && `Sizes: ${d.sizes.join(', ')}`, d.tags && `Tags: ${d.tags}`,
  ].filter(Boolean).join('\n');

async function claudeDescription(d: DescribeInput): Promise<string | null> {
  const text = await callClaude(`Write the description for this product: 2 short paragraphs, about 70-100 words in total.\n\n${factsOf(d)}`, 400);
  return text ? text.slice(0, 1500) : null;
}

const clean = (a: string[] | undefined, n: number, max: number) => (a ?? []).slice(0, n).map((x) => cleanText(x, max)).filter(Boolean);

/** Generates a product description from the product's details (Claude when ANTHROPIC_API_KEY is set, otherwise a built-in writer). */
export async function generateDescriptionAction(input: DescribeInput): Promise<{ ok: boolean; message?: string; text?: string; source?: 'ai' | 'template' }> {
  let text = '';
  let source: 'ai' | 'template' = 'template';
  const res = await adminAction(async (admin) => {
    if (!rateLimit(`describe:${admin.id}`, 30, 60 * 60_000).ok) throw new AdminError('You have generated a lot of descriptions. Try again in a little while.');
    const d: DescribeInput = {
      name: cleanText(input.name, 120),
      category: cleanText(input.category, 60),
      kind: cleanText(input.kind, 40),
      use: cleanText(input.use, 80),
      gender: cleanText(input.gender, 20),
      material: cleanText(input.material, 160),
      care: cleanText(input.care, 200),
      colors: clean(input.colors, 12, 30),
      sizes: clean(input.sizes, 12, 12),
      tags: cleanText(input.tags, 200),
    };
    if (d.name.length < 2) throw new AdminError('Enter the product name first, then generate the description.');
    const ai = await claudeDescription(d);
    if (ai) {
      text = ai;
      source = 'ai';
    } else text = templateDescription(d);
  });
  return res.ok ? { ok: true, text, source } : { ok: false, message: res.message };
}

export interface AutofillResult extends Autofill {
  description: string;
  source: 'ai' | 'template';
}

const GENDERS = ['MEN', 'WOMEN', 'UNISEX', 'KIDS'] as const;
type AiPart = Partial<Autofill> & { description?: string };

/** With an API key, let Claude classify ANY product (not just the kinds the built-in rules know). */
async function claudeAutofill(name: string, categories: string[], base: Autofill): Promise<AiPart | null> {
  const text = await callClaude(
    `Product name: "${name}"\nExisting categories: ${categories.join(', ') || 'none'}\n\n` +
      'Reply with ONLY a JSON object (no code fences) with these keys:\n' +
      '"kind": singular noun for what it is (e.g. "sneaker", "handbag", "hoodie"),\n' +
      '"category": the best existing category, or a short new category name if none fits,\n' +
      '"gender": one of MEN, WOMEN, UNISEX, KIDS,\n' +
      '"clothing": true only if it is a garment or cap (worn clothing), else false,\n' +
      '"material": a short likely material, or "" if unknowable,\n' +
      '"care": one short care instruction, or "",\n' +
      '"tags": array of up to 8 lowercase search tags,\n' +
      '"sizes": array of sensible size labels for this product (e.g. ["S","M","L","XL"], ["40","41","42","43"], or ["ONE SIZE"]),\n' +
      '"description": 2 short paragraphs, about 70-100 words in total.',
    700
  );
  if (!text) return null;
  try {
    const j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as Record<string, unknown>;
    const str = (v: unknown, max: number) => (typeof v === 'string' ? cleanText(v, max) : '');
    const arr = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v.slice(0, n).map((x) => cleanText(String(x), max)).filter(Boolean) : []);
    const out: AiPart = {};
    const kind = str(j.kind, 40);
    if (kind) out.kind = kind;
    const category = str(j.category, 60);
    if (category) {
      const match = categories.find((c) => c.toLowerCase() === category.toLowerCase());
      out.category = match ?? null;
      out.suggestedCategory = match ? base.suggestedCategory : category;
    }
    if (GENDERS.includes(j.gender as (typeof GENDERS)[number])) out.gender = j.gender as Autofill['gender'];
    if (typeof j.clothing === 'boolean') out.clothing = j.clothing;
    if (typeof j.material === 'string') out.material = str(j.material, 160);
    if (typeof j.care === 'string') out.care = str(j.care, 200);
    const tags = arr(j.tags, 8, 30);
    if (tags.length) out.tags = tags.join(', ');
    const sizes = arr(j.sizes, 12, 12);
    if (sizes.length) out.sizes = sizes;
    const description = str(j.description, 1500);
    if (description) out.description = description;
    return out;
  } catch {
    return null;
  }
}

/** Fills every product detail (except images and price) from just the product name. */
export async function autofillProductAction(input: { name: string; categories: string[]; sizes: string[]; colors: string[] }): Promise<{ ok: boolean; message?: string; data?: AutofillResult }> {
  let data: AutofillResult | undefined;
  const res = await adminAction(async (admin) => {
    if (!rateLimit(`autofill:${admin.id}`, 40, 60 * 60_000).ok) throw new AdminError('You have used auto-fill a lot. Try again in a little while.');
    const name = cleanText(input.name, 120);
    if (name.length < 3) throw new AdminError('Type the product name first (for example "Cloud Zip Hoodie").');
    const categories = clean(input.categories, 80, 60);
    const sizesIn = clean(input.sizes, 60, 12);
    let f = autofillFromName({ name, categories, sizes: sizesIn, colors: clean(input.colors, 80, 30) });
    const ai = await claudeAutofill(name, categories, f);
    let description: string | undefined;
    if (ai) {
      const { description: aiDescription, ...rest } = ai;
      description = aiDescription;
      f = { ...f, ...rest };
      if (rest.clothing === false) f.garment = 'other';
      else if (rest.clothing === true && f.garment === 'other') f.garment = 'tee';
      if (rest.sizes) {
        const have = new Map(sizesIn.map((s) => [s.toLowerCase(), s]));
        f.sizes = rest.sizes.map((s) => have.get(s.toLowerCase()) ?? s.toUpperCase());
      }
    }
    const d: DescribeInput = { name, kind: f.kind, use: f.use, category: f.kind, gender: f.gender, material: f.material, care: f.care, colors: f.colors, sizes: f.sizes, tags: f.tags };
    let fromAi = !!description;
    if (!description) {
      description = (await claudeDescription(d)) ?? undefined;
      fromAi = !!description;
    }
    data = { ...f, description: description ?? templateDescription(d), source: fromAi ? 'ai' : 'template' };
  });
  return res.ok ? { ok: true, data } : { ok: false, message: res.message };
}
