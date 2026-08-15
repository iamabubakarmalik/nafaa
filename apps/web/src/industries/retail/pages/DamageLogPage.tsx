import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Plus, Search, X, Check, RefreshCw, TrendingDown,
  CheckCircle2, XCircle, DollarSign, ShieldAlert, Package, Calendar,
  Image as ImageIcon, Download, Clock, Flame, CheckSquare, Square,
  Printer, Trophy, GraduationCap, ArrowRight, Camera,
} from 'lucide-react';
import { damageApi, type DamageLog, type DamageReasonCode } from '../api/damage.api';
import { formatPKR } from '@core/lib/format';
import { DamageCreateModal } from '../components/DamageCreateModal';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA DAMAGE & WASTAGE — FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🎓 Teacher modal — "Damage report kaise karte hain"
   🧭 3-step guide — Report Karo → Review Karo → Manzoor Karo
   📅 Date presets (Aaj/7d/30d/Mahina) client-side
   ✅ Bulk approve (checkbox + sticky bar)
   ⏳ Aging alert (48h+ pending → red badge)
   📊 Loss breakdown by reason + insights
   🖨️ Print/PDF perfect + CSV summary header
   ❌ Proper reject modal (prompt() khatam)
   ✨ Dark mode perfect, 📱→4K responsive
   ═════════════════════════════════════════════════════════════ */

const REASON_META: Record<DamageReasonCode, { label: string; emoji: string; color: string }> = {
  EXPIRY:               { label: 'Expired',        emoji: '⏰', color: 'amber' },
  BREAKAGE:             { label: 'Toota Hua',      emoji: '💔', color: 'orange' },
  SPOILAGE:             { label: 'Kharaab',        emoji: '🤢', color: 'lime' },
  PEST_DAMAGE:          { label: 'Keeray',         emoji: '🪲', color: 'rose' },
  WATER_DAMAGE:         { label: 'Pani',           emoji: '💧', color: 'blue' },
  THEFT:                { label: 'Chori',          emoji: '🚨', color: 'red' },
  MISHANDLING:          { label: 'Ghalat rakha',   emoji: '📉', color: 'slate' },
  MANUFACTURING_DEFECT: { label: 'Company defect', emoji: '🏭', color: 'violet' },
  OTHER:                { label: 'Aur',            emoji: '❓', color: 'slate' },
};

const REASON_TONES: Record<string, string> = {
  amber:  'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
  orange: 'bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-500/40',
  lime:   'bg-lime-100 dark:bg-lime-500/20 text-lime-800 dark:text-lime-300 border-lime-300 dark:border-lime-500/40',
  rose:   'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
  blue:   'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-500/40',
  red:    'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 border-red-300 dark:border-red-500/40',
  slate:  'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600',
  violet: 'bg-violet-100 dark:bg-violet-500/20 text-violet-800 dark:text-violet-300 border-violet-300 dark:border-violet-500/40',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  REPORTED:    { label: 'Pending',     color: 'bg-amber-500 text-white',   icon: AlertTriangle },
  APPROVED:    { label: 'Manzoor',     color: 'bg-emerald-500 text-white', icon: CheckCircle2 },
  REJECTED:    { label: 'Rad',         color: 'bg-rose-500 text-white',    icon: XCircle },
  WRITTEN_OFF: { label: 'Written Off', color: 'bg-slate-600 text-white',   icon: ShieldAlert },
};

const DATE_PRESETS = [
  { v: 'all',   l: 'Sab' },
  { v: 'today', l: 'Aaj' },
  { v: '7d',    l: '7 Din' },
  { v: '30d',   l: '30 Din' },
  { v: 'month', l: 'Is Mahine' },
] as const;

