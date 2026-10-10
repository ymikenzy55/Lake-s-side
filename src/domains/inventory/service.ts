import { prisma } from '@/lib/db';
import { TransactionType } from '@prisma/client';

export interface InventoryAdjustment {
  variantId: string;
  quantity: number;
  type: TransactionType;
  reason: string;
  referenceId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface StockCheckResult {
  available: boolean;
  availableQuantity: number;
  requestedQuantity: number;
  isLowStock: boolean;
  lowStockThreshold: number;
}

export class InventoryService {
  /**
   * Get inventory for a variant
   */
  static async getInventory(variantId: string) {
    return await prisma.inventory.findUnique({
      where: { variantId },
      include: {
        variant: {
          include: {
            product: true,
            size: true,
            color: true,
          },
        },
      },
    });
  }

  /**
   * Get available quantity for a variant
   */
  static async getAvailableQuantity(variantId: string): Promise<number> {
    const inventory = await prisma.inventory.findUnique({
      where: { variantId },
      select: {
        quantity: true,
        reservedQuantity: true,
      },
    });

    if (!inventory) {
      return 0;
    }

    return Math.max(0, inventory.quantity - inventory.reservedQuantity);
  }

  /**
   * Check if stock is available for a variant
   */
  static async checkStock(
    variantId: string,
    requestedQuantity: number
  ): Promise<StockCheckResult> {
    const inventory = await prisma.inventory.findUnique({
      where: { variantId },
      select: {
        quantity: true,
        reservedQuantity: true,
        lowStockThreshold: true,
      },
    });

    if (!inventory) {
      return {
        available: false,
        availableQuantity: 0,
        requestedQuantity,
        isLowStock: false,
        lowStockThreshold: 5,
      };
    }

    const availableQuantity = inventory.quantity - inventory.reservedQuantity;
    const available = availableQuantity >= requestedQuantity;
    const isLowStock = availableQuantity <= inventory.lowStockThreshold;

    return {
      available,
      availableQuantity,
      requestedQuantity,
      isLowStock,
      lowStockThreshold: inventory.lowStockThreshold,
    };
  }

  /**
   * Reserve stock for a variant (during checkout)
   */
  static async reserveStock(variantId: string, quantity: number): Promise<void> {
    // Check if stock is available
    const stockCheck = await this.checkStock(variantId, quantity);
    if (!stockCheck.available) {
      throw new Error(
        `Insufficient stock. Available: ${stockCheck.availableQuantity}, Requested: ${quantity}`
      );
    }

    // Reserve the stock
    await prisma.inventory.update({
      where: { variantId },
      data: {
        reservedQuantity: {
          increment: quantity,
        },
      },
    });
  }

  /**
   * Release reserved stock (if checkout is cancelled)
   */
  static async releaseReservedStock(variantId: string, quantity: number): Promise<void> {
    await prisma.inventory.update({
      where: { variantId },
      data: {
        reservedQuantity: {
          decrement: quantity,
        },
      },
    });
  }

