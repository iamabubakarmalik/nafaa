'use client';

/**
 * Product photos: swipe on phones, thumbnails on desktop, hover zoom that
 * follows the cursor, and a full-screen viewer on tap. Jumps to the photo
 * of the chosen variant when the parent passes `focus`.
 */
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface GalleryImage {
  url: string;
  alt: string;
}

export function Gallery({ images, focus, zoom, layout }: { images: GalleryImage[]; focus: number; zoom: boolean; layout: 'thumbs' | 'grid' }) {
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  const [origin, setOrigin] = useState<string | null>(null);
  const row = useRef<HTMLDivElement>(null);

  const go = (k: number, smooth = true) => {
    const n = (k + images.length) % images.length;
    setI(n);
    const el = row.current;
    if (el) el.scrollTo({ left: (getComputedStyle(el).direction === 'rtl' ? -1 : 1) * n * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (focus >= 0 && focus < images.length) go(focus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  useEffect(() => {
    if (!full) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFull(false);
      if (e.key === 'ArrowRight') setI((x) => (x + 1) % images.length);
      if (e.key === 'ArrowLeft') setI((x) => (x - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', k);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', k);
      document.documentElement.style.overflow = '';
    };
  }, [full, images.length]);

  if (!images.length) return <div className="img-frame" />;

  const main = (
    <div className="relative">
      <div
        ref={row}
        className="snap-row rounded-card"
        onScroll={(e) => setI(Math.round(Math.abs(e.currentTarget.scrollLeft) / e.currentTarget.clientWidth))}
      >
        {images.map((im, k) => (
          <button
            key={k}
            type="button"
            className="img-frame relative w-full shrink-0 snap-start !rounded-none md:cursor-zoom-in"
            onClick={() => zoom && setFull(true)}
            onMouseMove={(e) => {
              if (!zoom || window.innerWidth < 1024) return;
              const r = e.currentTarget.getBoundingClientRect();
              setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
            }}
            onMouseLeave={() => setOrigin(null)}
            aria-label={im.alt}
          >
            <Image
              src={im.url}
              alt={im.alt}
              fill
              priority={k === 0}
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover transition-transform duration-200"
              style={origin && k === i ? { transform: 'scale(1.9)', transformOrigin: origin } : undefined}
            />
          </button>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 md:hidden">
            {images.map((_, k) => (
              <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-5 bg-fg' : 'w-1.5 bg-fg/30'}`} />
            ))}
          </div>
          <button type="button" onClick={() => go(i - 1)} aria-label="Previous" className="absolute start-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-bg/90 shadow md:grid">
            <ChevronLeft size={18} className="rtl:rotate-180" />
          </button>
          <button type="button" onClick={() => go(i + 1)} aria-label="Next" className="absolute end-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-bg/90 shadow md:grid">
            <ChevronRight size={18} className="rtl:rotate-180" />
          </button>
        </>
      )}
      {zoom && (
        <span className="pointer-events-none absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-bg/90 shadow md:hidden">
          <ZoomIn size={16} />
        </span>
      )}
    </div>
  );

  return (
    <>
      {layout === 'grid' && images.length > 1 ? (
        <>
          <div className="md:hidden">{main}</div>
          <div className="hidden grid-cols-2 gap-2 md:grid">
            {images.map((im, k) => (
              <button key={k} type="button" className={`img-frame relative cursor-zoom-in ${k === 0 && images.length % 2 === 1 ? 'col-span-2' : ''}`} onClick={() => { setI(k); if (zoom) setFull(true); }}>
                <Image src={im.url} alt={im.alt} fill priority={k === 0} sizes="(min-width: 1024px) 28vw, 50vw" className="object-cover" />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3 lg:flex-row-reverse">
          <div className="min-w-0 flex-1">{main}</div>
          {images.length > 1 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto lg:max-h-[640px] lg:w-[76px] lg:flex-col lg:overflow-y-auto">
              {images.map((im, k) => (
                <button key={k} type="button" onClick={() => go(k)} aria-label={`Image ${k + 1}`} className={`relative aspect-[4/5] w-[64px] shrink-0 overflow-hidden rounded-[calc(var(--r-card)*0.5)] bg-surface transition lg:w-full ${k === i ? 'ring-2 ring-fg' : 'opacity-70 hover:opacity-100'}`}>
                  <Image src={im.url} alt="" fill sizes="76px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {full && (
        <div className="fixed inset-0 z-[90] flex animate-fade-in flex-col bg-black" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between p-3 text-white">
            <span className="text-[13px] opacity-75">
              {i + 1} / {images.length}
            </span>
            <button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-white/10" onClick={() => setFull(false)} aria-label="Close">
              <X size={22} />
            </button>
          </div>
          <div className="relative flex-1 touch-pinch-zoom">
            <Image src={images[i]!.url} alt={images[i]!.alt} fill sizes="100vw" className="object-contain" />
            {images.length > 1 && (
              <>
                <button type="button" onClick={() => setI((i - 1 + images.length) % images.length)} aria-label="Previous" className="absolute start-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white">
                  <ChevronLeft size={24} className="rtl:rotate-180" />
                </button>
                <button type="button" onClick={() => setI((i + 1) % images.length)} aria-label="Next" className="absolute end-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white">
                  <ChevronRight size={24} className="rtl:rotate-180" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
