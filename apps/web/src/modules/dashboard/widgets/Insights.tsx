/**
 * Period insights from /dashboard/insights: sales by category, staff,
 * weekday, best customers and the monthly comparison. Every widget has its
 * own period, sort and view controls (remembered per device) and prints.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { CalendarDays, CalendarRange, Crown, Layers, Medal, Users } from 'lucide-react';
import { Avatar, Skeleton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { useInsights, type InsightDays } from '../data/queries';
import { MiniSelect, PERIOD_OPTIONS, periodLabel, useWidgetState } from '../engine/controls';
import { useChartTheme } from '../engine/useChartTheme';
import { useMasked } from '../engine/useMasked';
import { axisMoney, EmptyHint, fmtQty, WidgetCard } from '../engine/parts';
import { WidgetToolbar } from './WidgetToolbar';

const WEEKDAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];
const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7', '#0891b2', '#e34948', '#65a30d', '#9333ea'];
const SHOW_OPTIONS = [{ value: '5', label: 'Top 5' }, { value: '10', label: 'Top 10' }, { value: '50', label: 'Sab' }];

function Loading() {
  return <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>;
}

export function CategoryMix() {
  const [s, set] = useWidgetState('category-mix', { days: '30', sort: 'revenue', show: '10', view: 'donut' });
  const { data, isLoading } = useInsights(Number(s.days) as InsightDays);
  const theme = useChartTheme();
  const { sales, cost, costHidden, salesHidden } = useMasked();
  const sort = costHidden && s.sort === 'profit' ? 'revenue' : (s.sort as 'revenue' | 'qty' | 'profit');

  const all = useMemo(() => [...(data?.categories ?? [])]
    .sort((a, b) => b[sort] - a[sort])
    .map((c, i) => ({ ...c, fill: c.color && c.color !== '#94a3b8' ? c.color : PALETTE[i % PALETTE.length] })), [data, sort]);
  const rows = all.slice(0, Number(s.show));
  const total = all.reduce((x, r) => x + r.revenue, 0);
  const value = (r: (typeof rows)[number]) => (sort === 'qty' ? `${fmtQty(r.qty)} pcs` : sort === 'profit' ? cost(r.profit) : sales(r.revenue));
  const max = Math.max(...rows.map((r) => r[sort]), 1);

  return (
    <WidgetCard title="Category ke hisaab se" icon={Layers} description={`${periodLabel(s.days)} · ${all.length} categories`}>
      <WidgetToolbar inset={false}
        print={() => ({
          title: 'Category ke hisaab se bikri', subtitle: periodLabel(s.days),
          sections: [{
            kind: 'table',
            columns: [{ label: 'Category' }, { label: 'Qty', align: 'right' }, { label: 'Bikri', align: 'right' }, ...(costHidden ? [] : [{ label: 'Munafa', align: 'right' as const }]), { label: 'Hissa', align: 'right', wideOnly: true }],
            rows: all.map((r) => [r.name, fmtQty(r.qty), sales(r.revenue), ...(costHidden ? [] : [cost(r.profit)]), `${total ? Math.round((r.revenue / total) * 100) : 0}%`]),
            footer: ['Kul', fmtQty(all.reduce((x, r) => x + r.qty, 0)), sales(total), ...(costHidden ? [] : [cost(all.reduce((x, r) => x + r.profit, 0))]), '100%'],
          }],
        })}>
        <MiniSelect label="Muddat" value={s.days} onChange={(v) => set({ days: v })} options={PERIOD_OPTIONS} />
        <MiniSelect label="Tarteeb" value={sort} onChange={(v) => set({ sort: v })}
          options={[{ value: 'revenue', label: 'Bikri se' }, { value: 'qty', label: 'Ginti se' }, ...(costHidden ? [] : [{ value: 'profit', label: 'Munafe se' }])]} />
        <MiniSelect label="Kitni" value={s.show} onChange={(v) => set({ show: v })} options={SHOW_OPTIONS} />
        <MiniSelect label="Dikhawa" value={s.view} onChange={(v) => set({ view: v })} options={[{ value: 'donut', label: 'Gol chart' }, { value: 'bars', label: 'Sirf patiyan' }]} />
      </WidgetToolbar>
      {isLoading ? <Loading /> : rows.length === 0 ? <EmptyHint icon={Layers} text="Is muddat me koi bikri nahi" /> : (
        <div className={cn('grid gap-4', s.view === 'donut' && !salesHidden && 'sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center')}>
          {s.view === 'donut' && !salesHidden && (
            <div className="mx-auto h-[150px] w-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rows} dataKey={sort === 'qty' ? 'qty' : 'revenue'} nameKey="name" innerRadius="60%" outerRadius="100%" paddingAngle={2} stroke="none">
                    {rows.map((r) => <Cell key={r.name} fill={r.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v) => (sort === 'qty' ? fmtQty(Number(v)) : formatPKR(Number(v)))} contentStyle={theme.tooltip.contentStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <ul className="min-w-0 space-y-2.5">
            {rows.map((r) => (
              <li key={r.name} className="text-[0.8125rem]">
                <div className="flex items-baseline gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: r.fill }} />
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{r.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">{value(r)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 ml-[18px]">
                  <div className="h-full rounded-full" style={{ width: `${(r[sort] / max) * 100}%`, backgroundColor: r.fill }} />
                </div>
                <div className="ml-[18px] mt-0.5 flex flex-wrap gap-x-3 text-[0.6875rem] text-slate-500">
                  {sort !== 'qty' && <span>{fmtQty(r.qty)} pcs</span>}
                  {sort !== 'revenue' && <span>bikri {sales(r.revenue)}</span>}
                  {!costHidden && sort !== 'profit' && r.revenue > 0 && <span>munafa {cost(r.profit)}</span>}
                  <span>{total ? Math.round((r.revenue / total) * 100) : 0}% hissa</span>
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
  const [s, set] = useWidgetState('staff', { days: '30', sort: 'total' });
  const { data, isLoading } = useInsights(Number(s.days) as InsightDays);
  const { sales, cost, costHidden } = useMasked();
  const sort = costHidden && s.sort === 'profit' ? 'total' : (s.sort as 'total' | 'bills' | 'average' | 'profit');
  const rows = useMemo(() => [...(data?.staff ?? [])].sort((a, b) => b[sort] - a[sort]), [data, sort]);
  const max = Math.max(...rows.map((r) => r[sort]), 1);
  const value = (r: (typeof rows)[number]) => (sort === 'bills' ? `${r.bills} bill` : sort === 'profit' ? cost(r.profit) : sort === 'average' ? sales(r.average) : sales(r.total));

  return (
    <WidgetCard title="Staff ki bikri" icon={Medal} description={periodLabel(s.days)} to="/staff/commission" linkLabel="Commission">
      <WidgetToolbar inset={false}
        print={() => ({
          title: 'Staff ki bikri', subtitle: periodLabel(s.days),
          sections: [{
            kind: 'table',
            columns: [{ label: '#' }, { label: 'Naam' }, { label: 'Bill', align: 'right' }, { label: 'Ausat', align: 'right', wideOnly: true }, { label: 'Bikri', align: 'right' }],
            rows: rows.map((r, i) => [String(i + 1), r.name, String(r.bills), sales(r.average), sales(r.total)]),
          }],
        })}>
        <MiniSelect label="Muddat" value={s.days} onChange={(v) => set({ days: v })} options={PERIOD_OPTIONS} />
        <MiniSelect label="Ranking" value={sort} onChange={(v) => set({ sort: v })}
          options={[{ value: 'total', label: 'Bikri se' }, { value: 'bills', label: 'Bill se' }, { value: 'average', label: 'Ausat bill se' }, ...(costHidden ? [] : [{ value: 'profit', label: 'Munafe se' }])]} />
      </WidgetToolbar>
      {isLoading ? <Loading /> : rows.length === 0 ? <EmptyHint icon={Users} text="Is muddat me koi bikri nahi" /> : (
        <ul className="space-y-3">
          {rows.map((p, i) => (
            <li key={p.userId} className="flex items-center gap-3">
              <div className="relative shrink-0">
                <Avatar name={p.name} url={p.avatarUrl ?? undefined} size={34} />
                {i < 3 && <span className={cn('absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[0.625rem] font-bold ring-2 ring-white', MEDALS[i])}>{i + 1}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
                  <span className="truncate font-medium text-slate-900">{p.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">{value(p)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(p[sort] / max) * 100}%` }} />
                </div>
                <div className="mt-0.5 text-[0.6875rem] text-slate-500">
                  {p.bills} bill · ausat {sales(p.average)}{sort !== 'total' && ` · bikri ${sales(p.total)}`}{!costHidden && sort !== 'profit' && ` · munafa ${cost(p.profit)}`}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export function WeekdayPattern() {
  const [s, set] = useWidgetState('weekday', { days: '90', metric: 'average' });
  const { data, isLoading } = useInsights(Number(s.days) as InsightDays);
  const theme = useChartTheme();
  const { sales, salesHidden } = useMasked();
  const metric = s.metric as 'average' | 'bills';
  // Start the week on Monday, as shops here count it.
  const rows = (data?.weekday ?? []).slice(1).concat((data?.weekday ?? []).slice(0, 1))
    .map((w) => ({ ...w, bills: w.occurrences ? w.bills / w.occurrences : 0, label: WEEKDAYS[w.day].slice(0, 3), full: WEEKDAYS[w.day] }));
  const best = rows.reduce<(typeof rows)[number] | null>((b, r) => (!b || r[metric] > b[metric] ? r : b), null);
  const worst = rows.filter((r) => r.occurrences).reduce<(typeof rows)[number] | null>((b, r) => (!b || r[metric] < b[metric] ? r : b), null);
  const hidden = salesHidden && metric === 'average';

  return (
    <WidgetCard title="Hafte ke din" icon={CalendarDays}
      description={best && best[metric] ? `Sab se acha ${best.full}${worst && worst !== best ? ` · sab se halka ${worst.full}` : ''}` : 'Rozana ausat'}>
      <WidgetToolbar inset={false}
        print={() => ({
          title: 'Hafte ke din', subtitle: `Pichhle ${s.days} din ka rozana ausat`,
          sections: [{ kind: 'table', columns: [{ label: 'Din' }, { label: 'Ausat bill', align: 'right' }, { label: 'Ausat bikri', align: 'right' }],
            rows: rows.map((r) => [r.full, r.bills.toFixed(1), sales(r.average)]) }],
        })}>
        <MiniSelect label="Muddat" value={s.days} onChange={(v) => set({ days: v })} options={[{ value: '30', label: '30 din' }, { value: '90', label: '90 din' }]} />
        <MiniSelect label="Kya dikhayein" value={s.metric} onChange={(v) => set({ metric: v })} options={[{ value: 'average', label: 'Ausat bikri' }, { value: 'bills', label: 'Ausat bill' }]} />
      </WidgetToolbar>
      {isLoading ? <Loading /> : hidden ? <EmptyHint icon={CalendarDays} text="Bikri chhupi hui hai" /> : rows.every((r) => !r.total) ? (
        <EmptyHint icon={CalendarDays} text="Abhi data kam hai" />
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
              <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={metric === 'average' ? axisMoney : undefined} width={44} />
              <Tooltip formatter={(v) => [metric === 'average' ? formatPKR(Number(v)) : Number(v).toFixed(1), metric === 'average' ? 'Ausat bikri' : 'Ausat bill']}
                labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ''} contentStyle={theme.tooltip.contentStyle} labelStyle={theme.tooltip.labelStyle} cursor={theme.tooltip.cursor} />
              <Bar dataKey={metric} radius={[6, 6, 0, 0]}>
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
  const [s, set] = useWidgetState('top-customers', { days: '30', sort: 'total', limit: '5', filter: 'all' });
  const { data, isLoading } = useInsights(Number(s.days) as InsightDays);
  const { sales, cost } = useMasked();
  const rows = useMemo(() => [...(data?.topCustomers ?? [])]
    .filter((c) => s.filter === 'all' || c.balance > 0)
    .sort((a, b) => (s.sort === 'bills' ? b.bills - a.bills : s.sort === 'balance' ? b.balance - a.balance : b.total - a.total))
    .slice(0, Number(s.limit)), [data, s]);

  return (
    <WidgetCard title="Behtareen customers" icon={Crown} description={periodLabel(s.days)} to="/customers">
      <WidgetToolbar inset={false}
        print={() => ({
          title: 'Behtareen customers', subtitle: periodLabel(s.days),
          sections: [{ kind: 'table', columns: [{ label: 'Naam' }, { label: 'Phone', wideOnly: true }, { label: 'Bill', align: 'right' }, { label: 'Khareeda', align: 'right' }, { label: 'Udhaar', align: 'right' }],
            rows: rows.map((c) => [c.name, c.phone ?? '', String(c.bills), sales(c.total), cost(c.balance)]) }],
        })}>
        <MiniSelect label="Muddat" value={s.days} onChange={(v) => set({ days: v })} options={PERIOD_OPTIONS} />
        <MiniSelect label="Tarteeb" value={s.sort} onChange={(v) => set({ sort: v })}
          options={[{ value: 'total', label: 'Khareedari se' }, { value: 'bills', label: 'Bill se' }, { value: 'balance', label: 'Udhaar se' }]} />
        <MiniSelect label="Kitne" value={s.limit} onChange={(v) => set({ limit: v })} options={[{ value: '5', label: 'Top 5' }, { value: '10', label: 'Top 10' }, { value: '20', label: 'Top 20' }]} />
        <MiniSelect label="Filter" value={s.filter} onChange={(v) => set({ filter: v })} options={[{ value: 'all', label: 'Sab' }, { value: 'credit', label: 'Jin par udhaar' }]} />
      </WidgetToolbar>
      {isLoading ? <Loading /> : rows.length === 0 ? <EmptyHint icon={Users} text="Is muddat me naam wale customer ki bikri nahi" /> : (
        <ul className="-mx-2 divide-y divide-slate-100">
          {rows.map((c, i) => (
            <li key={c.customerId}>
              <Link to={`/customers/${c.customerId}`} className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50">
                <span className="w-4 shrink-0 text-center text-[0.75rem] font-semibold text-slate-400">{i + 1}</span>
                <Avatar name={c.name} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] font-medium text-slate-900">{c.name}</span>
                  <span className="block truncate text-[0.6875rem] text-slate-500">
                    {c.bills} bill{c.phone ? ` · ${c.phone}` : ''}{c.balance > 0 ? <> · <span className="font-medium text-amber-700">udhaar {cost(c.balance)}</span></> : ''}
                  </span>
                </span>
                <span className="shrink-0 text-[0.8125rem] font-semibold tabular-nums text-slate-900">{s.sort === 'balance' ? cost(c.balance) : sales(c.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

const monthName = (key: string, long = false) =>
  new Intl.DateTimeFormat('en-PK', { month: long ? 'long' : 'short', ...(long ? { year: 'numeric' } : {}) }).format(new Date(`${key}-15T12:00:00`));

export function MonthlyTrend() {
  const [s, set] = useWidgetState('monthly', { months: '6', series: 'all' });
  const months = Number(s.months) as 6 | 12;
  const { data, isLoading } = useInsights(30, months);
  const theme = useChartTheme();
  const { costHidden, salesHidden, sales, cost } = useMasked();
  const rows = (data?.monthly ?? []).map((m) => ({ ...m, label: monthName(m.month) }));
  const showExpenses = !costHidden && (s.series === 'all' || s.series === 'expenses');
  const showProfit = !costHidden && (s.series === 'all' || s.series === 'profit');
  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2];
  const change = last && prev && prev.sales > 0 ? ((last.sales - prev.sales) / prev.sales) * 100 : null;

  return (
    <WidgetCard title={`${months} mahine ka muqabla`} icon={CalendarRange}
      description={change !== null && !salesHidden ? `Is mahine pichhle se ${change >= 0 ? '+' : ''}${change.toFixed(1)}%` : 'Har mahine ki bikri, kharcha aur munafa'}>
      <WidgetToolbar inset={false}
        print={() => ({
          title: `${months} mahine ka muqabla`,
          sections: [{
            kind: 'table',
            columns: [{ label: 'Mahina' }, { label: 'Bill', align: 'right' }, { label: 'Bikri', align: 'right' }, ...(costHidden ? [] : [{ label: 'Kharcha', align: 'right' as const }, { label: 'Munafa', align: 'right' as const }])],
            rows: rows.map((m) => [monthName(m.month, true), String(m.bills), sales(m.sales), ...(costHidden ? [] : [cost(m.expenses), cost(m.profit)])]),
          }],
        })}>
        <MiniSelect label="Mahine" value={s.months} onChange={(v) => set({ months: v })} options={[{ value: '6', label: '6 mahine' }, { value: '12', label: '12 mahine' }]} />
        {!costHidden && (
          <MiniSelect label="Kya dikhayein" value={s.series} onChange={(v) => set({ series: v })}
            options={[{ value: 'all', label: 'Sab' }, { value: 'sales', label: 'Sirf bikri' }, { value: 'profit', label: 'Bikri + munafa' }, { value: 'expenses', label: 'Bikri + kharcha' }]} />
        )}
      </WidgetToolbar>
      {isLoading ? <Skeleton className="h-[260px] w-full" /> : salesHidden ? <EmptyHint icon={CalendarRange} text="Bikri chhupi hui hai" /> : (
        <>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip formatter={(v, n) => [formatPKR(Number(v)), n]} contentStyle={theme.tooltip.contentStyle} labelStyle={theme.tooltip.labelStyle} cursor={theme.tooltip.cursor} />
                <Bar dataKey="sales" name="Bikri" fill={theme.primary} radius={[6, 6, 0, 0]} maxBarSize={32} />
                {showExpenses && <Bar dataKey="expenses" name="Kharcha" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={32} />}
                {showProfit && <Line type="monotone" dataKey="profit" name="Munafa" stroke={theme.profit} strokeWidth={2.25} dot={{ r: 3 }} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-4 text-[0.75rem] text-slate-500">
            {[{ c: theme.primary, l: 'Bikri', on: true }, { c: '#f59e0b', l: 'Kharcha', on: showExpenses }, { c: theme.profit, l: 'Munafa', on: showProfit }].filter((x) => x.on).map((x) => (
              <span key={x.l} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: x.c }} />{x.l}</span>
            ))}
          </div>
        </>
      )}
    </WidgetCard>
  );
}
