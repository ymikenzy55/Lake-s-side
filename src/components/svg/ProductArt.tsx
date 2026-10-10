import Image from 'next/image';
import { Garment, type GarmentView } from './garments';

export const SVG_PREFIX = 'svg:';

export function isSvgArt(url: string | null | undefined): url is string {
  return !!url && url.startsWith(SVG_PREFIX);
}

export function artView(url: string): GarmentView {
  const v = url.slice(SVG_PREFIX.length);
  return (['front', 'back', 'detail', 'studio'].includes(v) ? v : 'front') as GarmentView;
}

interface Props {
  imageUrl?: string | null;
  garmentType?: string | null;
  /** Hex colour used to tint generated SVG artwork (e.g. the selected colour variant). */
  color?: string | null;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/**
 * Renders a product picture. Generated artwork (`svg:front`, `svg:back`, …) is vector and
 * tinted with `color`; real uploaded photos go through next/image.
 * The parent must be `position: relative` with a defined size.
 */
export function ProductArt({ imageUrl, garmentType, color, alt, sizes = '(max-width:768px) 50vw, 25vw', priority, className = '' }: Props) {
  if ((!imageUrl || isSvgArt(imageUrl)) && garmentType === 'other') {
    return (
      <div role="img" aria-label={alt} className={`absolute inset-0 grid place-items-center bg-surface text-muted ${className}`}>
        <svg width="34%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9ZM3.5 7.5 12 12l8.5-4.5M12 12v9" />
        </svg>
      </div>
    );
  }
  if (!imageUrl || isSvgArt(imageUrl)) {
    return (
      <Garment
        type={garmentType}
        color={color}
        view={imageUrl ? artView(imageUrl) : 'front'}
        title={alt}
        className={`absolute inset-0 h-full w-full p-[8%] ${className}`}
      />
    );
  }
  return <Image src={imageUrl} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />;
}
