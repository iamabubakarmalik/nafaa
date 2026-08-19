// apps/web/src/industries/retail/pages/RetailPurchasesV2.tsx
import { useMemo, useState, useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Plus, Trash2, Minus, Search, X, Package, Building2,
  Calendar, AlertTriangle, ArrowRight, Eye, CalendarDays, Wallet,
  TrendingUp, Crown, Star, Award, BarChart3, Receipt, RefreshCw,
  CheckCircle2, Activity, Boxes, GraduationCap, Printer, FileSpreadsheet,
  Sparkles, Zap, Banknote,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { formatPKR } from '@core/lib/format';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { toast } from 'sonner';
import { useAuthStore } from '@core/stores/auth.store';
import { usePurchasesData } from '@modules/purchasing/purchases/hooks/usePurchasesData';
import {
  PurchasesHero, TabSwitcher, PurchaseStatCard, ComparisonCard,
  formatDate, formatQty, PAYMENT_COLORS,
} from '@modules/purchasing/purchases/components/PurchasesShared';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';

/* ═════════════════════════════════════════════════════════════
   NAFAA RETAIL PURCHASES V2 — FULL BEST
   ─────────────────────────────────────────────────────────────
   🛒 4 tabs: New Purchase • Smart Reorder • Analytics • History
   ⚡ Fast entry: search → Enter → qty → cost → Enter → cart
   💰 Live due preview (paid vs total → udhaar)
   📦 Reorder: one-click + "Sab Add Karo" bulk button
   🎓 Teacher modal • ⌨️ / search • Ctrl+Enter save • Esc band
   🌙 Dark mode complete • 🖨️ Print + CSV (history)
   ═════════════════════════════════════════════════════════════ */

type CartLine = {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  costPrice: number;
};

const TABS = [
  { id: 'create', label: 'New Purchase', icon: Plus },
  { id: 'reorder', label: 'Smart Reorder', icon: RefreshCw },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'history', label: 'History', icon: Receipt },
];

const PAYMENT_METHODS: { v: PaymentMethod; emoji: string; label: string }[] = [
  { v: 'CASH', emoji: '💵', label: 'Cash' },
  { v: 'JAZZCASH', emoji: '📱', label: 'JazzCash' },
  { v: 'EASYPAISA', emoji: '⚡', label: 'EasyPaisa' },
  { v: 'CARD', emoji: '💳', label: 'Card' },
  { v: 'BANK_TRANSFER', emoji: '🏦', label: 'Bank' },
];

