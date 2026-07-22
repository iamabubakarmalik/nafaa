import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bed, Home, Calendar, Users, TrendingUp, TrendingDown,
  Target, Sparkles, Award, ArrowRight, Plus, Clock,
  DollarSign, Activity, AlertTriangle, Wifi, Wind,
  Sparkle, ChevronRight, Crown, Star,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '@/api/dashboard.api';
import { bookingsApi } from '../api/bookings.api';
import { roomsApi } from '../api/rooms.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { SubscriptionBanner } from '@/features/dashboard/components/SubscriptionBanner';
import { EmailVerifyBanner } from '@/components/auth/EmailVerifyBanner';
import {
  DashboardHero, HeroKpiCard, QuickStat, PnLCard,
  formatPercent, formatDate, PAYMENT_COLORS,
} from '@/features/dashboard/components/shared/DashboardShared';

const ROOM_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500',
  OCCUPIED: 'bg-blue-500',
  RESERVED: 'bg-amber-500',
  CLEANING: 'bg-cyan-500',
  MAINTENANCE: 'bg-orange-500',
  OUT_OF_ORDER: 'bg-rose-500',
  BLOCKED: 'bg-slate-500',
};

export default function HotelDashboardV2() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.overview,
    refetchInterval: 60_000,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['hotel-bookings-dash'],
    queryFn: () => bookingsApi.list(),
    refetchInterval: 30_000,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['hotel-rooms-dash'],
    queryFn: () => roomsApi.list({}),
    refetchInterval: 30_000,
  });

  const { data: roomSummary } = useQuery({
    queryKey: ['hotel-rooms-summary-dash'],
    queryFn: () => roomsApi.summary(),
    refetchInterval: 30_000,
  });

  const stats = data?.stats;
  const tenant = data?.tenant;

  const today = new Date().toISOString().split('T')[0];
  const bookingStats = {
    total: bookings.length,
    todayArrivals: bookings.filter((b: any) => b.checkInDate === today && b.status === 'CONFIRMED').length,
    todayDepartures: bookings.filter((b: any) => b.checkOutDate === today && b.status === 'CHECKED_IN').length,
    occupied: bookings.filter((b: any) => b.status === 'CHECKED_IN').length,
    confirmed: bookings.filter((b: any) => b.status === 'CONFIRMED').length,
    revenue: bookings.reduce((s: number, b: any) => s + Number(b.grandTotal || 0), 0),
  };

  const roomStats = {
    total: roomSummary?.total ?? rooms.length,
    available: roomSummary?.available ?? rooms.filter((r) => r.status === 'AVAILABLE').length,
    occupied: roomSummary?.occupied ?? rooms.filter((r) => r.status === 'OCCUPIED').length,
    cleaning: roomSummary?.cleaning ?? rooms.filter((r) => r.status === 'CLEANING').length,
    maintenance: roomSummary?.maintenance ?? rooms.filter((r) => r.status === 'MAINTENANCE').length,
    occupancyPct: roomSummary?.occupancyPct ?? 0,
  };

  const trendData = (data?.salesTrend7Days ?? []).map((p) => {
    const d = new Date(p.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return { ...p, label: dayName };
  });

  const sourceBreakdown = bookings.reduce((acc: any, b: any) => {
    const src = b.source || 'DIRECT';
    if (!acc[src]) acc[src] = { source: src, count: 0, revenue: 0 };
    acc[src].count += 1;
    acc[src].revenue += Number(b.grandTotal || 0);
    return acc;
  }, {});

  const sourceData = Object.values(sourceBreakdown).sort((a: any, b: any) => b.revenue - a.revenue);

  const growthVsYesterday = stats?.salesGrowthVsYesterday ?? 0;
  const growthVsLastMonth = stats?.salesGrowthVsLastMonth ?? 0;

  return (
    <div className="space-y-6">
      <SubscriptionBanner />
      <EmailVerifyBanner />

      <DashboardHero
        gradient="from-slate-950 via-indigo-900 to-purple-800"
        emoji="🏨"
        industryLabel="Hotel"
        industryBadgeColor="bg-indigo-500/30 border border-indigo-300/40"
        tenantName={tenant?.name}
        netProfit={stats?.netProfitToday ?? 0}
        salesToday={stats?.salesToday ?? 0}
        cogsToday={stats?.cogsToday ?? 0}
        expensesToday={stats?.expensesToday ?? 0}
        growthVsYesterday={growthVsYesterday}
        onRefresh={() => refetch()}
        isRefetching={isRefetching}
        posLabel="New Booking"
        posLink="/pos"
      />

      {/* HOTEL KPIs */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroKpiCard
          title="Occupancy"
          value={`${roomStats.occupancyPct.toFixed(0)}%`}
          subtitle={`${roomStats.occupied}/${roomStats.total} rooms`}
          icon={Bed}
          color="from-indigo-500 to-purple-700"
          isHighlight
        />
        <HeroKpiCard
          title="Today's Arrivals"
          value={bookingStats.todayArrivals}
          subtitle="Check-in scheduled"
          icon={TrendingUp}
          color="from-emerald-500 to-teal-600"
        />
        <HeroKpiCard
          title="Today's Departures"
          value={bookingStats.todayDepartures}
          subtitle="Check-out scheduled"
          icon={Home}
          color="from-amber-500 to-orange-600"
        />
        <HeroKpiCard
          title="In-house Guests"
          value={bookingStats.occupied}
          subtitle={`${bookingStats.confirmed} upcoming`}
          icon={Users}
          color="from-violet-500 to-purple-600"
        />
      </section>

      {/* ROOM STATUS PANEL */}
      <section className="rounded-3xl bg-gradient-to-br from-indigo-50 via-purple-50 to-fuchsia-50 border-2 border-indigo-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Bed className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-indigo-900">Room Status</h3>
              <p className="text-xs text-indigo-700">Live room inventory</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/hotel/rooms">
              <Button variant="secondary" size="sm">
                <Bed className="h-3.5 w-3.5" /> All Rooms
              </Button>
            </Link>
            <Link to="/hotel/housekeeping">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                <Sparkle className="h-3.5 w-3.5" /> Housekeeping
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <div className="rounded-2xl bg-white border-2 border-emerald-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-emerald-700">Available</div>
            <div className="text-2xl font-extrabold text-emerald-900 tabular-nums mt-1">{roomStats.available}</div>
          </div>
          <div className="rounded-2xl bg-white border-2 border-blue-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-blue-700">Occupied</div>
            <div className="text-2xl font-extrabold text-blue-900 tabular-nums mt-1">{roomStats.occupied}</div>
          </div>
          <div className="rounded-2xl bg-white border-2 border-cyan-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-cyan-700">Cleaning</div>
            <div className="text-2xl font-extrabold text-cyan-900 tabular-nums mt-1">{roomStats.cleaning}</div>
          </div>
          <div className="rounded-2xl bg-white border-2 border-orange-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-orange-700">Maintenance</div>
            <div className="text-2xl font-extrabold text-orange-900 tabular-nums mt-1">{roomStats.maintenance}</div>
          </div>
          <div className="rounded-2xl bg-white border-2 border-violet-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-violet-700">Total</div>
            <div className="text-2xl font-extrabold text-violet-900 tabular-nums mt-1">{roomStats.total}</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-3">
            <div className="text-[10px] uppercase font-extrabold text-white/80">Occupancy</div>
            <div className="text-2xl font-extrabold tabular-nums mt-1">{roomStats.occupancyPct.toFixed(0)}%</div>
          </div>
        </div>

        {/* Visual room grid */}
        {rooms.length > 0 && (
          <div className="mt-4 rounded-2xl bg-white border border-indigo-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-indigo-700 mb-2">Room Floor View</div>
            <div className="grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-15 gap-1">
              {rooms.slice(0, 30).map((room: any) => (
                <Link key={room.id} to="/hotel/rooms"
                  className="relative rounded-lg border-2 border-slate-200 hover:border-indigo-400 bg-white p-1.5 text-center text-xs transition group">
                  <div className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-white ${ROOM_STATUS_COLORS[room.status] || 'bg-slate-500'} ${room.status === 'OCCUPIED' ? 'animate-pulse' : ''}`} />
                  <div className="font-extrabold text-slate-900 tabular-nums">{room.roomNumber}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* TRENDS */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900">7-Day Revenue</h3>
              <p className="text-sm text-slate-500">Bookings & folio trend</p>
            </div>
            <Link to="/reports" className="text-indigo-700 text-sm font-bold inline-flex items-center gap-1">
              Reports <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {trendData.length >= 2 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="hSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="hProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="sales" name="Revenue" stroke="#6366f1" fill="url(#hSales)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#hProfit)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">Need more data</div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Booking Sources</h3>
              <p className="text-sm text-slate-500">Where guests come from</p>
            </div>
          </div>
          {sourceData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} dataKey="revenue" nameKey="source" cx="50%" cy="45%" outerRadius={80} innerRadius={40}
                    label={(entry: any) => {
                      const total = sourceData.reduce((s: number, x: any) => s + x.revenue, 0);
                      return total > 0 ? `${((entry.revenue / total) * 100).toFixed(0)}%` : '0%';
                    }}
                    labelLine={false}>
                    {sourceData.map((_: any, idx: number) => (
                      <Cell key={idx} fill={['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f97316'][idx % 7]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">No booking data</div>
          )}
        </div>
      </section>

      {/* P&L */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Profit & Loss — Is Mahina</h3>
            <p className="text-sm text-slate-500">Hotel monthly performance</p>
          </div>
          {growthVsLastMonth !== 0 && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold ${
              growthVsLastMonth >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {growthVsLastMonth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {formatPercent(growthVsLastMonth)}
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <PnLCard label="Revenue" value={formatPKR(stats?.salesMonth ?? 0)} sub={`${bookingStats.total} bookings`} color="emerald" />
          <PnLCard label="F&B Cost" value={formatPKR(stats?.cogsMonth ?? 0)} sub="Extras cost" color="rose" />
          <PnLCard label="Expenses" value={formatPKR(stats?.expensesMonth ?? 0)} sub="Rent, staff, utilities" color="amber" />
          <PnLCard label="Net Profit" value={formatPKR(stats?.netProfitMonth ?? 0)} sub="Bottom line" color="violet" isHighlight />
        </div>
      </section>

      {/* QUICK STATS */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <QuickStat title="Room Types" value={stats?.totalProducts ?? 0} icon={Bed} tone="violet" link="/hotel/room-types" />
        <QuickStat title="Rooms" value={roomStats.total} icon={Home} tone="blue" link="/hotel/rooms" />
        <QuickStat title="Bookings" value={bookingStats.total} icon={Calendar} tone="emerald" link="/hotel/bookings" />
        <QuickStat title="Guests" value={stats?.totalCustomers ?? 0} icon={Users} tone="pink" link="/hotel/guests" />
        <QuickStat title="Housekeeping" value={roomStats.cleaning} icon={Sparkle} tone="cyan" link="/hotel/housekeeping" alert />
        <QuickStat title="Maintenance" value={roomStats.maintenance} icon={AlertTriangle} tone="orange" link="/hotel/rooms" alert />
      </section>

      {/* RECENT BOOKINGS */}
      {bookings.length > 0 && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">Live Bookings</h3>
                <p className="text-sm text-slate-500">Latest reservations</p>
              </div>
            </div>
            <Link to="/hotel/bookings" className="text-indigo-700 text-sm font-bold inline-flex items-center gap-1">
              All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {bookings.slice(0, 8).map((b: any) => {
              const statusColor = b.status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-700' :
                b.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                b.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' :
                b.status === 'CHECKED_OUT' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700';
              return (
                <Link key={b.id} to={`/hotel/bookings/${b.id}`} className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Bed className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-slate-900 text-sm">{b.bookingNumber}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${statusColor}`}>{b.status.replace('_', ' ')}</span>
                      </div>
                      <div className="text-xs text-slate-600 font-semibold mt-0.5">
                        {b.guestName} • {b.nights}n • {b.bookedRooms?.length || 0} room{(b.bookedRooms?.length || 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(b.grandTotal)}</div>
                    <div className="text-[10px] text-slate-500 font-bold mt-0.5">{formatDate(b.createdAt)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
