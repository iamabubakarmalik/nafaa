/**
 * Hotel bills in Sales history and on the receipt: a stay bill carries its
 * booking number, links to the booking, and the receipt prints it.
 */

import { useQuery } from '@tanstack/react-query';
import { BedDouble } from 'lucide-react-native';
import { router } from 'expo-router';
import { t } from '@/core/i18n';
import { registerReceiptIndustry } from '@/core/receipt/industry';
import { ListRow } from '@/design';
import { registerSalesExtras } from '@/modules/sales/industry/registry';
import { http } from '../_shared/serviceKit';
import type { HotelBooking } from './api';
import { roomsOf } from './meta';

const isStay = (s: { saleNumber: string; sourceRef: string | null }) => s.saleNumber.startsWith('HTL-') && !!s.sourceRef;

registerReceiptIndustry('hotel', (_doc, { sale, lang }) => {
  const ref = sale?.sourceRef as string | undefined;
  if (!ref || !String(sale?.saleNumber ?? '').startsWith('HTL-')) return null;
  return { infoRows: [{ label: lang === 'ur' ? 'بکنگ' : 'Booking', value: ref }] };
});

function StayLink({ saleId }: { saleId: string }) {
  const q = useQuery({ queryKey: ['hotel-bookings', 'by-sale', saleId], queryFn: () => http.get<HotelBooking[]>('/hotel/bookings', { saleId }) });
  const b = q.data?.[0];
  if (!b) return null;
  return <ListRow icon={BedDouble} title={`${t('Booking')} ${b.bookingNumber}`} subtitle={`${t('Room')} ${roomsOf(b)} · ${b.guestName}`} chevron onPress={() => router.push(`/hotel/bookings/${b.id}` as never)} />;
}

registerSalesExtras('hotel', {
  rowChips: (s) => (isStay(s) ? [{ label: t('Hotel stay'), tone: 'info', icon: BedDouble }] : []),
  DetailExtra: ({ sale }) => (isStay(sale) ? <StayLink saleId={sale.id} /> : null),
});
