import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Wrench, Plus, Search, ArrowLeft, Smartphone, Clock, CheckCircle2,
  AlertCircle, TrendingUp, Package, Download, Calendar, Phone, User,
  ChevronRight, X, DollarSign, GraduationCap, ArrowRight, RefreshCw,
  Printer, Trophy, Flame, Timer, MessageCircle, Activity, Zap, Ban,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import {
  repairsApi,
  type RepairStatus,
  type RepairPriority,
  REPAIR_STATUS_LABELS,
  REPAIR_STATUS_COLORS,
  REPAIR_STATUS_EMOJI,
  REPAIR_STATUS_URDU,
  STATUS_NEXT_ACTIONS,
} from '../api/repairs.api';
import { RepairStatusBadge } from '../components/repairs/RepairStatusBadge';
import { RepairPriorityBadge } from '../components/repairs/RepairPriorityBadge';
import { CreateRepairTicketModal } from '../components/repairs/CreateRepairTicketModal';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA REPAIR TICKETS — FULL BEST v2
   ─────────────────────────────────────────────────────────────
   🎓 Teacher modal — Repair workflow explain
   🧭 3-step guide — Receive → Repair → Deliver
   ⏰ Overdue alert (past estimated_ready + open status)
   🏆 Insights — urgent + emergency + revenue-per-ticket
   🔍 Status + Priority filters + / search + Esc close
   🖨️ Print/PDF + CSV (shop summary header)
   📱 WhatsApp quick contact
   🌙 Dark mode perfect + 📱 mobile → 4K
   ═════════════════════════════════════════════════════════════ */

type StatusFilter = 'ALL' | RepairStatus;
type PriorityFilter = 'ALL' | RepairPriority;

const HOUR = 36e5;
const OPEN_STATUSES: RepairStatus[] = [
  'RECEIVED', 'DIAGNOSED', 'AWAITING_APPROVAL', 'AWAITING_PARTS', 'IN_PROGRESS',
];

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Abhi';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-PK');
};

