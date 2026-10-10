import { AuthError, requireAdmin, requireSuperAdmin, type SessionUser } from '@/lib/auth/session';
import { ZodError } from 'zod';
import { OrderError } from '@/domains/orders/service';
import { prisma } from '@/lib/db';

export type FormResult = { ok: boolean; message?: string; id?: string };

/** Message-carrying errors that are safe to show to an admin. */
export class AdminError extends Error {}

/**
 * Wraps an admin mutation: authorises, validates, audits and converts errors into
 * a serialisable result (never leaks stack traces / SQL to the client).
 */
export async function adminAction(
  fn: (admin: SessionUser) => Promise<FormResult | void>,
  opts: { superOnly?: boolean; audit?: { action: string; entityType: string; entityId?: string } } = {}
): Promise<FormResult> {
  try {
    const admin = opts.superOnly ? await requireSuperAdmin() : await requireAdmin();
    const res = (await fn(admin)) ?? { ok: true };
    if (opts.audit && res.ok) {
      await prisma.auditLog
        .create({ data: { userId: admin.id, action: opts.audit.action, entityType: opts.audit.entityType, entityId: opts.audit.entityId ?? res.id ?? null } })
        .catch(() => {});
    }
    return res;
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: e.message };
    if (e instanceof ZodError) return { ok: false, message: e.issues[0]?.message ?? 'Invalid input' };
    if (e instanceof AdminError || e instanceof OrderError) return { ok: false, message: e.message };
    const code = (e as { code?: string }).code;
    if (code === 'P2002') return { ok: false, message: 'That value is already in use (names, slugs and SKUs must be unique).' };
    if (code === 'P2003') return { ok: false, message: 'This item is referenced elsewhere (for example in orders) and cannot be deleted. Deactivate it instead.' };
    if (code === 'P2025') return { ok: false, message: 'That record no longer exists.' };
    console.error('admin action failed', e);
    return { ok: false, message: 'Something went wrong. Please try again.' };
  }
}
