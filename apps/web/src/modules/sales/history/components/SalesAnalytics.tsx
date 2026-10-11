/**
 * Analytics for the current filter: comparison with the period before, trend, busy hours,
 * weekday x hour heatmap, payments, categories, customer mix, products, customers and staff.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  ArrowDownRight, ArrowUpRight, CalendarDays, Clock, Crown, Flame, Layers, Medal, Package, Percent, Receipt, Target,
  TrendingUp, Trophy, UserPlus, Users, Wallet, type LucideIcon,
} from 'lucide-react';
import { Avatar, Card, Segmented, Skeleton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { PAYMENT_COLORS, PAYMENT_LABELS, useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { HistoryAnalytics, HistoryStats } from '../api';
import { qtyText } from './SaleRow';

const WEEKDAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];
const hourLabel = (h: number) => (h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`);
const SOURCE_LABEL: Record<string, string> = { POS: 'Counter', WEBSITE: 'Website', DARAZ: 'Daraz', FOODPANDA: 'Foodpanda', SHOPIFY: 'Shopify', MARKETPLACE: 'Marketplace' };

function Insight({ icon: Icon, color, label, value, hint }: { icon: LucideIcon; color: string; label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}17`, color }}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <div className="text-[0.75rem] font-medium text-slate-500">{label}</div>
        <div className="truncate text-[1.0625rem] font-bold text-slate-900">{value}</div>
        {hint && <div className="truncate text-[0.75rem] text-slate-500">{hint}</div>}
      </div>
    </div>
  );
}

/** Percentage change against the previous period; null when there is nothing to compare. */
const growth = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : null);

