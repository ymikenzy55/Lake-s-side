'use client';

import { useState } from 'react';

/** Shows the tracking ID with a one-tap copy button. */
export function CopyId({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white py-1.5 pl-4 pr-1.5">
      <span className="font-mono text-[15px] font-bold tracking-wider">{value}</span>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setDone(true);
            window.setTimeout(() => setDone(false), 1800);
          } catch {
            /* clipboard blocked: the ID is still visible */
          }
        }}
        className="btn btn-soft btn-sm"
        aria-live="polite"
      >
        {done ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
