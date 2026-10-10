'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import type { FormResult } from '@/domains/admin/guard';

/** Runs an admin server action, tracks pending state, shows its message and refreshes the page data. */
export function useAdminRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = useCallback(
    (fn: () => Promise<FormResult>, opts: { confirm?: string; onDone?: (r: FormResult) => void } = {}) => {
      if (opts.confirm && !window.confirm(opts.confirm)) return;
      setMsg(null);
      start(async () => {
        const r = await fn();
        setMsg(r.message || !r.ok ? { ok: r.ok, text: r.message ?? 'Failed' } : null);
        if (r.ok) router.refresh();
        opts.onDone?.(r);
      });
    },
    [router]
  );
  return { run, pending, msg, setMsg };
}

export function Flash({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <p role="status" className={`alert ${msg.ok ? 'alert-ok' : 'alert-error'}`}>
      {msg.text}
    </p>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-[14px]">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-ink' : 'bg-surface-2'} disabled:opacity-50`}
      >
        <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
      <span>{label}</span>
    </label>
  );
}

/** Uploads an image to /api/admin/upload and reports the stored URL. */
export function ImageUploader({ folder = 'products', onUploaded, label = 'Upload photo' }: { folder?: 'products' | 'hero'; onUploaded: (url: string) => void; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  return (
    <div>
      <label className={`btn btn-ghost btn-sm cursor-pointer ${busy ? 'opacity-50' : ''}`}>
        {busy ? 'Uploading…' : label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            setBusy(true);
            setErr('');
            try {
              const fd = new FormData();
              fd.set('file', file);
              fd.set('folder', folder);
              const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Upload failed');
              onUploaded(data.url);
            } catch (er) {
              setErr((er as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {err && <p className="mt-1 text-[12px] text-danger">{err}</p>}
    </div>
  );
}
