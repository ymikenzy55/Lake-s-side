import { NextResponse } from 'next/server';
import { AuthError, requireAdmin, type SessionUser } from '@/lib/auth/session';
import { adminChannel, sseResponse } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

/** Live order feed for the admin area (admins only, max 6 streams per admin). */
export async function GET(req: Request) {
  let admin: SessionUser;
  try {
    admin = await requireAdmin();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }
  return sseResponse(req, [adminChannel], `admin:${admin.id}`, 6);
}
