/**
 * Note and coin count sheet: how many of each, with the line amounts and
 * the total. Enter moves to the next row so a cashier can count with the
 * keyboard only.
 */

import { useRef } from 'react';
import { Banknote, Coins, Eraser } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { COINS, NOTES, sumDenoms } from './meta';

export function DenominationCounter({ value, onChange, className }: {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  className?: string;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const total = sumDenoms(value);
  const pieces = Object.values(value).reduce((s, v) => s + (Math.floor(Number(v) || 0)), 0);

  const row = (d: number, i: number, coin: boolean) => {
    const count = Math.floor(Number(value[d]) || 0);
    return (
      <label key={d} className={cn('flex items-center gap-2 rounded-xl px-2 py-1.5 ring-1 transition', count > 0 ? 'bg-emerald-50/60 ring-emerald-200' : 'bg-white ring-slate-200')}>
        <span className={cn('flex h-8 w-16 shrink-0 items-center justify-center gap-1 rounded-lg text-[0.8125rem] font-bold tabular-nums',
          coin ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900')}>
          {coin ? <Coins className="h-3.5 w-3.5" /> : <Banknote className="h-3.5 w-3.5" />}{d}
        </span>
        <span className="text-slate-400" aria-hidden>×</span>
        <input
          ref={(el) => { refs.current[i] = el; }}
          type="number" inputMode="numeric" min={0} step={1} placeholder="0"
          aria-label={`Rs ${d} kitne`}
          value={value[d] ?? ''}
          onChange={(e) => onChange({ ...value, [d]: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); refs.current[i + 1]?.focus(); } }}
          className="h-8 w-16 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
        <span className="ml-auto text-right text-[0.8125rem] font-semibold tabular-nums text-slate-700">{count ? formatPKR(count * d) : '—'}</span>
      </label>
    );
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {NOTES.map((d, i) => row(d, i, false))}
        {COINS.map((d, i) => row(d, NOTES.length + i, true))}
      </div>
      <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-900 px-3 py-2 text-white">
        <span className="text-[0.8125rem] text-white/70">{pieces} note / sikke</span>
        <span className="flex items-center gap-2">
          {pieces > 0 && (
            <button type="button" onClick={() => { onChange({}); refs.current[0]?.focus(); }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.75rem] text-white/70 hover:bg-white/10">
              <Eraser className="h-3.5 w-3.5" />Saaf
            </button>
          )}
          <span className="text-lg font-bold tabular-nums">{formatPKR(total)}</span>
        </span>
      </div>
      <p className="text-[0.6875rem] text-slate-500">Har note aur sikke ki ginti likhein; Enter se agla khana. Kul khud ban jata hai.</p>
    </div>
  );
}
