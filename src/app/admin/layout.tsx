import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata = { title: { default: 'Admin', template: '%s | Admin' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?redirect=/admin/dashboard');
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') redirect('/');

  return (
    <AdminShell name={[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email} role={user.role}>
      {children}
    </AdminShell>
  );
}
