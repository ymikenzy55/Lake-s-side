import Link from 'next/link';
import { ResetForm } from '@/components/auth/ResetForm';

export const metadata = { title: 'Reset password', robots: { index: false }, referrer: 'no-referrer' as const };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token || token.length < 20 || token.length > 200) {
    return (
      <div>
        <h1 className="text-[40px]">Link invalid</h1>
        <p className="mt-3 text-muted">This password reset link is missing or malformed. Request a new one.</p>
        <Link href="/forgot-password" className="btn btn-primary mt-7 w-full">Request a new link</Link>
      </div>
    );
  }
  return <ResetForm token={token} />;
}
