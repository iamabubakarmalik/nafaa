/**
 * Analytics for the ledger's current filter: value in and out, the daily
 * trend, the split by movement type, the products that moved most and who
 * moved stock.
 */

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, Boxes, PackageSearch, PieChart as PieIcon, Scale, TrendingUp, Users } from 'lucide-react';
import { Card, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { MovementAnalytics as Data } from '../api/stock-movements.api';
import { fmtQty, movementMeta } from './movementMeta';

const dayLabel = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

export function MovementAnalytics({ data, loading, money }: { data?: Data; loading: boolean; money: (n: number) => string }) {
  const theme = useChartTheme();
  const tip = theme.tooltip;

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }
  const t = data.totals;
  if (!t.count) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <TrendingUp className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900">Is filter me stock ka koi aana jana nahi</p>
        <p className="mt-1 text-sm text-slate-500">Period lambi karein ya filter hatayein</p>
      </div>
    );
  }
  const trend = data.trend.map((d) => ({ ...d, label: dayLabel(d.key) }));
  const types = data.byType.map((x) => ({ ...x, label: movementMeta(x.type).label, color: movementMeta(x.type).color, abs: Math.abs(x.value) }));
  const typeTotal = types.reduce((s, x) => s + x.abs, 0) || 1;
  const moverMax = Math.max(1, ...data.topMovers.map((m) => m.in + m.out));
  const personMax = Math.max(1, ...data.byPerson.map((p) => p.count));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Boxes} label="Entries" value={t.count.toLocaleString('en-PK')} sub={`${data.byType.length} type ki`} />
        <Kpi icon={ArrowDownRight} label="Maal aaya (cost)" value={money(t.valueIn)} tone="emerald" sub="Purchase, return, transfer aaya…" />
        <Kpi icon={ArrowUpRight} label="Maal gaya (cost)" value={money(t.valueOut)} tone="rose" sub="Sale, kharab, transfer gaya…" />
        <Kpi icon={Scale} label="Farq" value={money(t.net)} tone={t.net >= 0 ? 'emerald' : 'rose'} sub={t.net >= 0 ? 'Stock ki value barhi' : 'Stock ki value ghati'} />
      </div>

      <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-600" />Roz ka aana jana</span>} description="Cost value me — hara aaya, laal gaya">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }} barGap={2}>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
              <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
              <Tooltip formatter={(v, n) => [formatPKR(Number(v)), n === 'in' ? 'Aaya' : 'Gaya']} {...tip} />
              <Legend formatter={(v) => (v === 'in' ? 'Aaya' : 'Gaya')} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="in" fill={theme.profit} radius={[4, 4, 0, 0]} maxBarSize={18} />
              <Bar dataKey="out" fill={theme.isDark ? '#fb7185' : '#e11d48'} radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="rounded-2xl lg:col-span-2" title={<span className="inline-flex items-center gap-2"><PieIcon className="h-4 w-4 text-brand-600" />Type war</span>} description="Kis wajah se kitna maal hila">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={types} dataKey="abs" nameKey="label" innerRadius={50} outerRadius={78} paddingAngle={2} stroke="none">
                  {types.map((x) => <Cell key={x.type} fill={x.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [formatPKR(Number(v)), n]} {...tip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5 text-[0.8125rem]">
            {types.map((x) => {
              const M = movementMeta(x.type);
              return (
                <li key={x.type} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2"><M.icon className="h-3.5 w-3.5 shrink-0" style={{ color: x.color }} /><span className="truncate text-slate-700">{x.label}</span><span className="text-[0.75rem] text-slate-400">{x.count}</span></span>
                  <span className="shrink-0 tabular-nums text-slate-900">{money(x.abs)} <span className="text-slate-400">· {((x.abs / typeTotal) * 100).toFixed(0)}%</span></span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="rounded-2xl lg:col-span-3" title={<span className="inline-flex items-center gap-2"><PackageSearch className="h-4 w-4 text-brand-600" />Sab se zyada hilne wala maal</span>} description="Quantity aaya / gaya, aur kul cost value">
          {!data.topMovers.length ? <Empty text="Koi cheez nahi" /> : (
            <ul className="space-y-3">
              {data.topMovers.map((m, i) => (
                <li key={`${m.name}${i}`}>
                  <div className="flex justify-between gap-2 text-[0.8125rem]">
                    <span className="truncate font-medium text-slate-800"><span className="mr-1.5 text-slate-400">{i + 1}</span>{m.name}</span>
                    <span className="shrink-0 tabular-nums text-slate-900">{money(m.value)}</span>
                  </div>
                  <div className="mt-1 flex h-2 gap-0.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-l-full bg-emerald-500" style={{ width: `${(m.in / moverMax) * 100}%` }} />
                    <div className="h-full rounded-r-full bg-rose-500" style={{ width: `${(m.out / moverMax) * 100}%` }} />
                  </div>
                  <p className="mt-0.5 text-[0.6875rem] text-slate-500">
                    <span className="text-emerald-700">+{fmtQty(m.in)}</span> aaya · <span className="text-rose-700">−{fmtQty(m.out)}</span> gaya {m.unit}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-brand-600" />Kis ne stock hilaya</span>} description="Entries aur un ki cost value">
        {!data.byPerson.length ? <Empty text="Kisi ka naam darj nahi — purani entries me ye maloomat nahi hoti" /> : (
          <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {data.byPerson.map((p) => (
              <li key={p.name}>
                <div className="flex justify-between gap-2 text-[0.8125rem]">
                  <span className="truncate font-medium text-slate-800">{p.name}</span>
                  <span className="shrink-0 tabular-nums text-slate-900">{p.count} <span className="text-slate-400">· {money(p.value)}</span></span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(p.count / personMax) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Kpi({ icon: I, label, value, sub, tone = 'brand' }: { icon: typeof Boxes; label: string; value: string; sub?: string; tone?: 'brand' | 'emerald' | 'rose' }) {
  const toneCls = tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : tone === 'rose' ? 'bg-rose-50 text-rose-700' : 'bg-brand-50 text-brand-700';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2"><span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', toneCls)}><I className="h-4 w-4" /></span><span className="text-[0.8125rem] text-slate-500">{label}</span></div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-[0.75rem] text-slate-500">{sub}</p>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-[0.875rem] text-slate-500">{text}</p>;
}
