/**
 * Transfer analytics for the chosen period: value moved, what is still on
 * the way, how long receiving takes, what went missing, the daily trend,
 * the busiest routes, the most moved products and the status split.
 */

import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowRight, Clock, PackageSearch, PieChart as PieIcon, Route, TrendingUp, Truck } from 'lucide-react';
import { Card, Segmented, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { TransferAnalytics as Data } from '../api/transfers.api';
import { STATUS, qty } from './transferMeta';

const PALETTE = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#0891b2'];

export function TransferAnalytics({ data, loading, money }: { data?: Data; loading: boolean; money: (n: number) => string }) {
  const theme = useChartTheme();
  const tip = theme.tooltip;
  const [metric, setMetric] = useState<'value' | 'count'>('value');

  if (loading || !data) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;
  }
  const t = data.totals;
  const trend = data.trend.map((d) => ({ ...d, label: new Date(`${d.key}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) }));
  const status = data.byStatus.filter((s) => s.count > 0);
  const routeMax = Math.max(1, ...data.routes.map((r) => r.value));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Truck} label="Kul maal gaya" value={money(t.value)} sub={`${t.count} transfer · ${t.cancelled} cancel`} />
        <Kpi icon={Clock} label="Raste me" value={String(t.inTransit)} sub={t.inTransit ? 'Receive hona baqi' : 'Sab pohanch gaya'} tone={t.inTransit ? 'amber' : 'emerald'} />
        <Kpi icon={TrendingUp} label="Ausat receiving waqt" value={t.avgHours == null ? '—' : `${t.avgHours} ghante`} sub={t.avgHours == null ? 'Abhi koi receive nahi' : 'Bhejne se receive tak'} />
        <Kpi icon={AlertTriangle} label="Kam aaya" value={money(t.shortValue)} sub={t.shortValue > 0 ? 'Raste me gum / toota' : 'Koi kami nahi'} tone={t.shortValue > 0 ? 'rose' : 'emerald'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2" title={<span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-600" />Din war</span>}
          description="Har din kitna maal bheja gaya"
          actions={<Segmented label="Kya dikhayein" value={metric} onChange={setMetric} items={[{ value: 'value', label: 'Qeemat' }, { value: 'count', label: 'Transfers' }]} />}>
          {!trend.length ? <Empty text="Is period me koi transfer nahi" /> : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tr-trend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.primary} stopOpacity={0.3} /><stop offset="100%" stopColor={theme.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={metric === 'count' ? undefined : axisMoney} width={44} allowDecimals={false} />
                  <Tooltip formatter={(v) => [metric === 'count' ? String(v) : formatPKR(Number(v)), metric === 'count' ? 'Transfers' : 'Qeemat']} {...tip} />
                  <Area type="monotone" dataKey={metric} stroke={theme.primary} strokeWidth={2.25} fill="url(#tr-trend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><PieIcon className="h-4 w-4 text-brand-600" />Halat</span>} description="Raste me, receive aur cancel">
          {!status.length ? <Empty text="Koi transfer nahi" /> : (
            <>
              <div className="h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={status} dataKey="count" nameKey="key" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none">
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
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Route className="h-4 w-4 text-brand-600" />Raaste</span>} description="Kis branch se kis branch ko sab se zyada maal gaya">
          {!data.routes.length ? <Empty text="Koi transfer nahi" /> : (
            <ul className="space-y-2.5">
              {data.routes.map((r, i) => (
                <li key={`${r.from}>${r.to}`}>
                  <div className="flex justify-between gap-2 text-[0.8125rem]">
                    <span className="flex min-w-0 items-center gap-1 font-medium text-slate-800"><span className="truncate">{r.from}</span><ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{r.to}</span></span>
                    <span className="shrink-0 tabular-nums text-slate-900">{money(r.value)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${(r.value / routeMax) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                  </div>
                  <p className="mt-0.5 text-[0.6875rem] text-slate-500">{r.count} transfer</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><PackageSearch className="h-4 w-4 text-brand-600" />Sab se zyada bheja maal</span>} description="Quantity base unit me, qeemat cost par">
          {!data.topProducts.length ? <Empty text="Koi transfer nahi" /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[22rem] text-sm">
                <thead className="text-left text-[0.75rem] uppercase tracking-wide text-slate-500">
                  <tr><th className="py-2">#</th><th className="py-2">Cheez</th><th className="py-2 text-right">Quantity</th><th className="py-2 text-right">Qeemat</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.topProducts.map((p, n) => (
                    <tr key={`${p.name}${n}`}>
                      <td className="py-2 text-slate-400">{n + 1}</td>
                      <td className="py-2 font-medium text-slate-900">{p.name}</td>
                      <td className="py-2 text-right tabular-nums">{qty(p.qty)} {p.unit}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">{money(p.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon: I, label, value, sub, tone = 'brand' }: { icon: typeof Truck; label: string; value: string; sub?: string; tone?: 'brand' | 'amber' | 'emerald' | 'rose' }) {
  const toneCls = { brand: 'bg-brand-50 text-brand-700', amber: 'bg-amber-50 text-amber-700', emerald: 'bg-emerald-50 text-emerald-700', rose: 'bg-rose-50 text-rose-700' }[tone];
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
