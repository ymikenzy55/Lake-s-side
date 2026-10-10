'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { clearReadCache } from '@/lib/cache';
import { adminAction, AdminError, type FormResult } from './guard';
import { ProductService } from '@/domains/products/service';
import { slugify } from '@/lib/utils';
import { cleanText } from '@/lib/security/sanitize';
import { randomToken } from '@/lib/security/tokens';
import { PRODUCT_TYPES } from '@/components/svg/garments';

const refresh = () => {
  clearReadCache();
  revalidatePath('/', 'layout');
};

/* ───────── categories ───────── */
const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().transform((s) => cleanText(s, 60)).pipe(z.string().min(2, 'Category name is required')),
  description: z.string().transform((s) => cleanText(s, 300)).optional(),
  displayOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

export async function saveCategoryAction(input: unknown): Promise<FormResult> {
  return adminAction(async () => {
    const v = categorySchema.parse(input);
    const data = { name: v.name, slug: slugify(v.name), description: v.description || null, displayOrder: v.displayOrder, isActive: v.isActive };
    if (!data.slug) throw new AdminError('Category name must contain letters or numbers');
    let id = v.id;
    if (v.id) await prisma.category.update({ where: { id: v.id }, data });
    else id = (await prisma.category.create({ data, select: { id: true } })).id;
    refresh();
    return { ok: true, message: 'Category saved', id };
  }, { audit: { action: 'CATEGORY_SAVE', entityType: 'Category' } });
}

export async function deleteCategoryAction(id: string): Promise<FormResult> {
  return adminAction(async () => {
    const n = await prisma.product.count({ where: { categoryId: id } });
    if (n > 0) throw new AdminError(`This category has ${n} product(s). Move or delete them first, or just deactivate the category.`);
    await prisma.category.delete({ where: { id } });
    refresh();
    return { ok: true, message: 'Category deleted' };
  }, { audit: { action: 'CATEGORY_DELETE', entityType: 'Category', entityId: id } });
}

/* ───────── sizes & colours ───────── */
const sizeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().transform((s) => cleanText(s, 12).toUpperCase()).pipe(z.string().min(1, 'Size name is required')),
  displayName: z.string().transform((s) => cleanText(s, 40)).optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export async function saveSizeAction(input: unknown): Promise<FormResult> {
  return adminAction(async () => {
    const v = sizeSchema.parse(input);
    const data = { name: v.name, displayName: v.displayName || null, sortOrder: v.sortOrder, isActive: v.isActive };
    let id = v.id;
    if (v.id) await prisma.size.update({ where: { id: v.id }, data });
    else id = (await prisma.size.create({ data, select: { id: true } })).id;
    refresh();
    return { ok: true, message: 'Size saved', id };
  }, { audit: { action: 'SIZE_SAVE', entityType: 'Size' } });
}

export async function deleteSizeAction(id: string): Promise<FormResult> {
  return adminAction(async () => {
    await prisma.size.delete({ where: { id } });
    refresh();
    return { ok: true, message: 'Size deleted' };
  });
}

const colorSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().transform((s) => cleanText(s, 40)).pipe(z.string().min(2, 'Colour name is required')),
  hexCode: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Pick a valid colour'),
  isActive: z.boolean().default(true),
});

export async function saveColorAction(input: unknown): Promise<FormResult> {
  return adminAction(async () => {
    const v = colorSchema.parse(input);
    const data = { name: v.name, hexCode: v.hexCode.toLowerCase(), isActive: v.isActive };
    if (v.id) await prisma.color.update({ where: { id: v.id }, data });
    else await prisma.color.create({ data });
    refresh();
    return { ok: true, message: 'Colour saved' };
  }, { audit: { action: 'COLOR_SAVE', entityType: 'Color' } });
}

export async function deleteColorAction(id: string): Promise<FormResult> {
  return adminAction(async () => {
    await prisma.color.delete({ where: { id } });
    refresh();
    return { ok: true, message: 'Colour deleted' };
  });
}

