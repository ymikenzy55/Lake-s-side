'use server';

import { limitByIp } from '@/lib/security/rate-limit';
import { OrderService } from './service';
import { grantOrderAccess } from '@/lib/order-access';
import { COOKIE_SECURE } from '@/lib/constants';

export interface TrackedOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  createdAt: string;
  items: { name: string; variant: string; quantity: number; price: number }[];
}

/** Guest tracking: requires order number AND the checkout email (anti-enumeration). */
export async function trackOrderAction(orderNumber: string, email: string): Promise<{ success: boolean; order?: TrackedOrder; error?: string }> {
  const limit = await limitByIp('track', 10, 15 * 60_000);
  if (!limit.ok) return { success: false, error: 'Too many attempts. Please try again later.' };
  const order = await OrderService.track(String(orderNumber).slice(0, 40), String(email).slice(0, 160));
  if (!order) return { success: false, error: 'We could not find an order with those details.' };
  await grantOrderAccess(order.orderNumber, COOKIE_SECURE); // lets this browser follow the order live
  return {
    success: true,
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      total: Number(order.totalAmount),
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((i) => ({ name: i.productName, variant: i.variantName, quantity: i.quantity, price: Number(i.price) })),
    },
  };
}
