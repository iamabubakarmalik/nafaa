import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Calendar, Plus, Search, RefreshCw, Sparkles, User, Phone,
  LogIn, LogOut, ArrowRight, Users, Bed, DollarSign,
} from 'lucide-react';
import { bookingsApi, type BookingStatus } from '../api/bookings.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string }> = {
  INQUIRY: { label: 'Inquiry', color: 'bg-slate-500' },
  QUOTED: { label: 'Quoted', color: 'bg-cyan-500' },
  TENTATIVE: { label: 'Tentative', color: 'bg-amber-500' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-500' },
  CHECKED_IN: { label: 'Checked In', color: 'bg-emerald-600' },
  CHECKED_OUT: { label: 'Checked Out', color: 'bg-slate-600' },
  NO_SHOW: { label: 'No Show', color: 'bg-orange-600' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500' },
  EXTENDED: { label: 'Extended', color: 'bg-violet-500' },
};

const SOURCE_EMOJI: Record<string, string> = {
  DIRECT: '🎯', WALK_IN: '🚶', PHONE: '📞', WEBSITE: '🌐',
  BOOKING_COM: '🔵', AGODA: '🟣', EXPEDIA: '🟡', AIRBNB: '🔴',
  TRAVEL_AGENT: '✈️', CORPORATE: '🏢', GOVT: '🏛️', REFERRAL: '👥', OTHER: '📌',
};

export default function BookingsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [tabFilter, setTabFilter] = useState<string>('all');

  const { data: bookings = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hotel-bookings', statusFilter, tabFilter, search],
    queryFn: () => {
      if (tabFilter === 'arrivals') return bookingsApi.arrivalsToday();
      if (tabFilter === 'departures') return bookingsApi.departuresToday();
      if (tabFilter === 'in-house') return bookingsApi.inHouse();
      return bookingsApi.list({
        status: statusFilter === 'active' || statusFilter === 'all' ? undefined : statusFilter,
        search: search.trim() || undefined,
      });
    },
    refetchInterval: 60_000,
  });

  const filtered = tabFilter === 'all' && statusFilter === 'active'
    ? bookings.filter((b) => !['CHECKED_OUT', 'CANCELLED', 'NO_SHOW'].includes(b.status))
    : bookings;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Calendar className="h-3.5 w-3.5 text-amber-300" />
              Reservations
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📅 Bookings</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">All hotel bookings & reservations</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/hotel/bookings/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                New Booking
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search booking #, guest name, phone..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-blue-500" />
        </div>

        <div className="flex gap-1.5">
          {[
            { v: 'all', label: 'All Bookings' },
            { v: 'arrivals', label: '🛬 Today Arrivals' },
            { v: 'departures', label: '🛫 Today Departures' },
            { v: 'in-house', label: '🏨 In-House Now' },
          ].map((t) => (
            <button key={t.v} onClick={() => setTabFilter(t.v)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (tabFilter === t.v ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{t.label}</button>
          ))}
        </div>

        {tabFilter === 'all' && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[
              { v: 'active', label: '🔥 Active' },
              { v: 'all', label: 'All Status' },
              ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ v: k, label: v.label })),
            ].map((s) => (
              <button key={s.v} onClick={() => setStatusFilter(s.v)} className={
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
                (statusFilter === s.v ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
              }>{s.label}</button>
            ))}
          </div>
        )}
      </section>

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Calendar className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No bookings found</p>
          <Link to="/hotel/bookings/new">
            <Button className="mt-4 bg-gradient-to-r from-blue-600 to-cyan-700">
              <Plus className="h-4 w-4" />
              Create First Booking
            </Button>
          </Link>
        </div>
      ) : (
        <section className="grid gap-3">
          {filtered.map((booking) => <BookingCard key={booking.id} booking={booking} />)}
        </section>
      )}
    </div>
  );
}

function BookingCard({ booking }: any) {
  const cfg = STATUS_CONFIG[booking.status as BookingStatus];
  const daysUntilCheckIn = Math.ceil((new Date(booking.checkInDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isToday = daysUntilCheckIn === 0;
  const isUpcoming = daysUntilCheckIn > 0 && daysUntilCheckIn <= 3;

  return (
    <Link to={'/hotel/bookings/' + booking.id} className="block rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg hover:border-blue-300 transition p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={
            'shrink-0 rounded-2xl px-3 py-2 text-center min-w-[80px] ' +
            (booking.status === 'CHECKED_IN' ? 'bg-emerald-100 dark:bg-emerald-950/40' :
             isToday ? 'bg-amber-100 dark:bg-amber-950/40' :
             'bg-slate-100 dark:bg-neutral-800')
          }>
            <div className="text-[10px] uppercase font-extrabold text-slate-600">
              {booking.status === 'CHECKED_IN' ? 'In-House' : 'Check-in'}
            </div>
            <div className="text-xl font-extrabold">{format(new Date(booking.checkInDate), 'dd')}</div>
            <div className="text-[9px] font-bold text-slate-500 uppercase">{format(new Date(booking.checkInDate), 'MMM')}</div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">{booking.guestName}</span>
              <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + cfg.color}>
                {cfg.label}
              </span>
              {isToday && booking.status === 'CONFIRMED' && (
                <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase animate-pulse">TODAY</span>
              )}
              {isUpcoming && !isToday && (
                <span className="px-2 py-0.5 rounded bg-cyan-500 text-white text-[9px] font-extrabold uppercase">IN {daysUntilCheckIn}D</span>
              )}
              <span className="text-lg" title={booking.source}>{SOURCE_EMOJI[booking.source] || '📌'}</span>
            </div>
            <div className="text-[10px] font-mono font-bold text-slate-500">{booking.bookingNumber}</div>
            {booking.guestPhone && (
              <div className="flex items-center gap-1 text-xs text-slate-600 font-bold mt-1">
                <Phone className="h-3 w-3" />
                {booking.guestPhone}
              </div>
            )}
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-600 font-semibold flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Bed className="h-3 w-3" />
                {booking.bookedRooms.length} room{booking.bookedRooms.length > 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {booking.totalAdults + booking.totalChildren} guest{booking.totalAdults + booking.totalChildren > 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {booking.nights} night{booking.nights > 1 ? 's' : ''}
              </span>
              <span className="font-extrabold text-slate-700">
                {format(new Date(booking.checkInDate), 'dd MMM')} → {format(new Date(booking.checkOutDate), 'dd MMM')}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xl font-extrabold text-emerald-700 tabular-nums">{formatPKR(booking.grandTotal)}</div>
          {booking.balanceAmount > 0 && booking.paymentStatus !== 'PAID' && (
            <div className="text-[10px] font-extrabold text-amber-700">Due: {formatPKR(booking.balanceAmount)}</div>
          )}
          {booking.paymentStatus === 'PAID' && (
            <div className="text-[10px] font-extrabold text-emerald-700">PAID</div>
          )}
          <div className="mt-1 inline-flex items-center gap-1 text-xs font-extrabold text-blue-600">
            View <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </Link>
  );
}
