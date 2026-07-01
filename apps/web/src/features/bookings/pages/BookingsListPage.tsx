import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookmarkPlus, Search, Filter, Calendar, Clock, User, Phone,
  Package, DollarSign, TrendingUp, AlertTriangle, CheckCircle2,
  XCircle, RefreshCw, ArrowRight, Sparkles, Wallet, Hourglass,
  Zap, Award, Eye, ChevronRight,
} from 'lucide-react';
import { bookingsApi, type BookingStatus } from '@/api/bookings.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const formatShortDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric' }).format(new Date(v));

const statusConfig: Record<BookingStatus, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:           { label: 'Pending',      color: '#64748b', bg: 'bg-slate-100 text-slate-700 border-slate-300',      icon: Hourglass },
  ADVANCE_PAID:      { label: 'Advance Paid', color: '#f59e0b', bg: 'bg-amber-100 text-amber-800 border-amber-300',      icon: Wallet },
  READY_FOR_PICKUP:  { label: 'Ready',        color: '#3b82f6', bg: 'bg-blue-100 text-blue-800 border-blue-300',         icon: Zap },
  CONVERTED:         { label: 'Converted',    color: '#10b981', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle2 },
  CANCELLED:         { label: 'Cancelled',    color: '#ef4444', bg: 'bg-rose-100 text-rose-800 border-rose-300',         icon: XCircle },
  EXPIRED:           { label: 'Expired',      color: '#dc2626', bg: 'bg-red-100 text-red-800 border-red-300',            icon: AlertTriangle },
};

type StatusFilter = 'all' | BookingStatus;

