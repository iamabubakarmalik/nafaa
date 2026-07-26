import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Plus, Trash2, Minus, Search, X, Package, Building2,
  Calendar, AlertTriangle, ArrowRight, Eye, CalendarDays, Wallet,
  TrendingUp, Crown, Star, Award, BarChart3, Receipt, RefreshCw,
  CheckCircle2, Activity, Boxes, Filter,
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

export default function RetailPurchasesV2() {
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const {
    purchases, summary, suppliers, products,
    isRefetching, refetch, createMutation,
  } = usePurchasesData();

  const [tab, setTab] = useState('create');
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
  const cartCount = cart.length;

  const trendData = useMemo(() => {
    if (!summary?.salesTrend7Days) return [];
    return summary.salesTrend7Days.map((p: any) => {
      const d = new Date(p.date);
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      return { ...p, label: dayName };
    });
  }, [summary]);

  const addToCart = (
    prodOverride?: { id: string; name: string; unit: string; costPrice: number },
    qtyOverride?: number,
  ) => {
    const product = prodOverride || products.find((p) => p.id === selectedProductId);
    if (!product) return toast.error('Product select karein');
    const quantity = qtyOverride ?? Number(qty || 0);
    const costPrice = prodOverride?.costPrice ?? Number(cost || 0);
    if (quantity <= 0) return toast.error('Quantity required');
    if (costPrice <= 0) return toast.error('Cost required');

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
    }
    toast.success('Cart me add ho gaya', { duration: 900 });
  };

  const addLowStockToCart = (product: any) => {
    const suggestedQty = Math.max(product.lowStockAlert * 3 - product.stock, product.lowStockAlert);
    addToCart(
      { id: product.id, name: product.name, unit: product.unit, costPrice: product.costPrice || product.price * 0.7 },
      suggestedQty,
    );
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
      paidAmount: Number(paidAmount || total),
      notes: notes.trim() || undefined,
      items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, costPrice: l.costPrice })),
    }, {
      onSuccess: () => {
        setCart([]); setSelectedProductId(''); setProductSearch('');
        setQty('1'); setCost(''); setDiscount(''); setPaidAmount(''); setNotes('');
      },
    });
  };

  const growthVsYesterday = summary?.growthVsYesterday ?? 0;
  const growthVsLastMonth = summary?.growthVsLastMonth ?? 0;

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 sm:pb-6">
      <PurchasesHero
        gradient="from-slate-950 via-sky-900 to-cyan-700"
        emoji="🛒"
        industryLabel="Retail"
        industryBadgeColor="bg-sky-500/30 border border-sky-300/40"
        title="Retail Store Purchases"
        subtitle="Bulk stocking, smart reorder suggestions, multi-unit support"
        onRefresh={refetch}
        isRefetching={isRefetching}
        extraActions={
          lowStockProducts.length > 0 && (
            <button onClick={() => setTab('reorder')} className="inline-flex items-center gap-2 rounded-xl bg-amber-500/30 hover:bg-amber-500/50 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold transition backdrop-blur border border-amber-300/40 active:scale-95">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">{lowStockProducts.length} low stock</span>
              <span className="sm:hidden">{lowStockProducts.length}</span>
            </button>
          )
        }
      />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="sky" />

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4">
        <PurchaseStatCard label="Aaj ki Purchases" value={formatPKR(summary?.todayPurchases ?? 0)} sub={`${summary?.todayCount ?? 0} orders`} icon={TrendingUp} color="sky" trend={growthVsYesterday} />
        <PurchaseStatCard label="Is Mahine" value={formatPKR(summary?.monthPurchases ?? 0)} sub={`${summary?.monthCount ?? 0} orders`} icon={CalendarDays} color="violet" trend={growthVsLastMonth} />
        <PurchaseStatCard label="Total Lifetime" value={formatPKR(summary?.totalPurchases ?? 0)} sub={`${summary?.totalCount ?? 0} purchases`} icon={Wallet} color="amber" />
        <PurchaseStatCard label="Outstanding Due" value={formatPKR(summary?.outstandingDue ?? 0)} sub={`${summary?.suppliersWithDue ?? 0} suppliers`} icon={AlertTriangle} color="rose" isAlert={(summary?.outstandingDue ?? 0) > 0} />
      </section>

      {tab === 'create' && (
        <section className="grid xl:grid-cols-[1.2fr_1fr] gap-4 sm:gap-6">
          <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-700 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 shrink-0">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">New Retail Purchase</h3>
                <p className="text-xs sm:text-sm text-slate-500">Bulk stocking, multi-unit products</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">Supplier *</label>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 sm:px-4 text-sm font-bold focus:outline-none focus:border-sky-500">
                  <option value="">Select supplier...</option>
                  {suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 sm:px-4 text-sm font-bold focus:outline-none focus:border-sky-500">
                  <option value="CASH">💵 Cash</option>
                  <option value="JAZZCASH">📱 JazzCash</option>
                  <option value="EASYPAISA">⚡ EasyPaisa</option>
                  <option value="CARD">💳 Card</option>
                  <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                </select>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/40 p-3 sm:p-4 space-y-3">
              <div>
                <label className="block text-[10px] sm:text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">Add Product</label>
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={productSearch} onChange={(e) => { setProductSearch(e.target.value); setSelectedProductId(''); }} placeholder="Product dhundo (naam, SKU, barcode)..." className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200" />
                  {productSearch && (<button onClick={() => { setProductSearch(''); setSelectedProductId(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="h-4 w-4 text-slate-400" /></button>)}
                </div>
                {productSearch && !selectedProductId && filteredProducts.length > 0 && (
                  <div className="mt-2 max-h-[280px] overflow-y-auto rounded-xl border-2 border-slate-200 bg-white divide-y divide-slate-100">
                    {filteredProducts.map((p) => {
                      const isLow = p.stock <= p.lowStockAlert;
                      return (
                        <button key={p.id} type="button" onClick={() => { setSelectedProductId(p.id); setProductSearch(p.name); setCost(String(p.costPrice || '')); }} className="w-full px-3 py-2.5 text-left hover:bg-sky-50 transition active:scale-[0.99]">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-sm text-slate-900 truncate flex-1">{p.name}</div>
                            {isLow && (<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-700 shrink-0"><AlertTriangle className="h-2.5 w-2.5" /> LOW</span>)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Stock: <span className={`font-bold ${isLow ? 'text-amber-700' : 'text-emerald-700'}`}>{formatQty(p.stock)} {p.unit}</span>
                            {p.costPrice > 0 && <> • Cost: <span className="font-bold">{formatPKR(p.costPrice)}</span></>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedProduct && (
                <>
                  <div className="rounded-xl bg-white border-2 border-sky-200 p-3">
                    <div className="font-extrabold text-sm text-slate-900">{selectedProduct.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 font-bold">
                      Current stock: <span className="text-emerald-700">{formatQty(selectedProduct.stock)} {selectedProduct.unit}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 mb-1 uppercase">Qty *</label>
                      <input type="number" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-11 w-full rounded-lg border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-sky-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 mb-1 uppercase">Cost *</label>
                      <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-11 w-full rounded-lg border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-sky-500" />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={() => addToCart()} className="w-full bg-gradient-to-r from-sky-600 to-cyan-700">
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Cart lines */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="rounded-2xl border-4 border-dashed border-slate-200 p-6 sm:p-8 text-center">
                  <ShoppingCart className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                  <div className="text-sm font-extrabold text-slate-700">Cart khaali hai</div>
                  <button onClick={() => setTab('reorder')} className="mt-2 text-xs font-extrabold text-sky-600 hover:underline">
                    Smart reorder suggestions dekho →
                  </button>
                </div>
              ) : (
                cart.map((line) => (
                  <div key={line.productId} className="rounded-2xl border-2 border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-slate-900 truncate text-sm">{line.name}</div>
                        <div className="text-xs text-slate-500 font-bold">{formatPKR(line.costPrice)} × {formatQty(line.quantity)} {line.unit}</div>
                      </div>
                      <div className="font-extrabold text-sky-700 shrink-0 tabular-nums">{formatPKR(line.costPrice * line.quantity)}</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 bg-slate-50 rounded-xl p-1 border-2 border-slate-200">
                        <button onClick={() => updateQty(line.productId, -1)} className="h-8 w-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 flex items-center justify-center transition">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-12 text-center font-extrabold text-sm tabular-nums">{formatQty(line.quantity)}</span>
                        <button onClick={() => updateQty(line.productId, 1)} className="h-8 w-8 rounded-lg bg-sky-600 hover:bg-sky-700 active:scale-95 text-white flex items-center justify-center transition">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button onClick={() => removeLine(line.productId)} className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600 flex items-center justify-center transition">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-2 sm:gap-3">
              <Input label="Discount (PKR)" type="number" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              <Input label="Paid Amount" type="number" placeholder={String(total)} value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
              <Input label="Notes" placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 border-2 border-sky-200 p-3 sm:p-4 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-bold">Subtotal</span>
                <span className="font-bold text-slate-900 tabular-nums">{formatPKR(subtotal)}</span>
              </div>
              {discountValue > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-700 font-bold">Discount</span>
                  <span className="font-bold text-amber-700 tabular-nums">-{formatPKR(discountValue)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t-2 border-sky-200">
                <span className="text-base sm:text-lg font-extrabold text-slate-900">Total</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-sky-700 tabular-nums">{formatPKR(total)}</span>
              </div>
            </div>

            {/* Desktop save button */}
            <Button className="hidden sm:flex w-full bg-gradient-to-r from-sky-600 to-cyan-700 shadow-lg shadow-sky-500/30" size="lg" onClick={handleSave} loading={createMutation.isPending} disabled={cart.length === 0 || !supplierId}>
              <CheckCircle2 className="h-4 w-4" /> Save Purchase • {formatPKR(total)}
            </Button>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 py-3 sm:py-4 border-b-2 border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Recent Purchases</h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-bold">Latest 5</p>
                </div>
                <button onClick={() => setTab('history')} className="text-xs font-extrabold text-sky-600 hover:underline inline-flex items-center gap-1">
                  All <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {summary?.recentPurchases?.length ? (
                  summary.recentPurchases.slice(0, 5).map((p: any) => (
                    <Link key={p.id} to={`/purchases/${p.id}`} className="block px-4 sm:px-5 py-3 hover:bg-slate-50 transition">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 font-mono text-xs">{p.purchaseNumber}</div>
                          <div className="text-[11px] text-slate-500 font-semibold truncate">{p.supplierName}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-sky-700 text-sm tabular-nums">{formatPKR(p.total)}</div>
                          <div className="text-[10px] text-slate-500 font-bold">{formatDate(p.purchasedAt)}</div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="px-5 py-8 text-center text-sm text-slate-500 font-semibold">No purchases yet</div>
                )}
              </div>
            </div>

            {lowStockProducts.length > 0 && (
              <button onClick={() => setTab('reorder')} className="w-full block rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 sm:p-5 shadow-lg shadow-amber-500/30 hover:shadow-xl active:scale-95 transition text-left">
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
                  <span>AI-suggested reorder quantities</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>
            )}
          </div>
        </section>
      )}

      {tab === 'reorder' && (
        <section className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">Smart Reorder</h3>
              <p className="text-xs sm:text-sm text-slate-500">Low stock detected — one-click add to cart</p>
            </div>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="rounded-2xl border-4 border-dashed border-emerald-200 p-12 text-center bg-emerald-50/30">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-lg font-extrabold text-emerald-900">Alhamdulillah! Sab stock sahi 🎉</h4>
              <p className="text-sm text-emerald-700 mt-1 font-semibold">Koi product low stock par nahi hai</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockProducts.map((p) => {
                const isOut = p.stock === 0;
                const suggestedQty = Math.max(p.lowStockAlert * 3 - p.stock, p.lowStockAlert);
                const inCart = cart.find((l) => l.productId === p.id);
                return (
                  <div key={p.id} className={`rounded-2xl border-2 p-3 sm:p-4 ${isOut ? 'border-rose-300 bg-rose-50/50' : 'border-amber-300 bg-amber-50/50'}`}>
                    <div className="flex items-start gap-3 mb-2">
                      <div className="h-10 w-10 rounded-xl bg-white overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-slate-900 text-sm truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{p.sku || '—'}</div>
                      </div>
                      {isOut ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-600 text-white shrink-0">OUT</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500 text-white shrink-0">LOW</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="rounded-lg bg-white border border-slate-200 p-2">
                        <div className="text-[9px] uppercase font-extrabold text-slate-500">Current</div>
                        <div className={`text-lg font-extrabold tabular-nums ${isOut ? 'text-rose-700' : 'text-amber-700'}`}>
                          {formatQty(p.stock)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
                        <div className="text-[9px] uppercase font-extrabold text-emerald-700">Suggested</div>
                        <div className="text-lg font-extrabold tabular-nums text-emerald-700">
                          {formatQty(suggestedQty)}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-600 font-semibold mb-2">
                      Cost: <span className="font-extrabold text-slate-900">{formatPKR(p.costPrice || p.price * 0.7)}</span> / {p.unit}
                    </div>

                    {inCart ? (
                      <div className="text-center py-2 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold inline-flex items-center justify-center gap-1 w-full">
                        <CheckCircle2 className="h-3 w-3" /> Cart me ({formatQty(inCart.quantity)})
                      </div>
                    ) : (
                      <button onClick={() => addLowStockToCart(p)} className="w-full h-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-95 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1 transition">
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

      {tab === 'analytics' && (
        <>
          <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-6">
            <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">7-Day Purchases</h3>
                  <p className="text-xs text-slate-500 font-bold">Daily bulk stocking</p>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                    <Area type="monotone" dataKey="total" name="Purchases" fill="url(#rtpurGrad)" stroke="#0ea5e9" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">Payment Methods</h3>
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
                          const total = summary.paymentBreakdown.reduce((s: number, p: any) => s + p.total, 0);
                          return total > 0 ? `${((entry.value / total) * 100).toFixed(0)}%` : '';
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
                  <Wallet className="h-10 w-10 text-slate-300" />
                  <p className="text-sm font-extrabold text-slate-500">No data</p>
                </div>
              )}
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-sky-200 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-sky-50 to-cyan-50 border-b-2 border-sky-200">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  <h3 className="font-extrabold text-sky-900">Top Suppliers</h3>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {summary?.topSuppliers?.length ? (
                  summary.topSuppliers.map((ts: any, idx: number) => {
                    const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500'];
                    return (
                      <Link key={ts.supplierId} to={`/suppliers/${ts.supplierId}`} className="px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition active:scale-[0.99]">
                        <div className={`h-9 w-9 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0`}>
                          {idx < 3 ? <Crown className="h-4 w-4" /> : idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-slate-900 text-sm truncate">{ts.supplier?.name}</div>
                          <div className="text-[11px] text-slate-500 font-bold">{ts.orderCount} orders</div>
                        </div>
                        <div className="font-extrabold text-sky-700 text-sm tabular-nums">{formatPKR(ts.totalSpent)}</div>
                      </Link>
                    );
                  })
                ) : <div className="px-5 py-12 text-center text-sm text-slate-500 font-semibold">No suppliers yet</div>}
              </div>
            </div>

            <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-violet-200 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b-2 border-violet-200">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-violet-600" />
                  <h3 className="font-extrabold text-violet-900">Most Purchased</h3>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {summary?.topProducts?.length ? (
                  summary.topProducts.map((tp: any, idx: number) => {
                    const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500'];
                    return (
                      <div key={tp.productId} className="px-4 sm:px-5 py-3 flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0`}>
                          {idx < 3 ? <Star className="h-4 w-4 fill-white" /> : idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-slate-900 text-sm truncate">{tp.product?.name}</div>
                          <div className="text-[11px] text-slate-500 font-bold">
                            {formatQty(tp.quantityPurchased)} {tp.product?.unit} • {tp.orderCount} orders
                          </div>
                        </div>
                        <div className="font-extrabold text-violet-700 text-sm tabular-nums">{formatPKR(tp.totalSpent)}</div>
                      </div>
                    );
                  })
                ) : <div className="px-5 py-12 text-center text-sm text-slate-500 font-semibold">No data</div>}
              </div>
            </div>
          </section>

          <section className="grid sm:grid-cols-2 gap-4">
            <ComparisonCard title="Today vs Yesterday" currentLabel="Today" currentValue={summary?.todayPurchases ?? 0}
              previousLabel="Yesterday" previousValue={summary?.yesterdayPurchases ?? 0}
              growth={growthVsYesterday} icon={CalendarDays} themeColor="sky" />
            <ComparisonCard title="This Month vs Last Month" currentLabel="This Month" currentValue={summary?.monthPurchases ?? 0}
              previousLabel="Last Month" previousValue={summary?.lastMonthPurchases ?? 0}
              growth={growthVsLastMonth} icon={Activity} themeColor="sky" />
          </section>
        </>
      )}

      {tab === 'history' && (
        <section className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b-2 border-slate-100 space-y-3">
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">All Purchases</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-bold">{filteredPurchases.length} of {purchases.length} purchases</p>
            </div>
            <div className="relative">
              <Search className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Purchase # ya supplier..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
              {historySearch && (
                <button onClick={() => setHistorySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
              {[
                { v: 'all' as const, l: 'Sab' },
                { v: 'pending' as const, l: 'Pending' },
                { v: 'due' as const, l: 'Due Baqi' },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => setHistoryFilter(o.v)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-extrabold transition',
                    historyFilter === o.v ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900',
                  ].join(' ')}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          {filteredPurchases.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="h-16 w-16 text-slate-300 mx-auto mb-3" />
              <h4 className="font-extrabold text-slate-900">Koi purchase nahi</h4>
            </div>
          ) : (
            <div className="divide-y-2 divide-slate-100">
              {filteredPurchases.map((p: any) => {
                const balance = Math.max(p.total - p.paidAmount, 0);
                return (
                  <Link key={p.id} to={`/purchases/${p.id}`} className="block px-4 sm:px-6 py-3 sm:py-4 hover:bg-slate-50 transition group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                          <ShoppingCart className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 font-mono text-xs sm:text-sm">{p.purchaseNumber}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                              p.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700' :
                              p.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                            }`}>{p.status}</span>
                            {balance > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-extrabold">
                                Due {formatPKR(balance)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            <span className="font-bold text-slate-700 truncate">{p.supplier?.name || '—'}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 font-bold flex-wrap">
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
                              <span key={it.id} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 max-w-[180px] truncate inline-flex items-center gap-1">
                                <Boxes className="h-2.5 w-2.5 text-sky-600" />
                                {it.product.name} × {formatQty(it.quantity)}
                              </span>
                            ))}
                            {(p.items?.length || 0) > 3 && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                                +{(p.items?.length || 0) - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg sm:text-2xl font-extrabold text-sky-700 tabular-nums">{formatPKR(p.total)}</div>
                        <div className="text-[10px] text-slate-500 mt-1 font-bold">
                          Paid: <span className="text-emerald-700 font-extrabold">{formatPKR(p.paidAmount)}</span>
                        </div>
                        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-sky-600 group-hover:text-sky-700">
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

      {/* Mobile sticky save button */}
      {tab === 'create' && cart.length > 0 && (
        <div className="sm:hidden fixed bottom-4 inset-x-4 z-30">
          <Button
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-700 shadow-2xl"
            onClick={handleSave}
            loading={createMutation.isPending}
            disabled={cart.length === 0 || !supplierId}
          >
            <CheckCircle2 className="h-5 w-5" /> Save Purchase • {formatPKR(total)}
          </Button>
        </div>
      )}
    </div>
  );
}
