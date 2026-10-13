/** Small building blocks shared by the day book views. */

import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import { cn } from '@core/lib/cn';

export function Panel({ icon: Icon, title, hint, actions, children, className, flush }: {
  icon: LucideIcon; title: ReactNode; hint?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; flush?: boolean;
}) {
  return (
    <section className={cn('min-w-0 rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80', className)}>
      <header className="flex flex-wrap items-start justify-between gap-2 px-4 pt-4 sm:px-5">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon className="h-4 w-4" /></span>
            {title}
          </h3>
          {hint && <p className="mt-1 text-[0.75rem] leading-relaxed text-slate-500">{hint}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className={cn(flush ? 'mt-3' : 'p-4 sm:p-5')}>{children}</div>
    </section>
  );
}

/** One line of a money statement: label on the left, amount on the right. */
export function Line({ label, value, sign, strong, muted, hint }: {
  label: ReactNode; value: ReactNode; sign?: '+' | '−' | '='; strong?: boolean; muted?: boolean; hint?: ReactNode;
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 py-1.5 text-[0.8125rem]', strong && 'mt-1 border-t border-slate-200 pt-2.5')}>
      <span className={cn('min-w-0', strong ? 'font-semibold text-slate-900' : muted ? 'text-slate-400' : 'text-slate-600')}>
        {sign && <span className={cn('mr-1 inline-block w-3 font-semibold', sign === '+' ? 'text-success-600' : sign === '−' ? 'text-rose-600' : 'text-slate-400')}>{sign}</span>}
        {label}
        {hint && <span className="ml-1 text-[0.6875rem] text-slate-400">{hint}</span>}
      </span>
      <span className={cn('shrink-0 tabular-nums', strong ? 'text-base font-bold text-slate-900' : 'font-medium text-slate-900')}>{value}</span>
    </div>
  );
}

/** Percent change against an earlier figure; `invert` when lower is better. */
export function Delta({ now, before, invert, className }: { now: number; before: number; invert?: boolean; className?: string }) {
  if (!before && !now) return <span className={cn('text-slate-400', className)}>—</span>;
  if (!before) return <span className={cn('font-semibold text-success-700', className)}>naya</span>;
  const pct = ((now - before) / Math.abs(before)) * 100;
  const flat = Math.abs(pct) < 0.5;
  const good = invert ? pct < 0 : pct > 0;
  const Icon = flat ? Minus : pct > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-semibold tabular-nums', flat ? 'text-slate-500' : good ? 'text-success-700' : 'text-rose-700', className)}>
      <Icon className="h-3.5 w-3.5" />{flat ? '0%' : `${Math.abs(pct).toFixed(pct > -10 && pct < 10 ? 1 : 0)}%`}
    </span>
  );
}

export function Empty({ icon: Icon, text, hint }: { icon: LucideIcon; text: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Icon className="h-5 w-5" /></span>
      <p className="mt-2 text-[0.875rem] font-medium text-slate-700">{text}</p>
      {hint && <p className="mt-0.5 text-[0.75rem] text-slate-500">{hint}</p>}
    </div>
  );
}

/** Horizontal share bar under a label. */
export function ShareBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(Math.min((value / max) * 100, 100), value > 0 ? 2 : 0) : 0;
  return (
    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%`, ...(color && { backgroundColor: color }) }} />
    </div>
  );
}

/** Small pill: "Void", "Khula", "Wapas". */
export function Tag({ tone, children }: { tone: 'rose' | 'amber' | 'green' | 'slate' | 'sky'; children: ReactNode }) {
  const cls = {
    rose: 'bg-rose-50 text-rose-700 ring-rose-100', amber: 'bg-amber-50 text-amber-800 ring-amber-100',
    green: 'bg-success-50 text-success-700 ring-success-100', slate: 'bg-slate-100 text-slate-600 ring-slate-200', sky: 'bg-sky-50 text-sky-700 ring-sky-100',
  }[tone];
  return <span className={cn('inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', cls)}>{children}</span>;
}

/** Table shell that scrolls sideways on phones instead of the page. */
export function TableWrap({ children, minWidth = '36rem' }: { children: ReactNode; minWidth?: string }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
      <table className="w-full text-[0.8125rem]" style={{ minWidth }}>{children}</table>
    </div>
  );
}

export const th = 'py-2 pr-3 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500 last:pr-0';
export const thR = `${th} text-right`;
export const td = 'py-2 pr-3 align-top last:pr-0';
export const tdR = `${td} text-right tabular-nums`;
