/** Thin progress bar with a label row ("Visits 12 / 40"). */

import { cn } from '@/lib/cn';
import { num, percent } from '@/lib/format';

export function Progress({ label, value, target, tone = 'brand' }: { label: string; value: number; target?: number | null; tone?: 'brand' | 'amber' | 'blue' | 'green' }) {
  const pct = target ? percent(value, target) : 0;
  const bar = { brand: 'bg-brand-500', amber: 'bg-amber-500', blue: 'bg-blue-500', green: 'bg-green-500' }[tone];
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate font-medium text-slate-600">{label}</span>
        <span className="shrink-0 tabular-nums">
          <b className="text-base font-bold text-slate-900">{num(value)}</b>
          {target ? <span className="text-slate-500"> / {num(target)}</span> : null}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        {target ? <div className={cn('h-full rounded-full transition-[width] duration-500', bar)} style={{ width: `${pct}%` }} /> : null}
      </div>
    </div>
  );
}
