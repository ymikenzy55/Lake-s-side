'use server';

import { redirect } from 'next/navigation';
import { AuthService, AuthServiceError } from './service';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type RegisterInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from '@/lib/validations/auth';
import { limitByIp } from '@/lib/security/rate-limit';
import { ZodError } from 'zod';

export type ActionResponse<T = void> = { success: boolean; data?: T; error?: string };

function fail(error: unknown, fallback: string): { success: false; error: string } {
  if (error instanceof AuthServiceError) return { success: false, error: error.message };
  if (error instanceof ZodError) return { success: false, error: error.issues[0]?.message ?? 'Invalid input' };
  console.error(fallback, error);
  return { success: false, error: fallback };
}

const tooMany = (s: number) => ({ success: false as const, error: `Too many attempts. Try again in ${Math.ceil(s / 60)} min.` });

export async function registerAction(input: RegisterInput): Promise<ActionResponse<{ email: string }>> {
  try {
    const limit = await limitByIp('register', 5, 60 * 60_000);
    if (!limit.ok) return tooMany(limit.retryAfterSeconds);
    const user = await AuthService.register(registerSchema.parse(input));
    return { success: true, data: { email: user.email } };
  } catch (e) {
    return fail(e, 'Registration failed. Please try again.');
  }
}

export async function loginAction(input: LoginInput): Promise<ActionResponse<{ email: string; role: string }>> {
  try {
    const limit = await limitByIp('login', 8, 15 * 60_000, String(input?.email ?? ''));
    if (!limit.ok) return tooMany(limit.retryAfterSeconds);
    const user = await AuthService.login(loginSchema.parse(input));
    return { success: true, data: { email: user.email, role: user.role } };
  } catch (e) {
    return fail(e, 'Sign in failed. Please try again.');
  }
}

export async function logoutAction(): Promise<void> {
  await AuthService.logout();
  redirect('/login');
}

export async function forgotPasswordAction(input: ForgotPasswordInput): Promise<ActionResponse> {
  try {
    const limit = await limitByIp('forgot', 3, 60 * 60_000, String(input?.email ?? ''));
    if (!limit.ok) return tooMany(limit.retryAfterSeconds);
    await AuthService.requestPasswordReset(forgotPasswordSchema.parse(input).email);
    return { success: true };
  } catch (e) {
    return fail(e, 'Could not process your request. Please try again.');
  }
}

export async function resetPasswordAction(input: ResetPasswordInput): Promise<ActionResponse> {
  try {
    const limit = await limitByIp('reset', 10, 60 * 60_000);
    if (!limit.ok) return tooMany(limit.retryAfterSeconds);
    const v = resetPasswordSchema.parse(input);
    await AuthService.resetPassword(v.token, v.password);
    return { success: true };
  } catch (e) {
    return fail(e, 'Could not reset your password. Please try again.');
  }
}
