/**
 * Hotel sales history (SalesGate opens this page): the shared history, and
 * under each hotel bill the booking it closed — rooms and stay dates — or
 * the cancellation / no-show charge it was.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BedDouble, CalendarRange, UserX } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { bookingsApi } from '../api/bookings.api';
import { HOTEL_KEYS, roomsOf, stayDay } from '../components/meta';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium';

function useHotelExtras(sales: HistorySale[]) {
  const hotel = sales.some((s) => s.saleNumber.startsWith('HTL-'));
  const q = useQuery({ queryKey: [HOTEL_KEYS.bookings, 'for-sales'], queryFn: () => bookingsApi.list(), enabled: hotel, staleTime: 60_000 });
  const byNumber = new Map((q.data ?? []).map((b) => [b.bookingNumber, b]));

  return (sale: HistorySale) => {
    if (!sale.saleNumber.startsWith('HTL-') || !sale.sourceRef) return null;
    const b = byNumber.get(sale.sourceRef);
    const charge = /^HTL-(CXL|NS)-/.test(sale.saleNumber);
    return (
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Link to={b ? `/hotel/bookings/${b.id}` : '/hotel/bookings'} onClick={(e) => e.stopPropagation()} className={`${chip} bg-indigo-50 text-indigo-700 hover:underline`}>
          {charge ? <UserX className="h-3 w-3" /> : <BedDouble className="h-3 w-3" />} {sale.sourceRef}{charge ? (sale.saleNumber.startsWith('HTL-NS') ? ' · no-show' : ' · cancel charge') : ''}
        </Link>
        {b && !charge && <span className={`${chip} bg-slate-100 text-slate-700`}><CalendarRange className="h-3 w-3" /> Room {roomsOf(b)} · {stayDay(b.checkInDate)} → {stayDay(b.checkOutDate)}</span>}
      </div>
    );
  };
}

const config: SalesHistoryConfig = { label: 'Hotel', useBillExtras: useHotelExtras };

export default function HotelSalesPage() {
  return <SalesHistoryPage config={config} />;
}
