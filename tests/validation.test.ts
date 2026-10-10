import { describe, expect, it } from 'vitest';
import { registerSchema, resetPasswordSchema, loginSchema } from '@/lib/validations/auth';
import { checkoutSchema } from '@/lib/validations/checkout';
import { addToCartSchema } from '@/lib/validations/cart';
import { slugify, generateOrderNumber, isUuid, money } from '@/lib/utils';

describe('auth validation', () => {
  it('accepts a strong registration and normalises email', () => {
    const r = registerSchema.parse({ email: ' Ama@Example.COM ', password: 'Strong123', firstName: 'Ama' });
    expect(r.email).toBe('ama@example.com');
    expect(r.phone).toBeUndefined();
  });
  it('rejects weak passwords', () => {
    for (const p of ['short1A', 'alllowercase1', 'ALLUPPERCASE1', 'NoNumbersHere'])
      expect(registerSchema.safeParse({ email: 'a@b.co', password: p }).success).toBe(false);
  });
  it('requires matching passwords on reset', () => {
    const base = { token: 'x'.repeat(64), password: 'Strong123' };
    expect(resetPasswordSchema.safeParse({ ...base, confirmPassword: 'Strong123' }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ ...base, confirmPassword: 'Different1' }).success).toBe(false);
  });
  it('requires an email to log in', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  });
});

describe('checkout validation', () => {
  const valid = {
    email: 'kofi@example.com', name: 'Kofi Boateng', phone: '024 123 4567', paymentMethod: 'CASH_ON_DELIVERY',
    address: { fullName: 'Kofi Boateng', phone: '0241234567', region: 'Greater Accra', city: 'Accra', area: 'Osu' },
  };
  it('accepts a valid order and strips spaces from phone numbers', () => {
    const r = checkoutSchema.parse(valid);
    expect(r.phone).toBe('0241234567');
  });
  it('rejects unknown payment methods', () => {
    expect(checkoutSchema.safeParse({ ...valid, paymentMethod: 'BITCOIN' }).success).toBe(false);
  });
  it('does not accept client-supplied prices', () => {
    const r = checkoutSchema.parse({ ...valid, total: 1, items: [{ price: 0 }] });
    expect(r).not.toHaveProperty('total');
    expect(r).not.toHaveProperty('items');
  });
});

describe('cart validation', () => {
  it('caps quantity', () => {
    const id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    expect(addToCartSchema.safeParse({ variantId: id, quantity: 2 }).success).toBe(true);
    expect(addToCartSchema.safeParse({ variantId: id, quantity: 0 }).success).toBe(false);
    expect(addToCartSchema.safeParse({ variantId: id, quantity: 1000 }).success).toBe(false);
    expect(addToCartSchema.safeParse({ variantId: 'nope', quantity: 1 }).success).toBe(false);
  });
});

describe('utils', () => {
  it('slugifies', () => expect(slugify('  Everyday Heavy Hoodie! ')).toBe('everyday-heavy-hoodie'));
  it('creates unique order numbers', () => {
    const a = generateOrderNumber();
    expect(a).toMatch(/^CF-\d{6}-[A-Z2-9]{4}$/);
    expect(generateOrderNumber()).not.toBe(a);
  });
  it('detects uuids', () => {
    expect(isUuid('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(true);
    expect(isUuid('../../etc/passwd')).toBe(false);
  });
  it('formats cedis', () => expect(money(1234.5)).toBe('GHS 1,234.50'));
});
