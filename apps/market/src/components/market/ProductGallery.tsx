'use client';
/** Product images: main picture with thumbnails; swipeable strip on phones. */
import { useState } from 'react';
import { Img, cn } from '@/components/ui';
import type { Gate } from '@/lib/types';
import { GATE_LOOK } from '@/lib/site';
import { GateIcon } from './GateIcon';

export function ProductGallery({ images, name, gate }: { images: string[]; name: string; gate: Gate }) {
  const [i, setI] = useState(0);
  const color = GATE_LOOK[gate].color;
  if (!images.length) {
    return <Img src={null} alt={name} color={color} className="aspect-square rounded-3xl" fallback={<GateIcon gate={gate} className="h-20 w-20 opacity-50" />} />;
  }
  return (
    <div>
      <Img src={images[i]} alt={name} color={color} priority sizes="(max-width: 768px) 100vw, 50vw" className="aspect-square rounded-3xl" />
      {images.length > 1 && (
        <div className="scroll-x mt-3">
          {images.map((src, k) => (
            <button key={src} type="button" onClick={() => setI(k)} aria-label={`${name} ${k + 1}`} className={cn('shrink-0 overflow-hidden rounded-xl ring-2', k === i ? 'ring-brand-500' : 'ring-transparent')}>
              <Img src={src} alt="" sizes="72px" className="h-16 w-16" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