/* ───────── products ───────── */
const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().transform((s) => cleanText(s, 120)).pipe(z.string().min(2, 'Product name is required')),
  description: z.string().max(4000).optional(),
  categoryId: z.string().uuid('Choose a category'),
  gender: z.enum(['MEN', 'WOMEN', 'UNISEX', 'KIDS']),
  garmentType: z.enum(PRODUCT_TYPES.map((g) => g.value) as [string, ...string[]]),
  material: z.string().transform((s) => cleanText(s, 160)).optional(),
  careInfo: z.string().transform((s) => cleanText(s, 240)).optional(),
  badge: z.string().transform((s) => cleanText(s, 24)).optional(),
  tags: z.array(z.string().transform((s) => cleanText(s, 30).toLowerCase())).max(15).default([]),
  featured: z.boolean(),
  isActive: z.boolean(),
  images: z
    .array(
      z.object({
        url: z.string().max(500).refine((u) => /^(svg:(front|back|detail|studio)|\/(?:uploads|photos)\/[\w./-]+|https:\/\/[^\s]+)$/.test(u), 'Invalid image address'),
        colorId: z.string().uuid().nullable().optional(),
        alt: z.string().max(160).optional(),
      })
    )
    .max(20),
  variants: z
    .array(
      z.object({
        sizeId: z.string().uuid(),
        colorId: z.string().uuid(),
        sku: z.string().max(40).optional(),
        price: z.coerce.number().positive('Every variant needs a price').max(1_000_000),
        comparePrice: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
        stock: z.coerce.number().int().min(0).max(100_000),
        lowStock: z.coerce.number().int().min(0).max(10_000).default(5),
        isActive: z.boolean().default(true),
      })
    )
    .min(1, 'Add at least one size / colour variant')
    .max(300),
});

