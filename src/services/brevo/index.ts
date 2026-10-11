import { prisma } from '@/lib/db';
import { BRAND } from '@/lib/config/brand';
import type { NotificationType } from '@prisma/client';
import nodemailer from 'nodemailer';
import { APP_URL } from '@/lib/constants';

interface SendArgs {
  type: NotificationType;
  to: string;
  subject: string;
  html: string;
  /** Logged in development when no email provider is configured, so flows stay testable. */
  devLink?: string;
}

const brevoKey = () => {
  const k = process.env.BREVO_API_KEY;
  return k && !k.includes('xxxxxxxx') ? k : null;
};
const smtpReady = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

/** Which transport will deliver mail: used by the admin settings page. */
export function emailProvider(): 'brevo' | 'smtp' | null {
  return brevoKey() ? 'brevo' : smtpReady() ? 'smtp' : null;
}

let smtpTransport: ReturnType<typeof nodemailer.createTransport> | undefined;
function smtp() {
  const port = Number(process.env.SMTP_PORT || 465);
  return (smtpTransport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  }));
}

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function emailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;color:#0b1220">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:20px;overflow:hidden">
<tr><td align="center" style="background:#000;padding:18px 28px"><img src="${esc(APP_URL)}/brand/lakeside-logo.png" width="180" alt="${esc(BRAND.name)}" style="display:block;width:180px;max-width:100%;height:auto;border:0;color:#fff;font-weight:800;letter-spacing:.04em"></td></tr>
<tr><td style="padding:28px"><h1 style="margin:0 0 14px;font-size:22px">${esc(title)}</h1>${bodyHtml}</td></tr>
<tr><td style="padding:16px 28px;background:#fafafa;color:#6b6b70;font-size:12px">${esc(BRAND.name)} · ${esc(BRAND.tagline)}</td></tr>
</table></td></tr></table></body></html>`;
}

export function emailButton(href: string, label: string): string {
  return `<p style="margin:22px 0"><a href="${esc(href)}" style="background:#0b1220;color:#fff;text-decoration:none;padding:13px 22px;border-radius:14px;font-weight:600;display:inline-block">${esc(label)}</a></p>`;
}

/**
 * Sends through Brevo when BREVO_API_KEY is set and always records a Notification
 * row. Never throws: an email failure must not break checkout or auth flows.
 */
export async function sendEmail({ type, to, subject, html, devLink }: SendArgs): Promise<boolean> {
  const note = await prisma.notification
    .create({ data: { type, recipient: to, subject, content: html, status: 'PENDING' } })
    .catch(() => null);

  const provider = emailProvider();
  if (!provider) {
    if (process.env.NODE_ENV !== 'production' && devLink) {
      console.info(`[email:dev] ${type} -> ${to}
  ${devLink}`);
    }
    // Production without a provider: still make the link retrievable by the super admin from the server log.
    if (devLink) console.info(`[email:not-configured] ${type} -> ${to}
  ${devLink}`);
    if (note) {
      await prisma.notification
        .update({ where: { id: note.id }, data: { status: 'FAILED', error: 'Email provider not configured' } })
        .catch(() => {});
    }
    return false;
  }

  if (provider === 'smtp') {
    try {
      const info = await smtp().sendMail({
        from: process.env.SMTP_FROM || `"${BRAND.name}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      if (note) await prisma.notification.update({ where: { id: note.id }, data: { status: 'SENT', sentAt: new Date(), providerId: String(info.messageId ?? '').slice(0, 120) } });
      return true;
    } catch (e) {
      if (note) await prisma.notification.update({ where: { id: note.id }, data: { status: 'FAILED', error: String((e as Error).message).slice(0, 300) } }).catch(() => {});
      return false;
    }
  }

  const key = brevoKey()!;
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: {
          email: process.env.BREVO_SENDER_EMAIL || 'noreply@thelakeside.shop',
          name: process.env.BREVO_SENDER_NAME || BRAND.name,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as { messageId?: string; message?: string };
    if (!res.ok) throw new Error(data.message || `Brevo ${res.status}`);
    if (note) {
      await prisma.notification.update({
        where: { id: note.id },
        data: { status: 'SENT', sentAt: new Date(), providerId: data.messageId ?? null },
      });
    }
    return true;
  } catch (e) {
    if (note) {
      await prisma.notification
        .update({ where: { id: note.id }, data: { status: 'FAILED', error: String((e as Error).message).slice(0, 300) } })
        .catch(() => {});
    }
    return false;
  }
}
