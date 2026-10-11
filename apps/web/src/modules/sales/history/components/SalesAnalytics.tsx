/** Analytics for the current filter: trend, busy hours, weekdays, payments, products, customers, staff. */

import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { CalendarDays, Clock, Crown, Medal, Package, TrendingUp, Trophy, Users, Wallet, type LucideIcon } from 'lucide-react';
import { Avatar, Card, Skeleton } from '@/design-system/components';
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

export function SalesAnalytics({ data, stats, loading, money, cost, costHidden, salesHidden }: {
  data?: HistoryAnalytics; stats?: HistoryStats; loading: boolean;
  money: (n: number) => string; cost: (n: number) => string; costHidden: boolean; salesHidden: boolean;
}) {
  const theme = useChartTheme();
  if (loading || !data) return <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>;

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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Insight icon={Clock} color="#d97706" label="Sab se masroof ghanta" value={peak.bills ? hourLabel(peak.hour) : '—'} hint={peak.bills ? `${peak.bills} bill · ${money(peak.sales)}` : undefined} />
        <Insight icon={CalendarDays} color="#7c3aed" label="Sab se acha din" value={bestDay.bills ? WEEKDAYS[bestDay.day] : '—'} hint={bestDay.bills ? `${bestDay.bills} bill · ${money(bestDay.sales)}` : undefined} />
        <Insight icon={Trophy} color="#16a34a" label="Sab se bara bill" value={stats?.best ? money(stats.best.total) : '—'} hint={stats?.best?.saleNumber} />
        <Insight icon={Package} color="#2563eb" label="Sab se zyada bika" value={data.topProducts[0]?.name ?? '—'} hint={data.topProducts[0] ? `${qtyText(data.topProducts[0].qty)} ${data.topProducts[0].unit}` : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2" title={<span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-600" />Bikri ka rujhan</span>}
          description={data.grouping === 'month' ? 'Mahine war' : 'Din war'}>
          {salesHidden ? <p className="py-16 text-center text-[0.875rem] text-slate-500">Bikri chhupi hui hai</p> : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hist-sales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.primary} stopOpacity={0.28} /><stop offset="100%" stopColor={theme.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={10} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                  <Tooltip formatter={(v, n) => [formatPKR(Number(v)), n]} {...tip} />
                  <Area type="monotone" dataKey="sales" name="Bikri" stroke={theme.primary} strokeWidth={2.25} fill="url(#hist-sales)" />
                  {!costHidden && <Area type="monotone" dataKey="profit" name="Munafa" stroke={theme.profit} strokeWidth={1.75} fill="transparent" />}
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
                  <div className="mt-0.5 text-[0.6875rem] text-slate-500">{p.bills} bill · ausat {money(p.bills ? p.total / p.bills : 0)}</div>
                </div>
              </li>
            ))}
            {data.staff.length === 0 && <li className="py-8 text-center text-[0.8125rem] text-slate-500">Koi bikri nahi</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
