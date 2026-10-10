'use client';

import { useState, useTransition } from 'react';
import { sendContactAction } from '@/domains/contact/actions';

export function ContactForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setError('');
    start(async () => {
      const r = await sendContactAction({
        name: String(f.get('name') ?? ''),
        email: String(f.get('email') ?? ''),
        phone: String(f.get('phone') ?? ''),
        subject: String(f.get('subject') ?? ''),
        message: String(f.get('message') ?? ''),
        website: String(f.get('website') ?? ''),
      });
      if (r.ok) {
        setSent(true);
        form.reset();
      } else setError(r.message ?? 'Could not send your message.');
    });
  }

  if (sent) {
    return (
      <div className="card-soft p-8 text-center" role="status">
        <p className="text-[20px] font-semibold">Message sent. Thank you!</p>
        <p className="mt-2 text-[14px] text-muted">We usually reply within one working day.</p>
        <button type="button" className="btn btn-ghost btn-sm mt-5" onClick={() => setSent(false)}>Send another message</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} method="post" className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[13px] font-medium">Your name<input name="name" required minLength={2} maxLength={80} autoComplete="name" className="field" /></label>
        <label className="grid gap-1.5 text-[13px] font-medium">Email<input name="email" type="email" required maxLength={160} autoComplete="email" className="field" /></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[13px] font-medium">Phone (optional)<input name="phone" type="tel" maxLength={30} autoComplete="tel" className="field" /></label>
        <label className="grid gap-1.5 text-[13px] font-medium">Subject<input name="subject" required minLength={3} maxLength={120} className="field" /></label>
      </div>
      <label className="grid gap-1.5 text-[13px] font-medium">Message<textarea name="message" required minLength={10} maxLength={2000} rows={6} className="field h-auto py-3" /></label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      {error && <p role="alert" className="alert alert-error">{error}</p>}
      <button className="btn btn-primary w-full sm:w-fit" disabled={pending}>{pending ? 'Sending…' : 'Send message'}</button>
    </form>
  );
}
