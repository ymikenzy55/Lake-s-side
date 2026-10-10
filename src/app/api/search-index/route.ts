import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cachedRead } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export interface SearchItem {
  n: string; // name
  s: string; // slug
  c: string; // category
  p: number; // from price
  i: string | null; // image
  g: string; // garment type (for generated art)
  h: string | null; // first colour hex
  t: string; // tags, space separated
}

/**
 * Compact catalogue index for the instant search box. The browser downloads it once and filters
 * locally on every keystroke, so typing never waits on the network or the database.
 */
export async function GET() {
  const items = await cachedRead<SearchItem[]>('search-index', 60_000, async () => {
    const rows = await prisma.product.findMany({
      where: { isActive: true },
      take: 2000,
      orderBy: { createdAt: 'desc' },
      relationLoadStrategy: 'join',
      select: {
        name: true,
        slug: true,
        garmentType: true,
        minPrice: true,
        tags: true,
        category: { select: { name: true } },
        images: { orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }], take: 1, select: { imageUrl: true } },
        variants: { where: { isActive: true }, take: 1, select: { color: { select: { hexCode: true } } } },
      },
    });
    return rows.map((r) => ({
      n: r.name,
      s: r.slug,
      c: r.category.name,
      p: Number(r.minPrice),
      i: r.images[0]?.imageUrl ?? null,
      g: r.garmentType,
      h: r.variants[0]?.color.hexCode ?? null,
      t: r.tags.join(' '),
    }));
  });
  return NextResponse.json(items, { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=300' } });
}
