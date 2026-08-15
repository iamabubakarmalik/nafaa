import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  RefreshCw, Package, ShoppingCart, Sparkles, Truck,
  AlertTriangle, Check, X, Zap, DollarSign, Search,
  Clock, TrendingDown, Copy, MessageCircle, Printer,
  FileSpreadsheet, GraduationCap, ArrowRight, CheckCircle2,
  Circle, HelpCircle, Flame, CheckSquare, Square, CalendarDays,
  Lightbulb, Boxes,
} from 'lucide-react';
import { reorderApi, type ReorderSuggestion } from '../api/reorder.api';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA SMART REORDER — FULL BEST v2
   ─────────────────────────────────────────────────────────────
   🎓 Teacher modal — "Smart Reorder kaise kaam karta hai"
   🧭 3-step guide — Analyze → Review → Supplier ko bhejo
   📅 Date urgency: Foran (<3 din) / Kam (3-7) / OK (7+)
   ✅ Bulk "Mark Ordered" with loss-value in sticky bar
   📊 Supplier-wise groups + WhatsApp order + Copy list
   🖨️ Print/PDF perfect + CSV summary
   ⌨️  / search shortcut
   ✨ Dark mode perfect, 📱→4K responsive
   ═════════════════════════════════════════════════════════════ */

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-amber-500 text-white' },
  ORDERED: { label: 'Ordered', color: 'bg-emerald-500 text-white' },
  IGNORED: { label: 'Ignored', color: 'bg-slate-500 text-white' },
};

const URGENCY = {
  critical: { label: 'FORAN', emoji: '🔴', tone: 'rose',   desc: '< 3 din ka stock' },
  low:      { label: 'KAM',   emoji: '🟡', tone: 'amber',  desc: '3-7 din ka stock' },
  ok:       { label: 'THEEK', emoji: '🟢', tone: 'emerald', desc: '7+ din ka stock' },
} as const;

