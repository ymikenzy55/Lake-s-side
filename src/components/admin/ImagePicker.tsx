'use client';

import { useRef, useState } from 'react';

/**
 * File picker for product photos: tap to choose several images from the phone / computer
 * (or drag them in). Each file is uploaded and reported through onUploaded(url).
 */
export function ImagePicker({ onUploaded, folder = 'products', max = 20 }: { onUploaded: (url: string) => void; folder?: 'products' | 'hero'; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function upload(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, max);
    if (!list.length) return setError('Please choose image files (JPG, PNG or WebP).');
    setBusy(true);
    setError('');
    let done = 0;
    for (const file of list) {
      setStatus(`Uploading ${done + 1} of ${list.length}…`);
      try {
        const fd = new FormData();
        fd.set('file', file);
        fd.set('folder', folder);
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        onUploaded(data.url);
        done++;
      } catch (e) {
        setError(`${file.name}: ${(e as Error).message}`);
      }
    }
    setBusy(false);
    setStatus(done ? `${done} photo${done === 1 ? '' : 's'} added` : '');
    if (input.current) input.current.value = '';
  }

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); void upload(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${drag ? 'border-ink bg-surface' : 'border-line hover:border-ink hover:bg-surface'} ${busy ? 'pointer-events-none opacity-60' : ''}`}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-muted">
          <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="1.6" /><path d="m21 15-5-5L5 21" />
        </svg>
        <span className="text-[14px] font-semibold">{busy ? status : 'Choose photos'}</span>
        <span className="text-[12px] text-muted">Tap to pick from your device, or drag them here. JPG, PNG or WebP, up to 4 MB each.</span>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy} onChange={(e) => e.target.files && void upload(e.target.files)} />
      </label>
      <p role="status" className="mt-1.5 min-h-4 text-[12px] text-ok">{!busy && status}</p>
      {error && <p role="alert" className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}
