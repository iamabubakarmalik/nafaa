/**
 * Period insights from /dashboard/insights: sales by category, staff,
 * weekday, best customers and the last six months. Each widget has its own
 * 7/30/90-day switch; the request is shared per period.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { CalendarDays, Crown, Layers, Medal, Users } from 'lucide-react';
import { Avatar, Segmented, Skeleton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { useInsights, type InsightDays } from '../data/queries';
import { useChartTheme } from '../engine/useChartTheme';
import { useMasked } from '../engine/useMasked';
import { axisMoney, EmptyHint, fmtQty, WidgetCard } from '../engine/parts';

const PERIODS = [{ value: '7', label: '7d' }, { value: '30', label: '30d' }, { value: '90', label: '90d' }] as const;
const WEEKDAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];
const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7', '#0891b2', '#e34948'];

function usePeriod(initial: InsightDays = 30) {
  const [days, setDays] = useState<InsightDays>(initial);
  const control = (
    <Segmented label="Muddat" value={String(days) as '7' | '30' | '90'} onChange={(v) => setDays(Number(v) as InsightDays)} items={[...PERIODS]} />
  );
  return { days, control, label: `Pichhle ${days} din` };
}

function Loading() {
  return <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>;
}

export function CategoryMix() {
  const { days, control, label } = usePeriod();
  const { data, isLoading } = useInsights(days);
  const theme = useChartTheme();
  const { sales, cost, costHidden, salesHidden } = useMasked();
  const rows = (data?.categories ?? []).slice(0, 8).map((c, i) => ({ ...c, fill: c.color && c.color !== '#94a3b8' ? c.color : PALETTE[i % PALETTE.length] }));
  const total = rows.reduce((x, r) => x + r.revenue, 0);

  return (
    <WidgetCard title="Category ke hisaab se" icon={Layers} description={label} actions={control}>
      {isLoading ? <Loading /> : rows.length === 0 ? <EmptyHint icon={Layers} text="Is muddat me koi bikri nahi" /> : (
        <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
          {!salesHidden && (
            <div className="mx-auto h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rows} dataKey="revenue" nameKey="name" innerRadius="60%" outerRadius="100%" paddingAngle={2} stroke="none">
                    {rows.map((r) => <Cell key={r.name} fill={r.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatPKR(Number(v))} contentStyle={theme.tooltip.contentStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <ul className="min-w-0 space-y-2">
            {rows.map((r) => (
              <li key={r.name} className="text-[0.8125rem]">
                <div className="flex items-baseline gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: r.fill }} />
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{r.name}</span>
                  <span className="shrink-0 tabular-nums text-slate-500">{fmtQty(r.qty)} pcs</span>
                  <span className="w-20 shrink-0 text-right font-semibold tabular-nums text-slate-900">{sales(r.revenue)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 pl-[18px]">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${total ? (r.revenue / total) * 100 : 0}%`, backgroundColor: r.fill }} />
                  </div>
                  {!costHidden && r.revenue > 0 && (
                    <span className="w-24 shrink-0 text-right text-[0.6875rem] text-slate-500">munafa {cost(r.profit)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </WidgetCard>
  );
}

const MEDALS = ['bg-amber-400 text-amber-950', 'bg-slate-300 text-slate-800', 'bg-orange-300 text-orange-950'];

export function StaffBoard() {
  const { days, control, label } = usePeriod();
  const { data, isLoading } = useInsights(days);
  const { sales } = useMasked();
  const rows = data?.staff ?? [];
  const max = Math.max(...rows.map((r) => r.total), 1);

  return (
    <WidgetCard title="Staff ki bikri" icon={Medal} description={label} actions={control} to="/staff/commission" linkLabel="Commission">
      {isLoading ? <Loading /> : rows.length === 0 ? <EmptyHint icon={Users} text="Is muddat me koi bikri nahi" /> : (
        <ul className="space-y-3">
          {rows.slice(0, 6).map((p, i) => (
            <li key={p.userId} className="flex items-center gap-3">
              <div className="relative shrink-0">
                <Avatar name={p.name} url={p.avatarUrl ?? undefined} size={32} />
                {i < 3 && (
                  <span className={cn('absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[0.625rem] font-bold ring-2 ring-white', MEDALS[i])}>{i + 1}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
                  <span className="truncate font-medium text-slate-900">{p.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">{sales(p.total)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(p.total / max) * 100}%` }} />
                </div>
                <div className="mt-0.5 text-[0.6875rem] text-slate-500">{p.bills} bill · ausat {sales(p.average)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export function WeekdayPattern() {
  const { days, control } = usePeriod(90);
  const { data, isLoading } = useInsights(days);
  const theme = useChartTheme();
  const { salesHidden } = useMasked();
  // Start the week on Monday, as shops in Pakistan count it.
  const rows = (data?.weekday ?? []).slice(1).concat((data?.weekday ?? []).slice(0, 1))
    .map((w) => ({ ...w, label: WEEKDAYS[w.day].slice(0, 3), full: WEEKDAYS[w.day] }));
  const best = rows.reduce<(typeof rows)[number] | null>((b, r) => (!b || r.average > b.average ? r : b), null);

  return (
    <WidgetCard title="Hafte ke din" icon={CalendarDays} description={best?.average ? `Sab se acha din: ${best.full}` : 'Rozana ausat bikri'} actions={control}>
      {isLoading ? <Loading /> : salesHidden ? <EmptyHint icon={CalendarDays} text="Bikri chhupi hui hai" /> : rows.every((r) => !r.total) ? (
        <EmptyHint icon={CalendarDays} text="Abhi data kam hai" />
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
              <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
              <Tooltip formatter={(v) => [formatPKR(Number(v)), 'Ausat']} labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ''}
                contentStyle={theme.tooltip.contentStyle} labelStyle={theme.tooltip.labelStyle} cursor={theme.tooltip.cursor} />
              <Bar dataKey="average" radius={[6, 6, 0, 0]}>
                {rows.map((r) => <Cell key={r.day} fill={r.day === best?.day ? theme.primary : theme.primarySoft} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetCard>
  );
}

export function TopCustomers() {
  const { days, control, label } = usePeriod();
  const { data, isLoading } = useInsights(days);
  const { sales, cost } = useMasked();
  const rows = data?.topCustomers ?? [];
  return (
    <WidgetCard title="Behtareen customers" icon={Crown} description={label} actions={control} flush>
      <div className="px-4 pb-3 sm:px-5">
        {isLoading ? <Loading /> : rows.length === 0 ? <EmptyHint icon={Users} text="Is muddat me naam wale customer ki bikri nahi" /> : (
          <ul className="divide-y divide-slate-100">
            {rows.map((c) => (
              <li key={c.customerId}>
                <Link to={`/customers/${c.customerId}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50">
                  <Avatar name={c.name} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem] font-medium text-slate-900">{c.name}</span>
                    <span className="block truncate text-[0.6875rem] text-slate-500">
                      {c.bills} bill{c.balance > 0 ? ` · udhaar ${cost(c.balance)}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-[0.8125rem] font-semibold tabular-nums text-slate-900">{sales(c.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </WidgetCard>
  );
}

const monthName = (key: string) =>
  new Intl.DateTimeFormat('en-PK', { month: 'short' }).format(new Date(`${key}-15T12:00:00`));

export function MonthlyTrend() {
  const { data, isLoading } = useInsights(30);
  const theme = useChartTheme();
  const { costHidden, salesHidden } = useMasked();
  const rows = (data?.monthly ?? []).map((m) => ({ ...m, label: monthName(m.month) }));
  const legend: Array<{ color: string; label: string }> = [{ color: theme.primary, label: 'Bikri' }];
  if (!costHidden) legend.push({ color: '#f59e0b', label: 'Kharcha' }, { color: theme.profit, label: 'Munafa' });

  return (
    <WidgetCard title="6 mahine ka muqabla" icon={CalendarDays} description="Har mahine ki bikri, kharcha aur munafa">
      {isLoading ? <Skeleton className="h-[260px] w-full" /> : salesHidden ? <EmptyHint icon={CalendarDays} text="Bikri chhupi hui hai" /> : (
        <>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip formatter={(v, n) => [formatPKR(Number(v)), n]} contentStyle={theme.tooltip.contentStyle} labelStyle={theme.tooltip.labelStyle} cursor={theme.tooltip.cursor} />
                <Bar dataKey="sales" name="Bikri" fill={theme.primary} radius={[6, 6, 0, 0]} maxBarSize={36} />
                {!costHidden && <Bar dataKey="expenses" name="Kharcha" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={36} />}
                {!costHidden && <Line type="monotone" dataKey="profit" name="Munafa" stroke={theme.profit} strokeWidth={2.25} dot={{ r: 3 }} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-4 text-[0.75rem] text-slate-500">
            {legend.map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />{l.label}</span>
            ))}
          </div>
        </>
      )}
    </WidgetCard>
  );
}
