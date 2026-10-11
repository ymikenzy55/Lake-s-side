/**
 * Idempotent seed. Safe to re-run: it only creates what is missing.
 *
 *   ADMIN_EMAIL / ADMIN_PASSWORD   credentials for the super admin (from .env, never hard-coded)
 *   SEED_DEMO=false                skip the demo catalogue
 */
import { PrismaClient, type Gender } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SIZES = [
  ['XS', 'Extra Small'], ['S', 'Small'], ['M', 'Medium'], ['L', 'Large'], ['XL', 'Extra Large'], ['XXL', '2X Large'],
];
const COLORS: [string, string][] = [
  ['Black', '#16161a'], ['White', '#f6f6f4'], ['Charcoal', '#4a4d55'], ['Navy', '#1d2a4a'], ['Olive', '#5b6240'],
  ['Sand', '#cdbb98'], ['Cream', '#efe6d2'], ['Brick Red', '#a8402f'], ['Forest', '#2f5a45'], ['Sky', '#8fb4d9'],
];
const CATEGORIES = [
  ['Hoodies & Sweats', 'hoodies'], ['T-Shirts', 't-shirts'], ['Polos', 'polos'], ['Trousers & Joggers', 'trousers'],
  ['Shorts', 'shorts'], ['Dresses & Skirts', 'dresses'], ['Caps', 'caps'],
];

interface Demo {
  name: string; cat: string; gender: Gender; type: string; price: number; was?: number; badge?: string; featured?: boolean;
  colors: string[]; sizes: string[]; material: string; desc: string;
  /** Photos in public/photos, first is the primary image. */
  photos: string[];
}
const TEE_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const DEMO: Demo[] = [
  {
    name: 'Where Calm Meets Clarity Tee', cat: 't-shirts', gender: 'UNISEX', type: 'tee', price: 250, badge: 'New', featured: true,
    colors: ['White'], sizes: TEE_SIZES, material: 'Heavyweight cotton jersey',
    desc: 'Our signature white tee. "Where Calm Meets Clarity, Est. 2026" with the heartbeat-and-globe line and "Dream • Explore • Live" on the front, and the full "The Lakeside: Find Peace By The Water" mountain-lake artwork on the back. Relaxed, slightly oversized fit.',
    photos: ['where-calm-meets-clarity-tee-1.jpg', 'where-calm-meets-clarity-tee-2.jpg', 'where-calm-meets-clarity-tee-3.jpg', 'where-calm-meets-clarity-tee-4.jpg'],
  },
  {
    name: 'Find Peace By The Water Tee', cat: 't-shirts', gender: 'UNISEX', type: 'tee', price: 250, badge: 'New', featured: true,
    colors: ['Black'], sizes: TEE_SIZES, material: 'Heavyweight cotton jersey',
    desc: 'The black Lakeside tee with our full-colour back print: "The Lakeside, Find Peace By The Water" over a moonlit mountain lake, finished with "Est. 2026" and "Dream • Explore • Live". Relaxed, slightly oversized fit.',
    photos: ['find-peace-by-the-water-tee-1.jpg', 'find-peace-by-the-water-tee-2.jpg'],
  },
];

const slug = (s: string) => s.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

