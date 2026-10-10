import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** Things that need an admin's attention: orders waiting to be handled and unread contact messages. */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const [orders, orderCount, messages, messageCount, low] = await Promise.all([
    prisma.order.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, orderNumber: true, customerName: true, totalAmount: true, createdAt: true } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.contactMessage.findMany({ where: { isRead: false }, orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, name: true, subject: true, createdAt: true } }),
    prisma.contactMessage.count({ where: { isRead: false } }),
    prisma.$queryRaw<{ id: string; name: string; left: number; total: bigint }[]>`
      SELECT v.id, p.name || ' (' || sz.name || ', ' || cl.name || ')' AS name, GREATEST(0, i.quantity - i."reservedQuantity")::int AS "left",
             count(*) OVER () AS total
      FROM "Inventory" i
      JOIN "ProductVariant" v ON v.id = i."variantId"
      JOIN "Product" p ON p.id = v."productId"
      JOIN "Size" sz ON sz.id = v."sizeId"
      JOIN "Color" cl ON cl.id = v."colorId"
      WHERE v."isActive" AND p."isActive" AND i.quantity - i."reservedQuantity" <= i."lowStockThreshold"
      ORDER BY 3 ASC, 2 ASC LIMIT 6`,
  ]);
  return NextResponse.json({
    orderCount,
    messageCount,
    orders: orders.map((o) => ({ ...o, totalAmount: Number(o.totalAmount) })),
    messages,
    lowCount: Number(low[0]?.total ?? 0),
    low: low.map((l) => ({ id: l.id, name: l.name, left: l.left })),
  });
}
