import { z } from 'zod';
import { cleanText } from '@/lib/security/sanitize';

const phone = z
  .string()
  .transform((s) => s.replace(/[\s()-]/g, ''))
  .pipe(z.string().regex(/^\+?[0-9]{9,15}$/, 'Enter a valid phone number'));

export const addressSchema = z.object({
  fullName: z.string().transform((s) => cleanText(s, 80)).pipe(z.string().min(2, 'Full name is required')),
  phone,
  region: z.string().transform((s) => cleanText(s, 60)).pipe(z.string().min(2, 'Region is required')),
  city: z.string().transform((s) => cleanText(s, 60)).pipe(z.string().min(2, 'City / town is required')),
  area: z.string().transform((s) => cleanText(s, 80)).optional(),
  streetAddress: z.string().transform((s) => cleanText(s, 160)).optional(),
  landmark: z.string().transform((s) => cleanText(s, 120)).optional(),
});

export const checkoutSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
  name: z.string().transform((s) => cleanText(s, 80)).pipe(z.string().min(2, 'Your name is required')),
  phone,
  address: addressSchema,
  paymentMethod: z.enum(['PAYSTACK', 'CASH_ON_DELIVERY']),
  discountCode: z.string().trim().max(40).optional(),
  notes: z.string().transform((s) => cleanText(s, 300)).optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
