import { useState } from 'react';
import { ChevronLeft, ChevronRight, ShoppingBag, Play } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ProductGalleryProps {
  images: string[];
  videos?: string[];
  productName: string;
}

export function ProductGallery({ images, videos = [], productName }: ProductGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const media = [
    ...images.map((url) => ({ type: 'image' as const, url })),
    ...videos.map((url) => ({ type: 'video' as const, url })),
  ];

  if (media.length === 0) {
    return (
      <div className="aspect-square rounded-3xl bg-surface-muted flex items-center justify-center">
        <ShoppingBag className="h-16 w-16 text-content-subtle" />
      </div>
    );
  }

  const active = media[activeIdx];

  return (
    <div className="space-y-3">
      {/* Main media */}
      <div className="relative aspect-square rounded-3xl bg-surface-muted overflow-hidden group">
        {active.type === 'video' ? (
          <video src={active.url} controls className="h-full w-full object-contain" />
        ) : (
          <img
            src={active.url}
            alt={productName}
            className="h-full w-full object-contain"
          />
        )}

        {media.length > 1 && (
          <>
            <button
              onClick={() => setActiveIdx((i) => (i - 1 + media.length) % media.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-surface/90 backdrop-blur-md shadow-lg border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setActiveIdx((i) => (i + 1) % media.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-surface/90 backdrop-blur-md shadow-lg border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {media.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === activeIdx ? 'w-8 bg-brand-600' : 'w-1.5 bg-content-subtle/40',
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {media.map((m, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={cn(
                'shrink-0 h-16 w-16 rounded-2xl overflow-hidden border-2 transition relative bg-surface-muted',
                i === activeIdx ? 'border-brand-600 ring-2 ring-brand-500/20' : 'border-border',
              )}
            >
              {m.type === 'image' ? (
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <>
                  <video src={m.url} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="h-5 w-5 text-white fill-white" />
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
