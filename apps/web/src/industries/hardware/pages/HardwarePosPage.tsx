import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, Search, X, Plus, Trash2, User, UserPlus, Building,
  Truck, Layers, ArrowLeft, DollarSign, CheckCircle2, ChevronDown,
  Camera, AlertTriangle, TrendingUp, Award, Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { bulkPricingApi } from '../api/bulk-pricing.api';
import { projectsApi } from '../api/projects.api';
import { useSharedPosCart, cartLineId } from '@modules/pos/hooks/useSharedPosCart';

export default function HardwarePosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const {
    cart, setCart, customerId, setCustomerId,
    paymentMethod, setPaymentMethod, paidAmount, setPaidAmount,
    saleMode, setSaleMode, globalDiscount, setGlobalDiscount,
    subtotal, total, totalItems, effectivePaid, credit, clearCart,
  } = useSharedPosCart();

  const { data: productsData } = useQuery({
    queryKey: ['products-for-hardware-pos', search],
    queryFn: () => productsApi.list({ page: 1, limit: 200, search: search || undefined }),
  });
  const products = productsData?.items ?? [];

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });
  const customers = customersData?.items ?? [];

  const { data: projects = [] } = useQuery({
    queryKey: ['hardware-projects-active'],
    queryFn: () => projectsApi.list({ active: true }),
  });

  const categories = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; color: string }>();
    for (const p of products) {
      if (p.category && !seen.has(p.category.id)) {
        seen.set(p.category.id, { id: p.category.id, name: p.category.name, color: p.category.color || '#a16207' });
      }
    }
    return Array.from(seen.values());
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (categoryFilter === 'all') return products;
    return products.filter((p) => p.categoryId === categoryFilter);
  }, [products, categoryFilter]);

  const addProductToCart = async (product: Product) => {
    if (product.stock <= 0) return toast.error('Out of stock');

    // Get bulk pricing tiers for this product
    let bulkTiers: any[] = [];
    try {
      bulkTiers = await bulkPricingApi.listByProduct(product.id);
    } catch { /* no tiers */ }

    const existing = cart.find((c) => c.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return toast.error('Stock limit');
      const newQty = existing.quantity + 1;
      // Auto-apply best tier
      const applicableTier = bulkTiers
        .filter((t: any) => newQty >= t.minQuantity && (!t.maxQuantity || newQty <= t.maxQuantity))
        .sort((a: any, b: any) => a.price - b.price)[0];
      setCart((prev) => prev.map((c) => c.cartLineId === existing.cartLineId
        ? { ...c, quantity: newQty, priceOverride: applicableTier ? applicableTier.price : undefined, note: applicableTier ? `Tier: ${applicableTier.label}` : c.note }
        : c));
    } else {
      setCart((prev) => [...prev, {
        cartLineId: cartLineId(),
        productId: product.id,
        name: product.name,
        variantImage: product.images?.[0]?.url,
        basePrice: product.price,
        wholesalePrice: product.wholesalePrice,
        stock: product.stock,
        quantity: 1,
        unit: product.unit,
        category: product.category,
        useWholesale: false,
        lineDiscount: 0,
      }]);
    }
    toast.success(`${product.name} added`);
  };

  const handleBarcodeScan = async (code: string) => {
    setScannerOpen(false);
    if (!code.trim()) return;
    try {
      const product = await productsApi.byBarcode(code.trim());
      addProductToCart(product);
    } catch {
      toast.error(`Barcode "${code}" not found`);
    }
  };

  const addCustomerMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: (customer) => {
      toast.success(`${customer.name} added`);
      setCustomerId(customer.id);
      setShowCustomerAdd(false);
      setNewCustomer({ name: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!currentShopId) throw new Error('Shop required');
      const sale = await salesApi.create({
        shopId: currentShopId,
        customerId: customerId || undefined,
        paymentMethod,
        paidAmount: effectivePaid,
        discount: Number(globalDiscount) || 0,
        note: selectedProjectId ? `Project: ${projects.find((p) => p.id === selectedProjectId)?.name}` : undefined,
        items: cart.map((c) => ({
          productId: c.productId,
          quantity: c.quantity,
          priceOverride: c.priceOverride,
          lineDiscount: c.lineDiscount,
          useWholesale: c.useWholesale,
          note: c.note,
        })),
      });
      return sale;
    },
    onSuccess: (sale) => {
      window.open(`/sales/${sale.id}/receipt?auto=1`, '_blank');
      clearCart();
      setSelectedProjectId('');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Sale failed'),
  });

  const handleCheckout = () => {
    if (cart.length === 0) return toast.error('Cart empty');
    if (!currentShopId) return toast.error('Select shop first');
    if (credit > 0 && !customerId) return toast.error('Customer required for credit');
    checkoutMutation.mutate();
  };

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleBarcodeScan} onClose={() => setScannerOpen(false)} />}

      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                <h3 className="font-extrabold">Quick Add Customer</h3>
              </div>
              <button onClick={() => setShowCustomerAdd(false)} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input autoFocus value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Customer/Contractor name"
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-amber-500" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="03XX..."
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-amber-500" />
              <Button size="lg" className="w-full bg-gradient-to-r from-amber-600 to-orange-700"
                onClick={() => {
                  if (!newCustomer.name.trim()) return toast.error('Name required');
                  addCustomerMutation.mutate({ name: newCustomer.name.trim(), phone: newCustomer.phone.trim() || undefined });
                }}
                loading={addCustomerMutation.isPending}>
                Add Customer
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr_460px] gap-4 h-[calc(100dvh-7rem)]">
        {/* PRODUCTS SIDE */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />
            <div className="relative px-5 py-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold border border-white/20">
                <Package className="h-3 w-3 text-amber-300" />
                Hardware POS
              </div>
              <h2 className="mt-2 text-2xl font-extrabold">Bulk Sale & Contractor Billing</h2>
              <p className="text-xs text-white/80 font-semibold mt-1">
                Auto tier pricing on quantity — cement, steel, tiles, sanitary
              </p>
            </div>
          </div>

          <div className="shrink-0 px-4 py-3 bg-slate-50/80 border-b border-slate-100 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search cement, steel, tiles, brand..."
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-amber-500" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button onClick={() => setScannerOpen(true)}
                className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white flex items-center justify-center shadow-lg">
                <Camera className="h-5 w-5" />
              </button>
            </div>

            {categories.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button onClick={() => setCategoryFilter('all')}
                  className={`shrink-0 px-3 h-8 rounded-lg text-xs font-extrabold transition ${
                    categoryFilter === 'all' ? 'bg-amber-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'
                  }`}>
                  All ({products.length})
                </button>
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setCategoryFilter(cat.id)}
                    className={`shrink-0 px-3 h-8 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 border transition`}
                    style={{
                      backgroundColor: categoryFilter === cat.id ? cat.color : '#fff',
                      borderColor: categoryFilter === cat.id ? cat.color : '#e2e8f0',
                      color: categoryFilter === cat.id ? '#fff' : '#475569',
                    }}>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30">
            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                <Package className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700">No products</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {filteredProducts.map((p) => (
                  <button key={p.id} onClick={() => addProductToCart(p)}
                    disabled={p.stock <= 0}
                    className={[
                      'group text-left rounded-2xl border-2 overflow-hidden transition bg-white',
                      p.stock <= 0 ? 'opacity-40 cursor-not-allowed border-slate-200'
                        : 'border-slate-200 hover:border-amber-400 hover:shadow-lg hover:-translate-y-0.5',
                    ].join(' ')}>
                    <div className="aspect-square bg-slate-100 overflow-hidden relative">
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-slate-400" />
                        </div>
                      )}
                      {p.stock <= (p.lowStockAlert ?? 10) && p.stock > 0 && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold shadow">
                          LOW
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="font-extrabold text-slate-900 text-xs line-clamp-2 min-h-[2rem]">{p.name}</div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <div className="text-sm font-extrabold text-emerald-700 tabular-nums">
                          {formatPKR(p.price)}
                          <span className="text-[9px] text-slate-500 ml-0.5">/{p.unit}</span>
                        </div>
                        <div className="text-[9px] font-bold text-slate-500">{p.stock} {p.unit}</div>
                      </div>
                      {p.wholesalePrice && p.wholesalePrice < p.price && (
                        <div className="mt-0.5 text-[9px] font-bold text-violet-700">
                          W: {formatPKR(p.wholesalePrice)}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CART SIDE */}
        <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                  <Package className="h-2.5 w-2.5" />
                  Hardware Cart
                </div>
                <div className="text-2xl font-extrabold tabular-nums mt-1">{totalItems.toFixed(0)} items</div>
                <div className="text-xs text-white/80 font-semibold">{formatPKRFull(total)}</div>
              </div>
              {cart.length > 0 && (
                <button onClick={() => { if (confirm('Clear cart?')) clearCart(); }}
                  className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-rose-500/40 text-white text-xs font-extrabold border border-white/20">
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Customer + Project */}
            <div className="p-3 border-b border-slate-100 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <User className="h-3 w-3 text-amber-600" />
                  Customer / Contractor
                </label>
                <button onClick={() => setShowCustomerAdd(true)}
                  className="text-xs font-extrabold text-amber-600 inline-flex items-center gap-1">
                  <UserPlus className="h-3 w-3" />
                  Add
                </button>
              </div>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500 appearance-none">
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` • ${c.phone}` : ''}{c.balance > 0 ? ` • Udhaar: ${formatPKR(c.balance)}` : ''}</option>
                ))}
              </select>

              {/* Project selector */}
              {projects.length > 0 && (
                <>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 mt-2">
                    <Building className="h-3 w-3 text-blue-600" />
                    Link to Project (optional)
                  </label>
                  <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500 appearance-none">
                    <option value="">No project</option>
                    {projects.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.projectNumber} • {p.name}</option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <div className="p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <Package className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">Empty cart</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Click products to add</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.cartLineId} className="rounded-xl border-2 border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm text-slate-900 truncate">{item.name}</div>
                        {item.note && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">
                            <Layers className="h-2.5 w-2.5" />
                            {item.note}
                          </div>
                        )}
                      </div>
                      <button onClick={() => setCart((prev) => prev.filter((c) => c.cartLineId !== item.cartLineId))}
                        className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center bg-slate-100 rounded-lg overflow-hidden">
                        <button onClick={() => setCart((prev) => prev.map((c) => c.cartLineId === item.cartLineId ? { ...c, quantity: Math.max(0.01, c.quantity - 1) } : c))}
                          className="h-7 w-7 hover:bg-slate-200 font-extrabold">−</button>
                        <span className="h-7 w-12 flex items-center justify-center text-xs font-extrabold tabular-nums">{item.quantity}</span>
                        <button onClick={() => setCart((prev) => prev.map((c) => c.cartLineId === item.cartLineId ? { ...c, quantity: c.quantity + 1 } : c))}
                          className="h-7 w-7 bg-amber-600 text-white hover:bg-amber-700 font-extrabold">+</button>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-emerald-700 tabular-nums">
                          {formatPKR((item.priceOverride ?? item.basePrice) * item.quantity)}
                        </div>
                        <div className="text-[9px] font-bold text-slate-500">
                          {formatPKR(item.priceOverride ?? item.basePrice)}/{item.unit}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {cart.length > 0 && (
            <div className="shrink-0 border-t-2 border-slate-200 bg-slate-50/50 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input type="number" placeholder="Discount" value={globalDiscount} onChange={(e) => setGlobalDiscount(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 font-bold tabular-nums" />
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="JAZZCASH">JazzCash</option>
                  <option value="EASYPAISA">EasyPaisa</option>
                  <option value="BANK_TRANSFER">Bank</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {(['FULL_PAYMENT', 'PARTIAL_CREDIT', 'FULL_CREDIT'] as const).map((m) => (
                  <button key={m} onClick={() => setSaleMode(m)}
                    className={[
                      'py-2 rounded-lg text-[10px] font-extrabold transition',
                      saleMode === m ? 'bg-amber-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                    ].join(' ')}>
                    {m === 'FULL_PAYMENT' ? 'Full Pay' : m === 'PARTIAL_CREDIT' ? 'Partial' : 'Udhaar'}
                  </button>
                ))}
              </div>

              {saleMode === 'PARTIAL_CREDIT' && (
                <input type="number" placeholder="Paid amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                  className="h-10 w-full rounded-lg border-2 border-amber-300 bg-amber-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
              )}

              <div className="rounded-xl bg-gradient-to-br from-slate-950 to-amber-900 text-white p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
                {Number(globalDiscount) > 0 && (
                  <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(Number(globalDiscount))}</span></div>
                )}
                <div className="pt-1 mt-1 border-t border-white/20 flex justify-between items-center">
                  <span className="text-sm font-extrabold text-amber-300">TOTAL</span>
                  <span className="text-2xl font-extrabold text-amber-300 tabular-nums">{formatPKR(total)}</span>
                </div>
                {credit > 0 && (
                  <div className="flex justify-between text-amber-300 pt-1 border-t border-white/20 mt-1">
                    <span className="font-extrabold">Udhaar</span>
                    <span className="font-extrabold tabular-nums">{formatPKR(credit)}</span>
                  </div>
                )}
              </div>

              <Button size="lg" className="w-full bg-gradient-to-r from-amber-600 to-orange-700"
                onClick={handleCheckout} loading={checkoutMutation.isPending} disabled={!currentShopId}>
                <CheckCircle2 className="h-5 w-5" />
                Complete Sale
              </Button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
