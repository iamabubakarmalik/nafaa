/**
 * Building blocks of the staff report: section panels, the change against the
 * previous period, a heat grid and a small figure with a hint.
 */

import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import { Card, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { hourLabel } from './meta';

export function Panel({ icon: Icon, title, hint, actions, className, flush, children }: {
  icon: LucideIcon; title: ReactNode; hint?: ReactNode; actions?: ReactNode; className?: string; flush?: boolean; children: ReactNode;
}) {
  return (
    <Card className={cn('rounded-2xl', className)} flush={flush} actions={actions} description={hint}
      title={<span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{title}</span>}>
      {children}
    </Card>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-[0.875rem] text-slate-500">{text}</p>;
}

/** Change against the previous period; `up` says whether a rise is good. */
export function Delta({ now, before, up = 'good' }: { now: number; before: number | null | undefined; up?: 'good' | 'bad' }) {
  if (before == null) return null;
  if (Math.abs(before) < 0.005) return now ? <span className="text-slate-500">pichli dafa 0</span> : null;
  const change = ((now - before) / Math.abs(before)) * 100;
  if (Math.abs(change) < 0.5) return <span className="inline-flex items-center gap-0.5 text-slate-500"><Minus className="h-3 w-3" />pehle jaisa</span>;
  const good = (change > 0) === (up === 'good');
  const Icon = change > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-semibold', good ? 'text-success-600' : 'text-rose-600')}>
      <Icon className="h-3.5 w-3.5" />{Math.abs(change).toFixed(0)}% pichli period se
    </span>
  );
}

/** Rows × 24 hours of counts; darker cells are busier. */
export function HeatGrid({ rows, onRow }: {
  rows: Array<{ key: string; label: ReactNode; values: number[] }>;
  onRow?: (key: string) => void;
}) {
  const theme = useChartTheme();
  const max = Math.max(1, ...rows.flatMap((r) => r.values));
  // Hours that never have a bill are dropped so the grid stays readable on phones.
  const used = Array.from({ length: 24 }, (_, h) => h).filter((h) => rows.some((r) => r.values[h] > 0));
  const hours = used.length ? Array.from({ length: used[used.length - 1] - used[0] + 1 }, (_, i) => used[0] + i) : [];
  if (!hours.length) return null;
  return (
    <Table className="[&_table]:text-[0.6875rem] [&_table]:border-separate [&_table]:border-spacing-[0.1875rem]">
      <THead className="border-0 bg-transparent normal-case tracking-normal">
        <Tr>
          <Th className="p-0" />
          {hours.map((h) => <Th key={h} className="px-0.5 py-0.5 text-center font-medium text-slate-400">{h % 2 === hours[0] % 2 ? hourLabel(h) : ''}</Th>)}
        </Tr>
      </THead>
      <TBody className="divide-y-0">
        {rows.map((r) => (
          <Tr key={r.key}>
            <Th scope="row" className="max-w-[8rem] truncate py-0 pl-0 pr-2 text-left font-medium text-slate-600">
              {onRow ? <button type="button" onClick={() => onRow(r.key)} className="max-w-full truncate hover:text-brand-700 hover:underline">{r.label}</button> : r.label}
            </Th>
            {hours.map((h) => {
              const v = r.values[h] ?? 0;
              return (
                <Td key={h} title={`${hourLabel(h)}: ${v} bill`} className="h-6 min-w-[1.4rem] rounded-[0.3125rem] p-0"
                  style={{ backgroundColor: v ? theme.primary : theme.isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.12)', opacity: v ? 0.18 + 0.82 * (v / max) : 1 }} />
              );
            })}
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}

/** A labelled figure with an optional hint, used in the drawer and the counters view. */
export function Figure({ label, value, hint, tone }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
      <p className="truncate text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('mt-0.5 truncate text-[1.0625rem] font-bold tabular-nums',
        tone === 'good' ? 'text-success-700' : tone === 'bad' ? 'text-rose-700' : tone === 'warn' ? 'text-amber-700' : 'text-slate-900')}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-[0.6875rem] text-slate-500">{hint}</p>}
    </div>
  );
}
