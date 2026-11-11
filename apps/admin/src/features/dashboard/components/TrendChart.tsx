/**
 * Per-day trend on the platform dashboard, with a switch between sales
 * value, bills, new shops and payments collected. Colors are read from the
 * theme variables so the chart follows the accent and dark mode.
 */

import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, Segmented } from '@/design-system/components';
import { useAppearanceStore } from '@/design-system';
import { formatPKR, formatPKRFull } from '@/lib/format';
import type { DashboardSummary } from '@/api/admin-dashboard.api';

type Metric = 'gmv' | 'bills' | 'signups' | 'revenue';

const METRICS: Array<{ value: Metric; label: string; money: boolean; bar: boolean; note: string }> = [
  { value: 'gmv', label: 'Sales value', money: true, bar: false, note: 'What all shops sold through Nafaa each day.' },
  { value: 'bills', label: 'Bills', money: false, bar: false, note: 'Completed bills across all shops each day.' },
  { value: 'signups', label: 'New shops', money: false, bar: true, note: 'Shops that signed up each day.' },
  { value: 'revenue', label: 'Payments', money: true, bar: true, note: 'Plan payments approved each day (Nafaa income).' },
];

/** Reads an "r g b" CSS variable from <html> as an rgb() color. */
function cssColor(name: string, fallback: string) {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `rgb(${v.split(/[\s,]+/).join(' ')})` : fallback;
}

/** Short axis label: 1.2Cr, 90L, 30K. */
function axisValue(v: number) {
  if (v >= 1e7) return `${+(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `${+(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `${+(v / 1e3).toFixed(1)}K`;
  return String(v);
}

const shortDate = (key: string) => new Date(`${key}T00:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

export function TrendChart({ data }: { data: DashboardSummary['daily'] }) {
  const [metric, setMetric] = useState<Metric>('gmv');
  const m = METRICS.find((x) => x.value === metric)!;
  // Re-read theme colors when the appearance changes.
  const theme = useAppearanceStore((s) => `${s.resolved.accentHex}|${s.resolved.mode}|${s.systemPrefersDark}`);
  const colors = useMemo(() => ({
    line: cssColor('--brand-500', '#6366f1'),
    grid: cssColor('--bd-slate-200', '#e2e8f0'),
    text: cssColor('--tx-slate-500', '#64748b'),
  }), [theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = data.reduce((n, d) => n + d[metric], 0);
  const fmt = (v: number) => (m.money ? formatPKR(v) : v.toLocaleString('en-PK'));
  const axis = { stroke: colors.text, fontSize: 11, tickLine: false, axisLine: false } as const;
  const tooltip = (
    <Tooltip
      cursor={{ fill: 'rgba(100,116,139,0.08)' }}
      contentStyle={{ borderRadius: 12, border: `1px solid ${colors.grid}`, fontSize: 12 }}
      labelFormatter={(l) => shortDate(String(l))}
      formatter={(v) => [m.money ? formatPKRFull(Number(v)) : Number(v).toLocaleString('en-PK'), m.label]}
    />
  );

  return (
    <Card
      title={`${m.label}: ${fmt(total)}`}
      description={m.note}
      actions={<Segmented value={metric} onChange={setMetric} items={METRICS} label="Chart" />}
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {m.bar ? (
            <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...axis} />
              <YAxis tickFormatter={axisValue} width={52} allowDecimals={false} {...axis} />
              {tooltip}
              <Bar dataKey={metric} fill={colors.line} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="dash-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.line} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={colors.line} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...axis} />
              <YAxis tickFormatter={axisValue} width={52} allowDecimals={false} {...axis} />
              {tooltip}
              <Area type="monotone" dataKey={metric} stroke={colors.line} strokeWidth={2} fill="url(#dash-fill)" />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
