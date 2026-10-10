'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface HeroSlideView {
  id: string;
  line1: string;
  line2: string | null;
  line3: string | null;
  line4: string | null;
  tagline: string | null;
  subtitle: string | null;
  ctaLabel: string;
  ctaHref: string;
  garment: string;
  garmentColor: string;
  bgFrom: string;
  bgTo: string;
  imageUrl: string | null;
}

const MIN_MS = 1500;
const MAX_MS = 4000; // product requirement: slides change after 4s at most

/** Clean photo banner with a giant white word cropped by the bottom edge. Slides auto-advance. */
export function HeroSlider({ slides, autoplayMs = 4000 }: { slides: HeroSlideView[]; autoplayMs?: number }) {
  const interval = Math.min(MAX_MS, Math.max(MIN_MS, autoplayMs));
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads a browser-only media query once on mount
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    if (count < 2 || paused || reduced) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => window.clearInterval(id);
  }, [count, paused, reduced, interval, index]);

  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const go = useCallback((n: number) => setIndex(((n % count) + count) % count), [count]);

  if (count === 0) return null;

  return (
    <>
      <section
        aria-roledescription="carousel"
        aria-label="Featured collections"
        className="relative isolate -mt-[var(--nav-h)] overflow-hidden bg-ink"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        <div className="relative h-[400px] sm:h-[440px] md:h-[500px]">
          {slides.map((s, i) => {
            const active = i === index;
            const meta = [s.line2, s.line3, s.line4].filter(Boolean).join(' · ');
            return (
              <div
                key={s.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
                aria-hidden={!active}
                className={`absolute inset-0 transition-opacity duration-700 ease-out ${active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                style={{ background: `linear-gradient(135deg, ${s.bgFrom}, ${s.bgTo})` }}
              >
                {s.imageUrl && (
                  <Image src={s.imageUrl} alt="" fill priority={i === 0} sizes="(max-width:1180px) 100vw, 1180px" className="object-cover object-[50%_40%]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220]/35 via-[#0b1220]/10 to-[#0b1220]/25" />

                {/* giant word, cropped by the bottom edge */}
                <p
                  aria-hidden
                  className="pointer-events-none absolute bottom-[68px] left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-semibold leading-[0.95] tracking-[-0.06em] text-white md:bottom-[84px]"
                  // fully visible: sized from the word length so short words are huge and long ones still fit
                  style={{ fontSize: `min(${Math.max(14, Math.round(165 / Math.max(3, s.line1.length)))}vw, 270px)` }}
                >
                  {s.line1}
                </p>

                <div className="absolute inset-x-0 top-[calc(var(--nav-h)+8px)] mx-auto flex max-w-[1180px] flex-col items-start gap-3 px-4 sm:flex-row sm:justify-between sm:gap-4 md:px-7">
                  <div className="max-w-sm text-white">
                    {meta && <p className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold backdrop-blur">{meta}</p>}
                    {s.tagline && <p className="mt-3 text-[16px] font-semibold leading-snug md:text-[20px]">{s.tagline}</p>}
                    {s.subtitle && <p className="mt-1 hidden text-[13px] text-white/80 sm:block">{s.subtitle}</p>}
                  </div>
                  <Link href={s.ctaHref} tabIndex={active ? 0 : -1} className="btn !min-h-9 shrink-0 bg-white !px-4 !text-ink hover:bg-[#dbe3f3] sm:!min-h-10 sm:!px-5">
                    {s.ctaLabel}
                  </Link>
                </div>
              </div>
            );
          })}

          {count > 1 && (
            <div className="absolute bottom-3 right-4 z-10 flex items-center gap-1.5 md:bottom-4" role="tablist" aria-label="Choose slide">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Show slide ${i + 1}`}
                  onClick={() => go(i)}
                  className="relative h-1.5 overflow-hidden rounded-full bg-white/35 transition-all duration-300"
                  style={{ width: i === index ? 30 : 10 }}
                >
                  {i === index && (
                    <span
                      key={`${index}-${paused}`}
                      className="absolute inset-y-0 left-0 rounded-full bg-white"
                      style={{ width: reduced || paused ? '100%' : undefined, animation: reduced || paused ? undefined : `hero-fill ${interval}ms linear forwards` }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
