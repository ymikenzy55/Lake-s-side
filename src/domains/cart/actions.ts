'use server';

import { CartService, CartError } from './service';
import { getSessionUser } from '@/lib/auth/session';
import { addToCartSchema, updateCartItemSchema, removeFromCartSchema, type AddToCartInput, type UpdateCartItemInput, type RemoveFromCartInput } from '@/lib/validations/cart';
import { limitByIp } from '@/lib/security/rate-limit';
import { ZodError } from 'zod';

export type ActionResponse<T = void> = { success: boolean; data?: T; error?: string };

function message(e: unknown, fallback: string) {
  if (e instanceof CartError) return e.message;
  if (e instanceof ZodError) return e.issues[0]?.message ?? 'Invalid input';
  console.error(fallback, e);
  return fallback;
}

export async function getCartAction() {
  try {
    const user = await getSessionUser();
    return { success: true, data: await CartService.getCartView(user?.id) };
  } catch (e) {
    return { success: false, error: message(e, 'Could not load your bag') };
  }
}

export async function addToCartAction(input: AddToCartInput): Promise<ActionResponse> {
  try {
    if (!(await limitByIp('cart', 120, 60_000)).ok) return { success: false, error: 'Too many requests, slow down a little' };
    const v = addToCartSchema.parse(input);
    const user = await getSessionUser();
    await CartService.addToCart(v.variantId, v.quantity, user?.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: message(e, 'Could not add to bag') };
  }
}

/** Mutations return the fresh cart so the UI never needs a second round trip. */
export async function updateCartItemAction(input: UpdateCartItemInput) {
  try {
    const v = updateCartItemSchema.parse(input);
    const user = await getSessionUser();
    await CartService.updateCartItem(v.itemId, v.quantity, user?.id);
    return { success: true, data: await CartService.getCartView(user?.id) };
  } catch (e) {
    return { success: false, error: message(e, 'Could not update your bag') };
  }
}

export async function clearCartAction() {
  try {
    const user = await getSessionUser();
    await CartService.clearCart(user?.id);
    return { success: true, data: await CartService.getCartView(user?.id) };
  } catch (e) {
    return { success: false, error: message(e, 'Could not clear your cart') };
  }
}

export async function removeFromCartAction(input: RemoveFromCartInput) {
  try {
    const v = removeFromCartSchema.parse(input);
    const user = await getSessionUser();
    await CartService.removeFromCart(v.itemId, user?.id);
    return { success: true, data: await CartService.getCartView(user?.id) };
  } catch (e) {
    return { success: false, error: message(e, 'Could not remove item') };
  }
}
