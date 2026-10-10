import { createHmac, timingSafeEqual } from 'crypto';

const BASE = 'https://api.paystack.co';

export function paystackConfigured(): boolean {
  const k = process.env.PAYSTACK_SECRET_KEY;
  return Boolean(k && !k.includes('xxxxxxxx'));
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });
  const json = (await res.json()) as { status: boolean; message: string; data: T };
  if (!res.ok || !json.status) throw new Error(json.message || 'Paystack request failed');
  return json.data;
}

export function initializeTransaction(args: {
  email: string;
  amountGhs: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}) {
  return call<{ authorization_url: string; access_code: string; reference: string }>(
    '/transaction/initialize',
    {
      method: 'POST',
      body: JSON.stringify({
        email: args.email,
        amount: Math.round(args.amountGhs * 100), // pesewas
        currency: 'GHS',
        reference: args.reference,
        callback_url: args.callbackUrl,
        metadata: args.metadata,
      }),
    }
  );
}

export function verifyTransaction(reference: string) {
  return call<{ status: string; amount: number; currency: string; reference: string }>(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
}

export function validWebhookSignature(rawBody: string, signature: string | null): boolean {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !signature) return false;
  const expected = createHmac('sha512', key).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
