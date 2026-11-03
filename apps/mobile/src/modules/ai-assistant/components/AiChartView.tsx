/** A chart attached to an answer (bar or line, one or more series) plus its small table. */

import { View } from 'react-native';
import { BarChart, Card, LineChart, Text, useChartColors, useTheme } from '@/design';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import type { AiChart } from '../api/ai';

export function formatAiValue(v: unknown, unit: AiChart['unit']): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v ?? '');
  if (unit === 'money') return formatMoney(n);
  if (unit === 'percent') return `${Number(n.toFixed(1))}%`;
  return Number(n.toFixed(2)).toLocaleString('en-US');
}

export function AiChartView({ chart }: { chart: AiChart }) {
  const th = useTheme();
  const cc = useChartColors();
  const labels = chart.data.map((d) => String(d.label ?? ''));
  const fmt = (v: number) => (chart.unit === 'money' ? formatMoney(v) : formatAiValue(v, chart.unit));
  const series = chart.series.map((s, i) => ({ key: s.key, label: s.label, color: cc.pick(i), values: chart.data.map((d) => Number(d[s.key]) || 0), data: chart.data.map((d) => Number(d[s.key]) || 0) }));

  return (
    <Card title={chart.title} accessibilityLabel={t('{{title}} chart', { title: chart.title })}>
      {chart.data.length > 0 && (
        chart.type === 'line'
          ? <LineChart labels={labels} series={series.map(({ key, label, color, data }) => ({ key, label, color, data }))} format={fmt} />
          : <BarChart labels={labels} series={series.map(({ key, label, color, values }) => ({ key, label, color, values }))} format={fmt} />
      )}
      {chart.series.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(3), marginTop: th.space(2) }}>
          {chart.series.map((s, i) => (
            <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cc.pick(i) }} />
              <Text size="xs" tone="muted">{s.label}</Text>
            </View>
          ))}
        </View>
      )}
      {chart.table && chart.table.rows.length > 0 && (
        <View style={{ marginTop: th.space(3), gap: th.space(1) }}>
          <Row cells={chart.table.columns} head />
          {chart.table.rows.map((r, i) => <Row key={i} cells={r.map(String)} />)}
        </View>
      )}
    </Card>
  );
}

function Row({ cells, head }: { cells: string[]; head?: boolean }) {
  const th = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: th.space(2), paddingVertical: 2, borderBottomWidth: head ? 1 : 0, borderBottomColor: th.colors.divider }}>
      {cells.map((c, i) => (
        <Text key={i} size="xs" weight={head ? 'semibold' : 'regular'} tone={head ? 'muted' : 'default'} align={i > 0 ? 'end' : 'start'} style={{ flex: i === 0 ? 1.4 : 1 }}>{c}</Text>
      ))}
    </View>
  );
}
