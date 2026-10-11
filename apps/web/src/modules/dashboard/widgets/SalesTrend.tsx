/** Daily sales, profit or bills over 7, 30 or 90 days, as area or bars. */

import { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { useInsights } from '../data/queries';
import { MiniSelect, useWidgetState } from '../engine/controls';
import { useChartTheme } from '../engine/useChartTheme';
import { useMasked } from '../engine/useMasked';
import { axisMoney, ChartLegend, EmptyHint, WidgetCard } from '../engine/parts';
import { WidgetToolbar } from './WidgetToolbar';

const DAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];
type Metric = 'sales' | 'profit' | 'bills';
const METRIC_LABEL: Record<Metric, string> = { sales: 'Bikri', profit: 'Munafa', bills: 'Bill' };

export function SalesTrend() {
  const [s, set] = useWidgetState('sales-trend', { days: '7', metric: 'sales', chart: 'area', compare: 'yes' });
  const { costHidden, salesHidden, sales, cost } = useMasked();
  const metric = (costHidden && s.metric === 'profit' ? 'sales' : s.metric) as Metric;
  const days = Number(s.days) as 7 | 30 | 90;
  const { data, isLoading } = useInsights(days);
  const theme = useChartTheme();

  const points = useMemo(() => (data?.trend ?? []).map((p) => {
    const d = new Date(`${p.date}T12:00:00`);
    return { ...p, label: days === 7 ? DAYS[d.getDay()].slice(0, 3) : `${d.getDate()}/${d.getMonth() + 1}` };
  }), [data, days]);

  const total = points.reduce((x, p) => x + Number(p[metric] || 0), 0);
  const avg = points.length ? total / points.length : 0;
  const best = points.reduce<(typeof points)[number] | null>((b, p) => (!b || p[metric] > b[metric] ? p : b), null);
  const fmt = (n: number) => (metric === 'bills' ? String(Math.round(n)) : metric === 'profit' ? cost(n) : sales(n));
  const color = metric === 'profit' ? theme.profit : theme.primary;
  const showProfitLine = metric === 'sales' && s.compare === 'yes' && !costHidden;
  const hidden = salesHidden && metric !== 'bills';

  const metricOptions = [{ value: 'sales', label: 'Bikri' }, ...(costHidden ? [] : [{ value: 'profit', label: 'Munafa' }]), { value: 'bills', label: 'Bill' }];

  return (
    <WidgetCard title="Bikri ka rujhan" icon={TrendingUp}
      description={hidden ? `Pichhle ${days} din` : `${days} din me ${fmt(total)} · rozana ausat ${fmt(avg)}${best && best[metric] > 0 ? ` · sab se acha ${best.label}` : ''}`}>
      <WidgetToolbar inset={false}
        print={() => ({
          title: 'Bikri ka rujhan', subtitle: `Pichhle ${days} din · ${METRIC_LABEL[metric]}`,
          sections: [{
            kind: 'table',
            columns: [{ label: 'Tareekh' }, { label: 'Bill', align: 'right' }, { label: 'Bikri', align: 'right' }, ...(costHidden ? [] : [{ label: 'Munafa', align: 'right' as const }])],
            rows: (data?.trend ?? []).map((p) => [p.date, String(p.bills), sales(p.sales), ...(costHidden ? [] : [cost(p.profit)])]),
            footer: ['Kul', String((data?.trend ?? []).reduce((x, p) => x + p.bills, 0)), sales((data?.trend ?? []).reduce((x, p) => x + p.sales, 0)),
              ...(costHidden ? [] : [cost((data?.trend ?? []).reduce((x, p) => x + p.profit, 0))])],
          }],
        })}>
        <MiniSelect label="Muddat" value={s.days} onChange={(v) => set({ days: v })}
          options={[{ value: '7', label: '7 din' }, { value: '30', label: '30 din' }, { value: '90', label: '90 din' }]} />
        <MiniSelect label="Kya dikhayein" value={metric} onChange={(v) => set({ metric: v })} options={metricOptions} />
        <MiniSelect label="Chart" value={s.chart} onChange={(v) => set({ chart: v })} options={[{ value: 'area', label: 'Line chart' }, { value: 'bar', label: 'Bar chart' }]} />
        {metric === 'sales' && !costHidden && (
          <MiniSelect label="Munafa line" value={s.compare} onChange={(v) => set({ compare: v })} options={[{ value: 'yes', label: 'Munafa bhi' }, { value: 'no', label: 'Sirf bikri' }]} />
        )}
      </WidgetToolbar>
      {isLoading ? <Skeleton className="h-[260px] w-full" /> : hidden ? (
        <EmptyHint icon={BarChart3} text="Bikri chhupi hui hai" />
      ) : points.every((p) => !p[metric]) ? (
        <EmptyHint icon={BarChart3} text="Is muddat me koi bikri nahi" />
      ) : (
        <>
          <div className="h-[240px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              {s.chart === 'bar' ? (
                <BarChart data={points} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={8} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={metric === 'bills' ? undefined : axisMoney} width={44} />
                  <Tooltip formatter={(v, n) => [metric === 'bills' ? v : formatPKR(Number(v)), n]} contentStyle={theme.tooltip.contentStyle} labelStyle={theme.tooltip.labelStyle} cursor={theme.tooltip.cursor} />
                  <Bar dataKey={metric} name={METRIC_LABEL[metric]} fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  {showProfitLine && <Bar dataKey="profit" name="Munafa" fill={theme.profit} radius={[4, 4, 0, 0]} maxBarSize={28} />}
                </BarChart>
              ) : (
                <AreaChart data={points} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dash-trend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={8} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={metric === 'bills' ? undefined : axisMoney} width={44} />
                  <Tooltip formatter={(v, n) => [metric === 'bills' ? v : formatPKR(Number(v)), n]} contentStyle={theme.tooltip.contentStyle} labelStyle={theme.tooltip.labelStyle} />
                  <Area type="monotone" dataKey={metric} name={METRIC_LABEL[metric]} stroke={color} strokeWidth={2.25} fill="url(#dash-trend)" />
                  {showProfitLine && <Area type="monotone" dataKey="profit" name="Munafa" stroke={theme.profit} strokeWidth={1.75} fill="transparent" />}
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
          <ChartLegend items={showProfitLine
            ? [{ color: theme.primary, label: 'Bikri' }, { color: theme.profit, label: 'Munafa' }]
            : [{ color, label: METRIC_LABEL[metric] }]} />
        </>
      )}
    </WidgetCard>
  );
}
