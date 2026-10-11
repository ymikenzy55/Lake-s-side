import Link from 'next/link';
import { Logo, LogoFull } from '@/components/brand/Logo';
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
      <div className="relative hidden overflow-hidden bg-black lg:block">
        <Image src="/photos/lakeside-crew.jpg" alt="Four people wearing The Lakeside tees" fill priority sizes="50vw" className="object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/30 to-black/80" />
        <p className="absolute left-10 top-10 text-[88px] font-medium leading-[0.86] tracking-[-0.06em] text-white drop-shadow-[0_6px_24px_rgba(0,0,0,.35)]">Calm<br />meets<br /><span className="text-lake-soft">clarity.</span></p>
        <div className="absolute bottom-10 left-10"><LogoFull width={260} className="rounded-2xl" /></div>
      </div>
    </div>
  );
}
