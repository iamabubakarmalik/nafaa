/**
 * Every branch side by side for the period: who earns, who spends, who
 * keeps the most, and the full statement with a column per branch.
 */

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Building2, Crown, Store } from 'lucide-react';
import { Card, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { PnlBranches } from '../api';
import { PART_COLORS, pctText, type PnlLine } from '../meta';
import { lineText } from '../print';
import { Empty, type Fmt } from './parts';

export function BranchView({ data, lines, fmt, onPickBranch }: {
  data: PnlBranches;
  lines: PnlLine[];
  fmt: Fmt;
  /** Opens one branch's statement. */
  onPickBranch: (id: string) => void;
}) {
  const theme = useChartTheme();
  const showCost = !fmt.costHidden && data.costVisible;
  const list = data.branches;
  if (!list.length) return <Empty text="Koi branch nahi mili" />;
  const chart = list.map((b) => ({ id: b.id, name: b.name, bikri: b.statement.revenue.net, profit: b.statement.netProfit ?? 0 }));
  const total = data.total.revenue.net;
  const top = showCost ? [...list].sort((a, b) => (b.statement.netMargin ?? -1e9) - (a.statement.netMargin ?? -1e9))[0] : undefined;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {list.map((b) => {
          const s = b.statement;
          const share = total > 0 ? (s.revenue.net / total) * 100 : 0;
          return (
            <button key={b.id} type="button" disabled={b.id === '-'} onClick={() => onPickBranch(b.id)}
              className="rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200/80 transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-900">
                  {b.id === '-' ? <Building2 className="h-4 w-4 shrink-0 text-slate-400" /> : <Store className="h-4 w-4 shrink-0 text-brand-600" />}
                  <span className="truncate">{b.name}</span>
                </span>
                {top?.id === b.id && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-800"><Crown className="h-3 w-3" />Sab se achha margin</span>}
              </div>
              <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">{fmt.sales(s.revenue.net)}</p>
              <p className="text-[0.75rem] text-slate-500">Net sale · kul ka {share.toFixed(0)}%</p>
              <div className="mt-2 flex items-center justify-between text-[0.8125rem]">
                <span className="text-slate-500">Net profit</span>
                <span className={cn('font-semibold tabular-nums', (s.netProfit ?? 0) < 0 ? 'text-rose-600' : 'text-success-700')}>{s.netProfit == null ? '—' : fmt.cost(s.netProfit)}</span>
              </div>
              <div className="flex items-center justify-between text-[0.8125rem]">
                <span className="text-slate-500">Kharchay</span><span className="tabular-nums text-slate-800">{fmt.sales(s.expenses.total)}</span>
              </div>
              {showCost && <div className="flex items-center justify-between text-[0.8125rem]"><span className="text-slate-500">Margin</span><span className="tabular-nums text-slate-800">{pctText(s.netMargin)}</span></div>}
            </button>
          );
        })}
      </div>

      <Card className="rounded-2xl" title="Branch war sale aur profit" description="Ek hi paimane par, taake asal farq nazar aaye">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 4, right: 4, left: -12, bottom: 0 }} barGap={2}>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
              <Tooltip formatter={(v, n) => [formatPKR(Number(v)), n === 'bikri' ? 'Net sale' : 'Net profit']} {...theme.tooltip} />
              <Bar dataKey="bikri" fill={PART_COLORS.revenue} radius={[4, 4, 0, 0]} maxBarSize={36} />
              {showCost && (
                <Bar dataKey="profit" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {chart.map((d) => <Cell key={d.id} fill={d.profit >= 0 ? PART_COLORS.profit : PART_COLORS.loss} />)}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-[0.75rem] text-slate-600">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: PART_COLORS.revenue }} />Net sale</span>
          {showCost && <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: PART_COLORS.profit }} />Net profit (laal = nuksan)</span>}
        </div>
      </Card>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <Table minWidth="max-content" className="[&_table]:text-[0.8125rem]">
          <THead>
            <Tr>
              <Th className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 text-left sm:px-5">Details</Th>
              {list.map((b) => <Th key={b.id} className="px-3 py-2.5 text-right">{b.name}</Th>)}
              <Th className="bg-slate-100/70 px-4 py-2.5 text-right">Kul</Th>
            </Tr>
          </THead>
          <TBody className="divide-y-0">
            {lines.map((l) => {
              if (l.kind === 'head') {
                return <Tr key={l.id}><Td className="sticky left-0 z-10 bg-white px-4 pb-1 pt-3 text-[0.6875rem] font-bold uppercase tracking-wide text-slate-500 sm:px-5">{l.label}</Td><Td colSpan={list.length + 1} /></Tr>;
              }
              const cell = (v: number | null) => (l.cost && fmt.costHidden ? fmt.cost(0) : lineText(l, v));
              return (
                <Tr key={l.id} className={cn((l.kind === 'total' || l.kind === 'grand') && 'font-semibold', l.kind === 'grand' && 'bg-brand-50/50', l.kind === 'sub' && 'text-slate-500', l.kind === 'total' && 'border-t border-slate-200')}>
                  <Td className={cn('sticky left-0 z-10 max-w-[14rem] truncate px-4 py-1.5 text-inherit sm:px-5', l.kind === 'grand' ? 'bg-brand-50' : 'bg-white', l.kind === 'sub' && 'pl-8')} title={l.hint ?? l.label}>
                    {l.minus && <span className="mr-1 text-slate-400">−</span>}{l.label}
                  </Td>
                  {list.map((b) => <Td key={b.id} className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-inherit">{cell(l.value(b.statement))}</Td>)}
                  <Td className="whitespace-nowrap bg-slate-50/70 px-4 py-1.5 text-right tabular-nums text-inherit">{cell(l.value(data.total))}</Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
        {list.some((b) => b.id === '-') && (
          <p className="border-t border-slate-100 px-4 py-2.5 text-[0.75rem] text-slate-500 sm:px-5">"Bina branch" me wo kharchay aur tankhwah hain jin par branch nahi likhi — purane record ya poori dukaan ke kharch.</p>
        )}
      </section>
    </div>
  );
}
