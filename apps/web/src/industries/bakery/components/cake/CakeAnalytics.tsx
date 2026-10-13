/**
 * Cake order analytics for a period of due dates: orders and money by day,
 * the hour customers collect, occasions, flavours, sizes, delivery kinds
 * and the state of every order.
 */

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Ban, CalendarDays, Clock, Cake, Layers, PartyPopper, Ruler, Star, Truck, Wallet } from 'lucide-react';
import { Card } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { axisMoney, hourTick, hourLabel } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { cakeOrdersApi } from '../../api/cake-orders.api';
import { AnalyticsSkeleton, CardTitle, LoadFailed, RankedBars, StatTile } from '../charts';
import { CAKE_KEY, deliveryOf, flavorLabel, keyLabel, occasionOf, sizeLabel, statusOf } from '../meta';

export function CakeAnalytics({ range, onOccasion }: { range: { from: string; to: string } | null; onOccasion: (key: string) => void }) {
  const theme = useChartTheme();
  const { sales } = useMasked();
  const q = useQuery({ queryKey: [CAKE_KEY, 'summary', range], queryFn: () => cakeOrdersApi.summary(range ?? undefined), placeholderData: (p) => p });
  const d = q.data;
  if (q.isError && !d) return <LoadFailed what="Analytics" retry={() => q.refetch()} />;
  if (!d) return <AnalyticsSkeleton />;

  const t = d.totals;
  const days = d.byDay.map((b) => ({ ...b, label: keyLabel(b.key) }));
  const hours = d.byHour.filter((h) => h.count > 0 || (h.hour >= 8 && h.hour <= 23));
  const states = d.byStatus.map((b) => ({ ...b, label: statusOf(b.key).label, color: statusOf(b.key).color }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Cake} label="Orders" value={t.orders} sub={`${t.delivered} de diye · ${sales(t.deliveredValue)}`} tone="brand" />
        <StatTile icon={Wallet} label="Kul rakam" value={sales(t.value)} sub={`Advance / mila ${sales(t.collected)}`} tone="green" />
        <StatTile icon={Layers} label="Ausat order" value={sales(t.avgOrder)} sub="Ek order ki ausat rakam" tone="violet" />
        <StatTile icon={t.avgRating ? Star : Ban} label={t.avgRating ? 'Customer ki raye' : 'Cancel'} value={t.avgRating ? `${t.avgRating} / 5` : t.cancelled}
          sub={t.avgRating ? `${t.rated} orders par · ${t.cancelled} cancel` : 'Is muddat me cancel hue'} tone={t.avgRating ? 'amber' : 'rose'} />
      </div>

      <Card className="rounded-2xl" title={<CardTitle icon={CalendarDays}>{d.period.grouping === 'month' ? 'Har mahine ke orders' : 'Har din ke orders'}</CardTitle>} description="Jis din cake dena tha, us din ke hisaab se">
        {!days.length ? <p className="py-10 text-center text-sm text-slate-500">Is muddat me koi order nahi</p> : (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                <YAxis yAxisId="v" tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <YAxis yAxisId="c" orientation="right" tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                <Tooltip formatter={(v, n) => (n === 'value' ? [formatPKR(Number(v)), 'Rakam'] : [v, 'Orders'])} {...theme.tooltip} />
                <Bar yAxisId="v" dataKey="value" fill={theme.primary} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar yAxisId="c" dataKey="count" fill={theme.highlight} radius={[4, 4, 0, 0]} maxBarSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<CardTitle icon={Clock}>Kis waqt dena hota hai</CardTitle>} description="Is se pata chalta hai kab staff aur oven tayyar hon">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hours} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="hour" tickFormatter={hourTick} tick={theme.axis} axisLine={false} tickLine={false} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
                <Tooltip labelFormatter={(h) => hourLabel(Number(h))} formatter={(v) => [v, 'Orders']} {...theme.tooltip} />
                <Bar dataKey="count" fill={theme.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="rounded-2xl" title={<CardTitle icon={Layers}>Orders ki halat</CardTitle>} description="Is muddat ke har order ka haal">
          {!states.length ? <p className="py-10 text-center text-sm text-slate-500">Is muddat me koi order nahi</p> : (
            <div className="grid items-center gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <div className="mx-auto h-40 w-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={states} dataKey="count" nameKey="label" innerRadius="60%" outerRadius="100%" paddingAngle={1} stroke="none">
                      {states.map((s) => <Cell key={s.key} fill={s.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} {...theme.tooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 text-[0.8125rem]">
                {states.map((s) => (
                  <li key={s.key} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                    <span className="min-w-0 flex-1 truncate text-slate-700">{s.label}</span>
                    <span className="tabular-nums text-slate-900">{s.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<CardTitle icon={PartyPopper}>Mauqa</CardTitle>} description="Kis mauqe ke cake zyada — click karein to sirf woh orders">
          <RankedBars onPick={onOccasion} rows={d.byOccasion.map((b) => ({ key: b.key, label: `${occasionOf(b.key).emoji} ${occasionOf(b.key).label}`, value: b.count, display: `${b.count} · ${sales(b.value)}` }))} />
        </Card>
        <Card className="rounded-2xl" title={<CardTitle icon={Cake}>Flavour</CardTitle>} description="Kaunsa flavour sab se zyada bikta hai">
          <RankedBars rows={d.byFlavor.map((b) => ({ key: b.key, label: flavorLabel(b.key), value: b.count, display: `${b.count} · ${sales(b.value)}`, color: '#ec4899' }))} />
        </Card>
        <Card className="rounded-2xl" title={<CardTitle icon={Ruler}>Size</CardTitle>} description="Kitne pound / kilo ke cake">
          <RankedBars rows={d.bySize.map((b) => ({ key: b.key, label: sizeLabel(b.key), value: b.count, display: `${b.count} · ${sales(b.value)}`, color: '#8b5cf6' }))} />
        </Card>
        <Card className="rounded-2xl" title={<CardTitle icon={Truck}>Kaise diya</CardTitle>} description="Dukaan se ya pahunchana">
          <RankedBars rows={d.byDelivery.map((b) => ({ key: b.key, label: deliveryOf(b.key).label, value: b.count, display: `${b.count} · ${sales(b.value)}`, color: '#0ea5e9' }))} />
        </Card>
      </div>
    </div>
  );
}
