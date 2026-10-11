/**
 * Which hours are busiest: today, or the daily average over a week (one
 * day's rush can be chance; the weekly shape shows the real habit).
 * Hours come from the server in the shop's timezone.
 */

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Clock } from 'lucide-react';
import { Segmented } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { useHourlySales } from '../data/queries';
import { useChartTheme } from '../engine/useChartTheme';
import { useMasked } from '../engine/useMasked';
import { axisMoney, EmptyHint, hourLabel, hourTick, WidgetCard } from '../engine/parts';

export function PeakHours({ openFrom = 8, hint }: { openFrom?: number; hint?: string }) {
  const [days, setDays] = useState<'1' | '7'>('1');
  const { data } = useHourlySales(days === '1' ? 1 : 7);
  const theme = useChartTheme();
  const { salesHidden } = useMasked();
  const peak = data?.peakHour ?? null;

  const rows = useMemo(() => (data?.hours ?? [])
    // Closed hours waste chart space: keep hours with sales plus normal trading hours.
    .filter((h) => h.total > 0 || (h.hour >= openFrom && h.hour <= 22))
    .map((h) => ({
      ...h,
      label: hourTick(h.hour),
      full: hourLabel(h.hour),
      isPeak: h.hour === peak && h.total > 0,
      isNow: days === '1' && h.hour === data?.currentHour,
    })), [data, peak, days, openFrom]);

  return (
    <WidgetCard
      title="Rush ka waqt"
      description={peak != null ? `Sab se masroof ${hourLabel(peak)}` : hint}
      actions={<Segmented label="Din" value={days} onChange={setDays} items={[{ value: '1', label: 'Aaj' }, { value: '7', label: 'Hafta' }]} />}
    >
      {salesHidden ? (
        <EmptyHint icon={Clock} text="Bikri chhupi hui hai" />
      ) : rows.length === 0 ? (
        <EmptyHint icon={Clock} text="Abhi ghanton ka hisab nahi" />
      ) : (
        <>
          <div className="h-[240px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip
                  formatter={(v) => formatPKR(Number(v))}
                  labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ''}
                  contentStyle={theme.tooltip.contentStyle}
                  labelStyle={theme.tooltip.labelStyle}
                  cursor={theme.tooltip.cursor}
                />
                <Bar dataKey="total" name="Bikri" radius={[4, 4, 0, 0]}>
                  {rows.map((h) => (
                    <Cell key={h.hour} fill={h.isPeak ? theme.primary : h.isNow ? theme.highlight : theme.primarySoft} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-[0.75rem] text-slate-500">
            {days === '1' ? 'Aaj ka hisab' : 'Hafte ka rozana ausat'} · gehra rang = sab se masroof ghanta
            {days === '1' && ' · peela = abhi'}
          </p>
        </>
      )}
    </WidgetCard>
  );
}
