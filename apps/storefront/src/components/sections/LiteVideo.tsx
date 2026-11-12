'use client';

import Image from 'next/image';
import { Play } from 'lucide-react';
import { useState } from 'react';

/** Poster first, the player only after a tap: keeps YouTube's heavy script off the first load. */
export function LiteVideo({ embed, file, poster, title, autoplay }: { embed: string | null; file: string | null; poster: string | null; title: string; autoplay?: boolean }) {
  const [play, setPlay] = useState(!!autoplay);
  return (
    <div className="relative aspect-video overflow-hidden rounded-card bg-black">
      {file ? (
        <video src={file} poster={poster ?? undefined} controls playsInline autoPlay={!!autoplay} muted={!!autoplay} loop={!!autoplay} preload={autoplay ? 'auto' : 'none'} className="h-full w-full object-cover" />
      ) : play && embed ? (
        <iframe src={autoplay ? `${embed}&mute=1&muted=1` : embed} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="h-full w-full" />
      ) : (
        <button type="button" className="group absolute inset-0" onClick={() => setPlay(true)} aria-label={`Play ${title}`}>
          {poster && <Image src={poster} alt="" fill sizes="(min-width: 1280px) 1200px, 100vw" className="object-cover opacity-90" />}
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-white/90 text-neutral-900 shadow-pop transition group-hover:scale-110">
              <Play size={30} fill="currentColor" className="ms-1" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
