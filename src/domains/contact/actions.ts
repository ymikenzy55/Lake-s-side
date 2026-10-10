'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { limitByIp } from '@/lib/security/rate-limit';
import { cleanText } from '@/lib/security/sanitize';
import { adminChannel, publish } from '@/lib/realtime';
import { emailRule } from '@/lib/validations/auth';

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  email: emailRule,
  phone: z.string().trim().max(30).optional(),
  subject: z.string().trim().min(3, 'Please add a subject').max(120),
  message: z.string().trim().min(10, 'Your message is a bit short').max(2000),
  website: z.string().max(200).optional(), // honeypot: real people leave this empty
});

export type ContactResult = { ok: boolean; message?: string };

export async function sendContactAction(input: z.input<typeof schema>): Promise<ContactResult> {
  try {
    const limit = await limitByIp('contact', 5, 60 * 60_000);
    if (!limit.ok) return { ok: false, message: `Too many messages. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} min.` };
    const d = schema.parse(input);
    if (d.website) return { ok: true }; // bot: pretend it worked
    const row = await prisma.contactMessage.create({
      data: {
        name: cleanText(d.name, 80),
        email: d.email,
        phone: d.phone ? cleanText(d.phone, 30) : null,
        subject: cleanText(d.subject, 120),
        message: d.message.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, 2000),
      },
    });
    publish(adminChannel, { type: 'contact.created', id: row.id, name: row.name, subject: row.subject, at: Date.now() });
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: e.issues[0]?.message ?? 'Please check your details' };
    console.error('contact failed', e);
    return { ok: false, message: 'Could not send your message. Please try again.' };
  }
}
