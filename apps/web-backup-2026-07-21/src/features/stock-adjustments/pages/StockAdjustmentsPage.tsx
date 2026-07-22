import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck, Plus, ArrowUp, ArrowDown, ShieldAlert, FileWarning,
  Search, X, Calendar, User as UserIcon, FileSpreadsheet, FileText,
  RefreshCw, BarChart3, Package, Layers, Smartphone, Ruler,
  CheckCircle2, AlertTriangle, Sparkles, Scissors, Palette,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import {
  stockAdjustmentsApi, type AdjustmentType, type RollAction,
  type CreateAdjustmentPayload, type AdjustmentOptions,
} from '@/api/stock-adjustments.api';
import { productsApi } from '@/api/products.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { useIndustryStockPresets } from '@/features/industries/_shared/presets';
import { Sparkles as SparklesIcon, Zap as ZapIcon } from 'lucide-react';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
const formatQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

const typeConfig: Record<AdjustmentType, any> = {
  ADJUSTMENT_IN:  { label: 'Stock In',   tone: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: ArrowUp,    color: '#16a34a', hex: '#10b981', isPositive: true },
  ADJUSTMENT_OUT: { label: 'Stock Out',  tone: 'bg-blue-100 text-blue-700 border-blue-200',           icon: ArrowDown,  color: '#2563eb', hex: '#3b82f6', isPositive: false },
  DAMAGE:         { label: 'Damaged',    tone: 'bg-rose-100 text-rose-700 border-rose-200',           icon: ShieldAlert, color: '#e11d48', hex: '#ef4444', isPositive: false },
  LOSS:           { label: 'Loss',       tone: 'bg-amber-100 text-amber-700 border-amber-200',        icon: FileWarning, color: '#d97706', hex: '#f59e0b', isPositive: false },
};

type TargetMode = 'PRODUCT' | 'VARIANT' | 'ROLL' | 'IMEI';