  /**
   * Finalize stock reduction (after successful payment)
   */
  static async finalizeStockReduction(
    variantId: string,
    quantity: number,
    orderId: string
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Reduce both actual and reserved quantities
      const inventory = await tx.inventory.update({
        where: { variantId },
        data: {
          quantity: {
            decrement: quantity,
          },
          reservedQuantity: {
            decrement: quantity,
          },
        },
      });

      // Record transaction
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inventory.id,
          quantity: -quantity,
          type: 'PURCHASE',
          reason: 'Order completed',
          referenceId: orderId,
          metadata: {
            orderId,
          },
        },
      });
    });
  }

  /**
   * Adjust inventory (admin only)
   */
  static async adjustInventory(adjustment: InventoryAdjustment): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Update inventory quantity
      const inventory = await tx.inventory.update({
        where: { variantId: adjustment.variantId },
        data: {
          quantity: {
            increment: adjustment.quantity,
          },
        },
      });

      // Record transaction
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inventory.id,
          quantity: adjustment.quantity,
          type: adjustment.type,
          reason: adjustment.reason,
          referenceId: adjustment.referenceId,
          metadata: adjustment.metadata,
        },
      });
    });
  }

  /**
   * Set inventory quantity directly (admin only)
   */
  static async setInventoryQuantity(
    variantId: string,
    newQuantity: number,
    reason: string
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Get current quantity
      const currentInventory = await tx.inventory.findUnique({
        where: { variantId },
        select: { quantity: true, id: true },
      });

      if (!currentInventory) {
        throw new Error('Inventory not found');
      }

      const difference = newQuantity - currentInventory.quantity;

      // Update inventory
      await tx.inventory.update({
        where: { variantId },
        data: { quantity: newQuantity },
      });

      // Record transaction
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: currentInventory.id,
          quantity: difference,
          type: 'ADJUSTMENT',
          reason,
        },
      });
    });
  }

  /**
   * Get inventory transaction history
   */
  static async getTransactionHistory(
    variantId: string,
    limit: number = 50
  ) {
    const inventory = await prisma.inventory.findUnique({
      where: { variantId },
      select: { id: true },
    });

    if (!inventory) {
      return [];
    }

    return await prisma.inventoryTransaction.findMany({
      where: { inventoryId: inventory.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get low stock variants
   */
  static async getLowStockVariants() {
    return await prisma.inventory.findMany({
      where: {
        quantity: {
          lte: prisma.inventory.fields.lowStockThreshold,
        },
        variant: {
          isActive: true,
          product: {
            isActive: true,
          },
        },
      },
      include: {
        variant: {
          include: {
            product: true,
            size: true,
            color: true,
          },
        },
      },
      orderBy: {
        quantity: 'asc',
      },
    });
  }

  /**
   * Get out of stock variants
   */
  static async getOutOfStockVariants() {
    return await prisma.inventory.findMany({
      where: {
        quantity: {
          lte: 0,
        },
        variant: {
          isActive: true,
          product: {
            isActive: true,
          },
        },
      },
      include: {
        variant: {
          include: {
            product: true,
            size: true,
            color: true,
          },
        },
      },
    });
  }

  /**
   * Update low stock threshold
   */
  static async updateLowStockThreshold(
    variantId: string,
    threshold: number
  ): Promise<void> {
    await prisma.inventory.update({
      where: { variantId },
      data: { lowStockThreshold: threshold },
    });
  }

  /**
   * Process return (increase stock)
   */
  static async processReturn(
    variantId: string,
    quantity: number,
    orderId: string,
    reason: string
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Increase inventory
      const inventory = await tx.inventory.update({
        where: { variantId },
        data: {
          quantity: {
            increment: quantity,
          },
        },
      });

      // Record transaction
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inventory.id,
          quantity: quantity,
          type: 'RETURN',
          reason,
          referenceId: orderId,
          metadata: {
            orderId,
          },
        },
      });
    });
  }

  /**
   * Record damaged items
   */
  static async recordDamage(
    variantId: string,
    quantity: number,
    reason: string
  ): Promise<void> {
    await this.adjustInventory({
      variantId,
      quantity: -quantity,
      type: 'DAMAGE',
      reason,
    });
  }

  /**
   * Get inventory summary statistics
   */
  static async getInventorySummary() {
    const [
      totalVariants,
      lowStockCount,
      outOfStockCount,
      totalValue,
    ] = await Promise.all([
      prisma.inventory.count({
        where: {
          variant: {
            isActive: true,
            product: {
              isActive: true,
            },
          },
        },
      }),
      prisma.inventory.count({
        where: {
          quantity: {
            lte: prisma.inventory.fields.lowStockThreshold,
            gt: 0,
          },
          variant: {
            isActive: true,
            product: {
              isActive: true,
            },
          },
        },
      }),
      prisma.inventory.count({
        where: {
          quantity: {
            lte: 0,
          },
          variant: {
            isActive: true,
            product: {
              isActive: true,
            },
          },
        },
      }),
      prisma.$queryRaw<{ total: number | null }[]>`
        SELECT SUM(i."quantity" * v."price")::float AS total
        FROM "Inventory" i
        JOIN "ProductVariant" v ON v.id = i."variantId"
        JOIN "Product" p ON p.id = v."productId"
        WHERE v."isActive" = true AND p."isActive" = true`.then((r) => r[0]?.total ?? 0),
    ]);

    return {
      totalVariants,
      lowStockCount,
      outOfStockCount,
      totalValue,
    };
  }
}
