import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { getSettings, num } from '@/domains/settings/service';
import { GUEST_CART_DURATION, MAX_CART_QUANTITY, COOKIE_SECURE } from '@/lib/constants';
import { randomToken } from '@/lib/security/tokens';
import { TtlCache } from '@/lib/cache';

const GUEST_CART_COOKIE = 'cf_cart';

/** Cart ids are stable, so remember them to skip a lookup round trip on every action. */
const cartIdCache = new TtlCache<string>(10 * 60_000, 5000);

export interface CartViewItem {
  id: string;
  variantId: string;
  quantity: number;
  name: string;
  slug: string;
  garmentType: string;
  imageUrl: string | null;
  price: number;
  comparePrice: number | null;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
  active: boolean;
}

export interface CartView {
  items: CartViewItem[];
  itemCount: number;
  subtotal: number;
  shipping: number;
  total: number;
  freeShippingThreshold: number;
  /** delivery fee when below the free-shipping threshold (lets the UI recompute totals instantly) */
  baseShipping: number;
}

/** User-facing cart error (safe to show). */
export class CartError extends Error {}

async function guestSessionId(create: boolean): Promise<string | null> {
  const jar = await cookies();
  let sid = jar.get(GUEST_CART_COOKIE)?.value ?? null;
  if (!sid && create) {
    sid = randomToken(32);
    jar.set(GUEST_CART_COOKIE, sid, { httpOnly: true, secure: COOKIE_SECURE, sameSite: 'lax', maxAge: GUEST_CART_DURATION / 1000, path: '/' });
  }
  return sid;
}

export class CartService {
  /** Resolve (and lazily create) the cart id: memoised, otherwise a single upsert. */
  static async getOrCreateCart(userId?: string): Promise<string> {
    if (userId) {
      const key = `u:${userId}`;
      const hit = cartIdCache.get(key);
      if (hit) return hit;
      const cart = await prisma.cart.upsert({ where: { userId }, update: {}, create: { userId }, select: { id: true } });
      cartIdCache.set(key, cart.id);
      return cart.id;
    }
    const sid = (await guestSessionId(true))!;
    const key = `s:${sid}`;
    const hit = cartIdCache.get(key);
    if (hit) return hit;
    const cart = await prisma.cart.upsert({ where: { sessionId: sid }, update: {}, create: { sessionId: sid }, select: { id: true } });
    cartIdCache.set(key, cart.id);
    return cart.id;
  }

  /** Where-clause for "my cart" that needs no id lookup, or null when the visitor has none. */
  private static async ownerFilter(userId?: string): Promise<{ userId: string } | { sessionId: string } | null> {
    if (userId) return { userId };
    const sid = await guestSessionId(false);
    return sid ? { sessionId: sid } : null;
  }

  /** Read-only item count (one query, no cookie writes). */
  static async peekCartCount(userId?: string): Promise<number> {
    const owner = await this.ownerFilter(userId);
    if (!owner) return 0;
    const r = await prisma.cartItem.aggregate({ where: { cart: owner }, _sum: { quantity: true } });
    return r._sum.quantity ?? 0;
  }

  /** Plain, serialisable cart for the UI. One joined query plus (cached) settings. */
  static async getCartView(userId?: string): Promise<CartView> {
    const owner = await this.ownerFilter(userId);
    const [rows, settings] = await Promise.all([
      owner
        ? prisma.cartItem.findMany({
            where: { cart: owner },
            relationLoadStrategy: 'join',
            orderBy: { createdAt: 'desc' },
            include: {
              variant: {
                include: {
                  product: { select: { name: true, slug: true, garmentType: true, isActive: true, images: { orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }], select: { imageUrl: true, colorId: true } } } },
                  size: { select: { name: true } },
                  color: { select: { name: true, hexCode: true } },
                  inventory: { select: { quantity: true, reservedQuantity: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
      getSettings(),
    ]);

    const items: CartViewItem[] = rows.map((it) => {
      const v = it.variant;
      const img = v.product.images.find((im) => !im.colorId || im.colorId === v.colorId) ?? v.product.images[0];
      return {
        id: it.id,
        variantId: v.id,
        quantity: it.quantity,
        name: v.product.name,
        slug: v.product.slug,
        garmentType: v.product.garmentType,
        imageUrl: img?.imageUrl ?? null,
        price: Number(v.price),
        comparePrice: v.comparePrice ? Number(v.comparePrice) : null,
        size: v.size.name,
        color: v.color.name,
        colorHex: v.color.hexCode ?? '#111111',
        stock: Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0)),
        active: v.isActive && v.product.isActive,
      };
    });
    const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0);
    const threshold = num(settings.free_shipping_threshold, 500);
    const fee = num(settings.shipping_fee, 20);
    const shipping = items.length === 0 || subtotal >= threshold ? 0 : fee;
    return { items, itemCount: items.reduce((n, i) => n + i.quantity, 0), subtotal, shipping, total: subtotal + shipping, freeShippingThreshold: threshold, baseShipping: fee };
  }

  /** Explain why an add/update matched no rows (only runs on the failure path). */
  private static async diagnose(variantId: string, wanted: number): Promise<never> {
    const v = await prisma.productVariant.findUnique({
      where: { id: variantId },
      relationLoadStrategy: 'join',
      select: { isActive: true, product: { select: { isActive: true } }, inventory: { select: { quantity: true, reservedQuantity: true } } },
    });
    if (!v || !v.isActive || !v.product.isActive) throw new CartError('This item is no longer available');
    const available = Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0));
    if (wanted > MAX_CART_QUANTITY) throw new CartError(`You can add at most ${MAX_CART_QUANTITY} of an item`);
    throw new CartError(available === 0 ? 'Sorry, that size is sold out' : `Only ${available} available in stock`);
  }

