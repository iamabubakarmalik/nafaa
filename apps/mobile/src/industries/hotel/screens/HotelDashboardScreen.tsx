/** Hotel dashboard (web hotel/dashboard): rooms by state, arrivals and departures today, in-house guests, money and quick actions. */

import { useQuery } from '@tanstack/react-query';
import { BarChart3, Bed, BedDouble, CalendarDays, CalendarPlus, Home, LogIn, LogOut, Sparkle, Users, Wallet } from 'lucide-react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { hotelApi } from '../api';
import { HOTEL_KEYS } from '../meta';

export function HotelDashboardScreen() {
  const can = usePermission();
  const q = useQuery({ queryKey: [HOTEL_KEYS.dash], queryFn: () => hotelApi.overview(), refetchInterval: 30_000 });
  const d = q.data;
  const attention: DashAttention[] = [];
  if (d?.operations?.arrivalsToday) attention.push({ icon: LogIn, tone: 'info', text: t('{{n}} guest aaj aane wale', { n: d.operations.arrivalsToday }), href: '/hotel/bookings' });
  if (d?.operations?.departuresToday) attention.push({ icon: LogOut, tone: 'warning', text: t('{{n}} guest aaj jaane wale', { n: d.operations.departuresToday }), href: '/hotel/bookings' });
  if (d?.rooms?.dirty) attention.push({ icon: Sparkle, tone: 'warning', text: t('{{n}} room ganda hai', { n: d.rooms.dirty }), href: '/hotel/housekeeping' });
  if (d?.revenue?.outstanding) attention.push({ icon: Wallet, tone: 'danger', text: t('Baqi paisa {{a}}', { a: formatMoney(d.revenue.outstanding) }), href: '/hotel/bookings' });
  const actions: DashAction[] = [
    { href: '/hotel/bookings/new', icon: CalendarPlus, label: t('New booking'), hint: t('Fast'), show: can(P.SERVICE_BOOKINGS_MANAGE) },
    { href: '/hotel/rooms', icon: Home, label: t('Room board'), hint: t('Kaun sa khali') },
    { href: '/hotel/bookings', icon: CalendarDays, label: t('Bookings'), hint: t('Stays') },
    { href: '/hotel/guests', icon: Users, label: t('Guests'), hint: t('Record') },
    { href: '/hotel/housekeeping', icon: Sparkle, label: t('Housekeeping'), hint: t('Safai') },
    { href: '/hotel/room-types', icon: Bed, label: t('Room types'), hint: t('Rate') },
    { href: '/hotel/rate-plans', icon: BedDouble, label: t('Season rates'), hint: t('Mausam') },
    { href: '/hotel/reports', icon: BarChart3, label: t('Night audit'), hint: t('Din ka hisaab') },
  ];
  return (
    <PackDashboard title={t('Hotel dashboard')} stats={[{ label: t('Occupancy'), value: `${Math.round(d?.rooms?.occupancyPct ?? 0)}%` }, { label: t('Andar'), value: String(d?.operations?.inHouse ?? 0) }, { label: t('Aaj Sale'), value: formatMoney(d?.revenue?.today ?? 0) }]}
      attention={attention} actions={actions} refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />
  );
}
