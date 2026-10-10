import { z } from 'zod';
import { cleanText } from '@/lib/security/sanitize';

export const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/[0-9]/, 'Password needs a number');

export const emailRule = z.string().trim().toLowerCase().email('Enter a valid email address').max(160);

const optionalText = (max: number, min = 0) =>
  z
    .string()
    .optional()
    .transform((s) => cleanText(s ?? '', max))
    .refine((s) => s === '' || s.length >= min, `Must be at least ${min} characters`)
    .transform((s) => s || undefined);

export const registerSchema = z.object({
  email: emailRule,
  password: passwordRule,
  firstName: optionalText(50, 2),
  lastName: optionalText(50, 2),
  phone: z
    .string()
    .optional()
    .transform((s) => (s ?? '').replace(/[\s()-]/g, ''))
    .pipe(z.string().regex(/^(\+?[0-9]{9,15})?$/, 'Enter a valid phone number'))
    .transform((s) => s || undefined),
});

export const loginSchema = z.object({
  email: emailRule,
  password: z.string().min(1, 'Password is required').max(128),
});

export const forgotPasswordSchema = z.object({ email: emailRule });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, 'This reset link is invalid').max(200),
    password: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] });

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

export type RegisterData = z.output<typeof registerSchema>;
export type LoginData = z.output<typeof loginSchema>;
