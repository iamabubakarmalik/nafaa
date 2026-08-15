import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookmarkPlus, Search, Calendar, Clock, User,
  Package, DollarSign, AlertTriangle, CheckCircle2,
  XCircle, RefreshCw, ChevronRight, Sparkles, Wallet, Hourglass,
  Zap, GraduationCap, Printer, Download, X,
} from 'lucide-react';
import { bookingsApi, type BookingStatus } from '@modules/bookings/api/bookings.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA BOOKINGS LIST — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 GLOBAL — har industry (jeweler, tailor, mobile, carpet...)
   🌙 Dark mode complete
   🎓 Teacher modal — "advance/booking kya hota hai" universal
   ⌨️  / = search • N = naya • 1-6 = filters • Esc = band
   ⚠️ Expiring soon banner • 🖨️ Print • 📊 CSV export
   ═════════════════════════════════════════════════════════════ */

const formatShortDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric' }).format(new Date(v));

const statusConfig: Record<BookingStatus, { label: string; color: string; bg: string; darkBg: string; icon: any }> = {
  PENDING:          { label: 'Pending',      color: '#64748b', bg: 'bg-slate-100 text-slate-700 border-slate-300',      darkBg: 'dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/40',    icon: Hourglass },
  ADVANCE_PAID:     { label: 'Advance Paid', color: '#f59e0b', bg: 'bg-amber-100 text-amber-800 border-amber-300',      darkBg: 'dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',    icon: Wallet },
  READY_FOR_PICKUP: { label: 'Ready',        color: '#3b82f6', bg: 'bg-blue-100 text-blue-800 border-blue-300',         darkBg: 'dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40',       icon: Zap },
  CONVERTED:        { label: 'Converted',    color: '#10b981', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', darkBg: 'dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40', icon: CheckCircle2 },
  CANCELLED:        { label: 'Cancelled',    color: '#ef4444', bg: 'bg-rose-100 text-rose-800 border-rose-300',         darkBg: 'dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40',       icon: XCircle },
  EXPIRED:          { label: 'Expired',      color: '#dc2626', bg: 'bg-red-100 text-red-800 border-red-300',            darkBg: 'dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40',          icon: AlertTriangle },
};

type StatusFilter = 'all' | BookingStatus;

const FILTER_ORDER: StatusFilter[] = ['all', 'PENDING', 'ADVANCE_PAID', 'READY_FOR_PICKUP', 'CONVERTED', 'CANCELLED'];

export default function BookingsListPage() {
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showTeacher, setShowTeacher] = useState(false);

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

  /* Expiring soon list — hero banner ke liye */
  const expiringSoonList = useMemo(() => {
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    return bookings.filter((b) => {
      if (!b.expectedPickupAt) return false;
      if (b.status === 'CONVERTED' || b.status === 'CANCELLED' || b.status === 'EXPIRED') return false;
      const diff = new Date(b.expectedPickupAt).getTime() - now;
      return diff >= 0 && diff <= threeDays;
    }).slice(0, 5);
  }, [bookings]);

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const summaryRows = [
      [`Bookings Report — ${tenantName || 'My Store'}`],
      [`${shopName ? `Shop: ${shopName}  •  ` : ''}Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Total: ${filtered.length}  •  Advance Held: ${(summary?.totalAdvanceHeld ?? 0).toFixed(2)}  •  Due: ${(summary?.totalBalanceDue ?? 0).toFixed(2)}`],
      [''],
    ];
    const headers = ['Booking #', 'Customer', 'Phone', 'Status', 'Total', 'Paid', 'Balance', 'Refunded', 'Items', 'Created', 'Pickup', 'Notes'];
    const rows = filtered.map((b) => [
      b.bookingNumber,
      b.customer?.name || '',
      b.customer?.phone || '',
      statusConfig[b.status]?.label || b.status,
      b.total.toFixed(2),
      b.totalPaid.toFixed(2),
      b.balanceDue.toFixed(2),
      (b.totalRefunded || 0).toFixed(2),
      b._count?.items ?? b.items?.length ?? 0,
      new Date(b.createdAt).toLocaleDateString('en-PK'),
      b.expectedPickupAt ? new Date(b.expectedPickupAt).toLocaleDateString('en-PK') : '',
      b.notes || '',
    ]);
    const csv = [...summaryRows, headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} bookings export ho gayi`);
  };

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); window.location.href = '/bookings/new'; }
      const num = Number(e.key);
      if (num >= 1 && num <= FILTER_ORDER.length) {
        e.preventDefault();
        setStatusFilter(FILTER_ORDER[num - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher]);

  /* Body scroll lock jab teacher khula ho */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  const activeCount = (summary?.counts.pending ?? 0) + (summary?.counts.advancePaid ?? 0) + (summary?.counts.ready ?? 0);
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {showTeacher && <BookingsTeacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ PRINT-ONLY HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-blue-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              📚 {tenantName || 'My Store'} — Bookings Report
            </h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `Shop: ${shopName}  •  ` : ''}{filtered.length} bookings • Advance held: {formatPKR(summary?.totalAdvanceHeld ?? 0)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500">Generated</div>
            <div className="text-xs font-bold text-slate-900">{printDate}</div>
          </div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Advance & Booking
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-emerald-200">🏪 {shopName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">📚 Bookings</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-blue-200">{activeCount}</strong> active
              <span className="opacity-50 mx-1.5">•</span>
              Advance <strong className="text-emerald-300">{formatPKR(summary?.totalAdvanceHeld ?? 0)}</strong>
              {(summary?.totalBalanceDue ?? 0) > 0 && (
                <>
                  <span className="opacity-50 mx-1.5">•</span>
                  Due <strong className="text-amber-300">{formatPKR(summary?.totalBalanceDue ?? 0)}</strong>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              title="Booking kya hai?"
            >
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => window.print()}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={exportCSV}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </button>
            <Link
              to="/bookings/new"
              className="h-11 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xl transition"
            >
              <BookmarkPlus className="h-4 w-4" /> Nayi Booking <Kbd>N</Kbd>
            </Link>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>N</Kbd><span className="text-white/60">Nayi booking</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>1</Kbd>–<Kbd>6</Kbd><span className="text-white/60">Filters</span>
        </div>
      </section>

      {/* ═══ EXPIRING SOON BANNER ═══ */}
      {expiringSoonList.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-4 print:hidden">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/40 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-amber-900 dark:text-amber-200 text-sm">
                ⏰ {expiringSoonList.length} bookings 3 din me pickup wali hain
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {expiringSoonList.map((b) => {
                  const days = Math.ceil((new Date(b.expectedPickupAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <Link
                      key={b.id}
                      to={`/bookings/${b.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-500/40 hover:border-amber-400 dark:hover:border-amber-500/60 text-[11px] font-extrabold text-amber-900 dark:text-amber-200 transition"
                    >
                      {b.bookingNumber}
                      <span className="text-amber-600 dark:text-amber-400">· {days === 0 ? 'Aaj' : `${days}d`}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <button
              onClick={() => setStatusFilter('READY_FOR_PICKUP')}
              className="h-10 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shrink-0 transition shadow-md inline-flex items-center gap-1.5"
            >
              Ready wale dekho →
            </button>
          </div>
        </section>
      )}

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
        <Kpi
          icon={BookmarkPlus} tone="blue"
          label="Active Bookings" value={activeCount}
          sub={`${summary?.counts.pending ?? 0} pending • ${summary?.counts.ready ?? 0} ready`}
        />
        <Kpi
          icon={Wallet} tone="emerald"
          label="Advance Held" value={formatPKR(summary?.totalAdvanceHeld ?? 0)}
          sub="Customers ka paisa"
          isHighlight
        />
        <Kpi
          icon={DollarSign} tone="amber"
          label="Balance Due" value={formatPKR(summary?.totalBalanceDue ?? 0)}
          sub="Delivery pe milega"
        />
        <Kpi
          icon={AlertTriangle} tone="rose"
          label="Expiring Soon" value={summary?.expiringSoon ?? 0}
          sub="Agle 3 din me"
          onClick={(summary?.expiringSoon ?? 0) > 0 ? () => setStatusFilter('READY_FOR_PICKUP') : undefined}
        />
      </section>

      {/* ═══ FILTERS ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Booking #, customer, phone... (/ shortcut)"
            className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label="Sab" count={bookings.length} />
          <FilterChip active={statusFilter === 'PENDING'} onClick={() => setStatusFilter('PENDING')} label="Pending" count={summary?.counts.pending ?? 0} color="slate" />
          <FilterChip active={statusFilter === 'ADVANCE_PAID'} onClick={() => setStatusFilter('ADVANCE_PAID')} label="Advance Paid" count={summary?.counts.advancePaid ?? 0} color="amber" />
          <FilterChip active={statusFilter === 'READY_FOR_PICKUP'} onClick={() => setStatusFilter('READY_FOR_PICKUP')} label="Ready" count={summary?.counts.ready ?? 0} color="blue" />
          <FilterChip active={statusFilter === 'CONVERTED'} onClick={() => setStatusFilter('CONVERTED')} label="Converted" count={summary?.counts.converted ?? 0} color="emerald" />
          <FilterChip active={statusFilter === 'CANCELLED'} onClick={() => setStatusFilter('CANCELLED')} label="Cancelled" count={summary?.counts.cancelled ?? 0} color="rose" />

          <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
            {filtered.length} bookings
          </div>
        </div>
      </section>

      {/* ═══ LIST ═══ */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 sm:p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
            <BookmarkPlus className="h-9 w-9 text-blue-500 dark:text-blue-400" />
          </div>
          <h4 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
            {search || statusFilter !== 'all' ? 'Kuch nahi mila' : 'Abhi koi booking nahi'}
          </h4>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-md mx-auto">
            {search || statusFilter !== 'all'
              ? 'Filter change kar ke dekho ya search clear karo'
              : 'Customer se advance le kar item reserve karo — full payment aur pickup baad me'}
          </p>
          <div className="mt-5 flex gap-2 justify-center flex-wrap">
            {(search || statusFilter !== 'all') ? (
              <Button variant="secondary" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
                <X className="h-4 w-4" /> Filter hatao
              </Button>
            ) : (
              <>
                <button
                  onClick={() => setShowTeacher(true)}
                  className="h-11 px-4 rounded-xl bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-extrabold inline-flex items-center gap-1.5 border-2 border-amber-300 dark:border-amber-500/40 transition"
                >
                  <GraduationCap className="h-4 w-4" /> Pehle Seekh Lo
                </button>
                <Link to="/bookings/new">
                  <Button className="bg-blue-600 hover:bg-blue-700 font-extrabold">
                    <BookmarkPlus className="h-4 w-4" /> Nayi Booking
                  </Button>
                </Link>
              </>
            )}
          </div>
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
                className="block rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-lg dark:hover:shadow-blue-500/10 transition p-4 group"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Icon */}
                  <div
                    className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                    style={{ backgroundColor: `${cfg.color}20` }}
                  >
                    <StatusIcon className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: cfg.color }} />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 dark:text-white font-mono text-sm">
                        {booking.bookingNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${cfg.bg} ${cfg.darkBg}`}>
                        {cfg.label}
                      </span>
                      {daysUntilPickup !== null && daysUntilPickup <= 3 && daysUntilPickup >= 0 && booking.status !== 'CONVERTED' && booking.status !== 'CANCELLED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
                          <Clock className="h-2.5 w-2.5" />
                          {daysUntilPickup === 0 ? 'Aaj' : `${daysUntilPickup}d baaki`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 dark:text-slate-300">
                      <User className="h-3 w-3" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{booking.customer?.name}</span>
                      {booking.customer?.phone && (
                        <>
                          <span className="opacity-50">•</span>
                          <span>{booking.customer.phone}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Banayi {formatShortDate(booking.createdAt)}
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
                      <div className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 italic line-clamp-1">
                        📝 {booking.notes}
                      </div>
                    )}
                  </div>

                  {/* Amounts */}
                  <div className="text-right shrink-0">
                    <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {formatPKR(booking.total)}
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold mt-0.5">
                      Paid: {formatPKR(booking.totalPaid)}
                    </div>
                    {booking.balanceDue > 0 && (
                      <div className="text-[10px] text-amber-700 dark:text-amber-400 font-extrabold">
                        Due: {formatPKR(booking.balanceDue)}
                      </div>
                    )}
                    {booking.totalRefunded > 0 && (
                      <div className="text-[10px] text-rose-700 dark:text-rose-400 font-extrabold">
                        Refunded: {formatPKR(booking.totalRefunded)}
                      </div>
                    )}
                    <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                      Details <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 10mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   BOOKINGS TEACHER — Universal guide
   ═════════════════════════════════════════════════════════════ */
function BookingsTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-blue-200 dark:border-blue-500/30 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/15 dark:to-indigo-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Bookings — Complete Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Booking = advance/token.</strong> Customer ne cheez pasand ki, thora paisa diya,
            baaki delivery pe dega. Tab tak item aap ki taraf reserved.
          </p>

          {/* Live misal */}
          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-blue-700 dark:text-blue-300">
              💍 Misal: Sonar ki dukan
            </div>
            <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 p-2">
                <strong>Total:</strong> Rs 80,000 (haar) &nbsp;•&nbsp; <strong>Advance:</strong> Rs 20,000 today
              </div>
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 p-2 font-extrabold text-emerald-700 dark:text-emerald-300">
                ✅ 3 din baad customer aaya → Rs 60,000 diya → haar pickup → CONVERTED (sale ban gayi)
              </div>
            </div>
          </div>

          {/* Statuses explained */}
          <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-600 dark:text-slate-400 mb-2">
              📊 6 Statuses ka matlab
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              <div>⏳ <strong>Pending</strong> — abhi paisa nahi diya</div>
              <div>💰 <strong>Advance Paid</strong> — token mila, kaam chal raha</div>
              <div>⚡ <strong>Ready</strong> — item tayyar, pickup ka intezaar</div>
              <div>✅ <strong>Converted</strong> — sale ban gayi, done!</div>
              <div>❌ <strong>Cancelled</strong> — customer ne mana kiya</div>
              <div>⚠️ <strong>Expired</strong> — pickup date nikal gayi</div>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>💼 Kaunse dhande me?</strong> — Jeweler, tailor, mobile (order booking), carpet (custom), electronics — jahan advance chalta hai</TipRow>
            <TipRow><strong>💰 Advance Held</strong> — customer ka paisa aap ke paas hai (KPI me total dikhta hai)</TipRow>
            <TipRow><strong>⏰ Expiring Soon banner</strong> — 3 din me pickup wali bookings alag dikhti hain — customer ko WhatsApp karo!</TipRow>
            <TipRow><strong>Cancel = auto refund</strong> — jitna advance diya tha, wo record ho jata hai</TipRow>
            <TipRow><strong>⌨️ N</strong> — nayi booking &nbsp;•&nbsp; <strong>1-6</strong> — filters &nbsp;•&nbsp; <strong>/</strong> — search</TipRow>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            💡 <strong>Poora chakkar:</strong> Customer aaye → advance liya (Booking) → item tayyar (Ready) →
            pickup pe baqi payment (Converted). Ek page pe sab track!
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 font-extrabold shadow-lg shadow-blue-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
          </Button>
        </div>
      </div>
    </div>
  );
}

function TipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm text-[9px]">
      {children}
    </kbd>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, isHighlight, onClick }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/40',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={[
        'rounded-2xl border-2 p-3 sm:p-4 shadow-sm text-left w-full transition-all',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : '',
        isHighlight
          ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border-emerald-300 dark:border-emerald-500/40'
          : 'bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-slate-200 dark:border-slate-800',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}

function FilterChip({ active, onClick, label, count, color }: {
  active: boolean; onClick: () => void; label: string; count: number; color?: string;
}) {
  const colorMap: Record<string, string> = {
    slate: 'border-slate-400 bg-slate-100 text-slate-700 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-200',
    amber: 'border-amber-400 bg-amber-100 text-amber-700 dark:border-amber-500 dark:bg-amber-500/20 dark:text-amber-300',
    blue: 'border-blue-400 bg-blue-100 text-blue-700 dark:border-blue-500 dark:bg-blue-500/20 dark:text-blue-300',
    emerald: 'border-emerald-400 bg-emerald-100 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-300',
    rose: 'border-rose-400 bg-rose-100 text-rose-700 dark:border-rose-500 dark:bg-rose-500/20 dark:text-rose-300',
  };
  const activeColor = color && colorMap[color]
    ? colorMap[color]
    : 'border-blue-500 bg-blue-100 text-blue-800 dark:border-blue-500 dark:bg-blue-500/20 dark:text-blue-300';

  return (
    <button
      onClick={onClick}
      className={`h-9 px-3 rounded-xl border-2 font-extrabold text-xs inline-flex items-center gap-2 transition ${
        active
          ? `${activeColor} shadow-sm`
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      {label}
      <span className={`px-1.5 py-0 rounded text-[10px] tabular-nums ${active ? 'bg-white/60 dark:bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
        {count}
      </span>
    </button>
  );
}
