import { cache } from 'react';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { SESSION_DURATION, COOKIE_SECURE } from '@/lib/constants';
import { randomToken, sha256 } from '@/lib/security/tokens';
import { TtlCache } from '@/lib/cache';

// Sessions are re-validated against the DB at most every 20s per token (saves a round trip on every request).
const userCache = new TtlCache<SessionUser>(20_000);

export const SESSION_COOKIE_NAME = 'cf_session';

export interface SessionUser {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';
  firstName: string | null;
  lastName: string | null;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: 401 | 403
  ) {
    super(message);
  }
}

/** Create a session. Only a SHA-256 hash of the token is stored in the DB. */
export async function createSession(userId: string): Promise<void> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await prisma.session.create({
    data: { userId, sessionToken: sha256(token), expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

}

/** Current user (memoised per request). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const hash = sha256(token);
  const cached = userCache.get(hash);
  if (cached) return cached;

  const session = await prisma.session.findFirst({
    where: { sessionToken: hash, expiresAt: { gt: new Date() } },
    relationLoadStrategy: 'join',
    select: {
      user: {
        select: { id: true, email: true, role: true, firstName: true, lastName: true, isActive: true },
      },
    },
  });

  if (!session || !session.user.isActive) return null;
  const { id, email, role, firstName, lastName } = session.user;
  const user: SessionUser = { id, email, role, firstName, lastName };
  userCache.set(hash, user);
  return user;
});

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError('Please sign in to continue', 401);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    throw new AuthError('Admin access required', 403);
  }
  return user;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== 'SUPER_ADMIN') throw new AuthError('Super admin access required', 403);
  return user;
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    userCache.delete(sha256(token));
    await prisma.session.deleteMany({ where: { sessionToken: sha256(token) } });
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  userCache.clear(); // role/disable changes must take effect immediately
  await prisma.session.deleteMany({ where: { userId } });
}
