import { LoginForm } from '@/components/auth/LoginForm';
import { GOOGLE_ERRORS } from '@/components/auth/GoogleButton';
import { safeRedirectPath } from '@/lib/security/sanitize';
import { googleConfigured } from '@/services/google';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string; reset?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <LoginForm
      redirectTo={safeRedirectPath(sp.redirect, '')}
      justReset={sp.reset === '1'}
      google={googleConfigured()}
      initialError={(sp.error && GOOGLE_ERRORS[sp.error]) || ''}
    />
  );
}
