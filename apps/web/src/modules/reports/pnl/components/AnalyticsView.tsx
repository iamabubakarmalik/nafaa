/**
 * P&L analytics: where the expenses go and what share of sales they take,
 * the margin trend, discounts and returns over time, and the break-even
 * point worked out from the expenses the owner marks as fixed.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Check, Gauge, PieChart as PieIcon, Percent, Target, TrendingUp } from 'lucide-react';
import { Card } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { PnlMonthly, PnlReport } from '../api';
import { PART_COLORS, monthLabel, pctText, sumStatements } from '../meta';
import { Empty, type Fmt } from './parts';

const STAFF_ID = '__staff';
const FIXED_KEY = 'pnl-not-fixed';
const pctTick = (v: number) => `${Math.round(v)}%`;

export function AnalyticsView({ report, monthly, fmt }: { report: PnlReport; monthly: PnlMonthly; fmt: Fmt }) {
  const theme = useChartTheme();
  const showCost = !fmt.costHidden && report.costVisible;
  const s = report.current;
  const net = s.revenue.net;

  const parts = [
    ...s.expenses.categories.map((c) => ({ id: c.id, name: c.name, color: c.color, amount: c.amount })),
    ...(s.expenses.salaries > 0 ? [{ id: 'salaries', name: 'Tankhwah', color: '#0d9488', amount: s.expenses.salaries }] : []),
    ...(s.expenses.commission > 0 ? [{ id: 'commission', name: 'Commission', color: '#9333ea', amount: s.expenses.commission }] : []),
  ].filter((x) => x.amount > 0);
  const ratio = net > 0 ? (s.expenses.total / net) * 100 : null;

  const trend = monthly.months.map(({ key, statement: m }) => ({
    key, name: monthLabel(key),
    expense: m.revenue.net > 0 ? (m.expenses.total / m.revenue.net) * 100 : 0,
    gross: m.grossMargin ?? 0,
    net: m.netMargin ?? 0,
    discount: m.revenue.gross > 0 ? (m.revenue.discount / m.revenue.gross) * 100 : 0,
    returns: m.revenue.sales > 0 ? (m.revenue.returns / m.revenue.sales) * 100 : 0,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><PieIcon className="h-4 w-4 text-brand-600" />Kharchay kahan gaye</span>}
          description={ratio == null ? 'Is muddat me bikri nahi' : `Kharchay net bikri ka ${pctText(ratio)} hain`}>
          {!parts.length ? <Empty text="Is muddat me koi kharcha nahi" /> : (
            <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
              <div className="relative h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={parts} dataKey="amount" nameKey="name" innerRadius={56} outerRadius={84} paddingAngle={2} stroke="none">
                      {parts.map((p) => <Cell key={p.id} fill={p.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [formatPKR(Number(v)), String(n)]} {...theme.tooltip} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold tabular-nums text-slate-900">{pctText(ratio)}</span>
                  <span className="text-[0.6875rem] text-slate-500">bikri ka</span>
                </div>
              </div>
              <ul className="space-y-1.5 text-[0.8125rem]">
                {parts.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} /><span className="truncate">{p.name}</span></span>
                    <span className="shrink-0 tabular-nums text-slate-900">{fmt.sales(p.amount)} <span className="text-slate-400">{net > 0 ? pctText((p.amount / net) * 100) : ''}</span></span>
                  </li>
                ))}
                {parts.length > 8 && <li className="text-[0.75rem] text-slate-500">+{parts.length - 8} aur</li>}
              </ul>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Percent className="h-4 w-4 text-brand-600" />Kharchay bikri ka kitna %</span>}
          description="Har mahine kharchay ÷ net bikri. Kam ho to achha">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={4} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={pctTick} width={40} />
                <Tooltip formatter={(v) => [pctText(Number(v)), 'Kharchay / bikri']} {...theme.tooltip} />
                <Bar dataKey="expense" fill={PART_COLORS.expenses} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-600" />Margin ka rujhan</span>}
          description="Gross margin: maal ke baad bacha. Net margin: sab kuch ke baad bacha">
          {!showCost ? <p className="py-16 text-center text-[0.875rem] text-slate-500">Margin dekhne ke liye cost kholein</p> : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={4} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={pctTick} width={40} />
                  <Tooltip formatter={(v, n) => [pctText(Number(v)), n === 'gross' ? 'Gross margin' : 'Net margin']} {...theme.tooltip} />
                  <Legend formatter={(v) => (v === 'gross' ? 'Gross margin' : 'Net margin')} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="gross" stroke={theme.primary} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="net" stroke={PART_COLORS.profit} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Gauge className="h-4 w-4 text-brand-600" />Discount aur wapsi ka asar</span>}
          description="Discount: list rate ka kitna % chhora. Wapsi: bikri ka kitna % wapas aaya">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={4} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={pctTick} width={40} />
                <Tooltip formatter={(v, n) => [pctText(Number(v)), n === 'discount' ? 'Discount' : 'Wapsi']} {...theme.tooltip} />
                <Legend formatter={(v) => (v === 'discount' ? 'Discount' : 'Wapsi')} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="discount" stroke="#db2777" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="returns" stroke="#ea580c" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <BreakEven monthly={monthly} fmt={fmt} showCost={showCost} />
    </div>
  );
}

/**
 * Sales needed in a month to cover the fixed expenses: fixed monthly
 * expenses ÷ gross margin, both from the last three finished months.
 */
