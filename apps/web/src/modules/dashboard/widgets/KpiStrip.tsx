/**
 * Row of headline numbers at the top of a dashboard. Each industry decides
 * which numbers matter (see its dashboard config).
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { IconBubble, type Tone } from '../engine/parts';

export interface Kpi {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  hint?: ReactNode;
  to?: string;
  alert?: boolean;
}

export function KpiStrip({ items, loading }: { items: Kpi[]; loading?: boolean }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', items.length >= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4')}>
      {items.map((k) => {
        const body = (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[0.8125rem] font-medium text-slate-500">{k.label}</span>
              <IconBubble icon={k.icon} tone={k.tone ?? 'brand'} className="h-8 w-8" />
            </div>
            {loading
              ? <Skeleton className="mt-2 h-7 w-24" />
              : <div className="mt-1 truncate text-xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-2xl">{k.value}</div>}
            {k.hint && <div className="mt-1 truncate text-[0.75rem] text-slate-500">{k.hint}</div>}
          </>
        );
        const cls = cn(
          'block min-w-0 rounded-xl border bg-white p-4 shadow-sm',
          k.alert ? 'border-rose-200' : 'border-slate-200',
        );
        return k.to
          ? <Link key={k.label} to={k.to} className={cn(cls, 'transition hover:border-slate-300 hover:shadow')}>{body}</Link>
          : <div key={k.label} className={cls}>{body}</div>;
      })}
    </div>
  );
}
