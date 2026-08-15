// apps/web/src/industries/retail/pages/RetailStockAdjustmentsPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck, Plus, ArrowUp, ArrowDown, ShieldAlert, FileWarning,
  Search, X, Calendar, User as UserIcon, FileSpreadsheet,
  RefreshCw, Package, CheckCircle2, GraduationCap, Sparkles,
  Printer, Zap, ArrowRight, Clock,
} from 'lucide-react';
import {
  stockAdjustmentsApi, type AdjustmentType, type CreateAdjustmentPayload,
} from '@modules/inventory/stock-adjustments/api/stock-adjustments.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA RETAIL STOCK ADJUSTMENTS — FULL BEST
   ─────────────────────────────────────────────────────────────
   🛒 Grocery-focused — sirf Product (variant/roll/IMEI nahi)
   ⚡ Fast flow: product → type → qty → reason chips → save
   👁️ Live "naya stock" preview + minus warning
   🎓 Teacher modal • ⌨️ / search • Esc band
   🌙 Dark mode complete • 🖨️ Print + CSV
   ═════════════════════════════════════════════════════════════ */

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
const formatQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

const TYPE_CONFIG: Record<AdjustmentType, any> = {
  ADJUSTMENT_IN:  { label: 'Maal Aaya',   emoji: '➕', hex: '#10b981',
    light: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dark: 'dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
    btn: 'from-emerald-600 to-teal-700 shadow-emerald-500/40', isPositive: true },
  ADJUSTMENT_OUT: { label: 'Maal Gaya',   emoji: '➖', hex: '#3b82f6',
    light: 'bg-blue-100 text-blue-700 border-blue-200',
    dark: 'dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40',
    btn: 'from-blue-600 to-indigo-700 shadow-blue-500/40', isPositive: false },
  DAMAGE:         { label: 'Kharaab/Toota', emoji: '💔', hex: '#ef4444',
    light: 'bg-rose-100 text-rose-700 border-rose-200',
    dark: 'dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40',
    btn: 'from-rose-600 to-red-700 shadow-rose-500/40', isPositive: false },
  LOSS:           { label: 'Gum/Chori',   emoji: '🕳️', hex: '#f59e0b',
    light: 'bg-amber-100 text-amber-700 border-amber-200',
    dark: 'dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',
    btn: 'from-amber-600 to-orange-700 shadow-amber-500/40', isPositive: false },
};

/** Grocery quick reasons — type ke hisaab se */
const QUICK_REASONS: Record<AdjustmentType, string[]> = {
  ADJUSTMENT_IN:  ['Customer return theek nikli', 'Ginti me zyada nikla', 'Free sample aaya', 'Supplier se extra mila', 'Damage wapas theek hua'],
  ADJUSTMENT_OUT: ['Customer ko sample diya', 'Staff ne use kiya', 'Ginti me kam nikla', 'Expired maal phenka', 'Promo ke liye nikala'],
  DAMAGE:         ['Expire ho gaya', 'Packet toot gaya', 'Pani laga', 'Keeray lag gaye', 'Garmi se kharaab', 'Transport me toota'],
  LOSS:           ['Gum ho gaya', 'Chori ho gayi', 'Gin-ti me farq', 'Khatam hone ka pata nahi'],
};