function BreakEven({ monthly, fmt, showCost }: { monthly: PnlMonthly; fmt: Fmt; showCost: boolean }) {
  const [notFixed, setNotFixed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(FIXED_KEY) ?? '[]') as string[]; } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem(FIXED_KEY, JSON.stringify(notFixed)); } catch { /* storage blocked */ } }, [notFixed]);
  const toggle = (id: string) => setNotFixed((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));

  const base = useMemo(() => monthly.months.filter((m) => !m.partial && m.statement.revenue.net > 0).slice(-3), [monthly]);
  const current = monthly.months.find((m) => m.partial);
  const calc = useMemo(() => {
    if (!base.length) return null;
    const sum = sumStatements(base.map((m) => m.statement));
    const fixedTotal = sum.expenses.categories.filter((c) => !notFixed.includes(c.id)).reduce((a, c) => a + c.amount, 0)
      + (notFixed.includes(STAFF_ID) ? 0 : sum.expenses.salaries + sum.expenses.commission);
    const fixed = fixedTotal / base.length;
    const gm = sum.grossMargin ?? 0;
    const avgRevenue = sum.revenue.net / base.length;
    const needed = gm > 0 ? fixed / (gm / 100) : null;
    return { sum, fixed, gm, avgRevenue, needed };
  }, [base, notFixed]);

  const cats = calc?.sum.expenses.categories ?? [];
  const staff = (calc?.sum.expenses.salaries ?? 0) + (calc?.sum.expenses.commission ?? 0);
  const so = current?.statement.revenue.net ?? 0;
  const progress = calc?.needed ? Math.min(100, (so / calc.needed) * 100) : 0;
  const safety = calc?.needed && calc.avgRevenue > 0 ? ((calc.avgRevenue - calc.needed) / calc.avgRevenue) * 100 : null;
  const today = Number(monthly.today.slice(8, 10));
  const daysInMonth = new Date(Date.UTC(Number(monthly.today.slice(0, 4)), Number(monthly.today.slice(5, 7)), 0)).getUTCDate();

  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Target className="h-4 w-4 text-brand-600" />Break-even: kitni bikri par kharcha poora?</span>}
      description={base.length ? `Pichle ${base.length} poore mahinon (${base.map((m) => monthLabel(m.key)).join(', ')}) ke hisaab se` : 'Kam se kam ek poora mahina chahiye'}>
      {!showCost ? <p className="py-10 text-center text-[0.875rem] text-slate-500">Break-even ke liye gross margin chahiye — cost kholein</p>
        : !calc ? <Empty text="Abhi koi poora mahina bikri ke saath nahi" /> : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Fact label="Fixed kharch / mahina" value={fmt.sales(calc.fixed)} hint="Neeche chuni hui cheezein" />
              <Fact label="Gross margin" value={pctText(calc.gm)} hint="Har 100 ki bikri par" />
              <Fact label="Break-even bikri / mahina" value={calc.needed == null ? '—' : fmt.sales(calc.needed)} hint={calc.needed ? `~${fmt.sales(calc.needed / 30)} roz` : 'Margin 0 se upar hona chahiye'} strong />
              <Fact label="Ausat bikri / mahina" value={fmt.sales(calc.avgRevenue)}
                hint={safety == null ? '' : safety >= 0 ? `${pctText(safety)} upar — mehfooz` : `${pctText(-safety)} neeche — nuqsan`} tone={safety == null ? undefined : safety >= 0 ? 'good' : 'bad'} />
            </div>
            {current && calc.needed != null && (
              <div>
                <div className="flex justify-between text-[0.8125rem]">
                  <span className="font-medium text-slate-800">Is mahine ab tak ({today}/{daysInMonth} din)</span>
                  <span className="tabular-nums text-slate-900">{fmt.sales(so)} / {fmt.sales(calc.needed)}</span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={cn('h-full rounded-full', progress >= 100 ? 'bg-emerald-500' : 'bg-brand-500')} style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-1 text-[0.75rem] text-slate-500">
                  {progress >= 100 ? 'Kharcha poora ho gaya — ab har bikri ka gross munafa asal munafa hai'
                    : `Aur ${fmt.sales(calc.needed - so)} chahiye · ${daysInMonth - today + 1} din baqi · ~${fmt.sales((calc.needed - so) / Math.max(1, daysInMonth - today + 1))} roz`}
                </p>
              </div>
            )}
          </div>
          <div>
            <p className="text-[0.8125rem] font-semibold text-slate-800">Kaun se kharchay har mahine lagte hi hain (fixed)?</p>
            <p className="mb-2 text-[0.75rem] text-slate-500">Kiraya, bijli, tankhwah fixed hain. Jo bikri ke saath ghatte barhte hain (packing, delivery) un ka nishan hata dein.</p>
            <div className="flex flex-wrap gap-1.5">
              {[...cats.map((c) => ({ id: c.id, name: c.name, color: c.color, amount: c.amount })), ...(staff > 0 ? [{ id: STAFF_ID, name: 'Tankhwah + commission', color: '#0d9488', amount: staff }] : [])].map((c) => {
                const on = !notFixed.includes(c.id);
                return (
                  <button key={c.id} type="button" onClick={() => toggle(c.id)} aria-pressed={on}
                    className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.75rem] font-medium ring-1 transition',
                      on ? 'bg-brand-50 text-brand-800 ring-brand-200' : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50')}>
                    {on ? <Check className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />}
                    {c.name}<span className="tabular-nums text-slate-400">{fmt.sales(c.amount / base.length)}</span>
                  </button>
                );
              })}
              {!cats.length && !staff && <p className="text-[0.8125rem] text-slate-400">In mahinon me koi kharcha nahi</p>}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function Fact({ label, value, hint, strong, tone }: { label: string; value: string; hint?: string; strong?: boolean; tone?: 'good' | 'bad' }) {
  return (
    <div className={cn('rounded-xl p-3 ring-1', strong ? 'bg-brand-50 ring-brand-100' : 'bg-slate-50 ring-slate-100')}>
      <p className="text-[0.75rem] text-slate-500">{label}</p>
      <p className={cn('mt-0.5 text-lg font-bold tabular-nums', strong ? 'text-brand-800' : 'text-slate-900')}>{value}</p>
      {hint && <p className={cn('text-[0.6875rem]', tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-rose-600' : 'text-slate-500')}>{hint}</p>}
    </div>
  );
}
