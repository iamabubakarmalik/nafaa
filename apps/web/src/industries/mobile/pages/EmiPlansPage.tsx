// apps/web/src/industries/mobile/pages/EmiPlansPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  CreditCard, Plus, Search, AlertCircle, Calendar, TrendingUp,
  DollarSign, ChevronRight, Download, RefreshCw, Phone, User, X,
  CheckCircle2, Clock, AlertTriangle, MessageCircle, GraduationCap,
  Sparkles, Printer, ArrowRight, Wallet,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import {
  emiApi,
  type EmiPlanStatus,
  EMI_STATUS_LABELS,
  EMI_STATUS_COLORS,
} from '../api/emi.api';
import { CreateEmiPlanModal } from '../components/emi/CreateEmiPlanModal';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA EMI PLANS — FULL BEST
   ─────────────────────────────────────────────────────────────
   🌙 Dark mode complete • 🎓 Teacher • ⌨️ / search • Esc band
   🖨️ Print report + CSV • 💬 WhatsApp overdue reminders
   📊 Progress bars + overdue alerts • ⚡ Update overdue flags
   ═════════════════════════════════════════════════════════════ */

type StatusFilter = 'ALL' | EmiPlanStatus;
type SpecialFilter = 'ALL' | 'ONLY_OVERDUE' | 'ONLY_UPCOMING';

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(iso));

