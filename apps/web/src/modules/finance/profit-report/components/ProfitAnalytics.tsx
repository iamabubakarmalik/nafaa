/**
 * Profit analytics for the chosen period: the road from sales to net profit
 * against the previous period, the trend, top earners against top sellers,
 * categories, loss-making items, what discounts and returns cost, weekday
 * pattern, expenses and stock written off.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CalendarClock, Crown, Flame, Layers, PackageX, Receipt, RotateCcw, Scale, Sparkles, TrendingUp, Trophy } from 'lucide-react';
import { Card, Segmented, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { ProfitBrief, ProfitOverview } from '../api';
import { Change } from './ProductRows';
import { WEEKDAYS, change, chargeSplit, dayLabel, pct, qty } from './meta';
import { ProfitSplitCard } from '@modules/reports/ProfitSplit';
import { t as tr } from '@core/i18n';

const PALETTE = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#64748b', '#9333ea'];

interface Fmt { money: (n: number) => string; cost: (n: number) => string; costHidden: boolean }

export function ProfitAnalytics({ data, loading, fmt }: { data?: ProfitOverview; loading: boolean; fmt: Fmt }) {
  const theme = useChartTheme();
  const tip = theme.tooltip;
  const [metric, setMetric] = useState<'profit' | 'revenue' | 'margin'>(fmt.costHidden ? 'revenue' : 'profit');

  if (loading || !data) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>;
  }
  const t = data.totals;
  const shown = fmt.costHidden ? 'revenue' : metric;
  const trend = data.trend.map((d) => ({ ...d, label: dayLabel(d.key) }));
  const cats = data.byCategory.slice(0, 10).map((c) => ({ name: c.name, value: fmt.costHidden ? c.revenue : c.profit ?? 0, color: c.color }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <NetCard data={data} fmt={fmt} />

        <Card className="rounded-2xl lg:col-span-2" title={<span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-600" />{tr('Profit ka rujhan')}</span>}
          description={data.range.byMonth ? tr('Mahine war') : tr('Din war')}
          actions={fmt.costHidden ? undefined : <Segmented label={tr('Kya dikhayein')} value={metric} onChange={setMetric} items={[{ value: 'profit', label: tr('Profit') }, { value: 'revenue', label: tr('Sale') }, { value: 'margin', label: tr('Margin') }]} />}>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="profit-trend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={shown === 'profit' ? theme.profit : theme.primary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={shown === 'profit' ? theme.profit : theme.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} width={44} tickFormatter={shown === 'margin' ? (v: number) => `${v}%` : axisMoney} />
                <Tooltip formatter={(v) => [shown === 'margin' ? `${Number(v).toFixed(1)}%` : formatPKR(Number(v)), shown === 'profit' ? tr('Profit') : shown === 'margin' ? tr('Margin') : tr('Sale')]} {...tip} />
                <Area type="monotone" dataKey={shown} stroke={shown === 'profit' ? theme.profit : theme.primary} strokeWidth={2.25} fill="url(#profit-trend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Earners against sellers: the dish that sells most is often not the one that earns most. */}
      <div className="grid gap-4 lg:grid-cols-2">
        {!fmt.costHidden && (
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Crown className="h-4 w-4 text-amber-500" />{tr('Sab se zyada kamayi')}</span>} description={tr('Profit ke hisaab se · saath me sale ka number')}>
            <BriefList rows={data.topEarners} empty={tr('Koi profit nahi')} value={(r) => fmt.cost(r.profit ?? 0)}
              sub={(r) => tr('{{revenue}} sale · {{margin}} · sale me #{{revenueRank}}', { revenue: fmt.money(r.revenue), margin: pct(r.margin), revenueRank: r.revenueRank })} />
          </Card>
        )}
        <Card className={cn('rounded-2xl', fmt.costHidden && 'lg:col-span-2')} title={<span className="inline-flex items-center gap-2"><Trophy className="h-4 w-4 text-brand-600" />{tr('Sab se zyada biki')}</span>} description={tr('Sale ke hisaab se · saath me profit ka number')}>
          <BriefList rows={data.topSellers} empty={tr('Koi sale nahi')} value={(r) => fmt.money(r.revenue)}
            sub={(r) => fmt.costHidden ? `${qty(r.qty)} ${r.unit}` : tr('{{value}} profit · {{margin}} · profit me #{{profitRank}}', { value: fmt.cost(r.profit ?? 0), margin: pct(r.margin), profitRank: r.profitRank })} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Layers className="h-4 w-4 text-brand-600" />{tr('Category war {{value}}', { value: fmt.costHidden ? tr('sale') : tr('profit') })}</span>}>
          {!cats.length ? <Empty text={tr('Koi sale nahi')} /> : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cats} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} horizontal={false} />
                  <XAxis type="number" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} />
                  <YAxis type="category" dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} width={110} />
                  <Tooltip formatter={(v) => [formatPKR(Number(v)), fmt.costHidden ? tr('Sale') : tr('Profit')]} {...tip} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                    {cats.map((c, i) => <Cell key={c.name} fill={c.value < 0 ? '#e11d48' : c.color || PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {!fmt.costHidden ? (
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Flame className="h-4 w-4 text-rose-600" />{tr('Nuqsan wali cheezein')}</span>}
            description={data.losses.count ? tr('{{count}} cheezein cost se sasti biki · kul {{amount}}', { count: data.losses.count, amount: fmt.cost(data.losses.amount) }) : tr('Koi cheez cost se sasti nahi biki')}>
            <BriefList rows={data.losses.items} empty={tr('Shabash — sab profit me')} tone="rose" value={(r) => fmt.cost(r.profit ?? 0)}
              sub={(r) => tr('{{qty}} {{unit}} · {{revenue}} sale{{value}}', { qty: qty(r.qty), unit: r.unit, revenue: fmt.money(r.revenue), value: r.discount ? tr(' · discount {{discount}}', { discount: fmt.money(r.discount) }) : '' })} />
          </Card>
        ) : (
          <WeekdayCard data={data} fmt={fmt} />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-pink-600" />{tr('Discount ka asar')}</span>}
          description={t.gross > 0 ? tr('{{discount}} discount — list rate ka {{value}}%', { discount: fmt.money(t.discount), value: ((t.discount / t.gross) * 100).toFixed(1) }) : tr('Koi discount nahi')}>
          {!fmt.costHidden && t.discount > 0 && (
            <p className="mb-3 rounded-xl bg-pink-50 px-3 py-2 text-[0.8125rem] text-pink-900">
              {tr('Bina discount profit {{value}} hota — discount ne profit ka {{value2}}% le liya.', { value: fmt.cost((t.profit ?? 0) + t.discount), value2: (t.profit ?? 0) + t.discount > 0 ? ((t.discount / ((t.profit ?? 0) + t.discount)) * 100).toFixed(0) : 0 })}
            </p>
          )}
          <BriefList rows={data.discountTop} empty={tr('Kisi cheez par discount nahi di')} value={(r) => fmt.money(r.discount)}
            sub={(r) => tr('{{revenue}} sale{{value}}', { revenue: fmt.money(r.revenue), value: fmt.costHidden ? '' : tr(' · {{value}} profit', { value: fmt.cost(r.profit ?? 0) }) })} />
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><RotateCcw className="h-4 w-4 text-orange-600" />{tr('Return ka asar')}</span>}
          description={t.refund > 0 ? tr('{{refund}} wapas diye · {{returnedQty}} cheezein', { refund: fmt.money(t.refund), returnedQty: qty(t.returnedQty) }) : tr('Is period ke bill par koi return nahi')}>
          {!fmt.costHidden && t.refund > 0 && (
            <p className="mb-3 rounded-xl bg-orange-50 px-3 py-2 text-[0.8125rem] text-orange-900">
              {tr('Return se profit {{value}} kam hua (maal wapas aaya, us ki cost bach gayi).', { value: fmt.cost(t.returnProfit ?? 0) })}
            </p>
          )}
          <BriefList rows={data.returnTop} empty={tr('Koi return nahi')} value={(r) => fmt.money(r.refund)}
            sub={(r) => tr('{{returnedQty}} {{unit}} wapas{{value}}', { returnedQty: qty(r.returnedQty), unit: r.unit, value: fmt.costHidden ? '' : tr(' · profit {{value}} kam', { value: fmt.cost(r.returnProfit ?? 0) }) })} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {!fmt.costHidden && <WeekdayCard data={data} fmt={fmt} />}
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Receipt className="h-4 w-4 text-brand-600" />{tr('Expenses')}</span>}
          description={tr('{{expenses}} · pehle {{expenses2}}', { expenses: fmt.money(data.net.expenses), expenses2: fmt.money(data.prevNet.expenses) })}>
          {!data.net.expenseCategories.length ? <Empty text={tr('Koi expense nahi')} /> : (
            <ul className="space-y-2.5">
              {data.net.expenseCategories.slice(0, 8).map((c, i) => (
                <li key={c.id}>
                  <div className="flex justify-between gap-2 text-[0.8125rem]">
                    <span className="truncate font-medium text-slate-800">{c.name}</span>
                    <span className="shrink-0 tabular-nums text-slate-900">{fmt.money(c.amount)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${data.net.expenses > 0 ? (c.amount / data.net.expenses) * 100 : 0}%`, background: c.color || PALETTE[i % PALETTE.length] }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/expenses" className="mt-3 inline-block text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('Expenses dekhein →')}</Link>
        </Card>
        {!fmt.costHidden && (
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><PackageX className="h-4 w-4 text-rose-600" />{tr('Kharab aur gum maal')}</span>}
            description={tr('{{value}} · {{value2}} entries', { value: fmt.cost(data.net.writeOffCost ?? 0), value2: data.net.damageCount + data.net.lossCount })}>
            {!data.net.topWriteOffs.length ? <Empty text={tr('Koi maal kharab ya gum nahi hua')} /> : (
              <ul className="divide-y divide-slate-100">
                {data.net.topWriteOffs.map((w) => (
                  <li key={w.productId} className="flex items-center justify-between gap-2 py-2 text-[0.8125rem]">
                    <span className="min-w-0"><span className="block truncate font-medium text-slate-800">{w.name}</span><span className="text-[0.75rem] text-slate-500">{qty(w.qty)} {w.unit}</span></span>
                    <span className="shrink-0 font-semibold tabular-nums text-rose-700">{fmt.cost(w.writeOffCost ?? 0)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/stock-adjustments" className="mt-3 inline-block text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('Stock adjustments →')}</Link>
          </Card>
        )}
      </div>
    </div>
  );
}

/** Gross sales down to net profit, with the previous period beside each line. */
export function NetCard({ data, fmt }: { data: ProfitOverview; fmt: Fmt }) {
  const t = data.totals;
  const p = data.prev;
  const n = data.net;
  const pn = data.prevNet;
  const c = chargeSplit(t);
  const pc = chargeSplit(p);
  // With "Paisa milne par" the khata lines take the bill profit to the headline.
  const paid = !fmt.costHidden && n.split?.basis === 'PAID';
  const line = (label: string, now: number, before: number, kind: 'money' | 'cost', opts: { minus?: boolean; plus?: boolean; strong?: boolean; invert?: boolean } = {}) => {
    const f = kind === 'cost' ? fmt.cost : fmt.money;
    return (
      <li className={cn('flex items-center justify-between gap-3 py-1.5', opts.strong && 'border-t border-slate-200 pt-2 font-semibold')}>
        <span className={cn('text-[0.8125rem]', opts.strong ? 'text-slate-900' : 'text-slate-600')}>{opts.minus ? '− ' : opts.plus ? '+ ' : ''}{label}</span>
        <span className="text-end">
          <span className={cn('block tabular-nums', opts.strong ? 'text-[0.9375rem] text-slate-900' : 'text-[0.8125rem] text-slate-800', opts.strong && now < 0 && !fmt.costHidden && 'text-rose-700')}>{f(now)}</span>
          {!(kind === 'cost' && fmt.costHidden) && <span className="flex items-center justify-end gap-1 text-[0.6875rem] text-slate-400">{tr('pehle {{before}}', { before: f(before) })}{' '} <Change c={change(now, before)} invert={opts.invert} /></span>}
        </span>
      </li>
    );
  };
  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Scale className="h-4 w-4 text-brand-600" />{tr('Sale se net profit tak')}</span>}
      description={tr('Pichhli period: {{prevFrom}} — {{prevTo}}', { prevFrom: dayLabel(data.range.prevFrom), prevTo: dayLabel(data.range.prevTo) })}>
      <ul>
        {line(tr('List rate par sale'), t.gross, p.gross, 'money')}
        {line(tr('Discount'), t.discount, p.discount, 'money', { minus: true, invert: true })}
        {line(tr('Return'), t.refund, p.refund, 'money', { minus: true, invert: true })}
        {c.shown && line(c.bills ? tr('Service charges · {{bills}} bill', { bills: c.bills }) : tr('Service charges'), c.revenue, pc.revenue, 'money', { plus: true })}
        {line(tr('Asal sale'), t.revenue, p.revenue, 'money', { strong: true })}
        {line(tr('Maal ki cost'), c.lineCost, pc.lineCost, 'cost', { minus: true, invert: true })}
        {c.cost !== 0 && line(tr('Bill par alag cost (rider waghera)'), c.cost, pc.cost, 'cost', { minus: true, invert: true })}
        {line(tr('Bill ka profit'), t.profit ?? 0, p.profit ?? 0, 'cost', { strong: true })}
        {paid && line(tr('Udhaar mein profit (abhi aana hai)'), n.split?.pending ?? 0, pn.split?.pending ?? 0, 'cost', { minus: true })}
        {paid && !!(n.split?.writtenOff) && line(tr('Udhaar maaf kiya'), n.split?.writtenOff ?? 0, pn.split?.writtenOff ?? 0, 'cost', { minus: true })}
        {paid && !!(n.split?.fromOlderBills) && line(tr('Pehle ke udhaar se aaya'), n.split?.fromOlderBills ?? 0, pn.split?.fromOlderBills ?? 0, 'cost', { plus: true })}
        {paid && line(tr('Haath mein aaya profit'), n.grossProfit ?? 0, pn.grossProfit ?? 0, 'cost', { strong: true })}
        {line(tr('Expenses'), n.expenses, pn.expenses, 'money', { minus: true, invert: true })}
        {line(tr('Stock nuksan'), n.stockLoss ?? n.writeOffCost ?? 0, pn.stockLoss ?? pn.writeOffCost ?? 0, 'cost', { minus: true, invert: true })}
        {!!(n.stockGain || pn.stockGain) && line(tr('Stock faida'), n.stockGain ?? 0, pn.stockGain ?? 0, 'cost', { plus: true })}
        {!!(n.otherIncome || pn.otherIncome) && line(tr('Doosri aamdani'), n.otherIncome ?? 0, pn.otherIncome ?? 0, 'money', { plus: true })}
        {line(tr('Net profit'), n.netProfit ?? 0, pn.netProfit ?? 0, 'cost', { strong: true })}
      </ul>
      {!fmt.costHidden && <ProfitSplitCard split={n.split} money={fmt.cost} className="mt-3" />}
      {data.filtered && (
        <p className="mt-2 flex gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{tr('Filter laga hai — expenses poori dukaan ke hain, is liye net profit sirf andaza hai.')}</p>
      )}
    </Card>
  );
}

function WeekdayCard({ data, fmt }: { data: ProfitOverview; fmt: Fmt }) {
  const theme = useChartTheme();
  const key = fmt.costHidden ? 'revenue' : 'profit';
  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4 text-brand-600" />{tr('Hafte ke din')}</span>} description={tr('Kis din zyada {{value}}', { value: fmt.costHidden ? tr('sale') : tr('profit') })}>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.weekday.map((w) => ({ ...w, name: WEEKDAYS[w.day] }))} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} interval={0} tickFormatter={(v: string) => v.slice(0, 3)} />
            <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
            <Tooltip formatter={(v) => [formatPKR(Number(v)), fmt.costHidden ? tr('Sale') : tr('Profit')]} {...theme.tooltip} />
            <Bar dataKey={key} fill={theme.highlight} radius={[6, 6, 0, 0]} barSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function BriefList({ rows, empty, value, sub, tone }: {
  rows: ProfitBrief[]; empty: string; value: (r: ProfitBrief) => string; sub: (r: ProfitBrief) => string; tone?: 'rose';
}) {
  if (!rows.length) return <Empty text={empty} />;
  return (
    <ol className="divide-y divide-slate-100">
      {rows.map((r, i) => (
        <li key={r.key} className="flex items-center justify-between gap-3 py-2">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[0.6875rem] font-bold text-slate-600">{i + 1}</span>
            <span className="min-w-0">
              {r.productId
                ? <Link to={`/products/${r.productId}`} className="block truncate text-[0.8125rem] font-semibold text-slate-900 hover:text-brand-700">{r.name}</Link>
                : <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{r.name}</span>}
              <span className="block truncate text-[0.6875rem] text-slate-500">{sub(r)}</span>
            </span>
          </span>
          <span className={cn('shrink-0 text-[0.875rem] font-bold tabular-nums', tone === 'rose' ? 'text-rose-700' : 'text-slate-900')}>{value(r)}</span>
        </li>
      ))}
    </ol>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-[0.8125rem] text-slate-500">{text}</p>;
}
