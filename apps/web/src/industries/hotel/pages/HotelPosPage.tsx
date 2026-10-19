/**
 * Hotel counter (PosGate opens this page): the shared POS for restaurant,
 * tuck shop and minibar sales. Under the customer picker it shows when the
 * chosen customer is a guest in the hotel, so udhaar goes on the khata the
 * desk sees at check-out. Room bookings are made on the booking screen.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BedDouble } from 'lucide-react';
import { PosScreen, useComboBundles, useProductCatalog, type PosIndustryConfig } from '@modules/pos/engine';
import { bookingsApi } from '../api/bookings.api';
import { guestsApi } from '../api/guests.api';
import { HOTEL_KEYS, roomsOf, stayDay } from '../components/meta';

function InHouseHint({ customerId }: { customerId?: string | null }) {
  const inHouse = useQuery({ queryKey: [HOTEL_KEYS.bookings, 'in-house'], queryFn: () => bookingsApi.inHouse(), staleTime: 60_000 });
  const guests = useQuery({
    queryKey: [HOTEL_KEYS.guests, 'by-customer', customerId],
    queryFn: () => guestsApi.list({ customerId: customerId! }),
    enabled: !!customerId && !!inHouse.data?.length,
    staleTime: 60_000,
  });
  if (!customerId) return null;
  const guestIds = new Set((guests.data ?? []).map((g) => g.id));
  const stay = (inHouse.data ?? []).find((b) => b.primaryGuestId && guestIds.has(b.primaryGuestId));
  if (!stay) return null;
  return (
    <Link to={`/hotel/bookings/${stay.id}`} className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-[0.75rem] text-indigo-800 ring-1 ring-indigo-100 hover:bg-indigo-100">
      <BedDouble className="h-4 w-4 shrink-0" />
      <span>Room {roomsOf(stay)} me thehra hai (rawangi {stayDay(stay.checkOutDate)}). Udhaar is ke khate me jayega aur check-out par nazar aayega.</span>
    </Link>
  );
}

const hotelPos: PosIndustryConfig = {
  id: 'hotel',
  label: 'Hotel',
  useCatalog: () => useProductCatalog(),
  useBundles: useComboBundles,
  quickKeys: true,
  searchHint: 'Chai, khana, pani, minibar…',
  receiptFooter: 'Hamare saath thehrne ka shukriya.',
  CartExtra: InHouseHint,
};

export default function HotelPosPage() {
  return <PosScreen config={hotelPos} />;
}
