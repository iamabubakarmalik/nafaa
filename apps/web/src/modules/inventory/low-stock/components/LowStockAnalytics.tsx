/**
 * Low-stock analytics for the current filter: sales lost to empty shelves,
 * money needed for the reorder, how often shelves ran empty day by day, how
 * many days of stock is left across the lines, and where the money goes by
 * supplier and category.
 */

import { useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarClock, Clock, HandCoins, PackageX, PieChart as PieIcon, ShoppingCart, TrendingDown, Truck } from 'lucide-react';
import { Card, Segmented, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { LowAnalytics as Data } from '../api';
import { STATUS, daysText, qty } from './meta';

const COVER_COLORS: Record<string, string> = { out: '#e11d48', d3: '#ea580c', d7: '#d97706', d14: '#ca8a04', d15: '#16a34a', none: '#94a3b8' };

export function LowStockAnalytics({ data, loading, money, cost, costHidden }: {
  data?: Data; loading: boolean; money: (n: number) => string; cost: (n: number) => string; costHidden: boolean;
}) {
  const theme = useChartTheme();
  const tip = theme.tooltip;
  const [metric, setMetric] = useState<'count' | 'value'>('count');
  if (loading || !data) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;
  }
  const t = data.totals;
  const trend = data.trend.map((d) => ({ ...d, label: new Date(`${d.key}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) }));
  const status = data.byStatus.filter((s) => s.count > 0);
  const supplierMax = Math.max(1, ...data.bySupplier.map((s) => s.value));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={TrendingDown} tone="rose" label="Ruki hui sale (andaza)" value={money(t.lostSales)} sub={`Roz ${money(t.lostPerDay)} — khatam maal ki wajah se`} />
        <Kpi icon={ShoppingCart} tone="brand" label="Order ka expense" value={cost(t.orderValue)} sub={`${t.lines} lines me se`} />
        <Kpi icon={Truck} tone="sky" label="Order me hai" value={cost(t.onOrderValue)} sub="Supplier se aana baqi" />
        <Kpi icon={CalendarClock} tone="violet" label="Expiry ka maal" value={cost(t.expiryValue)} sub={`${data.settings.expiryDays} din me — cost par`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2" title={<span className="inline-flex items-center gap-2"><PackageX className="h-4 w-4 text-brand-600" />Shelf kitni dafa khaali hui</span>}
          description={`Pichhle ${data.settings.days} din — har din kitni cheezein zero par pohanchin (kul ${t.stockouts})`}>
          {!trend.some((d) => d.count > 0) ? <Empty text="Is period me koi shelf khaali nahi hui" /> : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ls-trend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e11d48" stopOpacity={0.3} /><stop offset="100%" stopColor="#e11d48" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={14} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
                  <Tooltip formatter={(v) => [String(v), 'Cheezein khatam hui']} {...tip} />
                  <Area type="monotone" dataKey="count" stroke="#e11d48" strokeWidth={2.25} fill="url(#ls-trend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><PieIcon className="h-4 w-4 text-brand-600" />Halat</span>} description="Ek cheez do jagah bhi aa sakti hai">
          {!status.length ? <Empty text="Sab theek hai" /> : (
            <>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={status} dataKey="count" nameKey="key" innerRadius={46} outerRadius={70} paddingAngle={2} stroke="none">
                      {status.map((s) => <Cell key={s.key} fill={STATUS[s.key].color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [String(v), STATUS[n as keyof typeof STATUS]?.label ?? n]} {...tip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1 text-[0.8125rem]">
                {status.map((s) => (
                  <li key={s.key} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS[s.key].color }} />{STATUS[s.key].label}</span>
                    <span className="tabular-nums text-slate-900">{s.count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-brand-600" />Kitne din ka maal bacha</span>} description="Roz ki sale ke hisaab se">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.cover} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
                <Tooltip formatter={(v) => [String(v), 'Cheezein']} {...tip} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>{data.cover.map((c) => <Cell key={c.key} fill={COVER_COLORS[c.key] ?? theme.primary} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><HandCoins className="h-4 w-4 text-brand-600" />Supplier war order</span>} description="Kis supplier ko kitne ka order jayega">
          {!data.bySupplier.length || costHidden ? <Empty text={costHidden ? 'Cost chhupi hui hai' : 'Koi order nahi'} /> : (
            <ul className="space-y-2.5">
              {data.bySupplier.map((s) => (
                <li key={s.key}>
                  <div className="flex justify-between gap-2 text-[0.8125rem]"><span className="truncate font-medium text-slate-800">{s.name}</span><span className="shrink-0 tabular-nums text-slate-900">{cost(s.value)}</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${(s.value / supplierMax) * 100}%`, background: theme.primary }} /></div>
                  <p className="mt-0.5 text-[0.6875rem] text-slate-500">{s.count} cheezein</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title="Sab se zyada ruki sale" description="Khatam maal × roz ki sale × rate — andaza">
          {!data.topLost.length ? <Empty text="Koi bikta hua maal khatam nahi" /> : (
            <Table head={['Cheez', 'Kab se', 'Roz', 'Ruki sale']} rows={data.topLost.map((r) => [
              <span key="n" className="font-medium text-slate-900">{r.name}</span>, r.outDays !== null ? `${r.outDays} din` : '—', money(r.lostPerDay), <b key="v">{money(r.lostSales)}</b>,
            ])} />
          )}
        </Card>
        <Card className="rounded-2xl" title="Jaldi khatam hone wale" description="Jo abhi hai, kitne din chalega">
          {!data.runningOut.length ? <Empty text="Kuch jaldi khatam nahi ho raha" /> : (
            <Table head={['Cheez', 'Abhi', 'Roz sale', 'Chalega']} rows={data.runningOut.map((r) => [
              <span key="n" className="font-medium text-slate-900">{r.name}</span>, `${qty(r.stock)} ${r.unit}`, qty(r.perDay),
              <b key="d" className={cn((r.daysLeft ?? 99) <= 3 && 'text-rose-700')}>{daysText(r.daysLeft)}</b>,
            ])} />
          )}
        </Card>
      </div>

      {data.byCategory.length > 0 && (
        <Card className="rounded-2xl" title="Category war" description="Kis category me sab se zyada kami"
          actions={!costHidden && <Segmented label="Kya dikhayein" value={metric} onChange={setMetric} items={[{ value: 'count', label: 'Cheezein' }, { value: 'value', label: 'Order' }]} />}>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byCategory} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} horizontal={false} />
                <XAxis type="number" tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={metric === 'value' ? axisMoney : undefined} />
                <YAxis type="category" dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} width={110} />
                <Tooltip formatter={(v) => [metric === 'value' ? cost(Number(v)) : String(v), metric === 'value' ? 'Order' : 'Cheezein']} {...tip} />
                <Bar dataKey={metric === 'value' && !costHidden ? 'value' : 'count'} fill={theme.primary} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}

function Kpi({ icon: I, label, value, sub, tone }: { icon: typeof Truck; label: string; value: string; sub?: string; tone: 'brand' | 'rose' | 'sky' | 'violet' }) {
  const toneCls = { brand: 'bg-brand-50 text-brand-700', rose: 'bg-rose-50 text-rose-700', sky: 'bg-sky-50 text-sky-700', violet: 'bg-violet-50 text-violet-700' }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2"><span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', toneCls)}><I className="h-4 w-4" /></span><span className="text-[0.8125rem] text-slate-500">{label}</span></div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-[0.75rem] text-slate-500">{sub}</p>}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[22rem] text-sm">
        <thead className="text-left text-[0.75rem] uppercase tracking-wide text-slate-500">
          <tr>{head.map((h, i) => <th key={h} className={cn('py-2', i > 0 && 'text-right')}>{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={cn('py-2 tabular-nums', j > 0 && 'text-right')}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-[0.875rem] text-slate-500">{text}</p>;
}
