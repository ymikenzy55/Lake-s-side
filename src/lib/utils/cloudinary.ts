/**
 * Client-safe Cloudinary utility functions
 * These functions can be used in both client and server components
 */

/**
 * Generate a transformation URL for an existing Cloudinary image
 * This is a pure string manipulation function - no API calls
 */
export function getOptimizedImageUrl(
  url: string,
  width?: number,
  height?: number
): string {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  const transformations = [];
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  transformations.push('c_limit', 'q_auto', 'f_auto');

  const transformString = transformations.join(',');
  return url.replace('/upload/', `/upload/${transformString}/`);
}

/**
 * Get Cloudinary public ID from URL
 */
export function getPublicIdFromUrl(url: string): string | null {
  if (!url.includes('cloudinary.com')) {
    return null;
  }

  const regex = /\/v\d+\/(.+)\.\w+$/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
