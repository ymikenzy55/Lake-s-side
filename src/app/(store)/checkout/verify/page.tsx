import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { verifyTransaction } from '@/services/paystack';
import { OrderService } from '@/domains/orders/service';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Verifying payment' };

/** Paystack redirects here with ?reference=<orderNumber>. We always re-verify server-side. */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const sp = await searchParams;
  const ref = (sp.reference || sp.trxref || '').slice(0, 60);
  if (!ref) redirect('/cart');

  const order = await prisma.order.findUnique({ where: { orderNumber: ref }, select: { id: true, orderNumber: true, totalAmount: true } });
  if (!order) redirect('/cart');

  let ok = false;
  try {
    const tx = await verifyTransaction(ref);
    if (tx.status === 'success' && tx.currency === 'GHS' && tx.amount === Math.round(Number(order.totalAmount) * 100)) {
      await OrderService.markPaid(order.id, tx);
      ok = true;
    } else if (tx.status === 'failed' || tx.status === 'abandoned') {
      await OrderService.markPaymentFailed(order.id, `Paystack: ${tx.status}`);
    }
  } catch (e) {
    console.error('verify failed', e);
  }

  redirect(ok ? `/checkout/success?order=${encodeURIComponent(order.orderNumber)}` : `/checkout/success?order=${encodeURIComponent(order.orderNumber)}&status=unpaid`);
}
