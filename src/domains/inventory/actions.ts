'use server';

import { InventoryService } from './service';
import { requireAdmin } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { TransactionType } from '@prisma/client';

export type ActionResponse<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Get inventory for a variant (admin only)
 */
export async function getInventoryAction(variantId: string) {
  try {
    await requireAdmin();

    const inventory = await InventoryService.getInventory(variantId);

    return {
      success: true,
      data: inventory,
    };
  } catch (error) {
    console.error('Get inventory error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get inventory',
    };
  }
}

/**
 * Check stock availability (public - used during add to cart)
 */
export async function checkStockAction(variantId: string, quantity: number) {
  try {
    const stockCheck = await InventoryService.checkStock(variantId, quantity);

    return {
      success: true,
      data: stockCheck,
    };
  } catch (error) {
    console.error('Check stock error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check stock',
    };
  }
}

/**
 * Adjust inventory (admin only)
 */
export async function adjustInventoryAction(data: {
  variantId: string;
  quantity: number;
  type: TransactionType;
  reason: string;
  referenceId?: string;
}) {
  try {
    await requireAdmin();

    await InventoryService.adjustInventory(data);

    revalidatePath('/admin/inventory');
    revalidatePath('/admin/products');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Adjust inventory error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to adjust inventory',
    };
  }
}

/**
 * Set inventory quantity (admin only)
 */
export async function setInventoryQuantityAction(
  variantId: string,
  newQuantity: number,
  reason: string
) {
  try {
    await requireAdmin();

    if (newQuantity < 0) {
      return {
        success: false,
        error: 'Quantity cannot be negative',
      };
    }

    await InventoryService.setInventoryQuantity(variantId, newQuantity, reason);

    revalidatePath('/admin/inventory');
    revalidatePath('/admin/products');
    revalidatePath('/products');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Set inventory error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set inventory',
    };
  }
}

/**
 * Get transaction history (admin only)
 */
export async function getTransactionHistoryAction(variantId: string, limit?: number) {
  try {
    await requireAdmin();

    const history = await InventoryService.getTransactionHistory(variantId, limit);

    return {
      success: true,
      data: history,
    };
  } catch (error) {
    console.error('Get transaction history error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get history',
    };
  }
}

/**
 * Get low stock variants (admin only)
 */
export async function getLowStockVariantsAction() {
  try {
    await requireAdmin();

    const variants = await InventoryService.getLowStockVariants();

    return {
      success: true,
      data: variants,
    };
  } catch (error) {
    console.error('Get low stock variants error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get low stock variants',
    };
  }
}

/**
 * Get out of stock variants (admin only)
 */
export async function getOutOfStockVariantsAction() {
  try {
    await requireAdmin();

    const variants = await InventoryService.getOutOfStockVariants();

    return {
      success: true,
      data: variants,
    };
  } catch (error) {
    console.error('Get out of stock variants error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get out of stock variants',
    };
  }
}

/**
 * Update low stock threshold (admin only)
 */
export async function updateLowStockThresholdAction(
  variantId: string,
  threshold: number
) {
  try {
    await requireAdmin();

    if (threshold < 0) {
      return {
        success: false,
        error: 'Threshold cannot be negative',
      };
    }

    await InventoryService.updateLowStockThreshold(variantId, threshold);

    revalidatePath('/admin/inventory');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Update threshold error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update threshold',
    };
  }
}

/**
 * Record damaged items (admin only)
 */
export async function recordDamageAction(
  variantId: string,
  quantity: number,
  reason: string
) {
  try {
    await requireAdmin();

    if (quantity <= 0) {
      return {
        success: false,
        error: 'Quantity must be positive',
      };
    }

    await InventoryService.recordDamage(variantId, quantity, reason);

    revalidatePath('/admin/inventory');
    revalidatePath('/admin/products');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Record damage error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record damage',
    };
  }
}

/**
 * Process return (admin only)
 */
export async function processReturnAction(
  variantId: string,
  quantity: number,
  orderId: string,
  reason: string
) {
  try {
    await requireAdmin();

    if (quantity <= 0) {
      return {
        success: false,
        error: 'Quantity must be positive',
      };
    }

    await InventoryService.processReturn(variantId, quantity, orderId, reason);

    revalidatePath('/admin/inventory');
    revalidatePath('/admin/orders');
    revalidatePath('/admin/products');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Process return error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process return',
    };
  }
}

/**
 * Get inventory summary (admin only)
 */
export async function getInventorySummaryAction() {
  try {
    await requireAdmin();

    const summary = await InventoryService.getInventorySummary();

    return {
      success: true,
      data: summary,
    };
  } catch (error) {
    console.error('Get inventory summary error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get summary',
    };
  }
}
