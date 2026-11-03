/** Small building blocks every report screen shares: KPI grid, change pill, chart card, data table, last-updated note. */

import { ArrowDownRight, ArrowUpRight, CloudOff, Minus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { useCachedNotice } from '@/core/offline';
import { Card, Icon, PressableScale, Row, StatTile, Text, useTheme, type StatusTone } from '@/design';

export interface Kpi { key?: string; label: string; value: ReactNode; hint?: ReactNode; tone?: StatusTone; icon?: Parameters<typeof StatTile>[0]['icon']; onPress?: () => void }

/** KPI tiles two per row. */
export function KpiGrid({ items, loading }: { items: Kpi[]; loading?: boolean }) {
  const th = useTheme();
  const rows: Kpi[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View style={{ gap: th.space(3) }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: th.space(3) }}>
          {r.map((k, j) => <StatTile key={k.key ?? `${i}${j}`} label={k.label} value={k.value} hint={k.hint} tone={k.tone} icon={k.icon} onPress={k.onPress} loading={loading} style={{ minWidth: 0 }} />)}
          {r.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}

/** Change against the previous period, e.g. +12.5%. `upIsGood=false` colors a rise red (expenses). */
export function Delta({ value, upIsGood = true }: { value: number | null | undefined; upIsGood?: boolean }) {
  const th = useTheme();
  if (value == null) return null;
  const flat = Math.abs(value) < 0.05;
  const good = flat ? null : value > 0 === upIsGood;
  const tone = good == null ? th.colors.textMuted : good ? th.colors.success.text : th.colors.danger.text;
  const bg = good == null ? th.colors.surfaceSunken : good ? th.colors.success.soft : th.colors.danger.soft;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99, backgroundColor: bg }}>
      <Icon icon={flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight} size={12} color={tone} />
      <Text size="2xs" weight="bold" ltr style={{ color: tone }}>{`${Math.abs(value).toFixed(1)}%`}</Text>
    </View>
  );
}

export function ChartCard({ title, subtitle, action, children, flush }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <Card title={title} description={subtitle} action={action} flush={flush}>
      {children}
    </Card>
  );
}

export interface Column<R> {
  key: string;
  label: string;
  /** Column width in points (default 96). The first column is wider. */
  width?: number;
  align?: 'start' | 'end';
  render?: (row: R) => ReactNode;
  value?: (row: R) => string | number | null | undefined;
}

/** Scrolls sideways; the first column holds the name. Rows can open a detail. */
export function DataTable<R>({ columns, rows, keyOf, onRowPress, footer }: { columns: Array<Column<R>>; rows: R[]; keyOf: (r: R, i: number) => string; onRowPress?: (r: R) => void; footer?: Array<ReactNode> }) {
  const th = useTheme();
  const w = (c: Column<R>, i: number) => c.width ?? (i === 0 ? 150 : 96);
  const cell = (c: Column<R>, i: number, content: ReactNode, head?: boolean) => (
    <View key={c.key} style={{ width: w(c, i), paddingHorizontal: th.space(2), justifyContent: 'center', alignItems: c.align === 'end' || (c.align == null && i > 0) ? 'flex-end' : 'flex-start' }}>
      {typeof content === 'string' || typeof content === 'number'
        ? <Text size={head ? '2xs' : 'sm'} weight={head ? 'semibold' : 'regular'} tone={head ? 'muted' : 'default'} numberOfLines={head ? 1 : 2} ltr={i > 0 && !head} tabular={i > 0}>{String(content)}</Text>
        : content}
    </View>
  );
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
      <View>
        <View style={{ flexDirection: 'row', paddingVertical: th.space(2), borderBottomWidth: 1, borderBottomColor: th.colors.border }}>
          {columns.map((c, i) => cell(c, i, c.label, true))}
        </View>
        {rows.map((r, ri) => {
          const body = (
            <View style={{ flexDirection: 'row', paddingVertical: th.space(2.5), borderBottomWidth: ri < rows.length - 1 ? 0.5 : 0, borderBottomColor: th.colors.divider }}>
              {columns.map((c, i) => cell(c, i, c.render ? c.render(r) : (c.value?.(r) ?? '—')))}
            </View>
          );
          return onRowPress
            ? <PressableScale key={keyOf(r, ri)} onPress={() => onRowPress(r)} haptic="tap">{body}</PressableScale>
            : <View key={keyOf(r, ri)}>{body}</View>;
        })}
        {footer && (
          <View style={{ flexDirection: 'row', paddingVertical: th.space(2.5), borderTopWidth: 1, borderTopColor: th.colors.border }}>
            {columns.map((c, i) => cell(c, i, footer[i] ?? ''))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/** "Last updated 5m ago" when the data on screen comes from the phone's saved copy. */
export function CachedNote({ query }: { query: { dataUpdatedAt: number; isFetching?: boolean; fetchStatus?: string } }) {
  const th = useTheme();
  const c = useCachedNotice(query);
  if (!c.fromCache || !c.updatedAt) return null;
  return <Row gap={1.5}><CloudOff size={14} color={th.colors.textMuted} /><Text size="xs" tone="muted">{t('Last updated {{time}}', { time: formatRelative(c.updatedAt) })}</Text></Row>;
}

/** A line of label and value inside a card (statement style). */
export function LineItem({ label, value, hint, bold, indent, last, tone }: { label: string; value: ReactNode; hint?: string; bold?: boolean; indent?: boolean; last?: boolean; tone?: 'muted' | 'default' }) {
  const th = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), paddingVertical: th.space(2), paddingStart: indent ? th.space(4) : 0, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: th.colors.divider }}>
      <View style={{ flex: 1 }}>
        <Text size={indent ? 'xs' : 'sm'} weight={bold ? 'bold' : 'regular'} tone={tone === 'muted' || indent ? 'muted' : 'default'}>{label}</Text>
        {hint ? <Text size="2xs" tone="muted">{hint}</Text> : null}
      </View>
      {typeof value === 'string' ? <Text size="sm" weight={bold ? 'bold' : 'medium'} ltr>{value}</Text> : value}
    </View>
  );
}
