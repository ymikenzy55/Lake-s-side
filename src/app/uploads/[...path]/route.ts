import { readFile } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const SAFE = /^[a-z0-9][a-z0-9._-]{0,120}$/i;

/**
 * Serves admin-uploaded images from the uploads/ folder. Next.js only serves files that were in
 * /public at build time, so images uploaded while the site is running must come through a route.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segs } = await params;
  if (!segs?.length || segs.length > 3 || !segs.every((s) => SAFE.test(s))) return new Response('Not found', { status: 404 });
  const type = TYPES[path.extname(segs[segs.length - 1]).toLowerCase()];
  if (!type) return new Response('Not found', { status: 404 });
  const root = path.join(process.cwd(), 'uploads');
  const file = path.join(root, ...segs);
  if (!file.startsWith(root + path.sep)) return new Response('Not found', { status: 404 });
  try {
    const data = await readFile(file);
    return new Response(new Uint8Array(data), {
      headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
