'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { loginAction } from '@/domains/auth/actions';
import { PasswordField } from '@/components/ui/PasswordField';
import { GoogleButton } from './GoogleButton';

export function LoginForm({ redirectTo, justReset, google = false, initialError = '' }: { redirectTo: string; justReset: boolean; google?: boolean; initialError?: string }) {
  const router = useRouter();
  const [error, setError] = useState(initialError);
  const [pending, start] = useTransition();

  return (
    <div>
      <h1 className="text-[40px]">Welcome back</h1>
      <p className="mt-2 text-muted">Sign in to see your orders and check out faster.</p>

      {justReset && <p className="alert alert-ok mt-5">Password updated. Please sign in.</p>}

      {google && <div className="mt-7"><GoogleButton redirectTo={redirectTo} /></div>}

      <form method="post"
        className={`${google ? '' : 'mt-7 '}grid gap-4`}
        onSubmit={(e) => {
          e.preventDefault();
          setError('');
          const f = new FormData(e.currentTarget);
          start(async () => {
            const r = await loginAction({ email: String(f.get('email')), password: String(f.get('password')) });
            if (!r.success) return setError(r.error ?? 'Sign in failed');
            const admin = r.data?.role === 'ADMIN' || r.data?.role === 'SUPER_ADMIN';
            window.dispatchEvent(new Event('cart:changed'));
            router.push(redirectTo || (admin ? '/admin/dashboard' : '/'));
            router.refresh();
          });
        }}
      >
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="field" /></div>
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          below={<div className="mt-2 text-right"><Link href="/forgot-password" className="text-[13px] font-medium text-ink-2 underline underline-offset-4 hover:text-ink">Forgot password?</Link></div>}
        />
        {error && <p role="alert" className="alert alert-error">{error}</p>}
        <button className="btn btn-primary h-[54px]" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="mt-6 text-center text-[14px] text-muted">New here? <Link href="/register" className="font-medium text-ink underline underline-offset-4">Create an account</Link></p>
    </div>
  );
}
