'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { clearReadCache } from '@/lib/cache';
import { adminAction, AdminError, type FormResult } from './guard';
import { cleanText, safeHref } from '@/lib/security/sanitize';
import { saveSettings, SETTING_DEFAULTS, type SettingKey } from '@/domains/settings/service';
import { OrderService } from '@/domains/orders/service';
import { GARMENT_TYPES } from '@/components/svg/garments';
import { deleteAllUserSessions } from '@/lib/auth/session';
import type { OrderStatus } from '@prisma/client';

const refresh = () => {
  clearReadCache();
  revalidatePath('/', 'layout');
};
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Pick a valid colour');
const opt = (max: number) => z.string().transform((s) => cleanText(s, max)).optional();

/* ───────── hero slides ───────── */
const heroSchema = z.object({
  id: z.string().uuid().optional(),
  line1: z.string().transform((s) => cleanText(s, 24)).pipe(z.string().min(1, 'The first headline word is required')),
  line2: opt(24),
  line3: opt(16),
  line4: opt(24),
  tagline: opt(80),
  subtitle: opt(160),
  ctaLabel: z.string().transform((s) => cleanText(s, 32)).pipe(z.string().min(1, 'Button text is required')),
  ctaHref: z.string().max(300),
  garment: z.enum(GARMENT_TYPES.map((g) => g.value) as [string, ...string[]]),
  garmentColor: hex,
  bgFrom: hex,
  bgTo: hex,
  imageUrl: z.string().max(500).refine((u) => u === '' || /^(\/(?:uploads|photos)\/[\w./-]+|https:\/\/[^\s]+)$/.test(u), 'Invalid image address').optional(),
  displayOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export async function saveHeroSlideAction(input: unknown): Promise<FormResult> {
  return adminAction(async () => {
    const v = heroSchema.parse(input);
    const data = {
      line1: v.line1, line2: v.line2 || null, line3: v.line3 || null, line4: v.line4 || null,
      tagline: v.tagline || null, subtitle: v.subtitle || null,
      ctaLabel: v.ctaLabel, ctaHref: safeHref(v.ctaHref),
      garment: v.garment, garmentColor: v.garmentColor, bgFrom: v.bgFrom, bgTo: v.bgTo,
      imageUrl: v.imageUrl || null, displayOrder: v.displayOrder, isActive: v.isActive,
    };
    if (v.id) await prisma.heroSlide.update({ where: { id: v.id }, data });
    else await prisma.heroSlide.create({ data });
    refresh();
    return { ok: true, message: 'Slide saved' };
  }, { audit: { action: 'HERO_SAVE', entityType: 'HeroSlide' } });
}

export async function deleteHeroSlideAction(id: string): Promise<FormResult> {
  return adminAction(async () => {
    await prisma.heroSlide.delete({ where: { id } });
    refresh();
    return { ok: true, message: 'Slide deleted' };
  }, { audit: { action: 'HERO_DELETE', entityType: 'HeroSlide', entityId: id } });
}

/* ───────── settings ───────── */
export async function saveSettingsAction(input: unknown): Promise<FormResult> {
  return adminAction(async () => {
    const raw = z.record(z.string(), z.string().max(400)).parse(input);
    const clean: Partial<Record<SettingKey, string>> = {};
    for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
      if (raw[key] === undefined) continue;
      let val = cleanText(raw[key], 400);
      if (['shipping_fee', 'free_shipping_threshold'].includes(key)) {
        if (!Number.isFinite(Number(val)) || Number(val) < 0) throw new AdminError(`${key.replace(/_/g, ' ')} must be a positive number`);
      }
      if (key === 'hero_autoplay_ms') val = String(Math.min(4000, Math.max(1500, Number(val) || 4000)));
      if (['instagram', 'tiktok'].includes(key) && val) val = safeHref(val, '');
      clean[key] = val;
    }
    await saveSettings(clean);
    refresh();
    return { ok: true, message: 'Settings saved' };
  }, { audit: { action: 'SETTINGS_SAVE', entityType: 'SystemSetting' } });
}

/* ───────── discounts ───────── */
const discountSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().transform((s) => cleanText(s, 30).toUpperCase().replace(/\s/g, '')).pipe(z.string().min(3, 'Code must be at least 3 characters')),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  value: z.coerce.number().positive('Value must be greater than 0').max(1_000_000),
  minOrderAmount: z.coerce.number().min(0).nullable().optional(),
  maxUses: z.coerce.number().int().min(1).nullable().optional(),
  validUntil: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function saveDiscountAction(input: unknown): Promise<FormResult> {
  return adminAction(async () => {
    const v = discountSchema.parse(input);
    if (v.type === 'PERCENTAGE' && v.value > 100) throw new AdminError('A percentage discount cannot exceed 100');
    const data = {
      code: v.code, type: v.type, value: v.value,
      minOrderAmount: v.minOrderAmount || null, maxUses: v.maxUses || null,
      validUntil: v.validUntil ? new Date(v.validUntil + 'T23:59:59') : null,
      isActive: v.isActive,
    };
    if (v.id) await prisma.discount.update({ where: { id: v.id }, data });
    else await prisma.discount.create({ data: { ...data, validFrom: new Date() } });
    return { ok: true, message: 'Discount saved' };
  }, { audit: { action: 'DISCOUNT_SAVE', entityType: 'Discount' } });
}

export async function deleteDiscountAction(id: string): Promise<FormResult> {
  return adminAction(async () => {
    const used = await prisma.discountUsage.count({ where: { discountId: id } });
    if (used > 0) {
      await prisma.discount.update({ where: { id }, data: { isActive: false } });
      return { ok: true, message: 'This code was used on orders, so it was deactivated instead of deleted.' };
    }
    await prisma.discount.delete({ where: { id } });
    return { ok: true, message: 'Discount deleted' };
  });
}

/* ───────── orders ───────── */
export async function updateOrderStatusAction(orderId: string, status: OrderStatus): Promise<FormResult> {
  return adminAction(async (admin) => {
    await OrderService.updateStatus(orderId, status, admin.id);
    revalidatePath('/admin/orders');
    return { ok: true, message: 'Order updated' };
  });
}

export async function markOrderPaidAction(orderId: string): Promise<FormResult> {
  return adminAction(async () => {
    await OrderService.markPaid(orderId);
    revalidatePath('/admin/orders');
    return { ok: true, message: 'Marked as paid' };
  }, { audit: { action: 'ORDER_MARK_PAID', entityType: 'Order', entityId: orderId } });
}

export async function expireStaleOrdersAction(): Promise<FormResult> {
  return adminAction(async () => {
    const n = await OrderService.expireStaleOrders(60);
    revalidatePath('/admin/orders');
    return { ok: true, message: `${n} abandoned order(s) cancelled and stock released` };
  });
}

/* ───────── customers & team ───────── */
export async function setUserActiveAction(userId: string, isActive: boolean): Promise<FormResult> {
  return adminAction(async (admin) => {
    if (userId === admin.id) throw new AdminError('You cannot disable your own account');
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) throw new AdminError('User not found');
    if (target.role === 'SUPER_ADMIN' && admin.role !== 'SUPER_ADMIN') throw new AdminError('Only a super admin can change a super admin');
    await prisma.user.update({ where: { id: userId }, data: { isActive } });
    if (!isActive) await deleteAllUserSessions(userId);
    revalidatePath('/admin/customers');
    return { ok: true };
  }, { audit: { action: 'USER_ACTIVE', entityType: 'User', entityId: userId } });
}
