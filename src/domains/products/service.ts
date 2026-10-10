import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { cachedRead } from '@/lib/cache';
import type { Gender } from '@prisma/client';

export interface ProductFilters {
  categoryId?: string;
  categorySlug?: string;
  gender?: Gender;
  featured?: boolean;
  onSale?: boolean;
  isActive?: boolean | 'all';
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
}

export interface ProductListOptions {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'name' | 'featured';
}

/** Serializable product card (no Decimal) used by listing pages. */
export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  badge: string | null;
  featured: boolean;
  garmentType: string;
  category: string;
  price: number;
  comparePrice: number | null;
  imageUrl: string | null;
  imageUrl2: string | null;
  colors: { name: string; hex: string }[];
  variants: { id: string; size: string; sortOrder: number; color: string; hex: string; stock: number; price: number }[];
  inStock: boolean;
  isNew: boolean;
}

const cardInclude = {
  category: { select: { name: true, slug: true } },
  images: { orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }], take: 2 },
  variants: {
    where: { isActive: true },
    select: {
      id: true,
      price: true,
      comparePrice: true,
      size: { select: { name: true, sortOrder: true } },
      color: { select: { name: true, hexCode: true } },
      inventory: { select: { quantity: true, reservedQuantity: true } },
    },
    orderBy: { price: 'asc' },
  },
} satisfies Prisma.ProductInclude;

type CardRow = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

const NEW_DAYS = 21;

/** Products created in the last 3 weeks get a "New" badge. */
export function isNewProduct(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() < NEW_DAYS * 86_400_000;
}

export function toCard(p: CardRow): ProductCard {
  const cheapest = p.variants[0];
  const seen = new Map<string, string>();
  for (const v of p.variants) if (!seen.has(v.color.name)) seen.set(v.color.name, v.color.hexCode ?? '#111111');
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    badge: p.badge,
    featured: p.featured,
    garmentType: p.garmentType,
    category: p.category.name,
    price: cheapest ? Number(cheapest.price) : Number(p.minPrice),
    comparePrice: cheapest?.comparePrice ? Number(cheapest.comparePrice) : null,
    imageUrl: p.images[0]?.imageUrl ?? null,
    imageUrl2: p.images[1]?.imageUrl ?? null,
    colors: [...seen].map(([name, hex]) => ({ name, hex })),
    variants: p.variants.map((v) => ({
      id: v.id,
      size: v.size.name,
      sortOrder: v.size.sortOrder,
      color: v.color.name,
      hex: v.color.hexCode ?? '#111111',
      stock: Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0)),
      price: Number(v.price),
    })),
    inStock: p.variants.some((v) => (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0) > 0),
    isNew: isNewProduct(p.createdAt),
  };
}

export class ProductService {
  /* Cached public reads (60s fresh, served stale for up to 15 min if the database is unreachable). */
  static getProducts(filters: ProductFilters = {}, options: ProductListOptions = {}) {
    return cachedRead(`products:${JSON.stringify([filters, options])}`, 60_000, () => this.getProductsUncached(filters, options));
  }
  static getFeaturedProducts(limit = 8) {
    return cachedRead(`featured:${limit}`, 60_000, () => this.getFeaturedProductsUncached(limit));
  }
  static getNewArrivals(limit = 8) {
    return cachedRead(`new:${limit}`, 60_000, () => this.getNewArrivalsUncached(limit));
  }
  static getRelated(productId: string, categoryId: string, limit = 4) {
    return cachedRead(`related:${productId}:${limit}`, 120_000, () => this.getRelatedUncached(productId, categoryId, limit));
  }
  static getProductBySlug(slug: string) {
    return cachedRead(`slug:${slug}`, 60_000, () => this.getProductBySlugUncached(slug));
  }
  static getCategories() {
    return cachedRead('categories', 120_000, () => this.getCategoriesUncached());
  }
  static getSizes() {
    return cachedRead('sizes', 300_000, () => this.getSizesUncached());
  }
  static getColors() {
    return cachedRead('colors', 300_000, () => this.getColorsUncached());
  }

