import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { canAccessOrder } from '@/lib/order-access';
import { orderChannel, sseResponse } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

/** Live status feed for one order. Only the owner / the browser that placed it may subscribe. */
export async function GET(req: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const number = orderNumber.slice(0, 40).toUpperCase();
  const order = await prisma.order.findUnique({ where: { orderNumber: number }, select: { orderNumber: true, userId: true } });
  if (!order || !(await canAccessOrder(order))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return sseResponse(req, [orderChannel(order.orderNumber)], `order:${order.orderNumber}`, 8);
}