export default function EmiPlansPage() {
  const queryClient = useQueryClient();
  const tenantName = useAuthStore((s: any) => s.tenant?.name);
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [specialFilter, setSpecialFilter] = useState<SpecialFilter>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const { data: stats, refetch: refetchStats, isRefetching } = useQuery({
    queryKey: ['emi-stats'],
    queryFn: emiApi.stats,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['emi-plans', statusFilter, specialFilter],
    queryFn: () =>
      emiApi.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        filter: specialFilter === 'ALL' ? undefined : specialFilter,
        limit: 200,
      }),
    placeholderData: keepPreviousData,
  });

  const plans = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return plans;
    return plans.filter(
      (p) =>
        p.planNumber.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        (p.customerPhone || '').includes(q),
    );
  }, [plans, debouncedSearch]);

  const updateOverdueMutation = useMutation({
    mutationFn: emiApi.updateOverdueFlags,
    onSuccess: (data: any) => {
      toast.success(`✓ ${data.updatedCount ?? 0} installments overdue mark huin`);
      queryClient.invalidateQueries({ queryKey: ['emi-plans'] });
      queryClient.invalidateQueries({ queryKey: ['emi-stats'] });
    },
    onError: () => toast.error('Update fail hua'),
  });

  const statusCounts = useMemo(() => {
    const counts: Record<EmiPlanStatus, number> = {
      ACTIVE: 0, COMPLETED: 0, DEFAULTED: 0, CANCELLED: 0,
    };
    stats?.byStatus.forEach((s) => { counts[s.status] = s.count; });
    return counts;
  }, [stats]);

  /* ─── CSV ─── */
  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`EMI Plans Report — ${tenantName || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}  •  Total: ${filtered.length}`],
      [''],
    ];
    const headers = ['Plan #', 'Customer', 'Phone', 'Total', 'Down', 'Financed', 'Per Month', 'Paid', 'Remaining', 'Overdue', 'Status', 'Start'];
    const rows = filtered.map((p) => [
      p.planNumber, p.customerName, p.customerPhone || '',
      p.totalAmount, p.downPayment, p.financedAmount, p.installmentAmount,
      p.paidAmount, p.remainingAmount, p.overdueAmount, p.status,
      formatDate(p.startDate),
    ]);
    const csv = [...summary, headers, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emi-plans-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  const sendOverdueReminder = (plan: typeof filtered[number]) => {
    if (!plan.customerPhone) return toast.error('Customer ka phone nahi hai');
    const phone = plan.customerPhone.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    const msg = [
      `*💳 EMI Payment Reminder — ${tenantName || 'Nafaa'}*`,
      '',
      `Assalamu Alaikum ${plan.customerName},`,
      '',
      `Plan: *${plan.planNumber}*`,
      `Overdue Amount: *${formatPKR(plan.overdueAmount)}*`,
      `Overdue Installments: *${plan.overdueCount}*`,
      '',
      'Kripya jaldi payment kar dein. Shukriya! 🙏',
      '_Powered by Nafaa POS_',
    ].join('\n');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  /* ─── Keyboard ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape') {
        if (showTeacher) { setShowTeacher(false); return; }
        if (search) setSearch('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, search]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  const hasFilters = !!search || statusFilter !== 'ALL' || specialFilter !== 'ALL';
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <div className="space-y-4 sm:space-y-5 pb-8 print:space-y-0">
      {showTeacher && (
        <EmiTeacher
          hasPlans={plans.length > 0}
          onClose={() => setShowTeacher(false)}
          onStart={() => { setShowTeacher(false); setShowCreateModal(true); }}
        />
      )}

      {/* ═══ PRINT-ONLY REPORT ═══ */}
      <div className="hidden print:block">
        <div className="border-b-4 border-indigo-600 pb-3 mb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight">
                💳 {tenantName || 'My Store'} — EMI Plans Report
              </h1>
              <p className="text-xs text-slate-600 font-semibold mt-1">
                {shopName ? `Shop: ${shopName}  •  ` : ''}{filtered.length} plans
                {statusFilter !== 'ALL' ? `  •  ${EMI_STATUS_LABELS[statusFilter]}` : ''}
                {specialFilter === 'ONLY_OVERDUE' ? '  •  Sirf Overdue' : specialFilter === 'ONLY_UPCOMING' ? '  •  Upcoming 7 din' : ''}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Generated: {printDate}</p>
            </div>
            {stats && (
              <div className="text-right text-xs font-bold text-slate-700 space-y-0.5 shrink-0">
                <div>Active: {statusCounts.ACTIVE}</div>
                <div>Overdue: <span className="text-rose-700">{formatPKR(stats.overdueAmount)}</span></div>
                <div>Is Mahina Collect: <span className="text-emerald-700">{formatPKR(stats.collectedThisMonth)}</span></div>
              </div>
            )}
          </div>
        </div>
        <table className="w-full text-[10px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Plan #', 'Customer', 'Total', 'Per Month', 'Paid', 'Remaining', 'Overdue', 'Status'].map((h) => (
                <th key={h} className="text-left px-1.5 py-1.5 font-extrabold text-white" style={{ background: '#4f46e5', border: '1px solid #4338ca', fontSize: 8 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => (
              <tr key={p.id} style={{ background: idx % 2 ? '#eef2ff' : '#fff', pageBreakInside: 'avoid' }}>
                <td className="px-1.5 py-1.5 font-mono font-bold" style={{ border: '1px solid #e2e8f0' }}>{p.planNumber}</td>
                <td className="px-1.5 py-1.5 font-bold" style={{ border: '1px solid #e2e8f0' }}>{p.customerName}</td>
                <td className="px-1.5 py-1.5 tabular-nums" style={{ border: '1px solid #e2e8f0' }}>{formatPKR(p.totalAmount)}</td>
                <td className="px-1.5 py-1.5 tabular-nums" style={{ border: '1px solid #e2e8f0' }}>{formatPKR(p.installmentAmount)}</td>
                <td className="px-1.5 py-1.5 tabular-nums" style={{ border: '1px solid #e2e8f0', color: '#047857' }}>{formatPKR(p.paidAmount)}</td>
                <td className="px-1.5 py-1.5 tabular-nums font-bold" style={{ border: '1px solid #e2e8f0', color: '#b45309' }}>{formatPKR(p.remainingAmount)}</td>
                <td className="px-1.5 py-1.5 tabular-nums font-bold" style={{ border: '1px solid #e2e8f0', color: p.overdueAmount > 0 ? '#be123c' : '#64748b' }}>
                  {p.overdueAmount > 0 ? formatPKR(p.overdueAmount) : '—'}
                </td>
                <td className="px-1.5 py-1.5" style={{ border: '1px solid #e2e8f0' }}>{EMI_STATUS_LABELS[p.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 pt-2 text-center text-[9px] text-slate-500 font-semibold" style={{ borderTop: '2px solid #4f46e5' }}>
          ✦ Powered by <b>Nafaa POS</b> ✦
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-purple-700 dark:from-slate-950 dark:via-indigo-950 dark:to-purple-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-purple-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <CreditCard className="h-3.5 w-3.5 text-amber-300" /> Mobile Industry
              {shopName && (<><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>)}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">💳 EMI / Installments</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-emerald-300">{statusCounts.ACTIVE}</strong> active
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-amber-300">{stats?.overdueCount ?? 0}</strong> overdue
              <span className="opacity-50 mx-1.5">•</span>
              Remaining <strong className="text-amber-300">{formatPKR(stats?.activeRemaining ?? 0)}</strong>
              {stats && stats.collectedThisMonth > 0 && (
                <>
                  <span className="opacity-50 mx-1.5">•</span>
                  Month collect <strong className="text-emerald-300">{formatPKR(stats.collectedThisMonth)}</strong>
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
            >
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <button
              onClick={() => { refetch(); refetchStats(); }}
              disabled={isRefetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => updateOverdueMutation.mutate()}
              disabled={updateOverdueMutation.isPending}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
              title="Overdue flags refresh karo"
            >
              <AlertTriangle className={`h-4 w-4 ${updateOverdueMutation.isPending ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">Overdue Check</span>
            </button>
            <button onClick={exportCSV} disabled={filtered.length === 0} className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition">
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </button>
            <button onClick={() => window.print()} disabled={filtered.length === 0} className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition">
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Report</span>
            </button>
            <Button onClick={() => setShowCreateModal(true)} className="bg-white text-indigo-900 hover:bg-slate-100 font-extrabold shadow-2xl">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Naya EMI Plan</span>
              <span className="sm:hidden">Naya</span>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ OVERDUE ALERT ═══ */}
      {(stats?.overdueCount ?? 0) > 0 && (
        <section className="rounded-2xl border-2 border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 p-3 sm:p-4 print:hidden">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/40 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-sm text-rose-900 dark:text-rose-200">
                ⚠️ {stats!.overdueCount} installments overdue — {formatPKR(stats!.overdueAmount)} atak gaya!
              </div>
              <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 mt-0.5">
                Customers ko WhatsApp reminders bhejo — collection barhao
              </div>
            </div>
            <button
              onClick={() => setSpecialFilter('ONLY_OVERDUE')}
              className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md transition shrink-0 inline-flex items-center gap-1.5"
            >
              Dekho <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      )}

      {/* ═══ KPIs ═══ */}
      {stats && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 print:hidden">
          <Kpi label="Active Financed" value={formatPKR(stats.activeFinanced)} sub={`${statusCounts.ACTIVE} plans`} icon={TrendingUp} tone="indigo" />
          <Kpi label="Baqi Aana Hai" value={formatPKR(stats.activeRemaining)} sub="Active plans ka" icon={DollarSign} tone="violet" />
          <Kpi label="Overdue" value={formatPKR(stats.overdueAmount)} sub={`${stats.overdueCount} installments`} icon={AlertTriangle} tone="rose" alert={stats.overdueAmount > 0} />
          <Kpi label="Month Collected" value={formatPKR(stats.collectedThisMonth)} sub={`${stats.collectedCountThisMonth} payments`} icon={CheckCircle2} tone="emerald" />
        </section>
      )}

      {/* ═══ SPECIAL FILTERS ═══ */}
      <section className="flex gap-1.5 overflow-x-auto pb-1 print:hidden">
        <FilterChip active={specialFilter === 'ALL'} onClick={() => setSpecialFilter('ALL')} tone="indigo">
          Sab Plans
        </FilterChip>
        <FilterChip active={specialFilter === 'ONLY_OVERDUE'} onClick={() => setSpecialFilter(specialFilter === 'ONLY_OVERDUE' ? 'ALL' : 'ONLY_OVERDUE')} tone="rose">
          <AlertTriangle className="h-3 w-3" /> Sirf Overdue ({stats?.overdueCount || 0})
        </FilterChip>
        <FilterChip active={specialFilter === 'ONLY_UPCOMING'} onClick={() => setSpecialFilter(specialFilter === 'ONLY_UPCOMING' ? 'ALL' : 'ONLY_UPCOMING')} tone="amber">
          <Clock className="h-3 w-3" /> Agle 7 Din ({stats?.upcomingCount || 0})
        </FilterChip>
      </section>

      {/* ═══ STATUS CHIPS ═══ */}
      <section className="flex gap-1.5 overflow-x-auto pb-1 print:hidden">
        <FilterChip active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} tone="indigo">
          Sab <span className="tabular-nums opacity-70">({plans.length})</span>
        </FilterChip>
        {(['ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED'] as EmiPlanStatus[]).map((status) => {
          const count = statusCounts[status];
          if (count === 0 && statusFilter !== status) return null;
          return (
            <FilterChip key={status} active={statusFilter === status} onClick={() => setStatusFilter(statusFilter === status ? 'ALL' : status)} tone="slate">
              {EMI_STATUS_LABELS[status]} <span className="tabular-nums opacity-70">({count})</span>
            </FilterChip>
          );
        })}
      </section>

      {/* ═══ SEARCH ═══ */}
      <section className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3.5 print:hidden">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Plan # / customer / phone... (/ shortcut)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/30 transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('ALL'); setSpecialFilter('ALL'); }}
              className="text-xs font-extrabold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
          <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
            {filtered.length} plans
          </div>
        </div>
      </section>

      {/* ═══ LIST ═══ */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 sm:p-16 text-center">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-700 mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/40">
              <CreditCard className="h-10 w-10 text-white" />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
              {hasFilters ? 'Is filter mein koi plan nahi' : 'Abhi koi EMI plan nahi 💳'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-md mx-auto">
              {hasFilters
                ? 'Filters badal ke dekho ya search clear karo'
                : 'Customer ko installments pe phone do — down payment lo, baqi monthly collect karo'}
            </p>
            {hasFilters ? (
              <Button variant="secondary" className="mt-4 font-extrabold" onClick={() => { setSearch(''); setStatusFilter('ALL'); setSpecialFilter('ALL'); }}>
                <X className="h-4 w-4" /> Filters Clear Karo
              </Button>
            ) : (
              <div className="mt-4 flex gap-2 justify-center flex-wrap">
                <Button variant="secondary" className="font-extrabold" onClick={() => setShowTeacher(true)}>
                  <GraduationCap className="h-4 w-4" /> Pehle Seekh Lo
                </Button>
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-700 font-extrabold shadow-lg shadow-indigo-500/40" onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4" /> Pehla Plan
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
            {filtered.map((plan) => {
              const statusColors = EMI_STATUS_COLORS[plan.status];
              const progressPercent = plan.financedAmount > 0
                ? Math.min(((plan.paidAmount - plan.downPayment) / plan.financedAmount) * 100, 100)
                : 0;

              return (
                <Link
                  key={plan.id}
                  to={`/emi-plans/${plan.id}`}
                  className="block p-4 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono font-extrabold text-indigo-700 dark:text-indigo-300 text-sm">
                          {plan.planNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                          {EMI_STATUS_LABELS[plan.status]}
                        </span>
                        {plan.overdueCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold animate-pulse">
                            <AlertTriangle className="h-2.5 w-2.5" /> {plan.overdueCount} OVERDUE
                          </span>
                        )}
                      </div>

                      <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap text-sm">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {plan.customerName}
                        {plan.customerPhone && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 font-semibold">
                            <Phone className="h-3 w-3" /> {plan.customerPhone}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap font-bold">
                        <span>{plan.installmentCount} months</span>
                        <span>·</span>
                        <span>
                          <strong className="text-indigo-700 dark:text-indigo-300 tabular-nums">{formatPKR(plan.installmentAmount)}</strong>/month
                        </span>
                        {plan.nextDueDate && plan.status === 'ACTIVE' && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Next: {formatDate(plan.nextDueDate)}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="mt-2 max-w-md">
                        <div className="flex items-center justify-between text-[10px] font-extrabold mb-0.5">
                          <span className="text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {plan.paidInstallmentCount}/{plan.installmentCount} paid
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                            {formatPKR(plan.paidAmount)} / {formatPKR(plan.totalAmount)}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                          <div
                            className={`h-full transition-all ${
                              progressPercent >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                              plan.overdueCount > 0 ? 'bg-gradient-to-r from-rose-500 to-red-500' :
                              'bg-gradient-to-r from-indigo-500 to-purple-500'
                            }`}
                            style={{ width: `${Math.max(progressPercent, 3)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1" onClick={(e) => e.stopPropagation()}>
                      <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400">Remaining</div>
                      <div className="font-extrabold text-amber-700 dark:text-amber-400 text-lg tabular-nums">
                        {formatPKR(plan.remainingAmount)}
                      </div>
                      {plan.overdueAmount > 0 && (
                        <div className="text-[11px] font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">
                          Overdue: {formatPKR(plan.overdueAmount)}
                        </div>
                      )}
                      <div className="flex gap-1 mt-2 justify-end items-center">
                        {plan.overdueAmount > 0 && plan.customerPhone && (
                          <button
                            onClick={(e) => { e.preventDefault(); sendOverdueReminder(plan); }}
                            className="h-8 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold inline-flex items-center gap-1 transition"
                            title="WhatsApp reminder bhejo"
                          >
                            <MessageCircle className="h-3 w-3" /> Remind
                          </button>
                        )}
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateEmiPlanModal onClose={() => setShowCreateModal(false)} />
      )}

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm 8mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          [class*="fixed"], [class*="sticky"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav { display: none !important; }
          thead { display: table-header-group !important; }
          tr { page-break-inside: avoid !important; }
          [data-sonner-toaster], [data-sonner-toast] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═══ FILTER CHIP ═══ */
function FilterChip({ active, onClick, tone, children }: any) {
  const tones: Record<string, string> = {
    indigo: active ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : '',
    rose: active ? 'bg-rose-600 text-white border-rose-600 shadow-md' : '',
    amber: active ? 'bg-amber-500 text-white border-amber-500 shadow-md' : '',
    slate: active ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-md' : '',
  };
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1 px-3 h-10 rounded-xl text-xs font-extrabold border-2 transition ${
        active
          ? tones[tone]
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-500/50'
      }`}
    >
      {children}
    </button>
  );
}

/* ═══ KPI ═══ */
function Kpi({ label, value, sub, icon: Icon, tone, alert }: any) {
  const tones: Record<string, string> = {
    indigo: 'from-indigo-500 to-purple-700 shadow-indigo-500/40',
    violet: 'from-violet-500 to-fuchsia-600 shadow-violet-500/40',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/40',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/40',
  };
  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ${
      alert ? 'border-rose-300 dark:border-rose-500/40' : 'border-slate-200 dark:border-slate-800'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/* ═══ TEACHER ═══ */
function EmiTeacher({ hasPlans, onClose, onStart }: { hasPlans: boolean; onClose: () => void; onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-300 dark:border-indigo-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-500/15 dark:to-purple-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> EMI Plan Kaise Kaam Karta Hai?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Customer ko phone <strong>installments</strong> pe do — thora <strong>down payment</strong> abhi lo,
            baqi har mahine collect karo. System <strong>khud track</strong> karega kis ne kab diya, kab nahi.
          </p>

          <div className="rounded-2xl border-2 border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/5 p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-indigo-700 dark:text-indigo-300">📱 Misal: Rs 60,000 ka Phone</div>
            <div className="flex items-center gap-2 flex-wrap">
              <FlowBox emoji="💵" label="Down 20%" value="Rs 12,000" sub="abhi cash" />
              <ArrowRight className="h-4 w-4 text-indigo-500 shrink-0" />
              <FlowBox emoji="📅" label="6 Months" value="Rs 8,000" sub="har mahine" highlight />
            </div>
            <div className="rounded-xl bg-emerald-100 dark:bg-emerald-500/15 border-2 border-emerald-300 dark:border-emerald-500/40 p-2.5 text-center">
              <span className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
                💰 Total mila: Rs 60,000 — phone turant becha, paisa aaram se aaya
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <TeacherStep emoji="📝" title="Plan Banao" desc="Customer + total + down + months" />
            <TeacherStep emoji="📅" title="Collect Karo" desc="Har mahine installment record karo" />
            <TeacherStep emoji="⚠️" title="Track Karo" desc="Overdue pe WhatsApp reminder" />
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TeacherTip><strong>Down payment 20%+</strong> rakho — kam pe customer serious nahi hota</TeacherTip>
            <TeacherTip><strong>CNIC lazmi</strong> lo — default ki soorat me record kaam aayega</TeacherTip>
            <TeacherTip><strong>⚠️ Overdue alerts</strong> — red banner dikhe to foran reminders bhejo</TeacherTip>
            <TeacherTip><strong>Waive</strong> option hai — maaf karna ho to record ke sath karo</TeacherTip>
            <TeacherTip><strong>⌨️ /</strong> dabao — search khul jayegi</TeacherTip>
          </div>

          <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 font-extrabold shadow-lg shadow-indigo-500/40 h-12" onClick={onStart}>
            <CreditCard className="h-4 w-4" />
            {hasPlans ? 'Samajh Gaya — Naya Plan!' : 'Samajh Gaya — Pehla Plan!'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FlowBox({ emoji, label, value, sub, highlight }: any) {
  return (
    <div className={`rounded-xl border-2 px-3 py-2 text-center min-w-[90px] ${highlight ? 'border-emerald-500 bg-white dark:bg-slate-800 shadow-md' : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60'}`}>
      <div className="text-xl">{emoji}</div>
      <div className="text-[10px] font-extrabold text-slate-900 dark:text-white uppercase">{label}</div>
      <div className={`text-xs font-extrabold tabular-nums ${highlight ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>{value}</div>
      <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{sub}</div>
    </div>
  );
}

function TeacherStep({ emoji, title, desc }: any) {
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
