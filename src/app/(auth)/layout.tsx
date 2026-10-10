import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import Image from 'next/image';
import { BackButton } from '@/components/layout/BackButton';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><BackButton hideOn={[]} /><Logo /></div>
          <Link href="/" className="text-[13px] text-muted hover:text-ink">Back to store</Link>
        </div>
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">{children}</div>
      </div>
      <div className="relative hidden overflow-hidden bg-surface lg:block">
        <Image src="/photos/cloud-crew-sweatshirt-1.jpg" alt="Model in a Comfort_fit sweatshirt" fill priority sizes="50vw" className="object-cover" />
        <p className="absolute left-10 top-10 text-[88px] font-medium leading-[0.86] tracking-[-0.06em] text-white drop-shadow-[0_6px_24px_rgba(0,0,0,.35)]">Wear the<br />comfort.</p>
      </div>
    </div>
  );
}
