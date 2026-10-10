import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth/session';
import { rateLimit } from '@/lib/security/rate-limit';
import { storeImage, UploadError } from '@/services/storage';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    if (!rateLimit(`upload:${user.id}`, 60, 10 * 60_000).ok) {
      return NextResponse.json({ error: 'Too many uploads. Slow down.' }, { status: 429 });
    }
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No file received' }, { status: 400 });
    const folder = form.get('folder') === 'hero' ? 'hero' : 'products';
    const url = await storeImage(file, folder);
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error('upload failed', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
