import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck, Plus, ArrowUp, ArrowDown, ShieldAlert, FileWarning,
  Search, X, Calendar, User as UserIcon, FileSpreadsheet,
  RefreshCw, BarChart3, Package, Layers, Smartphone, Ruler,
  CheckCircle2, GraduationCap, Sparkles, Scissors, Palette,
  Printer, Zap, TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import {
  stockAdjustmentsApi, type AdjustmentType, type RollAction,
  type CreateAdjustmentPayload,
} from '@modules/inventory/stock-adjustments/api/stock-adjustments.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { toast } from 'sonner';
import { useIndustryStockPresets } from '@industries/_shared/presets';

/* ═════════════════════════════════════════════════════════════
   NAFAA STOCK ADJUSTMENTS — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 GLOBAL — 35+ industries: Product/Variant/Roll/IMEI picker
      khud detect hota hai jo us product ke paas hai
   🌙 Dark mode complete • 🎓 Teacher modal (universal guide)
   ⌨️  / = search history • Esc = modals band
   🖨️ Print + CSV • 👁️ Live "naya stock kya hoga" preview
   ═════════════════════════════════════════════════════════════ */

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
const formatQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

const typeConfig: Record<AdjustmentType, any> = {
  ADJUSTMENT_IN:  { label: 'Stock In',  tone: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40', icon: ArrowUp,     color: '#16a34a', hex: '#10b981', isPositive: true },
  ADJUSTMENT_OUT: { label: 'Stock Out', tone: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40',               icon: ArrowDown,   color: '#2563eb', hex: '#3b82f6', isPositive: false },
  DAMAGE:         { label: 'Damaged',   tone: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40',               icon: ShieldAlert, color: '#e11d48', hex: '#ef4444', isPositive: false },
  LOSS:           { label: 'Loss',      tone: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',         icon: FileWarning, color: '#d97706', hex: '#f59e0b', isPositive: false },
};

type TargetMode = 'PRODUCT' | 'VARIANT' | 'ROLL' | 'IMEI';

export default function StockAdjustmentsPage() {
  const queryClient = useQueryClient();
  const industryStock = useIndustryStockPresets();
  const historySearchRef = useRef<HTMLInputElement>(null);

  // Form state
  const [productId, setProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [targetMode, setTargetMode] = useState<TargetMode>('PRODUCT');
  const [variantId, setVariantId] = useState('');
  const [carpetRollId, setCarpetRollId] = useState('');
  const [imeiId, setImeiId] = useState('');
  const [type, setType] = useState<AdjustmentType>('ADJUSTMENT_IN');
  const [rollAction, setRollAction] = useState<RollAction>('ADJUST_LENGTH');
  const [quantity, setQuantity] = useState('');
  const [lengthFt, setLengthFt] = useState('');
  const [lengthInch, setLengthInch] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);

  // History filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<AdjustmentType | 'all'>('all');

  // Queries
  const { data: productsData } = useQuery({
    queryKey: ['products-for-adjustments'],
    queryFn: () => productsApi.list({ page: 1, limit: 500 }),
  });

  const { data: adjustments = [], refetch, isRefetching } = useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: stockAdjustmentsApi.list,
  });

  const { data: options } = useQuery({
    queryKey: ['adjustment-options', productId],
    queryFn: () => stockAdjustmentsApi.getOptions(productId),
    enabled: !!productId,
  });

  // Auto-detect target mode when options load
  useEffect(() => {
    if (!options) return;
    if (options.carpetRolls.length > 0) setTargetMode('ROLL');
    else if (options.imeis.length > 0) setTargetMode('IMEI');
    else if (options.variants.length > 0) setTargetMode('VARIANT');
    else setTargetMode('PRODUCT');
    setVariantId('');
    setCarpetRollId('');
    setImeiId('');
  }, [options]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    const products = productsData?.items ?? [];
    if (!q) return products.slice(0, 30);
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q),
    ).slice(0, 30);
  }, [productsData, productSearch]);

  const selectedProduct = productsData?.items.find((p) => p.id === productId);
  const selectedRoll = options?.carpetRolls.find((r) => r.id === carpetRollId);

  const filteredAdjustments = useMemo(() => {
    let result = [...adjustments];
    const q = historySearch.toLowerCase().trim();
    if (q) {
      result = result.filter((a: any) =>
        a.product?.name?.toLowerCase().includes(q) ||
        (a.reason || '').toLowerCase().includes(q) ||
        (a.variant?.name || '').toLowerCase().includes(q) ||
        (a.carpetRoll?.rollNumber || '').toLowerCase().includes(q) ||
        (a.imei?.imei1 || '').toLowerCase().includes(q),
      );
    }
    if (historyFilter !== 'all') result = result.filter((a) => a.type === historyFilter);
    return result;
  }, [adjustments, historySearch, historyFilter]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayAdj = adjustments.filter((a) => new Date(a.createdAt).toDateString() === today);
    const damaged = adjustments.filter((a) => a.type === 'DAMAGE').reduce((s, a) => s + a.quantity, 0);
    const lost = adjustments.filter((a) => a.type === 'LOSS').reduce((s, a) => s + a.quantity, 0);
    return { total: adjustments.length, today: todayAdj.length, damaged, lost };
  }, [adjustments]);

  const typeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of adjustments) map.set(a.type, (map.get(a.type) || 0) + 1);
    return Array.from(map.entries()).map(([t, c]) => ({
      name: typeConfig[t as AdjustmentType]?.label || t,
      value: c,
      color: typeConfig[t as AdjustmentType]?.hex || '#64748b',
    }));
  }, [adjustments]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const a of adjustments as any[]) {
      if (!a.product) continue;
      const existing = map.get(a.product.id) || { name: a.product.name, total: 0, count: 0 };
      existing.total += a.quantity;
      existing.count += 1;
      map.set(a.product.id, existing);
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map((p) => ({ name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name, total: p.total }));
  }, [adjustments]);

  /* ─── Live preview: naya stock kya hoga ─── */
  const stockPreview = useMemo(() => {
    if (!options || !selectedProduct) return null;
    const current =
      targetMode === 'VARIANT'
        ? Number(options.variants.find((v) => v.id === variantId)?.stock ?? 0)
        : Number(selectedProduct.stock || 0);
    if (targetMode === 'ROLL' || targetMode === 'IMEI') return null;
    const qty = Number(quantity || 0);
    if (!qty || qty <= 0) return null;
    const cfg = typeConfig[type];
    const next = cfg.isPositive ? current + qty : current - qty;
    return { current, next, unit: selectedProduct.unit || 'pcs', negative: next < 0 };
  }, [options, selectedProduct, targetMode, variantId, quantity, type]);

  const createMutation = useMutation({
    mutationFn: stockAdjustmentsApi.create,
    onSuccess: () => {
      toast.success('✓ Adjustment save ho gaya — stock update ho gaya');
      setProductId(''); setProductSearch(''); setType('ADJUSTMENT_IN');
      setVariantId(''); setCarpetRollId(''); setImeiId('');
      setRollAction('ADJUST_LENGTH');
      setQuantity(''); setLengthFt(''); setLengthInch('');
      setReason(''); setNote('');
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      queryClient.invalidateQueries({ queryKey: ['product-imeis'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Adjustment fail ho gayi'),
  });

  const handleSubmit = () => {
    if (!productId) return toast.error('Product select karo');
    if (!reason.trim()) return toast.error('Reason likhna zaroori hai');

    const payload: CreateAdjustmentPayload = {
      productId,
      type,
      quantity: 0,
      reason: reason.trim(),
      note: note.trim() || undefined,
    };

    if (targetMode === 'VARIANT') {
      if (!variantId) return toast.error('Variant select karo');
      const qty = Number(quantity);
      if (!qty || qty <= 0) return toast.error('Valid quantity likho');
      payload.variantId = variantId;
      payload.quantity = qty;
    } else if (targetMode === 'ROLL') {
      if (!carpetRollId) return toast.error('Roll select karo');
      payload.carpetRollId = carpetRollId;
      payload.rollAction = rollAction;
      if (rollAction === 'ADJUST_LENGTH') {
        const ft = Number(lengthFt || 0);
        const inch = Number(lengthInch || 0);
        if (!ft && !inch) return toast.error('Length feet ya inches likho');
        payload.lengthFt = ft;
        payload.lengthInch = inch;
        payload.quantity = ft + inch / 12;
      } else {
        payload.quantity = selectedRoll?.remainingSqft ?? 0;
      }
    } else if (targetMode === 'IMEI') {
      if (!imeiId) return toast.error('IMEI select karo');
      payload.imeiId = imeiId;
      payload.quantity = 1;
    } else {
      const qty = Number(quantity);
      if (!qty || qty <= 0) return toast.error('Valid quantity likho');
      payload.quantity = qty;
    }

    createMutation.mutate(payload);
  };

  const exportCSV = () => {
    if (filteredAdjustments.length === 0) return toast.error('Koi data nahi');
    const summary = [
      ['Stock Adjustments Report'],
      [`Generated: ${new Date().toLocaleString('en-PK')}  •  Total: ${filteredAdjustments.length}`],
      [''],
    ];
    const headers = ['Date', 'Type', 'Product', 'Target', 'Quantity', 'Unit', 'Reason', 'Note', 'By'];
    const rows = filteredAdjustments.map((a: any) => {
      const target = a.imei ? `IMEI: ${a.imei.imei1}`
        : a.carpetRoll ? `Roll: ${a.carpetRoll.rollNumber}`
        : a.variant ? `Variant: ${a.variant.name}`
        : 'Product';
      return [
        new Date(a.createdAt).toLocaleString('en-PK'),
        typeConfig[a.type as AdjustmentType]?.label || a.type,
        a.product?.name || '', target,
        formatQty(a.quantity), a.product?.unit || '',
        a.reason || '', a.note || '', a.createdBy?.fullName || 'System',
      ];
    });
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

  /* ─── Keyboard: / = history search, Esc = teacher band ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) { setShowTeacher(false); return; }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); historySearchRef.current?.focus(); }
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

  const hasHistoryFilters = !!historySearch || historyFilter !== 'all';

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {showTeacher && <AdjustmentsTeacher industryEmoji={industryStock.industryEmoji} onClose={() => setShowTeacher(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-blue-700 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <ClipboardCheck className="h-3.5 w-3.5 text-amber-300" /> Stock Control
              {industryStock.industryId && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-blue-200">{industryStock.industryEmoji} {industryStock.industryName}</span>
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
              title="Kaise kaam karta hai?"
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
        <Kpi icon={Calendar} tone="blue" label="Aaj Ki Adjustments" value={stats.today} sub="Today" />
        <Kpi icon={ClipboardCheck} tone="violet" label="Total Adjustments" value={stats.total} sub="All time" />
        <Kpi icon={ShieldAlert} tone="rose" label="Total Damaged" value={formatQty(stats.damaged)} sub="Items" />
        <Kpi icon={FileWarning} tone="amber" label="Total Lost" value={formatQty(stats.lost)} sub="Items" />
      </section>

      {/* ═══ CHARTS ═══ */}
      {adjustments.length > 0 && (
        <section className="grid lg:grid-cols-2 gap-4 print:hidden">
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Top Affected Products</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Sab se zyada adjust hone wale</p>
              </div>
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={100} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Bar dataKey="total" name="Quantity" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">By Type</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">In / Out / Damage / Loss split</p>
              </div>
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeBreakdown} cx="50%" cy="45%" outerRadius={90} innerRadius={45}
                    dataKey="value" label={(e: any) => `${e.value}`} labelLine={false}>
                    {typeBreakdown.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* ═══ FORM + HISTORY ═══ */}
      <section className="grid xl:grid-cols-[500px_1fr] gap-4 sm:gap-5 items-start">
        {/* ═══ FORM ═══ */}
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-blue-200 dark:border-blue-500/40 shadow-sm p-5 print:hidden">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Nayi Adjustment</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Product, variant, roll ya IMEI — sab yahan se</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Product picker */}
            <div>
              <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Product *</label>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text" value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setProductId(''); }}
                  placeholder="Naam ya SKU se dhundo..."
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                />
                {productSearch && (
                  <button onClick={() => { setProductSearch(''); setProductId(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>
              {productSearch && !productId && filteredProducts.length > 0 && (
                <div className="mt-2 max-h-[220px] overflow-y-auto rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredProducts.map((p) => (
                    <button key={p.id} type="button"
                      onClick={() => { setProductId(p.id); setProductSearch(p.name); }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-500/10 transition">
                      <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {p.sku || 'No SKU'} • Stock: <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatQty(p.stock)} {p.unit}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedProduct && options && (
                <div className="mt-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/40 p-3">
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{selectedProduct.name}</div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 font-bold mt-0.5 tabular-nums">
                    Total Stock: {formatQty(options.product.stock)} {options.product.unit}
                  </div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {options.variants.length > 0 && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 inline-flex items-center gap-1">
                        <Layers className="h-2.5 w-2.5" /> {options.variants.length} variants
                      </span>
                    )}
                    {options.carpetRolls.length > 0 && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                        <Scissors className="h-2.5 w-2.5" /> {options.carpetRolls.length} rolls
                      </span>
                    )}
                    {options.imeis.length > 0 && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 inline-flex items-center gap-1">
                        <Smartphone className="h-2.5 w-2.5" /> {options.imeis.length} IMEIs
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Target mode selector */}
            {options && (
              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Kya Adjust Karna Hai? *</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <ModeButton icon={Package} label="Product" active={targetMode === 'PRODUCT'}
                    onClick={() => setTargetMode('PRODUCT')} />
                  <ModeButton icon={Layers} label={`Variant (${options.variants.length})`}
                    active={targetMode === 'VARIANT'} disabled={options.variants.length === 0}
                    onClick={() => setTargetMode('VARIANT')} />
                  <ModeButton icon={Scissors} label={`Carpet Roll (${options.carpetRolls.length})`}
                    active={targetMode === 'ROLL'} disabled={options.carpetRolls.length === 0}
                    onClick={() => setTargetMode('ROLL')} />
                  <ModeButton icon={Smartphone} label={`IMEI (${options.imeis.length})`}
                    active={targetMode === 'IMEI'} disabled={options.imeis.length === 0}
                    onClick={() => setTargetMode('IMEI')} />
                </div>
              </div>
            )}

            {/* Variant picker */}
            {options && targetMode === 'VARIANT' && (
              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Variant Chuno *</label>
                <div className="space-y-1.5 max-h-[240px] overflow-y-auto rounded-xl border-2 border-slate-200 dark:border-slate-700 p-2">
                  {options.variants.map((v) => {
                    const active = variantId === v.id;
                    return (
                      <button key={v.id} onClick={() => setVariantId(v.id)}
                        className={`w-full text-left p-2.5 rounded-lg border-2 transition flex items-center gap-2 ${
                          active
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 ring-2 ring-violet-200 dark:ring-violet-500/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-500/50 bg-white dark:bg-slate-800/60'
                        }`}>
                        <div className="h-10 w-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                          {v.imageUrl ? <img src={v.imageUrl} className="w-full h-full object-cover" alt="" />
                            : v.colorHex ? <div className="w-full h-full" style={{ backgroundColor: v.colorHex }} />
                            : <div className="w-full h-full flex items-center justify-center"><Palette className="h-4 w-4 text-slate-400" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{v.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {v.sku || '—'} • Stock: <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatQty(v.stock)}</span>
                          </div>
                        </div>
                        {active && <CheckCircle2 className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Roll picker */}
            {options && targetMode === 'ROLL' && (
              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Roll Chuno *</label>
                <div className="space-y-1.5 max-h-[240px] overflow-y-auto rounded-xl border-2 border-slate-200 dark:border-slate-700 p-2">
                  {options.carpetRolls.map((r) => {
                    const active = carpetRollId === r.id;
                    return (
                      <button key={r.id} onClick={() => setCarpetRollId(r.id)}
                        className={`w-full text-left p-2.5 rounded-lg border-2 transition ${
                          active
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 ring-2 ring-emerald-200 dark:ring-emerald-500/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/50 bg-white dark:bg-slate-800/60'
                        }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm text-slate-900 dark:text-white font-mono">{r.rollNumber}</div>
                            <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                              {r.widthFt}ft{r.widthInch ? ` ${r.widthInch}in` : ''} × {r.remainingLengthFt}ft{r.remainingLengthInch ? ` ${r.remainingLengthInch}in` : ''}
                              {' '}= <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{formatQty(r.remainingSqft)} sqft</span>
                            </div>
                            {r.rackNumber && <div className="text-[9px] text-slate-500 dark:text-slate-400">📍 {r.rackNumber}</div>}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                              r.status === 'ACTIVE' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                              r.status === 'DAMAGED' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300' :
                              'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}>{r.status}</span>
                            {active && <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedRoll && (
                  <div className="mt-3 space-y-2">
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">Roll Action *</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <ActionBtn label="Adjust Length" active={rollAction === 'ADJUST_LENGTH'}
                        onClick={() => setRollAction('ADJUST_LENGTH')} icon={Ruler} tone="blue" />
                      <ActionBtn label="Mark Damaged" active={rollAction === 'MARK_DAMAGED'}
                        onClick={() => setRollAction('MARK_DAMAGED')} icon={ShieldAlert} tone="rose" />
                      <ActionBtn label="Mark Lost" active={rollAction === 'MARK_LOST'}
                        onClick={() => setRollAction('MARK_LOST')} icon={FileWarning} tone="amber" />
                      <ActionBtn label="Restore" active={rollAction === 'RESTORE'}
                        onClick={() => setRollAction('RESTORE')} icon={CheckCircle2} tone="emerald" />
                    </div>

                    {rollAction === 'ADJUST_LENGTH' && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Input label="Length (ft)" type="number" step="0.01" value={lengthFt}
                          onChange={(e) => setLengthFt(e.target.value)} placeholder="10" />
                        <Input label="Extra (inch)" type="number" step="0.01" value={lengthInch}
                          onChange={(e) => setLengthInch(e.target.value)} placeholder="0" />
                      </div>
                    )}
                    {(rollAction === 'MARK_DAMAGED' || rollAction === 'MARK_LOST') && (
                      <div className="rounded-lg bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/40 p-2 text-xs text-rose-800 dark:text-rose-300 font-bold">
                        ⚠️ Poora roll ({formatQty(selectedRoll.remainingSqft)} sqft) stock se hataya jayega
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* IMEI picker */}
            {options && targetMode === 'IMEI' && (
              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">IMEI Chuno *</label>
                <div className="space-y-1.5 max-h-[240px] overflow-y-auto rounded-xl border-2 border-slate-200 dark:border-slate-700 p-2">
                  {options.imeis.map((i) => {
                    const active = imeiId === i.id;
                    return (
                      <button key={i.id} onClick={() => setImeiId(i.id)}
                        className={`w-full text-left p-2.5 rounded-lg border-2 transition ${
                          active
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15 ring-2 ring-blue-200 dark:ring-blue-500/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50 bg-white dark:bg-slate-800/60'
                        }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm text-slate-900 dark:text-white font-mono">{i.imei1}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {i.variant?.name && <span className="text-violet-700 dark:text-violet-400 font-bold">{i.variant.name} • </span>}
                              {i.color && <span>🎨 {i.color}</span>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                              i.status === 'IN_STOCK' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                              i.status === 'DAMAGED' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300' :
                              'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}>{i.status}</span>
                            {active && <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Type selector */}
            <div>
              <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Adjustment Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(typeConfig) as [AdjustmentType, any][]).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  const active = type === key;
                  return (
                    <button key={key} type="button" onClick={() => setType(key)}
                      className={`px-3 py-2.5 rounded-xl border-2 transition text-left ${
                        active ? cfg.tone + ' shadow-md' : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50'
                      }`}>
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        <span className="text-xs font-extrabold">{cfg.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity (only for product/variant) */}
            {(targetMode === 'PRODUCT' || targetMode === 'VARIANT') && (
              <>
                <Input label={`Quantity ${selectedProduct ? `(${selectedProduct.unit})` : ''} *`}
                  type="number" step="0.01" value={quantity}
                  onChange={(e) => setQuantity(e.target.value)} placeholder="5" />
                {/* 👁️ Live stock preview */}
                {stockPreview && (
                  <div className={[
                    'rounded-xl border-2 p-3 flex items-center justify-between text-xs font-extrabold',
                    stockPreview.negative
                      ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200',
                  ].join(' ')}>
                    <span>Abhi: {formatQty(stockPreview.current)} {stockPreview.unit}</span>
                    <span>→</span>
                    <span className={stockPreview.negative ? '' : type === 'ADJUSTMENT_IN' ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-400'}>
                      Naya: {formatQty(stockPreview.next)} {stockPreview.unit}
                    </span>
                    {stockPreview.negative && <span>⚠️ minus ho jayega!</span>}
                  </div>
                )}
              </>
            )}

            {/* Reason + quick reasons */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300">Reason *</label>
                {industryStock.industryId && (
                  <span className="text-[9px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/40 rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" />
                    {industryStock.industryEmoji} {industryStock.industryName}
                  </span>
                )}
              </div>
              <Input value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Transport me toota, ginti sahi ki, customer return..." />

              {industryStock.damageReasons.length > 0 && (() => {
                const filtered = industryStock.damageReasons.filter((r) => r.category === type);
                if (filtered.length === 0) return null;
                return (
                  <div className="mt-2 p-2 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 border-2 border-blue-200 dark:border-blue-500/40">
                    <div className="text-[9px] uppercase tracking-wider text-blue-800 dark:text-blue-300 font-extrabold mb-1.5 flex items-center gap-1">
                      <Zap className="h-2.5 w-2.5" />
                      {industryStock.industryName} Quick Reasons ({type})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {filtered.map((r) => (
                        <button
                          key={r.reason}
                          type="button"
                          onClick={() => setReason(r.reason)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border-2 text-[10px] font-extrabold hover:shadow-md transition bg-white/70 dark:bg-slate-800/60"
                          style={{ borderColor: `${r.color}50`, color: r.color }}
                        >
                          <span>{r.emoji}</span>
                          <span>{r.reason}</span>
                          {r.severity === 'critical' && <span className="text-[8px] px-1 rounded bg-red-600 text-white">CRITICAL</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {industryStock.adjustmentReasons.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 items-center">
                  <span className="text-[9px] uppercase text-slate-500 dark:text-slate-400 font-bold mr-1">Common:</span>
                  {industryStock.adjustmentReasons.slice(0, 5).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Extra details..." />

            <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30 font-extrabold"
              size="lg" loading={createMutation.isPending} onClick={handleSubmit}>
              <Plus className="h-4 w-4" /> Save Adjustment
            </Button>
          </div>
        </div>

        {/* ═══ HISTORY ═══ */}
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Adjustment History</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold tabular-nums">{filteredAdjustments.length} of {adjustments.length}</p>
              </div>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input ref={historySearchRef} value={historySearch} onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search... (/ shortcut)"
                  className="h-9 w-56 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition" />
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setHistoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  historyFilter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}>Sab</button>
              {(Object.entries(typeConfig) as [AdjustmentType, any][]).map(([key, cfg]) => (
                <button key={key} onClick={() => setHistoryFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition inline-flex items-center gap-1 border-2 ${
                    historyFilter === key ? cfg.tone + ' shadow-sm' : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}>
                  <cfg.icon className="h-3 w-3" />{cfg.label}
                </button>
              ))}
              {hasHistoryFilters && (
                <button onClick={() => { setHistorySearch(''); setHistoryFilter('all'); }}
                  className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 px-2 transition">
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
                const cfg = typeConfig[a.type as AdjustmentType];
                const Icon = cfg.icon;
                return (
                  <div key={a.id} className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border-2 ${cfg.tone}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 dark:text-white text-sm">{a.product?.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${cfg.tone}`}>
                              {cfg.label}
                            </span>
                            {a.variant && (
                              <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[10px] font-extrabold inline-flex items-center gap-0.5">
                                <Layers className="h-2.5 w-2.5" /> {a.variant.name}
                              </span>
                            )}
                            {a.carpetRoll && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold font-mono inline-flex items-center gap-0.5">
                                <Scissors className="h-2.5 w-2.5" /> {a.carpetRoll.rollNumber}
                              </span>
                            )}
                            {a.imei && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold font-mono inline-flex items-center gap-0.5">
                                <Smartphone className="h-2.5 w-2.5" /> {a.imei.imei1}
                              </span>
                            )}
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
                        <div className={`font-extrabold text-lg tabular-nums ${cfg.isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                          {cfg.isPositive ? '+' : '−'}{formatQty(a.quantity)}
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
          @page { size: A4 landscape; margin: 10mm 8mm; }
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
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   ADJUSTMENTS TEACHER — Universal guide (35+ industries)
   ═════════════════════════════════════════════════════════════ */
function AdjustmentsTeacher({ industryEmoji, onClose }: { industryEmoji?: string; onClose: () => void }) {
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
            Kabhi kabhi stock <strong>sale ya purchase ke baghair</strong> badalta hai —
            maal toota, ginti me farq nikla, maal gum hua. Ye page us <strong>har change ka record</strong> rakhta hai
            taake stock hamesha sach bataye.
          </p>

          {/* 4 types visual */}
          <div className="grid grid-cols-2 gap-2">
            <TypeCard emoji="➕" title="Stock In" desc="Maal aya (purchase ke baghair) — gift, wapasi, ginti zyada nikli" tone="emerald" />
            <TypeCard emoji="➖" title="Stock Out" desc="Maal gaya — staff use, samples, ginti kam nikli" tone="blue" />
            <TypeCard emoji="💔" title="Damaged" desc="Maal toota/kharaab — bech nahi sakte, stock se nikalo" tone="rose" />
            <TypeCard emoji="🕳️" title="Loss" desc="Maal gum hua / chori — poora nuqsaan, record rakho" tone="amber" />
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>Product khud detect karta hai</strong> — jis product ke variants/rolls/IMEIs hain, woh options khud khul jate hain</TipRow>
            <TipRow><strong>Reason zaroori hai</strong> — taake baad me pata ho stock kyun badla (audit ka hissa)</TipRow>
            <TipRow><strong>👁️ Live preview</strong> — type karte hi dikhta hai naya stock kitna hoga (minus ho to warning)</TipRow>
            <TipRow><strong>Damage/Loss ka nuqsaan</strong> — Damage page pe alag se profit-loss reports me bhi aata hai</TipRow>
          </div>

          <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/40 p-3 text-xs font-semibold text-blue-900 dark:text-blue-200">
            💡 <strong>Adjustment vs Damage page:</strong> Yahan <strong>quick stock fix</strong> hota hai.
            Damage page pe <strong>approval workflow</strong> hai (report → review → approve) — bade nuqsaan wahan report karo.
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

function TypeCard({ emoji, title, desc, tone }: { emoji: string; title: string; desc: string; tone: string }) {
  const tones: Record<string, string> = {
    emerald: 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-500/10',
    blue: 'border-blue-300 dark:border-blue-500/40 bg-blue-50/60 dark:bg-blue-500/10',
    rose: 'border-rose-300 dark:border-rose-500/40 bg-rose-50/60 dark:bg-rose-500/10',
    amber: 'border-amber-300 dark:border-amber-500/40 bg-amber-50/60 dark:bg-amber-500/10',
  };
  return (
    <div className={`rounded-xl border-2 p-3 ${tones[tone]}`}>
      <div className="text-xl">{emoji}</div>
      <div className="text-xs font-extrabold text-slate-900 dark:text-white mt-1">{title}</div>
      <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">{desc}</div>
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

/* ══════════ Helpers ══════════ */

function Kpi({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    blue:   'from-blue-500 to-blue-700 shadow-blue-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
    rose:   'from-rose-500 to-rose-700 shadow-rose-500/40',
    amber:  'from-amber-500 to-amber-700 shadow-amber-500/40',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm transition-all">
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

function ModeButton({ icon: Icon, label, active, disabled, onClick }: any) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={`px-3 py-2.5 rounded-xl border-2 transition text-left inline-flex items-center gap-2 ${
        active
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15 ring-2 ring-blue-200 dark:ring-blue-500/30 shadow-md'
          : disabled
            ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-40 cursor-not-allowed'
            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50'
      }`}>
      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : disabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'}`} />
      <span className={`text-xs font-extrabold truncate ${active ? 'text-blue-700 dark:text-blue-300' : disabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
        {label}
      </span>
    </button>
  );
}

function ActionBtn({ icon: Icon, label, active, onClick, tone }: any) {
  const tones: Record<string, string> = {
    blue:    active ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300'         : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50 text-slate-700 dark:text-slate-300',
    rose:    active ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'          : 'border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-500/50 text-slate-700 dark:text-slate-300',
    amber:   active ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'     : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500/50 text-slate-700 dark:text-slate-300',
    emerald: active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/50 text-slate-700 dark:text-slate-300',
  };
  return (
    <button type="button" onClick={onClick}
      className={`px-2 py-1.5 rounded-lg border-2 text-[10px] font-extrabold transition inline-flex items-center gap-1 bg-white dark:bg-slate-800/60 ${tones[tone]}`}>
      <Icon className="h-3 w-3" />{label}
    </button>
  );
}
