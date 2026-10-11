'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { registerAction } from '@/domains/auth/actions';
import { PasswordField } from '@/components/ui/PasswordField';
import { GoogleButton } from './GoogleButton';

export function RegisterForm({ google = false }: { google?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  return (
    <div>
      <h1 className="text-[40px]">Create account</h1>
      <p className="mt-2 text-muted">Track orders, save your details and check out in seconds.</p>
      {google && <div className="mt-7"><GoogleButton label="Sign up with Google" /></div>}
      <form method="post"
        className={`${google ? "" : "mt-7 "}grid gap-4`}
        onSubmit={(e) => {
          e.preventDefault();
          setError('');
          const f = new FormData(e.currentTarget);
          if (String(f.get('password')) !== String(f.get('confirm'))) return setError("Passwords don't match");
          start(async () => {
            const r = await registerAction({
              firstName: String(f.get('firstName')),
              lastName: String(f.get('lastName')),
              email: String(f.get('email')),
              phone: String(f.get('phone')),
              password: String(f.get('password')),
            });
            if (!r.success) return setError(r.error ?? 'Registration failed');
            window.dispatchEvent(new Event('cart:changed'));
            router.push('/');
            router.refresh();
          });
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="fn">First name</label><input id="fn" name="firstName" required minLength={2} autoComplete="given-name" className="field" /></div>
          <div><label className="label" htmlFor="ln">Last name</label><input id="ln" name="lastName" autoComplete="family-name" className="field" /></div>
        </div>
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="field" /></div>
        <div><label className="label" htmlFor="phone">Phone (optional)</label><input id="phone" name="phone" type="tel" autoComplete="tel" className="field" /></div>
        <PasswordField label="Password" name="password" autoComplete="new-password" minLength={8} hint="8+ characters with upper and lower case letters and a number." />
        <PasswordField label="Confirm password" name="confirm" autoComplete="new-password" minLength={8} />
        {error && <p role="alert" className="alert alert-error">{error}</p>}
        <button className="btn btn-primary h-[54px]" disabled={pending}>{pending ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="mt-6 text-center text-[14px] text-muted">Already have an account? <Link href="/login" className="font-medium text-ink underline underline-offset-4">Sign in</Link></p>
    </div>
  );
}
