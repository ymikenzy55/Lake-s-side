'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { adminAction, AdminError, type FormResult } from './guard';
import { hashPassword } from '@/lib/auth/password';
import { deleteAllUserSessions } from '@/lib/auth/session';
import { passwordRule, emailRule } from '@/lib/validations/auth';
import { cleanText } from '@/lib/security/sanitize';

const ROLES = ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'] as const;
type Role = (typeof ROLES)[number];

/** There must always be at least one active super admin left. */
async function assertNotLastSuper(userId: string) {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } });
  if (target?.role !== 'SUPER_ADMIN') return;
  const others = await prisma.user.count({ where: { role: 'SUPER_ADMIN', isActive: true, id: { not: userId } } });
  if (others === 0) throw new AdminError('You cannot remove the last super admin. Promote someone else first.');
}

const createSchema = z.object({
  email: emailRule,
  firstName: z.string().transform((s) => cleanText(s, 50)).pipe(z.string().min(2, 'First name is required')),
  lastName: z.string().transform((s) => cleanText(s, 50)).optional(),
  password: passwordRule,
  role: z.enum(['ADMIN', 'SUPER_ADMIN']),
});

/** Super admin: create a staff account directly (they sign in on the normal login page). */
export async function createAdminAction(input: unknown): Promise<FormResult> {
  return adminAction(
    async () => {
      const v = createSchema.parse(input);
      if (await prisma.user.findUnique({ where: { email: v.email }, select: { id: true } })) {
        throw new AdminError('An account with that email already exists. Use "Change role" to promote it instead.');
      }
      await prisma.user.create({
        data: {
          email: v.email,
          passwordHash: await hashPassword(v.password),
          firstName: v.firstName,
          lastName: v.lastName || null,
          role: v.role,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          customer: { create: {} },
        },
      });
      revalidatePath('/admin/team');
      return { ok: true, message: `${v.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin'} created. Share the password with them privately.` };
    },
    { superOnly: true, audit: { action: 'TEAM_CREATE', entityType: 'User' } }
  );
}

/** Super admin: change anyone's role (customer / admin / super admin), never their own. */
export async function setUserRoleAction(userId: string, role: Role): Promise<FormResult> {
  return adminAction(
    async (admin) => {
      if (!ROLES.includes(role)) throw new AdminError('Invalid role');
      if (userId === admin.id) throw new AdminError('You cannot change your own role');
      if (role !== 'SUPER_ADMIN') await assertNotLastSuper(userId);
      await prisma.user.update({ where: { id: userId }, data: { role } });
      await deleteAllUserSessions(userId); // role changes apply on their next sign-in
      revalidatePath('/admin/team');
      revalidatePath('/admin/customers');
      return { ok: true, message: 'Role updated' };
    },
    { superOnly: true, audit: { action: 'USER_ROLE', entityType: 'User', entityId: userId } }
  );
}

/** Super admin: permanently remove an account (their past orders are kept, detached from the user). */
export async function deleteUserAction(userId: string): Promise<FormResult> {
  return adminAction(
    async (admin) => {
      if (userId === admin.id) throw new AdminError('You cannot delete your own account');
      await assertNotLastSuper(userId);
      await prisma.user.delete({ where: { id: userId } });
      await deleteAllUserSessions(userId);
      revalidatePath('/admin/team');
      revalidatePath('/admin/customers');
      return { ok: true, message: 'Account deleted' };
    },
    { superOnly: true, audit: { action: 'USER_DELETE', entityType: 'User', entityId: userId } }
  );
}

/** Super admin: set a new password for another account (signs them out everywhere). */
export async function resetUserPasswordAction(userId: string, password: string): Promise<FormResult> {
  return adminAction(
    async (admin) => {
      if (userId === admin.id) throw new AdminError('Use "My account" to change your own password');
      const pw = passwordRule.parse(password);
      await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(pw) } });
      await deleteAllUserSessions(userId);
      return { ok: true, message: 'Password updated. They were signed out everywhere.' };
    },
    { superOnly: true, audit: { action: 'USER_PASSWORD_RESET', entityType: 'User', entityId: userId } }
  );
}
