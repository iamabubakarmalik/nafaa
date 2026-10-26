/**
 * Building blocks of the customers report: panels, change against the
 * previous period, bar lists, tables, customer links and the formatter that
 * applies the privacy lock to money and profit.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Crown, Minus, type LucideIcon } from 'lucide-react';
import { Card, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useReportMasked } from '../../prefs';

const PALETTE = ['#2563eb', '#16a34a', '#d97706', '#db2777', '#7c3aed', '#0891b2', '#ea580c', '#65a30d', '#64748b', '#9333ea'];

export function useFmt() {
  const { sales, cost, costHidden, salesHidden } = useReportMasked();
  const count = (n: number) => Math.round(n).toLocaleString('en-PK');
  const pct = (n: number | null | undefined) => (n == null ? '—' : `${n.toFixed(1)}%`);
  const date = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  return { money: sales, cost, costHidden, salesHidden, count, pct, date };
}
export type Formatter = ReturnType<typeof useFmt>;

/** "2026-10-04" → "4 Oct", "2026-10" → "Oct 26". */
export const keyLabel = (k: string) =>
  k.length === 7
    ? new Date(`${k}-15T12:00:00`).toLocaleDateString('en-PK', { month: 'short', year: '2-digit' })
    : new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

/** "3 din pehle", "aaj". */
export const daysAgo = (d: number | null | undefined) => (d == null ? '—' : d <= 0 ? 'aaj' : d === 1 ? 'kal' : `${d} din pehle`);

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
export function Delta({ now, before, up = 'good', points }: { now: number; before: number | null | undefined; up?: 'good' | 'bad'; points?: boolean }) {
  if (before == null) return null;
  const diff = points ? now - before : Math.abs(before) < 0.005 ? null : ((now - before) / Math.abs(before)) * 100;
  if (diff == null) return now ? <span className="text-slate-500">pichli dafa 0</span> : null;
  if (Math.abs(diff) < 0.5) return <span className="inline-flex items-center gap-0.5 text-slate-500"><Minus className="h-3 w-3" />pehle jaisa</span>;
  const good = (diff > 0) === (up === 'good');
  const Icon = diff > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-semibold', good ? 'text-success-600' : 'text-rose-600')}>
      <Icon className="h-3.5 w-3.5" />{Math.abs(diff).toFixed(0)}{points ? ' point' : '%'} pichli period se
    </span>
  );
}

/** Ranked list with share bars. */
export function BarList({ rows, format, empty = 'Kuch nahi' }: {
  rows: Array<{ key: string; name: ReactNode; value: number; hint?: ReactNode; color?: string }>; format: (n: number) => string; empty?: string;
}) {
  if (!rows.length) return <Empty text={empty} />;
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={r.key}>
          <div className="flex justify-between gap-2 text-[0.8125rem]">
            <span className="min-w-0 truncate font-medium text-slate-800">{r.name}</span>
            <span className="shrink-0 tabular-nums text-slate-900">{format(r.value)}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: `${(Math.abs(r.value) / max) * 100}%`, background: r.color ?? PALETTE[i % PALETTE.length] }} />
          </div>
          {r.hint && <p className="mt-0.5 text-[0.6875rem] text-slate-500">{r.hint}</p>}
        </li>
      ))}
    </ul>
  );
}

interface Column<T> { label: string; align?: 'right'; render: (row: T, i: number) => ReactNode; hide?: boolean }

/** Plain table that scrolls sideways on phones. */
export function DataTable<T>({ rows, columns, empty = 'Kuch nahi', rowKey }: {
  rows: T[]; columns: Array<Column<T>>; empty?: string; rowKey: (row: T, i: number) => string;
}) {
  const cols = columns.filter((c) => !c.hide);
  if (!rows.length) return <Empty text={empty} />;
  return (
    <Table minWidth="36rem" className="-mx-4 sm:-mx-5 [&_table]:text-[0.8125rem]">
      <THead>
        <Tr>{cols.map((c) => <Th key={c.label} align={c.align === 'right' ? 'right' : 'left'} className="py-2">{c.label}</Th>)}</Tr>
      </THead>
      <TBody>
        {rows.map((r, i) => (
          <Tr key={rowKey(r, i)} className="hover:bg-slate-50/70">
            {cols.map((c) => <Td key={c.label} align={c.align === 'right' ? 'right' : 'left'} className="py-2">{c.render(r, i)}</Td>)}
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}

/** Customer name linking to the profile, with VIP crown and phone underneath. */
export function CustomerCell({ id, name, phone, isVip, sub }: { id: string; name: string; phone?: string | null; isVip?: boolean; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <Link to={`/customers/${id}`} className="inline-flex max-w-full items-center gap-1 truncate font-semibold text-slate-900 hover:text-brand-700 hover:underline">
        {isVip && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />}<span className="truncate">{name}</span>
      </Link>
      {(phone || sub) && <p className="truncate text-[0.6875rem] text-slate-500">{[phone, sub].filter(Boolean).map((x, i) => <span key={i}>{i > 0 && ' · '}{x}</span>)}</p>}
    </div>
  );
}

/** Plain-language pointers, up to three. */
export function Insights({ items }: { items: Array<{ tone: 'good' | 'warn' | 'bad'; text: string; icon: LucideIcon }> }) {
  if (!items.length) return null;
  const tone = { good: 'bg-success-50 text-success-900 ring-success-100', warn: 'bg-amber-50 text-amber-900 ring-amber-100', bad: 'bg-rose-50 text-rose-900 ring-rose-100' };
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {items.slice(0, 3).map((x) => (
        <p key={x.text} className={cn('flex items-start gap-2 rounded-2xl px-4 py-3 text-[0.8125rem] ring-1', tone[x.tone])}>
          <x.icon className="mt-0.5 h-4 w-4 shrink-0" />{x.text}
        </p>
      ))}
    </div>
  );
}
