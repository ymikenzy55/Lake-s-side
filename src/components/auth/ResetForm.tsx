'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { resetPasswordAction } from '@/domains/auth/actions';
import { PasswordField } from '@/components/ui/PasswordField';

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  return (
    <div>
      <h1 className="text-[40px]">New password</h1>
      <p className="mt-2 text-muted">Choose a strong password you have not used before.</p>
      <form method="post"
        className="mt-7 grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError('');
          const f = new FormData(e.currentTarget);
          start(async () => {
            const r = await resetPasswordAction({ token, password: String(f.get('password')), confirmPassword: String(f.get('confirm')) });
            if (r.success) router.push('/login?reset=1');
            else setError(r.error ?? 'Could not reset password');
          });
        }}
      >
        <PasswordField label="New password" name="password" autoComplete="new-password" minLength={8} hint="8+ characters with upper and lower case letters and a number." />
        <PasswordField label="Confirm new password" name="confirm" autoComplete="new-password" minLength={8} />
        {error && <p role="alert" className="alert alert-error">{error} {error.includes('expired') && <Link href="/forgot-password" className="font-semibold underline">Request a new link</Link>}</p>}
        <button className="btn btn-primary h-[54px]" disabled={pending}>{pending ? 'Saving…' : 'Update password'}</button>
      </form>
    </div>
  );
}