export default function BookingsListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data: summary } = useQuery({
    queryKey: ['bookings-summary'],
    queryFn: () => bookingsApi.summary(),
  });

  const { data: bookings = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['bookings-list', statusFilter],
    queryFn: () =>
      bookingsApi.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return bookings;
    const q = search.toLowerCase().trim();
    return bookings.filter(
      (b) =>
        b.bookingNumber.toLowerCase().includes(q) ||
        b.customer?.name.toLowerCase().includes(q) ||
        b.customer?.phone?.toLowerCase().includes(q),
    );
  }, [bookings, search]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Advance & Booking System
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Bookings</h2>
            <p className="mt-2 text-sm text-white/80">
              Customers ka advance manage karein — items reserve, pickup track, cancel/refund handle
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 backdrop-blur"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link to="/bookings/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <BookmarkPlus className="h-4 w-4" />
                New Booking
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Active Bookings"
          value={String(
            (summary?.counts.pending ?? 0) +
            (summary?.counts.advancePaid ?? 0) +
            (summary?.counts.ready ?? 0),
          )}
          sub={`${summary?.counts.pending ?? 0} pending • ${summary?.counts.ready ?? 0} ready`}
          icon={BookmarkPlus}
          color="blue"
        />
        <StatCard
          label="Advance Held"
          value={formatPKR(summary?.totalAdvanceHeld ?? 0)}
          sub="Customers ka paisa"
          icon={Wallet}
          color="emerald"
          isHighlight
        />
        <StatCard
          label="Balance Due"
          value={formatPKR(summary?.totalBalanceDue ?? 0)}
          sub="Delivery pe milega"
          icon={DollarSign}
          color="amber"
        />
        <StatCard
          label="Expiring Soon"
          value={String(summary?.expiringSoon ?? 0)}
          sub="Next 3 days"
          icon={AlertTriangle}
          color="rose"
        />
      </section>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label="All" count={bookings.length} />
        <FilterChip active={statusFilter === 'PENDING'} onClick={() => setStatusFilter('PENDING')} label="Pending" count={summary?.counts.pending ?? 0} color="slate" />
        <FilterChip active={statusFilter === 'ADVANCE_PAID'} onClick={() => setStatusFilter('ADVANCE_PAID')} label="Advance Paid" count={summary?.counts.advancePaid ?? 0} color="amber" />
        <FilterChip active={statusFilter === 'READY_FOR_PICKUP'} onClick={() => setStatusFilter('READY_FOR_PICKUP')} label="Ready" count={summary?.counts.ready ?? 0} color="blue" />
        <FilterChip active={statusFilter === 'CONVERTED'} onClick={() => setStatusFilter('CONVERTED')} label="Converted" count={summary?.counts.converted ?? 0} color="emerald" />
        <FilterChip active={statusFilter === 'CANCELLED'} onClick={() => setStatusFilter('CANCELLED')} label="Cancelled" count={summary?.counts.cancelled ?? 0} color="rose" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          placeholder="Search booking #, customer, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-12 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-blue-100 flex items-center justify-center">
            <BookmarkPlus className="h-9 w-9 text-blue-500" />
          </div>
          <h4 className="mt-4 text-lg font-bold text-slate-900">
            {search || statusFilter !== 'all' ? 'No bookings match' : 'Abhi koi booking nahi'}
          </h4>
          <p className="mt-1 text-sm text-slate-500">
            {search || statusFilter !== 'all' ? 'Try different filter' : 'Customer se advance le kar booking banayein'}
          </p>
          <Link to="/bookings/new">
            <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
              <BookmarkPlus className="h-4 w-4" />
              New Booking
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((booking) => {
            const cfg = statusConfig[booking.status];
            const StatusIcon = cfg.icon;
            const daysUntilPickup = booking.expectedPickupAt
              ? Math.ceil((new Date(booking.expectedPickupAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <Link
                key={booking.id}
                to={`/bookings/${booking.id}`}
                className="block rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-300 hover:shadow-lg transition p-4 group"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                    style={{ backgroundColor: `${cfg.color}20` }}
                  >
                    <StatusIcon className="h-6 w-6" style={{ color: cfg.color }} />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 font-mono text-sm">
                        {booking.bookingNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${cfg.bg}`}>
                        {cfg.label}
                      </span>
                      {daysUntilPickup !== null && daysUntilPickup <= 3 && daysUntilPickup >= 0 && booking.status !== 'CONVERTED' && booking.status !== 'CANCELLED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="h-2.5 w-2.5" />
                          {daysUntilPickup === 0 ? 'Today' : `${daysUntilPickup}d left`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                      <User className="h-3 w-3" />
                      <span className="font-semibold text-slate-800">{booking.customer?.name}</span>
                      {booking.customer?.phone && (
                        <>
                          <span>•</span>
                          <span>{booking.customer.phone}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created {formatShortDate(booking.createdAt)}
                      </span>
                      {booking.expectedPickupAt && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Pickup: {formatShortDate(booking.expectedPickupAt)}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {booking._count?.items ?? booking.items?.length ?? 0} item{(booking._count?.items ?? 1) !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {booking.notes && (
                      <div className="mt-1.5 text-[10px] text-slate-500 italic line-clamp-1">
                        📝 {booking.notes}
                      </div>
                    )}
                  </div>

                  {/* Amounts */}
                  <div className="text-right shrink-0">
                    <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                      {formatPKR(booking.total)}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-extrabold mt-0.5">
                      Paid: {formatPKR(booking.totalPaid)}
                    </div>
                    {booking.balanceDue > 0 && (
                      <div className="text-[10px] text-amber-700 font-extrabold">
                        Due: {formatPKR(booking.balanceDue)}
                      </div>
                    )}
                    {booking.totalRefunded > 0 && (
                      <div className="text-[10px] text-rose-700 font-extrabold">
                        Refunded: {formatPKR(booking.totalRefunded)}
                      </div>
                    )}
                    <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-600 group-hover:text-blue-700">
                      Details <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, isHighlight }: any) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/30',
  };
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${
      isHighlight ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
          <div className="text-xs text-slate-600 font-semibold mt-1">{sub}</div>
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label, count, color }: {
  active: boolean; onClick: () => void; label: string; count: number; color?: string;
}) {
  const colorMap: Record<string, string> = {
    slate: 'border-slate-300 bg-slate-50 text-slate-700',
    amber: 'border-amber-300 bg-amber-50 text-amber-700',
    blue: 'border-blue-300 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    rose: 'border-rose-300 bg-rose-50 text-rose-700',
  };
  const activeColor = color && colorMap[color] ? colorMap[color] : 'border-blue-500 bg-blue-100 text-blue-800';

  return (
    <button
      onClick={onClick}
      className={`h-9 px-3 rounded-xl border-2 font-bold text-xs inline-flex items-center gap-2 transition ${
        active
          ? `${activeColor} shadow-sm`
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
      }`}
    >
      {label}
      <span className={`px-1.5 py-0 rounded text-[10px] ${active ? 'bg-white/60' : 'bg-slate-100'}`}>
        {count}
      </span>
    </button>
  );
}