function presetFromDate(v: string): Date | null {
  const now = new Date();
  if (v === 'today') { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
  if (v === '7d')    return new Date(now.getTime() - 7 * 864e5);
  if (v === '30d')   return new Date(now.getTime() - 30 * 864e5);
  if (v === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
}

const HOUR = 36e5;
const AGING_HOURS = 48;

export default function DamageLogPage() {
  const queryClient = useQueryClient();
  const hideCost = useCostHidden();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<DamageLog | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* Debounced search */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const { data: damages = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['damage-list', statusFilter, reasonFilter],
    queryFn: () => damageApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      reasonCode: reasonFilter === 'all' ? undefined : reasonFilter,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['damage-summary'],
    queryFn: () => damageApi.summary(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['damage-list'] });
    queryClient.invalidateQueries({ queryKey: ['damage-summary'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => damageApi.approve(id),
    onSuccess: () => {
      toast.success('Damage manzoor — stock adjust ho gaya');
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['retail-products'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Approval fail'),
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => damageApi.approve(id)));
    },
    onSuccess: (_d, ids) => {
      toast.success(`✓ ${ids.length} damages manzoor — stock adjust ho gaya`);
      setSelectedIds(new Set());
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['retail-products'] });
    },
    onError: () => { toast.error('Kuch approvals fail hue'); invalidate(); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => damageApi.reject(id, reason),
    onSuccess: () => {
      toast.success('Damage rad kar diya');
      setRejectTarget(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Reject fail'),
  });

  /* ─── Filtering (search + date) ────────────────────── */
  const filtered = useMemo(() => {
    let list = damages;
    const from = presetFromDate(datePreset);
    if (from) list = list.filter((d) => new Date(d.createdAt) >= from);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((d) =>
        d.damageNumber.toLowerCase().includes(q) ||
        d.product?.name?.toLowerCase().includes(q) ||
        d.reason.toLowerCase().includes(q)
      );
    }
    return list;
  }, [damages, debouncedSearch, datePreset]);

  /* Filters badlein to selection reset */
  useEffect(() => { setSelectedIds(new Set()); }, [statusFilter, reasonFilter, datePreset, debouncedSearch]);

  /* ─── Stats + insights ─────────────────────────────── */
  const stats = useMemo(() => {
    const pending = damages.filter((d) => d.status === 'REPORTED');
    const now = Date.now();
    const aging = pending.filter((d) => (now - new Date(d.createdAt).getTime()) / HOUR >= AGING_HOURS);
    return {
      pending: pending.length,
      pendingLoss: pending.reduce((a, d) => a + Number(d.netLoss || 0), 0),
      aging: aging.length,
    };
  }, [damages]);

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = { all: damages.length };
    damages.forEach((d) => { m[d.status] = (m[d.status] || 0) + 1; });
    return m;
  }, [damages]);

  const reasonBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; loss: number }>();
    damages.forEach((d) => {
      const cur = map.get(d.reasonCode) || { count: 0, loss: 0 };
      cur.count += 1;
      cur.loss += Number(d.netLoss || 0);
      map.set(d.reasonCode, cur);
    });
    return [...map.entries()]
      .map(([code, v]) => ({ code: code as DamageReasonCode, ...v }))
      .sort((a, b) => (hideCost ? b.count - a.count : b.loss - a.loss))
      .slice(0, 6);
  }, [damages, hideCost]);

  const maxReasonLoss = Math.max(...reasonBreakdown.map((r) => (hideCost ? r.count : r.loss)), 1);

  const mostDamagedProduct = useMemo(() => {
    const map = new Map<string, { name: string; qty: number }>();
    damages.forEach((d) => {
      const name = d.product?.name;
      if (!name) return;
      const cur = map.get(name) || { name, qty: 0 };
      cur.qty += Number(d.quantity || 0);
      map.set(name, cur);
    });
    const arr = [...map.values()].sort((a, b) => b.qty - a.qty);
    return arr[0] || null;
  }, [damages]);

  const topReason = reasonBreakdown[0];

  /* ─── Setup progress (3-step guide) ────────────────── */
  const setupStep = damages.length === 0 ? 1
    : stats.pending > 0 ? 2
    : 3;

  /* ─── Bulk selection ───────────────────────────────── */
  const pendingIds = useMemo(
    () => filtered.filter((d) => d.status === 'REPORTED').map((d) => d.id),
    [filtered],
  );
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selectedIds.has(id));

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const toggleSelectAll = () =>
    setSelectedIds(allPendingSelected ? new Set() : new Set(pendingIds));

  const selectedLoss = useMemo(
    () => filtered.filter((d) => selectedIds.has(d.id)).reduce((a, d) => a + Number(d.netLoss || 0), 0),
    [filtered, selectedIds],
  );

  /* ─── CSV ──────────────────────────────────────────── */
  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const head2 = [
      [`Damage Report — ${tenantName || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Total: ${filtered.length}  •  Pending: ${stats.pending}  •  Pending Loss: ${stats.pendingLoss.toFixed(2)}`],
      [''],
    ];
    const head = ['Damage #', 'Date', 'Product', 'Qty', 'Reason', 'Status', 'Cost Loss', 'Salvage', 'Net Loss', 'Notes'];
    const rows = filtered.map((d) => [
      d.damageNumber,
      new Date(d.createdAt).toLocaleDateString('en-PK'),
      d.product?.name || '',
      d.quantity,
      REASON_META[d.reasonCode]?.label || d.reasonCode,
      d.status,
      d.costImpact.toFixed(2),
      d.salvageValue.toFixed(2),
      d.netLoss.toFixed(2),
      d.reason,
    ]);
    const csv = [...head2, head, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `damage-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export ho gaya');
  };

  const handlePrint = () => window.print();
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  /* ─── Keyboard shortcut ────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (showTeacher) setShowTeacher(false);
        else if (rejectTarget) setRejectTarget(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rejectTarget, showTeacher]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 print:space-y-3">
      {/* ═══ PRINT-ONLY HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-rose-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              🛡️ {tenantName || 'My Store'}
            </h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `Shop: ${shopName}  •  ` : ''}Damage & Wastage Report
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500">Generated</div>
            <div className="text-xs font-bold text-slate-900">{printDate}</div>
          </div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-red-700 dark:from-slate-950 dark:via-rose-950 dark:to-red-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-rose-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-300" /> Damage & Wastage
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-emerald-200">🏪 {shopName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
              🛡️ Damage Tracking
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              {stats.pending > 0 ? (
                <>
                  <strong className="text-amber-300">{stats.pending}</strong> pending
                  {stats.aging > 0 && (
                    <> <span className="opacity-50 mx-1">•</span> <strong className="text-rose-300">⏳ {stats.aging} 48h+ purane</strong></>
                  )}
                  {!hideCost && (
                    <> <span className="opacity-50 mx-1">•</span> Loss <strong className="text-rose-300">{formatPKR(stats.pendingLoss)}</strong></>
                  )}
                </>
              ) : (
                <>Kharaab / toota maal report karo, stock accurate rakho</>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              title="Kaise kaam karta hai?"
            >
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Kaise Kaam Karta Hai?</span>
              <span className="sm:hidden">?</span>
            </button>
            <PrivacyToggle compact />
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
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold shadow-2xl"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Damage Report</span>
              <span className="sm:hidden">Report</span>
            </Button>
          </div>
        </div>

        {/* 3-step guide */}
        <div className="relative mt-4 flex items-center gap-2 sm:gap-3 flex-wrap">
          <StepPill n={1} label="Report Karo" state={setupStep > 1 ? 'done' : setupStep === 1 ? 'active' : 'todo'} />
          <ArrowRight className="h-4 w-4 text-white/40 shrink-0" />
          <StepPill n={2} label="Review Karo" state={setupStep > 2 ? 'done' : setupStep === 2 ? 'active' : 'todo'} />
          <ArrowRight className="h-4 w-4 text-white/40 shrink-0" />
          <StepPill n={3} label="Manzoor Karo" state={setupStep === 3 ? 'done' : 'todo'} />
        </div>

        {/* Insights strip */}
        {(topReason || mostDamagedProduct) && damages.length > 0 && (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {topReason && (
              <button
                onClick={() => setReasonFilter(topReason.code)}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md px-3 py-2 text-xs font-extrabold transition"
              >
                <Flame className="h-4 w-4 text-orange-300" />
                <span className="text-white/70">Sab se zyada nuqsaan:</span>
                <span>{REASON_META[topReason.code].emoji} {REASON_META[topReason.code].label}</span>
                {!hideCost && <span className="text-rose-300 tabular-nums">{formatPKR(topReason.loss)}</span>}
              </button>
            )}
            {mostDamagedProduct && (
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md px-3 py-2 text-xs font-extrabold">
                <Trophy className="h-4 w-4 text-amber-300" />
                <span className="text-white/70">Sab se zyada damage:</span>
                <span className="truncate max-w-[180px]">{mostDamagedProduct.name}</span>
                <span className="text-amber-300 tabular-nums">×{mostDamagedProduct.qty}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ═══ TEACHER MODAL ═══ */}
      {showTeacher && (
        <DamageTeacher
          hasDamages={damages.length > 0}
          hasPending={stats.pending > 0}
          onClose={() => setShowTeacher(false)}
          onStart={() => {
            setShowTeacher(false);
            if (damages.length === 0) setShowCreateModal(true);
            else if (stats.pending > 0) setStatusFilter('REPORTED');
          }}
        />
      )}

      {/* ═══ KPIs ═══ */}
      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Kpi label="Reported" value={summary.totalReported ?? 0} sub={`${stats.pending} pending`} icon={AlertTriangle} tone="amber" />
          <Kpi label="Approved" value={summary.totalApproved ?? 0} sub="Confirmed" icon={CheckCircle2} tone="emerald" />
          <Kpi
            label="Net Loss"
            value={hideCost ? '••••' : formatPKR(summary.totalNetLoss ?? 0)}
            sub={hideCost ? 'PIN se dekho' : 'Confirmed damages'}
            icon={TrendingDown}
            tone="rose"
          />
          <Kpi
            label="Salvage"
            value={hideCost ? '••••' : formatPKR(summary.totalSalvageValue ?? 0)}
            sub="Bacha hua"
            icon={DollarSign}
            tone="blue"
          />
        </section>
      )}

      {/* ═══ LOSS BREAKDOWN ═══ */}
      {reasonBreakdown.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 print:hidden">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-md shadow-rose-500/40">
              <TrendingDown className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
              Nuqsaan Kis Wajah Se? {hideCost && <span className="text-slate-400 font-bold text-xs">(count ke hisaab se)</span>}
            </h3>
          </div>
          <div className="space-y-2">
            {reasonBreakdown.map((r) => {
              const meta = REASON_META[r.code];
              const metric = hideCost ? r.count : r.loss;
              const pct = (metric / maxReasonLoss) * 100;
              return (
                <button
                  key={r.code}
                  onClick={() => setReasonFilter(reasonFilter === r.code ? 'all' : r.code)}
                  className={[
                    'w-full flex items-center gap-3 p-2 rounded-xl transition text-left',
                    reasonFilter === r.code
                      ? 'bg-rose-50 dark:bg-rose-500/15 ring-2 ring-rose-300 dark:ring-rose-500/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                  ].join(' ')}
                >
                  <span className="text-lg w-7 text-center shrink-0">{meta.emoji}</span>
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 w-28 truncate shrink-0">
                    {meta.label}
                  </span>
                  <div className="flex-1 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-lg bg-gradient-to-r from-rose-500 to-red-500 transition-all duration-500"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <span className="text-xs font-extrabold text-rose-700 dark:text-rose-400 tabular-nums shrink-0 min-w-[70px] text-right">
                    {hideCost ? `${r.count}×` : formatPKR(r.loss)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ TOOLBAR ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3 print:hidden">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Damage #, product, reason... (/ shortcut)"
              className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-500/30 transition"
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

          {/* Date presets */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 items-center">
            <Calendar className="h-3.5 w-3.5 text-slate-400 ml-1.5 shrink-0" />
            {DATE_PRESETS.map((o) => (
              <button
                key={o.v}
                onClick={() => setDatePreset(o.v)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition whitespace-nowrap ${
                  datePreset === o.v
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap items-center">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-wrap">
            {[
              { v: 'all',      l: 'Sab' },
              { v: 'REPORTED', l: 'Pending' },
              { v: 'APPROVED', l: 'Manzoor' },
              { v: 'REJECTED', l: 'Rad' },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setStatusFilter(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  statusFilter === o.v
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {o.l}
                {statusCounts[o.v] != null && (
                  <span className={`ml-1 tabular-nums ${statusFilter === o.v ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>
                    {statusCounts[o.v]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="h-10 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 text-xs font-bold focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-500/30 transition"
          >
            <option value="all">Sab reasons</option>
            {Object.entries(REASON_META).map(([k, m]) => (
              <option key={k} value={k}>{m.emoji} {m.label}</option>
            ))}
          </select>

          {/* Bulk select toggle */}
          {pendingIds.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className={[
                'h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition',
                allPendingSelected
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-300',
              ].join(' ')}
            >
              {allPendingSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
              Sab Pending Select
            </button>
          )}

          <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
            {filtered.length} {filtered.length === 1 ? 'damage' : 'damages'}
          </div>
        </div>
      </section>

      {/* ═══ LIST ═══ */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 sm:p-16 text-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/40">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
            {search || statusFilter !== 'all' || reasonFilter !== 'all' || datePreset !== 'all'
              ? 'Kuch nahi mila'
              : 'Alhamdulillah! Koi damage nahi'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-md mx-auto">
            {search || statusFilter !== 'all' || reasonFilter !== 'all' || datePreset !== 'all'
              ? 'Filter change karo'
              : 'Jab bhi maal kharaab, toota ya expire ho — yahan report karo. Stock khud adjust hogi aur nuqsaan record hoga.'}
          </p>
          {(search || statusFilter !== 'all' || reasonFilter !== 'all' || datePreset !== 'all') ? (
            <Button
              variant="secondary"
              className="mt-4 font-extrabold"
              onClick={() => { setSearch(''); setStatusFilter('all'); setReasonFilter('all'); setDatePreset('all'); }}
            >
              <X className="h-4 w-4" /> Filters Clear Karo
            </Button>
          ) : (
            <div className="mt-4 flex gap-2 justify-center flex-wrap">
              <Button variant="secondary" className="font-extrabold" onClick={() => setShowTeacher(true)}>
                <GraduationCap className="h-4 w-4" /> Pehle Seekh Lo
              </Button>
              <Button
                className="bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 font-extrabold shadow-lg shadow-rose-500/40"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4" /> Pehli Damage Report
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
            {filtered.map((d) => (
              <DamageRow
                key={d.id}
                damage={d}
                expanded={expandedId === d.id}
                hideCost={hideCost}
                selected={selectedIds.has(d.id)}
                onToggleSelect={d.status === 'REPORTED' ? () => toggleSelect(d.id) : undefined}
                onToggleExpand={() => setExpandedId(expandedId === d.id ? null : d.id)}
                onApprove={() => {
                  if (confirm(`"${d.damageNumber}" manzoor karein? Stock adjust ho jayegi.`)) {
                    approveMutation.mutate(d.id);
                  }
                }}
                onReject={() => setRejectTarget(d)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══ BULK APPROVE STICKY BAR ═══ */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 rounded-2xl bg-slate-950 dark:bg-slate-900 text-white shadow-2xl border border-white/20 px-4 py-3 flex items-center gap-3 print:hidden">
          <div className="text-xs font-extrabold">
            <span className="text-emerald-300">{selectedIds.size}</span> selected
            {!hideCost && (
              <span className="text-white/60"> • Loss <span className="text-rose-300 tabular-nums">{formatPKR(selectedLoss)}</span></span>
            )}
          </div>
          <button
            onClick={() => {
              if (confirm(`${selectedIds.size} damages manzoor karein? Stock adjust ho jayegi.`)) {
                bulkApproveMutation.mutate([...selectedIds]);
              }
            }}
            disabled={bulkApproveMutation.isPending}
            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-extrabold inline-flex items-center gap-1.5 disabled:opacity-50 transition"
          >
            <Check className="h-4 w-4" />
            {bulkApproveMutation.isPending ? 'Manzoor ho raha...' : 'Sab Manzoor Karo'}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ═══ REJECT MODAL ═══ */}
      {rejectTarget && (
        <RejectModal
          damage={rejectTarget}
          pending={rejectMutation.isPending}
          onClose={() => setRejectTarget(null)}
          onReject={(reason) => rejectMutation.mutate({ id: rejectTarget.id, reason })}
        />
      )}

      {showCreateModal && (
        <DamageCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            invalidate();
          }}
        />
      )}

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm 8mm; }
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
          main, aside, header, nav, [class*="max-h-"] {
            max-height: none !important; height: auto !important; overflow: visible !important;
          }
          html, body, #root, #__next { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"], [class*="fixed"] { display: none !important; }
          [class*="rounded-2xl"], [class*="rounded-3xl"] { overflow: visible !important; border-radius: 6px !important; }
          .divide-y-2 > div { page-break-inside: avoid !important; break-inside: avoid !important; border-bottom: 1px solid #e2e8f0 !important; }
          img { display: none !important; }
          .bg-amber-500, .bg-emerald-500, .bg-rose-500, .bg-slate-600 { color: #0f172a !important; background: #f1f5f9 !important; }
          .text-rose-700, [class*="rose-400"] { color: #be123c !important; }
          .text-emerald-700, [class*="emerald-400"] { color: #047857 !important; }
          .text-amber-700, [class*="amber-400"] { color: #b45309 !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   DAMAGE TEACHER — "Damage report kaise karte hain"
   ═════════════════════════════════════════════════════════════ */
function DamageTeacher({ hasDamages, hasPending, onClose, onStart }: {
  hasDamages: boolean;
  hasPending: boolean;
  onClose: () => void;
  onStart: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-rose-200 dark:border-rose-500/30 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-500/15 dark:to-red-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-rose-900 dark:text-rose-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Damage Tracking Kaise Kaam Karta Hai?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Jab bhi maal <strong>kharaab, toota, expire ya chori</strong> ho — yahan report karo.
            System <strong>khud stock kam</strong> karega aur aapka <strong>nuqsaan record</strong> hoga.
            Mahine ke aakhir mein pata chalega asli loss kahan hua.
          </p>

          {/* Live misal */}
          <div className="rounded-2xl border-2 border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/5 p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-rose-700 dark:text-rose-300">
              🥛 Misal: Milk Expire Ho Gaya
            </div>
            <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-500/30 tabular-nums">
                  5 packet expire
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-500/30">
                  Photo + reason
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400">=</span>
                <span className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 font-extrabold">
                  ⏳ Pending report
                </span>
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 p-2 font-extrabold text-emerald-700 dark:text-emerald-300">
                ✅ Manzoor kiya → Stock -5 → Loss recorded → Supplier claim?
              </div>
            </div>
          </div>

          {/* 3 steps */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <TeacherStep emoji="📝" title="Report Karo" desc="Product, qty, reason + photo lagao" />
            <TeacherStep emoji="🔍" title="Review Karo" desc="Manager photos aur wajah check kare" />
            <TeacherStep emoji="✅" title="Manzoor Karo" desc="Stock khud adjust ho jayegi" />
          </div>

          {/* Tips */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="flex items-start gap-2">
              <Camera className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
              <span><strong>Photo zaroor lagao</strong> — supplier claim ya dispute mein kaam aayegi</span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
              <span><strong>⏳ 48h+ purani pending</strong> reports red badge se dikhti hain — jaldi clear karo</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
              <span><strong>Bulk approve:</strong> "Sab Pending Select" se ek saath manzoor karo</span>
            </div>
            <div className="flex items-start gap-2">
              <Flame className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
              <span><strong>Loss breakdown</strong> dekho — sab se zyada nuqsaan kis wajah se, wahi theek karo</span>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 font-extrabold shadow-lg shadow-rose-500/40 h-12"
            onClick={onStart}
          >
            {hasDamages ? (
              hasPending ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Samajh Gaya — Pending Review Karo!
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Samajh Gaya — Nayi Report Karo!
                </>
              )
            ) : (
              <>
                <Plus className="h-4 w-4" /> Samajh Gaya — Pehli Report Karo!
              </>
            )}
          </Button>
        </div>
      </div>
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
   DAMAGE ROW
   ═════════════════════════════════════════════════════════════ */
function DamageRow({ damage, expanded, hideCost, selected, onToggleSelect, onToggleExpand, onApprove, onReject }: {
  damage: DamageLog;
  expanded: boolean;
  hideCost: boolean;
  selected: boolean;
  onToggleSelect?: () => void;
  onToggleExpand: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const statusCfg = STATUS_CONFIG[damage.status];
  const StatusIcon = statusCfg.icon;
  const reasonMeta = REASON_META[damage.reasonCode];
  const reasonTone = REASON_TONES[reasonMeta.color];

  const ageHours = (Date.now() - new Date(damage.createdAt).getTime()) / HOUR;
  const isAging = damage.status === 'REPORTED' && ageHours >= AGING_HOURS;
  const ageLabel = ageHours >= 24 ? `${Math.floor(ageHours / 24)} din` : `${Math.floor(ageHours)}h`;

  return (
    <div className={[
      'hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition',
      selected ? 'bg-emerald-50/60 dark:bg-emerald-500/10' : '',
      isAging ? 'bg-rose-50/40 dark:bg-rose-500/5' : '',
    ].join(' ')}>
      <div className="px-4 sm:px-5 py-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Bulk checkbox (sirf pending) */}
            {onToggleSelect && (
              <button
                onClick={onToggleSelect}
                className={[
                  'h-6 w-6 rounded-md border-2 flex items-center justify-center shrink-0 mt-2 transition print:hidden',
                  selected
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-emerald-400',
                ].join(' ')}
                title={selected ? 'Deselect' : 'Select'}
              >
                {selected && <Check className="h-3.5 w-3.5" />}
              </button>
            )}

            <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border-2 border-slate-200 dark:border-slate-700">
              {damage.product?.images?.[0]?.url ? (
                <img src={damage.product.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <Package className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                  {damage.damageNumber}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 ${statusCfg.color}`}>
                  <StatusIcon className="h-2.5 w-2.5" /> {statusCfg.label}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${reasonTone}`}>
                  {reasonMeta.emoji} {reasonMeta.label}
                </span>
                {isAging && (
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-rose-600 text-white uppercase tracking-wider inline-flex items-center gap-1 animate-pulse">
                    <Clock className="h-2.5 w-2.5" /> {ageLabel} pending
                  </span>
                )}
                {damage.supplierClaim && (
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40 uppercase tracking-wider">
                    Supplier Claim
                  </span>
                )}
              </div>

              <div className="mt-1 font-extrabold text-slate-900 dark:text-white text-sm truncate">
                {damage.product?.name || 'Product'}
                {damage.variant && (
                  <span className="text-violet-700 dark:text-violet-400 font-bold ml-1">
                    ({damage.variant.name})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 dark:text-slate-300 font-bold flex-wrap">
                <span>Qty: <strong className="text-slate-900 dark:text-white tabular-nums">{damage.quantity}</strong></span>
                {!hideCost && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span>Cost: <strong className="text-rose-700 dark:text-rose-400 tabular-nums">{formatPKR(damage.costImpact)}</strong></span>
                    {damage.salvageValue > 0 && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span>Bacha: <strong className="text-blue-700 dark:text-blue-400 tabular-nums">{formatPKR(damage.salvageValue)}</strong></span>
                      </>
                    )}
                  </>
                )}
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(damage.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <div className="text-xs text-slate-700 dark:text-slate-300 mt-1 italic line-clamp-1">
                "{damage.reason}"
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            {!hideCost ? (
              <>
                <div className="text-xl sm:text-2xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums leading-none">
                  -{formatPKR(damage.netLoss)}
                </div>
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 mt-1">
                  Net Loss
                </div>
              </>
            ) : (
              <div className="text-lg font-extrabold text-slate-400 dark:text-slate-600 tabular-nums">••••</div>
            )}

            <div className="mt-2 flex gap-1 justify-end flex-wrap print:hidden">
              {damage.photos?.length > 0 && (
                <button
                  onClick={onToggleExpand}
                  title="Photos"
                  className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center relative transition"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9px] font-extrabold flex items-center justify-center">
                    {damage.photos.length}
                  </span>
                </button>
              )}

              {damage.status === 'REPORTED' && (
                <>
                  <button
                    onClick={onApprove}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-sm transition"
                  >
                    <Check className="h-3.5 w-3.5" /> Manzoor
                  </button>
                  <button
                    onClick={onReject}
                    title="Rad karo"
                    className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 flex items-center justify-center transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Expanded photos */}
        {expanded && damage.photos?.length > 0 && (
          <div className="mt-4 pt-4 border-t-2 border-slate-100 dark:border-slate-800">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-600 dark:text-slate-300 mb-2">
              Photos ({damage.photos.length})
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {damage.photos.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-slate-200 dark:border-slate-700 hover:border-rose-400 dark:hover:border-rose-500/50 hover:shadow-md transition"
                >
                  <img src={url} alt={`photo-${i}`} loading="lazy" className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
            {damage.notes && (
              <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 mb-1">
                  Notes
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-200 font-semibold">{damage.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   REJECT MODAL
   ═════════════════════════════════════════════════════════════ */
function RejectModal({ damage, pending, onClose, onReject }: {
  damage: DamageLog;
  pending: boolean;
  onClose: () => void;
  onReject: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-500/40 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-rose-200 dark:border-rose-500/30 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-500/15 dark:to-red-500/15 flex items-center justify-between">
          <h3 className="font-extrabold text-rose-900 dark:text-rose-200 flex items-center gap-2">
            <XCircle className="h-4 w-4" /> Damage Rad Karo
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs">
            <span className="font-mono font-extrabold text-slate-900 dark:text-white">{damage.damageNumber}</span>
            <span className="text-slate-500 dark:text-slate-400"> — {damage.product?.name} × {damage.quantity}</span>
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Rad karne ki wajah <span className="text-rose-500">*</span>
            </label>
            <textarea
              autoFocus
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Ghalat report thi, stock theek hai..."
              className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:focus:ring-rose-500/30 resize-none transition"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 font-extrabold shadow-lg shadow-rose-500/40"
              onClick={() => {
                if (!reason.trim()) return toast.error('Wajah likhna zaroori hai');
                onReject(reason.trim());
              }}
              loading={pending}
              disabled={!reason.trim()}
            >
              <XCircle className="h-4 w-4" /> Rad Karo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   KPI
   ═════════════════════════════════════════════════════════════ */
function Kpi({ label, value, sub, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    amber:   'from-amber-500 to-orange-600 shadow-amber-500/40',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/40',
    rose:    'from-rose-500 to-red-600 shadow-rose-500/40',
    blue:    'from-blue-500 to-blue-700 shadow-blue-500/40',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm dark:shadow-black/20 hover:shadow-md dark:hover:shadow-lg transition-all hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">
            {label}
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">
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
