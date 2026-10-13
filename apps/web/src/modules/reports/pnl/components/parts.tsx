/** Small pieces shared by the P&L views. */

import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';

/** Money formatters that follow the privacy lock (useMasked). */
export interface Fmt {
  sales: (n: number | null | undefined) => string;
  cost: (n: number | null | undefined) => string;
  costHidden: boolean;
}

export function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-[0.875rem] text-slate-500">{text}</p>;
}

/** Change against the comparison period, green when it moves the good way. */
export function ChangeChip({ value, upIsGood = true, suffix }: { value: number | null; upIsGood?: boolean; suffix?: ReactNode }) {
  if (value == null || !Number.isFinite(value)) return <span className="text-slate-400">{suffix ?? 'muqabla nahi'}</span>;
  const good = (value >= 0) === upIsGood;
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-semibold', good ? 'text-emerald-600' : 'text-rose-600')}>
      {value >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {Math.abs(value) > 999 ? '999+' : Math.abs(value).toFixed(0)}%{suffix && <span className="ml-1 font-normal text-slate-500">{suffix}</span>}
    </span>
  );
}

export function ChartSkeleton() {
  return <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>;
}
