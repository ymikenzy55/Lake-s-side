import { z } from 'zod';

export const addToCartSchema = z.object({
  variantId: z.string().uuid('Invalid variant ID'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .positive('Quantity must be positive')
    .max(100, 'Quantity cannot exceed 100'),
});

export const updateCartItemSchema = z.object({
  itemId: z.string().uuid('Invalid cart item ID'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .positive('Quantity must be positive')
    .max(100, 'Quantity cannot exceed 100'),
});

export const removeFromCartSchema = z.object({
  itemId: z.string().uuid('Invalid cart item ID'),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type RemoveFromCartInput = z.infer<typeof removeFromCartSchema>;
