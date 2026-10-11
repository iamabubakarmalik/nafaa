/** Sales (and profit, when visible) over the last 7 or 30 days. */

import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { Segmented } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { useOverview } from '../data/queries';
import { useChartTheme } from '../engine/useChartTheme';
import { useMasked } from '../engine/useMasked';
import { axisMoney, ChartLegend, EmptyHint, WidgetCard } from '../engine/parts';

const DAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];

export function SalesTrend() {
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const { data } = useOverview();
  const theme = useChartTheme();
  const { costHidden, salesHidden } = useMasked();

  const points = useMemo(() => {
    const src = range === '7d' ? data?.salesTrend7Days : data?.salesTrend30Days;
    return (src ?? []).map((p) => {
      const d = new Date(p.date);
      return { ...p, label: range === '7d' ? DAYS[d.getDay()].slice(0, 3) : `${d.getDate()}/${d.getMonth() + 1}` };
    });
  }, [data, range]);

  const total = points.reduce((x, p) => x + Number(p.sales || 0), 0);
  const showProfit = !costHidden;

  return (
    <WidgetCard
      title="Bikri ka rujhan"
      description={salesHidden ? (range === '7d' ? 'Pichhle 7 din' : 'Pichhle 30 din') : `${range === '7d' ? '7 din' : '30 din'} me ${formatPKR(total)}`}
      actions={
        <Segmented label="Muddat" value={range} onChange={setRange} items={[{ value: '7d', label: '7 din' }, { value: '30d', label: '30 din' }]} />
      }
    >
      {salesHidden ? (
        <EmptyHint icon={BarChart3} text="Bikri chhupi hui hai" />
      ) : points.length === 0 ? (
        <EmptyHint icon={BarChart3} text="Abhi koi bikri nahi" />
      ) : (
        <>
          <div className="h-[240px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="dash-sales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.primary} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={theme.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={8} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip formatter={(v) => formatPKR(Number(v))} contentStyle={theme.tooltip.contentStyle} labelStyle={theme.tooltip.labelStyle} />
                <Area type="monotone" dataKey="sales" name="Bikri" stroke={theme.primary} strokeWidth={2.25} fill="url(#dash-sales)" />
                {showProfit && <Area type="monotone" dataKey="profit" name="Munafa" stroke={theme.profit} strokeWidth={1.75} fill="transparent" />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend items={showProfit
            ? [{ color: theme.primary, label: 'Bikri' }, { color: theme.profit, label: 'Munafa' }]
            : [{ color: theme.primary, label: 'Bikri' }]}
          />
        </>
      )}
    </WidgetCard>
  );
}