  static async getProductsUncached(filters: ProductFilters = {}, options: ProductListOptions = {}) {
    const { page = 1, limit = 12, sort = 'newest' } = options;

    const where: Prisma.ProductWhereInput = {};
    if (filters.isActive !== 'all') where.isActive = filters.isActive ?? true;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.categorySlug) where.category = { slug: filters.categorySlug };
    if (filters.gender) where.gender = { in: [filters.gender, 'UNISEX'] };
    if (filters.featured) where.featured = true;
    if (filters.onSale) where.AND = [{ variants: { some: { isActive: true, comparePrice: { not: null } } } }];
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { tags: { has: filters.search.toLowerCase() } },
      ];
    }
    if (filters.minPrice != null || filters.maxPrice != null) {
      where.minPrice = {
        ...(filters.minPrice != null && { gte: filters.minPrice }),
        ...(filters.maxPrice != null && { lte: filters.maxPrice }),
      };
    }
    if (filters.sizes?.length || filters.colors?.length) {
      where.variants = {
        some: {
          isActive: true,
          ...(filters.sizes?.length && { size: { name: { in: filters.sizes } } }),
          ...(filters.colors?.length && { color: { name: { in: filters.colors } } }),
        },
      };
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      sort === 'price-asc'
        ? [{ minPrice: 'asc' }]
        : sort === 'price-desc'
          ? [{ minPrice: 'desc' }]
          : sort === 'name'
            ? [{ name: 'asc' }]
            : sort === 'featured'
              ? [{ featured: 'desc' }, { createdAt: 'desc' }]
              : [{ createdAt: 'desc' }];

    const [rows, total] = await Promise.all([
      prisma.product.findMany({ where, relationLoadStrategy: 'join',
      include: cardInclude, orderBy, skip: (page - 1) * limit, take: limit }),
      prisma.product.count({ where }),
    ]);

    return {
      products: rows.map(toCard),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  static async getFeaturedProductsUncached(limit = 8) {
    const rows = await prisma.product.findMany({
      where: { isActive: true, featured: true },
      relationLoadStrategy: 'join',
      include: cardInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(toCard);
  }

  static async getNewArrivalsUncached(limit = 8) {
    const rows = await prisma.product.findMany({
      where: { isActive: true },
      relationLoadStrategy: 'join',
      include: cardInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(toCard);
  }

  static async getRelatedUncached(productId: string, categoryId: string, limit = 4) {
    const rows = await prisma.product.findMany({
      where: { isActive: true, categoryId, id: { not: productId } },
      relationLoadStrategy: 'join',
      include: cardInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(toCard);
  }

  static async getProductBySlugUncached(slug: string) {
    return prisma.product.findUnique({
      where: { slug },
      relationLoadStrategy: 'join',
      include: {
        category: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }] },
        variants: {
          where: { isActive: true },
          include: {
            size: { select: { id: true, name: true, displayName: true, sortOrder: true } },
            color: { select: { id: true, name: true, hexCode: true } },
            inventory: { select: { quantity: true, reservedQuantity: true } },
          },
          orderBy: [{ color: { name: 'asc' } }, { size: { sortOrder: 'asc' } }],
        },
      },
    });
  }

  static async getProductById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }] },
        variants: { include: { size: true, color: true, inventory: true }, orderBy: [{ color: { name: 'asc' } }, { size: { sortOrder: 'asc' } }] },
      },
    });
  }

  static async getCategoriesUncached() {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    });
  }

  static getSizesUncached() {
    return prisma.size.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  }

  static getColorsUncached() {
    return prisma.color.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  /** Keep the denormalised cheapest price in sync (used for sorting & filtering). */
  static async syncMinPrice(productId: string) {
    const agg = await prisma.productVariant.aggregate({
      where: { productId, isActive: true },
      _min: { price: true },
    });
    await prisma.product.update({ where: { id: productId }, data: { minPrice: agg._min.price ?? 0 } });
  }

  static async ensurePrimaryImage(productId: string) {
    const imgs = await prisma.productImage.findMany({ where: { productId }, orderBy: { displayOrder: 'asc' } });
    if (imgs.length && !imgs.some((i) => i.isPrimary)) {
      await prisma.productImage.update({ where: { id: imgs[0].id }, data: { isPrimary: true } });
    }
  }
}