export default function RetailStockAdjustmentsPage() {
  const queryClient = useQueryClient();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const productSearchRef = useRef<HTMLInputElement>(null);

  /* ─── Form state ─── */
  const [productId, setProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [type, setType] = useState<AdjustmentType>('ADJUSTMENT_IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);

  /* ─── History filters ─── */
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<AdjustmentType | 'all'>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7d' | '30d'>('all');

  /* ─── Queries ─── */
  const { data: productsData } = useQuery({
    queryKey: ['products-for-adjustments'],
    queryFn: () => productsApi.list({ page: 1, limit: 500 } as any),
  });

  const { data: adjustments = [], refetch, isRefetching } = useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: stockAdjustmentsApi.list,
  });

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    const products: any[] = productsData?.items ?? [];
    if (!q) return products.slice(0, 20);
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q),
    ).slice(0, 20);
  }, [productsData, productSearch]);

  const selectedProduct: any = (productsData?.items ?? []).find((p: any) => p.id === productId);

  const filteredAdjustments = useMemo(() => {
    let result: any[] = [...adjustments];
    const from = presetFromDate(datePreset);
    if (from) result = result.filter((a) => new Date(a.createdAt) >= from);
    const q = historySearch.toLowerCase().trim();
    if (q) {
      result = result.filter((a) =>
        a.product?.name?.toLowerCase().includes(q) ||
        (a.reason || '').toLowerCase().includes(q),
      );
    }
    if (historyFilter !== 'all') result = result.filter((a) => a.type === historyFilter);
    return result;
  }, [adjustments, historySearch, historyFilter, datePreset]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayAdj = adjustments.filter((a: any) => new Date(a.createdAt).toDateString() === today);
    const damaged = adjustments.filter((a: any) => a.type === 'DAMAGE').reduce((s: number, a: any) => s + a.quantity, 0);
    const lost = adjustments.filter((a: any) => a.type === 'LOSS').reduce((s: number, a: any) => s + a.quantity, 0);
    return { total: adjustments.length, today: todayAdj.length, damaged, lost };
  }, [adjustments]);

  /* ─── 👁️ Live preview ─── */
  const stockPreview = useMemo(() => {
    if (!selectedProduct) return null;
    const current = Number(selectedProduct.stock || 0);
    const qty = Number(quantity || 0);
    if (!qty || qty <= 0) return null;
    const cfg = TYPE_CONFIG[type];
    const next = cfg.isPositive ? current + qty : current - qty;
    return { current, next, unit: selectedProduct.unit || 'pcs', negative: next < 0 };
  }, [selectedProduct, quantity, type]);

  /* ─── Save ─── */
  const createMutation = useMutation({
    mutationFn: (payload: CreateAdjustmentPayload) => stockAdjustmentsApi.create(payload),
    onSuccess: () => {
      toast.success('✓ Adjustment save — stock update ho gaya');
      setProductId(''); setProductSearch(''); setQuantity(''); setReason(''); setNote('');
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['retail-products'] });
      productSearchRef.current?.focus();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Adjustment fail ho gayi'),
  });

  const handleSubmit = () => {
    if (!productId) return toast.error('Product select karo');
    const qty = Number(quantity);
    if (!qty || qty <= 0) return toast.error('Valid quantity likho');
    if (!reason.trim()) return toast.error('Reason likhna zaroori hai');
    createMutation.mutate({
      productId, type, quantity: qty,
      reason: reason.trim(), note: note.trim() || undefined,
    });
  };

  /* ─── CSV ─── */
  const exportCSV = () => {
    if (filteredAdjustments.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`Stock Adjustments — ${tenantName || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}  •  Total: ${filteredAdjustments.length}`],
      [''],
    ];
    const headers = ['Date', 'Type', 'Product', 'Qty', 'Unit', 'Reason', 'Note', 'By'];
    const rows = filteredAdjustments.map((a: any) => [
      new Date(a.createdAt).toLocaleString('en-PK'),
      TYPE_CONFIG[a.type as AdjustmentType]?.label || a.type,
      a.product?.name || '', formatQty(a.quantity), a.product?.unit || '',
      a.reason || '', a.note || '', a.createdBy?.fullName || 'System',
    ]);
    const csv = [...summary, headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-adjustments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredAdjustments.length} adjustments export ho gaye`);
  };

  /* ─── Keyboard: / = search, Esc = teacher band ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) { setShowTeacher(false); return; }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); productSearchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  const hasHistoryFilters = !!historySearch || historyFilter !== 'all' || datePreset !== 'all';
  const canSave = !!productId && Number(quantity) > 0 && !!reason.trim();
  const cfg = TYPE_CONFIG[type];

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {showTeacher && <AdjustmentsTeacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <ClipboardCheck className="h-3.5 w-3.5 text-amber-300" /> Stock Control
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-emerald-200">🏪 {shopName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">⚖️ Stock Adjustments</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              Maal aya, gaya, toota, gum hua — har change ka record yahan
              {stats.today > 0 && (
                <>
                  <span className="opacity-50 mx-1.5">•</span>
                  Aaj <strong className="text-amber-300">{stats.today}</strong> adjustments
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
              <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>
      </section>

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <Kpi icon={Calendar} tone="blue" label="Aaj Ki" value={stats.today} sub="Today" />
        <Kpi icon={ClipboardCheck} tone="violet" label="Total" value={stats.total} sub="All time" />
        <Kpi icon={ShieldAlert} tone="rose" label="Damaged" value={formatQty(stats.damaged)} sub="Items" />
        <Kpi icon={FileWarning} tone="amber" label="Lost" value={formatQty(stats.lost)} sub="Items" />
      </section>

      {/* ═══ FORM + HISTORY ═══ */}
      <section className="grid xl:grid-cols-[480px_1fr] gap-4 sm:gap-5 items-start">
        {/* ═══ FORM ═══ */}
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-blue-200 dark:border-blue-500/40 shadow-sm p-5 print:hidden">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/40 shrink-0">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Nayi Adjustment</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">3 step: product → qty → reason</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 1 — Product picker */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                ① Product * <span className="normal-case font-bold text-slate-400 dark:text-slate-500">(/ dabao)</span>
              </label>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={productSearchRef}
                  type="text" value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setProductId(''); }}
                  placeholder="Naam, SKU ya barcode..."
                  className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 transition"
                />
                {productSearch && (
                  <button onClick={() => { setProductSearch(''); setProductId(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>
              {productSearch && !productId && filteredProducts.length > 0 && (
                <div className="mt-2 max-h-[220px] overflow-y-auto rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700 shadow-lg">
                  {filteredProducts.map((p: any) => (
                    <button key={p.id} type="button"
                      onClick={() => { setProductId(p.id); setProductSearch(p.name); }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-500/10 transition flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {p.sku || '—'} • Stock: <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatQty(p.stock)} {p.unit}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedProduct && (
                <div className="mt-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/40 p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">✓ {selectedProduct.name}</div>
                    <div className="text-xs text-blue-700 dark:text-blue-300 font-bold mt-0.5 tabular-nums">
                      Stock abhi: {formatQty(selectedProduct.stock)} {selectedProduct.unit}
                    </div>
                  </div>
                  <button onClick={() => { setProductId(''); setProductSearch(''); }} className="text-xs font-extrabold text-blue-700 dark:text-blue-300 hover:underline shrink-0">
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* 2 — Type */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                ② Kya Hua? *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(TYPE_CONFIG) as [AdjustmentType, any][]).map(([key, c]) => {
                  const active = type === key;
                  return (
                    <button key={key} type="button" onClick={() => setType(key)}
                      className={`px-3 py-3 rounded-xl border-2 transition text-left ${
                        active ? `${c.light} ${c.dark} shadow-md scale-[1.02]` : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50'
                      }`}>
                      <div className="text-lg">{c.emoji}</div>
                      <div className="text-xs font-extrabold mt-0.5 text-slate-900 dark:text-white">{c.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Kitna? {selectedProduct ? `(${selectedProduct.unit})` : ''} *
              </label>
              <input
                type="number" step="0.01" inputMode="decimal" min="0.01" value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="5"
                className="h-14 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-center text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-500/20 transition"
              />
            </div>

            {/* 👁️ Live preview */}
            {stockPreview && (
              <div className={[
                'rounded-xl border-2 p-3 flex items-center justify-center gap-3 text-sm font-extrabold tabular-nums',
                stockPreview.negative
                  ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200',
              ].join(' ')}>
                <span>{formatQty(stockPreview.current)}</span>
                <ArrowRight className="h-4 w-4" />
                <span className={stockPreview.negative ? '' : cfg.isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-400'}>
                  {formatQty(stockPreview.next)} {stockPreview.unit}
                </span>
                {stockPreview.negative && <span className="text-xs">⚠️ minus ho jayega!</span>}
              </div>
            )}

            {/* 3 — Reason + quick chips */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                ③ Wajah * <span className="normal-case font-bold text-slate-400 dark:text-slate-500">(audit ke liye zaroori)</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {QUICK_REASONS[type].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`px-2.5 py-1.5 rounded-lg border-2 text-[11px] font-extrabold transition ${
                      reason === r
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500/50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ya apni wajah likho..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Extra note (optional)..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
            />

            <Button
              className={`w-full bg-gradient-to-r ${cfg.btn} font-extrabold`}
              size="lg"
              loading={createMutation.isPending}
              disabled={!canSave}
              onClick={handleSubmit}
            >
              <Plus className="h-4 w-4" /> Save Adjustment
            </Button>
          </div>
        </div>

        {/* ═══ HISTORY ═══ */}
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">History</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
                  {filteredAdjustments.length} of {adjustments.length}
                </p>
              </div>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={historySearch} onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search..."
                  className="h-9 w-48 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap items-center">
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                {([
                  { v: 'all' as const, l: 'Sab' },
                  { v: 'today' as const, l: 'Aaj' },
                  { v: '7d' as const, l: '7 Din' },
                  { v: '30d' as const, l: '30 Din' },
                ]).map((o) => (
                  <button key={o.v} onClick={() => setDatePreset(o.v)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                      datePreset === o.v ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                    }`}>
                    {o.l}
                  </button>
                ))}
              </div>
              {(Object.entries(TYPE_CONFIG) as [AdjustmentType, any][]).map(([key, c]) => (
                <button key={key} onClick={() => setHistoryFilter(historyFilter === key ? 'all' : key)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition border-2 ${
                    historyFilter === key ? `${c.light} ${c.dark}` : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                  {c.emoji} {c.label}
                </button>
              ))}
              {hasHistoryFilters && (
                <button onClick={() => { setHistorySearch(''); setHistoryFilter('all'); setDatePreset('all'); }}
                  className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1 transition">
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          </div>

          {filteredAdjustments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-500/20 dark:to-indigo-500/20 flex items-center justify-center">
                <ClipboardCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="mt-3 font-extrabold text-slate-900 dark:text-white">
                {hasHistoryFilters ? 'Kuch nahi mila' : 'Abhi koi adjustment nahi'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                {hasHistoryFilters ? 'Filter change karo' : 'Baayein form se pehli adjustment karo'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[700px] overflow-y-auto">
              {filteredAdjustments.map((a: any) => {
                const c = TYPE_CONFIG[a.type as AdjustmentType];
                const isPos = c?.isPositive;
                return (
                  <div key={a.id} className="px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border-2 ${c?.light} ${c?.dark} text-lg`}>
                          {c?.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{a.product?.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${c?.light} ${c?.dark}`}>
                              {c?.label}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-semibold">{a.reason}</div>
                          {a.note && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 italic">{a.note}</div>}
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-2 flex-wrap font-semibold">
                            <span className="inline-flex items-center gap-0.5">
                              <Calendar className="h-2.5 w-2.5" />{formatDate(a.createdAt)}
                            </span>
                            {a.createdBy && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-0.5">
                                  <UserIcon className="h-2.5 w-2.5" />{a.createdBy.fullName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-extrabold text-lg tabular-nums ${isPos ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                          {isPos ? '+' : '−'}{formatQty(a.quantity)}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{a.product?.unit}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

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
          section, div { box-shadow: none !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          .divide-y > div { page-break-inside: avoid !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TEACHER — "Adjustment kya hai"
   ═════════════════════════════════════════════════════════════ */
function AdjustmentsTeacher({ onClose }: { onClose: () => void }) {
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
            <GraduationCap className="h-5 w-5" /> Stock Adjustment Kya Hai?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Kabhi stock <strong>sale ya purchase ke baghair</strong> badalta hai — maal toota,
            ginti me farq nikla, maal gum hua. Ye page us <strong>har change ka record</strong> rakhta hai
            taake stock hamesha sach bataye.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <TypeCard emoji="➕" title="Maal Aaya" desc="Return theek nikli, extra mila, ginti zyada" tone="emerald" />
            <TypeCard emoji="➖" title="Maal Gaya" desc="Sample diya, staff use, ginti kam nikli" tone="blue" />
            <TypeCard emoji="💔" title="Kharaab/Toota" desc="Expire, toota, pani laga — stock se nikalo" tone="rose" />
            <TypeCard emoji="🕳️" title="Gum/Chori" desc="Poora nuqsaan — record zaroor rakho" tone="amber" />
          </div>

                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>👁️ Live preview</strong> — qty type karte hi dikhta hai naya stock kitna hoga</TipRow>
            <TipRow><strong>Wajah zaroori hai</strong> — baad me pata ho stock kyun badla</TipRow>
            <TipRow><strong>💔 Kharaab/expired maal</strong> — damage ke liye proper record rakho taake audit clear ho</TipRow>
            <TipRow><strong>⌨️ Shortcut</strong> — <span className="font-mono">/</span> dabao aur product search khul jayegi</TipRow>
            <TipRow><strong>Esc</strong> — is guide ko band kar deta hai</TipRow>
          </div>

          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-emerald-900 dark:text-emerald-300">Golden Rule</h4>
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 mt-1 leading-relaxed">
                  Jo cheez physically shelf ya godown me badli ho, uska record bhi yahan hona chahiye.
                  Agar record nahi hoga to stock report kabhi sahi nahi aayegi.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-extrabold shadow-lg shadow-blue-500/30 hover:shadow-xl transition"
          >
            Samajh Gaya 👍
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════ */

function TipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

function TypeCard({
  emoji,
  title,
  desc,
  tone,
}: {
  emoji: string;
  title: string;
  desc: string;
  tone: 'emerald' | 'blue' | 'rose' | 'amber';
}) {
  const toneMap = {
    emerald:
      'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200',
    blue:
      'border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-900 dark:text-blue-200',
    rose:
      'border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-900 dark:text-rose-200',
    amber:
      'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200',
  } as const;

  return (
    <div className={`rounded-xl border p-3 ${toneMap[tone]}`}>
      <div className="text-lg">{emoji}</div>
      <div className="mt-1 text-sm font-extrabold">{title}</div>
      <div className="mt-1 text-[11px] font-semibold opacity-90 leading-relaxed">{desc}</div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub: string;
  tone: 'blue' | 'violet' | 'rose' | 'amber';
}) {
  const toneMap = {
    blue: {
      wrap: 'border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10',
      icon: 'from-blue-500 to-indigo-700 shadow-blue-500/30',
      text: 'text-blue-700 dark:text-blue-300',
    },
    violet: {
      wrap: 'border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10',
      icon: 'from-violet-500 to-fuchsia-700 shadow-violet-500/30',
      text: 'text-violet-700 dark:text-violet-300',
    },
    rose: {
      wrap: 'border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10',
      icon: 'from-rose-500 to-red-700 shadow-rose-500/30',
      text: 'text-rose-700 dark:text-rose-300',
    },
    amber: {
      wrap: 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10',
      icon: 'from-amber-500 to-orange-700 shadow-amber-500/30',
      text: 'text-amber-700 dark:text-amber-300',
    },
  } as const;

  const c = toneMap[tone];

  return (
    <div className={`rounded-2xl border-2 p-3 sm:p-4 ${c.wrap}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div className={`mt-1 text-xl sm:text-2xl font-extrabold tabular-nums ${c.text}`}>
            {value}
          </div>
          <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            {sub}
          </div>
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${c.icon} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function presetFromDate(preset: 'all' | 'today' | '7d' | '30d') {
  if (preset === 'all') return null;

  const now = new Date();

  if (preset === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (preset === '7d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }

  if (preset === '30d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }

  return null;
}