export default function RepairTicketsPage() {
  const tenantName = useAuthStore((s: any) => s.tenant?.name);
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  /* Debounced search */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const { data: stats } = useQuery({
    queryKey: ['repair-stats'],
    queryFn: repairsApi.stats,
  });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['repair-tickets', statusFilter, priorityFilter],
    queryFn: () =>
      repairsApi.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
        limit: 200,
      }),
  });

  const tickets = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return tickets;
    return tickets.filter(
      (t) =>
        t.ticketNumber.toLowerCase().includes(q) ||
        (t.imei1 || '').includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.customerPhone.includes(q) ||
        t.deviceBrand.toLowerCase().includes(q) ||
        t.deviceModel.toLowerCase().includes(q) ||
        t.reportedIssue.toLowerCase().includes(q),
    );
  }, [tickets, debouncedSearch]);

  /* ─── Status counts ────────────────────────────────── */
  const statusCounts = useMemo(() => {
    const counts: Record<RepairStatus, number> = {
      RECEIVED: 0, DIAGNOSED: 0, AWAITING_APPROVAL: 0, AWAITING_PARTS: 0,
      IN_PROGRESS: 0, READY: 0, DELIVERED: 0, CANCELLED: 0, UNREPAIRABLE: 0,
    };
    stats?.byStatus.forEach((s) => { counts[s.status] = s.count; });
    return counts;
  }, [stats]);

  /* ─── Overdue tickets ──────────────────────────────── */
  const overdueTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (!t.estimatedReadyAt) return false;
      if (!OPEN_STATUSES.includes(t.status)) return false;
      return new Date(t.estimatedReadyAt).getTime() < Date.now();
    });
  }, [tickets]);

  /* ─── Insights ─────────────────────────────────────── */
  const urgentEmergencyCount = useMemo(
    () => tickets.filter((t) => (t.priority === 'URGENT' || t.priority === 'EMERGENCY') && OPEN_STATUSES.includes(t.status)).length,
    [tickets],
  );

  const topBrand = useMemo(() => {
    const map = new Map<string, number>();
    tickets.forEach((t) => map.set(t.deviceBrand, (map.get(t.deviceBrand) || 0) + 1));
    const arr = [...map.entries()].sort((a, b) => b[1] - a[1]);
    return arr[0] ? { name: arr[0][0], count: arr[0][1] } : null;
  }, [tickets]);

  const readyForPickup = statusCounts.READY;

  /* ─── Setup step (3-step guide) ────────────────────── */
  const setupStep = tickets.length === 0 ? 1
    : statusCounts.IN_PROGRESS > 0 || statusCounts.DIAGNOSED > 0 || statusCounts.AWAITING_PARTS > 0 || statusCounts.AWAITING_APPROVAL > 0 ? 2
    : 3;

  /* ─── Keyboard shortcuts ───────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (showTeacher) setShowTeacher(false);
        if (search) setSearch('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, search]);

  /* ─── CSV ──────────────────────────────────────────── */
  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`Repair Tickets Report — ${tenantName || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Total: ${filtered.length}  •  Open: ${stats?.openTickets ?? 0}  •  Ready: ${readyForPickup}  •  Overdue: ${overdueTickets.length}`],
      [''],
    ];
    const headers = ['Ticket #', 'Device', 'IMEI', 'Customer', 'Phone', 'Issue', 'Status', 'Priority', 'Estimate', 'Paid', 'Balance', 'Technician', 'Received'];
    const rows = filtered.map((t) => [
      t.ticketNumber,
      `${t.deviceBrand} ${t.deviceModel}`,
      t.imei1 || '',
      t.customerName,
      t.customerPhone,
      t.reportedIssue.replace(/\n/g, ' '),
      t.status,
      t.priority,
      Number(t.totalCost).toFixed(2),
      Number(t.paidAmount).toFixed(2),
      Number(t.balanceDue).toFixed(2),
      t.technicianName || '',
      new Date(t.receivedAt).toLocaleString('en-PK'),
    ]);
    const csv = [...summary, headers, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repair-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <div className="space-y-4 sm:space-y-5 pb-8 print:space-y-3">
      {/* ═══ PRINT-ONLY HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-orange-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              🔧 {tenantName || 'My Store'}
            </h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `Shop: ${shopName}  •  ` : ''}Repair Service — Tickets Report
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500">Generated</div>
            <div className="text-xs font-bold text-slate-900">{printDate}</div>
          </div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 dark:from-slate-950 dark:via-orange-950 dark:to-amber-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-orange-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Wrench className="h-3.5 w-3.5 text-amber-300" /> Mobile Industry
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-emerald-200">🏪 {shopName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
              🔧 Repair Service
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-emerald-300">{readyForPickup}</strong> ready
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-amber-300">{stats?.openTickets ?? 0}</strong> open
              {overdueTickets.length > 0 && (
                <>
                  <span className="opacity-50 mx-1.5">•</span>
                  <strong className="text-rose-300">⏰ {overdueTickets.length} overdue</strong>
                </>
              )}
              {stats && stats.monthRevenue > 0 && (
                <>
                  <span className="opacity-50 mx-1.5">•</span>
                  Month <strong className="text-emerald-300">{formatPKR(stats.monthRevenue)}</strong>
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              title="Repair workflow kaise chalta hai?"
            >
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Kaise Kaam Karta Hai?</span>
              <span className="sm:hidden">?</span>
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
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-orange-900 hover:bg-slate-100 font-extrabold shadow-2xl"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Naya Ticket</span>
              <span className="sm:hidden">Naya</span>
            </Button>
          </div>
        </div>

        {/* 3-step guide */}
        <div className="relative mt-4 flex items-center gap-2 sm:gap-3 flex-wrap">
          <StepPill n={1} label="Phone Receive" state={setupStep > 1 ? 'done' : setupStep === 1 ? 'active' : 'todo'} />
          <ArrowRight className="h-4 w-4 text-white/40 shrink-0" />
          <StepPill n={2} label="Diagnose & Repair" state={setupStep > 2 ? 'done' : setupStep === 2 ? 'active' : 'todo'} />
          <ArrowRight className="h-4 w-4 text-white/40 shrink-0" />
          <StepPill n={3} label="Deliver & Kamao" state={setupStep === 3 ? 'done' : 'todo'} />
        </div>

        {/* Insights strip */}
        {(topBrand || urgentEmergencyCount > 0 || readyForPickup > 0) && tickets.length > 0 && (
          <div className="relative mt-3 flex flex-wrap gap-2">
            {topBrand && (
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md px-3 py-2 text-xs font-extrabold">
                <Trophy className="h-4 w-4 text-amber-300" />
                <span className="text-white/70">Sab se zyada:</span>
                <span>{topBrand.name}</span>
                <span className="text-amber-300 tabular-nums">×{topBrand.count}</span>
              </div>
            )}
            {urgentEmergencyCount > 0 && (
              <div className="inline-flex items-center gap-2 rounded-xl bg-rose-500/25 border border-rose-300/40 backdrop-blur-md px-3 py-2 text-xs font-extrabold">
                <Flame className="h-4 w-4 text-rose-200" />
                <span className="text-white/70">Urgent/Emergency:</span>
                <span className="text-rose-200 tabular-nums">{urgentEmergencyCount} open</span>
              </div>
            )}
            {readyForPickup > 0 && (
              <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/25 border border-emerald-300/40 backdrop-blur-md px-3 py-2 text-xs font-extrabold">
                <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                <span className="text-white/70">Ready for pickup:</span>
                <span className="text-emerald-200 tabular-nums">{readyForPickup}</span>
                <span className="text-white/60">— customer ko call karo!</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ═══ TEACHER MODAL ═══ */}
      {showTeacher && (
        <RepairTeacher
          hasTickets={tickets.length > 0}
          onClose={() => setShowTeacher(false)}
          onStart={() => {
            setShowTeacher(false);
            setShowCreateModal(true);
          }}
        />
      )}

      {/* ═══ OVERDUE ALERT ═══ */}
      {overdueTickets.length > 0 && (
        <section className="rounded-2xl border-2 border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 p-3 sm:p-4 print:hidden">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/40 shrink-0">
              <Timer className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-sm text-rose-900 dark:text-rose-200">
                ⏰ {overdueTickets.length} ticket{overdueTickets.length > 1 ? 's' : ''} estimated ready date se guzar chuke!
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {overdueTickets.slice(0, 8).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setSearch(t.ticketNumber); }}
                    className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-500/40 px-2 py-1 text-[11px] font-extrabold text-rose-800 dark:text-rose-300 hover:border-rose-500 transition"
                  >
                    {t.deviceBrand} {t.deviceModel}
                    <span className="text-rose-500 dark:text-rose-400 font-mono">{t.ticketNumber}</span>
                  </button>
                ))}
                {overdueTickets.length > 8 && (
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 px-2 py-1">
                    +{overdueTickets.length - 8} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ KPIs ═══ */}
      {stats && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Kpi label="Open Tickets" value={stats.openTickets} sub="Kaam ka intezaar" icon={Clock} tone="orange" />
          <Kpi label="Aaj Received" value={stats.todayCount} sub="New today" icon={Calendar} tone="blue" />
          <Kpi label="Month Revenue" value={formatPKR(stats.monthRevenue)} sub="Is mahine" icon={TrendingUp} tone="emerald" />
          <Kpi label="Total Delivered" value={stats.totalDelivered} sub="Ab tak complete" icon={CheckCircle2} tone="violet" />
        </section>
      )}

      {/* ═══ STATUS CHIPS ═══ */}
      <section className="flex gap-1.5 overflow-x-auto pb-1 print:hidden">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`shrink-0 px-3 h-10 rounded-xl text-xs font-extrabold transition border-2 ${
            statusFilter === 'ALL'
              ? 'bg-orange-600 text-white border-orange-600 shadow-md'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-orange-300'
          }`}
        >
          Sab <span className="tabular-nums opacity-70">({tickets.length})</span>
        </button>
        {(['RECEIVED', 'DIAGNOSED', 'AWAITING_APPROVAL', 'AWAITING_PARTS', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED', 'UNREPAIRABLE'] as RepairStatus[]).map((status) => {
          const active = statusFilter === status;
          const count = statusCounts[status];
          if (count === 0 && !active) return null;
          const colors = REPAIR_STATUS_COLORS[status];
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(active ? 'ALL' : status)}
              className={`shrink-0 inline-flex items-center gap-1 px-3 h-10 rounded-xl text-xs font-extrabold border-2 transition ${
                active
                  ? `${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText} border-current shadow-md`
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-orange-300'
              }`}
            >
              <span>{REPAIR_STATUS_EMOJI[status]}</span>
              {REPAIR_STATUS_LABELS[status]}
              <span className="tabular-nums opacity-70">({count})</span>
            </button>
          );
        })}
      </section>

      {/* ═══ TOOLBAR ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 print:hidden">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ticket # / IMEI / customer / device / issue... (/ shortcut)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-500/30 transition"
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

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
            className="h-12 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition"
          >
            <option value="ALL">⚡ Sab Priority</option>
            <option value="NORMAL">🟢 Normal</option>
            <option value="URGENT">🟠 Urgent</option>
            <option value="EMERGENCY">🔴 Emergency</option>
          </select>

          <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
            {filtered.length} tickets
          </div>
        </div>
      </section>

      {/* ═══ LIST ═══ */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 sm:p-16 text-center">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-700 mx-auto flex items-center justify-center shadow-lg shadow-orange-500/40">
              <Wrench className="h-10 w-10 text-white" />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
              {search || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
                ? 'Is filter mein koi ticket nahi'
                : 'Abhi koi repair ticket nahi 🔧'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-md mx-auto">
              {search || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
                ? 'Filters badal ke dekho ya search clear karo'
                : 'Customer ka phone lo, issue note karo, repair karo — aur profit kamao'}
            </p>
            {(search || statusFilter !== 'ALL' || priorityFilter !== 'ALL') ? (
              <Button
                variant="secondary"
                className="mt-4 font-extrabold"
                onClick={() => { setSearch(''); setStatusFilter('ALL'); setPriorityFilter('ALL'); }}
              >
                <X className="h-4 w-4" /> Filters Clear Karo
              </Button>
            ) : (
              <div className="mt-4 flex gap-2 justify-center flex-wrap">
                <Button variant="secondary" className="font-extrabold" onClick={() => setShowTeacher(true)}>
                  <GraduationCap className="h-4 w-4" /> Pehle Seekh Lo
                </Button>
                <Button
                  className="bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-700 hover:to-amber-800 font-extrabold shadow-lg shadow-orange-500/40"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="h-4 w-4" /> Pehla Ticket
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
            {filtered.map((ticket) => {
              const isOverdue =
                ticket.estimatedReadyAt &&
                new Date(ticket.estimatedReadyAt) < new Date() &&
                OPEN_STATUSES.includes(ticket.status);

              return (
                <Link
                  key={ticket.id}
                  to={`/repair-tickets/${ticket.id}`}
                  className={[
                    'block p-4 hover:bg-orange-50/40 dark:hover:bg-orange-500/5 transition',
                    isOverdue ? 'bg-rose-50/50 dark:bg-rose-500/5' : '',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono font-extrabold text-orange-700 dark:text-orange-300 text-sm">
                          {ticket.ticketNumber}
                        </span>
                        <RepairStatusBadge status={ticket.status} size="sm" />
                        {ticket.priority !== 'NORMAL' && (
                          <RepairPriorityBadge priority={ticket.priority} size="sm" />
                        )}
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider animate-pulse">
                            <Timer className="h-2.5 w-2.5" /> OVERDUE
                          </span>
                        )}
                      </div>

                      <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap text-sm">
                        <Smartphone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        {ticket.deviceBrand} {ticket.deviceModel}
                        {ticket.deviceColor && (
                          <span className="text-violet-700 dark:text-violet-400 font-bold text-sm"> · {ticket.deviceColor}</span>
                        )}
                      </div>

                      {ticket.imei1 && (
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono font-bold">
                          IMEI: {ticket.imei1}
                        </div>
                      )}

                      <div className="mt-1 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                        <strong className="text-slate-900 dark:text-white">Issue:</strong> {ticket.reportedIssue.slice(0, 100)}
                        {ticket.reportedIssue.length > 100 && '...'}
                      </div>

                      <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400 font-bold">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <strong className="text-slate-700 dark:text-slate-200">{ticket.customerName}</strong>
                        </span>
                        <a
                          href={`https://wa.me/${ticket.customerPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
                          title="WhatsApp karo"
                        >
                          <MessageCircle className="h-3 w-3" />
                          {ticket.customerPhone}
                        </a>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelative(ticket.receivedAt)}
                        </span>
                        {ticket.technicianName && (
                          <span className="text-violet-700 dark:text-violet-400 font-extrabold">
                            👨‍🔧 {ticket.technicianName}
                          </span>
                        )}
                      </div>

                      {OPEN_STATUSES.includes(ticket.status) && (
                        <div className="mt-1.5 text-[10px] text-orange-700 dark:text-orange-400 font-extrabold flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          Next: {STATUS_NEXT_ACTIONS[ticket.status]}
                        </div>
                      )}
                    </div>

                    {/* Pricing */}
                    <div className="text-right text-xs space-y-0.5 shrink-0">
                      {ticket.totalCost > 0 && (
                        <>
                          <div className="text-slate-500 dark:text-slate-400 font-bold">
                            Total: <strong className="text-slate-900 dark:text-white tabular-nums">{formatPKR(ticket.totalCost)}</strong>
                          </div>
                          {ticket.paidAmount > 0 && (
                            <div className="text-emerald-700 dark:text-emerald-400 font-extrabold tabular-nums">
                              Paid: {formatPKR(ticket.paidAmount)}
                            </div>
                          )}
                          {ticket.balanceDue > 0 && (
                            <div className="text-amber-700 dark:text-amber-400 font-extrabold tabular-nums">
                              Due: {formatPKR(ticket.balanceDue)}
                            </div>
                          )}
                        </>
                      )}
                      <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500 ml-auto mt-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateRepairTicketModal onClose={() => setShowCreateModal(false)} />
      )}

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm 8mm; }
          html, body {
            background: white !important;
            color: #0f172a !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          .overflow-x-auto, .overflow-y-auto, .overflow-hidden, .overflow-auto {
            overflow: visible !important; max-height: none !important; height: auto !important;
          }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav { display: none !important; }
          [class*="rounded-2xl"], [class*="rounded-3xl"] { overflow: visible !important; border-radius: 6px !important; }
          .divide-y-2 > div, .divide-y > div { page-break-inside: avoid !important; break-inside: avoid !important; border-bottom: 1px solid #e2e8f0 !important; }
          .text-emerald-700, [class*="emerald-400"] { color: #047857 !important; }
          .text-rose-700, [class*="rose-400"] { color: #be123c !important; }
          .text-violet-700, [class*="violet-400"] { color: #6d28d9 !important; }
          .text-amber-700, [class*="amber-400"] { color: #b45309 !important; }
          .text-orange-700, [class*="orange-400"] { color: #c2410c !important; }
          [data-sonner-toaster], [data-sonner-toast] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   REPAIR TEACHER
   ═════════════════════════════════════════════════════════════ */
function RepairTeacher({ hasTickets, onClose, onStart }: {
  hasTickets: boolean;
  onClose: () => void;
  onStart: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-orange-300 dark:border-orange-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-orange-200 dark:border-orange-500/30 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/15 dark:to-amber-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-orange-900 dark:text-orange-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Repair Service Kaise Kaam Karta Hai?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Customer ka <strong>kharab phone</strong> lo, <strong>issue</strong> check karo, <strong>parts + labor</strong> ka kharcha nikaalo,
            repair karo — aur customer se paise le ke <strong>profit</strong> kamao! 🔧
          </p>

          {/* Live misal */}
          <div className="rounded-2xl border-2 border-orange-200 dark:border-orange-500/30 bg-orange-50/60 dark:bg-orange-500/5 p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-orange-700 dark:text-orange-300">
              🔧 Misal: iPhone Screen Replace
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <FlowBox emoji="📥" label="Receive" value="Rs 500" sub="advance" />
              <ArrowRight className="h-4 w-4 text-orange-500 shrink-0" />
              <FlowBox emoji="🔍" label="Diagnose" value="Rs 8,000" sub="estimate" />
              <ArrowRight className="h-4 w-4 text-orange-500 shrink-0" />
              <FlowBox emoji="💰" label="Deliver" value="Rs 8,000" sub="charge kiya" highlight />
            </div>
            <div className="rounded-xl bg-emerald-100 dark:bg-emerald-500/15 border-2 border-emerald-300 dark:border-emerald-500/40 p-2.5 text-center">
              <span className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
                💰 Profit: Rs 3,500 <span className="opacity-70">(8,000 − parts Rs 4,500)</span>
              </span>
            </div>
          </div>

          {/* 9 statuses */}
          <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-700 dark:text-slate-300">
              📋 9 Status — Har Ticket Ka Safar
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[10px] font-extrabold">
              <StatusChip emoji="📥" label="Received" color="blue" />
              <StatusChip emoji="🔍" label="Diagnosed" color="indigo" />
              <StatusChip emoji="⏳" label="Approval" color="amber" />
              <StatusChip emoji="📦" label="Parts" color="orange" />
              <StatusChip emoji="🔧" label="In Progress" color="violet" />
              <StatusChip emoji="✅" label="Ready" color="emerald" />
              <StatusChip emoji="🎉" label="Delivered" color="slate" />
              <StatusChip emoji="❌" label="Cancelled" color="rose" />
              <StatusChip emoji="💀" label="Unrepairable" color="red" />
            </div>
          </div>

          {/* 3 steps */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <TeacherStep emoji="📥" title="Receive" desc="Device + IMEI + customer + issue + advance" />
            <TeacherStep emoji="🔧" title="Repair" desc="Diagnose → parts → in progress → ready" />
            <TeacherStep emoji="💰" title="Deliver" desc="Balance lo → customer ko de do → warranty" />
          </div>

          {/* Tips */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TeacherTip><strong>IMEI zaroor</strong> likho — chori ka phone aaye to record hoga</TeacherTip>
            <TeacherTip><strong>Advance lo</strong> — 20-30% ka advance minimum, customer serious hai</TeacherTip>
            <TeacherTip><strong>Passcode</strong> le lo customer ki ijazat se — screen test karne ke liye</TeacherTip>
            <TeacherTip><strong>Estimated ready date</strong> set karo — customer ko realistic date do</TeacherTip>
            <TeacherTip><strong>Priority Urgent/Emergency</strong> ka extra charge lo</TeacherTip>
            <TeacherTip><strong>Warranty 7-15 din</strong> di jati hai repair pe — customer ka trust barhta hai</TeacherTip>
            <TeacherTip><strong>WhatsApp</strong> phone icon click karke customer ko turant contact karo</TeacherTip>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-700 hover:to-amber-800 font-extrabold shadow-lg shadow-orange-500/40 h-12"
            onClick={onStart}
          >
            <Wrench className="h-4 w-4" />
            {hasTickets ? 'Samajh Gaya — Naya Ticket Banao!' : 'Samajh Gaya — Pehla Ticket Banao!'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ emoji, label, color }: { emoji: string; label: string; color: string }) {
  const map: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-500/40',
    indigo: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
    orange: 'bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-500/40',
    violet: 'bg-violet-100 dark:bg-violet-500/20 text-violet-800 dark:text-violet-300 border-violet-300 dark:border-violet-500/40',
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    rose: 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
    red: 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 border-red-300 dark:border-red-500/40',
  };
  return (
    <div className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 ${map[color]}`}>
      <span>{emoji}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function FlowBox({ emoji, label, value, sub, highlight }: {
  emoji: string; label: string; value: string; sub: string; highlight?: boolean;
}) {
  return (
    <div className={[
      'rounded-xl border-2 px-3 py-2 text-center min-w-[90px]',
      highlight
        ? 'border-emerald-500 bg-white dark:bg-slate-800 shadow-md'
        : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60',
    ].join(' ')}>
      <div className="text-xl">{emoji}</div>
      <div className="text-[10px] font-extrabold text-slate-900 dark:text-white uppercase">{label}</div>
      <div className={`text-xs font-extrabold tabular-nums ${highlight ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>{value}</div>
      <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{sub}</div>
    </div>
  );
}

function TeacherStep({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2.5">
      <div className="text-xl">{emoji}</div>
      <div className="text-[11px] font-extrabold text-slate-900 dark:text-white mt-1">{title}</div>
      <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{desc}</div>
    </div>
  );
}

function TeacherTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   STEP PILL
   ═════════════════════════════════════════════════════════════ */
function StepPill({ n, label, state }: { n: number; label: string; state: 'done' | 'active' | 'todo' }) {
  return (
    <div className={[
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold border backdrop-blur-md transition',
      state === 'done'
        ? 'bg-emerald-400/25 border-emerald-300/50 text-emerald-200'
        : state === 'active'
        ? 'bg-amber-400/90 border-amber-300 text-slate-900 shadow-lg shadow-amber-400/30 animate-pulse'
        : 'bg-white/10 border-white/20 text-white/50',
    ].join(' ')}>
      {state === 'done' ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <span className={[
          'h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-black',
          state === 'active' ? 'bg-slate-900 text-amber-300' : 'bg-white/20 text-white/60',
        ].join(' ')}>
          {n}
        </span>
      )}
      {label}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   KPI
   ═════════════════════════════════════════════════════════════ */
function Kpi({ label, value, sub, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    orange:  'from-orange-500 to-amber-600 shadow-orange-500/40',
    blue:    'from-blue-500 to-blue-700 shadow-blue-500/40',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/40',
    violet:  'from-violet-500 to-fuchsia-600 shadow-violet-500/40',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm dark:shadow-black/20 hover:shadow-md dark:hover:shadow-lg transition-all hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">
            {label}
          </div>
          <div className="mt-1.5 text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">
            {value}
          </div>
          {sub && (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">
              {sub}
            </div>
          )}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
