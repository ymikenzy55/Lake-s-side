import { cookies } from 'next/headers';
import { ORDER_ACCESS_COOKIE } from '@/lib/constants';
import { unsign, sign } from '@/lib/security/tokens';
import { getSessionUser } from '@/lib/auth/session';

/** Order numbers a guest browser has proven it owns (placed it, or tracked it with number + email). */
async function guestNumbers(): Promise<string[]> {
  const raw = (await cookies()).get(ORDER_ACCESS_COOKIE)?.value;
  const v = unsign(raw);
  return v ? v.split(',').filter(Boolean).slice(0, 10) : [];
}

/** Remember an order for this browser (signed cookie, 30 days, last 10 orders). */
export async function grantOrderAccess(orderNumber: string, secure: boolean): Promise<void> {
  const nums = [orderNumber, ...(await guestNumbers()).filter((n) => n !== orderNumber)].slice(0, 10);
  (await cookies()).set(ORDER_ACCESS_COOKIE, sign(nums.join(',')), {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });
}

/** True for the order's owner, an admin, or a guest browser that holds the signed grant. */
export async function canAccessOrder(order: { orderNumber: string; userId: string | null }): Promise<boolean> {
  if ((await guestNumbers()).includes(order.orderNumber)) return true;
  const user = await getSessionUser();
  if (!user) return false;
  return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || order.userId === user.id;
}
