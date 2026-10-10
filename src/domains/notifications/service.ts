import { prisma } from '@/lib/db';
import { APP_URL } from '@/lib/constants';
import { money } from '@/lib/utils';
import { sendEmail, emailLayout, emailButton, esc } from '@/services/brevo';
import { getSettings } from '@/domains/settings/service';
import type { NotificationType } from '@prisma/client';

const COPY: Partial<Record<NotificationType, { subject: (n: string) => string; title: string; line: string }>> = {
  ORDER_CONFIRMATION: { subject: (n) => `We got your order ${n}`, title: 'Thanks for your order!', line: 'We have received your order and will start preparing it shortly.' },
  PAYMENT_CONFIRMATION: { subject: (n) => `Payment received for ${n}`, title: 'Payment received', line: 'Your payment was successful. We are getting your order ready.' },
  ORDER_PROCESSING: { subject: (n) => `Order ${n} is being prepared`, title: 'We are preparing your order', line: 'Your items are being packed with care.' },
  ORDER_SHIPPED: { subject: (n) => `Order ${n} is on its way`, title: 'Out for delivery', line: 'Your order is on its way. Keep your phone close for the rider.' },
  ORDER_DELIVERED: { subject: (n) => `Order ${n} delivered`, title: 'Delivered', line: 'Your order has been delivered. We hope you love it!' },
  ORDER_CANCELLED: { subject: (n) => `Order ${n} cancelled`, title: 'Order cancelled', line: 'Your order was cancelled. If you did not ask for this, please contact us.' },
};

/** Fire-and-forget safe: never throws. Also alerts the store owner on new orders. */
export async function sendOrderEmail(orderId: string, type: NotificationType): Promise<void> {
  try {
    const copy = COPY[type];
    if (!copy) return;
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return;

    const rows = order.items
      .map(
        (i) =>
          `<tr><td style="padding:6px 0">${esc(i.productName)}<br><span style="color:#6b6b70;font-size:12px">${esc(i.variantName)} × ${i.quantity}</span></td><td align="right" style="padding:6px 0">${money(Number(i.price) * i.quantity)}</td></tr>`
      )
      .join('');
    const link = `${APP_URL}/track?order=${encodeURIComponent(order.orderNumber)}`;
    const html = emailLayout(
      copy.title,
      `<p>Hi ${esc(order.customerName.split(' ')[0])}, ${copy.line}</p>
       <p style="color:#6b6b70;font-size:13px">Order <b style="color:#0a0a0a">${esc(order.orderNumber)}</b></p>
       <table width="100%" style="border-top:1px solid #eee;border-bottom:1px solid #eee;margin:14px 0;font-size:14px">${rows}
       <tr><td style="padding:6px 0;color:#6b6b70">Delivery</td><td align="right">${money(Number(order.shippingFee))}</td></tr>
       ${Number(order.discountAmount) > 0 ? `<tr><td style="padding:6px 0;color:#6b6b70">Discount</td><td align="right">-${money(Number(order.discountAmount))}</td></tr>` : ''}
       <tr><td style="padding:8px 0"><b>Total</b></td><td align="right"><b>${money(Number(order.totalAmount))}</b></td></tr></table>
       <p style="font-size:13px;color:#6b6b70">Payment: ${order.paymentMethod === 'PAYSTACK' ? 'Paid online' : 'Cash on delivery'}</p>
       ${emailButton(link, 'Track your order')}
       <p style="font-size:13px;color:#6b768c">Tracking ID: <b style="color:#0b1220">${esc(order.orderNumber)}</b> · <a href="${esc(APP_URL)}/track?order=${encodeURIComponent(order.orderNumber)}">view receipt &amp; status</a></p>`
    );
    await sendEmail({ type, to: order.customerEmail, subject: copy.subject(order.orderNumber), html, devLink: link });

    if (type === 'ORDER_CONFIRMATION') {
      const settings = await getSettings();
      if (settings.contact_email) {
        await sendEmail({
          type,
          to: settings.contact_email,
          subject: `New order ${order.orderNumber} (${money(Number(order.totalAmount))})`,
          html: emailLayout('New order received', `<p>${esc(order.customerName)} · ${esc(order.customerPhone)}</p>${emailButton(`${APP_URL}/admin/orders/${order.id}`, 'Open in admin')}`),
        });
      }
    }
  } catch (e) {
    console.error('sendOrderEmail failed', e);
  }
}
