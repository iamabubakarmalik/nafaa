/** Profit: a short profit and loss statement, the same per day or month, and a link to profit by item. */

import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Lock, Scale } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { ProfitReport, ProfitSummary } from '../api';
import { DataTable, Delta, Panel, keyLabel, type Formatter } from './parts';
import { PriceTierSplit } from './PriceTierSplit';

/** `part` lines show what an amount above already holds; they are left out at zero. */
type Line = { label: string; key: keyof ProfitSummary; sign?: '-' | '='; cost?: boolean; up?: 'good' | 'bad'; part?: boolean };
const LINES: Line[] = [
  { label: 'Total sale', key: 'gross' },
  { label: 'Is me service charges', key: 'service', part: true },
  { label: 'Maal wapas', key: 'refunds', sign: '-', up: 'bad' },
  { label: 'Asal sale', key: 'sales', sign: '=' },
  { label: 'Maal ki cost', key: 'cost', sign: '-', cost: true, up: 'bad' },
  { label: 'Gross profit', key: 'grossProfit', sign: '=', cost: true },
  { label: 'Expenses', key: 'expenses', sign: '-', up: 'bad' },
  { label: 'Kharab / gum maal', key: 'damage', sign: '-', up: 'bad' },
  { label: 'Net profit', key: 'netProfit', sign: '=', cost: true },
];

export function ProfitSection({ data: d, f, compare }: { data: ProfitReport; f: Formatter; compare: boolean }) {
  const theme = useChartTheme();
  const showCost = !f.costHidden && d.totals.netProfit != null;
  const lines = LINES.filter((l) => (showCost || !l.cost) && (!l.part || Number(d.totals[l.key] ?? 0) !== 0));
  const t = d.totals;
  return (
    <div className="space-y-4">
      {!showCost && (
        <p className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-[0.8125rem] text-slate-700">
          <Lock className="h-4 w-4" /> Cost aur profit band hai — sirf sale aur expenses dikh rahe hain.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-5">
        <Panel icon={Scale} title="Profit-loss" hint="Return ke baad, sale ke waqt ki cost se" className="lg:col-span-2"
          actions={<Link to="/profit-report" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Cheez war profit →</Link>}>
          <dl className="divide-y divide-slate-100 text-[0.875rem]">
            {lines.map((l) => {
              const v = Number(t[l.key] ?? 0);
              const p = compare && d.previous ? Number(d.previous[l.key] ?? 0) : null;
              const strong = l.sign === '=';
              return (
                <div key={l.key} className={cn('flex items-start justify-between gap-3 py-2', strong && 'font-semibold', l.part && 'py-1.5 pl-4 text-[0.8125rem] text-slate-500')}>
                  <dt className={cn('text-slate-600', strong && 'text-slate-900', l.part && 'text-slate-500')}>{l.sign === '-' ? '− ' : ''}{l.label}</dt>
                  <dd className="text-right">
                    <span className={cn('tabular-nums', l.key === 'netProfit' && (v < 0 ? 'text-rose-600' : 'text-emerald-700'))}>{l.cost ? f.cost(v) : f.money(v)}</span>
                    {p != null && <span className="block text-[0.6875rem] font-normal"><Delta now={v} before={p} up={l.up} /></span>}
                  </dd>
                </div>
              );
            })}
          </dl>
          {showCost && (
            <p className="mt-2 text-[0.75rem] text-slate-500">
              Margin {(t.margin ?? 0).toFixed(1)}% · expenses ke baad {t.netMargin.toFixed(1)}%{t.damageCount ? ` · ${t.damageCount} damage entry` : ''}
            </p>
          )}
        </Panel>
        <Panel icon={BarChart3} title={d.grouping === 'month' ? 'Mahine war' : 'Din war'} className="lg:col-span-3">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.rows.map((r) => ({ ...r, label: keyLabel(r.key) }))} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} width={44} tickFormatter={f.salesHidden ? undefined : axisMoney} />
                <Tooltip {...theme.tooltip} formatter={(v, n) => [n === 'Sale' || n === 'Expenses' ? f.money(Number(v)) : f.cost(Number(v)), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="sales" name="Sale" fill={theme.primary} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="expenses" name="Expenses" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={22} />
                {showCost && <Bar dataKey="netProfit" name="Net profit" fill={theme.profit} radius={[4, 4, 0, 0]} maxBarSize={22} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <PriceTierSplit split={d.priceTiers} f={f} showProfit={showCost} />
      <Panel icon={BarChart3} title="Details">
        <DataTable rows={[...d.rows].reverse().filter((r) => r.sales || r.expenses)} rowKey={(r) => r.key} empty="Is period me kuch nahi" columns={[
          { label: d.grouping === 'month' ? 'Mahina' : 'Din', render: (r) => keyLabel(r.key) },
          { label: 'Sale', align: 'right', render: (r) => f.money(r.sales) },
          { label: 'Cost', align: 'right', hide: !showCost, render: (r) => f.cost(r.cost) },
          { label: 'Gross profit', align: 'right', hide: !showCost, render: (r) => f.cost(r.grossProfit) },
          { label: 'Expenses', align: 'right', render: (r) => f.money(r.expenses) },
          { label: 'Net profit', align: 'right', hide: !showCost, render: (r) => <span className={cn('font-semibold', (r.netProfit ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-700')}>{f.cost(r.netProfit)}</span> },
        ]} />
      </Panel>
    </div>
  );
}
