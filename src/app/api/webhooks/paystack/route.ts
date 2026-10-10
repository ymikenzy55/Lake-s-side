import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validWebhookSignature } from '@/services/paystack';
import { OrderService } from '@/domains/orders/service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const raw = await req.text();
  if (!validWebhookSignature(raw, req.headers.get('x-paystack-signature'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  try {
    const evt = JSON.parse(raw) as { event: string; data: { reference: string; amount: number; currency: string } };
    const order = await prisma.order.findUnique({ where: { orderNumber: evt.data.reference }, select: { id: true, totalAmount: true } });
    if (!order) return NextResponse.json({ ok: true });

    if (evt.event === 'charge.success') {
      // Never trust the payload alone: the amount must match what we charged.
      if (evt.data.currency === 'GHS' && Math.round(Number(order.totalAmount) * 100) === evt.data.amount) {
        await OrderService.markPaid(order.id, evt.data);
      }
    } else if (evt.event === 'charge.failed') {
      await OrderService.markPaymentFailed(order.id, 'Charge failed');
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('paystack webhook error', e);
    return NextResponse.json({ error: 'processing error' }, { status: 500 });
  }
}
