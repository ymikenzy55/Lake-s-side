import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/admin/ui';
import { TeamManager, type Member } from '@/components/admin/TeamManager';

export const metadata = { title: 'Admin team' };

export default async function TeamPage() {
  const me = await getSessionUser();
  if (!me || me.role !== 'SUPER_ADMIN') redirect('/admin/dashboard'); // super admins only

  const staff = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, lastLoginAt: true },
  });

  const members: Member[] = staff.map((u) => ({
    id: u.id,
    email: u.email,
    name: [u.firstName, u.lastName].filter(Boolean).join(' '),
    role: u.role as 'ADMIN' | 'SUPER_ADMIN',
    isActive: u.isActive,
    lastLogin: u.lastLoginAt ? u.lastLoginAt.toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' }) : null,
    isSelf: u.id === me.id,
  }));

  return (
    <>
      <PageHeader title="Admin team" subtitle="Add admins, change roles, reset passwords or remove access. Only super admins can see this page." />
      <TeamManager members={members} />
    </>
  );
}
