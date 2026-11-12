'use client';

/**
 * Thin bar above the header. Several messages rotate every 4 s (or scroll as
 * a marquee when the merchant picks it); each can link somewhere.
 */
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface AnnouncementMsg {
  text: string;
  link: string | null;
}

export function AnnouncementBar({ messages, scheme, autoplay, speed, marquee }: { messages: AnnouncementMsg[]; scheme: string; autoplay: boolean; speed: number; marquee: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (messages.length < 2 || marquee || !autoplay) return;
    const id = setInterval(() => setI((x) => (x + 1) % messages.length), Math.max(3, speed) * 1000);
    return () => clearInterval(id);
  }, [messages.length, marquee, autoplay, speed]);
  if (!messages.length) return null;
  const cls = `${scheme} bg-bg text-fg`;
  const item = (m: AnnouncementMsg, k: number) =>
    m.link ? (
      <Link key={k} href={m.link} className="underline-offset-2 hover:underline">
        {m.text}
      </Link>
    ) : (
      <span key={k}>{m.text}</span>
    );
  if (marquee) {
    const row = [...messages, ...messages];
    return (
      <div className={`${cls} overflow-hidden text-[12.5px] font-medium tracking-wide`}>
        <div className="flex w-max animate-marquee gap-16 py-2 pe-16">{row.map((m, k) => item(m, k))}</div>
      </div>
    );
  }
  return (
    <div className={`${cls} text-[12.5px] font-medium tracking-wide`}>
      <div className="page flex h-9 items-center justify-between gap-2">
        {messages.length > 1 ? (
          <button type="button" aria-label="Previous" className="opacity-70 hover:opacity-100" onClick={() => setI((i - 1 + messages.length) % messages.length)}>
            <ChevronLeft size={15} className="rtl:rotate-180" />
          </button>
        ) : (
          <span />
        )}
        <div key={i} className="min-w-0 flex-1 animate-fade-in truncate text-center">
          {item(messages[i % messages.length]!, i)}
        </div>
        {messages.length > 1 ? (
          <button type="button" aria-label="Next" className="opacity-70 hover:opacity-100" onClick={() => setI((i + 1) % messages.length)}>
            <ChevronRight size={15} className="rtl:rotate-180" />
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
