/**
 * Production report for a period: what was made and what it cost, raw
 * materials used, cost per unit over time, wastage, and how the made items
 * sold — at the cost set when they were made.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Coins, Factory, Package, Percent, TrendingUp } from 'lucide-react';
import { DateRangeMenu, EmptyState, KpiCard, KpiRow, PageHero, PageShell, Skeleton, resolveRange, type DateRangeValue } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useBusinessDayStart } from '@core/lib/business-day';
import { formatPKR } from '@core/lib/format';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { MFG_KEY, manufacturingApi, qty } from '../api';
import { useManufacturingSwitch } from '../hooks';
import { MfgNav, MfgOff } from '../components/MfgNav';
import { t as tr } from '@core/i18n';

const card = 'rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80';
const th = 'px-3 py-2.5';
const head = 'bg-slate-50 text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500';

export default function ReportPage() {
  const sw = useManufacturingSwitch();
  const enabled = sw === 'on';
  const startHour = useBusinessDayStart();
  const theme = useChartTheme();
  const { cost: money, sales, costHidden } = useMasked();
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const period = resolveRange(range, startHour);
  const q = useQuery({ queryKey: [MFG_KEY, 'report', period], queryFn: () => manufacturingApi.report(period ?? { from: 'all' }), enabled, placeholderData: (p) => p });
  const r = q.data;
  const [pick, setPick] = useState('');
  const trend = useMemo(() => {
    const list = r?.costTrend ?? [];
    const sel = list.find((t) => t.productId === pick) ?? list[0];
    return sel ? { ...sel, points: sel.points.map((p) => ({ ...p, label: p.day.slice(5) })) } : null;
  }, [r, pick]);

  if (sw === 'loading') return <PageShell><Skeleton className="h-28 rounded-3xl" /><Skeleton className="h-72 rounded-2xl" /></PageShell>;
  if (!enabled) return <PageShell><MfgOff /></PageShell>;
  const t = r?.totals;

  return (
    <PageShell>
      <PageHero back="/manufacturing" backLabel={tr('Banayein')} title={tr('Production report')} subtitle={tr('Kya bana, kitna raw maal laga, Cost aur bikne par Profit')}
        actions={<DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />} />
      <MfgNav />

      {q.isLoading || !r ? <Skeleton className="h-96 rounded-2xl" /> : !t?.runs ? (
        <div className={card}><EmptyState icon={<BarChart3 className="h-6 w-6" />} title={tr('Is period me koi production nahi')} description={tr('Period badal kar dekhein.')} /></div>
      ) : (
        <>
          <KpiRow cols={5}>
            <KpiCard icon={Factory} color="#2563eb" label={tr('Production')} value={String(t.runs)} hint={tr('{{quantity}} units bane', { quantity: qty(t.quantity) })} />
            <KpiCard icon={Coins} color="#7c3aed" label={tr('Kul Cost')} value={t.totalCost != null ? money(t.totalCost) : '—'} hint={t.materialCost != null ? tr('Raw maal {{materialCost}}', { materialCost: money(t.materialCost) }) : undefined} />
            <KpiCard icon={Package} color="#0891b2" label={tr('Packing, mazdoori, bijli')} value={t.extraCost != null ? money(t.extraCost) : '—'} />
            <KpiCard icon={Percent} color="#e11d48" label={tr('Wastage')} value={t.wastageCost != null ? money(t.wastageCost) : '—'} hint={tr('Zaya hua raw maal')} />
            <KpiCard icon={TrendingUp} color="#16a34a" label={tr('Bika (bana hua maal)')} value={sales(r.sales.reduce((s, x) => s + x.revenue, 0))}
              hint={costHidden ? undefined : tr('Profit {{value}}', { value: money(r.sales.reduce((s, x) => s + (x.profit ?? 0), 0)) })} />
          </KpiRow>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className={card}>
              <h2 className="px-4 pt-4 text-[0.9375rem] font-semibold text-slate-900 sm:px-5">{tr('Kya bana')}</h2>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[30rem] text-[0.8125rem]">
                  <thead className={head}><tr><th className={th}>{tr('Product')}</th><th className={cn(th, 'text-end')}>{tr('Banaya')}</th><th className={cn(th, 'text-end')}>{tr('Ausat Cost')}</th><th className={cn(th, 'text-end')}>{tr('Kul Cost')}</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {r.products.map((p) => (
                      <tr key={p.productId}>
                        <td className={th}>{p.name}{p.madeOnSale > 0 && <span className="block text-[0.6875rem] text-amber-700">{tr('{{madeOnSale}} bill par bane', { madeOnSale: qty(p.madeOnSale) })}</span>}</td>
                        <td className={cn(th, 'text-end tabular-nums')}>{qty(p.quantity)} {p.unit}</td>
                        <td className={cn(th, 'text-end tabular-nums')}>{p.avgUnitCost != null ? money(p.avgUnitCost) : '—'}</td>
                        <td className={cn(th, 'text-end tabular-nums')}>{p.totalCost != null ? money(p.totalCost) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className={card}>
              <h2 className="px-4 pt-4 text-[0.9375rem] font-semibold text-slate-900 sm:px-5">{tr('Raw maal laga')}</h2>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[26rem] text-[0.8125rem]">
                  <thead className={head}><tr><th className={th}>{tr('Raw maal')}</th><th className={cn(th, 'text-end')}>{tr('Quantity')}</th><th className={cn(th, 'text-end')}>{tr('Cost')}</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {r.materials.map((m) => (
                      <tr key={m.productId}><td className={th}>{m.name}</td><td className={cn(th, 'text-end tabular-nums')}>{qty(m.quantity)} {m.unit}</td><td className={cn(th, 'text-end tabular-nums')}>{m.totalCost != null ? money(m.totalCost) : '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {!costHidden && trend && (
            <section className={cn(card, 'p-4 sm:p-5')}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[0.9375rem] font-semibold text-slate-900">{tr('Cost fi unit — waqt ke saath')}</h2>
                {(r.costTrend?.length ?? 0) > 1 && (
                  <select aria-label={tr('Product')} value={trend.productId} onChange={(e) => setPick(e.target.value)}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[0.8125rem] text-slate-900 outline-none focus:border-brand-500">
                    {r.costTrend!.map((c) => <option key={c.productId} value={c.productId}>{c.name}</option>)}
                  </select>
                )}
              </div>
              {trend.points.length < 2 ? <p className="mt-3 text-[0.8125rem] text-slate-500">{tr('Ek se zyada din ki production ho to yahan Cost ka badlav dikhega. Abhi: {{value}}', { value: money(trend.points[0]?.unitCost ?? 0) })}</p> : (
                <div className="mt-3 h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend.points} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid stroke={theme.grid} vertical={false} />
                      <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                      <YAxis tick={theme.axis} axisLine={false} tickLine={false} width={48} tickFormatter={axisMoney} />
                      <Tooltip formatter={(v) => [formatPKR(Number(v)), tr('Cost / unit')]} contentStyle={theme.tooltip.contentStyle} labelStyle={theme.tooltip.labelStyle} />
                      <Line type="monotone" dataKey="unitCost" stroke={theme.primary} strokeWidth={2.25} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          )}

          <section className={card}>
            <div className="px-4 pt-4 sm:px-5">
              <h2 className="text-[0.9375rem] font-semibold text-slate-900">{tr('Bana hua maal kaise bika')}</h2>
              <p className="text-[0.75rem] text-slate-500">{tr('Profit har bill par usi Cost se jo banate waqt bani thi')}</p>
            </div>
            {!r.sales.length ? <p className="px-5 py-6 text-[0.8125rem] text-slate-500">{tr('Is period me bana hua maal nahi bika.')}</p> : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[36rem] text-[0.8125rem]">
                  <thead className={head}><tr><th className={th}>{tr('Product')}</th><th className={cn(th, 'text-end')}>{tr('Bika')}</th><th className={cn(th, 'text-end')}>{tr('Sale')}</th><th className={cn(th, 'text-end')}>{tr('Cost')}</th><th className={cn(th, 'text-end')}>{tr('Profit')}</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {r.sales.map((s) => (
                      <tr key={s.productId}>
                        <td className={th}>{s.name}</td>
                        <td className={cn(th, 'text-end tabular-nums')}>{qty(s.quantity)}</td>
                        <td className={cn(th, 'text-end tabular-nums')}>{sales(s.revenue)}</td>
                        <td className={cn(th, 'text-end tabular-nums')}>{s.cost != null ? money(s.cost) : '—'}</td>
                        <td className={cn(th, 'text-end tabular-nums', (s.profit ?? 0) < 0 && 'text-rose-600')}>{s.profit != null ? `${money(s.profit)}${s.margin != null ? ` · ${s.margin.toFixed(1)}%` : ''}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </PageShell>
  );
}
