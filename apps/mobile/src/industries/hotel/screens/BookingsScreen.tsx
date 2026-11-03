/** Hotel bookings (web BookingsPage): arrivals, in-house, departures, upcoming and dues; tap for the stay. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BedDouble, CalendarDays, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, ListRow, ListTemplate, Text } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote } from '../../_shared/deskKit';
import { hotelApi, type BookingView, type HotelBooking } from '../api';
import { BOOKING_STATUS, HOTEL_KEYS, roomsOf, shortDate } from '../meta';

const VIEWS: Array<[BookingView, string]> = [['arrivals', t('Aaj aane wale')], ['inhouse', t('Andar hain')], ['departures', t('Aaj jaane wale')], ['upcoming', t('Aane wali')], ['due', t('Paisa baqi')], ['all', t('Sab')]];

export function BookingsScreen() {
  const can = usePermission();
  const [view, setView] = useState<BookingView>('inhouse');
  const [q, setQ] = useState('');
  const query = useQuery({ queryKey: [HOTEL_KEYS.bookings, view, q], queryFn: () => hotelApi.bookings.page({ view, search: q || undefined, limit: 60 }), refetchInterval: 60_000 });
  const data = query.data;
  return (
    <ListTemplate<HotelBooking>
      title={t('Bookings')} search={{ value: q, onChange: setQ, placeholder: t('Guest, phone ya booking number') }}
      filters={{ value: view, onChange: (v) => setView(v as BookingView), options: VIEWS.map(([value, label]) => ({ value, label: data && value !== 'all' ? `${label} ${data.summary.views[value] ?? 0}` : label })) }}
      summary={<View style={{ gap: 8 }}><OfflineNote feature="hotelDesk" /><CachedNote query={query} /></View>}
      data={data?.items} loading={query.isLoading} error={data ? null : query.error} onRetry={() => void query.refetch()} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}
      keyExtractor={(b) => b.id}
      renderItem={({ item: b }) => (
        <ListRow icon={BedDouble} iconTone={BOOKING_STATUS[b.status].tone} divider chevron onPress={() => router.push(`/hotel/bookings/${b.id}` as never)} title={b.guestName}
          subtitle={`${t('Room')} ${roomsOf(b)} · ${shortDate(b.checkInDate)} → ${shortDate(b.checkOutDate)} · ${t('{{n}} raat', { n: b.nights })}`}
          trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>{b.balanceAmount > 0 && <Text size="xs" tone="warning" ltr>{formatMoney(b.balanceAmount)}</Text>}<Badge tone={BOOKING_STATUS[b.status].tone}>{t(BOOKING_STATUS[b.status].label)}</Badge></View>} />
      )}
      empty={<View style={{ padding: 32, alignItems: 'center' }}><CalendarDays size={32} color="#999" /><Text tone="muted">{t('Koi booking nahi')}</Text></View>}
      fab={can(P.SERVICE_BOOKINGS_MANAGE) ? { icon: Plus, label: t('New booking'), onPress: () => router.push('/hotel/bookings/new' as never) } : undefined}
    />
  );
}
