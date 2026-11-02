/**
 * Hotel dashboard: the standard dashboard plus rooms, today's check-ins and
 * check-outs, occupancy and booking sources.
 */

import { BarChart3, Bed, BookOpen, Calendar, CalendarPlus, Home, LogIn, Plus, Receipt, ShoppingCart, Sparkle, Users } from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { useMasked } from '@modules/dashboard/engine';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useHotelOps } from './useHotelOps';
import { HotelMovements, HotelOccupancyTrend, HotelRooms, HotelSources, hotelKpis, useHotelAttention } from './widgets';
import { t } from '@core/i18n';

const productPath = (id: string) => `/hotel-room-types/${id}`;

function useHotelActions(): QuickAction[] {
  const { data } = useOverview();
  const { rooms, guests, pendingHK } = useHotelOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/hotel/bookings/new', icon: CalendarPlus, label: t('Nayi booking'), hint: rooms.available ? t('{{available}} kamre khaali', { available: rooms.available }) : t('Kamra book karein') },
    { to: '/hotel/bookings', icon: Calendar, label: t('Bookings'), hint: t('{{count}} aaj aa rahe', { count: guests.arrivals.length }) },
    { to: '/hotel/rooms', icon: Home, label: t('Kamre'), hint: t('{{occupied}}/{{total}} bhare', { occupied: rooms.occupied, total: rooms.total }) },
    { to: '/hotel/housekeeping', icon: Sparkle, label: t('Housekeeping'), hint: pendingHK ? t('{{pendingHK}} kaam', { pendingHK }) : t('Sab saaf') },
    { to: '/hotel/guests', icon: Users, label: t('Mehmaan'), hint: t('{{inHouse}} andar', { inHouse: guests.inHouse }) },
    { to: '/hotel/room-types', icon: Bed, label: t('Room types'), hint: t('Rate aur room') },
    { to: '/hotel-room-types/new', icon: Plus, label: t('Naya room type'), hint: t('Rate aur sahulat') },
    { to: '/pos', icon: ShoppingCart, label: t('POS'), hint: t('Extras aur F&B') },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const hotelDashboard = createDashboard({
  label: t('Hotel'),
  productPath,
  openFrom: 0,
  primaryAction: { to: '/hotel/bookings/new', label: t('Nayi booking'), icon: CalendarPlus },
  kpis: hotelKpis,
  defaultKpis: ['hotel-occupancy', 'hotel-arrivals', 'hotel-departures', 'hotel-in-house', 'profit', 'cash'],
  useAttention: useHotelAttention,
  widgets: [
    { id: 'hotel-movements', title: t('Aaj aana jaana'), description: t('Aaj ke check-in aur check-out, late wale upar'), size: 'half', sizes: ANY_SIZE, Component: HotelMovements },
    { id: 'hotel-rooms', title: t('Kamron ka haal'), description: t('Khaali, bhare, safai aur marammat — har kamra'), size: 'half', sizes: ['half', 'wide', 'full'], Component: HotelRooms },
    { id: 'hotel-occupancy', title: t('Occupancy — 7 din'), description: t('Rozana kitne kamre bhare rahe'), size: 'third', sizes: ['third', 'half', 'wide'], Component: HotelOccupancyTrend },
    { id: 'hotel-sources', title: t('Booking kahan se aayi'), description: t('30 din ki bookings zariye ke hisaab se'), size: 'third', sizes: ['third', 'half'], Component: HotelSources },
  ],
  useQuickActions: useHotelActions,
  moneyMap: { productsPath: '/hotel/room-types' },
  omit: ['slow-movers', 'low-stock'],
  guide: [
    { icon: LogIn, title: t('Aaj aana jaana'), text: t('Aaj ke check-in aur check-out ek list me. Jis ka din guzar gaya wo "Late" hai, aur jo bill baqi chhod kar ja raha hai wo "Aaj ka kaam" me aata hai.') },
    { icon: Bed, title: t('Kamron ka haal'), text: t('Har kamra rang se: hara khaali, brand bhara, neela safai, naranji marammat. Peela nuqta ka matlab kamra ganda hai.') },
  ],
});
