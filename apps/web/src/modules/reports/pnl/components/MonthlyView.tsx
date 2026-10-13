/**
 * The statement month by month: sales against spending, net profit per
 * month and the full statement with a column per month and a total. A month
 * heading opens that month's statement.
 */

import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, CalendarRange, TrendingUp } from 'lucide-react';
import { Card } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { PnlMonthly } from '../api';
import { PART_COLORS, monthLabel, sumStatements, type PnlLine } from '../meta';
import { lineText } from '../print';
import type { Fmt } from './parts';

export function MonthlyView({ data, lines, fmt, onPickMonth }: {
  data: PnlMonthly;
  lines: PnlLine[];
  fmt: Fmt;
  onPickMonth: (key: string) => void;
}) {
  const theme = useChartTheme();
  const showCost = !fmt.costHidden && data.costVisible;
  const total = sumStatements(data.months.map((m) => m.statement));
  const chart = data.months.map(({ key, statement: s }) => ({
    key, name: monthLabel(key),
    bikri: s.revenue.net,
    kharch: (showCost ? (s.cogs?.total ?? 0) + (s.writeOffs?.net ?? 0) : 0) + s.expenses.total,
    munafa: s.netProfit ?? 0,
  }));
  const pick = (e: unknown) => {
    const key = (e as { activePayload?: Array<{ payload?: { key?: string } }> } | null)?.activePayload?.[0]?.payload?.key;
    if (key) onPickMonth(key);
  };
  const best = showCost ? [...data.months].filter((m) => m.statement.revenue.net > 0).sort((a, b) => (b.statement.netProfit ?? 0) - (a.statement.netProfit ?? 0))[0] : undefined;
  const losing = showCost ? data.months.filter((m) => (m.statement.netProfit ?? 0) < 0).length : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><BarChart3 className="h-4 w-4 text-brand-600" />Sale aur kharch</span>}
          description={showCost ? 'Kharch = maal ki cost + kharchay + stock nuqsan. Bar dabayein to us mahine ka bayan khulega' : 'Kharch = kharchay. Bar dabayein to us mahine ka bayan khulega'}>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 4, right: 4, left: -12, bottom: 0 }} onClick={pick} barGap={2}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={4} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip formatter={(v, name) => [fmt.sales(Number(v)), name === 'bikri' ? 'Net sale' : 'Kharch']} {...theme.tooltip} />
                <Legend formatter={(v) => (v === 'bikri' ? 'Net sale' : 'Kharch')} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="bikri" fill={PART_COLORS.revenue} radius={[4, 4, 0, 0]} maxBarSize={18} className="cursor-pointer" />
                <Bar dataKey="kharch" fill={PART_COLORS.expenses} radius={[4, 4, 0, 0]} maxBarSize={18} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-600" />Net profit har mahine</span>}
          description={showCost ? `${best ? `Sab se achha ${monthLabel(best.key, true)}` : 'Abhi koi profit nahi'}${losing ? ` · ${losing} mahine nuqsan` : ''}` : 'Cost chhupi hai'}>
          {!showCost ? <p className="py-16 text-center text-[0.875rem] text-slate-500">Profit dekhne ke liye cost kholein</p> : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 4, right: 4, left: -12, bottom: 0 }} onClick={pick}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={4} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                  <Tooltip formatter={(v) => [formatPKR(Number(v)), 'Net profit']} {...theme.tooltip} />
                  <Bar dataKey="munafa" radius={[4, 4, 0, 0]} maxBarSize={26} className="cursor-pointer">
                    {chart.map((d) => <Cell key={d.key} fill={d.munafa >= 0 ? PART_COLORS.profit : PART_COLORS.loss} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><CalendarRange className="h-4 w-4 text-brand-600" />Mahine war bayan</h2>
          <p className="text-[0.75rem] text-slate-500">Mahine ke naam par click: us mahine ka poora bayan · * abhi chal raha hai</p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-[0.8125rem]">
            <thead className="bg-slate-50/70 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 text-left sm:px-5">Details</th>
                {data.months.map((m) => (
                  <th key={m.key} className="px-3 py-2.5 text-right">
                    <button type="button" onClick={() => onPickMonth(m.key)} className="uppercase hover:text-brand-700 hover:underline">{monthLabel(m.key)}{m.partial && ' *'}</button>
                  </th>
                ))}
                <th className="bg-slate-100/70 px-4 py-2.5 text-right">Kul</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                if (l.kind === 'head') {
                  return <tr key={l.id}><td className="sticky left-0 z-10 bg-white px-4 pb-1 pt-3 text-[0.6875rem] font-bold uppercase tracking-wide text-slate-500 sm:px-5">{l.label}</td><td colSpan={data.months.length + 1} /></tr>;
                }
                const cell = (v: number | null) => (l.cost && fmt.costHidden ? fmt.cost(0) : lineText(l, v));
                const strong = l.kind === 'total' || l.kind === 'grand';
                return (
                  <tr key={l.id} className={cn(strong && 'font-semibold', l.kind === 'grand' && 'bg-brand-50/50', l.kind === 'sub' && 'text-slate-500', l.kind === 'total' && 'border-t border-slate-200')}>
                    <td className={cn('sticky left-0 z-10 max-w-[14rem] truncate px-4 py-1.5 sm:px-5', l.kind === 'grand' ? 'bg-brand-50' : 'bg-white', l.kind === 'sub' && 'pl-8')} title={l.hint ?? l.label}>
                      {l.minus && <span className="mr-1 text-slate-400">−</span>}{l.label}
                    </td>
                    {data.months.map((m) => {
                      const v = l.value(m.statement);
                      return <td key={m.key} className={cn('whitespace-nowrap px-3 py-1.5 text-right tabular-nums', l.kind === 'grand' && v != null && v < 0 && 'text-rose-700')}>{cell(v)}</td>;
                    })}
                    <td className="whitespace-nowrap bg-slate-50/70 px-4 py-1.5 text-right tabular-nums">{cell(l.value(total))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