export default function ReorderPage() {
  const queryClient = useQueryClient();
  const hideCost = useCostHidden();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);

  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showTeacher, setShowTeacher] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  /* Debounced search */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const { data: suggestions = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['reorder-suggestions', statusFilter],
    queryFn: () => reorderApi.list(statusFilter === 'all' ? undefined : statusFilter),
  });

  /* All-status counts for pills */
  const { data: allSuggestions = [] } = useQuery({
    queryKey: ['reorder-suggestions', 'all'],
    queryFn: () => reorderApi.list(undefined),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['reorder-suggestions'] });

  const generateMutation = useMutation({
    mutationFn: () => reorderApi.generate(),
    onSuccess: (result) => {
      toast.success(`🧠 ${result.generated} nayi suggestions ban gayi`);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Fail hua'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => reorderApi.updateStatus(id, status),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => reorderApi.remove(id),
    onSuccess: () => { toast.success('Hata diya'); invalidate(); },
  });

  const bulkMarkOrdered = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.allSettled(ids.map((id) => reorderApi.updateStatus(id, 'ORDERED')));
    },
    onSuccess: (_d, ids) => {
      toast.success(`✓ ${ids.length} items ordered mark ho gaye`);
      setSelected(new Set());
      invalidate();
    },
    onError: () => { toast.error('Kuch fail hue'); invalidate(); },
  });

  const filtered = useMemo(() => {
    if (!debouncedSearch) return suggestions;
    const q = debouncedSearch.toLowerCase();
    return suggestions.filter((s) =>
      s.product?.name?.toLowerCase().includes(q) ||
      s.supplier?.name?.toLowerCase().includes(q),
    );
  }, [suggestions, debouncedSearch]);

  /* Filters badlein to selection reset */
  useEffect(() => { setSelected(new Set()); }, [statusFilter, debouncedSearch]);

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = { all: allSuggestions.length };
    allSuggestions.forEach((s) => { m[s.status] = (m[s.status] || 0) + 1; });
    return m;
  }, [allSuggestions]);

  /* ─── Stats ─────────────────────────────────────────── */
  const stats = useMemo(() => {
    const totalValue = filtered.reduce((sum, s) => sum + s.suggestedQuantity * s.lastPurchasePrice, 0);
    const critical = filtered.filter((s) => s.daysOfStockLeft < 3);
    const low = filtered.filter((s) => s.daysOfStockLeft >= 3 && s.daysOfStockLeft < 7);
    const ok = filtered.filter((s) => s.daysOfStockLeft >= 7);
    return {
      total: filtered.length,
      critical: critical.length,
      low: low.length,
      ok: ok.length,
      criticalValue: critical.reduce((a, s) => a + s.suggestedQuantity * s.lastPurchasePrice, 0),
      totalValue,
    };
  }, [filtered]);

  /* ─── Group by supplier ─────────────────────────────── */
  const bySupplier = useMemo(() => {
    return filtered.reduce((acc, s) => {
      const key = s.preferredSupplierId || 'none';
      if (!acc[key]) acc[key] = { supplier: s.supplier, items: [] as ReorderSuggestion[] };
      acc[key].items.push(s);
      return acc;
    }, {} as Record<string, { supplier: any; items: ReorderSuggestion[] }>);
  }, [filtered]);

  /* Sort supplier groups: most critical first */
  const supplierGroups = useMemo(() => {
    return Object.values(bySupplier).sort((a, b) => {
      const aMin = Math.min(...a.items.map((i) => i.daysOfStockLeft), 999);
      const bMin = Math.min(...b.items.map((i) => i.daysOfStockLeft), 999);
      return aMin - bMin;
    });
  }, [bySupplier]);

  /* ─── Selection helpers ─────────────────────────────── */
  const pendingIds = useMemo(
    () => filtered.filter((s) => s.status === 'PENDING').map((s) => s.id),
    [filtered],
  );
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));
  const toggleSelect = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () =>
    setSelected(allPendingSelected ? new Set() : new Set(pendingIds));

  const selectedValue = useMemo(
    () => filtered.filter((s) => selected.has(s.id)).reduce((a, s) => a + s.suggestedQuantity * s.lastPurchasePrice, 0),
    [filtered, selected],
  );

  /* ─── Actions ───────────────────────────────────────── */
  const copyOrderList = (items: ReorderSuggestion[], supplier?: any) => {
    const lines = items.map((s, i) =>
      `${i + 1}. ${s.product?.name || 'Product'} — ${s.suggestedQuantity} ${s.product?.unit || 'pcs'} @ ${formatPKR(s.lastPurchasePrice)}`
    ).join('\n');
    const total = items.reduce((a, s) => a + s.suggestedQuantity * s.lastPurchasePrice, 0);
    const full = `${supplier?.name ? `Supplier: ${supplier.name}\n` : ''}Order List (${new Date().toLocaleDateString('en-PK')}):\n\n${lines}\n\nEstimated Total: ${formatPKR(total)}`;
    navigator.clipboard.writeText(full);
    toast.success('Order list copy ho gaya — supplier ko bhejo');
  };

  const whatsappOrder = (supplier: any, items: ReorderSuggestion[]) => {
    if (!supplier?.phone) return toast.error('Supplier ka phone number nahi hai');
    const phone = String(supplier.phone).replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    const lines = items.map((s, i) =>
      `${i + 1}. ${s.product?.name || 'Product'} — ${s.suggestedQuantity} ${s.product?.unit || 'pcs'}`
    ).join('\n');
    const total = items.reduce((a, s) => a + s.suggestedQuantity * s.lastPurchasePrice, 0);
    const msg = `Assalam-o-Alaikum ${supplier.name},\n\nMujhe yeh items chahiye:\n\n${lines}\n\nEstimated: ${formatPKR(total)}\n\nDelivery kab ho sakti hai?`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  /* ─── CSV Export ────────────────────────────────────── */
  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const header = [
      [`Smart Reorder Report — ${tenantName || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Status: ${statusFilter}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Items: ${stats.total}  •  Foran: ${stats.critical}  •  Est. Value: ${stats.totalValue.toFixed(2)}`],
      [''],
    ];
    const cols = ['#', 'Product', 'Supplier', 'Stock Abhi', 'Din Baaki', 'Roz Bikri', 'Order Qty', 'Unit Price', 'Order Value', 'Urgency', 'Status'];
    const rows = filtered.map((s, i) => [
      i + 1,
      s.product?.name || '', s.supplier?.name || '',
      s.currentStock, s.daysOfStockLeft.toFixed(1), s.avgDailySales.toFixed(1),
      s.suggestedQuantity, s.lastPurchasePrice.toFixed(2),
      (s.suggestedQuantity * s.lastPurchasePrice).toFixed(2),
      s.daysOfStockLeft < 3 ? 'FORAN' : s.daysOfStockLeft < 7 ? 'KAM' : 'THEEK',
      s.status,
    ]);
    const csv = [...header, cols, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reorder-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  const handlePrint = () => window.print();
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  /* ─── Keyboard shortcut ─────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape' && showTeacher) setShowTeacher(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher]);

  /* ─── Setup progress ────────────────────────────────── */
  const setupStep = allSuggestions.length === 0 ? 1
    : stats.critical + stats.low > 0 ? 2
    : 3;

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 print:space-y-3">
      {/* ═══ PRINT-ONLY HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-blue-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">🔄 {tenantName || 'My Store'}</h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `Shop: ${shopName}  •  ` : ''}Smart Reorder Report • Status: {statusFilter}
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
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Smart Reorder
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-emerald-200">🏪 {shopName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
              🔄 Reorder Suggestions
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              {stats.critical > 0 ? (
                <>
                  <strong className="text-rose-300">{stats.critical}</strong> foran
                  <span className="opacity-50 mx-1.5">•</span>
                  <strong className="text-amber-300">{stats.low}</strong> kam stock
                  {!hideCost && (
                    <> <span className="opacity-50 mx-1.5">•</span> Value <strong className="text-emerald-300">{formatPKR(stats.totalValue)}</strong></>
                  )}
                </>
              ) : (
                <>Sales history se auto-detect — kaunsi cheez khatam hone wali hai</>
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
              <FileSpreadsheet className="h-4 w-4" />
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
              className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold shadow-2xl"
              onClick={() => generateMutation.mutate()}
              loading={generateMutation.isPending}
            >
              <Zap className="h-4 w-4" /> Analyze & Suggest
            </Button>
          </div>
        </div>

        {/* 3-step guide */}
        <div className="relative mt-4 flex items-center gap-2 sm:gap-3 flex-wrap">
          <StepPill n={1} label="Analyze Karo" state={setupStep > 1 ? 'done' : setupStep === 1 ? 'active' : 'todo'} />
          <ArrowRight className="h-4 w-4 text-white/40 shrink-0" />
          <StepPill n={2} label="Review Karo" state={setupStep > 2 ? 'done' : setupStep === 2 ? 'active' : 'todo'} />
          <ArrowRight className="h-4 w-4 text-white/40 shrink-0" />
          <StepPill n={3} label="Supplier Ko Bhejo" state={setupStep === 3 ? 'done' : 'todo'} />
        </div>
      </section>

      {/* ═══ TEACHER MODAL ═══ */}
      {showTeacher && <ReorderTeacher onClose={() => setShowTeacher(false)} onStart={() => { setShowTeacher(false); generateMutation.mutate(); }} />}

      {/* ═══ URGENCY KPIs (clickable filters) ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi label="Total Items" value={stats.total} sub="reorder chahiye" icon={ShoppingCart} tone="blue" />
        <Kpi
          label="🔴 Foran" value={stats.critical}
          sub={hideCost ? '< 3 din bacha' : `< 3 din • ${formatPKR(stats.criticalValue)}`}
          icon={Flame} tone="rose" urgent={stats.critical > 0}
        />
        <Kpi label="🟡 Kam Stock" value={stats.low} sub="3-7 din bacha" icon={Clock} tone="amber" />
        <Kpi
          label="Order Value"
          value={hideCost ? '••••' : formatPKR(stats.totalValue)}
          sub={`${Object.keys(bySupplier).length} suppliers`}
          icon={DollarSign} tone="emerald"
        />
      </section>

      {/* ═══ TOOLBAR ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3 print:hidden">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Product ya supplier... (/ shortcut)"
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
        </div>

        <div className="flex gap-1.5 flex-wrap items-center">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-wrap">
            {[
              { v: 'PENDING', l: 'Pending' },
              { v: 'ORDERED', l: 'Ordered' },
              { v: 'IGNORED', l: 'Ignored' },
              { v: 'all',     l: 'Sab' },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setStatusFilter(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  statusFilter === o.v
                    ? 'bg-blue-600 text-white shadow-sm'
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
            {filtered.length} suggestions
          </div>
        </div>
      </section>

      {/* ═══ BULK BAR ═══ */}
      {selected.size > 0 && (
        <section className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 rounded-2xl bg-slate-950 dark:bg-slate-900 text-white shadow-2xl border border-white/20 px-4 py-3 flex items-center gap-3 print:hidden">
          <div className="text-xs font-extrabold">
            <span className="text-emerald-300">{selected.size}</span> selected
            {!hideCost && (
              <span className="text-white/60"> • Value <span className="text-emerald-300 tabular-nums">{formatPKR(selectedValue)}</span></span>
            )}
          </div>
          <button
            onClick={() => {
              if (confirm(`${selected.size} items "Ordered" mark karein?`)) {
                bulkMarkOrdered.mutate(Array.from(selected));
              }
            }}
            disabled={bulkMarkOrdered.isPending}
            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-extrabold inline-flex items-center gap-1.5 disabled:opacity-50 transition"
          >
            <Check className="h-4 w-4" />
            {bulkMarkOrdered.isPending ? 'Marking...' : 'Mark Ordered'}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            <X className="h-4 w-4" />
          </button>
        </section>
      )}

      {/* ═══ CONTENT ═══ */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 sm:p-16 text-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/40">
            <Check className="h-10 w-10 text-white" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
            {search ? 'Kuch nahi mila' : allSuggestions.length === 0 ? 'Pehli dafa ho? 🧠' : 'Sab kuch stock mein hai! 🎉'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-md mx-auto">
            {search
              ? 'Search clear karo ya filter change karo'
              : allSuggestions.length === 0
              ? '"Analyze & Suggest" dabao — hum aapki sales history dekh kar batayenge ke kya order karna hai. Roz ka kaam 30 second ka ho jayega.'
              : statusFilter === 'PENDING'
              ? 'Koi pending reorder nahi. "Analyze & Suggest" se naya scan karo.'
              : 'Is status mein kuch nahi'}
          </p>
          {search ? (
            <Button variant="secondary" className="mt-4 font-extrabold" onClick={() => setSearch('')}>
              <X className="h-4 w-4" /> Search Clear Karo
            </Button>
          ) : (
            <Button
              className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-700 font-extrabold shadow-lg shadow-blue-500/40"
              onClick={() => generateMutation.mutate()}
              loading={generateMutation.isPending}
            >
              <Zap className="h-4 w-4" /> Ab Analyze Karo
            </Button>
          )}
        </div>
      ) : (
        <section className="space-y-4">
          {supplierGroups.map((group) => {
            const groupValue = group.items.reduce((a, i) => a + i.suggestedQuantity * i.lastPurchasePrice, 0);
            const groupCritical = group.items.filter((i) => i.daysOfStockLeft < 3).length;
            return (
              <div
                key={group.supplier?.id || 'none'}
                className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                {/* Supplier header */}
                <div className="px-4 sm:px-5 py-3 border-b-2 border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 shrink-0">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 dark:text-white truncate">
                          {group.supplier?.name || 'Koi supplier nahi'}
                        </h3>
                        {groupCritical > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold uppercase animate-pulse shrink-0">
                            🔴 {groupCritical} foran
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                        {group.items.length} items
                        {group.supplier?.phone && ` • ${group.supplier.phone}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap print:hidden">
                    {!hideCost && (
                      <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {formatPKR(groupValue)}
                      </div>
                    )}
                    <button
                      onClick={() => copyOrderList(group.items, group.supplier)}
                      className="h-9 px-3 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50 text-xs font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 transition"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy List
                    </button>
                    {group.supplier?.phone && (
                      <button
                        onClick={() => whatsappOrder(group.supplier, group.items)}
                        className="h-9 px-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-md shadow-green-500/30 transition"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </button>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {group.items
                    .sort((a, b) => a.daysOfStockLeft - b.daysOfStockLeft)
                    .map((sug) => (
                      <SuggestionRow
                        key={sug.id}
                        suggestion={sug}
                        hideCost={hideCost}
                        selected={selected.has(sug.id)}
                        onToggleSelect={sug.status === 'PENDING' ? () => toggleSelect(sug.id) : undefined}
                        onMarkOrdered={() => updateStatus.mutate({ id: sug.id, status: 'ORDERED' })}
                        onIgnore={() => updateStatus.mutate({ id: sug.id, status: 'IGNORED' })}
                        onRemove={() => {
                          if (confirm(`"${sug.product?.name}" ki suggestion hata dein?`)) removeMutation.mutate(sug.id);
                        }}
                      />
                    ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm 8mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
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
          .divide-y > div { page-break-inside: avoid !important; break-inside: avoid !important; border-bottom: 1px solid #e2e8f0 !important; }
          img { display: none !important; }
          .bg-rose-500, .bg-amber-500, .bg-emerald-500 { background: #f1f5f9 !important; color: #0f172a !important; }
          .text-rose-700, [class*="rose-400"] { color: #be123c !important; }
          .text-amber-700, [class*="amber-400"] { color: #b45309 !important; }
          .text-emerald-700, [class*="emerald-400"] { color: #047857 !important; }
          .text-blue-700, [class*="blue-400"] { color: #1d4ed8 !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   REORDER TEACHER — "Kaise kaam karta hai"
   ═════════════════════════════════════════════════════════════ */

function ReorderTeacher({ onClose, onStart }: { onClose: () => void; onStart: () => void }) {
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
            <GraduationCap className="h-5 w-5" /> Smart Reorder Kaise Kaam Karta Hai?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Roz stock check karne ki jagah, system <strong>khud aapki sales speed dekh kar</strong> bata deta hai
            ke kaunsa product khatam hone wala hai — uske <strong>khatam hone SE PEHLE</strong>.
          </p>

          {/* How it works visual */}
          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-blue-700 dark:text-blue-300">
              🧠 Misal: Lay's Chips
            </div>
            <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 tabular-nums">Stock: 20</span>
                <ArrowRight className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 tabular-nums">Roz bike: 5</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">=</span>
                <span className="px-2 py-1 rounded-lg bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 font-extrabold tabular-nums">
                  ⏳ 4 din mein khatam!
                </span>
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 p-2 font-extrabold text-emerald-700 dark:text-emerald-300">
                ✅ Suggestion: "24 aur order karo" (2 hafte ka stock)
              </div>
            </div>
          </div>

          {/* 3 steps */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <TeacherStep emoji="🧠" title="Analyze" desc="Roz ka sales data scan hota hai" />
            <TeacherStep emoji="📋" title="Review" desc="Aap check karke edit/ignore karo" />
            <TeacherStep emoji="📱" title="Order" desc="WhatsApp se supplier ko bhejo" />
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>🔴 FORAN</strong> = 3 din se kam stock — aaj hi order karo</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>🟡 KAM</strong> = 3-7 din — is hafte order karo</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Supplier pe <strong>WhatsApp button</strong> — poori list ek click mein bhejo</span>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 font-extrabold shadow-lg shadow-blue-500/40 h-12"
            onClick={onStart}
          >
            <Zap className="h-4 w-4" /> Samajh Gaya — Abhi Analyze Karo!
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
   SUGGESTION ROW
   ═════════════════════════════════════════════════════════════ */

function SuggestionRow({ suggestion, hideCost, selected, onToggleSelect, onMarkOrdered, onIgnore, onRemove }: {
  suggestion: ReorderSuggestion;
  hideCost: boolean;
  selected: boolean;
  onToggleSelect?: () => void;
  onMarkOrdered: () => void;
  onIgnore: () => void;
  onRemove: () => void;
}) {
  const isCritical = suggestion.daysOfStockLeft < 3;
  const isLow = !isCritical && suggestion.daysOfStockLeft < 7;
  const orderValue = suggestion.suggestedQuantity * suggestion.lastPurchasePrice;
  const urgency = isCritical ? URGENCY.critical : isLow ? URGENCY.low : URGENCY.ok;

  const statusMeta = STATUS_META[suggestion.status];

  return (
    <div className={[
      'px-4 sm:px-5 py-4 hover:bg-blue-50/40 dark:hover:bg-blue-500/5 transition',
      selected ? 'bg-blue-50/60 dark:bg-blue-500/10' : '',
      isCritical && suggestion.status === 'PENDING' ? 'bg-rose-50/40 dark:bg-rose-500/5' : '',
    ].join(' ')}>
      <div className="flex items-start gap-3">
        {/* Bulk checkbox */}
        {onToggleSelect && (
          <button
            onClick={onToggleSelect}
            className={[
              'h-6 w-6 rounded-md border-2 flex items-center justify-center shrink-0 mt-2.5 transition print:hidden',
              selected
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-emerald-400',
            ].join(' ')}
          >
            {selected && <Check className="h-3.5 w-3.5" />}
          </button>
        )}

        <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border-2 border-slate-200 dark:border-slate-700">
          {suggestion.product?.images?.[0]?.url ? (
            <img src={suggestion.product.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <Package className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/retail-products/${suggestion.productId}`}
              className="font-extrabold text-slate-900 dark:text-white text-sm hover:text-blue-600 dark:hover:text-blue-400 truncate"
            >
              {suggestion.product?.name || 'Product'}
            </Link>
            {suggestion.status === 'PENDING' && (
              <span className={[
                'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider',
                isCritical ? 'bg-rose-500 text-white animate-pulse' :
                isLow ? 'bg-amber-500 text-white' :
                'bg-emerald-500 text-white',
              ].join(' ')}>
                {urgency.emoji} {urgency.label}
              </span>
            )}
            {suggestion.status !== 'PENDING' && statusMeta && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${statusMeta.color}`}>
                {statusMeta.label}
              </span>
            )}
          </div>

          {/* Data grid */}
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <MiniCell label="Abhi Stock" value={`${suggestion.currentStock} ${suggestion.product?.unit || ''}`} tone={isCritical ? 'rose' : isLow ? 'amber' : 'slate'} />
            <MiniCell label="Kitne Din Baaki" value={`${suggestion.daysOfStockLeft.toFixed(1)} din`} tone={isCritical ? 'rose' : isLow ? 'amber' : 'slate'} />
            <MiniCell label="Roz Ki Bikri" value={`${suggestion.avgDailySales.toFixed(1)}/din`} tone="slate" />
            <MiniCell label="Order Karo" value={`${suggestion.suggestedQuantity} ${suggestion.product?.unit || ''}`} tone="blue" />
          </div>

          {/* Stock depletion bar */}
          <div className="mt-2 max-w-xs">
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={[
                  'h-full rounded-full transition-all',
                  isCritical ? 'bg-gradient-to-r from-rose-500 to-red-600' :
                  isLow ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                  'bg-gradient-to-r from-emerald-500 to-teal-500',
                ].join(' ')}
                style={{ width: `${Math.min(Math.max((suggestion.daysOfStockLeft / 14) * 100, 3), 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 min-w-[110px]">
          <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Order Value</div>
          {!hideCost ? (
            <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(orderValue)}</div>
          ) : (
            <div className="text-lg font-extrabold text-slate-400 dark:text-slate-600">••••</div>
          )}
          {!hideCost && (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tabular-nums">
              @ {formatPKR(suggestion.lastPurchasePrice)}
            </div>
          )}

          <div className="mt-2 flex gap-1 justify-end print:hidden">
            {suggestion.status === 'PENDING' && (
              <>
                <button
                  onClick={onMarkOrdered}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-sm transition"
                >
                  <Check className="h-3 w-3" /> Ordered
                </button>
                <button
                  onClick={onIgnore}
                  title="Ignore"
                  className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {suggestion.status !== 'PENDING' && (
              <button
                onClick={onRemove}
                title="Hataao"
                className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function MiniCell({ label, value, tone }: { label: string; value: string; tone: string }) {
  const tones: Record<string, string> = {
    rose:    'text-rose-700 dark:text-rose-400',
    amber:   'text-amber-700 dark:text-amber-400',
    blue:    'text-blue-700 dark:text-blue-400',
    slate:   'text-slate-700 dark:text-slate-300',
    emerald: 'text-emerald-700 dark:text-emerald-400',
  };
  return (
    <div>
      <div className="text-[9px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">{label}</div>
      <div className={`font-extrabold tabular-nums ${tones[tone]}`}>{value}</div>
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, tone, urgent }: any) {
  const tones: Record<string, string> = {
    blue:    'from-blue-500 to-blue-700 shadow-blue-500/40',
    rose:    'from-rose-500 to-red-600 shadow-rose-500/40',
    amber:   'from-amber-500 to-orange-600 shadow-amber-500/40',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/40',
  };
  return (
    <div className={[
      'rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 p-3 sm:p-4 shadow-sm dark:shadow-black/20 hover:shadow-md dark:hover:shadow-lg transition-all hover:-translate-y-0.5 relative',
      urgent ? 'border-rose-300 dark:border-rose-500/50 ring-2 ring-rose-200 dark:ring-rose-500/20' : 'border-slate-200 dark:border-slate-800',
    ].join(' ')}>
      {urgent && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 animate-ping" />}
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
    </div>
  );
}
