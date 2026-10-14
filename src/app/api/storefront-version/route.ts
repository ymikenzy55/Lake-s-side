import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { clearReadCache } from '@/lib/cache';
import { getStorefrontVersion } from '@/lib/storefront-version';

export const dynamic = 'force-dynamic';

// Last fingerprint this server instance saw.
let lastSeen: string | null = null;

/**
 * A tiny fingerprint of everything the storefront shows (products, variants, prices, photos, stock,
 * categories, hero slides, settings). Open pages poll it and refresh themselves when it changes.
 * Counts and available units are included because deletes and raw-SQL stock reservations don't
 * touch any updatedAt. Cached briefly at the CDN so many visitors cost one query. When the fingerprint
 * changes, this also invalidates the page caches so the browsers' refresh shows the new data.
 */
export async function GET() {
  try {
    const v = await getStorefrontVersion();
    // Something changed that didn't go through an admin save (an order taking stock, a webhook, another
    // server instance): drop the cached pages and reads now, so the refresh the browser is about to do
    // gets fresh data instead of waiting out the cache window.
    // (Also once after a cold start, when this instance can't know what its caches were built from.)
    if (v && v !== lastSeen) {
      clearReadCache();
      revalidatePath('/', 'layout');
    }
    if (v) lastSeen = v;
    return NextResponse.json(
      { v },
      { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=20' } },
    );
  } catch {
    return NextResponse.json({ v: null }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
