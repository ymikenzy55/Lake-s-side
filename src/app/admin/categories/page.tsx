import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/admin/ui';
import { CategoriesManager } from '@/components/admin/managers';

export const metadata = { title: 'Categories' };

export default async function CategoriesPage() {
  const cats = await prisma.category.findMany({ orderBy: { displayOrder: 'asc' }, include: { _count: { select: { products: true } } } });
  return (
    <>
      <PageHeader title="Categories" subtitle="These appear in the store menu and filters" />
      <CategoriesManager items={cats.map((c) => ({ id: c.id, name: c.name, description: c.description ?? '', displayOrder: String(c.displayOrder), isActive: c.isActive, count: String(c._count.products) }))} />
    </>
  );
}
