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

        <Card className="rounded-2xl lg:col-span-2" title={<span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-600" />Profit ka rujhan</span>}
          description={data.range.byMonth ? 'Mahine war' : 'Din war'}
          actions={fmt.costHidden ? undefined : <Segmented label="Kya dikhayein" value={metric} onChange={setMetric} items={[{ value: 'profit', label: 'Profit' }, { value: 'revenue', label: 'Sale' }, { value: 'margin', label: 'Margin' }]} />}>
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
                <Tooltip formatter={(v) => [shown === 'margin' ? `${Number(v).toFixed(1)}%` : formatPKR(Number(v)), shown === 'profit' ? 'Profit' : shown === 'margin' ? 'Margin' : 'Sale']} {...tip} />
                <Area type="monotone" dataKey={shown} stroke={shown === 'profit' ? theme.profit : theme.primary} strokeWidth={2.25} fill="url(#profit-trend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Earners against sellers: the dish that sells most is often not the one that earns most. */}
      <div className="grid gap-4 lg:grid-cols-2">
        {!fmt.costHidden && (
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Crown className="h-4 w-4 text-amber-500" />Sab se zyada kamayi</span>} description="Profit ke hisaab se · saath me sale ka number">
            <BriefList rows={data.topEarners} empty="Koi profit nahi" value={(r) => fmt.cost(r.profit ?? 0)}
              sub={(r) => `${fmt.money(r.revenue)} sale · ${pct(r.margin)} · sale me #${r.revenueRank}`} />
          </Card>
        )}
        <Card className={cn('rounded-2xl', fmt.costHidden && 'lg:col-span-2')} title={<span className="inline-flex items-center gap-2"><Trophy className="h-4 w-4 text-brand-600" />Sab se zyada biki</span>} description="Sale ke hisaab se · saath me profit ka number">
          <BriefList rows={data.topSellers} empty="Koi sale nahi" value={(r) => fmt.money(r.revenue)}
            sub={(r) => fmt.costHidden ? `${qty(r.qty)} ${r.unit}` : `${fmt.cost(r.profit ?? 0)} profit · ${pct(r.margin)} · profit me #${r.profitRank}`} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Layers className="h-4 w-4 text-brand-600" />Category war {fmt.costHidden ? 'sale' : 'profit'}</span>}>
          {!cats.length ? <Empty text="Koi sale nahi" /> : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cats} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} horizontal={false} />
                  <XAxis type="number" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} />
                  <YAxis type="category" dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} width={110} />
                  <Tooltip formatter={(v) => [formatPKR(Number(v)), fmt.costHidden ? 'Sale' : 'Profit']} {...tip} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                    {cats.map((c, i) => <Cell key={c.name} fill={c.value < 0 ? '#e11d48' : c.color || PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {!fmt.costHidden ? (
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Flame className="h-4 w-4 text-rose-600" />Nuqsan wali cheezein</span>}
            description={data.losses.count ? `${data.losses.count} cheezein cost se sasti biki · kul ${fmt.cost(data.losses.amount)}` : 'Koi cheez cost se sasti nahi biki'}>
            <BriefList rows={data.losses.items} empty="Shabash — sab profit me" tone="rose" value={(r) => fmt.cost(r.profit ?? 0)}
              sub={(r) => `${qty(r.qty)} ${r.unit} · ${fmt.money(r.revenue)} sale${r.discount ? ` · discount ${fmt.money(r.discount)}` : ''}`} />
          </Card>
        ) : (
          <WeekdayCard data={data} fmt={fmt} />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-pink-600" />Discount ka asar</span>}
          description={t.gross > 0 ? `${fmt.money(t.discount)} discount — list rate ka ${((t.discount / t.gross) * 100).toFixed(1)}%` : 'Koi discount nahi'}>
          {!fmt.costHidden && t.discount > 0 && (
            <p className="mb-3 rounded-xl bg-pink-50 px-3 py-2 text-[0.8125rem] text-pink-900">
              Bina discount profit {fmt.cost((t.profit ?? 0) + t.discount)} hota — discount ne profit ka {(t.profit ?? 0) + t.discount > 0 ? ((t.discount / ((t.profit ?? 0) + t.discount)) * 100).toFixed(0) : 0}% le liya.
            </p>
          )}
          <BriefList rows={data.discountTop} empty="Kisi cheez par discount nahi di" value={(r) => fmt.money(r.discount)}
            sub={(r) => `${fmt.money(r.revenue)} sale${fmt.costHidden ? '' : ` · ${fmt.cost(r.profit ?? 0)} profit`}`} />
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><RotateCcw className="h-4 w-4 text-orange-600" />Return ka asar</span>}
          description={t.refund > 0 ? `${fmt.money(t.refund)} wapas diye · ${qty(t.returnedQty)} cheezein` : 'Is period ke bill par koi return nahi'}>
          {!fmt.costHidden && t.refund > 0 && (
            <p className="mb-3 rounded-xl bg-orange-50 px-3 py-2 text-[0.8125rem] text-orange-900">
              Return se profit {fmt.cost(t.returnProfit ?? 0)} kam hua (maal wapas aaya, us ki cost bach gayi).
            </p>
          )}
          <BriefList rows={data.returnTop} empty="Koi return nahi" value={(r) => fmt.money(r.refund)}
            sub={(r) => `${qty(r.returnedQty)} ${r.unit} wapas${fmt.costHidden ? '' : ` · profit ${fmt.cost(r.returnProfit ?? 0)} kam`}`} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {!fmt.costHidden && <WeekdayCard data={data} fmt={fmt} />}
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Receipt className="h-4 w-4 text-brand-600" />Expenses</span>}
          description={`${fmt.money(data.net.expenses)} · pehle ${fmt.money(data.prevNet.expenses)}`}>
          {!data.net.expenseCategories.length ? <Empty text="Koi expense nahi" /> : (
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
          <Link to="/expenses" className="mt-3 inline-block text-[0.8125rem] font-semibold text-brand-700 hover:underline">Expenses dekhein →</Link>
        </Card>
        {!fmt.costHidden && (
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><PackageX className="h-4 w-4 text-rose-600" />Kharab aur gum maal</span>}
            description={`${fmt.cost(data.net.writeOffCost ?? 0)} · ${data.net.damageCount + data.net.lossCount} entries`}>
            {!data.net.topWriteOffs.length ? <Empty text="Koi maal kharab ya gum nahi hua" /> : (
              <ul className="divide-y divide-slate-100">
                {data.net.topWriteOffs.map((w) => (
                  <li key={w.productId} className="flex items-center justify-between gap-2 py-2 text-[0.8125rem]">
                    <span className="min-w-0"><span className="block truncate font-medium text-slate-800">{w.name}</span><span className="text-[0.75rem] text-slate-500">{qty(w.qty)} {w.unit}</span></span>
                    <span className="shrink-0 font-semibold tabular-nums text-rose-700">{fmt.cost(w.writeOffCost ?? 0)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/stock-adjustments" className="mt-3 inline-block text-[0.8125rem] font-semibold text-brand-700 hover:underline">Stock adjustments →</Link>
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
        <span className="text-right">
          <span className={cn('block tabular-nums', opts.strong ? 'text-[0.9375rem] text-slate-900' : 'text-[0.8125rem] text-slate-800', opts.strong && now < 0 && !fmt.costHidden && 'text-rose-700')}>{f(now)}</span>
          {!(kind === 'cost' && fmt.costHidden) && <span className="flex items-center justify-end gap-1 text-[0.6875rem] text-slate-400">pehle {f(before)} <Change c={change(now, before)} invert={opts.invert} /></span>}
        </span>
      </li>
    );
  };
  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Scale className="h-4 w-4 text-brand-600" />Sale se net profit tak</span>}
      description={`Pichhli period: ${dayLabel(data.range.prevFrom)} — ${dayLabel(data.range.prevTo)}`}>
      <ul>
        {line('List rate par sale', t.gross, p.gross, 'money')}
        {line('Discount', t.discount, p.discount, 'money', { minus: true, invert: true })}
        {line('Return', t.refund, p.refund, 'money', { minus: true, invert: true })}
        {c.shown && line(c.bills ? `Service charges · ${c.bills} bill` : 'Service charges', c.revenue, pc.revenue, 'money', { plus: true })}
        {line('Asal sale', t.revenue, p.revenue, 'money', { strong: true })}
        {line('Maal ki cost', c.lineCost, pc.lineCost, 'cost', { minus: true, invert: true })}
        {c.cost !== 0 && line('Bill par alag cost (rider waghera)', c.cost, pc.cost, 'cost', { minus: true, invert: true })}
        {line('Bill ka profit', t.profit ?? 0, p.profit ?? 0, 'cost', { strong: true })}
        {paid && line('Udhaar mein profit (abhi aana hai)', n.split?.pending ?? 0, pn.split?.pending ?? 0, 'cost', { minus: true })}
        {paid && !!(n.split?.writtenOff) && line('Udhaar maaf kiya', n.split?.writtenOff ?? 0, pn.split?.writtenOff ?? 0, 'cost', { minus: true })}
        {paid && !!(n.split?.fromOlderBills) && line('Pehle ke udhaar se aaya', n.split?.fromOlderBills ?? 0, pn.split?.fromOlderBills ?? 0, 'cost', { plus: true })}
        {paid && line('Haath mein aaya profit', n.grossProfit ?? 0, pn.grossProfit ?? 0, 'cost', { strong: true })}
        {line('Expenses', n.expenses, pn.expenses, 'money', { minus: true, invert: true })}
        {line('Stock nuksan', n.stockLoss ?? n.writeOffCost ?? 0, pn.stockLoss ?? pn.writeOffCost ?? 0, 'cost', { minus: true, invert: true })}
        {!!(n.stockGain || pn.stockGain) && line('Stock faida', n.stockGain ?? 0, pn.stockGain ?? 0, 'cost', { plus: true })}
        {!!(n.otherIncome || pn.otherIncome) && line('Doosri aamdani', n.otherIncome ?? 0, pn.otherIncome ?? 0, 'money', { plus: true })}
        {line('Net profit', n.netProfit ?? 0, pn.netProfit ?? 0, 'cost', { strong: true })}
      </ul>
      {!fmt.costHidden && <ProfitSplitCard split={n.split} money={fmt.cost} className="mt-3" />}
      {data.filtered && (
        <p className="mt-2 flex gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Filter laga hai — expenses poori dukaan ke hain, is liye net profit sirf andaza hai.</p>
      )}
    </Card>
  );
}

function WeekdayCard({ data, fmt }: { data: ProfitOverview; fmt: Fmt }) {
  const theme = useChartTheme();
  const key = fmt.costHidden ? 'revenue' : 'profit';
  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4 text-brand-600" />Hafte ke din</span>} description={`Kis din zyada ${fmt.costHidden ? 'sale' : 'profit'}`}>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.weekday.map((w) => ({ ...w, name: WEEKDAYS[w.day] }))} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} interval={0} tickFormatter={(v: string) => v.slice(0, 3)} />
            <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
            <Tooltip formatter={(v) => [formatPKR(Number(v)), fmt.costHidden ? 'Sale' : 'Profit']} {...theme.tooltip} />
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
