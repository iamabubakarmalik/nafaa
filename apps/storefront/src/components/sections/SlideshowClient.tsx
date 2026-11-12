'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface Slide {
  id: string;
  image: string | null;
  mobileImage: string | null;
  heading: string;
  text: string;
  buttonLabel: string;
  buttonLink: string;
  align: 'left' | 'center' | 'right';
  overlay: number;
}

const H = {
  small: 'h-[380px] md:h-[440px]',
  medium: 'h-[460px] md:h-[560px]',
  large: 'h-[540px] md:h-[680px]',
} as const;

export function SlideshowClient({ slides, autoplay, interval, height, priority, rounded }: { slides: Slide[]; autoplay: boolean; interval: number; height: keyof typeof H; priority: boolean; rounded?: boolean }) {
  const [i, setI] = useState(0);
  const row = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const go = useCallback((n: number) => {
    const el = row.current;
    if (!el) return;
    const k = (n + slides.length) % slides.length;
    const dir = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
    el.scrollTo({ left: dir * k * el.clientWidth, behavior: 'smooth' });
  }, [slides.length]);

  useEffect(() => {
    if (!autoplay || slides.length < 2) return;
    const id = setInterval(() => !paused.current && go(i + 1), interval * 1000);
    return () => clearInterval(id);
  }, [autoplay, interval, i, go, slides.length]);

  return (
    <section className={`relative ${rounded ? 'overflow-hidden rounded-card' : ''}`} onMouseEnter={() => (paused.current = true)} onMouseLeave={() => (paused.current = false)}>
      <div ref={row} className={`snap-row ${H[height]}`} onScroll={(e) => setI(Math.round(Math.abs(e.currentTarget.scrollLeft) / e.currentTarget.clientWidth))}>
        {slides.map((s, k) => {
          const pos = s.align === 'center' ? 'items-center text-center' : s.align === 'right' ? 'items-end text-end' : 'items-start text-start';
          return (
            <div key={s.id} className="relative isolate flex h-full w-full shrink-0 snap-start overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-700">
              {s.image && <Image src={s.image} alt={s.heading} fill sizes="100vw" priority={priority && k === 0} className={`-z-10 object-cover ${s.mobileImage ? 'hidden md:block' : ''}`} />}
              {s.mobileImage && <Image src={s.mobileImage} alt={s.heading} fill sizes="100vw" priority={priority && k === 0} className="-z-10 object-cover md:hidden" />}
              <div className="absolute inset-0 -z-10" style={{ ['--o' as string]: s.overlay / 100, background: 'linear-gradient(90deg, rgb(0 0 0 / calc(var(--o) + 0.2)) 0%, rgb(0 0 0 / calc(var(--o) * 0.5)) 70%, transparent 100%)' }} />
              <div className={`page flex w-full flex-col justify-end pb-14 md:justify-center ${pos}`}>
                <div className="max-w-xl text-white">
                  {s.heading && <h2 className="h-display text-[2.2rem] font-semibold leading-[1.05] md:text-[3.5rem]">{s.heading}</h2>}
                  {s.text && <p className="mt-3 text-[16px] opacity-90 md:text-lg">{s.text}</p>}
                  {s.buttonLabel && (
                    <Link href={s.buttonLink} className="btn btn-lg btn-light mt-6">
                      {s.buttonLabel}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {slides.length > 1 && (
        <>
          <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
            {slides.map((s, k) => (
              <button key={s.id} type="button" aria-label={`Slide ${k + 1}`} onClick={() => go(k)} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-7 bg-white' : 'w-1.5 bg-white/50'}`} />
            ))}
          </div>
          <button type="button" aria-label="Previous" onClick={() => go(i - 1)} className="absolute start-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-neutral-900 shadow md:grid">
            <ChevronLeft size={20} className="rtl:rotate-180" />
          </button>
          <button type="button" aria-label="Next" onClick={() => go(i + 1)} className="absolute end-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-neutral-900 shadow md:grid">
            <ChevronRight size={20} className="rtl:rotate-180" />
          </button>
        </>
      )}
    </section>
  );
}
