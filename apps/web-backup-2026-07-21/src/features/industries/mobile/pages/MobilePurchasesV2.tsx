import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Smartphone, Plus, Trash2, Minus, Search, X, Package, Building2,
  Calendar, AlertTriangle, ArrowRight, Eye, CalendarDays, Wallet,
  TrendingUp, Crown, Star, Award, BarChart3, Receipt, ShieldCheck,
  Zap, CheckCircle2, Activity, Boxes,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@/lib/format';
import type { PaymentMethod } from '@/api/sales.api';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { usePurchasesData } from '@/features/purchases/hooks/usePurchasesData';
import {
  PurchasesHero, TabSwitcher, PurchaseStatCard, ComparisonCard,
  formatDate, formatQty, formatPercent, PAYMENT_COLORS,
} from '@/features/purchases/components/PurchasesShared';

type CartLine = {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  costPrice: number;
  isPhone: boolean;
};

const TABS = [
  { id: 'create', label: 'New Purchase', icon: Plus },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'history', label: 'History', icon: Receipt },
];

// Detect if product is a phone (needs IMEI tracking)
const PHONE_KEYWORDS = ['phone', 'mobile', 'iphone', 'samsung', 'xiaomi', 'oppo', 'vivo', 'infinix', 'tecno', 'redmi', 'huawei'];

function isPhoneProduct(product: any): boolean {
  const name = product.name.toLowerCase();
  const category = (product.category?.name || '').toLowerCase();
  return PHONE_KEYWORDS.some((kw) => name.includes(kw) || category.includes(kw));
}

