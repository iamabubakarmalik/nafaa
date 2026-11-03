/** One booking in a list: customer, items, pickup timing, status and what is still due. */

import { router } from 'expo-router';
import { MessageCircle, PackageCheck, Wallet } from 'lucide-react-native';
import { View } from 'react-native';
import { isOpenBooking } from '@nafaa/core/bookings';
import { t } from '@/core/i18n';
import { Amount, Badge, ListRow, Row, SwipeRow, Text, type SwipeAction } from '@/design';
import type { Booking } from '../api/bookings';
import { itemsSummary, PICKUP, pickupOf, STATUS } from '../lib/meta';

export function BookingRow({ b, startHour, canManage, onWhatsApp, onPay, onReady }: {
  b: Booking; startHour: number; canManage: boolean; onWhatsApp: () => void; onPay: () => void; onReady: () => void;
}) {
  const st = STATUS[b.status];
  const ps = pickupOf(b, startHour);
  const open = isOpenBooking(b);
  const end: SwipeAction[] = [
    ...(b.customer?.phone ? [{ icon: MessageCircle, label: t('WhatsApp'), tone: 'success' as const, onPress: onWhatsApp }] : []),
    ...(canManage && open && b.balanceDue > 0 ? [{ icon: Wallet, label: t('Payment'), tone: 'brand' as const, onPress: onPay }] : []),
  ];
  const start: SwipeAction[] = canManage && open ? [{ icon: PackageCheck, label: b.status === 'READY_FOR_PICKUP' ? t('Abhi tayyar nahi') : t('Tayyar'), tone: 'success', onPress: onReady }] : [];
  return (
    <SwipeRow start={start} end={end}>
      <ListRow
        title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{b.customer?.name ?? '—'}</Text><Badge tone={st.tone} icon={st.icon}>{t(st.label)}</Badge></Row>}
        subtitle={<View style={{ gap: 2 }}>
          <Text size="sm" tone="muted" numberOfLines={1}>{itemsSummary(b)}</Text>
          <Row gap={1.5} wrap><Text size="xs" tone="muted" ltr>{b.bookingNumber}</Text>
            {ps !== 'none' && <Badge tone={PICKUP[ps].tone}>{t(PICKUP[ps].label)}</Badge>}</Row>
        </View>}
        trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Amount value={b.total} weight="bold" />
          {open && b.balanceDue > 0 ? <Text size="2xs" tone="warning">{t('Baqi')} <Amount value={b.balanceDue} size="2xs" tone="warning" /></Text> : null}
        </View>}
        onPress={() => router.push(`/bookings/${b.id}` as never)}
      />
    </SwipeRow>
  );
}
