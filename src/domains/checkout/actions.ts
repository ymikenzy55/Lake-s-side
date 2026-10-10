'use server';

import { ZodError } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { checkoutSchema } from '@/lib/validations/checkout';
import { limitByIp } from '@/lib/security/rate-limit';
import { OrderService, OrderError } from '@/domains/orders/service';
import { DiscountService, DiscountError } from '@/domains/discounts/service';
import { CartService } from '@/domains/cart/service';
import { grantOrderAccess } from '@/lib/order-access';
import { initializeTransaction, paystackConfigured } from '@/services/paystack';
import { getSettings } from '@/domains/settings/service';
import { APP_URL, COOKIE_SECURE } from '@/lib/constants';
import { prisma } from '@/lib/db';

export async function getCheckoutOptionsAction() {
  const s = await getSettings();
  const user = await getSessionUser();
  const profile = user
    ? await prisma.user.findUnique({ where: { id: user.id }, select: { email: true, firstName: true, lastName: true, phone: true } })
    : null;
  return {
    paystack: s.paystack_enabled === 'true' && paystackConfigured(),
    cod: s.cod_enabled === 'true',
    profile,
  };
}

export async function applyPromoAction(code: string): Promise<{ success: boolean; amount?: number; error?: string }> {
  try {
    const limit = await limitByIp('promo', 15, 10 * 60_000);
    if (!limit.ok) return { success: false, error: 'Too many attempts. Please wait a moment.' };
    const user = await getSessionUser();
    const cart = await CartService.getCartView(user?.id);
    const r = await DiscountService.validate(String(code).slice(0, 40), cart.subtotal);
    return { success: true, amount: r.amount };
  } catch (e) {
    if (e instanceof DiscountError) return { success: false, error: e.message };
    return { success: false, error: 'Could not apply that code' };
  }
}

export async function placeOrderAction(input: unknown): Promise<{ success: boolean; redirectUrl?: string; error?: string }> {
  try {
    const limit = await limitByIp('checkout', 10, 10 * 60_000);
    if (!limit.ok) return { success: false, error: 'Too many attempts. Please wait a few minutes.' };

    const v = checkoutSchema.parse(input);
    const settings = await getSettings(); // cached in memory: no database trip
    const options = { paystack: settings.paystack_enabled === 'true' && paystackConfigured(), cod: settings.cod_enabled === 'true' };
    if (v.paymentMethod === 'PAYSTACK' && !options.paystack) return { success: false, error: 'Card / mobile money payment is unavailable right now' };
    if (v.paymentMethod === 'CASH_ON_DELIVERY' && !options.cod) return { success: false, error: 'Cash on delivery is unavailable right now' };

    const user = await getSessionUser();
    const order = await OrderService.placeOrder({
      userId: user?.id,
      email: v.email,
      name: v.name,
      phone: v.phone,
      address: v.address,
      paymentMethod: v.paymentMethod,
      discountCode: v.discountCode,
      notes: v.notes,
    });

    await grantOrderAccess(order.orderNumber, COOKIE_SECURE);

    if (v.paymentMethod === 'PAYSTACK') {
      try {
        const init = await initializeTransaction({
          email: order.customerEmail,
          amountGhs: Number(order.totalAmount),
          reference: order.orderNumber,
          callbackUrl: `${APP_URL}/checkout/verify`,
          metadata: { orderId: order.id },
        });
        return { success: true, redirectUrl: init.authorization_url };
      } catch (e) {
        console.error('paystack init failed', e);
        await OrderService.markPaymentFailed(order.id, 'Could not start payment');
        return { success: false, error: 'We could not start the payment. Your bag is unchanged, please try again.' };
      }
    }

    return { success: true, redirectUrl: `/checkout/success?order=${encodeURIComponent(order.orderNumber)}` };
  } catch (e) {
    if (e instanceof ZodError) return { success: false, error: e.issues[0]?.message ?? 'Please check your details' };
    if (e instanceof OrderError) return { success: false, error: e.message };
    console.error('placeOrder failed', e);
    return { success: false, error: 'Something went wrong placing your order. Please try again.' };
  }
}
