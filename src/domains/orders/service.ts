import { prisma } from '@/lib/db';
import { Prisma, type OrderStatus, type PaymentMethod } from '@prisma/client';
import { CartService } from '@/domains/cart/service';
import { DiscountService, DiscountError } from '@/domains/discounts/service';
import { generateOrderNumber } from '@/lib/utils';
import { sendOrderEmail } from '@/domains/notifications/service';
import { publish, adminChannel, orderChannel } from '@/lib/realtime';

/** Error whose message is safe to show the shopper. */
export class OrderError extends Error {}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  region: string;
  city: string;
  area?: string;
  streetAddress?: string;
  landmark?: string;
}

export interface PlaceOrderInput {
  userId?: string;
  email: string;
  name: string;
  phone: string;
  address: ShippingAddress;
  paymentMethod: PaymentMethod;
  discountCode?: string;
  notes?: string;
}

const orderInclude = {
  items: true,
  payment: true,
} satisfies Prisma.OrderInclude;

type Tx = Prisma.TransactionClient;

/** Allowed manual status moves (admin). */
export const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export class OrderService {
  /**
   * Creates an order from the shopper's bag. Prices and stock are always read from
   * the database (never trusted from the client); stock is reserved atomically.
   */
  static async placeOrder(input: PlaceOrderInput) {
    const cart = await CartService.getCartView(input.userId);
    if (cart.items.length === 0) throw new OrderError('Your bag is empty');

    for (const it of cart.items) {
      if (!it.active) throw new OrderError(`${it.name} is no longer available. Please remove it from your bag.`);
      if (it.stock < it.quantity) {
        throw new OrderError(it.stock === 0 ? `${it.name} (${it.size}, ${it.color}) just sold out` : `Only ${it.stock} of ${it.name} (${it.size}, ${it.color}) left`);
      }
    }

    let discount: { code: string; amount: number; discountId: string } | null = null;
    if (input.discountCode?.trim()) {
      try {
        discount = await DiscountService.validate(input.discountCode, cart.subtotal);
      } catch (e) {
        if (e instanceof DiscountError) throw new OrderError(e.message);
        throw e;
      }
    }

    const discountAmount = discount?.amount ?? 0;
    const total = Math.max(0, cart.subtotal - discountAmount + cart.shipping);
    const cartId = await CartService.getOrCreateCart(input.userId);

    const n = cart.items.length;
    const ids = cart.items.map((i) => i.variantId);
    const qtys = cart.items.map((i) => i.quantity);
    const names = cart.items.map((i) => i.name);
    const variantNames = cart.items.map((i) => `${i.size} / ${i.color}`);
    const images = cart.items.map((i) => i.imageUrl ?? '');
    const prices = cart.items.map((i) => i.price);
    const email = input.email.toLowerCase();
    const address = JSON.stringify(input.address);
    const provider = input.paymentMethod === 'PAYSTACK' ? 'paystack' : 'cash';

    for (let attempt = 0; ; attempt++) {
      const orderNumber = generateOrderNumber();
      const orderId = crypto.randomUUID();
      const reference = input.paymentMethod === 'PAYSTACK' ? orderNumber : null;
      try {
        /*
         * ONE statement, ONE database round trip (the DB is remote: each trip costs 200-800ms).
         * It atomically: reserves stock for every line, consumes the promo code, creates the order,
         * its items and its payment, and empties the bag. If any line is short on stock the guard
         * divides by zero and Postgres rolls the WHOLE statement back (nothing is reserved/created).
         */
        await prisma.$queryRaw`
          WITH reserve AS (
            UPDATE "Inventory" i SET "reservedQuantity" = i."reservedQuantity" + t.q
            FROM (SELECT unnest(${ids}::text[]) AS v, unnest(${qtys}::int[]) AS q) t
            WHERE i."variantId" = t.v AND i.quantity - i."reservedQuantity" >= t.q
            RETURNING 1
          ),
          stock_guard AS (SELECT 1 / (CASE WHEN (SELECT count(*) FROM reserve) = ${n}::int THEN 1 ELSE 0 END) AS ok),
          disc AS (
            UPDATE "Discount" SET "usedCount" = "usedCount" + 1
            WHERE id = ${discount?.discountId ?? null}::text AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
            RETURNING id
          ),
          promo_guard AS (SELECT CAST(CASE WHEN ${discount?.discountId ?? null}::text IS NULL OR EXISTS (SELECT 1 FROM disc) THEN '1' ELSE 'promo-exhausted' END AS int) AS ok),
          ord AS (
            INSERT INTO "Order" (id, "orderNumber", "userId", "customerEmail", "customerName", "customerPhone", "shippingAddress",
                                 subtotal, "shippingFee", "discountAmount", "discountCode", "totalAmount", "paymentMethod", notes, "updatedAt")
            SELECT ${orderId}, ${orderNumber}, ${input.userId ?? null}::text, ${email}, ${input.name}, ${input.phone}, ${address}::jsonb,
                   ${cart.subtotal}::numeric, ${cart.shipping}::numeric, ${discountAmount}::numeric, ${discount?.code ?? null}::text, ${total}::numeric,
                   ${input.paymentMethod}::"PaymentMethod", ${input.notes || null}::text, now()
            FROM stock_guard, promo_guard
            RETURNING id
          ),
          oi AS (
            INSERT INTO "OrderItem" (id, "orderId", "variantId", "productName", "variantName", "imageUrl", price, quantity)
            SELECT gen_random_uuid()::text, ${orderId}, t.v, t.pn, t.vn, NULLIF(t.img, ''), t.pr, t.q
            FROM unnest(${ids}::text[], ${names}::text[], ${variantNames}::text[], ${images}::text[], ${prices}::numeric[], ${qtys}::int[]) AS t(v, pn, vn, img, pr, q)
            WHERE EXISTS (SELECT 1 FROM ord)
            RETURNING 1
          ),
          pay AS (
            INSERT INTO "Payment" (id, "orderId", amount, provider, "providerReference", "updatedAt")
            SELECT gen_random_uuid()::text, ${orderId}, ${total}::numeric, ${provider}, ${reference}::text, now()
            WHERE EXISTS (SELECT 1 FROM ord)
            RETURNING 1
          ),
          usage AS (
            INSERT INTO "DiscountUsage" (id, "discountId", "orderId", amount)
            SELECT gen_random_uuid()::text, ${discount?.discountId ?? null}::text, ${orderId}, ${discountAmount}::numeric
            WHERE ${discount?.discountId ?? null}::text IS NOT NULL AND EXISTS (SELECT 1 FROM ord)
            RETURNING 1
          ),
          clear AS (
            DELETE FROM "CartItem" WHERE "cartId" = ${cartId} AND EXISTS (SELECT 1 FROM ord)
            RETURNING 1
          )
          SELECT (SELECT id FROM ord) AS id, (SELECT count(*) FROM oi) AS items, (SELECT count(*) FROM pay) AS pay, (SELECT count(*) FROM clear) AS cleared`;

        void sendOrderEmail(orderId, 'ORDER_CONFIRMATION');
        publish(adminChannel, { type: 'order.created', orderNumber, total, customer: input.name, at: Date.now() });
        void announceLowStock(orderId);
        return { id: orderId, orderNumber, customerEmail: email, customerName: input.name, totalAmount: total };
      } catch (e) {
        const msg = String((e as Error).message ?? '');
        if (/division by zero/i.test(msg)) throw new OrderError('Some items just sold out. Please review your cart.');
        if (/promo-exhausted/i.test(msg)) throw new OrderError('That promo code has just been fully redeemed.');
        // astronomically rare order-number collision: retry with a fresh number
        if (/duplicate key|unique constraint/i.test(msg) && attempt < 3) continue;
        throw e;
      }
    }
  }

  /** Push the latest status to the admin feed and to anyone watching this order. */
  static async broadcast(orderId: string): Promise<void> {
    try {
      const o = await prisma.order.findUnique({ where: { id: orderId }, select: { orderNumber: true, status: true, paymentStatus: true } });
      if (!o) return;
      const evt = { type: 'order.updated' as const, orderNumber: o.orderNumber, status: o.status, paymentStatus: o.paymentStatus, at: Date.now() };
      publish(adminChannel, evt);
      publish(orderChannel(o.orderNumber), evt);
    } catch {
      /* realtime is best-effort */
    }
  }

  /** Idempotent: safe to call from both the redirect callback and the webhook. */
  static async markPaid(orderId: string, providerPayload?: unknown) {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) throw new OrderError('Order not found');
      if (order.paymentStatus === 'PAID') return { order, changed: false };
      if (order.status === 'CANCELLED') throw new OrderError('This order was cancelled');

      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'PAID', paidAt: new Date(), status: order.status === 'PENDING' ? 'PROCESSING' : order.status },
      });
      await tx.payment.update({
        where: { orderId },
        data: { status: 'PAID', verifiedAt: new Date(), providerResponse: (providerPayload as Prisma.InputJsonValue) ?? undefined },
      });
      await this.finalizeStock(tx, order);
      return { order, changed: true };
    });

    if (result.changed) {
      void sendOrderEmail(orderId, 'PAYMENT_CONFIRMATION');
      void this.broadcast(orderId);
    }
    return result.order;
  }

  static async markPaymentFailed(orderId: string, reason: string) {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order || order.paymentStatus !== 'PENDING') return;
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus: 'FAILED', status: 'CANCELLED' } });
      await tx.payment.update({ where: { orderId }, data: { status: 'FAILED', failureReason: reason.slice(0, 250) } });
      await this.releaseReservation(tx, order);
    });
    void this.broadcast(orderId);
  }

  /** Admin status transition with stock side-effects. */
  static async updateStatus(orderId: string, next: OrderStatus, actorId?: string) {
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) throw new OrderError('Order not found');
      if (!STATUS_FLOW[order.status].includes(next)) throw new OrderError(`Cannot move an order from ${order.status} to ${next}`);

      const data: Prisma.OrderUpdateInput = { status: next };

      if (next === 'PROCESSING' && !order.stockFinalized) await this.finalizeStock(tx, order);

      if (next === 'DELIVERED' && order.paymentMethod === 'CASH_ON_DELIVERY' && order.paymentStatus !== 'PAID') {
        data.paymentStatus = 'PAID';
        data.paidAt = new Date();
        await tx.payment.update({ where: { orderId }, data: { status: 'PAID', verifiedAt: new Date() } });
      }

      if (next === 'CANCELLED') {
        if (order.stockFinalized) await this.restock(tx, order, 'Order cancelled');
        else await this.releaseReservation(tx, order);
        if (order.paymentStatus === 'PENDING') data.paymentStatus = 'FAILED';
      }

      if (next === 'REFUNDED') {
        await this.restock(tx, order, 'Order refunded');
        data.paymentStatus = 'REFUNDED';
        await tx.payment.update({ where: { orderId }, data: { status: 'REFUNDED' } });
      }

      await tx.auditLog.create({
        data: { userId: actorId ?? null, action: 'ORDER_STATUS', entityType: 'Order', entityId: orderId, changes: { from: order.status, to: next } },
      });
      return tx.order.update({ where: { id: orderId }, data });
    });

    const type = ({ PROCESSING: 'ORDER_PROCESSING', OUT_FOR_DELIVERY: 'ORDER_SHIPPED', DELIVERED: 'ORDER_DELIVERED', CANCELLED: 'ORDER_CANCELLED' } as const)[next as 'PROCESSING'];
    if (type) void sendOrderEmail(orderId, type);
    void this.broadcast(orderId);
    return updated;
  }

  /* ───────── stock helpers (all run inside the caller's transaction) ───────── */

  private static async finalizeStock(tx: Tx, order: { id: string; stockFinalized: boolean; items: { variantId: string; quantity: number }[] }) {
    if (order.stockFinalized) return;
    for (const it of order.items) {
      const inv = await tx.inventory.update({
        where: { variantId: it.variantId },
        data: { quantity: { decrement: it.quantity }, reservedQuantity: { decrement: it.quantity } },
      });
      await tx.inventoryTransaction.create({
        data: { inventoryId: inv.id, quantity: -it.quantity, type: 'PURCHASE', reason: 'Order confirmed', referenceId: order.id },
      });
    }
    await tx.order.update({ where: { id: order.id }, data: { stockFinalized: true } });
  }

  private static async releaseReservation(tx: Tx, order: { items: { variantId: string; quantity: number }[]; stockFinalized: boolean }) {
    if (order.stockFinalized) return;
    for (const it of order.items) {
      await tx.$executeRaw`UPDATE "Inventory" SET "reservedQuantity" = GREATEST(0, "reservedQuantity" - ${it.quantity}) WHERE "variantId" = ${it.variantId}`;
    }
  }

  private static async restock(tx: Tx, order: { id: string; items: { variantId: string; quantity: number }[] }, reason: string) {
    for (const it of order.items) {
      const inv = await tx.inventory.update({ where: { variantId: it.variantId }, data: { quantity: { increment: it.quantity } } });
      await tx.inventoryTransaction.create({
        data: { inventoryId: inv.id, quantity: it.quantity, type: 'RETURN', reason, referenceId: order.id },
      });
    }
    await tx.order.update({ where: { id: order.id }, data: { stockFinalized: false } });
  }

  /* ───────── queries ───────── */

  static getByNumber(orderNumber: string) {
    return prisma.order.findUnique({ where: { orderNumber }, relationLoadStrategy: 'join', include: orderInclude });
  }

  /** Guest tracking requires BOTH order number and the email used at checkout. */
  static async track(orderNumber: string, email: string) {
    const order = await prisma.order.findUnique({ where: { orderNumber: orderNumber.trim().toUpperCase() }, include: orderInclude });
    if (!order || order.customerEmail !== email.trim().toLowerCase()) return null;
    return order;
  }

  static listForUser(userId: string) {
    return prisma.order.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { items: true }, take: 50 });
  }

  /** Releases reservations for unpaid card orders abandoned for 1h+ (call from cron / admin). */
  static async expireStaleOrders(olderThanMinutes = 60) {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
    const stale = await prisma.order.findMany({
      where: { paymentMethod: 'PAYSTACK', paymentStatus: 'PENDING', status: 'PENDING', createdAt: { lt: cutoff } },
      select: { id: true },
      take: 100,
    });
    for (const o of stale) await this.markPaymentFailed(o.id, 'Payment window expired');
    return stale.length;
  }
}

/** After an order reserves stock, tell admins about any variant that is now low or sold out. */
async function announceLowStock(orderId: string): Promise<void> {
  try {
    const rows = await prisma.$queryRaw<{ name: string; left: number }[]>`
      SELECT p.name || ' (' || sz.name || ', ' || cl.name || ')' AS name, GREATEST(0, i.quantity - i."reservedQuantity")::int AS "left"
      FROM "OrderItem" oi
      JOIN "Inventory" i ON i."variantId" = oi."variantId"
      JOIN "ProductVariant" v ON v.id = oi."variantId"
      JOIN "Product" p ON p.id = v."productId"
      JOIN "Size" sz ON sz.id = v."sizeId"
      JOIN "Color" cl ON cl.id = v."colorId"
      WHERE oi."orderId" = ${orderId} AND i.quantity - i."reservedQuantity" <= i."lowStockThreshold"`;
    if (rows.length) publish(adminChannel, { type: 'stock.low', items: rows, at: Date.now() });
  } catch (e) {
    console.error('low-stock check failed', e);
  }
}
