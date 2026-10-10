import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/admin/ui';
import { ProductEditor } from '@/components/admin/ProductEditor';

export const metadata = { title: 'New product' };

export default async function NewProductPage() {
  const [categories, sizes, colors] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { displayOrder: 'asc' }, select: { id: true, name: true } }),
    prisma.size.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
    prisma.color.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, hexCode: true } }),
  ]);
  return (
    <>
      <PageHeader title="New product" />
      <ProductEditor
        categories={categories}
        sizes={sizes}
        colors={colors.map((c) => ({ id: c.id, name: c.name, hex: c.hexCode }))}
        initial={{ name: '', description: '', categoryId: '', gender: 'UNISEX', garmentType: 'tee', material: '', careInfo: '', badge: '', tags: '', featured: false, isActive: true, images: [{ url: 'svg:front', colorId: null, alt: '' }, { url: 'svg:back', colorId: null, alt: '' }, { url: 'svg:detail', colorId: null, alt: '' }, { url: 'svg:studio', colorId: null, alt: '' }], variants: [] }}
      />
    </>
  );
}
