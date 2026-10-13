/**
 * Building blocks of the report centre: section cards, change against the
 * previous period, trend and split charts, bar lists and tables. All money
 * goes through the masked formatters so the privacy lock applies.
 */

import type { ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import { Card } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useReportMasked } from '../../prefs';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { Fmt } from '../api';

export const PALETTE = ['#2563eb', '#16a34a', '#d97706', '#db2777', '#7c3aed', '#0891b2', '#ea580c', '#65a30d', '#64748b', '#9333ea'];
export const WEEKDAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];

const qtyText = (n: number) => Number(n.toFixed(2)).toLocaleString('en-PK');
const dateText = (v: string) => new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

/** Formats a value by kind, with the privacy lock on money and cost. */
export function useFmt() {
  const { sales, cost, costHidden, salesHidden } = useReportMasked();
  const fmt = (v: number | string | null | undefined, kind: Fmt): string => {
    if (v == null || v === '') return '—';
    if (kind === 'text') return String(v);
    if (kind === 'date') return dateText(String(v));
    const n = Number(v);
    switch (kind) {
      case 'money': return sales(n);
      case 'cost': return cost(n);
      case 'pct': return `${n.toFixed(1)}%`;
      case 'kg': return `${qtyText(n)} kg`;
      case 'grams': return `${qtyText(n)} g`;
      case 'sqft': return `${qtyText(n)} sqft`;
      case 'litre': return `${qtyText(n)} L`;
      case 'min': return `${Math.round(n)} min`;
      default: return qtyText(n);
    }
  };
  return { fmt, money: sales, cost, costHidden, salesHidden, qty: qtyText, date: dateText };
}
export type Formatter = ReturnType<typeof useFmt>;

/** "2026-10-04" → "4 Oct", "2026-10" → "Oct 26". */
export const keyLabel = (k: string) =>
  k.length === 7
    ? new Date(`${k}-15T12:00:00`).toLocaleDateString('en-PK', { month: 'short', year: '2-digit' })
    : new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

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
  const pct = ((now - before) / Math.abs(before)) * 100;
  if (Math.abs(pct) < 0.5) return <span className="inline-flex items-center gap-0.5 text-slate-500"><Minus className="h-3 w-3" />pehle jaisa</span>;
  const good = (pct > 0) === (up === 'good');
  const Icon = pct > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-semibold', good ? 'text-emerald-600' : 'text-rose-600')}>
      <Icon className="h-3.5 w-3.5" />{Math.abs(pct).toFixed(0)}% pichli period se
    </span>
  );
}

export interface Series { key: string; label: string; color: string; fmt: Fmt }

