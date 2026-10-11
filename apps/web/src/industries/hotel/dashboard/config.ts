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

const productPath = (id: string) => `/hotel-room-types/${id}`;

function useHotelActions(): QuickAction[] {
  const { data } = useOverview();
  const { rooms, guests, pendingHK } = useHotelOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/hotel/bookings/new', icon: CalendarPlus, label: 'Nayi booking', hint: rooms.available ? `${rooms.available} kamre khaali` : 'Kamra book karein' },
    { to: '/hotel/bookings', icon: Calendar, label: 'Bookings', hint: `${guests.arrivals.length} aaj aa rahe` },
    { to: '/hotel/rooms', icon: Home, label: 'Kamre', hint: `${rooms.occupied}/${rooms.total} bhare` },
    { to: '/hotel/housekeeping', icon: Sparkle, label: 'Housekeeping', hint: pendingHK ? `${pendingHK} kaam` : 'Sab saaf' },
    { to: '/hotel/guests', icon: Users, label: 'Mehmaan', hint: `${guests.inHouse} andar` },
    { to: '/hotel/room-types', icon: Bed, label: 'Room types', hint: `${s?.totalProducts ?? 0} qisam` },
    { to: '/hotel-room-types/new', icon: Plus, label: 'Naya room type', hint: 'Rate aur sahulat' },
    { to: '/pos', icon: ShoppingCart, label: 'POS', hint: 'Extras aur F&B' },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Bikri record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const hotelDashboard = createDashboard({
  label: 'Hotel',
  productPath,
  openFrom: 0,
  primaryAction: { to: '/hotel/bookings/new', label: 'Nayi booking', icon: CalendarPlus },
  kpis: hotelKpis,
  defaultKpis: ['hotel-occupancy', 'hotel-arrivals', 'hotel-departures', 'hotel-in-house', 'profit', 'cash'],
  useAttention: useHotelAttention,
  widgets: [
    { id: 'hotel-movements', title: 'Aaj aana jaana', description: 'Aaj ke check-in aur check-out, late wale upar', size: 'half', sizes: ANY_SIZE, Component: HotelMovements },
    { id: 'hotel-rooms', title: 'Kamron ka haal', description: 'Khaali, bhare, safai aur marammat — har kamra', size: 'half', sizes: ['half', 'wide', 'full'], Component: HotelRooms },
    { id: 'hotel-occupancy', title: 'Occupancy — 7 din', description: 'Rozana kitne kamre bhare rahe', size: 'third', sizes: ['third', 'half', 'wide'], Component: HotelOccupancyTrend },
    { id: 'hotel-sources', title: 'Booking kahan se aayi', description: '30 din ki bookings zariye ke hisaab se', size: 'third', sizes: ['third', 'half'], Component: HotelSources },
  ],
  useQuickActions: useHotelActions,
  moneyMap: { productsPath: '/hotel/room-types' },
  omit: ['slow-movers', 'low-stock'],
  guide: [
    { icon: LogIn, title: 'Aaj aana jaana', text: 'Aaj ke check-in aur check-out ek list me. Jis ka din guzar gaya wo "Late" hai, aur jo bill baqi chhod kar ja raha hai wo "Aaj ka kaam" me aata hai.' },
    { icon: Bed, title: 'Kamron ka haal', text: 'Har kamra rang se: hara khaali, brand bhara, neela safai, naranji marammat. Peela nuqta ka matlab kamra ganda hai.' },
  ],
});