export async function saveProductAction(input: unknown): Promise<FormResult> {
  return adminAction(async (admin) => {
    const v = productSchema.parse(input);

    const dup = new Set<string>();
    for (const x of v.variants) {
      const k = `${x.sizeId}:${x.colorId}`;
      if (dup.has(k)) throw new AdminError('Each size and colour combination can only appear once.');
      dup.add(k);
    }

    let slug = slugify(v.name) || `product-${randomToken(3)}`;
    const clash = await prisma.product.findFirst({ where: { slug, ...(v.id ? { id: { not: v.id } } : {}) }, select: { id: true } });
    if (clash) slug = `${slug}-${randomToken(2)}`;

    const [sizes, colors] = await Promise.all([prisma.size.findMany(), prisma.color.findMany()]);
    const sizeName = new Map(sizes.map((s) => [s.id, s.name]));
    const colorName = new Map(colors.map((c) => [c.id, c.name]));

    const productId = await prisma.$transaction(async (tx) => {
      const base = {
        name: v.name,
        description: v.description?.trim() || null,
        categoryId: v.categoryId,
        gender: v.gender,
        garmentType: v.garmentType,
        material: v.material || null,
        careInfo: v.careInfo || null,
        badge: v.badge || null,
        tags: v.tags.filter(Boolean),
        featured: v.featured,
        isActive: v.isActive,
      };
      const product = v.id
        ? await tx.product.update({ where: { id: v.id }, data: { ...base, ...(clash ? {} : { slug }) } })
        : await tx.product.create({ data: { ...base, slug } });

      // images: replace set, first one is primary
      await tx.productImage.deleteMany({ where: { productId: product.id } });
      if (v.images.length) {
        await tx.productImage.createMany({
          data: v.images.map((im, i) => ({
            productId: product.id,
            imageUrl: im.url,
            colorId: im.colorId ?? null,
            altText: im.alt || null,
            displayOrder: i,
            isPrimary: i === 0,
          })),
        });
      }

      // variants: upsert by (size, colour); remove the rest (or deactivate if ordered before)
      const existing = await tx.productVariant.findMany({ where: { productId: product.id }, include: { inventory: true } });
      const keep = new Set<string>();
      for (const x of v.variants) {
        const key = `${x.sizeId}:${x.colorId}`;
        const found = existing.find((e) => `${e.sizeId}:${e.colorId}` === key);
        const sku =
          x.sku?.trim().toUpperCase() ||
          found?.sku ||
          `${slug.slice(0, 8).toUpperCase()}-${sizeName.get(x.sizeId)}-${(colorName.get(x.colorId) ?? 'X').slice(0, 3).toUpperCase()}-${randomToken(2).toUpperCase()}`;
        const data = { price: x.price, comparePrice: x.comparePrice || null, isActive: x.isActive, sku };

        let variantId: string;
        if (found) {
          await tx.productVariant.update({ where: { id: found.id }, data });
          variantId = found.id;
        } else {
          variantId = (await tx.productVariant.create({ data: { ...data, productId: product.id, sizeId: x.sizeId, colorId: x.colorId } })).id;
        }
        keep.add(variantId);

        const inv = found?.inventory;
        if (!inv) {
          const created = await tx.inventory.create({ data: { variantId, quantity: x.stock, lowStockThreshold: x.lowStock } });
          if (x.stock > 0) await tx.inventoryTransaction.create({ data: { inventoryId: created.id, quantity: x.stock, type: 'INITIAL', reason: 'Initial stock', metadata: { by: admin.id } } });
        } else {
          if (inv.quantity !== x.stock) {
            await tx.inventory.update({ where: { id: inv.id }, data: { quantity: x.stock, lowStockThreshold: x.lowStock } });
            await tx.inventoryTransaction.create({ data: { inventoryId: inv.id, quantity: x.stock - inv.quantity, type: 'ADJUSTMENT', reason: 'Edited in product editor', metadata: { by: admin.id } } });
          } else if (inv.lowStockThreshold !== x.lowStock) {
            await tx.inventory.update({ where: { id: inv.id }, data: { lowStockThreshold: x.lowStock } });
          }
        }
      }
      for (const e of existing.filter((e) => !keep.has(e.id))) {
        const used = await tx.orderItem.count({ where: { variantId: e.id } });
        if (used > 0) await tx.productVariant.update({ where: { id: e.id }, data: { isActive: false } });
        else {
          await tx.cartItem.deleteMany({ where: { variantId: e.id } });
          await tx.productVariant.delete({ where: { id: e.id } });
        }
      }
      return product.id;
    });

    await ProductService.syncMinPrice(productId);
    refresh();
    return { ok: true, id: productId, message: 'Product saved' };
  }, { audit: { action: 'PRODUCT_SAVE', entityType: 'Product' } });
}

export async function deleteProductAction(id: string): Promise<FormResult> {
  return adminAction(async () => {
    const ordered = await prisma.orderItem.count({ where: { variant: { productId: id } } });
    if (ordered > 0) {
      await prisma.product.update({ where: { id }, data: { isActive: false, featured: false } });
      refresh();
      return { ok: true, message: 'This product has past orders, so it was hidden from the store instead of deleted.' };
    }
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { variant: { productId: id } } }),
      prisma.product.delete({ where: { id } }),
    ]);
    refresh();
    return { ok: true, message: 'Product deleted' };
  }, { audit: { action: 'PRODUCT_DELETE', entityType: 'Product', entityId: id } });
}

export async function toggleProductAction(id: string, field: 'isActive' | 'featured', value: boolean): Promise<FormResult> {
  return adminAction(async () => {
    if (field !== 'isActive' && field !== 'featured') throw new AdminError('Invalid field');
    await prisma.product.update({ where: { id }, data: { [field]: value } });
    refresh();
    return { ok: true };
  });
}
