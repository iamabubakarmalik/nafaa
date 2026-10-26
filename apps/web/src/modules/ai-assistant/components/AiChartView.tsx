/**
 * Draws a chart the assistant attached to an answer (bar or line, one or
 * more series) with recharts, in the dashboard's chart theme, plus the
 * optional small table under it.
 */

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatPKR } from '@core/lib/format';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { Table, TBody, THead, Td, Th, Tr } from '@/design-system/components';
import type { AiChart } from '../api';

/** Compact table styling for the narrow chat column. */
export const COMPACT_HEAD = 'border-slate-200 bg-transparent text-[0.75rem] font-medium normal-case tracking-normal';
export const COMPACT_CELL = 'px-0 py-1 pr-2 text-[0.75rem] last:pr-0';

const EXTRA = ['#2563eb', '#ea580c', '#7c3aed', '#0891b2', '#e11d48'];

export function formatAiValue(v: unknown, unit: AiChart['unit']): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v ?? '');
  if (unit === 'money') return formatPKR(n, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (unit === 'percent') return `${Number(n.toFixed(1))}%`;
  return Number(n.toFixed(2)).toLocaleString('en-PK');
}

export function AiChartView({ chart }: { chart: AiChart }) {
  const theme = useChartTheme();
  const colors = [theme.primary, theme.profit, theme.highlight, ...EXTRA];
  const tick = (v: number) => (chart.unit === 'money' ? axisMoney(v) : chart.unit === 'percent' ? `${v}%` : String(v));
  const fmt = (v: unknown) => formatAiValue(v, chart.unit);
  const many = chart.data.length > 8;

  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-3">
      <figcaption className="mb-2 text-[0.8125rem] font-semibold text-slate-800">{chart.title}</figcaption>
      {chart.data.length > 0 && (
        <div className="h-44 w-full" role="img" aria-label={`${chart.title} chart`}>
          <ResponsiveContainer width="100%" height="100%">
            {chart.type === 'line' ? (
              <LineChart data={chart.data} margin={{ top: 4, right: 6, left: -14, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={10} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={tick} width={44} />
                <Tooltip formatter={(v, n) => [fmt(v), n]} contentStyle={theme.tooltip.contentStyle} labelStyle={theme.tooltip.labelStyle} />
                {chart.series.map((s, i) => (
                  <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={colors[i % colors.length]} strokeWidth={2.25} dot={!many} />
                ))}
              </LineChart>
            ) : (
              <BarChart data={chart.data} margin={{ top: 4, right: 6, left: -14, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={6} interval={many ? 'preserveStartEnd' : 0} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={tick} width={44} />
                <Tooltip formatter={(v, n) => [fmt(v), n]} contentStyle={theme.tooltip.contentStyle} labelStyle={theme.tooltip.labelStyle} cursor={theme.tooltip.cursor} />
                {chart.series.map((s, i) => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} maxBarSize={26} />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
      {chart.series.length > 1 && (
        <div className="mt-1 flex flex-wrap gap-3 text-[0.75rem] text-slate-500">
          {chart.series.map((s, i) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />{s.label}
            </span>
          ))}
        </div>
      )}
      {chart.table && chart.table.rows.length > 0 && (
        <Table className="mt-2">
          <THead className={COMPACT_HEAD}>
            <Tr>
              {chart.table.columns.map((c, i) => <Th key={i} align={i > 0 ? 'right' : 'left'} className={COMPACT_CELL}>{c}</Th>)}
            </Tr>
          </THead>
          <TBody>
            {chart.table.rows.map((r, i) => (
              <Tr key={i}>
                {r.map((cell, j) => <Td key={j} align={j > 0 ? 'right' : 'left'} className={COMPACT_CELL}>{String(cell)}</Td>)}
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </figure>
  );
}
