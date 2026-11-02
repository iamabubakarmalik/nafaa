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
import { ProfitSplitCard } from '@modules/reports/ProfitSplit';
import { t as tr } from '@core/i18n';

/**
 * Statement lines. `part` lines show what an amount above already holds and
 * `opt` lines are left out at zero. The khata lines take the bill profit to
 * the headline ("Haath mein aaya profit") when the shop counts udhaar profit
 * when the money comes; with "Bill bante hi" the headline is the bill profit.
 */
type Key = 'gross' | 'service' | 'refunds' | 'sales' | 'cost' | 'billProfit' | 'pending' | 'writtenOff' | 'fromOlderBills' | 'grossProfit'
  | 'expenses' | 'stockLoss' | 'stockGain' | 'otherIncome' | 'netProfit';
type Line = { label: string; key: Key; sign?: '-' | '=' | '+'; cost?: boolean; up?: 'good' | 'bad'; part?: boolean; opt?: boolean; paidOnly?: boolean };
const LINES: Line[] = [
  { label: tr('Total sale'), key: 'gross' },
  { label: tr('Is me service charges'), key: 'service', part: true, opt: true },
  { label: tr('Maal wapas'), key: 'refunds', sign: '-', up: 'bad' },
  { label: tr('Asal sale'), key: 'sales', sign: '=' },
  { label: tr('Maal ki cost'), key: 'cost', sign: '-', cost: true, up: 'bad' },
  { label: tr('Bill ka profit'), key: 'billProfit', sign: '=', cost: true },
  { label: tr('Udhaar mein profit (abhi aana hai)'), key: 'pending', sign: '-', cost: true, opt: true, paidOnly: true },
  { label: tr('Udhaar maaf kiya'), key: 'writtenOff', sign: '-', cost: true, opt: true, paidOnly: true },
  { label: tr('Pehle ke udhaar se aaya'), key: 'fromOlderBills', sign: '+', cost: true, opt: true, paidOnly: true },
  { label: tr('Haath mein aaya profit'), key: 'grossProfit', sign: '=', cost: true, paidOnly: true },
  { label: tr('Expenses'), key: 'expenses', sign: '-', up: 'bad' },
  { label: tr('Stock nuksan'), key: 'stockLoss', sign: '-', cost: true, up: 'bad', opt: true },
  { label: tr('Stock faida'), key: 'stockGain', sign: '+', cost: true, opt: true },
  { label: tr('Doosri aamdani'), key: 'otherIncome', sign: '+', opt: true },
  { label: tr('Net profit'), key: 'netProfit', sign: '=', cost: true },
];

/** Every statement figure of a summary, flat; older responses fall back to the totals they had. */
function figures(t: ProfitSummary): Record<Key, number> {
  const s = t.split;
  return {
    gross: t.gross, service: t.service, refunds: t.refunds, sales: t.sales, cost: t.cost ?? 0,
    billProfit: t.billProfit ?? t.grossProfit ?? 0,
    pending: s?.pending ?? 0, writtenOff: s?.writtenOff ?? 0, fromOlderBills: s?.fromOlderBills ?? 0,
    grossProfit: t.grossProfit ?? 0, expenses: t.expenses,
    stockLoss: t.stockLoss ?? t.damage, stockGain: t.stockGain ?? 0, otherIncome: t.otherIncome ?? 0, netProfit: t.netProfit ?? 0,
  };
}

