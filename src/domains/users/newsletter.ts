'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { limitByIp } from '@/lib/security/rate-limit';

const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address').max(160);

export async function subscribeAction(email: string): Promise<{ ok: boolean; message: string }> {
  const limit = await limitByIp('subscribe', 5, 60 * 60_000);
  if (!limit.ok) return { ok: false, message: 'Too many attempts. Please try again later.' };
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid email' };
  try {
    await prisma.subscriber.upsert({ where: { email: parsed.data }, update: {}, create: { email: parsed.data } });
    return { ok: true, message: 'You are in! Watch your inbox for new drops.' };
  } catch (e) {
    console.error('subscribe failed', e);
    return { ok: false, message: 'Could not subscribe right now. Please try again.' };
  }
}
