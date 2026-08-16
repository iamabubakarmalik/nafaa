import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Milk, Search, X, Plus, Trash2, User, UserPlus, Sunrise, Sunset,
  Truck, Home, Warehouse, Package, ArrowLeft, CheckCircle2,
  ChevronDown, Camera, DollarSign, Route as RouteIcon,
  Users, MapPin, Phone, Clock, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { offlineSalesApi } from '@core/lib/offline/offlineSales';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { dairyCustomersApi } from '../api/customers.api';
import { routesApi as dairyRoutesApi } from '../api/routes.api';
import { useSharedPosCart, cartLineId } from '@modules/pos/hooks/useSharedPosCart';
import { FbrModeIndicator } from '@integrations/fbr/components/FbrModeIndicator';

type SlotMode = 'MORNING' | 'EVENING' | 'BOTH';
type SaleType = 'WALK_IN' | 'SUBSCRIBER' | 'ROUTE_DELIVERY' | 'BULK';

export default function DairyPosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const [saleType, setSaleType] = useState<SaleType>('WALK_IN');
  const [slot, setSlot] = useState<SlotMode>('MORNING');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  const {
    cart, setCart, customerId, setCustomerId,
    paymentMethod, setPaymentMethod, paidAmount, setPaidAmount,
    saleMode, setSaleMode, globalDiscount, setGlobalDiscount,
    subtotal, total, totalItems, effectivePaid, credit, clearCart,
  } = useSharedPosCart();

  const { data: productsData } = useQuery({
    queryKey: ['products-for-dairy-pos', search],
    queryFn: () => productsApi.list({ page: 1, limit: 100, search: search || undefined }),
  });
  const products = productsData?.items ?? [];

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });
  const customers = customersData?.items ?? [];

  const { data: dairyCustomers = [] } = useQuery({
    queryKey: ['dairy-customers-pos'],
    queryFn: () => dairyCustomersApi.list({ status: 'ACTIVE' }),
    enabled: saleType === 'SUBSCRIBER' || saleType === 'ROUTE_DELIVERY',
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['dairy-routes'],
    queryFn: () => dairyRoutesApi.list(),
    enabled: saleType === 'ROUTE_DELIVERY',
  });

  const filteredDairyCustomers = useMemo(() => {
    if (saleType !== 'ROUTE_DELIVERY') return dairyCustomers;
    if (!selectedRouteId) return dairyCustomers;
    return dairyCustomers.filter((c: any) => c.routeId === selectedRouteId);
  }, [dairyCustomers, selectedRouteId, saleType]);

  const addProductToCart = (product: Product) => {
    if (product.stock <= 0) return toast.error('Out of stock');
    const existing = cart.find((c) => c.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return toast.error('Stock limit');
      setCart((prev) => prev.map((c) => c.cartLineId === existing.cartLineId ? { ...c, quantity: c.quantity + 1 } : c));
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
        useWholesale: saleType === 'BULK',
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

  const loadSubscriberDefaults = (dairyCustomerId: string) => {
    const dc = dairyCustomers.find((c: any) => c.id === dairyCustomerId);
    if (!dc) return;
    if (dc.customerId) setCustomerId(dc.customerId);
    const qty = slot === 'MORNING' ? dc.morningQuantity : slot === 'EVENING' ? dc.eveningQuantity : (dc.morningQuantity + dc.eveningQuantity);
    if (qty > 0 && products.length > 0) {
      const milkProduct = products.find((p) => p.name.toLowerCase().includes('milk') || p.unit === 'liter');
      if (milkProduct) {
        setCart((prev) => [...prev, {
          cartLineId: cartLineId(),
          productId: milkProduct.id,
          name: milkProduct.name,
          variantImage: milkProduct.images?.[0]?.url,
          basePrice: dc.customRate || milkProduct.price,
          wholesalePrice: milkProduct.wholesalePrice,
          stock: milkProduct.stock,
          quantity: qty,
          unit: milkProduct.unit,
          category: milkProduct.category,
          useWholesale: false,
          priceOverride: dc.customRate || undefined,
          lineDiscount: 0,
          note: `Subscriber: ${dc.name} • ${slot} slot • ${qty}L`,
        }]);
        toast.success(`Loaded ${dc.name}'s ${slot.toLowerCase()} order`);
      }
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
    mutationFn: () => {
      if (!currentShopId) throw new Error('Shop required');
      return offlineSalesApi.create({
        shopId: currentShopId,
        customerId: customerId || undefined,
        paymentMethod,
        paidAmount: effectivePaid,
        discount: Number(globalDiscount) || 0,
        note: saleType !== 'WALK_IN' ? `${saleType} • ${slot} slot` : undefined,
        items: cart.map((c) => ({
          productId: c.productId,
          quantity: c.quantity,
          priceOverride: c.priceOverride,
          lineDiscount: c.lineDiscount,
          useWholesale: c.useWholesale,
          note: c.note,
        })),
      });
    },
    onSuccess: (sale) => {
      window.open(`/sales/${sale.id}/receipt?auto=1`, '_blank');
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dairy-customers-pos'] });
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
            <div className="px-5 py-4 bg-gradient-to-br from-fuchsia-600 to-pink-700 text-white flex items-center justify-between">
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
                placeholder="Customer name" className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-fuchsia-500" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="03XX..." className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-fuchsia-500" />
              <Button size="lg" className="w-full bg-gradient-to-r from-fuchsia-600 to-pink-700"
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
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-fuchsia-900 to-pink-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-fuchsia-400/20 blur-2xl" />
            <div className="relative px-5 py-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold border border-white/20">
                <Milk className="h-3 w-3 text-amber-300" />
                Dairy POS
              </div>
              <h2 className="mt-2 text-2xl font-extrabold">Milk, Dahi, Ghee & More</h2>
              <p className="text-xs text-white/80 font-semibold mt-1">Walk-in, subscriber, route delivery — sab ek jagah</p>
            </div>
          </div>

          <div className="shrink-0 px-4 py-3 bg-slate-50/80 border-b border-slate-100 space-y-2">
            {/* Sale Type Tabs */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { v: 'WALK_IN' as SaleType, l: 'Walk-in', icon: User, color: 'blue' },
                { v: 'SUBSCRIBER' as SaleType, l: 'Subscriber', icon: Users, color: 'emerald' },
                { v: 'ROUTE_DELIVERY' as SaleType, l: 'Route', icon: Truck, color: 'violet' },
                { v: 'BULK' as SaleType, l: 'Bulk', icon: Warehouse, color: 'amber' },
              ].map((opt) => {
                const active = saleType === opt.v;
                const colorMap: Record<string, string> = {
                  blue: active ? 'bg-blue-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                  emerald: active ? 'bg-emerald-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                  violet: active ? 'bg-violet-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                  amber: active ? 'bg-amber-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                };
                return (
                  <button key={opt.v} onClick={() => setSaleType(opt.v)}
                    className={`h-11 rounded-xl text-xs font-extrabold transition inline-flex items-center justify-center gap-1 ${colorMap[opt.color]}`}>
                    <opt.icon className="h-3.5 w-3.5" />
                    {opt.l}
                  </button>
                );
              })}
            </div>

            {/* Slot Selector */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: 'MORNING' as SlotMode, l: 'Morning', icon: Sunrise, color: 'amber' },
                { v: 'EVENING' as SlotMode, l: 'Evening', icon: Sunset, color: 'indigo' },
                { v: 'BOTH' as SlotMode, l: 'Both', icon: Clock, color: 'fuchsia' },
              ].map((opt) => {
                const active = slot === opt.v;
                const colorMap: Record<string, string> = {
                  amber: active ? 'bg-amber-500 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                  indigo: active ? 'bg-indigo-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                  fuchsia: active ? 'bg-fuchsia-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                };
                return (
                  <button key={opt.v} onClick={() => setSlot(opt.v)}
                    className={`h-9 rounded-lg text-xs font-extrabold transition inline-flex items-center justify-center gap-1 ${colorMap[opt.color]}`}>
                    <opt.icon className="h-3 w-3" />
                    {opt.l}
                  </button>
                );
              })}
            </div>

            {/* Route filter (only for ROUTE_DELIVERY) */}
            {saleType === 'ROUTE_DELIVERY' && (
              <div className="relative">
                <RouteIcon className="h-4 w-4 text-violet-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <select value={selectedRouteId} onChange={(e) => setSelectedRouteId(e.target.value)}
                  className="h-11 w-full rounded-xl border-2 border-violet-200 bg-violet-50 pl-9 pr-9 text-sm font-bold focus:outline-none focus:border-violet-500 appearance-none">
                  <option value="">All Routes ({dairyCustomers.length})</option>
                  {routes.map((r: any) => (<option key={r.id} value={r.id}>{r.name} ({dairyCustomers.filter((c: any) => c.routeId === r.id).length})</option>))}
                </select>
              </div>
            )}

            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..." className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-fuchsia-500" />
                {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-slate-400" /></button>}
              </div>
              <button onClick={() => setScannerOpen(true)}
                className="h-11 w-11 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white flex items-center justify-center shadow-lg">
                <Camera className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30">
            {(saleType === 'SUBSCRIBER' || saleType === 'ROUTE_DELIVERY') && filteredDairyCustomers.length > 0 && (
              <div className="mb-3 rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-3">
                <div className="text-[10px] uppercase font-extrabold text-emerald-700 mb-2">
                  📋 Subscribers ({filteredDairyCustomers.length}) — click to auto-load {slot.toLowerCase()} order
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[240px] overflow-y-auto">
                  {filteredDairyCustomers.map((dc: any) => (
                    <button key={dc.id} onClick={() => loadSubscriberDefaults(dc.id)}
                      className="text-left rounded-xl bg-white border-2 border-emerald-200 hover:border-emerald-500 p-2.5 transition">
                      <div className="font-extrabold text-slate-900 text-sm truncate">{dc.name}</div>
                      <div className="text-[10px] text-slate-500 font-bold">{dc.customerNumber}</div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] font-bold">
                        {slot === 'MORNING' && <span className="text-amber-700">🌅 {dc.morningQuantity}L</span>}
                        {slot === 'EVENING' && <span className="text-indigo-700">🌆 {dc.eveningQuantity}L</span>}
                        {slot === 'BOTH' && <span className="text-fuchsia-700">☀️ {dc.morningQuantity + dc.eveningQuantity}L</span>}
                        {dc.customRate && <span className="text-emerald-700">@{formatPKR(dc.customRate)}</span>}
                      </div>
                      {dc.currentBalance > 0 && (
                        <div className="mt-1 text-[9px] font-extrabold text-rose-700">Owes: {formatPKR(dc.currentBalance)}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {products.map((p) => (
                <button key={p.id} onClick={() => addProductToCart(p)}
                  disabled={p.stock <= 0}
                  className={`group text-left rounded-2xl border-2 overflow-hidden transition bg-white ${
                    p.stock <= 0 ? 'opacity-40 cursor-not-allowed border-slate-200'
                    : 'border-slate-200 hover:border-fuchsia-400 hover:shadow-md hover:-translate-y-0.5'
                  }`}>
                  <div className="aspect-square bg-slate-100 overflow-hidden">
                    {p.images?.[0]?.url ? (
                      <img src={p.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Milk className="h-8 w-8 text-fuchsia-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="font-extrabold text-slate-900 text-xs line-clamp-2 leading-tight min-h-[2rem]">{p.name}</div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <div className="text-sm font-extrabold text-emerald-700 tabular-nums">
                        {formatPKR(saleType === 'BULK' && p.wholesalePrice ? p.wholesalePrice : p.price)}
                      </div>
                      <div className="text-[9px] font-bold text-slate-500">{p.stock} {p.unit}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* CART SIDE */}
        <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-fuchsia-900 to-pink-700 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                  <Milk className="h-2.5 w-2.5" />
                  Dairy Cart • {saleType.replace('_', ' ')}
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
            <div className="p-3 border-b border-slate-100 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <User className="h-3 w-3 text-fuchsia-600" />
                  Customer
                </label>
                <button onClick={() => setShowCustomerAdd(true)}
                  className="text-xs font-extrabold text-fuchsia-600 inline-flex items-center gap-1">
                  <UserPlus className="h-3 w-3" />
                  Add
                </button>
              </div>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500">
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}{c.phone ? ` • ${c.phone}` : ''}{c.balance > 0 ? ` • Udhaar: ${formatPKR(c.balance)}` : ''}</option>))}
              </select>
            </div>

            <div className="p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <Milk className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">Empty cart</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    {saleType === 'SUBSCRIBER' || saleType === 'ROUTE_DELIVERY' ? 'Click a subscriber to auto-load' : 'Click products'}
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.cartLineId} className="rounded-xl border-2 border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm text-slate-900 truncate">{item.name}</div>
                        {item.note && (
                          <div className="mt-1 text-[10px] font-mono text-fuchsia-700 bg-fuchsia-50 rounded px-1.5 py-0.5">
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
                        <button onClick={() => setCart((prev) => prev.map((c) => c.cartLineId === item.cartLineId ? { ...c, quantity: Math.max(0.1, c.quantity - 0.5) } : c))}
                          className="h-8 w-8 hover:bg-slate-200 font-extrabold">−</button>
                        <span className="h-8 w-12 flex items-center justify-center text-xs font-extrabold tabular-nums">{item.quantity.toFixed(1)}</span>
                        <button onClick={() => setCart((prev) => prev.map((c) => c.cartLineId === item.cartLineId ? { ...c, quantity: c.quantity + 0.5 } : c))}
                          className="h-8 w-8 bg-fuchsia-600 text-white hover:bg-fuchsia-700 font-extrabold">+</button>
                      </div>
                      <div className="font-extrabold text-emerald-700 tabular-nums">
                        {formatPKR((item.priceOverride ?? item.basePrice) * item.quantity)}
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
                    className={`py-2 rounded-lg text-[10px] font-extrabold transition ${
                      saleMode === m ? 'bg-fuchsia-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'
                    }`}>
                    {m === 'FULL_PAYMENT' ? 'Full Pay' : m === 'PARTIAL_CREDIT' ? 'Partial' : 'Khata'}
                  </button>
                ))}
              </div>

              {saleMode === 'PARTIAL_CREDIT' && (
                <input type="number" placeholder="Paid amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                  className="h-10 w-full rounded-lg border-2 border-amber-300 bg-amber-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
              )}

              <div className="rounded-xl bg-gradient-to-br from-slate-950 to-fuchsia-900 text-white p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
                {Number(globalDiscount) > 0 && (
                  <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(Number(globalDiscount))}</span></div>
                )}
                <div className="pt-1 mt-1 border-t border-white/20 flex justify-between items-center">
                  <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                  <FbrModeIndicator saleTotal={total} className="mb-2" />
                  <span className="text-2xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
                </div>
                {credit > 0 && (
                  <div className="flex justify-between text-amber-300 pt-1 border-t border-white/20 mt-1">
                    <span className="font-extrabold">Khata</span>
                    <span className="font-extrabold tabular-nums">{formatPKR(credit)}</span>
                  </div>
                )}
              </div>

              <Button size="lg" className="w-full bg-gradient-to-r from-fuchsia-600 to-pink-700"
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
