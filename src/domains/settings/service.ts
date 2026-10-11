import { cache } from 'react';
import { prisma } from '@/lib/db';
import { BRAND } from '@/lib/config/brand';
import { TtlCache, cachedRead, clearReadCache } from '@/lib/cache';

const settingsCache = new TtlCache<Settings>(30_000, 1);

export const SETTING_DEFAULTS = {
  store_name: BRAND.name,
  tagline: BRAND.tagline,
  announcement_enabled: 'true',
  announcement_text: 'New season coming: 10% off all products. Free delivery over GHS 500.',
  contact_email: 'hello@thelakeside.shop',
  contact_phone: '+233 20 000 0000',
  whatsapp: '233200000000',
  instagram: 'https://instagram.com/thelakeside',
  tiktok: '',
  address: 'Accra, Ghana',
  shipping_fee: '20',
  free_shipping_threshold: '500',
  cod_enabled: 'true',
  paystack_enabled: 'true',
  hero_autoplay_ms: '4000',
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type Settings = Record<SettingKey, string>;

/** All settings merged over defaults. Memoised per request. */
export const getSettings = cache(async (): Promise<Settings> => {
  const hit = settingsCache.get('all');
  if (hit) return hit;
  const out = await cachedRead('settings', 30_000, async () => {
    const rows = await prisma.systemSetting.findMany();
    const o: Record<string, string> = { ...SETTING_DEFAULTS };
    for (const r of rows) o[r.key] = r.value;
    return o as Settings;
  }).catch(() => ({ ...SETTING_DEFAULTS }) as Settings); // never take the whole site down for settings
  settingsCache.set('all', out);
  return out;
});

export async function saveSettings(values: Partial<Record<SettingKey, string>>) {
  settingsCache.clear();
  clearReadCache();
  const entries = Object.entries(values).filter(([k]) => k in SETTING_DEFAULTS) as [SettingKey, string][];
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.systemSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
    )
  );
}

export function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
