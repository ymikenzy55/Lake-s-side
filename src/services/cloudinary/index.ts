// Server-side only Cloudinary functions
// DO NOT import this file in client components

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Upload an image to Cloudinary (SERVER-SIDE ONLY)
 */
export async function uploadImage(
  file: File | Buffer | string,
  folder: string = 'products'
): Promise<UploadResult> {
  try {
    let uploadSource: string;

    if (file instanceof File) {
      // Convert File to base64
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      uploadSource = `data:${file.type};base64,${buffer.toString('base64')}`;
    } else if (Buffer.isBuffer(file)) {
      // Convert Buffer to base64
      uploadSource = `data:image/jpeg;base64,${file.toString('base64')}`;
    } else {
      // Assume it's already a base64 string or URL
      uploadSource = file;
    }

    const result = await cloudinary.uploader.upload(uploadSource, {
      folder: `comfortfit/${folder}`,
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
        { width: 1200, height: 1600, crop: 'limit' },
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
}

/**
 * Delete an image from Cloudinary (SERVER-SIDE ONLY)
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image');
  }
}

/**
 * Validate image file
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 5MB.',
    };
  }

  return { valid: true };
}

export default cloudinary;
