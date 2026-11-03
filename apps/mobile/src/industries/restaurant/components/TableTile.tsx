/**
 * One table on the floor (web TableCard): number, live status, seats,
 * running bill, time seated, waiter and kitchen state. Used on the floor
 * and in the table picker; sized for tapping on a busy floor.
 */

import { Clock, Crown, Pencil, Users } from 'lucide-react-native';
import { View } from 'react-native';
import { minutesSince } from '@nafaa/core/restaurant';
import { formatTime } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Badge, Icon, PressableScale, Row, Text, useTheme } from '@/design';
import type { FloorTable } from '../api';
import { TABLE_META, duration } from '../meta';

export function TableTile({ table: tb, selected, setup, compact, onPress, width }: {
  table: FloorTable; selected?: boolean; setup?: boolean; compact?: boolean; onPress: () => void; width: number | `${number}%`;
}) {
  const th = useTheme();
  const meta = TABLE_META[tb.liveStatus];
  const tone = th.colors[tb.billPrinted ? 'accent' : meta.tone];
  const busy = tb.liveStatus === 'OCCUPIED';
  const blocked = tb.liveStatus === 'OUT_OF_SERVICE';
  const min = minutesSince(tb.occupiedAt ?? tb.currentOrder?.createdAt);
  return (
    <PressableScale onPress={onPress} haptic="tap" scaleTo={0.97}
      accessibilityLabel={`${t('Table {{tableNumber}}', { tableNumber: tb.tableNumber })}, ${t(meta.label)}`}
      style={{
        width, minHeight: compact ? 104 : 132, padding: th.space(3), borderRadius: th.radius('xl'), gap: th.space(1),
        backgroundColor: tone.soft, borderWidth: selected || tb.billPrinted ? 2 : 1, borderColor: selected ? th.colors.brand.solid : tone.border, opacity: blocked ? 0.6 : 1,
      }}>
      <Row justify="between" align="start" gap={1} style={{ flexWrap: 'wrap' }}>
        <Text size={compact ? 'xl' : '2xl'} weight="bold" ltr tabular>{tb.tableNumber}</Text>
        <Badge tone={tb.billPrinted ? 'accent' : meta.tone} dot size="sm">{tb.billPrinted ? t('Bill print ho gaya') : t(meta.label)}</Badge>
      </Row>
      <Row gap={1}>
        <Icon icon={Users} size={13} tone="muted" />
        <Text size="xs" tone="secondary" ltr>{busy && tb.guests ? `${tb.guests} / ${tb.capacity}` : String(tb.capacity)}</Text>
        {tb.isVip && <Icon icon={Crown} size={13} color={th.colors.warning.text} />}
        {!!tb.tableName && <Text size="xs" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>· {tb.tableName}</Text>}
      </Row>
      {busy ? (
        <View style={{ marginTop: 'auto', gap: 2 }}>
          <Amount value={tb.runningBill} weight="bold" size={compact ? 'sm' : 'base'} />
          <Row gap={1}>
            <Icon icon={Clock} size={12} tone="muted" />
            <Text size="xs" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>{duration(min)}{tb.waiterName ? ` · ${tb.waiterName}` : ''}</Text>
          </Row>
          {!compact && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {tb.unsent > 0 && <Badge tone="neutral" solid size="sm">{t('{{unsent}} kitchen nahi gaye', { unsent: tb.unsent })}</Badge>}
              {tb.cooking > 0 && <Badge tone="warning" size="sm">{t('{{cooking}} ban rahe', { cooking: tb.cooking })}</Badge>}
              {tb.ready > 0 && <Badge tone="success" solid size="sm">{t('{{ready}} tayyar', { ready: tb.ready })}</Badge>}
              {tb.orders.length > 1 && <Badge tone="neutral" size="sm">{t('{{count}} bill', { count: tb.orders.length })}</Badge>}
            </View>
          )}
        </View>
      ) : tb.liveStatus === 'RESERVED' ? (
        <Text size="xs" weight="medium" color={th.colors.warning.text} numberOfLines={2} style={{ marginTop: 'auto' }}>
          {tb.reservedByName}{tb.reservedFor ? ` · ${formatTime(tb.reservedFor)}` : ''}
        </Text>
      ) : (
        <Text size="xs" tone="muted" style={{ marginTop: 'auto' }}>
          {setup ? t('Badlein') : tb.liveStatus === 'CLEANING' ? t('Saaf karke khaali karein') : tb.liveStatus === 'AVAILABLE' ? t('Order lein') : ''}
        </Text>
      )}
      {setup && <View style={{ position: 'absolute', bottom: th.space(3), end: th.space(3) }}><Icon icon={Pencil} size={14} tone="muted" /></View>}
    </PressableScale>
  );
}