export function ProfitSection({ data: d, f, compare }: { data: ProfitReport; f: Formatter; compare: boolean }) {
  const theme = useChartTheme();
  const showCost = !f.costHidden && d.totals.netProfit != null;
  const t = d.totals;
  const now = figures(t);
  const before = d.previous ? figures(d.previous) : null;
  const paidBasis = t.split?.basis === 'PAID';
  const lines = LINES.filter((l) => (showCost || !l.cost) && (!l.paidOnly || paidBasis) && (!l.opt || Math.abs(now[l.key]) > 0.005));
  return (
    <div className="space-y-4">
      {!showCost && (
        <p className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-[0.8125rem] text-slate-700">
          <Lock className="h-4 w-4" /> {' '}{tr('Cost aur profit band hai — sirf sale aur expenses dikh rahe hain.')}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-5">
        <Panel icon={Scale} title={tr('Profit-loss')} hint={tr('Return ke baad, sale ke waqt ki cost se')} className="lg:col-span-2"
          actions={<Link to="/profit-report" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('Cheez war profit →')}</Link>}>
          <dl className="divide-y divide-slate-100 text-[0.875rem]">
            {lines.map((l) => {
              const v = now[l.key];
              const p = compare && before ? before[l.key] : null;
              const strong = l.sign === '=';
              return (
                <div key={l.key} className={cn('flex items-start justify-between gap-3 py-2', strong && 'font-semibold', l.part && 'py-1.5 ps-4 text-[0.8125rem] text-slate-500')}>
                  <dt className={cn('text-slate-600', strong && 'text-slate-900', l.part && 'text-slate-500')}>{l.sign === '-' ? '− ' : l.sign === '+' ? '+ ' : ''}{l.label}</dt>
                  <dd className="text-end">
                    <span className={cn('tabular-nums', l.key === 'netProfit' && (v < 0 ? 'text-rose-600' : 'text-emerald-700'))}>{l.cost ? f.cost(v) : f.money(v)}</span>
                    {p != null && <span className="block text-[0.6875rem] font-normal"><Delta now={v} before={p} up={l.up} /></span>}
                  </dd>
                </div>
              );
            })}
          </dl>
          {showCost && (
            <p className="mt-2 text-[0.75rem] text-slate-500">
              {tr('Margin {{value}}% · expenses ke baad {{value2}}%{{value3}}', { value: (t.margin ?? 0).toFixed(1), value2: t.netMargin.toFixed(1), value3: t.damageCount ? tr(' · {{damageCount}} stock entry', { damageCount: t.damageCount }) : '' })}
            </p>
          )}
          {showCost && <ProfitSplitCard split={t.split} money={f.cost} className="mt-3" />}
        </Panel>
        <Panel icon={BarChart3} title={d.grouping === 'month' ? tr('Mahine war') : tr('Din war')} className="lg:col-span-3">
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
      <Panel icon={BarChart3} title={tr('Details')}>
        <DataTable rows={[...d.rows].reverse().filter((r) => r.sales || r.expenses)} rowKey={(r) => r.key} empty={tr('Is period me kuch nahi')} columns={[
          { label: d.grouping === 'month' ? tr('Mahina') : tr('Din'), render: (r) => keyLabel(r.key) },
          { label: tr('Sale'), align: 'right', render: (r) => f.money(r.sales) },
          { label: tr('Cost'), align: 'right', hide: !showCost, render: (r) => f.cost(r.cost) },
          { label: tr('Bill ka profit'), align: 'right', hide: !showCost, render: (r) => f.cost(r.billProfit ?? r.grossProfit) },
          { label: tr('Haath mein'), align: 'right', hide: !showCost || !paidBasis, render: (r) => f.cost(r.realised) },
          { label: tr('Expenses'), align: 'right', render: (r) => f.money(r.expenses) },
          { label: tr('Stock (net)'), align: 'right', hide: !showCost, render: (r) => f.cost(r.damage ?? 0) },
          { label: tr('Doosri aamdani'), align: 'right', hide: !d.rows.some((r) => r.otherIncome), render: (r) => f.money(r.otherIncome ?? 0) },
          { label: tr('Net profit'), align: 'right', hide: !showCost, render: (r) => <span className={cn('font-semibold', (r.netProfit ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-700')}>{f.cost(r.netProfit)}</span> },
        ]} />
      </Panel>
    </div>
  );
}
