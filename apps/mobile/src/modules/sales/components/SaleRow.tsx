/** One bill in the history list, and the day header above a day's bills. */

import { router } from 'expo-router';
import { BookOpen, CloudOff, Receipt } from 'lucide-react-native';
import { View } from 'react-native';
import { formatTime } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Badge, ListRow, Row, SwipeRow, Text, useTheme } from '@/design';
import type { HistorySale } from '../api/history';
import { itemsLine, SALE_STATUS, tierLabel } from '../lib/meta';
import { useSalesExtras } from '../industry/registry';

export type HistoryRow =
  | { kind: 'day'; key: string; label: string; total: number; count: number }
  | { kind: 'sale'; key: string; sale: HistorySale; first: boolean; last: boolean };

export function DayHeader({ label, total, count }: { label: string; total: number; count: number }) {
  const th = useTheme();
  return (
    <Row justify="between" paddingX={5} style={{ paddingTop: th.space(4), paddingBottom: th.space(1.5) }}>
      <Text size="sm" weight="semibold" tone="secondary">{label} <Text size="sm" tone="muted">{t('· {{count}} bill', { count })}</Text></Text>
      <Amount value={total} size="sm" weight="semibold" tone="secondary" />
    </Row>
  );
}

/** Card edges: rows of one day sit together on one rounded surface. */
export function SaleCard({ first, last, children }: { first: boolean; last: boolean; children: React.ReactNode }) {
  const th = useTheme();
  const edge = th.isDark ? 1 : 0.5;
  const r = th.radius('xl');
  return (
    <View style={{
      marginHorizontal: th.space(4), backgroundColor: th.colors.surface, overflow: 'hidden', borderColor: th.colors.border,
      borderLeftWidth: edge, borderRightWidth: edge, borderTopWidth: first ? edge : 0, borderBottomWidth: last ? edge : 0,
      borderTopLeftRadius: first ? r : 0, borderTopRightRadius: first ? r : 0, borderBottomLeftRadius: last ? r : 0, borderBottomRightRadius: last ? r : 0,
    }}>
      {children}
      {!last && <View style={{ height: 1, backgroundColor: th.colors.divider, marginStart: th.space(4) }} />}
    </View>
  );
}

export function SaleRow({ sale: s, first, last }: { sale: HistorySale; first: boolean; last: boolean }) {
  const voided = s.status === 'VOIDED';
  const st = SALE_STATUS[s.status];
  const who = s.customer?.name || t('Walk-in customer');
  const open = () => router.push(`/sales/${s.id}` as never);
  const extras = useSalesExtras();
  const chips = extras.rowChips?.(s) ?? [];
  const more = s.pending ? [] : (extras.rowActions?.(s) ?? []).map((a) => ({ icon: a.icon ?? Receipt, label: a.label, tone: 'neutral' as const, onPress: () => router.push(a.href as never) }));
  return (
    <SaleCard first={first} last={last}>
      <SwipeRow end={s.pending ? [] : [{ icon: Receipt, label: t('Receipt'), tone: 'brand', onPress: () => router.push(`/sales/${s.id}/receipt` as never) }, ...more]}>
        <ListRow
          title={<Row gap={1.5} wrap><Text weight="semibold" ltr numberOfLines={1}>{s.saleNumber}</Text>
            {s.pending && <Badge tone="warning" icon={CloudOff}>{t('Waiting')}</Badge>}
            {s.status !== 'COMPLETED' && <Badge tone={st.tone}>{t(st.label)}</Badge>}
            {s.priceTier && s.priceTier !== 'RETAIL' && <Badge tone="info">{tierLabel(s.priceTier)}</Badge>}
            {chips.map((c) => <Badge key={c.label} tone={c.tone ?? 'neutral'} icon={c.icon}>{c.label}</Badge>)}</Row>}
          subtitle={`${who} · ${formatTime(s.soldAt)}\n${itemsLine(s)}`}
          trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Amount value={s.total} weight="bold" tone={voided ? 'subtle' : 'default'} style={voided ? { textDecorationLine: 'line-through' } : undefined} />
            {s.creditAmount > 0 && !voided && <Badge tone="warning" icon={BookOpen}><Amount value={s.creditAmount} size="xs" tone="warning" /></Badge>}
          </View>}
          onPress={open}
        />
      </SwipeRow>
    </SaleCard>
  );
}
