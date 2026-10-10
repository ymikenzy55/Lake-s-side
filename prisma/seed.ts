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
}
const ALL = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const DEMO: Demo[] = [
  { name: 'Everyday Heavy Hoodie', cat: 'hoodies', gender: 'UNISEX', type: 'hoodie', price: 320, was: 380, badge: 'Best seller', featured: true, colors: ['Charcoal', 'Black', 'Sand', 'Forest'], sizes: ALL, material: '400gsm brushed cotton fleece', desc: 'Our signature oversized hoodie in heavyweight fleece. Soft inside, structured outside, built for harmattan mornings and cold AC.' },
  { name: 'Cloud Crew Sweatshirt', cat: 'hoodies', gender: 'UNISEX', type: 'hoodie', price: 260, colors: ['Cream', 'Sky', 'Navy'], sizes: ALL, material: '320gsm cotton terry', desc: 'A relaxed crew sweatshirt with dropped shoulders and a ribbed hem that holds its shape.' },
  { name: 'Classic Boxy Tee', cat: 't-shirts', gender: 'UNISEX', type: 'tee', price: 120, featured: true, colors: ['White', 'Black', 'Olive', 'Brick Red'], sizes: ALL, material: '220gsm combed cotton', desc: 'The tee you will reach for every day. Boxy fit, double-stitched collar, zero cling.' },
  { name: 'Soft Touch Slim Tee', cat: 't-shirts', gender: 'MEN', type: 'tee', price: 95, was: 120, colors: ['Navy', 'Sky', 'Charcoal'], sizes: ['S', 'M', 'L', 'XL', 'XXL'], material: '180gsm cotton jersey', desc: 'A lighter, slimmer cut for hot days and layering.' },
  { name: 'Pique Polo', cat: 'polos', gender: 'MEN', type: 'polo', price: 180, badge: 'New', colors: ['White', 'Navy', 'Forest'], sizes: ['S', 'M', 'L', 'XL', 'XXL'], material: 'Cotton pique', desc: 'Smart enough for the office, comfortable enough for the weekend.' },
  { name: 'Weekend Joggers', cat: 'trousers', gender: 'UNISEX', type: 'trousers', price: 240, featured: true, colors: ['Charcoal', 'Black', 'Olive'], sizes: ALL, material: 'Cotton-poly fleece', desc: 'Tapered joggers with a drawcord waist, zip pockets and a soft brushed lining.' },
  { name: 'Relaxed Chinos', cat: 'trousers', gender: 'MEN', type: 'trousers', price: 280, colors: ['Sand', 'Navy', 'Olive'], sizes: ['S', 'M', 'L', 'XL', 'XXL'], material: 'Stretch cotton twill', desc: 'Easy straight-leg chinos with stretch for all-day sitting and moving.' },
  { name: 'Lounge Shorts', cat: 'shorts', gender: 'UNISEX', type: 'shorts', price: 140, colors: ['Black', 'Sky', 'Cream'], sizes: ALL, material: 'Cotton terry', desc: 'Knee-length lounge shorts with a deep waistband.' },
  { name: 'Sunday Midi Dress', cat: 'dresses', gender: 'WOMEN', type: 'dress', price: 310, was: 360, badge: 'Limited', featured: true, colors: ['Brick Red', 'Cream', 'Forest'], sizes: ['XS', 'S', 'M', 'L', 'XL'], material: 'Soft viscose blend', desc: 'A flowing A-line midi with short sleeves that moves with you.' },
  { name: 'Pleated Skirt', cat: 'dresses', gender: 'WOMEN', type: 'skirt', price: 190, colors: ['Black', 'Sand', 'Navy'], sizes: ['XS', 'S', 'M', 'L', 'XL'], material: 'Crease-resistant poly crepe', desc: 'Knife pleats that stay sharp from morning to night.' },
  { name: 'Comfort Dad Cap', cat: 'caps', gender: 'UNISEX', type: 'cap', price: 85, colors: ['Black', 'Sand', 'Navy', 'Brick Red'], sizes: ['M'], material: 'Washed cotton twill', desc: 'A soft, unstructured six-panel cap with an adjustable strap.' },
  { name: 'Studio Zip Hoodie', cat: 'hoodies', gender: 'WOMEN', type: 'hoodie', price: 340, badge: 'New', colors: ['Sky', 'Cream', 'Charcoal'], sizes: ['XS', 'S', 'M', 'L', 'XL'], material: '360gsm cotton fleece', desc: 'A cropped-length zip hoodie with a clean, fitted shape.' },
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
  for (const old of ['admin@splendor.com', 'admin@comfortfit.gh']) {
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
    await prisma.category.upsert({ where: { slug: s }, update: {}, create: { name, slug: s, displayOrder: i + 1, description: `${name} by Comfort_fit GH` } });
  }
  await prisma.category.updateMany({ where: { slug: { in: ['tops', 'bottoms', 'accessories'] }, products: { none: {} } }, data: { isActive: false } });

  for (const [i, [name, displayName]] of SIZES.entries()) {
    await prisma.size.upsert({ where: { name }, update: { sortOrder: i + 1 }, create: { name, displayName, sortOrder: i + 1 } });
  }
  for (const [name, hexCode] of COLORS) {
    await prisma.color.upsert({ where: { name }, update: { hexCode }, create: { name, hexCode } });
  }

  const settings: Record<string, string> = {
    store_name: 'Comfort_fit GH', shipping_fee: '20', free_shipping_threshold: '500', hero_autoplay_ms: '4000',
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
        { line1: 'Shop', line2: 'New season', line3: '2026', line4: null, tagline: 'The Future Wears Comfort.', subtitle: 'Step into a world where softness meets strength.', garment: 'hoodie', garmentColor: '#d9dce3', bgFrom: '#1b2540', bgTo: '#0b1220', ctaLabel: 'Shop the collection', ctaHref: '/products', imageUrl: '/photos/banner-shop.jpg', displayOrder: 0 },
        { line1: 'Wholesale', line2: 'For business', line3: null, line4: null, tagline: 'Bulk orders and custom branding for your business.', subtitle: 'Outfit your team, shop or event with premium comfort wear at trade prices.', garment: 'hoodie', garmentColor: '#3a3d45', bgFrom: '#1b2540', bgTo: '#0b1220', ctaLabel: 'Request a bulk order', ctaHref: '/about#business', imageUrl: '/photos/banner-rack.jpg', displayOrder: 1 },
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
        images: { create: ['front', 'back', 'detail', 'studio'].map((v, i) => ({ imageUrl: `svg:${v}`, displayOrder: i, isPrimary: i === 0, altText: `${d.name} ${v} view` })) },
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
    const stocks = created.map((v) => ({ variantId: v.id, quantity: Math.floor(Math.random() * 18) + 2, lowStockThreshold: 5 }));
    await prisma.inventory.createMany({ data: stocks });
    const invs = await prisma.inventory.findMany({ where: { variantId: { in: created.map((v) => v.id) } }, select: { id: true, quantity: true } });
    await prisma.inventoryTransaction.createMany({ data: invs.map((i) => ({ inventoryId: i.id, quantity: i.quantity, type: 'INITIAL' as const, reason: 'Seed data' })) });
    console.log('Created product:', d.name);
  }

  /* ── real photographs for the demo products (public/photos, see docs/PHOTO-CREDITS.md) ── */
  for (const d of DEMO) {
    const s = slug(d.name);
    const product = await prisma.product.findUnique({ where: { slug: s }, include: { images: true } });
    if (!product || product.images.some((i) => i.imageUrl.startsWith('/photos/'))) continue;
    await prisma.productImage.deleteMany({ where: { productId: product.id, imageUrl: { startsWith: 'svg:' } } });
    await prisma.productImage.createMany({
      data: [1, 2, 3, 4].map((n) => ({ productId: product.id, imageUrl: `/photos/${s}-${n}.jpg`, altText: `${d.name} photo ${n}`, displayOrder: n - 1, isPrimary: n === 1 })),
    });
    console.log('Photos attached:', d.name);
  }
  console.log('Seed complete');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
