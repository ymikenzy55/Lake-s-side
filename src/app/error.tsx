'use client';

import Link from 'next/link';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-5 py-16">
      <div className="max-w-md text-center">
        <h1 className="text-[24px] font-semibold">Something went wrong</h1>
        <p className="mt-2 text-muted">We hit a snag loading this page. It is usually temporary, so please try again.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={reset} className="btn btn-primary">Try again</button>
          <Link href="/" className="btn btn-ghost">Back to home</Link>
        </div>
      </div>
    </div>
  );
}
