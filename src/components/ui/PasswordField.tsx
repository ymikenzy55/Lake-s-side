'use client';

import { useId, useState } from 'react';

interface Props {
  label: string;
  name: string;
  autoComplete: 'current-password' | 'new-password';
  hint?: string;
  required?: boolean;
  minLength?: number;
  /** Rendered under the input, e.g. a "Forgot password?" link. */
  below?: React.ReactNode;
}

const Eye = ({ off }: { off: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

/** Password input with a show / hide eye button. Use for EVERY password field. */
export function PasswordField({ label, name, autoComplete, hint, required = true, minLength, below }: Props) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          maxLength={128}
          className="field pr-12"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <Eye off={show} />
        </button>
      </div>
      {hint && <p className="hint">{hint}</p>}
      {below}
    </div>
  );
}
