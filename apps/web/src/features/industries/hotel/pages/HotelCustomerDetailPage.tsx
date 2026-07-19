import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bed, Calendar, Users, Award, Home } from 'lucide-react';
import { bookingsApi } from '../api/bookings.api';
import CustomerDetailPage from '@/features/customers/pages/CustomerDetailPage';
import { formatPKR } from '@/lib/format';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));

export default function HotelCustomerDetailPage() {
  const { id } = useParams();

  const { data: allBookings = [] } = useQuery({
    queryKey: ['bookings-for-hotel-customer', id],
    queryFn: () => bookingsApi.list(),
    enabled: !!id,
  });

  const guestBookings = allBookings.filter((b: any) => b.primaryGuestId === id);
  const totalNights = guestBookings.reduce((s: number, b: any) => s + Number(b.nights || 0), 0);
  const totalRevenue = guestBookings.reduce((s: number, b: any) => s + Number(b.grandTotal || 0), 0);

  return (
    <div className="space-y-6">
      {guestBookings.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bed className="h-5 w-5 text-indigo-600" />
            <h3 className="font-extrabold text-indigo-900">🏨 Booking History</h3>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-white border-2 border-indigo-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-indigo-700">Total Bookings</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{guestBookings.length}</div>
            </div>
            <div className="rounded-xl bg-white border-2 border-purple-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-purple-700">Total Nights</div>
              <div className="text-2xl font-extrabold text-purple-900 mt-1">{totalNights}</div>
            </div>
            <div className="rounded-xl bg-white border-2 border-emerald-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-emerald-700">Revenue</div>
              <div className="text-lg font-extrabold text-emerald-900 mt-1">{formatPKR(totalRevenue)}</div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border-2 border-indigo-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-indigo-100">
              <h4 className="font-bold text-slate-900 text-sm">All Bookings</h4>
            </div>
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {guestBookings.map((b: any) => (
                <Link key={b.id} to={`/hotel/bookings/${b.id}`} className="block px-4 py-3 hover:bg-indigo-50 transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono font-extrabold text-sm text-slate-900">{b.bookingNumber}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                        <Calendar className="h-2.5 w-2.5" />
                        {formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}
                        <span>•</span>
                        {b.nights} nights
                        <span>•</span>
                        <Users className="h-2.5 w-2.5" />
                        {b.totalAdults}A {b.totalChildren}C
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 text-sm">{formatPKR(b.grandTotal)}</div>
                      <div className="text-[10px] text-slate-500">{b.status.replace('_', ' ')}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <CustomerDetailPage />
    </div>
  );
}
