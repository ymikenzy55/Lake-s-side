'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { forgotPasswordAction } from '@/domains/auth/actions';

const COOLDOWN = 60;

export default function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [wait, setWait] = useState(0);
  const [pending, start] = useTransition();

  // resend cooldown
  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(id);
  }, [wait]);

  function send(email: string) {
    setError('');
    start(async () => {
      const r = await forgotPasswordAction({ email });
      if (r.success) {
        setSentTo(email);
        setWait(COOLDOWN);
      } else setError(r.error ?? 'Something went wrong');
    });
  }

  if (sentTo) {
    return (
      <div>
        <h1 className="text-[32px] font-semibold">Check your email</h1>
        <p className="mt-3 text-muted">
          If an account exists for <b className="text-ink">{sentTo}</b>, we have sent a link to reset your password. The link works once and expires in 1 hour.
        </p>
        <p className="mt-2 text-[13px] text-muted">Nothing there? Check your spam folder, or wait a minute and resend.</p>
        {error && <p role="alert" className="alert alert-error mt-4">{error}</p>}
        <div className="mt-6 grid gap-2">
          <button className="btn btn-ghost" disabled={pending || wait > 0} onClick={() => send(sentTo)}>
            {pending ? 'Sending…' : wait > 0 ? `Resend email in ${wait}s` : 'Resend email'}
          </button>
          <button className="btn btn-soft" onClick={() => setSentTo('')}>Use a different email</button>
          <Link href="/login" className="btn btn-primary">Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[32px] font-semibold">Forgot password?</h1>
      <p className="mt-2 text-muted">Enter the email you registered with and we will send you a link to choose a new password.</p>
      <form
        method="post"
        className="mt-7 grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(String(new FormData(e.currentTarget).get('email') ?? '').trim());
        }}
      >
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" autoFocus maxLength={160} className="field" />
        </div>
        {error && <p role="alert" className="alert alert-error">{error}</p>}
        <button className="btn btn-primary h-12" disabled={pending}>{pending ? 'Sending…' : 'Send reset link'}</button>
      </form>
      <p className="mt-6 text-center text-[13px] text-muted">
        Remembered it? <Link href="/login" className="font-medium text-ink underline underline-offset-4">Back to sign in</Link>
      </p>
    </div>
  );
}
