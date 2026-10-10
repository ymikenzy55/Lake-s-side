import { LoginForm } from '@/components/auth/LoginForm';
import { safeRedirectPath } from '@/lib/security/sanitize';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string; reset?: string }> }) {
  const sp = await searchParams;
  return <LoginForm redirectTo={safeRedirectPath(sp.redirect, '')} justReset={sp.reset === '1'} />;
}