export default function MobilePurchasesV2() {
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
  const isSelectedPhone = selectedProduct ? isPhoneProduct(selectedProduct) : false;

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
  const phoneCount = cart.filter((l) => l.isPhone).reduce((s, l) => s + l.quantity, 0);
  const accessoryCount = cart.filter((l) => !l.isPhone).reduce((s, l) => s + l.quantity, 0);

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

    const isPhone = isPhoneProduct(product);

    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id
            ? { ...l, quantity: l.quantity + quantity, costPrice }
            : l,
        );
      }
      return [...prev, { productId: product.id, name: product.name, unit: product.unit, quantity, costPrice, isPhone }];
    });

    setSelectedProductId(''); setProductSearch(''); setQty('1'); setCost('');
    toast.success(`${product.name} added${isPhone ? ' — IMEIs baad mein add karein' : ''}`);
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
        gradient="from-slate-950 via-blue-900 to-indigo-800"
        emoji="📱"
        industryLabel="Mobile"
        industryBadgeColor="bg-blue-500/30 border border-blue-300/40"
        title="Mobile Shop Purchases"
        subtitle="Phone khareedo — IMEI tracking + accessories batch import"
        onRefresh={refetch}
        isRefetching={isRefetching}
        extraActions={
          <Link to="/imei-inventory">
            <button className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold transition backdrop-blur">
              <ShieldCheck className="h-4 w-4" />
              IMEI Manager
            </button>
          </Link>
        }
      />

      <TabSwitcher tabs={TABS} active={tab} onChange={setTab} color="blue" />

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <PurchaseStatCard
          label="Aaj ki Purchases"
          value={formatPKR(summary?.todayPurchases ?? 0)}
          sub={`${summary?.todayCount ?? 0} orders`}
          icon={TrendingUp}
          color="blue"
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
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">New Mobile Shop Purchase</h3>
                <p className="text-sm text-slate-500">Phones (IMEI tracked) aur accessories</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Supplier *</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="CASH">💵 Cash</option>
                  <option value="JAZZCASH">📱 JazzCash</option>
                  <option value="EASYPAISA">⚡ EasyPaisa</option>
                  <option value="CARD">💳 Card</option>
                  <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                </select>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/30 p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Add Phone or Accessory</label>
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => { setProductSearch(e.target.value); setSelectedProductId(''); }}
                    placeholder="Search phone model or accessory..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  {productSearch && (
                    <button onClick={() => { setProductSearch(''); setSelectedProductId(''); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                      <X className="h-4 w-4 text-slate-400" />
                    </button>
                  )}
                </div>
                {productSearch && !selectedProductId && filteredProducts.length > 0 && (
                  <div className="mt-2 max-h-[220px] overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                    {filteredProducts.map((p) => {
                      const isPhone = isPhoneProduct(p);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setSelectedProductId(p.id); setProductSearch(p.name); setCost(String(p.costPrice || '')); }}
                          className="w-full px-3 py-2.5 text-left hover:bg-blue-50 transition"
                        >
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-sm text-slate-900 truncate flex-1">{p.name}</div>
                            {isPhone && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 text-blue-700">
                                <Smartphone className="h-2.5 w-2.5" /> PHONE
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Stock: <span className="font-bold text-emerald-700">{formatQty(p.stock)} {p.unit}</span>
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
                  <div className="rounded-xl bg-white border border-blue-200 p-3">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-sm text-slate-900 flex-1">{selectedProduct.name}</div>
                      {isSelectedPhone && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 text-blue-700">
                          <Smartphone className="h-2.5 w-2.5" /> PHONE
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Current stock: <span className="font-bold text-emerald-700">{formatQty(selectedProduct.stock)} {selectedProduct.unit}</span>
                    </div>
                    {isSelectedPhone && (
                      <div className="mt-2 text-[10px] text-blue-800 font-bold bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                        💡 Purchase save karne ke baad IMEIs bulk add kar sakte hain (IMEI Manager se)
                      </div>
                    )}
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
                      <Button onClick={addToCart} className="w-full bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Cart summary chip */}
            {cart.length > 0 && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-2 flex items-center gap-3 text-xs">
                <div className="inline-flex items-center gap-1 font-bold text-blue-800">
                  <Smartphone className="h-3 w-3" /> {phoneCount} phones
                </div>
                <span className="text-blue-400">•</span>
                <div className="inline-flex items-center gap-1 font-bold text-blue-800">
                  <Boxes className="h-3 w-3" /> {accessoryCount} accessories
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <Smartphone className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                  <div className="text-sm font-bold text-slate-700">Cart empty</div>
                </div>
              ) : (
                cart.map((line) => (
                  <div key={line.productId} className={`rounded-xl border p-3 ${line.isPhone ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-slate-900 truncate">{line.name}</div>
                          {line.isPhone && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 text-blue-700">
                              <Smartphone className="h-2.5 w-2.5" /> PHONE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{formatPKR(line.costPrice)} × {formatQty(line.quantity)} {line.unit}</div>
                      </div>
                      <div className="font-extrabold text-blue-700 shrink-0 tabular-nums">{formatPKR(line.costPrice * line.quantity)}</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 bg-slate-50 rounded-lg p-1">
                        <button onClick={() => updateQty(line.productId, -1)} className="h-7 w-7 rounded-md bg-white border border-slate-200 flex items-center justify-center">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-12 text-center font-bold text-sm">{formatQty(line.quantity)}</span>
                        <button onClick={() => updateQty(line.productId, 1)} className="h-7 w-7 rounded-md bg-blue-600 text-white flex items-center justify-center">
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

            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-4 space-y-2">
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
              <div className="flex items-center justify-between pt-2 border-t-2 border-blue-200">
                <span className="text-lg font-extrabold text-slate-900">Total</span>
                <span className="text-3xl font-extrabold text-blue-700 tabular-nums">{formatPKR(total)}</span>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg shadow-blue-500/30"
              size="lg"
              onClick={handleSave}
              loading={createMutation.isPending}
              disabled={cart.length === 0 || !supplierId}
            >
              <CheckCircle2 className="h-4 w-4" /> Save Purchase • {formatPKR(total)}
            </Button>

            {phoneCount > 0 && (
              <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-xs text-blue-900">
                  <div className="font-extrabold">💡 IMEI Reminder</div>
                  <div className="font-semibold mt-0.5">
                    Purchase save karne ke baad <Link to="/imei-inventory" className="underline font-extrabold">IMEI Manager</Link> pe jao aur {phoneCount} phone{phoneCount !== 1 ? 's' : ''} ke IMEIs bulk import karo.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Recent Purchases</h3>
                  <p className="text-xs text-slate-500">Latest 5</p>
                </div>
                <button onClick={() => setTab('history')} className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1">
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
                          <div className="text-[11px] text-slate-500 font-semibold truncate">{p.supplierName}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-blue-700 text-sm tabular-nums">{formatPKR(p.total)}</div>
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

            <Link to="/imei-inventory" className="block rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white p-5 shadow-lg shadow-blue-500/30 hover:shadow-xl transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/80">Post-Purchase</div>
                  <h3 className="text-lg font-bold">Add IMEIs</h3>
                </div>
              </div>
              <div className="text-xs opacity-90 flex items-center justify-between">
                <span>Bulk import phone IMEIs with PTA status</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </section>
      )}

      {tab === 'analytics' && (
        <>
          <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">7-Day Mobile Purchases</h3>
                  <p className="text-xs text-slate-500">Daily spending on phones + accessories</p>
                </div>
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="mpurGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                    <Area type="monotone" dataKey="total" name="Purchases" fill="url(#mpurGrad)" stroke="#3b82f6" strokeWidth={2.5} />
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
            <div className="rounded-3xl bg-white border-2 border-blue-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  <h3 className="font-extrabold text-blue-900">Top Mobile Suppliers</h3>
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
                        <div className="font-extrabold text-blue-700 text-sm tabular-nums">{formatPKR(ts.totalSpent)}</div>
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
                  <h3 className="font-extrabold text-violet-900">Most Purchased Models</h3>
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
                            {formatQty(tp.quantityPurchased)} units • {tp.orderCount} orders
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
              themeColor="blue"
            />
            <ComparisonCard
              title="This Month vs Last Month"
              currentLabel="This Month"
              currentValue={summary?.monthPurchases ?? 0}
              previousLabel="Last Month"
              previousValue={summary?.lastMonthPurchases ?? 0}
              growth={growthVsLastMonth}
              icon={Activity}
              themeColor="blue"
            />
          </section>
        </>
      )}

      {tab === 'history' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 space-y-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900">All Mobile Purchases</h3>
              <p className="text-sm text-slate-500">{filteredPurchases.length} of {purchases.length} purchases</p>
            </div>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search purchase # or supplier..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          {filteredPurchases.length === 0 ? (
            <div className="p-12 text-center">
              <Smartphone className="h-16 w-16 text-slate-300 mx-auto mb-3" />
              <h4 className="font-bold text-slate-900">No purchases yet</h4>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredPurchases.map((p: any) => {
                const balance = Math.max(p.total - p.paidAmount, 0);
                const hasPhones = p.items?.some((it: any) => isPhoneProduct(it.product));
                return (
                  <Link key={p.id} to={`/purchases/${p.id}`} className="block px-6 py-4 hover:bg-slate-50 transition group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <Smartphone className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 font-mono text-sm">{p.purchaseNumber}</span>
                            {hasPhones && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold inline-flex items-center gap-1">
                                <ShieldCheck className="h-2.5 w-2.5" /> IMEI TRACKED
                              </span>
                            )}
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
                        <div className="text-2xl font-extrabold text-blue-700 tabular-nums">{formatPKR(p.total)}</div>
                        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-600">
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
