import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/admin/ui';
import { ProductEditor } from '@/components/admin/ProductEditor';
import { ProductService } from '@/domains/products/service';
import { isUuid } from '@/lib/utils';

export const metadata = { title: 'Edit product' };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [product, categories, sizes, colors] = await Promise.all([
    ProductService.getProductById(id),
    prisma.category.findMany({ orderBy: { displayOrder: 'asc' }, select: { id: true, name: true } }),
    prisma.size.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
    prisma.color.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, hexCode: true } }),
  ]);
  if (!product) notFound();

  return (
    <>
      <Link href="/admin/products" className="mb-3 inline-flex h-11 items-center text-[14px] text-muted hover:text-ink">Back to products</Link>
      <PageHeader title={product.name} actions={<Link href={`/products/${product.slug}`} target="_blank" className="btn btn-ghost btn-sm">View in store</Link>} />
      <ProductEditor
        categories={categories}
        sizes={sizes}
        colors={colors.map((c) => ({ id: c.id, name: c.name, hex: c.hexCode }))}
        initial={{
          id: product.id,
          name: product.name,
          description: product.description ?? '',
          categoryId: product.categoryId,
          gender: product.gender,
          garmentType: product.garmentType,
          material: product.material ?? '',
          careInfo: product.careInfo ?? '',
          badge: product.badge ?? '',
          tags: product.tags.join(', '),
          featured: product.featured,
          isActive: product.isActive,
          images: product.images.map((i) => ({ url: i.imageUrl, colorId: i.colorId, alt: i.altText ?? '' })),
          variants: product.variants.map((v) => ({
            sizeId: v.sizeId, colorId: v.colorId, sku: v.sku, price: String(v.price), comparePrice: v.comparePrice ? String(v.comparePrice) : '',
            stock: String(v.inventory?.quantity ?? 0), lowStock: String(v.inventory?.lowStockThreshold ?? 5), isActive: v.isActive,
          })),
        }}
      />
    </>
  );
}
