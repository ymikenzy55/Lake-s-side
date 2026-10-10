import Image from 'next/image';

/**
 * Full-width photo banner that sits UNDER the floating nav, with a giant white word whose lower part
 * is hidden by the search tab that follows it (exactly like the reference "Shop" header).
 */
export function PageBanner({ word, image = '/photos/banner-shop.jpg' }: { word: string; image?: string }) {
  return (
    <div className="relative -mt-[var(--nav-h)] h-[290px] overflow-hidden bg-ink sm:h-[350px] md:h-[430px]">
      <Image src={image} alt="" fill priority sizes="100vw" className="object-cover object-[50%_40%]" />
      <div className="absolute inset-0 bg-[#0b1220]/25" />
      <p
        aria-hidden
        className="pointer-events-none absolute bottom-[-0.2em] left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-semibold leading-[0.8] tracking-[-0.06em] text-white"
        style={{ fontSize: 'clamp(150px, 31vw, 430px)' }}
      >
        {word}
      </p>
      <h1 className="sr-only">{word}</h1>
    </div>
  );
}
