/**
 * Which hours are busiest: today, or the daily average over a week or a
 * month (one day's rush can be chance; the longer shape shows the habit).
 * Hours come from the server in the shop's timezone.
 */

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Clock } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { useHourlySales } from '../data/queries';
import { MiniSelect, useWidgetState } from '../engine/controls';
import { useChartTheme } from '../engine/useChartTheme';
import { useMasked } from '../engine/useMasked';
import { axisMoney, EmptyHint, hourLabel, hourTick, WidgetCard } from '../engine/parts';
import { WidgetToolbar } from './WidgetToolbar';
import { t } from '@core/i18n';

const SPANS = [{ value: '1', label: t('Aaj') }, { value: '7', label: t('Hafte ka ausat') }, { value: '30', label: t('Mahine ka ausat') }];

export function PeakHours({ openFrom = 8, hint }: { openFrom?: number; hint?: string }) {
  const [s, set] = useWidgetState('peak-hours', { days: '1', metric: 'total', range: 'open' });
  const days = Number(s.days);
  const { data, isLoading } = useHourlySales(days);
  const theme = useChartTheme();
  const { sales, salesHidden } = useMasked();
  const metric = s.metric as 'total' | 'count';
  const peak = data?.peakHour ?? null;

  const rows = useMemo(() => (data?.hours ?? [])
    // Closed hours waste chart space: by default keep hours with sales plus normal trading hours.
    .filter((h) => s.range === 'all' || h.total > 0 || (h.hour >= openFrom && h.hour <= 22))
    .map((h) => ({
      ...h,
      count: Number(h.count ?? 0),
      label: hourTick(h.hour),
      full: hourLabel(h.hour),
      isPeak: h.hour === peak && h.total > 0,
      isNow: days === 1 && h.hour === data?.currentHour,
    })), [data, peak, days, openFrom, s.range]);

  const hidden = salesHidden && metric === 'total';
  const fmt = (n: number) => (metric === 'count' ? (days === 1 ? String(n) : n.toFixed(1)) : sales(n));

  return (
    <WidgetCard title={t('Rush ka waqt')} icon={Clock} description={peak != null ? t('Sab se masroof {{peak}}', { peak: hourLabel(peak) }) : hint}>
      <WidgetToolbar inset={false}
        print={() => ({
          title: t('Rush ka waqt'), subtitle: SPANS.find((x) => x.value === s.days)?.label,
          sections: [{
            kind: 'table',
            columns: [{ label: t('Ghanta') }, { label: t('Bill'), align: 'right' }, { label: t('Sale'), align: 'right' }],
            rows: rows.filter((r) => r.total > 0).map((r) => [r.full, days === 1 ? String(r.count) : r.count.toFixed(1), sales(r.total)]),
          }],
        })}>
        <MiniSelect label={t('Period')} value={s.days} onChange={(v) => set({ days: v })} options={SPANS} />
        <MiniSelect label={t('Kya dikhayein')} value={s.metric} onChange={(v) => set({ metric: v })} options={[{ value: 'total', label: t('Amount') }, { value: 'count', label: t('Bill ginti') }]} />
        <MiniSelect label={t('Ghante')} value={s.range} onChange={(v) => set({ range: v })} options={[{ value: 'open', label: t('Dukaan ke ghante') }, { value: 'all', label: t('Poore 24 ghante') }]} />
      </WidgetToolbar>
      {isLoading ? <Skeleton className="h-[260px] w-full" /> : hidden ? (
        <EmptyHint icon={Clock} text={t('Sale chhupi hui hai')} />
      ) : rows.length === 0 || rows.every((r) => !r.total) ? (
        <EmptyHint icon={Clock} text={t('Abhi ghanton ka hisab nahi')} />
      ) : (
        <>
          <div className="h-[240px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={metric === 'total' ? axisMoney : undefined} width={44} />
                <Tooltip
                  formatter={(v) => [metric === 'total' ? formatPKR(Number(v)) : fmt(Number(v)), metric === 'total' ? t('Sale') : t('Bill')]}
                  labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ''}
                  contentStyle={theme.tooltip.contentStyle} labelStyle={theme.tooltip.labelStyle} cursor={theme.tooltip.cursor}
                />
                <Bar dataKey={metric} radius={[4, 4, 0, 0]}>
                  {rows.map((h) => <Cell key={h.hour} fill={h.isPeak ? theme.primary : h.isNow ? theme.highlight : theme.primarySoft} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-[0.75rem] text-slate-500">
            {t('Gehra rang = sab se masroof ghanta{{value}}', { value: days === 1 ? t(' · peela = abhi') : '' })}
          </p>
        </>
      )}
    </WidgetCard>
  );
}
