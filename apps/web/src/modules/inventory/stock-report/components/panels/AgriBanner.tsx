/**
 * Agri: seed, fertilizer and spray cannot be sold once the government
 * registration lapses, however much is in the store. That money is shown
 * apart so "kitna maal hai" is not overstated.
 */

import { ShieldAlert } from 'lucide-react';
import { useReportMasked } from '@modules/reports/prefs';
import type { StockBannerProps } from '../../config';

export function AgriBanner({ list, setStatus }: StockBannerProps) {
  const { cost, sales: money } = useReportMasked();
  const b = list.totals.blocked;
  const soon = list.counts.blocked - b.count;
  if (!list.counts.blocked) return null;
  return (
    <button type="button" onClick={() => setStatus('blocked')}
      className="flex w-full items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-left text-[0.8125rem] text-rose-900 ring-1 ring-rose-200/70 hover:bg-rose-100/70">
      <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
      <span>
        {b.count > 0 && <><b>{b.count} cheezon</b> ki registration khatam — {cost(b.cost)} ka maal ({money(b.retail)} bechne par) abhi bik nahi sakta. </>}
        {soon > 0 && <><b>{soon}</b> ki registration 60 din me khatam ya date likhi nahi.</>}
        <span className="ml-1 font-semibold underline">Dekhein</span>
      </span>
    </button>
  );
}
