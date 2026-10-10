import { NextResponse } from 'next/server';
import { ProductService } from '@/domains/products/service';

export const dynamic = 'force-dynamic';

/** Paged product list for the home page's infinite scroll. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const page = Math.min(200, Math.max(1, Number(sp.get('page')) || 1));
  const limit = Math.min(24, Math.max(4, Number(sp.get('limit')) || 12));
  try {
    const { products, pagination } = await ProductService.getProducts({}, { page, limit, sort: 'newest' });
    return NextResponse.json({ products, hasMore: page < pagination.totalPages }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
  } catch {
    return NextResponse.json({ products: [], hasMore: false, error: true }, { status: 503 });
  }
}
