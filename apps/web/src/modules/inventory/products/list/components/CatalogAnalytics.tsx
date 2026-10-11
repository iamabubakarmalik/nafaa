/** Whole-catalog analytics: value, stock health, margins, movers, idle stock, expiry and gaps to fix. */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  AlertTriangle, CalendarClock, Flame, Hourglass, Layers, PackageX, Percent, Snowflake, Sparkles, Wallet, Wrench, type LucideIcon,
} from 'lucide-react';
import { Card, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { CatalogAnalytics as Data, CatalogStats } from '../api';
import { qty } from './ProductCard';

function Tile({ icon: Icon, color, label, value, hint }: { icon: LucideIcon; color: string; label: string; value: string; hint?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <span className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.08]" style={{ backgroundColor: color }} aria-hidden />
      <div className="flex items-center gap-2 text-[0.75rem] font-medium text-slate-500">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}17`, color }}><Icon className="h-4 w-4" /></span>{label}
      </div>
      <p className="mt-2 truncate text-[1.375rem] font-bold tracking-tight tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[0.75rem] text-slate-500">{hint}</p>}
    </div>
  );
}

const title = (Icon: LucideIcon, text: string) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{text}</span>;

function List<T extends { id: string; name: string }>({ rows, empty, right, sub, detail }: {
  rows: T[]; empty: string; right: (r: T) => ReactNode; sub: (r: T) => ReactNode; detail: (id: string) => string;
}) {
  if (!rows.length) return <p className="px-5 py-10 text-center text-[0.8125rem] text-slate-500">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-100 pb-1">
      {rows.map((r, i) => (
        <li key={r.id}>
          <Link to={detail(r.id)} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50 sm:px-5">
            <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[0.6875rem] font-bold', i < 3 ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-600')}>{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-medium text-slate-900">{r.name}</span>
              <span className="block truncate text-[0.6875rem] text-slate-500">{sub(r)}</span>
            </span>
            <span className="shrink-0 text-right text-[0.8125rem] font-semibold tabular-nums text-slate-900">{right(r)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CatalogAnalytics({ data, stats, loading, money, cost, costHidden, detail }: {
  data?: Data; stats?: CatalogStats; loading: boolean;
  money: (n: number) => string; cost: (n: number) => string; costHidden: boolean; detail: (id: string) => string;
}) {
  const theme = useChartTheme();
  if (loading || !data || !stats) return <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>;

  const health = [
    { id: 'in', label: 'Theek', value: data.health.in, color: '#16a34a' },
    { id: 'low', label: 'Kam', value: data.health.low, color: '#f59e0b' },
    { id: 'out', label: 'Khatam', value: data.health.out, color: '#e11d48' },
  ];
  const healthTotal = health.reduce((s, h) => s + h.value, 0) || 1;
  const catMax = Math.max(1, ...data.categories.map((c) => (costHidden ? c.units : c.costValue)));
  const marginMax = Math.max(1, ...data.margins.map((m) => m.count));
  const profit = stats.saleValue - stats.costValue;
  const fixes = [
    { n: data.fix.noCost, text: 'ki cost nahi likhi — munafa ghalat dikhega' },
    { n: data.fix.belowCost, text: 'cost se sasti bik rahi hain' },
    { n: data.fix.noBarcode, text: 'ka barcode ya SKU nahi — scan se nahi milengi' },
    { n: data.fix.noCategory, text: 'kisi category mein nahi' },
    { n: data.fix.noImage, text: 'ki tasveer nahi' },
  ].filter((f) => f.n > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Tile icon={Wallet} color="#2563eb" label="Stock ki cost" value={cost(stats.costValue)} hint={`${qty(stats.units)} units · ${stats.products} cheezein`} />
        <Tile icon={Sparkles} color="#16a34a" label="Bechne par milega" value={money(stats.saleValue)} hint={costHidden ? 'Cost lock' : `munafa ${cost(profit)}`} />
        <Tile icon={Flame} color="#ea580c" label={`${data.windowDays} din ki bikri`} value={money(stats.revenue30)} hint={`${qty(stats.sold30)} units biki`} />
        <Tile icon={Snowflake} color="#64748b" label="Pada hua maal" value={cost(stats.deadValue)} hint={`${stats.dead} cheezein ${data.windowDays} din se nahi biki`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2" title={title(Layers, 'Category war maal')} description={costHidden ? 'Units ke hisaab se' : 'Stock ki cost ke hisaab se'} flush>
          {data.categories.length === 0 ? <p className="px-5 py-10 text-center text-[0.8125rem] text-slate-500">Koi maal nahi</p> : (
            <ul className="space-y-3 px-4 pb-4 sm:px-5">
              {data.categories.slice(0, 10).map((c) => (
                <li key={c.id}>
                  <div className="flex items-baseline gap-2 text-[0.8125rem]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{c.name} <span className="font-normal text-slate-400">· {c.products} cheezein · {qty(c.units)} units</span></span>
                    {!costHidden && <span className="font-semibold tabular-nums text-slate-900">{cost(c.costValue)}</span>}
                  </div>
                  <div className="ml-4 mt-1 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${((costHidden ? c.units : c.costValue) / catMax) * 100}%`, backgroundColor: c.color }} /></div>
                    <span className="w-28 shrink-0 text-right text-[0.6875rem] text-slate-500">{data.windowDays} din: {qty(c.sold30)} bika</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="rounded-2xl" title={title(PackageX, 'Stock ki sehat')}>
          <div className="mx-auto h-[150px] w-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={health} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="100%" paddingAngle={2} stroke="none">
                  {health.map((h) => <Cell key={h.id} fill={h.color} />)}
                </Pie>
                <Tooltip contentStyle={theme.tooltip.contentStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-2 text-[0.8125rem]">
            {health.map((h) => (
              <li key={h.id} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: h.color }} />
                <span className="flex-1 text-slate-700">{h.label}</span>
                <span className="tabular-nums text-slate-500">{Math.round((h.value / healthTotal) * 100)}%</span>
                <span className="w-10 text-right font-semibold tabular-nums">{h.value}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 border-t border-slate-100 pt-2"><Snowflake className="h-3.5 w-3.5 text-slate-400" /><span className="flex-1 text-slate-700">Nahi bik raha</span><span className="font-semibold tabular-nums">{data.health.dead}</span></li>
            {data.health.expiring > 0 && <li className="flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5 text-amber-500" /><span className="flex-1 text-slate-700">Expiry qareeb</span><span className="font-semibold tabular-nums">{data.health.expiring}</span></li>}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl" title={title(Flame, 'Sab se zyada bikne wale')} description={`Pichhle ${data.windowDays} din`} flush>
          <List rows={data.topSellers} empty="Abhi koi bikri nahi" detail={detail}
            sub={(r) => `${qty(r.sold)} ${r.unit} bika · ${r.daysLeft ? `${r.daysLeft} din ka stock` : 'stock khatam'}`} right={(r) => money(r.revenue)} />
        </Card>
        <Card className="rounded-2xl" title={title(Hourglass, 'Jaldi khatam honge')} description="Is raftaar se 7 din ke andar" flush>
          <List rows={data.runningOut} empty="Koi cheez jaldi khatam nahi ho rahi" detail={detail}
            sub={(r) => `${qty(r.stock)} ${r.unit} bacha · roz ${qty(r.perDay)} bikta`}
            right={(r) => <span className={cn(r.daysLeft <= 2 ? 'text-rose-600' : 'text-amber-700')}>{r.daysLeft === 0 ? 'Aaj' : `${r.daysLeft} din`}</span>} />
        </Card>
        <Card className="rounded-2xl" title={title(Snowflake, 'Pada hua maal')} description={`${data.windowDays} din se nahi bika — paisa ruka hua`} flush>
          <List rows={data.deadStock} empty="Sab maal chal raha hai" detail={detail}
            sub={(r) => `${qty(r.stock)} ${r.unit}${r.lastSoldAt ? ` · aakhri bikri ${new Date(r.lastSoldAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}` : ' · kabhi nahi bika'}`}
            right={(r) => cost(r.costValue)} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl" title={title(Wallet, 'Sab se qeemti stock')} flush>
          <List rows={data.topValue} empty="Koi stock nahi" detail={detail}
            sub={(r) => `${qty(r.stock)} ${r.unit} · rate ${money(r.price)}`} right={(r) => cost(r.costValue)} />
        </Card>
        <Card className="rounded-2xl" title={title(Percent, 'Munafa ka hissa')} description="Kitni cheezon par kitna margin">
          {costHidden ? <p className="py-10 text-center text-[0.8125rem] text-slate-500">Cost lock hai</p> : (
            <ul className="space-y-2.5">
              {data.margins.map((m) => (
                <li key={m.id} className="text-[0.8125rem]">
                  <div className="flex justify-between"><span className="text-slate-700">{m.label}</span><span className="font-semibold tabular-nums">{m.count}</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full', m.id === 'loss' ? 'bg-rose-500' : m.id === 'none' ? 'bg-slate-400' : m.id === 'low' ? 'bg-amber-400' : 'bg-success-500')} style={{ width: `${(m.count / marginMax) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="rounded-2xl" title={title(Wrench, 'Theek karne wali cheezein')}>
          {fixes.length === 0 ? (
            <p className="flex items-center gap-2 py-6 text-[0.8125rem] text-success-700"><Sparkles className="h-4 w-4" />Sab kuch mukammal hai</p>
          ) : (
            <ul className="space-y-2">
              {fixes.map((f) => (
                <li key={f.text} className="flex items-start gap-2.5 rounded-xl bg-amber-50/70 p-2.5 text-[0.8125rem] text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span><strong className="tabular-nums">{f.n}</strong> cheezon {f.text}</span>
                </li>
              ))}
            </ul>
          )}
          {data.expiring.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 inline-flex items-center gap-1.5 text-[0.75rem] font-semibold text-slate-700"><CalendarClock className="h-3.5 w-3.5 text-amber-600" />Expiry sab se pehle</p>
              <ul className="space-y-1.5 text-[0.8125rem]">
                {data.expiring.slice(0, 5).map((e) => (
                  <li key={e.id} className="flex justify-between gap-2">
                    <Link to={detail(e.id)} className="truncate text-slate-700 hover:text-brand-700">{e.name}</Link>
                    <span className="shrink-0 tabular-nums text-slate-500">{new Date(e.expiry).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
