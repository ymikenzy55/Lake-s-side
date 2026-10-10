import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ProductService, isNewProduct } from '@/domains/products/service';
import { ProductDetail, type DetailProduct } from '@/components/store/ProductDetail';
import { ProductCard } from '@/components/store/ProductCard';
import { breadcrumbJsonLd } from '@/components/ui/Breadcrumbs';
import { APP_URL } from '@/lib/constants';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await ProductService.getProductBySlug(slug);
  if (!product || !product.isActive) return { title: 'Product not found' };
  return {
    title: product.name,
    description: product.description?.slice(0, 160) || `Buy ${product.name} from Comfort_fit GH`,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await ProductService.getProductBySlug(slug);
  if (!product || !product.isActive) notFound();

  const related = await ProductService.getRelated(product.id, product.categoryId, 4);

  const data: DetailProduct = {
    id: product.id,
    name: product.name,
    description: product.description,
    material: product.material,
    careInfo: product.careInfo,
    badge: product.badge,
    garmentType: product.garmentType,
    category: product.category.name,
    categorySlug: product.category.slug,
    isNew: isNewProduct(product.createdAt),
    images: product.images.map((i) => ({ id: i.id, url: i.imageUrl, alt: i.altText, colorId: i.colorId })),
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      price: Number(v.price),
      comparePrice: v.comparePrice ? Number(v.comparePrice) : null,
      size: { id: v.size.id, name: v.size.name, sortOrder: v.size.sortOrder },
      color: { id: v.color.id, name: v.color.name, hex: v.color.hexCode ?? '#111111' },
      stock: Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0)),
    })),
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    category: product.category.name,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'GHS',
      lowPrice: Number(product.minPrice),
      availability: data.variants.some((v) => v.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd(
              [{ label: 'Home', href: '/' }, { label: 'Shop', href: '/products' }, { label: product.category.name, href: `/products?category=${product.category.slug}` }, { label: product.name }],
              APP_URL
            )
          ).replace(/</g, '\\u003c'),
        }}
      />
      <ProductDetail product={data} />
      {related.length > 0 && (
        <section className="container-x mt-20">
          <h2 className="mb-6 text-[22px] md:text-[24px]">You may also like</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
            {related.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
