/**
 * Headline numbers: the cards the user picked under Customize → Numbers,
 * each with its change and a short trend line.
 */

import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Lock, Settings2 } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { Sparkline } from '../engine/charts';
import { IconBubble } from '../engine/parts';
import { useMasked } from '../engine/useMasked';
import { useDashboardContext } from '../engine/useDashboardLayout';
import type { KpiDef } from '../engine/types';
import { t } from '@core/i18n';

const TREND_COLOR = {
  brand: 'text-brand-500', success: 'text-success-500', warning: 'text-amber-500',
  danger: 'text-rose-500', info: 'text-sky-500', neutral: 'text-slate-400',
} as const;

function KpiCard({ def }: { def: KpiDef }) {
  const v = def.useValue();
  const tone = def.tone ?? 'brand';
  const up = (v.change ?? 0) > 0;
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[0.8125rem] font-medium leading-tight text-slate-500">{def.label}</span>
        <IconBubble icon={def.icon} tone={tone} className="h-8 w-8 rounded-lg" />
      </div>
      {v.loading
        ? <Skeleton className="mt-2 h-7 w-24" />
        : <div className="mt-1 truncate text-[1.375rem] font-bold tabular-nums tracking-tight text-slate-900 sm:text-2xl">{v.value}</div>}
      <div className="mt-1 flex min-h-[1.25rem] items-center gap-2 text-[0.75rem]">
        {v.change !== undefined && Number.isFinite(v.change) && v.change !== 0 && (
          <span className={cn(
            'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold',
            up ? 'bg-success-50 text-success-700' : 'bg-rose-50 text-rose-700',
          )}>
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(v.change).toFixed(1)}%
          </span>
        )}
        {v.hint && <span className="truncate text-slate-500">{v.hint}</span>}
      </div>
      {v.trend && v.trend.length > 1 && <Sparkline values={v.trend} className={cn('mt-2 h-8 w-full', TREND_COLOR[tone])} />}
    </>
  );
  const cls = cn(
    'flex min-w-0 flex-col rounded-2xl border bg-white p-4 shadow-sm',
    v.alert ? 'border-rose-200 ring-1 ring-rose-100' : 'border-slate-200',
  );
  return v.to
    ? <Link to={v.to} className={cn(cls, 'transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md')}>{body}</Link>
    : <div className={cls}>{body}</div>;
}

function LockedCard({ def }: { def: KpiDef }) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-dashed border-slate-200 bg-white p-4">
      <span className="text-[0.8125rem] font-medium text-slate-500">{def.label}</span>
      <span className="mt-2 inline-flex items-center gap-1.5 text-[0.875rem] text-slate-400"><Lock className="h-3.5 w-3.5" /> {' '}{t('Cost lock hai')}</span>
    </div>
  );
}

export function KpiGrid() {
  const { kpis, openCustomize } = useDashboardContext();
  const { costHidden } = useMasked();
  if (kpis.length === 0) {
    return (
      <button type="button" onClick={() => openCustomize('numbers')}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-[0.875rem] text-slate-600 hover:bg-slate-50">
        <Settings2 className="h-4 w-4" /> {' '}{t('Numbers chunein')}
      </button>
    );
  }
  return (
    <div className={cn(
      'grid grid-cols-2 gap-3 md:grid-cols-3',
      // Six or five cards share one row only on wide screens; on a 1280 laptop the amounts would be cut off.
      kpis.length >= 6 ? '2xl:grid-cols-6' : kpis.length === 5 ? '2xl:grid-cols-5' : 'xl:grid-cols-4',
    )}>
      {kpis.map((k) => (k.sensitive && costHidden ? <LockedCard key={k.id} def={k} /> : <KpiCard key={k.id} def={k} />))}
    </div>
  );
}
