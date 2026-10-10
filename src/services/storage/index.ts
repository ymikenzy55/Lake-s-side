import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomToken } from '@/lib/security/tokens';
import { MAX_IMAGE_SIZE } from '@/lib/constants';

export class UploadError extends Error {}

/** Detect the real image type from magic bytes (never trust the client's MIME / filename). */
function sniff(buf: Buffer): { ext: 'jpg' | 'png' | 'webp'; mime: string } | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  return null;
}

const cloudinaryReady = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET && !process.env.CLOUDINARY_API_KEY.includes('xxxx'));

/**
 * Stores an uploaded image. Uses Cloudinary when configured, otherwise the local
 * `uploads/` folder (served by /uploads/[...path]) (fine for a VPS / dev; use Cloudinary on serverless hosts).
 */
export async function storeImage(file: File, folder = 'products'): Promise<string> {
  if (file.size === 0) throw new UploadError('The file is empty');
  if (file.size > MAX_IMAGE_SIZE) throw new UploadError('Image must be 4MB or smaller');
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind) throw new UploadError('Only JPG, PNG or WebP images are allowed');

  if (cloudinaryReady()) {
    const { uploadImage } = await import('@/services/cloudinary');
    return (await uploadImage(`data:${kind.mime};base64,${buf.toString('base64')}`, folder)).url;
  }

  const safeFolder = folder.replace(/[^a-z0-9-]/gi, '');
  const dir = path.join(process.cwd(), 'uploads', safeFolder);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now().toString(36)}-${randomToken(6)}.${kind.ext}`;
  await writeFile(path.join(dir, name), buf);
  return `/uploads/${safeFolder}/${name}`;
}