/** Area chart over the period's buckets. */
export function TrendChart({ data, series, f, height = 260, id }: {
  data: Array<Record<string, number | string | undefined>>; series: Series[]; f: Formatter; height?: number; id: string;
}) {
  const theme = useChartTheme();
  const rows = data.map((d) => ({ ...d, label: keyLabel(String(d.key)) }));
  const moneyAxis = series.some((s) => s.fmt === 'money' || s.fmt === 'cost');
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`${id}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.28} /><stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
          <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={moneyAxis && !f.salesHidden ? axisMoney : undefined} width={44} allowDecimals={false} />
          <Tooltip {...theme.tooltip} formatter={(v, name) => {
            const s = series.find((x) => x.label === name);
            return [f.fmt(Number(v), s?.fmt ?? 'qty'), name];
          }} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.25} fill={`url(#${id}-${s.key})`} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Vertical bars, one colour; for hours, weekdays and small splits. */
export function Bars({ data, fmt, f, color, height = 220, tick }: {
  data: Array<{ name: string; value: number }>; fmt: Fmt; f: Formatter; color?: string; height?: number; tick?: (v: string) => string;
}) {
  const theme = useChartTheme();
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} interval="preserveStartEnd" tickFormatter={tick} />
          <YAxis tick={theme.axis} axisLine={false} tickLine={false} width={44} allowDecimals={false}
            tickFormatter={(fmt === 'money' || fmt === 'cost') && !f.salesHidden ? axisMoney : undefined} />
          <Tooltip {...theme.tooltip} formatter={(v) => [f.fmt(Number(v), fmt), '']} />
          <Bar dataKey="value" fill={color ?? theme.primary} radius={[6, 6, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut with a legend list beside it. */
export function Donut({ data, fmt, f, colors }: {
  data: Array<{ name: string; value: number; color?: string }>; fmt: Fmt; f: Formatter; colors?: string[];
}) {
  const theme = useChartTheme();
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const color = (d: { color?: string }, i: number) => d.color ?? (colors ?? PALETTE)[i % (colors ?? PALETTE).length];
  return (
    <div className="grid items-center gap-3 sm:grid-cols-[10rem_1fr]">
      <div className="mx-auto h-40 w-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={44} outerRadius={70} paddingAngle={2} stroke="none">
              {data.map((d, i) => <Cell key={d.name} fill={color(d, i)} />)}
            </Pie>
            <Tooltip {...theme.tooltip} formatter={(v, n) => [f.fmt(Number(v), fmt), n]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-0 space-y-1.5 text-[0.8125rem]">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color(d, i) }} /><span className="truncate text-slate-700">{d.name}</span></span>
            <span className="shrink-0 tabular-nums text-slate-900">{f.fmt(d.value, fmt)} <span className="text-slate-400">· {((d.value / total) * 100).toFixed(0)}%</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ranked list with share bars. */
export function BarList({ rows, fmt, f, empty = 'Kuch nahi' }: {
  rows: Array<{ key: string; name: ReactNode; value: number; hint?: ReactNode; color?: string }>; fmt: Fmt; f: Formatter; empty?: string;
}) {
  if (!rows.length) return <Empty text={empty} />;
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={r.key}>
          <div className="flex justify-between gap-2 text-[0.8125rem]">
            <span className="min-w-0 truncate font-medium text-slate-800">{r.name}</span>
            <span className="shrink-0 tabular-nums text-slate-900">{f.fmt(r.value, fmt)}</span>
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

export interface Column<T> { label: string; align?: 'right'; render: (row: T, i: number) => ReactNode; hide?: boolean }

/** Plain table that scrolls sideways on phones. */
export function DataTable<T>({ rows, columns, empty = 'Kuch nahi', rowKey }: {
  rows: T[]; columns: Array<Column<T>>; empty?: string; rowKey: (row: T, i: number) => string;
}) {
  const cols = columns.filter((c) => !c.hide);
  if (!rows.length) return <Empty text={empty} />;
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
      <table className="w-full min-w-[32rem] text-[0.8125rem]">
        <thead className="text-left text-[0.6875rem] uppercase tracking-wide text-slate-500">
          <tr>{cols.map((c) => <th key={c.label} className={cn('py-2 pr-3 font-semibold', c.align === 'right' && 'pr-0 text-right')}>{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)}>
              {cols.map((c) => <td key={c.label} className={cn('py-2 pr-3 text-slate-700', c.align === 'right' && 'pr-0 text-right tabular-nums')}>{c.render(r, i)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Weekday × hour grid of bill counts. */
export function Heatmap({ grid }: { grid: number[][] }) {
  const theme = useChartTheme();
  const hours = Array.from({ length: 24 }, (_, h) => h).filter((h) => grid.some((row) => row[h] > 0));
  const max = Math.max(1, ...grid.flat());
  if (!hours.length) return <Empty text="Koi sale nahi" />;
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-grid min-w-full gap-1" style={{ gridTemplateColumns: `4.5rem repeat(${hours.length}, minmax(1.75rem, 1fr))` }}>
        <span />
        {hours.map((h) => <span key={h} className="text-center text-[0.625rem] font-medium text-slate-400">{h % 12 || 12}{h < 12 ? 'a' : 'p'}</span>)}
        {order.map((d) => (
          <div key={d} className="contents">
            <span className="flex items-center text-[0.75rem] font-medium text-slate-600">{WEEKDAYS[d]}</span>
            {hours.map((h) => {
              const v = grid[d]?.[h] ?? 0;
              return <span key={h} title={`${WEEKDAYS[d]} ${h}:00 — ${v} bill`} className={cn('h-7 rounded-md', !v && 'bg-slate-100')}
                style={v ? { backgroundColor: theme.primary, opacity: 0.15 + 0.85 * (v / max) } : undefined} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
