import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { CartService } from '@/domains/cart/service';

export const dynamic = 'force-dynamic';

/** Lightweight header state (user + cart badge) so cached pages stay static. */
export async function GET() {
  // A transient DB hiccup must never break every page's header: degrade to a guest view.
  const user = await getSessionUser().catch(() => null);
  const cartCount = await CartService.peekCartCount(user?.id).catch(() => 0);
  return NextResponse.json(
    {
      user: user ? { firstName: user.firstName, email: user.email, role: user.role } : null,
      cartCount,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