async function main() {
  /* ── admin ── */
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || '';
  if (email && password) {
    if (password.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters');
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.upsert({
      where: { email },
      update: { role: 'SUPER_ADMIN', isActive: true, passwordHash, firstName: process.env.ADMIN_FIRST_NAME || undefined, lastName: process.env.ADMIN_LAST_NAME || undefined },
      create: { email, passwordHash, firstName: process.env.ADMIN_FIRST_NAME || 'Store', lastName: process.env.ADMIN_LAST_NAME || 'Admin', role: 'SUPER_ADMIN', emailVerified: true, emailVerifiedAt: new Date() },
    });
    console.log('Super admin ready:', email);
  } else {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set: skipping admin creation');
  }

  // Retire placeholder admin accounts from earlier setups (never the configured super admin).
  for (const old of ['admin@splendor.com', 'admin@comfortfit.gh', 'admin@thelakeside.shop']) {
    if (old === email) continue;
    const u = await prisma.user.findUnique({ where: { email: old } });
    if (u && (u.isActive || u.role !== 'CUSTOMER')) {
      await prisma.user.update({ where: { id: u.id }, data: { isActive: false, role: 'CUSTOMER' } });
      await prisma.session.deleteMany({ where: { userId: u.id } });
      console.log('Disabled placeholder admin account', old);
    }
  }

  /* ── reference data ── */
  await prisma.category.updateMany({ where: { slug: 'dresses' }, data: { name: 'Dresses & Skirts' } });
  for (const [i, [name, s]] of CATEGORIES.entries()) {
    await prisma.category.upsert({ where: { slug: s }, update: {}, create: { name, slug: s, displayOrder: i + 1, description: `${name} by The Lakeside` } });
  }

  for (const [i, [name, displayName]] of SIZES.entries()) {
    await prisma.size.upsert({ where: { name }, update: { sortOrder: i + 1 }, create: { name, displayName, sortOrder: i + 1 } });
  }
  for (const [name, hexCode] of COLORS) {
    await prisma.color.upsert({ where: { name }, update: { hexCode }, create: { name, hexCode } });
  }

  const settings: Record<string, string> = {
    store_name: 'The Lakeside', shipping_fee: '20', free_shipping_threshold: '500', hero_autoplay_ms: '4000',
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.systemSetting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  await prisma.discount.upsert({
    where: { code: 'WELCOME10' }, update: {},
    create: { code: 'WELCOME10', type: 'PERCENTAGE', value: 10, validFrom: new Date(), minOrderAmount: 100 },
  });

  /* ── hero ── */
  if ((await prisma.heroSlide.count()) === 0) {
    await prisma.heroSlide.createMany({
      data: [
        { line1: 'Shop', line2: 'New season', line3: '2026', line4: null, tagline: 'Where calm meets clarity.', subtitle: 'Soft, considered layers for slow mornings and clear evenings by the water.', garment: 'tee', garmentColor: '#f6f6f4', bgFrom: '#1b2540', bgTo: '#0b1220', ctaLabel: 'Shop the collection', ctaHref: '/products', imageUrl: '/photos/banner-shop.jpg', displayOrder: 0 },
        { line1: 'Wholesale', line2: 'For business', line3: null, line4: null, tagline: 'Bulk orders and custom branding for your business.', subtitle: 'Outfit your team, shop or event with premium Lakeside wear at trade prices.', garment: 'tee', garmentColor: '#16161a', bgFrom: '#1b2540', bgTo: '#0b1220', ctaLabel: 'Request a bulk order', ctaHref: '/about#business', imageUrl: '/photos/banner-rack.jpg', displayOrder: 1 },
      ],
    });
  }

  // Clean photo banners (public/photos) for the two seeded slides.
  const banners = ['/photos/banner-shop.jpg', '/photos/banner-rack.jpg'];
  const seeded = await prisma.heroSlide.findMany({ orderBy: { displayOrder: 'asc' }, take: 2 });
  for (const [i, sl] of seeded.entries()) {
    await prisma.heroSlide.update({ where: { id: sl.id }, data: { imageUrl: banners[i], bgFrom: '#1b2540', bgTo: '#0b1220' } });
  }

  /* ── demo catalogue ── */
  if (process.env.SEED_DEMO === 'false') return;
  const cats = new Map((await prisma.category.findMany()).map((c) => [c.slug, c.id]));
  const sizes = new Map((await prisma.size.findMany()).map((s) => [s.name, s.id]));
  const colors = new Map((await prisma.color.findMany()).map((c) => [c.name, c.id]));

  for (const d of DEMO) {
    const s = slug(d.name);
    if (await prisma.product.findUnique({ where: { slug: s } })) continue;
    const product = await prisma.product.create({
      data: {
        name: d.name, slug: s, description: d.desc, categoryId: cats.get(d.cat)!, gender: d.gender, garmentType: d.type,
        material: d.material, careInfo: 'Machine wash cold, inside out. Do not bleach.', badge: d.badge ?? null,
        featured: d.featured ?? false, minPrice: d.price, tags: [d.type, d.cat, d.gender.toLowerCase()],
        images: { create: d.photos.map((f, i) => ({ imageUrl: `/photos/${f}`, displayOrder: i, isPrimary: i === 0, altText: `${d.name} photo ${i + 1}` })) },
      },
    });
    const rows = d.colors.flatMap((c) =>
      d.sizes.map((sz) => ({
        productId: product.id, sizeId: sizes.get(sz)!, colorId: colors.get(c)!,
        sku: `${s.slice(0, 6).toUpperCase()}-${sz}-${c.replace(/\s/g, '').slice(0, 3).toUpperCase()}`,
        price: d.price, comparePrice: d.was ?? null,
      }))
    );
    await prisma.productVariant.createMany({ data: rows });
    const created = await prisma.productVariant.findMany({ where: { productId: product.id }, select: { id: true } });
    const stocks = created.map((v) => ({ variantId: v.id, quantity: 10, lowStockThreshold: 3 }));
    await prisma.inventory.createMany({ data: stocks });
    const invs = await prisma.inventory.findMany({ where: { variantId: { in: created.map((v) => v.id) } }, select: { id: true, quantity: true } });
    await prisma.inventoryTransaction.createMany({ data: invs.map((i) => ({ inventoryId: i.id, quantity: i.quantity, type: 'INITIAL' as const, reason: 'Seed data' })) });
    console.log('Created product:', d.name);
  }

  // Only show categories that actually have products (admins can switch others back on).
  await prisma.category.updateMany({ where: { products: { none: {} } }, data: { isActive: false } });
  console.log('Seed complete');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