  /**
   * Add to cart in ONE statement: validates the variant, stock (including what is already in the
   * bag) and the per-item cap, then inserts or increments atomically.
   */
  static async addToCart(variantId: string, quantity: number, userId?: string): Promise<void> {
    const cartId = await this.getOrCreateCart(userId);
    const rows = await prisma.$queryRaw<{ quantity: number }[]>`
      INSERT INTO "CartItem" (id, "cartId", "variantId", quantity, "createdAt", "updatedAt")
      SELECT gen_random_uuid()::text, ${cartId}, pv.id, ${quantity}::int, now(), now()
      FROM "ProductVariant" pv
      JOIN "Product" p ON p.id = pv."productId" AND p."isActive" = true
      JOIN "Inventory" i ON i."variantId" = pv.id
      WHERE pv.id = ${variantId} AND pv."isActive" = true
        AND ${quantity}::int + COALESCE((SELECT ci.quantity FROM "CartItem" ci WHERE ci."cartId" = ${cartId} AND ci."variantId" = ${variantId}), 0) <= ${MAX_CART_QUANTITY}::int
        AND i.quantity - i."reservedQuantity" >= ${quantity}::int + COALESCE((SELECT ci.quantity FROM "CartItem" ci WHERE ci."cartId" = ${cartId} AND ci."variantId" = ${variantId}), 0)
      ON CONFLICT ("cartId", "variantId") DO UPDATE SET quantity = "CartItem".quantity + EXCLUDED.quantity, "updatedAt" = now()
      RETURNING quantity`;
    if (rows.length === 0) await this.diagnose(variantId, quantity);
  }

  /** Set an item's quantity in one statement (stock + cap checked in SQL). */
  static async updateCartItem(itemId: string, quantity: number, userId?: string): Promise<void> {
    const cartId = await this.getOrCreateCart(userId);
    const updated = await prisma.$executeRaw`
      UPDATE "CartItem" ci SET quantity = ${quantity}::int, "updatedAt" = now()
      FROM "Inventory" i
      WHERE ci.id = ${itemId} AND ci."cartId" = ${cartId} AND i."variantId" = ci."variantId"
        AND ${quantity}::int <= ${MAX_CART_QUANTITY}::int AND i.quantity - i."reservedQuantity" >= ${quantity}::int`;
    if (updated > 0) return;
    const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId }, select: { variantId: true } });
    if (!item) throw new CartError('That item is no longer in your cart');
    await this.diagnose(item.variantId, quantity);
  }

  static async removeFromCart(itemId: string, userId?: string): Promise<void> {
    const cartId = await this.getOrCreateCart(userId);
    await prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
  }

  static async clearCart(userId?: string): Promise<void> {
    const cartId = await this.getOrCreateCart(userId);
    await prisma.cartItem.deleteMany({ where: { cartId } });
  }

  /** Merge the guest cart into the user's cart after login (single set-based statement). */
  static async mergeGuestCart(userId: string): Promise<void> {
    const sid = await guestSessionId(false);
    if (!sid) return;
    const guest = await prisma.cart.findUnique({ where: { sessionId: sid }, select: { id: true } });
    if (!guest) return;
    const userCartId = await this.getOrCreateCart(userId);

    await prisma.$executeRaw`
      INSERT INTO "CartItem" (id, "cartId", "variantId", quantity, "createdAt", "updatedAt")
      SELECT gen_random_uuid()::text, ${userCartId}, g."variantId", g.quantity, now(), now()
      FROM "CartItem" g WHERE g."cartId" = ${guest.id}
      ON CONFLICT ("cartId", "variantId") DO UPDATE SET quantity = LEAST("CartItem".quantity + EXCLUDED.quantity, ${MAX_CART_QUANTITY}::int), "updatedAt" = now()`;
    await prisma.cart.delete({ where: { id: guest.id } });
    cartIdCache.delete(`s:${sid}`);
    (await cookies()).delete(GUEST_CART_COOKIE);
  }
}
