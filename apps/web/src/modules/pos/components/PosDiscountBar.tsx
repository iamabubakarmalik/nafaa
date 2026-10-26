/**
 * Discount bar shared by every POS: a percent mode and a rupee mode
 * ("500 kam kar do" is the common case in Pakistan). Passing only `value`
 * and `onChange` keeps the older percent-only behaviour.
 */

import { Percent, Banknote, X } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { controlClass } from '@/design-system/components';

export type DiscountMode = 'pct' | 'rs';

interface Props {
  /** Amount the discount applies to; needed for the rupee mode. */
  subtotal?: number;

  /* Percent + rupee usage */
  mode?: DiscountMode;
  pct?: number;
  rs?: number;
  onMode?: (m: DiscountMode) => void;
  onPct?: (v: number) => void;
  onRs?: (v: number) => void;

  /* Older percent-only usage */
  value?: number;
  onChange?: (pct: number) => void;

  /** Percent steps to show. */
  steps?: number[];
  /** Rupee steps to show; derived from the subtotal when omitted. */
  rsSteps?: number[];
  /** Kept for existing callers; the bar always follows the brand color. */
  tone?: 'amber' | 'emerald' | 'blue' | 'violet' | 'cyan';
  showLabel?: boolean;
}

const chip = (on: boolean) => cn('h-9 flex-1 rounded-xl text-[0.6875rem] font-bold tabular-nums transition sm:h-10 sm:text-xs',
  on ? 'bg-brand-600 text-brand-fg shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200');
const modeBtn = (on: boolean) => cn('inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.6875rem] font-bold transition',
  on ? 'bg-brand-600 text-brand-fg shadow-sm' : 'text-slate-500 hover:bg-slate-50');

/** Rounded rupee amounts that fit the subtotal, e.g. 1,240 gives 50/100/250. */
function autoRsSteps(subtotal: number): number[] {
  if (subtotal <= 0) return [100, 200, 500];
  const round = (n: number) => {
    if (n >= 10000) return Math.round(n / 5000) * 5000;
    if (n >= 2000) return Math.round(n / 500) * 500;
    if (n >= 500) return Math.round(n / 100) * 100;
    return Math.max(Math.round(n / 50) * 50, 50);
  };
  const raw = [0.05, 0.1, 0.2].map((f) => round(subtotal * f));
  return [...new Set(raw)].filter((v) => v > 0 && v <= subtotal);
}

export function PosDiscountBar({
  subtotal = 0,
  mode, pct, rs, onMode, onPct, onRs,
  value, onChange,
  steps = [0, 5, 10, 15, 20],
  rsSteps,
  showLabel = true,
}: Props) {
  // Older usage: percent only, no mode switch.
  const legacy = !onMode && onChange !== undefined;
  const m: DiscountMode = legacy ? 'pct' : (mode ?? 'pct');
  const pctVal = legacy ? (value ?? 0) : (pct ?? 0);
  const rsVal = rs ?? 0;

  const setPct = (v: number) => (legacy ? onChange?.(v) : onPct?.(v));
  const setRs = (v: number) => onRs?.(Math.max(0, Math.min(v, subtotal || v)));

  const amount = m === 'pct'
    ? (subtotal * pctVal) / 100
    : Math.min(rsVal, subtotal || rsVal);
  const has = amount > 0;

  const rsOptions = rsSteps ?? autoRsSteps(subtotal);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {showLabel && (
          <div className="flex shrink-0 items-center gap-1 text-[0.6875rem] font-bold text-slate-600 sm:text-xs">
            <Percent className="h-3.5 w-3.5 text-brand-600 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Discount:</span>
          </div>
        )}

        {!legacy && (
          <div className="flex shrink-0 rounded-xl border border-slate-200 bg-white p-0.5" role="radiogroup" aria-label="Discount ka tareeqa">
            <button type="button" role="radio" aria-checked={m === 'pct'} onClick={() => onMode?.('pct')} className={modeBtn(m === 'pct')}>
              <Percent className="h-3 w-3" /> %
            </button>
            <button type="button" role="radio" aria-checked={m === 'rs'} onClick={() => onMode?.('rs')} className={modeBtn(m === 'rs')}>
              <Banknote className="h-3 w-3" /> Rs
            </button>
          </div>
        )}

        <div className="flex min-w-0 flex-1 gap-1">
          {m === 'pct'
            ? steps.map((d) => (
                <button key={d} type="button" onClick={() => setPct(d)} className={chip(pctVal === d)}>
                  {d === 0 ? 'None' : `${d}%`}
                </button>
              ))
            : (
              <>
                {rsOptions.map((v) => (
                  <button key={v} type="button" onClick={() => setRs(v)} className={chip(rsVal === v)}>
                    {v >= 1000 ? `${v / 1000}k` : v}
                  </button>
                ))}
                <input
                  type="number" min={0} max={subtotal || undefined}
                  value={rsVal || ''}
                  onChange={(e) => setRs(Number(e.target.value || 0))}
                  placeholder="Khud"
                  aria-label="Discount rupay"
                  className={cn(controlClass(), 'h-9 w-20 rounded-xl px-2 text-center text-[0.6875rem] font-bold tabular-nums sm:h-10 sm:text-xs')}
                />
              </>
            )}
        </div>

        {has && (
          <button type="button"
            onClick={() => { setPct(0); onRs?.(0); }}
            title="Discount hatao" aria-label="Discount hatao"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 sm:h-10 sm:w-10">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {has && subtotal > 0 && (
        <div className="flex items-center justify-between px-1 text-[0.6875rem] font-bold tabular-nums">
          <span className="text-slate-500">
            {m === 'pct' ? `${pctVal}% discount` : `${formatPKR(rsVal)} kam`}
            {' '}<span className="text-slate-400">({((amount / subtotal) * 100).toFixed(1)}%)</span>
          </span>
          <span className="text-brand-700">−{formatPKR(amount)}</span>
        </div>
      )}
    </div>
  );
}