export default function RetailPurchasesV2() {
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const {
    purchases, summary, suppliers, products,
    isRefetching, refetch, createMutation,
  } = usePurchasesData();

  const productSearchRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState('create');
  const [showTeacher, setShowTeacher] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [discount, setDiscount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [cost, setCost] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'due'>('all');

  /* ─── Derived ─── */
  const lowStockProducts = useMemo(() => {
    return products
      .filter((p) => p.stock <= p.lowStockAlert && p.isActive)
      .sort((a, b) => a.stock - b.stock);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return products.slice(0, 30);
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q)
    ).slice(0, 30);
  }, [products, productSearch]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const filteredPurchases = useMemo(() => {
    let list = purchases;
    if (historyFilter === 'pending') list = list.filter((p: any) => p.status === 'PENDING');
    if (historyFilter === 'due') list = list.filter((p: any) => Number(p.total) > Number(p.paidAmount));
    const q = historySearch.toLowerCase().trim();
    if (q) {
      list = list.filter((p: any) =>
        p.purchaseNumber.toLowerCase().includes(q) ||
        p.supplier?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [purchases, historySearch, historyFilter]);

  const subtotal = cart.reduce((s, l) => s + l.quantity * l.costPrice, 0);
  const discountValue = Number(discount || 0);
  const total = Math.max(subtotal - discountValue, 0);
  const paidValue = paidAmount === '' ? total : Number(paidAmount || 0);
  const dueValue = Math.max(total - paidValue, 0);
  const cartCount = cart.length;

  const trendData = useMemo(() => {
    if (!summary?.salesTrend7Days) return [];
    return summary.salesTrend7Days.map((p: any) => {
      const d = new Date(p.date);
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      return { ...p, label: dayName };
    });
  }, [summary]);

  /* ─── Cart actions ─── */
  const addToCart = (
    prodOverride?: { id: string; name: string; unit: string; costPrice: number },
    qtyOverride?: number,
  ) => {
    const product = prodOverride || products.find((p) => p.id === selectedProductId);
    if (!product) return toast.error('Product select karein');
    const quantity = qtyOverride ?? Number(qty || 0);
    const costPrice = prodOverride?.costPrice ?? Number(cost || 0);
    if (quantity <= 0) return toast.error('Quantity likho');
    if (costPrice <= 0) return toast.error('Cost likho');

    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id
            ? { ...l, quantity: l.quantity + quantity, costPrice }
            : l,
        );
      }
      const p = prodOverride || products.find((pp) => pp.id === product.id);
      return [...prev, {
        productId: product.id,
        name: p?.name || product.name,
        unit: p?.unit || product.unit,
        quantity,
        costPrice,
      }];
    });

    if (!prodOverride) {
      setSelectedProductId(''); setProductSearch(''); setQty('1'); setCost('');
      productSearchRef.current?.focus();
    }
    toast.success('✓ Cart me add ho gaya', { duration: 900 });
  };

  const addLowStockToCart = (product: any, silent = false) => {
    const suggestedQty = Math.max(product.lowStockAlert * 3 - product.stock, product.lowStockAlert);
    const costPrice = product.costPrice || product.price * 0.7;
    if (!silent) {
      addToCart(
        { id: product.id, name: product.name, unit: product.unit, costPrice },
        suggestedQty,
      );
      setTab('create');
      return;
    }
    // silent: used by "Add All"
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) return prev;
      return [...prev, {
        productId: product.id,
        name: product.name,
        unit: product.unit,
        quantity: suggestedQty,
        costPrice,
      }];
    });
  };

  const addAllLowStock = () => {
    let added = 0;
    lowStockProducts.forEach((p) => {
      if (!cart.find((l) => l.productId === p.id)) {
        addLowStockToCart(p, true);
        added++;
      }
    });
        if (added === 0) return toast.info('Sab pehle se cart me hain');
    toast.success(`✓ ${added} items cart me add ho gaye`);
    setTab('create');
  };

  const removeLine = (productId: string) => setCart((prev) => prev.filter((l) => l.productId !== productId));
  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((l) => l.productId === productId ? { ...l, quantity: Math.max(0.01, l.quantity + delta) } : l)
        .filter((l) => l.quantity > 0)
    );
  };

  const handleSave = () => {
    if (!supplierId) return toast.error('Supplier select karein');
    if (cart.length === 0) return toast.error('Items add karein');
    createMutation.mutate({
      supplierId,
      shopId: currentShopId ?? undefined,
      paymentMethod,
      discount: discountValue,
      paidAmount: paidValue,
      notes: notes.trim() || undefined,
      items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, costPrice: l.costPrice })),
    }, {
      onSuccess: () => {
      forceRefreshProducts().catch(() => {}); // ⭐ POS cache refresh
        toast.success('✓ Purchase save ho gayi — stock update!');
        setCart([]); setSelectedProductId(''); setProductSearch('');
        setQty('1'); setCost(''); setDiscount(''); setPaidAmount(''); setNotes('');
      },
    });
  };

  /* ─── CSV export (history) ─── */
  const exportCSV = () => {
    if (filteredPurchases.length === 0) return toast.error('Koi data nahi');
    const headers = ['Purchase #', 'Supplier', 'Date', 'Items', 'Total', 'Paid', 'Due', 'Status'];
    const rows = filteredPurchases.map((p: any) => [
      p.purchaseNumber,
      p.supplier?.name || '',
      new Date(p.purchasedAt).toLocaleString('en-PK'),
      p.items?.length || 0,
      p.total,
      p.paidAmount,
      Math.max(p.total - p.paidAmount, 0),
      p.status,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredPurchases.length} purchases export ho gaye`);
  };

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeacher) { setShowTeacher(false); return; }
        if (selectedProductId) { setSelectedProductId(''); setProductSearch(''); return; }
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        // Ctrl+Enter anywhere = save purchase (create tab)
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && tab === 'create' && cart.length > 0) {
          e.preventDefault();
          handleSave();
        }
        return;
      }
      if (e.key === '/' && tab === 'create') {
        e.preventDefault();
        productSearchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, selectedProductId, tab, cart.length, supplierId, paidValue]);

  /* ─── Scroll lock for teacher modal ─── */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  const growthVsYesterday = summary?.growthVsYesterday ?? 0;
  const growthVsLastMonth = summary?.growthVsLastMonth ?? 0;
  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 sm:pb-6 print:space-y-3">
      {showTeacher && <PurchasesTeacher onClose={() => setShowTeacher(false)} />}

      <PurchasesHero
        gradient="from-slate-950 via-sky-900 to-cyan-700 dark:from-slate-950 dark:via-sky-950 dark:to-cyan-900"
        emoji="🛒"
        industryLabel="Retail"
        industryBadgeColor="bg-sky-500/30 border border-sky-300/40"
        title="Retail Store Purchases"
        subtitle="Bulk stocking, smart reorder, supplier udhaar — sab ek jagah"
        onRefresh={refetch}
        isRefetching={isRefetching}
        extraActions={
          <>
            <button
              onClick={() => setShowTeacher(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-extrabold transition shadow-lg active:scale-95"
            >
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Guide</span>
            </button>
            {lowStockProducts.length > 0 && (
              <button
                onClick={() => setTab('reorder')}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500/30 hover:bg-amber-500/50 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold transition backdrop-blur border border-amber-300/40 active:scale-95"
              >
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">{lowStockProducts.length} low stock</span>
                <span className="sm:hidden">{lowStockProducts.length}</span>
              </button>
            )}
          </>
        }
      />

      <div className="print:hidden">
        <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="sky" />
      </div>

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4 print:hidden">
        <PurchaseStatCard label="Aaj ki Purchases" value={formatPKR(summary?.todayPurchases ?? 0)} sub={`${summary?.todayCount ?? 0} orders`} icon={TrendingUp} color="sky" trend={growthVsYesterday} />
        <PurchaseStatCard label="Is Mahine" value={formatPKR(summary?.monthPurchases ?? 0)} sub={`${summary?.monthCount ?? 0} orders`} icon={CalendarDays} color="violet" trend={growthVsLastMonth} />
        <PurchaseStatCard label="Total Lifetime" value={formatPKR(summary?.totalPurchases ?? 0)} sub={`${summary?.totalCount ?? 0} purchases`} icon={Wallet} color="amber" />
        <PurchaseStatCard label="Udhaar Baqi" value={formatPKR(summary?.outstandingDue ?? 0)} sub={`${summary?.suppliersWithDue ?? 0} suppliers`} icon={AlertTriangle} color="rose" isAlert={(summary?.outstandingDue ?? 0) > 0} />
      </section>

      {/* ═══════════════════════ CREATE TAB ═══════════════════════ */}
      {tab === 'create' && (
        <section className="grid xl:grid-cols-[1.2fr_1fr] gap-4 sm:gap-6">
          {/* ─── Left: form + cart ─── */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-700 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 shrink-0">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Nayi Purchase</h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold">
                    4 step: supplier → products → payment → save
                  </p>
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 shrink-0">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">/</kbd> search
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">Ctrl+↵</kbd> save
              </div>
            </div>

            {/* ① Supplier + Payment */}
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  ① Supplier *
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 sm:px-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition"
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
                {selectedSupplier && (selectedSupplier as any).currentBalance > 0 && (
                  <div className="mt-1.5 text-[11px] font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Pehle se udhaar: {formatPKR((selectedSupplier as any).currentBalance)}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {PAYMENT_METHODS.map((m) => {
                    const active = paymentMethod === m.v;
                    return (
                      <button
                        key={m.v}
                        type="button"
                        onClick={() => setPaymentMethod(m.v)}
                        title={m.label}
                        className={`h-11 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition ${
                          active
                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/15 shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-sky-300 dark:hover:border-sky-500/50'
                        }`}
                      >
                        <span className="text-base leading-none">{m.emoji}</span>
                        <span className={`text-[8px] font-extrabold ${active ? 'text-sky-700 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400'}`}>
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ② Product picker */}
            <div className="rounded-2xl border-2 border-sky-200 dark:border-sky-500/40 bg-sky-50/40 dark:bg-sky-500/5 p-3 sm:p-4 space-y-3">
              <div>
                <label className="block text-[10px] sm:text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  ② Product Add Karo <span className="normal-case font-bold text-slate-400 dark:text-slate-500">(/ dabao)</span>
                </label>
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={productSearchRef}
                    type="text"
                    value={productSearch}
                    onChange={(e) => { setProductSearch(e.target.value); setSelectedProductId(''); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !selectedProductId && filteredProducts.length > 0) {
                        e.preventDefault();
                        const p = filteredProducts[0];
                        setSelectedProductId(p.id);
                        setProductSearch(p.name);
                        setCost(String(p.costPrice || ''));
                        setTimeout(() => qtyRef.current?.focus(), 50);
                      }
                    }}
                    placeholder="Naam, SKU ya barcode scan karo..."
                    className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-500/30 transition"
                  />
                  {productSearch && (
                    <button onClick={() => { setProductSearch(''); setSelectedProductId(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                      <X className="h-4 w-4 text-slate-400" />
                    </button>
                  )}
                </div>
                {productSearch && !selectedProductId && filteredProducts.length > 0 && (
                  <div className="mt-2 max-h-[280px] overflow-y-auto rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700 shadow-lg">
                    {filteredProducts.map((p, idx) => {
                      const isLow = p.stock <= p.lowStockAlert;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedProductId(p.id);
                            setProductSearch(p.name);
                            setCost(String(p.costPrice || ''));
                            setTimeout(() => qtyRef.current?.focus(), 50);
                          }}
                          className="w-full px-3 py-2.5 text-left hover:bg-sky-50 dark:hover:bg-sky-500/10 transition active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-sm text-slate-900 dark:text-white truncate flex-1">{p.name}</div>
                            {idx === 0 && (
                              <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 shrink-0">↵ Enter</span>
                            )}
                            {isLow && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                                <AlertTriangle className="h-2.5 w-2.5" /> LOW
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            Stock: <span className={`font-bold ${isLow ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{formatQty(p.stock)} {p.unit}</span>
                            {p.costPrice > 0 && <> • Last cost: <span className="font-bold">{formatPKR(p.costPrice)}</span></>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedProduct && (
                <>
                  <div className="rounded-xl bg-white dark:bg-slate-800 border-2 border-sky-200 dark:border-sky-500/40 p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">✓ {selectedProduct.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-bold tabular-nums">
                        Stock abhi: <span className="text-emerald-700 dark:text-emerald-400">{formatQty(selectedProduct.stock)} {selectedProduct.unit}</span>
                        {qty && Number(qty) > 0 && (
                          <span className="text-sky-700 dark:text-sky-300"> → baad me: {formatQty(Number(selectedProduct.stock) + Number(qty))}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedProductId(''); setProductSearch(''); }}
                      className="text-xs font-extrabold text-sky-700 dark:text-sky-300 hover:underline shrink-0"
                    >
                      Change
                    </button>
                  </div>
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 mb-1 uppercase">Qty ({selectedProduct.unit}) *</label>
                      <input
                        ref={qtyRef}
                        type="number" step="0.01" inputMode="decimal" value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addToCart();
                          }
                        }}
                        className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 mb-1 uppercase">Cost/pc *</label>
                      <input
                        type="number" step="0.01" inputMode="decimal" value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addToCart();
                          }
                        }}
                        className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={() => addToCart()} className="h-12 bg-gradient-to-r from-sky-600 to-cyan-700 font-extrabold shadow-lg shadow-sky-500/30">
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    </div>
                  </div>
                  {qty && cost && Number(qty) > 0 && Number(cost) > 0 && (
                    <div className="text-center text-xs font-extrabold text-sky-700 dark:text-sky-300 tabular-nums">
                      {formatQty(Number(qty))} × {formatPKR(Number(cost))} = {formatPKR(Number(qty) * Number(cost))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Cart */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 sm:p-8 text-center">
                  <ShoppingCart className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <div className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Cart khaali hai</div>
                  {lowStockProducts.length > 0 && (
                    <button onClick={() => setTab('reorder')} className="mt-2 text-xs font-extrabold text-sky-600 dark:text-sky-400 hover:underline">
                      💡 {lowStockProducts.length} low stock items — Smart Reorder dekho →
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider tabular-nums">
                      Cart ({cartCount} items)
                    </div>
                    <button
                      onClick={() => setCart([])}
                      className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 hover:underline"
                    >
                      Sab hatao
                    </button>
                  </div>
                  {cart.map((line) => (
                    <div key={line.productId} className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-slate-900 dark:text-white truncate text-sm">{line.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-bold tabular-nums">
                            {formatPKR(line.costPrice)} × {formatQty(line.quantity)} {line.unit}
                          </div>
                        </div>
                        <div className="font-extrabold text-sky-700 dark:text-sky-300 shrink-0 tabular-nums">{formatPKR(line.costPrice * line.quantity)}</div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl p-1 border-2 border-slate-200 dark:border-slate-700">
                          <button onClick={() => updateQty(line.productId, -1)} className="h-8 w-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 active:scale-95 flex items-center justify-center transition">
                            <Minus className="h-3 w-3 text-slate-600 dark:text-slate-300" />
                          </button>
                          <span className="w-12 text-center font-extrabold text-sm tabular-nums text-slate-900 dark:text-white">{formatQty(line.quantity)}</span>
                          <button onClick={() => updateQty(line.productId, 1)} className="h-8 w-8 rounded-lg bg-sky-600 hover:bg-sky-700 active:scale-95 text-white flex items-center justify-center transition">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button onClick={() => removeLine(line.productId)} className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 active:scale-95 text-rose-600 dark:text-rose-400 flex items-center justify-center transition">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* ③ Payment */}
            <div className="grid sm:grid-cols-3 gap-2 sm:gap-3">
              <Input label="Discount (PKR)" type="number" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              <Input label="Kitna diya (Paid)" type="number" placeholder={String(total)} value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
              <Input label="Note" placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {/* Totals */}
            <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-500/10 dark:to-cyan-500/10 border-2 border-sky-200 dark:border-sky-500/40 p-3 sm:p-4 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300 font-bold">Subtotal</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">{formatPKR(subtotal)}</span>
              </div>
              {discountValue > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-700 dark:text-amber-400 font-bold">Discount</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">−{formatPKR(discountValue)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300 font-bold">Abhi diya</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(paidValue)}</span>
              </div>
              {dueValue > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-rose-600 dark:text-rose-400 font-bold">Udhaar baqi</span>
                  <span className="font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">{formatPKR(dueValue)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t-2 border-sky-200 dark:border-sky-500/30">
                <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Total Bill</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-sky-700 dark:text-sky-300 tabular-nums">{formatPKR(total)}</span>
              </div>
            </div>

            {/* Desktop save */}
            <Button
              className="hidden sm:flex w-full bg-gradient-to-r from-sky-600 to-cyan-700 shadow-lg shadow-sky-500/30 font-extrabold"
              size="lg"
              onClick={handleSave}
              loading={createMutation.isPending}
              disabled={cart.length === 0 || !supplierId}
            >
              <CheckCircle2 className="h-4 w-4" /> Save Purchase • {formatPKR(total)}
            </Button>
            {!supplierId && cart.length > 0 && (
              <p className="hidden sm:block text-center text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                ⚠️ Save karne ke liye supplier select karo
              </p>
            )}
          </div>

          {/* ─── Right sidebar ─── */}
          <div className="space-y-4">
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 py-3 sm:py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">Recent Purchases</h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold">Latest 5</p>
                </div>
                <button onClick={() => setTab('history')} className="text-xs font-extrabold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1">
                  Sab <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {summary?.recentPurchases?.length ? (
                  summary.recentPurchases.slice(0, 5).map((p: any) => (
                    <Link key={p.id} to={`/purchases/${p.id}`} className="block px-4 sm:px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 dark:text-white font-mono text-xs">{p.purchaseNumber}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">{p.supplierName}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-sky-700 dark:text-sky-300 text-sm tabular-nums">{formatPKR(p.total)}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{formatDate(p.purchasedAt)}</div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400 font-semibold">Abhi koi purchase nahi</div>
                )}
              </div>
            </div>

            {lowStockProducts.length > 0 && (
              <button
                onClick={() => setTab('reorder')}
                className="w-full block rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 sm:p-5 shadow-lg shadow-amber-500/30 hover:shadow-xl active:scale-95 transition text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/80">Smart Reorder</div>
                    <h3 className="text-base sm:text-lg font-extrabold">{lowStockProducts.length} items low</h3>
                  </div>
                </div>
                <div className="text-xs opacity-90 flex items-center justify-between font-bold">
                  <span>Suggested quantities ke sath — ek click me cart</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════ REORDER TAB ═══════════════════════ */}
      {tab === 'reorder' && (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Smart Reorder</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold">
                  Low stock items — one-click cart me add karo
                </p>
              </div>
            </div>
            {lowStockProducts.length > 0 && (
              <Button
                onClick={addAllLowStock}
                className="bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold shadow-lg shadow-amber-500/30"
              >
                <Zap className="h-4 w-4" /> Sab Add Karo ({lowStockProducts.filter((p) => !cart.find((l) => l.productId === p.id)).length})
              </Button>
            )}
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-500/40 p-12 text-center bg-emerald-50/30 dark:bg-emerald-500/5">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-lg font-extrabold text-emerald-900 dark:text-emerald-300">Alhamdulillah! Sab stock theek 🎉</h4>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1 font-semibold">Koi product low stock par nahi hai</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockProducts.map((p) => {
                const isOut = p.stock === 0;
                const suggestedQty = Math.max(p.lowStockAlert * 3 - p.stock, p.lowStockAlert);
                const unitCost = p.costPrice || p.price * 0.7;
                const inCart = cart.find((l) => l.productId === p.id);
                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl border-2 p-3 sm:p-4 ${
                      isOut
                        ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50/50 dark:bg-rose-500/5'
                        : 'border-amber-300 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-500/5'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{p.sku || '—'}</div>
                      </div>
                      {isOut ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-600 text-white shrink-0">KHATAM</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500 text-white shrink-0">LOW</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2">
                        <div className="text-[9px] uppercase font-extrabold text-slate-500 dark:text-slate-400">Abhi Hai</div>
                        <div className={`text-lg font-extrabold tabular-nums ${isOut ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>
                          {formatQty(p.stock)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-2">
                        <div className="text-[9px] uppercase font-extrabold text-emerald-700 dark:text-emerald-400">Mangwao</div>
                        <div className="text-lg font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {formatQty(suggestedQty)}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold mb-2 tabular-nums">
                      {formatPKR(unitCost)}/{p.unit} • Total ≈ <span className="font-extrabold text-slate-900 dark:text-white">{formatPKR(unitCost * suggestedQty)}</span>
                    </div>

                    {inCart ? (
                      <div className="text-center py-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold inline-flex items-center justify-center gap-1 w-full">
                        <CheckCircle2 className="h-3 w-3" /> Cart me hai ({formatQty(inCart.quantity)})
                      </div>
                    ) : (
                      <button
                        onClick={() => addLowStockToCart(p)}
                        className="w-full h-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-95 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1 transition"
                      >
                        <Plus className="h-3 w-3" /> Add {formatQty(suggestedQty)} {p.unit}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════ ANALYTICS TAB ═══════════════════════ */}
      {tab === 'analytics' && (
        <>
          <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-6">
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">7-Day Purchases</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Roz kitne ka maal aaya</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-700 text-white flex items-center justify-center shadow-md shrink-0">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="rtpurGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: any) => formatPKR(Number(value))}
                      contentStyle={{ borderRadius: 12, background: 'var(--tooltip-bg, #fff)', border: '1px solid #e2e8f0' }}
                    />
                    <Area type="monotone" dataKey="total" name="Purchases" fill="url(#rtpurGrad)" stroke="#0ea5e9" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Payment Methods</h3>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md shrink-0">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              {summary?.paymentBreakdown?.length ? (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.paymentBreakdown.map((p: any) => ({ name: p.paymentMethod, value: p.total }))}
                        cx="50%" cy="45%" outerRadius={80} innerRadius={45} dataKey="value"
                        label={(entry: any) => {
                          const t = summary.paymentBreakdown.reduce((s: number, p: any) => s + p.total, 0);
                          return t > 0 ? `${((entry.value / t) * 100).toFixed(0)}%` : '';
                        }}
                        labelLine={false}
                      >
                        {summary.paymentBreakdown.map((p: any) => (
                          <Cell key={p.paymentMethod} fill={PAYMENT_COLORS[p.paymentMethod] || '#64748b'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[240px] flex flex-col items-center justify-center gap-2">
                  <Wallet className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-extrabold text-slate-500 dark:text-slate-400">Abhi koi data nahi</p>
                </div>
              )}
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-sky-200 dark:border-sky-500/30 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-500/10 dark:to-cyan-500/10 border-b-2 border-sky-200 dark:border-sky-500/30">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  <h3 className="font-extrabold text-sky-900 dark:text-sky-200">Top Suppliers</h3>
                </div>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {summary?.topSuppliers?.length ? (
                  summary.topSuppliers.map((ts: any, idx: number) => {
                    const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500'];
                    return (
                      <Link key={ts.supplierId} to={`/suppliers/${ts.supplierId}`} className="px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition active:scale-[0.99]">
                        <div className={`h-9 w-9 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0`}>
                          {idx < 3 ? <Crown className="h-4 w-4" /> : idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{ts.supplier?.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">{ts.orderCount} orders</div>
                        </div>
                        <div className="font-extrabold text-sky-700 dark:text-sky-300 text-sm tabular-nums">{formatPKR(ts.totalSpent)}</div>
                      </Link>
                    );
                  })
                ) : <div className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400 font-semibold">Abhi koi supplier nahi</div>}
              </div>
            </div>

            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-violet-200 dark:border-violet-500/30 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 border-b-2 border-violet-200 dark:border-violet-500/30">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  <h3 className="font-extrabold text-violet-900 dark:text-violet-200">Sab Se Zyada Mangwaya</h3>
                </div>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {summary?.topProducts?.length ? (
                  summary.topProducts.map((tp: any, idx: number) => {
                    const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500'];
                    return (
                      <div key={tp.productId} className="px-4 sm:px-5 py-3 flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0`}>
                          {idx < 3 ? <Star className="h-4 w-4 fill-white" /> : idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{tp.product?.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold tabular-nums">
                            {formatQty(tp.quantityPurchased)} {tp.product?.unit} • {tp.orderCount} orders
                          </div>
                        </div>
                        <div className="font-extrabold text-violet-700 dark:text-violet-300 text-sm tabular-nums">{formatPKR(tp.totalSpent)}</div>
                      </div>
                    );
                  })
                ) : <div className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400 font-semibold">Abhi koi data nahi</div>}
              </div>
            </div>
          </section>

          <section className="grid sm:grid-cols-2 gap-4">
            <ComparisonCard title="Aaj vs Kal" currentLabel="Aaj" currentValue={summary?.todayPurchases ?? 0}
              previousLabel="Kal" previousValue={summary?.yesterdayPurchases ?? 0}
              growth={growthVsYesterday} icon={CalendarDays} themeColor="sky" />
            <ComparisonCard title="Is Mahina vs Pichla" currentLabel="Is Mahina" currentValue={summary?.monthPurchases ?? 0}
              previousLabel="Pichla Mahina" previousValue={summary?.lastMonthPurchases ?? 0}
              growth={growthVsLastMonth} icon={Activity} themeColor="sky" />
          </section>
        </>
      )}

      {/* ═══════════════════════ HISTORY TAB ═══════════════════════ */}
      {tab === 'history' && (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b-2 border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">Saari Purchases</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold tabular-nums">{filteredPurchases.length} of {purchases.length}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="h-10 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition print:hidden"
                >
                  <Printer className="h-4 w-4" /> Print
                </button>
                <button
                  onClick={exportCSV}
                  className="h-10 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition print:hidden"
                >
                  <FileSpreadsheet className="h-4 w-4" /> CSV
                </button>
              </div>
            </div>
            <div className="relative print:hidden">
              <Search className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Purchase # ya supplier ka naam..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-500/30 transition"
              />
              {historySearch && (
                <button onClick={() => setHistorySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit print:hidden">
              {[
                { v: 'all' as const, l: `Sab (${purchases.length})` },
                { v: 'pending' as const, l: `Pending (${purchases.filter((p: any) => p.status === 'PENDING').length})` },
                { v: 'due' as const, l: `Udhaar (${purchases.filter((p: any) => Number(p.total) > Number(p.paidAmount)).length})` },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => setHistoryFilter(o.v)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-extrabold transition tabular-nums',
                    historyFilter === o.v
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                  ].join(' ')}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          {filteredPurchases.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="font-extrabold text-slate-900 dark:text-white">
                {historySearch || historyFilter !== 'all' ? 'Kuch nahi mila' : 'Abhi koi purchase nahi'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                {historySearch || historyFilter !== 'all' ? 'Search ya filter change karo' : '"New Purchase" tab se pehli purchase karo'}
              </p>
            </div>
          ) : (
            <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
              {filteredPurchases.map((p: any) => {
                const balance = Math.max(p.total - p.paidAmount, 0);
                return (
                  <Link key={p.id} to={`/purchases/${p.id}`} className="block px-4 sm:px-6 py-3 sm:py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
                          <ShoppingCart className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 dark:text-white font-mono text-xs sm:text-sm">{p.purchaseNumber}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                              p.status === 'RECEIVED'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : p.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                            }`}>{p.status}</span>
                            {balance > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 text-[9px] font-extrabold tabular-nums">
                                Udhaar {formatPKR(balance)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{p.supplier?.name || '—'}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-bold flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(p.purchasedAt)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {p.items?.length || 0} items
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {p.items?.slice(0, 3).map((it: any) => (
                              <span key={it.id} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 max-w-[180px] truncate inline-flex items-center gap-1">
                                <Boxes className="h-2.5 w-2.5 text-sky-600 dark:text-sky-400 shrink-0" />
                                {it.product.name} × {formatQty(it.quantity)}
                              </span>
                            ))}
                            {(p.items?.length || 0) > 3 && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                +{(p.items?.length || 0) - 3} aur
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg sm:text-2xl font-extrabold text-sky-700 dark:text-sky-300 tabular-nums">{formatPKR(p.total)}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold tabular-nums">
                          Paid: <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{formatPKR(p.paidAmount)}</span>
                        </div>
                        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-sky-600 dark:text-sky-400 group-hover:text-sky-700 print:hidden">
                          <Eye className="h-3 w-3" />
                          Dekho
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Mobile sticky save */}
      {tab === 'create' && cart.length > 0 && (
        <div className="sm:hidden fixed bottom-4 inset-x-4 z-30 print:hidden">
          <Button
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-700 shadow-2xl font-extrabold"
            onClick={handleSave}
            loading={createMutation.isPending}
            disabled={cart.length === 0 || !supplierId}
          >
            <CheckCircle2 className="h-5 w-5" /> Save Purchase • {formatPKR(total)}
          </Button>
        </div>
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
          section, div { box-shadow: none !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          .divide-y-2 > a, .divide-y > a { page-break-inside: avoid !important; display: block !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TEACHER — "Purchase kya hai"
   ═════════════════════════════════════════════════════════════ */
function PurchasesTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-sky-300 dark:border-sky-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-sky-200 dark:border-sky-500/30 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-500/15 dark:to-cyan-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-sky-900 dark:text-sky-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Purchase Kaise Karein?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Jab supplier se maal aata hai to yahan <strong>purchase entry</strong> karo.
            Save karte hi <strong>stock apne aap barh jata hai</strong> aur supplier ka hisaab ban jata hai.
          </p>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3.5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">4 Asaan Steps</div>
            <div className="space-y-2">
              <FlowRow num="①" title="Supplier" desc="Kis se maal aaya — pehle se udhaar bhi dikhta hai" />
              <FlowRow num="②" title="Products" desc="Search karo, qty + cost likho, Add dabao" />
              <FlowRow num="③" title="Payment" desc="Kitna diya — kam diya to baqi udhaar ban jata hai" />
              <FlowRow num="④" title="Save" desc="Stock update + supplier ka hisaab — sab automatic" />
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>⚡ Enter se tez kaam</strong> — search me Enter = pehla product select, qty/cost me Enter = cart me add</TipRow>
            <TipRow><strong>⌨️ Ctrl+Enter</strong> — kahin se bhi purchase save</TipRow>
            <TipRow><strong>🔁 Smart Reorder</strong> — low stock items ek click me cart me, phir Save</TipRow>
            <TipRow><strong>💰 Udhaar</strong> — paid kam rakho to baqi supplier ke naam baqi chala jata hai</TipRow>
          </div>

          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-emerald-900 dark:text-emerald-300">Golden Rule</h4>
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 mt-1 leading-relaxed">
                  Maal jaisay hi dukan par pohunche, usi waqt entry kar do.
                  Der se entry = stock galat = sale par "out of stock" ka jhoota message.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-700 text-white font-extrabold shadow-lg shadow-sky-500/30 hover:shadow-xl transition"
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

function FlowRow({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="h-7 w-7 rounded-lg bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 flex items-center justify-center text-xs font-extrabold shrink-0">
        {num}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-extrabold text-slate-900 dark:text-white">{title}</div>
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{desc}</div>
      </div>
    </div>
  );
}

function TipRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
