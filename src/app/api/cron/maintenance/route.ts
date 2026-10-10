import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';
import { OrderService } from '@/domains/orders/service';

export const dynamic = 'force-dynamic';

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = req.headers.get('authorization') ?? '';
  const a = Buffer.from(`Bearer ${secret}`);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Housekeeping for a long-running / scaled deployment. Call on a schedule (Vercel Cron, GitHub
 * Actions, or `curl -H "Authorization: Bearer $CRON_SECRET"`). Keeps tables small and stock honest:
 * releases stock held by abandoned card orders, prunes expired sessions / tokens / stale guest carts.
 */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const [expiredOrders, sessions, tokens, carts, notes] = await Promise.all([
    OrderService.expireStaleOrders(60),
    prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.passwordResetToken.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] } }),
    prisma.cart.deleteMany({ where: { userId: null, updatedAt: { lt: new Date(now.getTime() - 30 * 86_400_000) } } }),
    prisma.notification.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 90 * 86_400_000) } } }),
  ]);
  return NextResponse.json({ ok: true, expiredOrders, sessions: sessions.count, resetTokens: tokens.count, guestCarts: carts.count, notifications: notes.count });
}
