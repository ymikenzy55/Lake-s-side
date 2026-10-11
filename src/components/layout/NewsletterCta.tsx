'use client';

import { useState, useTransition } from 'react';
import { subscribeAction } from '@/domains/users/newsletter';

/** Dark rounded call-to-action block ("Ready to get our new stuff?"). */
export function NewsletterCta() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <section className="container-x mt-16 print:hidden" aria-labelledby="cta-h">
      <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#1b2540] via-[#0f1a33] to-[#0b1220] p-6 text-white md:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
        <div className="relative grid grid-cols-1 gap-8 md:grid-cols-[1.2fr_1fr] md:items-end">
          <div className="min-w-0">
            <h2 id="cta-h" className="text-[26px] font-semibold leading-tight md:text-[34px]">Be first to the<br />next drop.</h2>
            <form
              method="post"
              className="mt-6 flex max-w-md items-center gap-2 rounded-full bg-white/10 p-1.5 pl-4 ring-1 ring-white/15"
              onSubmit={(e) => {
                e.preventDefault();
                const email = String(new FormData(e.currentTarget).get('email') ?? '');
                const form = e.currentTarget;
                setMsg(null);
                start(async () => {
                  const r = await subscribeAction(email);
                  setMsg({ ok: r.ok, text: r.message });
                  if (r.ok) form.reset();
                });
              }}
            >
              <input name="email" type="email" required placeholder="Your email" aria-label="Email address" autoComplete="email" className="min-w-0 flex-1 bg-transparent text-[16px] text-white outline-none placeholder:text-white/50 md:text-[14px]" />
              <button className="btn !min-h-10 bg-white !text-ink hover:bg-[#dbe3f3]" disabled={pending}>{pending ? 'Sending…' : 'Send'}</button>
            </form>
            {msg && <p role="status" className={`mt-3 text-[13px] ${msg.ok ? 'text-white' : 'text-[#ffb4a9]'}`}>{msg.text}</p>}
          </div>
          <div className="min-w-0 text-[13px] leading-relaxed text-white/70 md:text-right">
            <p className="font-semibold text-white">Calm drops. Clear updates.</p>
            <p>Get first access to new drops, restocks and members-only offers. No spam, unsubscribe anytime.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
