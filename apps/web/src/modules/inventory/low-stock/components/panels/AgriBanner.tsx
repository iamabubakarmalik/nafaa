/**
 * Agri: two problems no other shop has. Seed, fertilizer and spray cannot be
 * sold once the government registration has lapsed, however much is in
 * stock; and stock for the coming season (Rabi, Kharif) has to arrive before
 * the season, not after. Both are filters on the main list; this strip says
 * how many and opens them.
 */

import { Leaf, ShieldAlert } from 'lucide-react';
import type { LowStockBannerProps } from '../../config';

export function AgriBanner({ data, setStatus }: LowStockBannerProps) {
  const reg = data.counts.registration;
  const season = data.counts.season;
  if (!reg && !season) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {reg > 0 && (
        <button type="button" onClick={() => setStatus('registration')}
          className="inline-flex flex-1 items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-left text-[0.8125rem] text-rose-900 ring-1 ring-rose-200/70 hover:bg-rose-100/70">
          <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
          <span><b>{reg} cheezon</b> ki registration khatam, 60 din me khatam, ya date likhi nahi — registration ke baghair bechna mana hai.</span>
        </button>
      )}
      {season > 0 && (
        <button type="button" onClick={() => setStatus('season')}
          className="inline-flex flex-1 items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-left text-[0.8125rem] text-emerald-900 ring-1 ring-emerald-200/70 hover:bg-emerald-100/70">
          <Leaf className="h-4 w-4 shrink-0 text-emerald-600" />
          <span><b>{season} cheezein</b> is ya agle mausam ki hain aur kam hain — mausam se pehle mangwa lein, baad me rate barh jata hai.</span>
        </button>
      )}
    </div>
  );
}
