import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export interface DiscountResult {
  code: string;
  amount: number;
  discountId: string;
}

export class DiscountError extends Error {}

export class DiscountService {
  /** Validates a code against a subtotal. Throws DiscountError with a friendly message. */
  static async validate(rawCode: string, subtotal: number): Promise<DiscountResult> {
    const code = rawCode.trim().toUpperCase();
    const d = await prisma.discount.findUnique({ where: { code } });
    const now = new Date();
    if (!d || !d.isActive) throw new DiscountError('That promo code is not valid');
    if (d.validFrom > now) throw new DiscountError('That promo code is not active yet');
    if (d.validUntil && d.validUntil < now) throw new DiscountError('That promo code has expired');
    if (d.maxUses != null && d.usedCount >= d.maxUses) throw new DiscountError('That promo code has been fully redeemed');
    if (d.minOrderAmount && subtotal < Number(d.minOrderAmount)) {
      throw new DiscountError(`Spend GHS ${Number(d.minOrderAmount)} or more to use this code`);
    }
    const raw = d.type === 'PERCENTAGE' ? (subtotal * Number(d.value)) / 100 : Number(d.value);
    const amount = Math.min(subtotal, Math.round(raw * 100) / 100);
    return { code: d.code, amount, discountId: d.id };
  }

  static list() {
    return prisma.discount.findMany({ orderBy: { createdAt: 'desc' } });
  }

  static async consume(tx: Prisma.TransactionClient, discountId: string, orderId: string, amount: number) {
    // Atomic guard against exceeding maxUses under concurrency.
    const updated = await tx.$executeRaw`
      UPDATE "Discount" SET "usedCount" = "usedCount" + 1
      WHERE id = ${discountId} AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`;
    if (updated === 0) throw new DiscountError('That promo code has been fully redeemed');
    await tx.discountUsage.create({ data: { discountId, orderId, amount } });
  }
}
