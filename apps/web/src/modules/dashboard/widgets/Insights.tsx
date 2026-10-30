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
import { t } from '@core/i18n';

const WEEKDAYS = [t('Itwar'), t('Peer'), t('Mangal'), t('Budh'), t('Jumeraat'), t('Juma'), t('Hafta')];
const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7', '#0891b2', '#e34948', '#65a30d', '#9333ea'];
const SHOW_OPTIONS = [{ value: '5', label: t('Top 5') }, { value: '10', label: t('Top 10') }, { value: '50', label: t('Sab') }];

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
    <WidgetCard title={t('Category ke hisaab se')} icon={Layers} description={t('{{days}} · {{count}} categories', { days: periodLabel(s.days), count: all.length })}>
      <WidgetToolbar inset={false}
        print={() => ({
          title: t('Category ke hisaab se sale'), subtitle: periodLabel(s.days),
          sections: [{
            kind: 'table',
            columns: [{ label: t('Category') }, { label: t('Qty'), align: 'right' }, { label: t('Sale'), align: 'right' }, ...(costHidden ? [] : [{ label: t('Profit'), align: 'right' as const }]), { label: t('Hissa'), align: 'right', wideOnly: true }],
            rows: all.map((r) => [r.name, fmtQty(r.qty), sales(r.revenue), ...(costHidden ? [] : [cost(r.profit)]), `${total ? Math.round((r.revenue / total) * 100) : 0}%`]),
            footer: [t('Kul'), fmtQty(all.reduce((x, r) => x + r.qty, 0)), sales(total), ...(costHidden ? [] : [cost(all.reduce((x, r) => x + r.profit, 0))]), '100%'],
          }],
        })}>
        <MiniSelect label={t('Period')} value={s.days} onChange={(v) => set({ days: v })} options={PERIOD_OPTIONS} />
        <MiniSelect label={t('Sort')} value={sort} onChange={(v) => set({ sort: v })}
          options={[{ value: 'revenue', label: t('Sale se') }, { value: 'qty', label: t('Ginti se') }, ...(costHidden ? [] : [{ value: 'profit', label: t('Profit se') }])]} />
        <MiniSelect label={t('Kitni')} value={s.show} onChange={(v) => set({ show: v })} options={SHOW_OPTIONS} />
        <MiniSelect label={t('Dikhawa')} value={s.view} onChange={(v) => set({ view: v })} options={[{ value: 'donut', label: t('Gol chart') }, { value: 'bars', label: t('Sirf patiyan') }]} />
      </WidgetToolbar>
      {isLoading ? <Loading /> : rows.length === 0 ? <EmptyHint icon={Layers} text={t('Is period me koi sale nahi')} /> : (
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
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 ms-[18px]">
                  <div className="h-full rounded-full" style={{ width: `${(r[sort] / max) * 100}%`, backgroundColor: r.fill }} />
                </div>
                <div className="ms-[18px] mt-0.5 flex flex-wrap gap-x-3 text-[0.6875rem] text-slate-500">
                  {sort !== 'qty' && <span>{t('{{qty}} pcs', { qty: fmtQty(r.qty) })}</span>}
                  {sort !== 'revenue' && <span>{t('sale {{revenue}}', { revenue: sales(r.revenue) })}</span>}
                  {!costHidden && sort !== 'profit' && r.revenue > 0 && <span>{t('profit {{profit}}', { profit: cost(r.profit) })}</span>}
                  <span>{t('{{value}}% hissa', { value: total ? Math.round((r.revenue / total) * 100) : 0 })}</span>
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
    <WidgetCard title={t('Staff ki sale')} icon={Medal} description={periodLabel(s.days)} to="/staff/commission" linkLabel={t('Commission')}>
      <WidgetToolbar inset={false}
        print={() => ({
          title: t('Staff ki sale'), subtitle: periodLabel(s.days),
          sections: [{
            kind: 'table',
            columns: [{ label: '#' }, { label: t('Naam') }, { label: t('Bill'), align: 'right' }, { label: t('Ausat'), align: 'right', wideOnly: true }, { label: t('Sale'), align: 'right' }],
            rows: rows.map((r, i) => [String(i + 1), r.name, String(r.bills), sales(r.average), sales(r.total)]),
          }],
        })}>
        <MiniSelect label={t('Period')} value={s.days} onChange={(v) => set({ days: v })} options={PERIOD_OPTIONS} />
        <MiniSelect label={t('Ranking')} value={sort} onChange={(v) => set({ sort: v })}
          options={[{ value: 'total', label: t('Sale se') }, { value: 'bills', label: t('Bill se') }, { value: 'average', label: t('Ausat bill se') }, ...(costHidden ? [] : [{ value: 'profit', label: t('Profit se') }])]} />
      </WidgetToolbar>
      {isLoading ? <Loading /> : rows.length === 0 ? <EmptyHint icon={Users} text={t('Is period me koi sale nahi')} /> : (
        <ul className="space-y-3">
          {rows.map((p, i) => (
            <li key={p.userId} className="flex items-center gap-3">
              <div className="relative shrink-0">
                <Avatar name={p.name} url={p.avatarUrl ?? undefined} size={34} />
                {i < 3 && <span className={cn('absolute -bottom-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full text-[0.625rem] font-bold ring-2 ring-white', MEDALS[i])}>{i + 1}</span>}
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
                  {t('{{bills}} bill · ausat {{average}}{{value}}{{value2}}', { bills: p.bills, average: sales(p.average), value: sort !== 'total' ? t(' · sale {{total}}', { total: sales(p.total) }) : '', value2: !costHidden && sort !== 'profit' ? t(' · profit {{profit}}', { profit: cost(p.profit) }) : '' })}
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
    <WidgetCard title={t('Hafte ke din')} icon={CalendarDays}
      description={best && best[metric] ? t('Sab se acha {{full}}{{value}}', { full: best.full, value: worst && worst !== best ? t(' · sab se halka {{full}}', { full: worst.full }) : '' }) : t('Rozana ausat')}>
      <WidgetToolbar inset={false}
        print={() => ({
          title: t('Hafte ke din'), subtitle: t('Pichhle {{days}} din ka rozana ausat', { days: s.days }),
          sections: [{ kind: 'table', columns: [{ label: t('Din') }, { label: t('Ausat bill'), align: 'right' }, { label: t('Ausat sale'), align: 'right' }],
            rows: rows.map((r) => [r.full, r.bills.toFixed(1), sales(r.average)]) }],
        })}>
        <MiniSelect label={t('Period')} value={s.days} onChange={(v) => set({ days: v })} options={[{ value: '30', label: t('30 din') }, { value: '90', label: t('90 din') }]} />
        <MiniSelect label={t('Kya dikhayein')} value={s.metric} onChange={(v) => set({ metric: v })} options={[{ value: 'average', label: t('Ausat sale') }, { value: 'bills', label: t('Ausat bill') }]} />
      </WidgetToolbar>
      {isLoading ? <Loading /> : hidden ? <EmptyHint icon={CalendarDays} text={t('Sale chhupi hui hai')} /> : rows.every((r) => !r.total) ? (
        <EmptyHint icon={CalendarDays} text={t('Abhi data kam hai')} />
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
              <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={metric === 'average' ? axisMoney : undefined} width={44} />
              <Tooltip formatter={(v) => [metric === 'average' ? formatPKR(Number(v)) : Number(v).toFixed(1), metric === 'average' ? t('Ausat sale') : t('Ausat bill')]}
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
    <WidgetCard title={t('Behtareen customers')} icon={Crown} description={periodLabel(s.days)} to="/customers">
      <WidgetToolbar inset={false}
        print={() => ({
          title: t('Behtareen customers'), subtitle: periodLabel(s.days),
          sections: [{ kind: 'table', columns: [{ label: t('Naam') }, { label: t('Phone'), wideOnly: true }, { label: t('Bill'), align: 'right' }, { label: t('Khareeda'), align: 'right' }, { label: t('Udhaar'), align: 'right' }],
            rows: rows.map((c) => [c.name, c.phone ?? '', String(c.bills), sales(c.total), cost(c.balance)]) }],
        })}>
        <MiniSelect label={t('Period')} value={s.days} onChange={(v) => set({ days: v })} options={PERIOD_OPTIONS} />
        <MiniSelect label={t('Sort')} value={s.sort} onChange={(v) => set({ sort: v })}
          options={[{ value: 'total', label: t('Khareedari se') }, { value: 'bills', label: t('Bill se') }, { value: 'balance', label: t('Udhaar se') }]} />
        <MiniSelect label={t('Kitne')} value={s.limit} onChange={(v) => set({ limit: v })} options={[{ value: '5', label: t('Top 5') }, { value: '10', label: t('Top 10') }, { value: '20', label: t('Top 20') }]} />
        <MiniSelect label={t('Filter')} value={s.filter} onChange={(v) => set({ filter: v })} options={[{ value: 'all', label: t('Sab') }, { value: 'credit', label: t('Jin par udhaar') }]} />
      </WidgetToolbar>
      {isLoading ? <Loading /> : rows.length === 0 ? <EmptyHint icon={Users} text={t('Is period me naam wale customer ki sale nahi')} /> : (
        <ul className="-mx-2 divide-y divide-slate-100">
          {rows.map((c, i) => (
            <li key={c.customerId}>
              <Link to={`/customers/${c.customerId}`} className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50">
                <span className="w-4 shrink-0 text-center text-[0.75rem] font-semibold text-slate-400">{i + 1}</span>
                <Avatar name={c.name} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] font-medium text-slate-900">{c.name}</span>
                  <span className="block truncate text-[0.6875rem] text-slate-500">
                    {t('{{bills}} bill{{value}}', { bills: c.bills, value: c.phone ? ` · ${c.phone}` : '' })}{c.balance > 0 ? <> · <span className="font-medium text-amber-700">{t('udhaar {{balance}}', { balance: cost(c.balance) })}</span></> : ''}
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
    <WidgetCard title={t('{{months}} mahine ka muqabla', { months })} icon={CalendarRange}
      description={change !== null && !salesHidden ? t('Is mahine pichhle se {{value}}{{value2}}%', { value: change >= 0 ? '+' : '', value2: change.toFixed(1) }) : t('Har mahine ki sale, expense aur profit')}>
      <WidgetToolbar inset={false}
        print={() => ({
          title: t('{{months}} mahine ka muqabla', { months }),
          sections: [{
            kind: 'table',
            columns: [{ label: t('Mahina') }, { label: t('Bill'), align: 'right' }, { label: t('Sale'), align: 'right' }, ...(costHidden ? [] : [{ label: t('Expense'), align: 'right' as const }, { label: t('Profit'), align: 'right' as const }])],
            rows: rows.map((m) => [monthName(m.month, true), String(m.bills), sales(m.sales), ...(costHidden ? [] : [cost(m.expenses), cost(m.profit)])]),
          }],
        })}>
        <MiniSelect label={t('Mahine')} value={s.months} onChange={(v) => set({ months: v })} options={[{ value: '6', label: t('6 mahine') }, { value: '12', label: t('12 mahine') }]} />
        {!costHidden && (
          <MiniSelect label={t('Kya dikhayein')} value={s.series} onChange={(v) => set({ series: v })}
            options={[{ value: 'all', label: t('Sab') }, { value: 'sales', label: t('Sirf sale') }, { value: 'profit', label: t('Sale + profit') }, { value: 'expenses', label: t('Sale + expense') }]} />
        )}
      </WidgetToolbar>
      {isLoading ? <Skeleton className="h-[260px] w-full" /> : salesHidden ? <EmptyHint icon={CalendarRange} text={t('Sale chhupi hui hai')} /> : (
        <>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip formatter={(v, n) => [formatPKR(Number(v)), n]} contentStyle={theme.tooltip.contentStyle} labelStyle={theme.tooltip.labelStyle} cursor={theme.tooltip.cursor} />
                <Bar dataKey="sales" name="Sale" fill={theme.primary} radius={[6, 6, 0, 0]} maxBarSize={32} />
                {showExpenses && <Bar dataKey="expenses" name="Kharcha" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={32} />}
                {showProfit && <Line type="monotone" dataKey="profit" name="Profit" stroke={theme.profit} strokeWidth={2.25} dot={{ r: 3 }} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-4 text-[0.75rem] text-slate-500">
            {[{ c: theme.primary, l: t('Sale'), on: true }, { c: '#f59e0b', l: t('Expense'), on: showExpenses }, { c: theme.profit, l: t('Profit'), on: showProfit }].filter((x) => x.on).map((x) => (
              <span key={x.l} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: x.c }} />{x.l}</span>
            ))}
          </div>
        </>
      )}
    </WidgetCard>
  );
}
