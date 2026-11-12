'use client';

import { useEffect, useState } from 'react';

export function CountdownTimer({ ends, labels }: { ends: number; labels: { d: string; h: string; m: string; s: string; ended: string } }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, ends - (now ?? ends - 1));
  if (now !== null && left <= 0) return <p className="text-lg font-semibold">{labels.ended}</p>;
  const parts: Array<[number, string]> = [
    [Math.floor(left / 86400000), labels.d],
    [Math.floor(left / 3600000) % 24, labels.h],
    [Math.floor(left / 60000) % 60, labels.m],
    [Math.floor(left / 1000) % 60, labels.s],
  ];
  return (
    <div className="flex gap-2.5 md:gap-4" aria-live="off">
      {parts.map(([v, l]) => (
        <div key={l} className="flex w-[68px] flex-col items-center rounded-card bg-white/10 py-3 backdrop-blur md:w-[84px]">
          <span className="font-heading text-3xl font-semibold tabular-nums md:text-4xl">{now === null ? '--' : String(v).padStart(2, '0')}</span>
          <span className="mt-1 text-[11px] uppercase tracking-wider opacity-75">{l}</span>
        </div>
      ))}
    </div>
  );
}
