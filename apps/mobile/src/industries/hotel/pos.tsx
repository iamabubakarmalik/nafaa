/**
 * Hotel counter (web hotel/pages/HotelPosPage): the shared counter for the
 * restaurant, tuck shop and minibar. When the customer is a guest in the hotel,
 * the bill says so, and udhaar goes on the khata the desk sees at check-out.
 * Room bookings are made on the booking screen.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BedDouble } from 'lucide-react-native';
import { msg, t } from '@/core/i18n';
import { PressableScale, Row, Text, useTheme } from '@/design';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { useBill } from '@/modules/pos/engine/bill';
import { hotelApi } from './api';
import { HOTEL_KEYS, roomsOf, shortDate } from './meta';

function InHouseHint() {
  const th = useTheme();
  const customer = useBill((s) => s.customer);
  const stays = useQuery({ queryKey: [HOTEL_KEYS.bookings, 'in-house'], queryFn: () => hotelApi.bookings.inHouse(), staleTime: 60_000, enabled: !!customer });
  const stay = customer ? (stays.data ?? []).find((b) => (b.customerId && b.customerId === customer.id) || b.guestName.trim().toLowerCase() === customer.name.trim().toLowerCase()) : null;
  if (!stay) return null;
  return (
    <PressableScale onPress={() => router.push(`/hotel/bookings/${stay.id}` as never)} style={{ margin: th.space(2), padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.info.soft }}>
      <Row gap={2}>
        <BedDouble size={18} color={th.colors.info.text} />
        <Text size="xs" style={{ flex: 1 }} color={th.colors.info.text}>{t('Room {{rooms}} me thehra hai (rawangi {{date}}). Udhaar is ke khate me jayega aur check-out par nazar aayega.', { rooms: roomsOf(stay), date: shortDate(stay.checkOutDate) })}</Text>
      </Row>
    </PressableScale>
  );
}

export const hotelPos: PosIndustryConfig = { ...generalPos, id: 'hotel', searchHint: msg('Khana, minibar ya doosri cheez'), receiptFooter: 'Hamare hotel me thehrne ka shukriya.', CartExtra: InHouseHint };
registerPosIndustry(hotelPos);
