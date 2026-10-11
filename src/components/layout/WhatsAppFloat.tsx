'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { IconClose, IconWhatsApp } from './Icons';
import { whatsappLink } from '@/lib/social';

/** Floating "chat with us" button. With several numbers it opens a small picker. */
export function WhatsAppFloat({ numbers }: { numbers: string[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!numbers.length || path.startsWith('/checkout')) return null;

  const message = () => {
    const page = typeof window !== 'undefined' ? window.location.href : '';
    return path.startsWith('/products/') ? `Hi The Lakeside, I'm interested in this tee: ${page}` : 'Hi The Lakeside, ';
  };
  const single = numbers.length === 1;

  return (
    <div ref={box} className="fixed bottom-24 right-4 z-50 print:hidden md:bottom-6 md:right-6">
      {open && !single && (
        <div role="menu" className="anim-rise absolute bottom-[68px] right-0 w-56 rounded-2xl border border-line bg-white p-2 shadow-[0_24px_44px_-20px_rgba(0,0,0,.45)]">
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Chat with us</p>
          {numbers.map((n, i) => (
            <a
              key={n}
              role="menuitem"
              href={whatsappLink(n, message())}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors hover:bg-surface"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#25D366] text-white"><IconWhatsApp width={18} height={18} /></span>
              WhatsApp line {i + 1}
            </a>
          ))}
        </div>
      )}
      {single ? (
        <a
          href={whatsappLink(numbers[0], message())}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="wa-pulse grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_14px_30px_-10px_rgba(37,211,102,.8)] transition-transform hover:scale-105"
        >
          <IconWhatsApp width={28} height={28} />
        </a>
      ) : (
        <button
          type="button"
          aria-label={open ? 'Close WhatsApp menu' : 'Chat with us on WhatsApp'}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((o) => !o)}
          className={`grid h-14 w-14 place-items-center rounded-full text-white shadow-[0_14px_30px_-10px_rgba(37,211,102,.8)] transition-all hover:scale-105 ${open ? 'bg-ink' : 'wa-pulse bg-[#25D366]'}`}
        >
          {open ? <IconClose /> : <IconWhatsApp width={28} height={28} />}
        </button>
      )}
    </div>
  );
}
