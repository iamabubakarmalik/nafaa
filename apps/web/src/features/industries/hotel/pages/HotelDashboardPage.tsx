import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2, Sparkles, RefreshCw, TrendingUp, DollarSign, Users, Bed,
  ArrowRight, Award, Calendar, AlertCircle, CheckCircle2, LogIn, LogOut,
  Home, Sparkle, Clock, Star, Ban,
} from 'lucide-react';
import { hotelDashboardApi } from '../api/dashboard.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { format, differenceInHours } from 'date-fns';

const SOURCE_EMOJI: Record<string, string> = {
  DIRECT: '🎯', WALK_IN: '🚶', PHONE: '📞', WEBSITE: '🌐',
  BOOKING_COM: '🔵', AGODA: '🟣', EXPEDIA: '🟡', AIRBNB: '🔴',
  TRAVEL_AGENT: '✈️', CORPORATE: '🏢', GOVT: '🏛️', REFERRAL: '👥', OTHER: '📌',
};

export default function HotelDashboardPage() {
  const { data: overview, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hotel-dashboard'],
    queryFn: () => hotelDashboardApi.overview(),
    refetchInterval: 60_000,
  });

  const rooms = overview?.rooms ?? { total: 0, occupied: 0, available: 0, cleaning: 0, maintenance: 0, occupancyPct: 0, dirty: 0 };
  const operations = overview?.operations ?? { arrivalsToday: 0, departuresToday: 0, inHouse: 0, todayBookings: 0, pendingHK: 0 };
  const guests = overview?.guests ?? { total: 0, vip: 0, blacklisted: 0 };
  const revenue = overview?.revenue ?? { today: 0, monthly: 0, collected: 0, outstanding: 0 };
  const upcomingArrivals = overview?.upcomingArrivals ?? [];
  const recentBookings = overview?.recentBookings ?? [];
  const occupancyTrend = overview?.occupancyTrend ?? [];
  const bySource = overview?.bySource ?? [];

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-purple-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-purple-400/15 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Hotel Command Center
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🏨 Hotel Dashboard</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Rooms, bookings, guests — sab track</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Link to="/hotel/bookings/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Calendar className="h-4 w-4" />
                New Booking
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Occupancy hero */}
      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl bg-gradient-to-br from-slate-950 to-indigo-900 text-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <Bed className="h-3.5 w-3.5 text-amber-300" />
                Current Occupancy
              </div>
              <h3 className="mt-2 text-2xl font-extrabold">Room Status Right Now</h3>
            </div>
            <div className="text-right">
              <div className="text-6xl font-extrabold tabular-nums text-amber-300">{rooms.occupancyPct.toFixed(0)}%</div>
              <div className="text-xs font-bold text-white/70">Occupancy</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3 text-center">
              <div className="text-[10px] uppercase font-extrabold text-white/70">Total</div>
              <div className="mt-1 text-2xl font-extrabold tabular-nums">{rooms.total}</div>
            </div>
            <div className="rounded-2xl bg-emerald-500/20 backdrop-blur border border-emerald-400/30 p-3 text-center">
              <div className="text-[10px] uppercase font-extrabold text-emerald-200">Available</div>
              <div className="mt-1 text-2xl font-extrabold tabular-nums text-emerald-200">{rooms.available}</div>
            </div>
            <div className="rounded-2xl bg-blue-500/20 backdrop-blur border border-blue-400/30 p-3 text-center">
              <div className="text-[10px] uppercase font-extrabold text-blue-200">Occupied</div>
              <div className="mt-1 text-2xl font-extrabold tabular-nums text-blue-200">{rooms.occupied}</div>
            </div>
            <div className="rounded-2xl bg-amber-500/20 backdrop-blur border border-amber-400/30 p-3 text-center">
              <div className="text-[10px] uppercase font-extrabold text-amber-200">Cleaning</div>
              <div className="mt-1 text-2xl font-extrabold tabular-nums text-amber-200">{rooms.cleaning}</div>
            </div>
          </div>

          {/* Occupancy trend */}
          <div className="mt-4">
            <div className="text-[10px] uppercase font-extrabold text-white/60 mb-2">Last 7 Days</div>
            <div className="flex items-end gap-1 h-24">
              {occupancyTrend.map((d: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-amber-500 to-yellow-400 transition-all"
                      style={{ height: Math.max(d.pct, 5) + '%' }}
                      title={d.date + ' - ' + d.pct.toFixed(0) + '%'}
                    />
                  </div>
                  <div className="text-[9px] font-bold text-white/60">{format(new Date(d.date), 'dd')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 shadow-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20 mb-3">
            <DollarSign className="h-3.5 w-3.5 text-amber-300" />
            Revenue
          </div>
          <div className="text-5xl font-extrabold tabular-nums">{formatPKR(revenue.today).replace('Rs', '').trim()}</div>
          <div className="mt-1 text-sm font-bold text-white/80">Today Rs</div>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-white/70">Monthly</span><span className="font-bold tabular-nums">{formatPKR(revenue.monthly)}</span></div>
            <div className="flex justify-between"><span className="text-white/70">Collected</span><span className="font-bold tabular-nums text-emerald-200">{formatPKR(revenue.collected)}</span></div>
            <div className="flex justify-between"><span className="text-white/70">Outstanding</span><span className="font-bold tabular-nums text-amber-200">{formatPKR(revenue.outstanding)}</span></div>
          </div>
        </div>
      </section>

      {/* Operations KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Arrivals Today" value={operations.arrivalsToday} icon={LogIn} color="emerald" to="/hotel/bookings/arrivals" />
        <KpiCard label="Departures Today" value={operations.departuresToday} icon={LogOut} color="rose" to="/hotel/bookings/departures" />
        <KpiCard label="In-House Guests" value={operations.inHouse} icon={Users} color="blue" to="/hotel/bookings/in-house" />
        <KpiCard label="HK Tasks" value={operations.pendingHK} icon={Sparkle} color="amber" to="/hotel/housekeeping" />
      </section>

      {/* Quick Links */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink to="/hotel/room-types" icon={Bed} label="Room Types" color="indigo" />
        <QuickLink to="/hotel/rooms" icon={Home} label="Rooms" color="purple" />
        <QuickLink to="/hotel/bookings" icon={Calendar} label="Bookings" color="blue" />
        <QuickLink to="/hotel/bookings/new" icon={Sparkles} label="New Booking" color="cyan" />
        <QuickLink to="/hotel/guests" icon={Users} label="Guests" color="teal" />
        <QuickLink to="/hotel/housekeeping" icon={Sparkle} label="Housekeeping" color="emerald" />
        <QuickLink to="/hotel/rate-plans" icon={Award} label="Rate Plans" color="amber" />
        <QuickLink to="/hotel/reports" icon={TrendingUp} label="Reports" color="violet" />
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Arrivals */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <LogIn className="h-5 w-5 text-emerald-600" />
                Upcoming Arrivals
              </h3>
              <p className="text-xs text-slate-500 font-semibold">Next 7 days</p>
            </div>
            <Link to="/hotel/bookings" className="text-xs font-extrabold text-emerald-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {upcomingArrivals.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <LogIn className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No upcoming arrivals
              </div>
            ) : (
              upcomingArrivals.map((booking: any) => {
                const daysToArrival = Math.ceil((new Date(booking.checkInDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isToday = daysToArrival === 0;
                return (
                  <Link key={booking.id} to={'/hotel/bookings/' + booking.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shrink-0">
                      <LogIn className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm">{booking.guestName}</span>
                        {isToday && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase animate-pulse">TODAY</span>}
                      </div>
                      <div className="text-[10px] font-mono font-bold text-slate-500">{booking.bookingNumber}</div>
                      <div className="text-xs text-slate-600 font-semibold">
                        {booking.nights} nights • {booking.bookedRooms.length} rooms
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold">{format(new Date(booking.checkInDate), 'dd MMM')}</div>
                      <div className="text-[10px] font-bold text-slate-500">{format(new Date(booking.checkInDate), 'HH:mm')}</div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Recent Bookings
              </h3>
            </div>
            <Link to="/hotel/bookings" className="text-xs font-extrabold text-blue-600 inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
            {recentBookings.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 font-semibold">
                <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                No bookings yet
              </div>
            ) : (
              recentBookings.map((b: any) => (
                <Link key={b.id} to={'/hotel/bookings/' + b.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0">
                    {SOURCE_EMOJI[b.source] || '📌'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm truncate">{b.guestName}</span>
                      <span className={
                        'px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' +
                        (b.status === 'CONFIRMED' ? 'bg-blue-500' :
                         b.status === 'CHECKED_IN' ? 'bg-emerald-600' :
                         b.status === 'CHECKED_OUT' ? 'bg-slate-500' :
                         b.status === 'CANCELLED' ? 'bg-rose-500' : 'bg-amber-500')
                      }>{b.status}</span>
                    </div>
                    <div className="text-[10px] font-mono font-bold text-slate-500">{b.bookingNumber}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(b.grandTotal)}</div>
                    <div className="text-[10px] font-bold text-slate-500">{b.nights}n • {b.bookedRooms.length}r</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Guest stats + By Source */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            Guest Statistics
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-teal-50 dark:bg-teal-950/30 p-4 text-center">
              <div className="text-[10px] uppercase font-extrabold text-teal-700">Total Guests</div>
              <div className="mt-1 text-3xl font-extrabold text-teal-800 tabular-nums">{guests.total}</div>
            </div>
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-4 text-center">
              <div className="text-[10px] uppercase font-extrabold text-amber-700 inline-flex items-center gap-0.5">
                <Star className="h-2.5 w-2.5 fill-current" />
                VIP
              </div>
              <div className="mt-1 text-3xl font-extrabold text-amber-800 tabular-nums">{guests.vip}</div>
            </div>
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 p-4 text-center">
              <div className="text-[10px] uppercase font-extrabold text-rose-700 inline-flex items-center gap-0.5">
                <Ban className="h-2.5 w-2.5" />
                Blacklist
              </div>
              <div className="mt-1 text-3xl font-extrabold text-rose-800 tabular-nums">{guests.blacklisted}</div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-600" />
            Bookings by Source (30 days)
          </h3>
          {bySource.length === 0 ? (
            <p className="text-sm text-slate-500 font-semibold text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-2">
              {bySource.slice(0, 6).map((s: any) => (
                <div key={s.source} className="flex items-center gap-3">
                  <span className="text-xl">{SOURCE_EMOJI[s.source] || '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold">{s.source.replace('_', ' ')}</span>
                      <span className="text-xs font-bold text-slate-500 tabular-nums">{s._count._all}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-purple-600" style={{ width: (s._count._all / bySource[0]._count._all * 100) + '%' }} />
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-700 tabular-nums">{formatPKR(s._sum.grandTotal ?? 0)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, to }: any) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600',
    rose: 'from-rose-500 to-red-600',
    blue: 'from-blue-500 to-cyan-600',
    amber: 'from-amber-500 to-orange-600',
  };
  return (
    <Link to={to} className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm hover:shadow-md transition group">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Link>
  );
}

function QuickLink({ to, icon: Icon, label, color }: any) {
  const colors: Record<string, string> = {
    indigo: 'from-indigo-500 to-purple-600',
    purple: 'from-purple-500 to-fuchsia-600',
    blue: 'from-blue-500 to-cyan-600',
    cyan: 'from-cyan-500 to-teal-600',
    teal: 'from-teal-500 to-emerald-600',
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
    violet: 'from-violet-500 to-purple-600',
  };
  return (
    <Link to={to} className="group rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4 hover:shadow-lg hover:-translate-y-0.5 transition">
      <div className={'h-11 w-11 rounded-xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition mb-2'}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs font-extrabold text-slate-900 dark:text-white">{label}</div>
    </Link>
  );
}