export default function StockAdjustmentsPage() {
  const queryClient = useQueryClient();
  const industryStock = useIndustryStockPresets();

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
    // Priority: rolls (carpet) > IMEIs (mobile) > variants > product
    if (options.carpetRolls.length > 0) setTargetMode('ROLL');
    else if (options.imeis.length > 0) setTargetMode('IMEI');
    else if (options.variants.length > 0) setTargetMode('VARIANT');
    else setTargetMode('PRODUCT');
    // Reset selections
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
  const selectedVariant = options?.variants.find((v) => v.id === variantId);
  const selectedRoll = options?.carpetRolls.find((r) => r.id === carpetRollId);
  const selectedImei = options?.imeis.find((i) => i.id === imeiId);

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

  const createMutation = useMutation({
    mutationFn: stockAdjustmentsApi.create,
    onSuccess: () => {
      toast.success('Stock adjustment saved successfully');
      // Reset form
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
    if (!productId) return toast.error('Product select karein');
    if (!reason.trim()) return toast.error('Reason likhein');

    const payload: CreateAdjustmentPayload = {
      productId,
      type,
      quantity: 0,
      reason: reason.trim(),
      note: note.trim() || undefined,
    };

    if (targetMode === 'VARIANT') {
      if (!variantId) return toast.error('Variant select karein');
      const qty = Number(quantity);
      if (!qty || qty <= 0) return toast.error('Valid quantity likhein');
      payload.variantId = variantId;
      payload.quantity = qty;
    } else if (targetMode === 'ROLL') {
      if (!carpetRollId) return toast.error('Roll select karein');
      payload.carpetRollId = carpetRollId;
      payload.rollAction = rollAction;
      if (rollAction === 'ADJUST_LENGTH') {
        const ft = Number(lengthFt || 0);
        const inch = Number(lengthInch || 0);
        if (!ft && !inch) return toast.error('Length feet ya inches likhein');
        payload.lengthFt = ft;
        payload.lengthInch = inch;
        payload.quantity = ft + inch / 12;
      } else {
        payload.quantity = selectedRoll?.remainingSqft ?? 0;
      }
    } else if (targetMode === 'IMEI') {
      if (!imeiId) return toast.error('IMEI select karein');
      payload.imeiId = imeiId;
      payload.quantity = 1;
    } else {
      const qty = Number(quantity);
      if (!qty || qty <= 0) return toast.error('Valid quantity likhein');
      payload.quantity = qty;
    }

    createMutation.mutate(payload);
  };

  const exportCSV = () => {
    if (filteredAdjustments.length === 0) return toast.error('No data');
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
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-adjustments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-blue-700 text-white p-6 sm:p-8 shadow-2xl print:hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold">
              <ClipboardCheck className="h-3.5 w-3.5 text-amber-300" />
              Universal Stock Control
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Stock Adjustments</h2>
            <p className="mt-2 text-sm text-white/80">
              Products, variants, carpet rolls & IMEIs — sab ek jagah adjust karein
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 backdrop-blur">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold transition border border-white/20">
              <FileText className="h-4 w-4" /> PDF
            </button>
            <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold transition border border-white/20">
              <FileSpreadsheet className="h-4 w-4" /> CSV
            </button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Today" value={stats.today} icon={Calendar} color="blue" />
        <StatCard label="Total Adjustments" value={stats.total} icon={ClipboardCheck} color="violet" />
        <StatCard label="Total Damaged" value={formatQty(stats.damaged)} icon={ShieldAlert} color="rose" />
        <StatCard label="Total Lost" value={formatQty(stats.lost)} icon={FileWarning} color="amber" />
      </section>

      {/* CHARTS */}
      {adjustments.length > 0 && (
        <section className="grid lg:grid-cols-2 gap-6 print:hidden">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Top Affected Products</h3>
                <p className="text-xs text-slate-500">Most adjusted items</p>
              </div>
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={100} />
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="total" name="Quantity" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">By Type</h3>
            </div>
            <div className="h-[280px]">
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

      {/* FORM + HISTORY */}
      <section className="grid xl:grid-cols-[500px_1fr] gap-6 items-start">
        {/* FORM */}
        <div className="rounded-3xl bg-white border-2 border-blue-200 shadow-sm p-5 print:hidden">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">New Adjustment</h3>
              <p className="text-sm text-slate-500">Smart adjustment for any product type</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Product picker */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Product *</label>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text" value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setProductId(''); }}
                  placeholder="Search product by name or SKU..."
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
                {productSearch && (
                  <button onClick={() => { setProductSearch(''); setProductId(''); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>
              {productSearch && !productId && filteredProducts.length > 0 && (
                <div className="mt-2 max-h-[220px] overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                  {filteredProducts.map((p) => (
                    <button key={p.id} type="button"
                      onClick={() => { setProductId(p.id); setProductSearch(p.name); }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 transition">
                      <div className="font-bold text-sm text-slate-900 truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {p.sku || 'No SKU'} • Stock: <span className="font-bold text-emerald-700">{formatQty(p.stock)} {p.unit}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedProduct && options && (
                <div className="mt-2 rounded-xl bg-blue-50 border-2 border-blue-200 p-3">
                  <div className="font-bold text-sm text-slate-900">{selectedProduct.name}</div>
                  <div className="text-xs text-blue-700 font-bold mt-0.5">
                    Total Stock: {formatQty(options.product.stock)} {options.product.unit}
                  </div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {options.variants.length > 0 && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 inline-flex items-center gap-1">
                        <Layers className="h-2.5 w-2.5" /> {options.variants.length} variants
                      </span>
                    )}
                    {options.carpetRolls.length > 0 && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                        <Scissors className="h-2.5 w-2.5" /> {options.carpetRolls.length} rolls
                      </span>
                    )}
                    {options.imeis.length > 0 && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 inline-flex items-center gap-1">
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
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Adjust What? *</label>
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
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Select Variant *</label>
                <div className="space-y-1.5 max-h-[240px] overflow-y-auto rounded-xl border-2 border-slate-200 p-2">
                  {options.variants.map((v) => {
                    const active = variantId === v.id;
                    return (
                      <button key={v.id} onClick={() => setVariantId(v.id)}
                        className={`w-full text-left p-2.5 rounded-lg border-2 transition flex items-center gap-2 ${
                          active ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200' : 'border-slate-200 hover:border-violet-300'
                        }`}>
                        <div className="h-10 w-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                          {v.imageUrl ? <img src={v.imageUrl} className="w-full h-full object-cover" />
                            : v.colorHex ? <div className="w-full h-full" style={{ backgroundColor: v.colorHex }} />
                            : <div className="w-full h-full flex items-center justify-center"><Palette className="h-4 w-4 text-slate-400" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-slate-900 truncate">{v.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {v.sku || '—'} • Stock: <span className="font-bold text-emerald-700">{formatQty(v.stock)}</span>
                          </div>
                        </div>
                        {active && <CheckCircle2 className="h-4 w-4 text-violet-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Roll picker */}
            {options && targetMode === 'ROLL' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Select Roll *</label>
                <div className="space-y-1.5 max-h-[240px] overflow-y-auto rounded-xl border-2 border-slate-200 p-2">
                  {options.carpetRolls.map((r) => {
                    const active = carpetRollId === r.id;
                    return (
                      <button key={r.id} onClick={() => setCarpetRollId(r.id)}
                        className={`w-full text-left p-2.5 rounded-lg border-2 transition ${
                          active ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200' : 'border-slate-200 hover:border-emerald-300'
                        }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm text-slate-900 font-mono">{r.rollNumber}</div>
                            <div className="text-[10px] text-slate-600 mt-0.5">
                              {r.widthFt}ft{r.widthInch ? ` ${r.widthInch}in` : ''} × {r.remainingLengthFt}ft{r.remainingLengthInch ? ` ${r.remainingLengthInch}in` : ''}
                              {' '}= <span className="font-extrabold text-emerald-700">{formatQty(r.remainingSqft)} sqft</span>
                            </div>
                            {r.rackNumber && <div className="text-[9px] text-slate-500">📍 {r.rackNumber}</div>}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                              r.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                              r.status === 'DAMAGED' ? 'bg-rose-100 text-rose-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>{r.status}</span>
                            {active && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedRoll && (
                  <div className="mt-3 space-y-2">
                    <label className="block text-xs font-bold text-slate-700">Roll Action *</label>
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
                      <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs text-rose-800 font-bold">
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
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Select IMEI *</label>
                <div className="space-y-1.5 max-h-[240px] overflow-y-auto rounded-xl border-2 border-slate-200 p-2">
                  {options.imeis.map((i) => {
                    const active = imeiId === i.id;
                    return (
                      <button key={i.id} onClick={() => setImeiId(i.id)}
                        className={`w-full text-left p-2.5 rounded-lg border-2 transition ${
                          active ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300'
                        }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm text-slate-900 font-mono">{i.imei1}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {i.variant?.name && <span className="text-violet-700 font-bold">{i.variant.name} • </span>}
                              {i.color && <span>🎨 {i.color}</span>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                              i.status === 'IN_STOCK' ? 'bg-emerald-100 text-emerald-700' :
                              i.status === 'DAMAGED' ? 'bg-rose-100 text-rose-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>{i.status}</span>
                            {active && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
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
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Adjustment Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(typeConfig) as [AdjustmentType, any][]).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  const active = type === key;
                  return (
                    <button key={key} onClick={() => setType(key)}
                      className={`px-3 py-2.5 rounded-xl border-2 transition text-left ${
                        active ? cfg.tone + ' border-2 shadow-md' : 'bg-white border-slate-200 hover:border-blue-300'
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
              <Input label={`Quantity ${selectedProduct ? `(${selectedProduct.unit})` : ''} *`}
                type="number" step="0.01" value={quantity}
                onChange={(e) => setQuantity(e.target.value)} placeholder="5" />
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-slate-700">Reason *</label>
                {industryStock.industryId && (
                  <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                    <SparklesIcon className="h-2.5 w-2.5" />
                    {industryStock.industryEmoji} {industryStock.industryName}
                  </span>
                )}
              </div>
              <Input value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Damaged in transport, counting correction, etc." />

              {/* Industry damage reasons filtered by current type */}
              {industryStock.damageReasons.length > 0 && (() => {
                const filtered = industryStock.damageReasons.filter((r) => r.category === type);
                if (filtered.length === 0) return null;
                return (
                  <div className="mt-2 p-2 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
                    <div className="text-[9px] uppercase tracking-wider text-blue-800 font-extrabold mb-1.5 flex items-center gap-1">
                      <ZapIcon className="h-2.5 w-2.5" />
                      {industryStock.industryName} Quick Reasons ({type})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {filtered.map((r) => (
                        <button
                          key={r.reason}
                          type="button"
                          onClick={() => setReason(r.reason)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border-2 text-[10px] font-extrabold hover:shadow-md transition"
                          style={{ borderColor: `${r.color}50`, backgroundColor: `${r.color}15`, color: r.color }}
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
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-[9px] uppercase text-slate-500 font-bold mr-1">Common:</span>
                  {industryStock.adjustmentReasons.slice(0, 5).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Additional details" />

            <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30"
              size="lg" loading={createMutation.isPending} onClick={handleSubmit}>
              <Plus className="h-4 w-4" />
              Save Adjustment
            </Button>
          </div>
        </div>

        {/* HISTORY */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Adjustment History</h3>
                <p className="text-sm text-slate-500">{filteredAdjustments.length} of {adjustments.length}</p>
              </div>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search..." className="h-9 w-56 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setHistoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  historyFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}>All</button>
              {(Object.entries(typeConfig) as [AdjustmentType, any][]).map(([key, cfg]) => (
                <button key={key} onClick={() => setHistoryFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 ${
                    historyFilter === key ? cfg.tone + ' border-2 shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}>
                  <cfg.icon className="h-3 w-3" />{cfg.label}
                </button>
              ))}
            </div>
          </div>

          {filteredAdjustments.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardCheck className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-slate-900">No adjustments yet</h4>
              <p className="text-xs text-slate-500 mt-1">Form se pehla adjustment add karein</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[700px] overflow-y-auto">
              {filteredAdjustments.map((a: any) => {
                const cfg = typeConfig[a.type as AdjustmentType];
                const Icon = cfg.icon;
                return (
                  <div key={a.id} className="px-6 py-4 hover:bg-slate-50 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${cfg.tone}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">{a.product?.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.tone}`}>
                              {cfg.label}
                            </span>
                            {a.variant && (
                              <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-extrabold inline-flex items-center gap-0.5">
                                <Layers className="h-2.5 w-2.5" /> {a.variant.name}
                              </span>
                            )}
                            {a.carpetRoll && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold font-mono inline-flex items-center gap-0.5">
                                <Scissors className="h-2.5 w-2.5" /> {a.carpetRoll.rollNumber}
                              </span>
                            )}
                            {a.imei && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold font-mono inline-flex items-center gap-0.5">
                                <Smartphone className="h-2.5 w-2.5" /> {a.imei.imei1}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-600 mt-0.5">{a.reason}</div>
                          {a.note && <div className="text-xs text-slate-500 mt-0.5 italic">{a.note}</div>}
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
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
                        <div className={`font-extrabold text-lg ${cfg.isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {cfg.isPositive ? '+' : '−'}{formatQty(a.quantity)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold">{a.product?.unit}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 1cm; }
          body { background: white !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    blue:   'from-blue-500 to-blue-700 shadow-blue-500/30',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
    rose:   'from-rose-500 to-rose-700 shadow-rose-500/30',
    amber:  'from-amber-500 to-amber-700 shadow-amber-500/30',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function ModeButton({ icon: Icon, label, active, disabled, onClick }: any) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={`px-3 py-2.5 rounded-xl border-2 transition text-left inline-flex items-center gap-2 ${
        active ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 shadow-md'
        : disabled ? 'bg-slate-50 border-slate-200 opacity-40 cursor-not-allowed'
        : 'bg-white border-slate-200 hover:border-blue-300'
      }`}>
      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-600' : disabled ? 'text-slate-400' : 'text-slate-600'}`} />
      <span className={`text-xs font-extrabold truncate ${active ? 'text-blue-700' : disabled ? 'text-slate-400' : 'text-slate-700'}`}>
        {label}
      </span>
    </button>
  );
}

function ActionBtn({ icon: Icon, label, active, onClick, tone }: any) {
  const tones: any = {
    blue:    active ? 'border-blue-500 bg-blue-50 text-blue-700'         : 'border-slate-200 hover:border-blue-300',
    rose:    active ? 'border-rose-500 bg-rose-50 text-rose-700'          : 'border-slate-200 hover:border-rose-300',
    amber:   active ? 'border-amber-500 bg-amber-50 text-amber-700'       : 'border-slate-200 hover:border-amber-300',
    emerald: active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-emerald-300',
  };
  return (
    <button type="button" onClick={onClick}
      className={`px-2 py-1.5 rounded-lg border-2 text-[10px] font-extrabold transition inline-flex items-center gap-1 ${tones[tone]}`}>
      <Icon className="h-3 w-3" />{label}
    </button>
  );
}
