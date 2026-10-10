import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/admin/ui';
import { AccountForms } from '@/components/store/AccountForms';

export const metadata = { title: 'My account' };

export default async function AdminAccountPage() {
  const me = await getSessionUser();
  if (!me) redirect('/login?redirect=/admin/account');
  const p = await prisma.user.findUnique({ where: { id: me.id }, select: { firstName: true, lastName: true, phone: true, email: true } });
  return (
    <>
      <PageHeader title="My account" subtitle={me.role === 'SUPER_ADMIN' ? 'Super admin profile and password' : 'Admin profile and password'} />
      <div className="max-w-xl">
        <AccountForms profile={{ firstName: p?.firstName ?? '', lastName: p?.lastName ?? '', phone: p?.phone ?? '', email: p?.email ?? '' }} />
      </div>
    </>
  );
}
