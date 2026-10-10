'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { AuthService, AuthServiceError } from '@/domains/auth/service';
import { cleanText } from '@/lib/security/sanitize';
import { passwordRule } from '@/lib/validations/auth';
import { limitByIp } from '@/lib/security/rate-limit';

type R = { success: boolean; error?: string };

const profileSchema = z.object({
  firstName: z.string().transform((s) => cleanText(s, 50)).pipe(z.string().min(1, 'First name is required')),
  lastName: z.string().transform((s) => cleanText(s, 50)),
  phone: z.string().transform((s) => s.replace(/[\s()-]/g, '')).pipe(z.string().regex(/^(\+?[0-9]{9,15})?$/, 'Enter a valid phone number')),
});

export async function updateProfileAction(input: unknown): Promise<R> {
  try {
    const user = await requireAuth();
    const v = profileSchema.parse(input);
    await prisma.user.update({ where: { id: user.id }, data: { firstName: v.firstName, lastName: v.lastName || null, phone: v.phone || null } });
    revalidatePath('/account');
    return { success: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.issues[0]?.message };
    return { success: false, error: 'Could not update your profile' };
  }
}

const passwordSchema = z.object({
  current: z.string().min(1, 'Enter your current password').max(128),
  next: passwordRule,
});

export async function changePasswordAction(input: unknown): Promise<R> {
  try {
    const user = await requireAuth();
    const limit = await limitByIp('chpw', 5, 15 * 60_000, user.id);
    if (!limit.ok) return { success: false, error: 'Too many attempts. Try again later.' };
    const v = passwordSchema.parse(input);
    await AuthService.changePassword(user.id, v.current, v.next);
    return { success: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.issues[0]?.message };
    if (e instanceof AuthServiceError) return { success: false, error: e.message };
    return { success: false, error: 'Could not change your password' };
  }
}
