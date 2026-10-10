'use client';

import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Accessible confirmation modal (replaces window.confirm). Esc / backdrop click cancels. */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, busy, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] grid place-items-end justify-items-center p-3 sm:place-items-center" role="alertdialog" aria-modal="true" aria-labelledby="cd-title" aria-describedby="cd-msg">
      <button type="button" aria-label="Close dialog" className="anim-fade absolute inset-0 bg-black/45" onClick={onCancel} tabIndex={-1} />
      <div className="anim-rise relative w-full max-w-sm rounded-[22px] bg-white p-6 shadow-2xl">
        <h2 id="cd-title" className="text-[19px] font-semibold">{title}</h2>
        <p id="cd-msg" className="mt-2 text-[14px] leading-relaxed text-muted">{message}</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button ref={cancelRef} type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button type="button" className={danger ? 'btn border border-danger bg-danger text-white hover:opacity-90' : 'btn btn-primary'} onClick={onConfirm} disabled={busy}>
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
