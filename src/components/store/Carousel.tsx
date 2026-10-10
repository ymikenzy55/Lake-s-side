'use client';

import { useRef } from 'react';

/** Horizontal scroll-snap row with prev/next arrows ("Explore our recommendations"). */
export function Carousel({ title, children }: { title: string; children: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' });
  };
  const arrow = 'grid h-9 w-9 place-items-center rounded-full border border-line bg-white transition-colors hover:border-ink hover:bg-ink hover:text-white';

  return (
    <section className="container-x mt-14" aria-label={title}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[20px] font-bold tracking-tight md:text-[22px]">{title}</h2>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous" onClick={() => scroll(-1)} className={arrow}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button type="button" aria-label="Next" onClick={() => scroll(1)} className={arrow}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>
      <div ref={track} className="hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        {children}
      </div>
    </section>
  );
}
