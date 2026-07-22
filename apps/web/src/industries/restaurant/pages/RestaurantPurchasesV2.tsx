import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChefHat, Plus, Trash2, Minus, Search, X, Package, Building2,
  Truck, Calendar, Download, AlertTriangle, ArrowRight, Eye,
  CalendarDays, Wallet, TrendingUp, Sparkles, Crown, Star,
  Award, BarChart3, Receipt, Leaf, Wheat, Milk, Beef, Fish,
  DollarSign, CheckCircle2, Activity, Filter,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
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
  formatDate, formatQty, formatPercent, PAYMENT_COLORS,
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
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'history', label: 'History', icon: Receipt },
];

// Restaurant-specific ingredient categories
const INGREDIENT_CATEGORIES = [
  { key: 'meat', label: 'Meat & Poultry', icon: Beef, color: 'bg-rose-100 text-rose-700' },
  { key: 'seafood', label: 'Seafood', icon: Fish, color: 'bg-cyan-100 text-cyan-700' },
  { key: 'dairy', label: 'Dairy', icon: Milk, color: 'bg-blue-100 text-blue-700' },
  { key: 'grains', label: 'Grains & Flour', icon: Wheat, color: 'bg-amber-100 text-amber-700' },
  { key: 'vegetables', label: 'Vegetables', icon: Leaf, color: 'bg-green-100 text-green-700' },
];

