import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-5 py-16">
      <div className="max-w-md text-center">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <p className="text-[96px] font-semibold leading-none tracking-[-0.06em] text-surface-2">404</p>
        <h1 className="-mt-2 text-[24px] font-semibold">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-muted">The link may be old, or the item may no longer be available.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/" className="btn btn-primary">Back to home</Link>
          <Link href="/products" className="btn btn-ghost">Browse the shop</Link>
        </div>
      </div>
    </div>
  );
}