function Compare({ icon: Icon, color, label, value, change, hint }: {
  icon: LucideIcon; color: string; label: string; value: string; change: number | null; hint?: string;
}) {
  const up = (change ?? 0) >= 0;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <span className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.08]" style={{ backgroundColor: color }} aria-hidden />
      <div className="flex items-center gap-2 text-[0.75rem] font-medium text-slate-500">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}17`, color }}><Icon className="h-4 w-4" /></span>
        {label}
      </div>
      <div className="mt-2 truncate text-[1.375rem] font-bold tracking-tight text-slate-900 tabular-nums">{value}</div>
      <div className="mt-1 flex items-center gap-1.5 text-[0.75rem]">
        {change === null ? <span className="text-slate-400">{hint ?? 'Pichli muddat ka data nahi'}</span> : (
          <>
            <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold', up ? 'bg-success-50 text-success-700' : 'bg-rose-50 text-rose-700')}>
              {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{Math.abs(change).toFixed(change !== 0 && Math.abs(change) < 10 ? 1 : 0)}%
            </span>
            <span className="truncate text-slate-500">{hint ?? 'pichli muddat se'}</span>
          </>
        )}
      </div>
    </div>
  );
}

/** Split bar with a label on each side, e.g. walk-in vs named customers. */
function Split({ left, right, a, b, colors }: { left: string; right: string; a: number; b: number; colors: [string, string] }) {
  const sum = a + b || 1;
  return (
    <div>
      <div className="flex justify-between text-[0.75rem] font-medium text-slate-600"><span>{left}</span><span>{right}</span></div>
      <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div style={{ width: `${(a / sum) * 100}%`, backgroundColor: colors[0] }} />
        <div style={{ width: `${(b / sum) * 100}%`, backgroundColor: colors[1] }} />
      </div>
    </div>
  );
}

const CATEGORY_FALLBACK = ['#2563eb', '#16a34a', '#d97706', '#db2777', '#7c3aed', '#0891b2', '#ea580c', '#65a30d', '#64748b'];
type TrendMetric = 'sales' | 'bills' | 'average';

export function SalesAnalytics({ data: raw, stats, loading, money, cost, costHidden, salesHidden }: {
  data?: HistoryAnalytics; stats?: HistoryStats; loading: boolean;
  money: (n: number) => string; cost: (n: number) => string; costHidden: boolean; salesHidden: boolean;
}) {
  const theme = useChartTheme();
  const [metric, setMetric] = useState<TrendMetric>('sales');
  const [showAllDays, setShowAllDays] = useState(false);
  if (loading || !raw) return <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>;

  const data = {
    ...raw,
    heatmap: raw.heatmap ?? Array.from({ length: 7 }, () => Array<number>(24).fill(0)),
    categories: raw.categories ?? [],
    customers: raw.customers ?? { walkInBills: 0, walkInTotal: 0, namedBills: 0, namedTotal: 0, uniqueCustomers: 0, repeatCustomers: 0, newCustomers: 0 },
    previous: raw.previous ?? null,
    staff: raw.staff.map((p) => ({ ...p, profit: p.profit ?? 0 })),
  };
  const peak = data.hours.reduce((b, h) => (h.sales > b.sales ? h : b), data.hours[0]);
  const bestDay = data.weekdays.reduce((b, d) => (d.sales > b.sales ? d : b), data.weekdays[0]);
  const trend = data.trend.map((t) => ({
    ...t,
    label: data.grouping === 'month'
      ? new Intl.DateTimeFormat('en-PK', { month: 'short', year: '2-digit' }).format(new Date(`${t.key}-15T12:00:00`))
      : new Intl.DateTimeFormat('en-PK', data.trend.length > 14 ? { day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric' }).format(new Date(`${t.key}T12:00:00`)),
  }));
  const hours = data.hours.filter((h) => h.bills > 0 || (h.hour >= 8 && h.hour <= 23)).map((h) => ({ ...h, label: hourLabel(h.hour) }));
  const weekdays = [...data.weekdays.slice(1), data.weekdays[0]].map((d) => ({ ...d, label: WEEKDAYS[d.day].slice(0, 3), full: WEEKDAYS[d.day] }));
  const payTotal = data.payments.reduce((s, p) => s + p.total, 0);
  const maxProduct = Math.max(...data.topProducts.map((p) => p.revenue), 1);
  const maxStaff = Math.max(...data.staff.map((p) => p.total), 1);
  const tip = { contentStyle: theme.tooltip.contentStyle, labelStyle: theme.tooltip.labelStyle };

  const prev = data.previous;
  const nowTotal = data.trend.reduce((x, t) => x + t.sales, 0);
  const nowBills = data.trend.reduce((x, t) => x + t.bills, 0);
  const nowProfit = data.trend.reduce((x, t) => x + t.profit, 0);
  const avgNow = nowBills ? nowTotal / nowBills : 0;
  const avgPrev = prev?.bills ? prev.total / prev.bills : 0;
  const trendRows = trend.map((t) => ({ ...t, average: t.bills ? Math.round(t.sales / t.bills) : 0 }));
  const dayMax = Math.max(0, ...trendRows.map((t) => t.sales));
  const activeDays = trendRows.filter((t) => t.bills > 0).length;
  const metricName = { sales: 'Bikri', bills: 'Bill', average: 'Ausat bill' }[metric];

  // Heatmap: Monday first; only the hours the shop is actually open.
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];
  const openHours = Array.from({ length: 24 }, (_, i) => i).filter((hr) => data.heatmap.some((row) => row[hr] > 0));
  const heatHours = openHours.length ? Array.from({ length: openHours[openHours.length - 1] - openHours[0] + 1 }, (_, i) => openHours[0] + i) : [];
  const heatMax = Math.max(1, ...data.heatmap.flat());

  const catTotal = data.categories.reduce((x, c) => x + c.revenue, 0) || 1;
  const cats = data.categories.map((c, i) => ({ ...c, color: c.color || CATEGORY_FALLBACK[i % CATEGORY_FALLBACK.length] }));
  const cm = data.customers;
  const returning = cm.uniqueCustomers ? Math.round((cm.repeatCustomers / cm.uniqueCustomers) * 100) : 0;
  const gross = (stats?.total ?? 0) + (stats?.discount ?? 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Compare icon={TrendingUp} color="#2563eb" label="Kul bikri" value={money(nowTotal)} change={prev ? growth(nowTotal, prev.total) : null}
          hint={prev ? `pehle ${money(prev.total)}` : 'Sab waqt ka record'} />
        <Compare icon={Receipt} color="#7c3aed" label="Bill" value={String(nowBills)} change={prev ? growth(nowBills, prev.bills) : null}
          hint={prev ? `pehle ${prev.bills}` : 'Sab waqt ka record'} />
        <Compare icon={Target} color="#16a34a" label="Munafa" value={cost(nowProfit)} change={prev && !costHidden ? growth(nowProfit, prev.profit) : null}
          hint={costHidden ? 'Cost lock' : prev ? `pehle ${cost(prev.profit)}` : 'Sab waqt ka record'} />
        <Compare icon={Wallet} color="#ea580c" label="Ausat bill" value={money(avgNow)} change={prev ? growth(avgNow, avgPrev) : null}
          hint={prev ? `pehle ${money(avgPrev)}` : 'Sab waqt ka record'} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Insight icon={Clock} color="#d97706" label="Sab se masroof ghanta" value={peak.bills ? hourLabel(peak.hour) : '—'} hint={peak.bills ? `${peak.bills} bill · ${money(peak.sales)}` : undefined} />
        <Insight icon={CalendarDays} color="#7c3aed" label="Sab se acha din" value={bestDay.bills ? WEEKDAYS[bestDay.day] : '—'} hint={bestDay.bills ? `${bestDay.bills} bill · ${money(bestDay.sales)}` : undefined} />
        <Insight icon={Trophy} color="#16a34a" label="Sab se bara bill" value={stats?.best ? money(stats.best.total) : '—'} hint={stats?.best?.saleNumber} />
        <Insight icon={Package} color="#2563eb" label="Sab se zyada bika" value={data.topProducts[0]?.name ?? '—'} hint={data.topProducts[0] ? `${qtyText(data.topProducts[0].qty)} ${data.topProducts[0].unit}` : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2" title={<span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-600" />Rujhan</span>}
          description={data.grouping === 'month' ? 'Mahine war' : 'Din war'}
          actions={<Segmented<TrendMetric> label="Kya dikhayein" value={metric} onChange={setMetric}
            items={[{ value: 'sales', label: 'Bikri' }, { value: 'bills', label: 'Bill' }, { value: 'average', label: 'Ausat' }]} />}>
          {salesHidden ? <p className="py-16 text-center text-[0.875rem] text-slate-500">Bikri chhupi hui hai</p> : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendRows} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hist-sales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.primary} stopOpacity={0.28} /><stop offset="100%" stopColor={theme.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={10} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={metric === 'bills' ? undefined : axisMoney} width={44} allowDecimals={false} />
                  <Tooltip formatter={(v, n) => [n === 'Bill' ? String(v) : formatPKR(Number(v)), n]} {...tip} />
                  <Area type="monotone" dataKey={metric} name={metricName} stroke={theme.primary} strokeWidth={2.25} fill="url(#hist-sales)" />
                  {metric === 'sales' && !costHidden && <Area type="monotone" dataKey="profit" name="Munafa" stroke={theme.profit} strokeWidth={1.75} fill="transparent" />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-brand-600" />Paisa kaise aaya</span>}>
          {data.payments.length === 0 ? <p className="py-12 text-center text-[0.875rem] text-slate-500">Koi bikri nahi</p> : (
            <>
              {!salesHidden && (
                <div className="mx-auto h-[150px] w-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.payments} dataKey="total" nameKey="method" innerRadius="62%" outerRadius="100%" paddingAngle={2} stroke="none">
                        {data.payments.map((p) => <Cell key={p.method} fill={PAYMENT_COLORS[p.method] ?? '#64748b'} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [formatPKR(Number(v)), PAYMENT_LABELS[String(n)] ?? n]} contentStyle={theme.tooltip.contentStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <ul className="mt-3 space-y-2">
                {data.payments.map((p) => (
                  <li key={p.method} className="flex items-center gap-2 text-[0.8125rem]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PAYMENT_COLORS[p.method] ?? '#64748b' }} />
                    <span className="flex-1 text-slate-700">{PAYMENT_LABELS[p.method] ?? p.method} <span className="text-slate-400">· {p.bills}</span></span>
                    <span className="tabular-nums text-slate-500">{payTotal ? Math.round((p.total / payTotal) * 100) : 0}%</span>
                    <span className="w-24 text-right font-semibold tabular-nums text-slate-900">{money(p.total)}</span>
                  </li>
                ))}
              </ul>
              {data.sources.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                  {data.sources.map((s) => <span key={s.source} className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.75rem] text-slate-700">{SOURCE_LABEL[s.source] ?? s.source} · {s.bills} · {money(s.total)}</span>)}
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { title: 'Kis ghante', icon: Clock, rows: hours, key: 'label', peak: peak.hour, id: 'hour' as const },
          { title: 'Hafte ke din', icon: CalendarDays, rows: weekdays, key: 'label', peak: bestDay.day, id: 'day' as const },
        ].map((c) => (
          <Card key={c.title} className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><c.icon className="h-4 w-4 text-brand-600" />{c.title}</span>}>
            {salesHidden ? <p className="py-12 text-center text-[0.875rem] text-slate-500">Bikri chhupi hui hai</p> : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={c.rows as Array<Record<string, number | string>>} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke={theme.grid} vertical={false} />
                    <XAxis dataKey={c.key} tick={theme.axis} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                    <Tooltip formatter={(v) => [formatPKR(Number(v)), 'Bikri']} {...tip} cursor={theme.tooltip.cursor} />
                    <Bar dataKey="sales" radius={[5, 5, 0, 0]}>
                      {(c.rows as Array<{ hour?: number; day?: number }>).map((r, i) => (
                        <Cell key={i} fill={(c.id === 'hour' ? r.hour : r.day) === c.peak ? theme.primary : theme.primarySoft} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Flame className="h-4 w-4 text-brand-600" />Rush ka naqsha</span>}
        description="Hafte ke kis din, kis ghante sab se zyada bill bante hain — staff aur maal isi hisaab se rakhein">
        {heatHours.length === 0 ? <p className="py-10 text-center text-[0.875rem] text-slate-500">Koi bikri nahi</p> : (
          <div className="overflow-x-auto pb-1">
            <div className="inline-grid min-w-full gap-1" style={{ gridTemplateColumns: `4.5rem repeat(${heatHours.length}, minmax(1.75rem, 1fr))` }}>
              <span />
              {heatHours.map((hr) => <span key={hr} className="text-center text-[0.625rem] font-medium text-slate-400">{hr % 12 || 12}{hr < 12 ? 'a' : 'p'}</span>)}
              {dayOrder.map((d) => (
                <div key={d} className="contents">
                  <span className="flex items-center text-[0.75rem] font-medium text-slate-600">{WEEKDAYS[d]}</span>
                  {heatHours.map((hr) => {
                    const v = data.heatmap[d][hr];
                    return (
                      <span key={hr} title={`${WEEKDAYS[d]} ${hourLabel(hr)} — ${v} bill`}
                        className={cn('h-7 rounded-md transition hover:ring-2 hover:ring-slate-400', !v && 'bg-slate-100')}
                        style={v ? { backgroundColor: theme.primary, opacity: 0.15 + 0.85 * (v / heatMax) } : undefined} />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-end gap-2 text-[0.6875rem] text-slate-500">
              Kam
              {[0.15, 0.4, 0.65, 1].map((o) => <span key={o} className="h-3 w-5 rounded" style={{ backgroundColor: theme.primary, opacity: o }} />)}
              Zyada
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Layers className="h-4 w-4 text-brand-600" />Category war</span>} flush>
          {cats.length === 0 ? <p className="px-5 py-10 text-center text-[0.8125rem] text-slate-500">Koi bikri nahi</p> : (
            <div className="px-4 pb-4 sm:px-5">
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                {cats.map((c) => <div key={c.id ?? 'none'} title={c.name} style={{ width: `${(c.revenue / catTotal) * 100}%`, backgroundColor: c.color }} />)}
              </div>
              <ul className="mt-3 space-y-2">
                {cats.slice(0, 8).map((c) => (
                  <li key={c.id ?? 'none'} className="flex items-center gap-2 text-[0.8125rem]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="min-w-0 flex-1 truncate text-slate-700">{c.name} <span className="text-slate-400">· {qtyText(c.qty)}</span></span>
                    <span className="tabular-nums text-slate-500">{Math.round((c.revenue / catTotal) * 100)}%</span>
                    <span className="w-24 text-right font-semibold tabular-nums text-slate-900">{money(c.revenue)}</span>
                  </li>
                ))}
                {cats.length > 8 && <li className="text-[0.75rem] text-slate-500">+{cats.length - 8} aur category</li>}
              </ul>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><UserPlus className="h-4 w-4 text-brand-600" />Customer kaun the</span>}>
          <div className="space-y-4">
            <Split left={`Walk-in · ${cm.walkInBills}`} right={`Naam wale · ${cm.namedBills}`} a={cm.walkInBills} b={cm.namedBills} colors={['#94a3b8', theme.primary]} />
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Customer', String(cm.uniqueCustomers)],
                ['Dobara aaye', `${cm.repeatCustomers}`],
                ['Naye bane', String(cm.newCustomers)],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-slate-50 px-2 py-2.5">
                  <div className="text-[1.125rem] font-bold tabular-nums text-slate-900">{v}</div>
                  <div className="text-[0.6875rem] text-slate-500">{l}</div>
                </div>
              ))}
            </div>
            <ul className="space-y-1.5 text-[0.8125rem]">
              <li className="flex justify-between"><span className="text-slate-500">Walk-in ki bikri</span><span className="font-semibold tabular-nums">{money(cm.walkInTotal)}</span></li>
              <li className="flex justify-between"><span className="text-slate-500">Naam walon ki bikri</span><span className="font-semibold tabular-nums">{money(cm.namedTotal)}</span></li>
              <li className="flex justify-between"><span className="text-slate-500">Wapas aane wale</span><span className="font-semibold tabular-nums">{returning}%</span></li>
            </ul>
          </div>
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Percent className="h-4 w-4 text-brand-600" />Discount aur wapsi</span>}>
          <div className="space-y-4">
            <Split left="Asal bikri" right="Discount" a={stats?.total ?? 0} b={stats?.discount ?? 0} colors={[theme.primary, '#db2777']} />
            <ul className="space-y-1.5 text-[0.8125rem]">
              <li className="flex justify-between"><span className="text-slate-500">Discount se pehle</span><span className="font-semibold tabular-nums">{money(gross)}</span></li>
              <li className="flex justify-between"><span className="text-slate-500">Kul discount</span><span className="font-semibold tabular-nums text-pink-700">{money(stats?.discount ?? 0)} <span className="font-normal text-slate-400">({gross ? (((stats?.discount ?? 0) / gross) * 100).toFixed(1) : 0}%)</span></span></li>
              <li className="flex justify-between"><span className="text-slate-500">Maal wapas (refund)</span><span className="font-semibold tabular-nums text-amber-700">{money(stats?.refunded ?? 0)}</span></li>
              <li className="flex justify-between"><span className="text-slate-500">Void bill</span><span className="font-semibold tabular-nums text-rose-700">{stats?.voided ?? 0}</span></li>
              <li className="flex justify-between"><span className="text-slate-500">Udhaar par diya</span><span className="font-semibold tabular-nums">{money(stats?.credit ?? 0)} <span className="font-normal text-slate-400">· {stats?.creditCount ?? 0} bill</span></span></li>
            </ul>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Crown className="h-4 w-4 text-brand-600" />Sab se zyada bika</span>} flush>
          <ul className="divide-y divide-slate-100 pb-2">
            {data.topProducts.map((p, i) => (
              <li key={p.productId} className="px-4 py-2.5 sm:px-5">
                <div className="flex items-baseline gap-2 text-[0.8125rem]">
                  <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[0.6875rem] font-bold', i < 3 ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-600')}>{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{p.name}</span>
                  <span className="font-semibold tabular-nums text-slate-900">{money(p.revenue)}</span>
                </div>
                <div className="ml-8 mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(p.revenue / maxProduct) * 100}%` }} /></div>
                  <span className="text-[0.6875rem] text-slate-500">{qtyText(p.qty)} {p.unit}</span>
                </div>
              </li>
            ))}
            {data.topProducts.length === 0 && <li className="px-5 py-10 text-center text-[0.8125rem] text-slate-500">Koi bikri nahi</li>}
          </ul>
        </Card>
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-brand-600" />Behtareen customers</span>} flush>
          <ul className="divide-y divide-slate-100 pb-2">
            {data.topCustomers.map((c) => (
              <li key={c.customerId}>
                <Link to={`/customers/${c.customerId}`} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50 sm:px-5">
                  <Avatar name={c.name} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem] font-medium text-slate-900">{c.name}</span>
                    <span className="block text-[0.6875rem] text-slate-500">{c.bills} bill{c.balance > 0 ? ` · udhaar ${cost(c.balance)}` : ''}</span>
                  </span>
                  <span className="text-[0.8125rem] font-semibold tabular-nums text-slate-900">{money(c.total)}</span>
                </Link>
              </li>
            ))}
            {data.topCustomers.length === 0 && <li className="px-5 py-10 text-center text-[0.8125rem] text-slate-500">Naam wale customer ki bikri nahi</li>}
          </ul>
        </Card>
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Medal className="h-4 w-4 text-brand-600" />Staff</span>} flush>
          <ul className="space-y-3 px-4 pb-4 sm:px-5">
            {data.staff.map((p) => (
              <li key={p.userId} className="flex items-center gap-3">
                <Avatar name={p.name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-[0.8125rem]"><span className="truncate font-medium text-slate-900">{p.name}</span><span className="font-semibold tabular-nums">{money(p.total)}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(p.total / maxStaff) * 100}%` }} /></div>
                  <div className="mt-0.5 text-[0.6875rem] text-slate-500">{p.bills} bill · ausat {money(p.bills ? p.total / p.bills : 0)}{!costHidden && ` · munafa ${cost(p.profit)}`}</div>
                </div>
              </li>
            ))}
            {data.staff.length === 0 && <li className="py-8 text-center text-[0.8125rem] text-slate-500">Koi bikri nahi</li>}
          </ul>
        </Card>
      </div>

      <Card className="rounded-2xl" flush title={<span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-brand-600" />{data.grouping === 'month' ? 'Mahine war tafseel' : 'Din war tafseel'}</span>}
        description="Har din ki bikri, bill, ausat aur munafa — sab se acha din hara">
        {salesHidden ? <p className="px-5 py-10 text-center text-[0.875rem] text-slate-500">Bikri chhupi hui hai</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-[0.8125rem]">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/70 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2">{data.grouping === 'month' ? 'Mahina' : 'Din'}</th>
                  <th className="px-3 py-2 text-right">Bill</th>
                  <th className="px-3 py-2 text-right">Bikri</th>
                  <th className="px-3 py-2 text-right">Ausat</th>
                  {!costHidden && <th className="px-3 py-2 text-right">Munafa</th>}
                  <th className="w-[28%] px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...trendRows].reverse().filter((t) => t.bills > 0).slice(0, showAllDays ? undefined : 10).map((t) => {
                  const best = t.sales === dayMax && t.sales > 0;
                  return (
                    <tr key={t.key} className={cn(best && 'bg-success-50/60')}>
                      <td className="px-5 py-2 font-medium text-slate-900">{t.label}{best && <span className="ml-2 rounded-full bg-success-100 px-1.5 py-0.5 text-[0.625rem] font-semibold text-success-700">Behtareen</span>}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">{t.bills}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{money(t.sales)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">{money(t.average)}</td>
                      {!costHidden && <td className="px-3 py-2 text-right tabular-nums text-success-700">{cost(t.profit)}</td>}
                      <td className="px-5 py-2"><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${dayMax ? (t.sales / dayMax) * 100 : 0}%` }} /></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {activeDays > 10 && (
              <button type="button" onClick={() => setShowAllDays((v) => !v)} className="w-full border-t border-slate-100 py-2.5 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">
                {showAllDays ? 'Kam dikhayein' : `Sab ${activeDays} dikhayein`}
              </button>
            )}
            {activeDays === 0 && <p className="px-5 py-10 text-center text-[0.8125rem] text-slate-500">Koi bikri nahi</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