export default function RestaurantPurchasesV2() {
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

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return products.slice(0, 30);
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [products, productSearch]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const filteredPurchases = useMemo(() => {
    const q = historySearch.toLowerCase().trim();
    if (!q) return purchases;
    return purchases.filter((p: any) =>
      p.purchaseNumber.toLowerCase().includes(q) ||
      p.supplier?.name?.toLowerCase().includes(q)
    );
  }, [purchases, historySearch]);

  const subtotal = cart.reduce((s, l) => s + l.quantity * l.costPrice, 0);
  const discountValue = Number(discount || 0);
  const total = Math.max(subtotal - discountValue, 0);

  const trendData = useMemo(() => {
    if (!summary?.salesTrend7Days) return [];
    return summary.salesTrend7Days.map((p: any) => {
      const d = new Date(p.date);
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      return { ...p, label: dayName };
    });
  }, [summary]);

  const addToCart = () => {
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return toast.error('Product select karein');
    const quantity = Number(qty || 0);
    const costPrice = Number(cost || 0);
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
      return [...prev, { productId: product.id, name: product.name, unit: product.unit, quantity, costPrice }];
    });

    setSelectedProductId(''); setProductSearch(''); setQty('1'); setCost('');
    toast.success(`${product.name} added`);
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
    <div className="space-y-6">
      <PurchasesHero
        gradient="from-slate-950 via-orange-900 to-red-700"
        emoji="🍽️"
        industryLabel="Restaurant"
        industryBadgeColor="bg-orange-500/30 border border-orange-300/40"
        title="Kitchen Purchases"
        subtitle="Ingredients, food supplies, kitchen inventory — suppliers se maal khareedo"
        onRefresh={refetch}
        isRefetching={isRefetching}
      />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="orange" />

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <PurchaseStatCard
          label="Aaj ki Purchases"
          value={formatPKR(summary?.todayPurchases ?? 0)}
          sub={`${summary?.todayCount ?? 0} orders`}
          icon={TrendingUp}
          color="orange"
          trend={growthVsYesterday}
        />
        <PurchaseStatCard
          label="Is Mahine"
          value={formatPKR(summary?.monthPurchases ?? 0)}
          sub={`${summary?.monthCount ?? 0} orders`}
          icon={CalendarDays}
          color="violet"
          trend={growthVsLastMonth}
        />
        <PurchaseStatCard
          label="Total Lifetime"
          value={formatPKR(summary?.totalPurchases ?? 0)}
          sub={`${summary?.totalCount ?? 0} purchases`}
          icon={Wallet}
          color="amber"
        />
        <PurchaseStatCard
          label="Outstanding Due"
          value={formatPKR(summary?.outstandingDue ?? 0)}
          sub={`${summary?.suppliersWithDue ?? 0} suppliers`}
          icon={AlertTriangle}
          color="rose"
          isAlert={(summary?.outstandingDue ?? 0) > 0}
        />
      </section>

      {tab === 'create' && (
        <section className="grid xl:grid-cols-[1.2fr_1fr] gap-6">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-orange-500 to-red-700 text-white flex items-center justify-center shadow-lg shadow-orange-500/30">
                <ChefHat className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">New Kitchen Purchase</h3>
                <p className="text-sm text-slate-500">Ingredients aur supplies add karein</p>
              </div>
            </div>

            {/* Ingredient category quick chips */}
            <div className="rounded-2xl bg-orange-50 border border-orange-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-orange-700 mb-2">Common Ingredient Categories</div>
              <div className="flex flex-wrap gap-2">
                {INGREDIENT_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div key={cat.key} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold ${cat.color}`}>
                      <Icon className="h-3 w-3" />
                      {cat.label}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Supplier *</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.contactPerson ? ` (${s.contactPerson})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                >
                  <option value="CASH">💵 Cash</option>
                  <option value="JAZZCASH">📱 JazzCash</option>
                  <option value="EASYPAISA">⚡ EasyPaisa</option>
                  <option value="CARD">💳 Card</option>
                  <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                </select>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-orange-200 bg-orange-50/30 p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Add Ingredient/Product</label>
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => { setProductSearch(e.target.value); setSelectedProductId(''); }}
                    placeholder="Search ingredient..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                  {productSearch && (
                    <button onClick={() => { setProductSearch(''); setSelectedProductId(''); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                      <X className="h-4 w-4 text-slate-400" />
                    </button>
                  )}
                </div>
                {productSearch && !selectedProductId && filteredProducts.length > 0 && (
                  <div className="mt-2 max-h-[220px] overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedProductId(p.id); setProductSearch(p.name); setCost(String(p.costPrice || '')); }}
                        className="w-full px-3 py-2.5 text-left hover:bg-orange-50 transition"
                      >
                        <div className="font-bold text-sm text-slate-900 truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Stock: <span className="font-bold text-emerald-700">{formatQty(p.stock)} {p.unit}</span>
                          {p.costPrice > 0 && <> • Cost: <span className="font-bold">{formatPKR(p.costPrice)}</span></>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedProduct && (
                <>
                  <div className="rounded-xl bg-white border border-orange-200 p-3">
                    <div className="font-bold text-sm text-slate-900">{selectedProduct.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Current stock: <span className="font-bold text-emerald-700">{formatQty(selectedProduct.stock)} {selectedProduct.unit}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Qty * ({selectedProduct.unit})</label>
                      <input type="number" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Cost/unit *</label>
                      <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold" />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={addToCart} className="w-full bg-orange-600 hover:bg-orange-700">
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <ChefHat className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                  <div className="text-sm font-bold text-slate-700">Cart empty</div>
                  <div className="text-xs text-slate-500 mt-1">Ingredients add karein</div>
                </div>
              ) : (
                cart.map((line) => (
                  <div key={line.productId} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate">{line.name}</div>
                        <div className="text-xs text-slate-500">{formatPKR(line.costPrice)} × {formatQty(line.quantity)} {line.unit}</div>
                      </div>
                      <div className="font-extrabold text-orange-700 shrink-0 tabular-nums">{formatPKR(line.costPrice * line.quantity)}</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 bg-slate-50 rounded-lg p-1">
                        <button onClick={() => updateQty(line.productId, -1)} className="h-7 w-7 rounded-md bg-white border border-slate-200 flex items-center justify-center">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-12 text-center font-bold text-sm">{formatQty(line.quantity)}</span>
                        <button onClick={() => updateQty(line.productId, 1)} className="h-7 w-7 rounded-md bg-orange-600 text-white flex items-center justify-center">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button onClick={() => removeLine(line.productId)} className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <Input label="Discount (PKR)" type="number" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              <Input label="Paid Amount" type="number" placeholder={String(total)} value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
              <Input label="Notes" placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 p-4 space-y-2">
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
              <div className="flex items-center justify-between pt-2 border-t-2 border-orange-200">
                <span className="text-lg font-extrabold text-slate-900">Total</span>
                <span className="text-3xl font-extrabold text-orange-700 tabular-nums">{formatPKR(total)}</span>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-orange-600 to-red-700 shadow-lg shadow-orange-500/30"
              size="lg"
              onClick={handleSave}
              loading={createMutation.isPending}
              disabled={cart.length === 0 || !supplierId}
            >
              <CheckCircle2 className="h-4 w-4" /> Save Purchase • {formatPKR(total)}
            </Button>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Recent Purchases</h3>
                  <p className="text-xs text-slate-500">Latest 5</p>
                </div>
                <button onClick={() => setTab('history')} className="text-xs font-bold text-orange-600 hover:underline inline-flex items-center gap-1">
                  All <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {summary?.recentPurchases?.length ? (
                  summary.recentPurchases.map((p: any) => (
                    <Link key={p.id} to={`/purchases/${p.id}`} className="block px-5 py-3 hover:bg-slate-50 transition">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 font-mono text-xs">{p.purchaseNumber}</div>
                          <div className="text-[11px] text-slate-500 font-semibold truncate inline-flex items-center gap-1">
                            <Building2 className="h-2.5 w-2.5" />
                            {p.supplierName}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-orange-700 text-sm tabular-nums">{formatPKR(p.total)}</div>
                          <div className="text-[10px] text-slate-500">{formatDate(p.purchasedAt)}</div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="px-5 py-12 text-center text-sm text-slate-500">No purchases yet</div>
                )}
              </div>
            </div>

            {(summary?.outstandingDue ?? 0) > 0 && (
              <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-rose-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-rose-700">Outstanding Due</div>
                    <div className="text-2xl font-extrabold text-rose-900">{formatPKR(summary?.outstandingDue ?? 0)}</div>
                  </div>
                </div>
                <p className="text-xs text-rose-800 font-semibold">
                  {summary?.suppliersWithDue} suppliers ka payment baqi hai
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === 'analytics' && (
        <>
          <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">7-Day Kitchen Purchases</h3>
                  <p className="text-xs text-slate-500">Daily ingredient spending</p>
                </div>
                <BarChart3 className="h-5 w-5 text-orange-500" />
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="rpurGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                    <Area type="monotone" dataKey="total" name="Purchases" fill="url(#rpurGrad)" stroke="#f97316" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Payment Methods</h3>
              {summary?.paymentBreakdown?.length ? (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.paymentBreakdown.map((p: any) => ({ name: p.paymentMethod, value: p.total }))}
                        cx="50%" cy="45%" outerRadius={80} innerRadius={40} dataKey="value"
                        label={(entry: any) => {
                          const total = summary.paymentBreakdown.reduce((s: number, p: any) => s + p.total, 0);
                          return total > 0 ? `${((entry.value / total) * 100).toFixed(0)}%` : '0%';
                        }}
                        labelLine={false}
                      >
                        {summary.paymentBreakdown.map((p: any) => (
                          <Cell key={p.paymentMethod} fill={PAYMENT_COLORS[p.paymentMethod] || '#64748b'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">No payment data</div>
              )}
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-white border-2 border-orange-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-200">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  <h3 className="font-extrabold text-orange-900">Top Ingredient Suppliers</h3>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {summary?.topSuppliers?.length ? (
                  summary.topSuppliers.map((ts: any, idx: number) => {
                    const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500'];
                    return (
                      <Link key={ts.supplierId} to={`/suppliers/${ts.supplierId}`} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition">
                        <div className={`h-9 w-9 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0`}>
                          {idx < 3 ? <Crown className="h-4 w-4" /> : idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-sm truncate">{ts.supplier?.name}</div>
                          <div className="text-[11px] text-slate-500 font-semibold">{ts.orderCount} orders</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-orange-700 text-sm tabular-nums">{formatPKR(ts.totalSpent)}</div>
                        </div>
                      </Link>
                    );
                  })
                ) : <div className="px-5 py-12 text-center text-sm text-slate-500">No suppliers yet</div>}
              </div>
            </div>

            <div className="rounded-3xl bg-white border-2 border-violet-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b-2 border-violet-200">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-violet-600" />
                  <h3 className="font-extrabold text-violet-900">Most Purchased Ingredients</h3>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {summary?.topProducts?.length ? (
                  summary.topProducts.map((tp: any, idx: number) => {
                    const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500'];
                    return (
                      <div key={tp.productId} className="px-5 py-3 flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0`}>
                          {idx < 3 ? <Star className="h-4 w-4 fill-white" /> : idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-sm truncate">{tp.product?.name}</div>
                          <div className="text-[11px] text-slate-500 font-semibold">
                            {formatQty(tp.quantityPurchased)} {tp.product?.unit} • {tp.orderCount} orders
                          </div>
                        </div>
                        <div className="font-extrabold text-violet-700 text-sm tabular-nums">{formatPKR(tp.totalSpent)}</div>
                      </div>
                    );
                  })
                ) : <div className="px-5 py-12 text-center text-sm text-slate-500">No data</div>}
              </div>
            </div>
          </section>

          <section className="grid sm:grid-cols-2 gap-4">
            <ComparisonCard
              title="Today vs Yesterday"
              currentLabel="Today"
              currentValue={summary?.todayPurchases ?? 0}
              previousLabel="Yesterday"
              previousValue={summary?.yesterdayPurchases ?? 0}
              growth={growthVsYesterday}
              icon={CalendarDays}
              themeColor="orange"
            />
            <ComparisonCard
              title="This Month vs Last Month"
              currentLabel="This Month"
              currentValue={summary?.monthPurchases ?? 0}
              previousLabel="Last Month"
              previousValue={summary?.lastMonthPurchases ?? 0}
              growth={growthVsLastMonth}
              icon={Activity}
              themeColor="orange"
            />
          </section>
        </>
      )}

      {tab === 'history' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 space-y-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900">All Kitchen Purchases</h3>
              <p className="text-sm text-slate-500">{filteredPurchases.length} of {purchases.length} purchases</p>
            </div>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search purchase # or supplier..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              />
              {historySearch && (
                <button onClick={() => setHistorySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          {filteredPurchases.length === 0 ? (
            <div className="p-12 text-center">
              <ChefHat className="h-16 w-16 text-slate-300 mx-auto mb-3" />
              <h4 className="font-bold text-slate-900">No purchases yet</h4>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredPurchases.map((p: any) => {
                const balance = Math.max(p.total - p.paidAmount, 0);
                return (
                  <Link key={p.id} to={`/purchases/${p.id}`} className="block px-6 py-4 hover:bg-slate-50 transition group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="h-12 w-12 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                          <ChefHat className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 font-mono text-sm">{p.purchaseNumber}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              p.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700' :
                              p.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                            }`}>{p.status}</span>
                            {balance > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                                Due {formatPKR(balance)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            <span className="font-semibold text-slate-700">{p.supplier?.name || '—'}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(p.purchasedAt)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {p.items?.length || 0} items
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-extrabold text-orange-700 tabular-nums">{formatPKR(p.total)}</div>
                        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-orange-600">
                          <Eye className="h-3 w-3" /> Details <ArrowRight className="h-3 w-3" />
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
    </div>
  );
}
