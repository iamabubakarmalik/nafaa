import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Package, X, Plus, Minus, Trash2,
  Camera, ScanLine, User, UserPlus, CheckCircle2, Store,
  ChevronDown, Eye, EyeOff, ArrowRight, Printer, Sofa,
  Pause, Play, Percent, Wifi, WifiOff, Star, Hammer, Leaf,
  Truck, ClipboardList,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { offlineProductsApi as productsApi } from '@core/lib/offline/offlineProducts';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { offlineSalesApi } from '@core/lib/offline/offlineSales';
import type { Product } from '@modules/inventory/products/api/products.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { RetailQuickCash } from '@industries/retail/components/pos';
import { furnitureProductsApi } from '../api/products.api';

const HIDE_PRICES_KEY = 'nafaa.furniture-pos.hide-prices';

interface CartLine {
  id: string;
  productId: string;
  name: string;
  image?: string;
  category?: string;
  material?: string;
  unitPrice: number;
  quantity: number;
  baseStock: number;
  lineTotal: number;
  requiresAssembly?: boolean;
  requiresLargeVehicle?: boolean;
  note?: string;
}

interface HeldCart { id: string; lines: CartLine[]; customerId: string; total: number; heldAt: number; }

const lineId = () => `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const heldId = () => `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function FurniturePosPage() {
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const tenant = useAuthStore((s) => s.tenant);

  const [hidePrices, setHidePrices] = useState(() => localStorage.getItem(HIDE_PRICES_KEY) === 'true');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [assemblyCharge, setAssemblyCharge] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [lastSale, setLastSale] = useState<{ id: string; number: string; change: number; total: number } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem(HIDE_PRICES_KEY, String(hidePrices)); }, [hidePrices]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 120);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); setScannerOpen(true); }
      if (e.key === 'F9') { e.preventDefault(); if (cart.length > 0) setShowCheckout(true); }
      if (e.key === 'Escape') {
        if (scannerOpen) setScannerOpen(false);
        if (showCheckout) setShowCheckout(false);
        if (showMobileCart) setShowMobileCart(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart.length, scannerOpen, showCheckout, showMobileCart]);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products-for-furniture-pos'],
    queryFn: () => productsApi.list({ page: 1, limit: 2000 }),
    staleTime: 30_000,
  });
  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'], queryFn: () => customersApi.list({ page: 1, limit: 500 }), staleTime: 60_000,
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ['furniture-profiles-all'], queryFn: () => furnitureProductsApi.list(), staleTime: 60_000,
  });

  const products: Product[] = productsData?.items ?? [];
  const customers = customersData?.items ?? [];
  const selectedCustomer = customers.find((c) => c.id === customerId);
  const profileByProduct = useMemo(() => {
    const m = new Map<string, any>();
    (profiles as any[]).forEach((p) => m.set(p.productId, p));
    return m;
  }, [profiles]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.isActive !== false);
    if (categoryFilter) list = list.filter((p) => profileByProduct.get(p.id)?.categoryType === categoryFilter);
    const q = debouncedSearch.toLowerCase().trim();
    if (q) list = list.filter((p) => {
      const pr = profileByProduct.get(p.id);
      return p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) || (pr?.brand || '').toLowerCase().includes(q);
    });
    return list.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      const aOut = a.stock <= 0, bOut = b.stock <= 0;
      if (aOut !== bOut) return aOut ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [products, debouncedSearch, categoryFilter, profileByProduct]);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.lineTotal, 0), [cart]);
  const discountAmount = useMemo(() => (subtotal * discountPct) / 100, [subtotal, discountPct]);
  const total = useMemo(() => subtotal - discountAmount + deliveryCharge + assemblyCharge, [subtotal, discountAmount, deliveryCharge, assemblyCharge]);
  const itemCount = cart.length;
  const totalQty = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);

  const anyRequiresAssembly = cart.some((l) => l.requiresAssembly);
  const anyRequiresLargeVehicle = cart.some((l) => l.requiresLargeVehicle);

  const openProduct = useCallback((product: Product) => {
    if (product.stock <= 0) { toast.error(`${product.name} — out of stock`); return; }
    const profile = profileByProduct.get(product.id);
    const existing = cart.find((l) => l.productId === product.id);
    if (existing) {
      const newQty = existing.quantity + 1;
      if (newQty > product.stock) { toast.error(`Stock only ${product.stock}`); return; }
      setCart((prev) => prev.map((l) => l.id === existing.id ? { ...l, quantity: newQty, lineTotal: newQty * l.unitPrice } : l));
    } else {
      setCart((prev) => [...prev, {
        id: lineId(), productId: product.id, name: product.name,
        image: product.images?.[0]?.url,
        category: profile?.categoryType, material: profile?.primaryMaterial,
        unitPrice: product.price, quantity: 1, baseStock: product.stock,
        lineTotal: product.price,
        requiresAssembly: profile?.requiresAssembly,
        requiresLargeVehicle: profile?.requiresLargeVehicle,
      }]);
    }
    toast.success(`${product.name} added`, { duration: 900 });
  }, [cart, profileByProduct]);

  const changeQty = (id: string, delta: number) => {
    setCart((prev) => prev.flatMap((l) => {
      if (l.id !== id) return [l];
      const nextQty = l.quantity + delta;
      if (nextQty <= 0) return [];
      if (nextQty > l.baseStock) { toast.error(`Stock only ${l.baseStock}`); return [l]; }
      return [{ ...l, quantity: nextQty, lineTotal: nextQty * l.unitPrice }];
    }));
  };

  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.id !== id));
  const clearCart = () => { setCart([]); setCustomerId(''); setDiscountPct(0); setDeliveryCharge(0); setAssemblyCharge(0); };

  const handleBarcode = async (code: string) => {
    setScannerOpen(false);
    if (!code.trim()) return;
    try {
      const product = await productsApi.byBarcode(code.trim());
      openProduct(product);
    } catch { toast.error(`Barcode "${code}" not found`); }
  };

  const holdCart = () => {
    if (cart.length === 0) return;
    setHeldCarts((prev) => [...prev, { id: heldId(), lines: cart, customerId, total, heldAt: Date.now() }]);
    clearCart();
    toast.success('Cart held');
  };

  const resumeCart = (held: HeldCart) => {
    setCart(held.lines); setCustomerId(held.customerId);
    setHeldCarts((prev) => prev.filter((h) => h.id !== held.id));
    setShowHeldCarts(false);
    toast.success('Cart resumed');
  };

  const addCustomerMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: (c) => {
      toast.success(`${c.name} added`);
      setCustomerId(c.id); setShowCustomerAdd(false);
      setNewCustomer({ name: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (data: { paymentMethod: PaymentMethod; paidAmount: number }) => {
      if (!currentShopId) throw new Error('Select shop first');
      return offlineSalesApi.create({
        shopId: currentShopId, customerId: customerId || undefined,
        paymentMethod: data.paymentMethod, paidAmount: data.paidAmount,
        discount: discountAmount + deliveryCharge + assemblyCharge > 0 ? discountAmount : 0,
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, priceOverride: l.unitPrice })),
      });
    },
    onSuccess: (sale, vars) => {
      const change = Math.max(vars.paidAmount - total, 0);
      setLastSale({ id: sale.id, number: sale.saleNumber, change, total });
      setShowCheckout(false); setShowMobileCart(false); clearCart();
      queryClient.invalidateQueries({ queryKey: ['products-for-furniture-pos'] });
      window.open(`/sales/${sale.id}/receipt?auto=1`, '_blank');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Sale failed'),
  });

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScannerOpen(false)} />}

      {showCheckout && (
        <RetailQuickCash
          total={total} itemCount={itemCount} loading={checkoutMutation.isPending}
          customerName={selectedCustomer?.name} customerBalance={Number(selectedCustomer?.balance || 0)}
          hasCustomer={!!customerId}
          onConfirm={({ paymentMethod, paidAmount }) => checkoutMutation.mutate({ paymentMethod, paidAmount })}
          onClose={() => setShowCheckout(false)}
        />
      )}

      {lastSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLastSale(null)}>
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-8 bg-gradient-to-br from-emerald-500 to-green-600 text-white text-center">
              <div className="h-20 w-20 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h3 className="text-3xl font-extrabold">Sale Complete! 🪑</h3>
              <p className="text-sm font-bold text-white/90 mt-1 font-mono">{lastSale.number}</p>
            </div>
            {lastSale.change > 0 && (
              <div className="px-6 py-5 bg-amber-50 border-b-4 border-amber-200 text-center">
                <div className="text-xs uppercase font-extrabold text-amber-800">Give change</div>
                <div className="text-5xl font-extrabold text-amber-700 tabular-nums mt-1">{formatPKR(lastSale.change)}</div>
              </div>
            )}
            <div className="p-4 grid grid-cols-2 gap-2">
              <button onClick={() => window.open(`/sales/${lastSale.id}/receipt`, '_blank')}
                className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 font-extrabold text-slate-700 inline-flex items-center justify-center gap-2">
                <Printer className="h-5 w-5" /> Receipt
              </button>
              <button onClick={() => setLastSale(null)}
                className="h-14 rounded-2xl bg-gradient-to-r from-amber-700 to-orange-800 font-extrabold text-white text-lg shadow-lg inline-flex items-center justify-center gap-2">
                New Sale <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-amber-700 to-orange-800 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-xl">New Customer</h3>
              <button onClick={() => setShowCustomerAdd(false)} className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <input autoFocus value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Customer name"
                className="h-16 w-full rounded-2xl border-4 border-slate-200 px-4 text-xl font-bold focus:outline-none focus:border-amber-500" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="03XX XXXXXXX"
                className="h-16 w-full rounded-2xl border-4 border-slate-200 px-4 text-xl font-bold focus:outline-none focus:border-amber-500" />
              <button onClick={() => {
                if (!newCustomer.name.trim()) return toast.error('Name required');
                addCustomerMutation.mutate({ name: newCustomer.name.trim(), phone: newCustomer.phone.trim() || undefined });
              }} disabled={addCustomerMutation.isPending}
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-amber-700 to-orange-800 font-extrabold text-white text-xl shadow-lg">
                Add Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {showHeldCarts && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-xl">Held Carts</h3>
              <button onClick={() => setShowHeldCarts(false)} className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {heldCarts.length === 0 ? (
                <div className="text-center py-12"><Pause className="h-12 w-12 text-slate-300 mx-auto mb-2" /><p className="font-extrabold text-slate-700">No held carts</p></div>
              ) : heldCarts.map((h) => (
                <div key={h.id} className="rounded-2xl border-2 border-slate-200 p-3 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><ShoppingCart className="h-6 w-6" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm">{h.lines.length} items • {formatPKR(h.total)}</div>
                    <div className="text-xs text-slate-500 font-bold">{new Date(h.heldAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <button onClick={() => resumeCart(h)} className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
                    <Play className="h-3.5 w-3.5" /> Resume
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="min-h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-7rem)] flex flex-col lg:grid lg:grid-cols-[1fr_420px] gap-2 lg:gap-3">

        <section className="lg:flex-1 rounded-2xl lg:rounded-3xl bg-white border-2 border-slate-200 shadow-sm lg:overflow-hidden flex flex-col lg:min-h-0">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-amber-900 to-orange-800 text-white">
            <div className="relative px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-2 ring-white/20 shrink-0">
                  <Sofa className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-extrabold leading-none">🪑 Furniture POS</h2>
                    {isOnline ? <Wifi className="h-3 w-3 text-emerald-200" /> : <WifiOff className="h-3 w-3 text-amber-200" />}
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/80 font-semibold mt-0.5 flex items-center gap-1 truncate">
                    <Store className="h-3 w-3 shrink-0" /><span className="truncate">{tenant?.name || 'Furniture Showroom'}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Link to="/furniture/custom-orders/new" className="h-10 sm:h-11 px-2.5 rounded-2xl bg-violet-500/30 hover:bg-violet-500/50 text-white text-xs font-extrabold inline-flex items-center gap-1 border-2 border-violet-300/40">
                  <ClipboardList className="h-4 w-4" /> Custom
                </Link>
                {heldCarts.length > 0 && (
                  <button onClick={() => setShowHeldCarts(true)}
                    className="h-10 sm:h-11 px-2.5 rounded-2xl bg-amber-500/30 hover:bg-amber-500/50 text-white text-xs font-extrabold inline-flex items-center gap-1 border-2 border-amber-300/40">
                    <Pause className="h-4 w-4" /> {heldCarts.length}
                  </button>
                )}
                <button onClick={() => setHidePrices((v) => !v)}
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center border-2 border-white/20">
                  {hidePrices ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                <button onClick={() => setShowMobileCart(true)}
                  className="lg:hidden relative h-10 w-10 rounded-2xl bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="shrink-0 px-3 sm:px-4 py-2.5 bg-slate-50 border-b-2 border-slate-100 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
                <input className="h-14 sm:h-16 w-full rounded-2xl border-4 border-slate-200 bg-white pl-11 sm:pl-14 pr-10 text-lg sm:text-xl font-bold focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-200"
                  placeholder="Sofa, bed, wardrobe..." value={search} onChange={(e) => setSearch(e.target.value)} />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center">
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                )}
              </div>
              <button onClick={() => setScannerOpen(true)}
                className="h-14 sm:h-16 w-16 sm:w-20 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center gap-0.5 shadow-lg shrink-0">
                <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-[9px] font-extrabold uppercase">Scan</span>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (barcodeInput.trim()) { handleBarcode(barcodeInput); setBarcodeInput(''); } }} className="relative">
              <ScanLine className="h-4 w-4 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2" />
              <input ref={barcodeRef} value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Barcode..."
                className="h-10 sm:h-12 w-full rounded-2xl border-2 border-amber-300 bg-amber-50 pl-10 pr-3 text-sm font-mono font-extrabold focus:outline-none focus:border-amber-600" />
            </form>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => setCategoryFilter('')}
                className={`shrink-0 h-9 px-3 rounded-xl text-xs font-extrabold border-2 ${!categoryFilter ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-slate-700 border-slate-200'}`}>
                All
              </button>
              {[
                { v: 'SOFA_SET', l: 'Sofas', e: '🛋️' },
                { v: 'BED_KING', l: 'Beds', e: '🛏️' },
                { v: 'WARDROBE', l: 'Wardrobes', e: '🚪' },
                { v: 'DINING_SET', l: 'Dining', e: '🍽️' },
                { v: 'OFFICE_CHAIR', l: 'Office', e: '💺' },
                { v: 'TV_CONSOLE', l: 'TV Unit', e: '📺' },
              ].map((c) => (
                <button key={c.v} onClick={() => setCategoryFilter(categoryFilter === c.v ? '' : c.v)}
                  className={`shrink-0 h-9 px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 border-2 ${categoryFilter === c.v ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-slate-700 border-slate-200'}`}>
                  <span>{c.e}</span>{c.l}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:flex-1 lg:overflow-y-auto p-2 sm:p-3 bg-slate-50/50 lg:min-h-0">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-200 animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="h-20 w-20 rounded-3xl bg-slate-200 flex items-center justify-center"><Package className="h-10 w-10 text-slate-400" /></div>
                <h3 className="mt-4 font-extrabold text-slate-900 text-xl">No products found</h3>
                <p className="mt-2 text-sm text-slate-500 text-center font-semibold">{search ? `Search: "${search}"` : 'Add products first'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                {filtered.slice(0, 100).map((p) => {
                  const profile = profileByProduct.get(p.id);
                  const inCartQty = cart.filter((l) => l.productId === p.id).reduce((s, l) => s + l.quantity, 0);
                  const out = p.stock <= 0;
                  return (
                    <button key={p.id} onClick={() => openProduct(p)} disabled={out}
                      className={`group relative text-left rounded-2xl border-4 overflow-hidden transition-all active:scale-95 ${
                        out ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
                          : inCartQty > 0 ? 'border-emerald-500 bg-emerald-50 shadow-xl ring-4 ring-emerald-200'
                            : 'border-slate-200 bg-white hover:border-amber-400 hover:shadow-xl hover:-translate-y-1'}`}>
                      {inCartQty > 0 && (
                        <div className="absolute -top-2 -right-2 min-w-[32px] h-8 px-2 rounded-full bg-emerald-600 text-white text-sm font-extrabold flex items-center justify-center shadow-xl ring-4 ring-white z-10 tabular-nums">
                          {inCartQty}
                        </div>
                      )}
                      <div className="aspect-square bg-slate-100 overflow-hidden relative">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                            <Sofa className="h-12 w-12 text-amber-300" />
                          </div>
                        )}
                        {out && <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center"><span className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs font-extrabold">OUT</span></div>}
                        {profile?.isEcoFriendly && (
                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-green-600 text-white text-[9px] font-extrabold inline-flex items-center gap-0.5">
                            <Leaf className="h-2 w-2" /> ECO
                          </div>
                        )}
                        {p.isFeatured && !out && (
                          <div className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                            <Star className="h-3.5 w-3.5 fill-white text-white" />
                          </div>
                        )}
                        {profile?.isCustomizable && (
                          <div className="absolute bottom-1.5 left-1.5 h-6 px-1.5 rounded-md bg-violet-600 flex items-center gap-1 text-white text-[9px] font-extrabold shadow">
                            <Hammer className="h-2.5 w-2.5" /> CUSTOM
                          </div>
                        )}
                      </div>
                      <div className="p-2 sm:p-3">
                        <div className="font-extrabold text-slate-900 text-sm line-clamp-2 leading-tight min-h-[2.25rem]">{p.name}</div>
                        {profile?.categoryType && <div className="text-[9px] font-extrabold uppercase text-amber-700 mt-0.5">{profile.categoryType.replace(/_/g, ' ')}</div>}
                        <div className="mt-1.5 flex items-end justify-between gap-1">
                          <div className="text-lg sm:text-xl font-extrabold text-emerald-700 leading-none tabular-nums">
                            {hidePrices ? '•••' : formatPKR(p.price)}
                          </div>
                          <div className="text-xs font-extrabold tabular-nums text-slate-600 shrink-0">{p.stock}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <CartPanel
          isMobile={showMobileCart} onCloseMobile={() => setShowMobileCart(false)}
          cart={cart} itemCount={itemCount} totalQty={totalQty}
          subtotal={subtotal} total={total}
          discountPct={discountPct} setDiscountPct={setDiscountPct}
          deliveryCharge={deliveryCharge} setDeliveryCharge={setDeliveryCharge}
          assemblyCharge={assemblyCharge} setAssemblyCharge={setAssemblyCharge}
          hidePrices={hidePrices} customers={customers} customerId={customerId} setCustomerId={setCustomerId}
          selectedCustomer={selectedCustomer} onAddCustomer={() => setShowCustomerAdd(true)}
          onHold={holdCart} onClear={() => { if (confirm('Clear cart?')) clearCart(); }}
          onChangeQty={changeQty} onRemove={removeLine}
          onCheckout={() => setShowCheckout(true)} canCheckout={!!currentShopId}
          anyRequiresAssembly={anyRequiresAssembly} anyRequiresLargeVehicle={anyRequiresLargeVehicle}
        />
      </div>

      {cart.length > 0 && !showMobileCart && (
        <div className="lg:hidden fixed bottom-4 inset-x-4 z-30">
          <button onClick={() => setShowMobileCart(true)}
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-2xl flex items-center justify-between px-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 min-w-[22px] h-5 px-1 rounded-full bg-white text-emerald-700 text-[11px] font-extrabold flex items-center justify-center">{itemCount}</span>
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-extrabold text-white/80">Cart</div>
                <div className="text-lg font-extrabold tabular-nums">{hidePrices ? '••••' : formatPKR(total)}</div>
              </div>
            </div>
            <ArrowRight className="h-6 w-6" />
          </button>
        </div>
      )}
    </>
  );
}

function CartPanel({ isMobile, onCloseMobile, cart, itemCount, totalQty, subtotal, total,
  discountPct, setDiscountPct, deliveryCharge, setDeliveryCharge, assemblyCharge, setAssemblyCharge,
  hidePrices, customers, customerId, setCustomerId, selectedCustomer, onAddCustomer, onHold, onClear,
  onChangeQty, onRemove, onCheckout, canCheckout, anyRequiresAssembly, anyRequiresLargeVehicle }: any) {
  const containerClass = isMobile
    ? 'fixed inset-0 z-40 bg-white flex flex-col lg:hidden'
    : 'hidden lg:flex rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden flex-col min-h-0';

  return (
    <aside className={containerClass}>
      <div className="shrink-0 bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-extrabold text-white/70">Cart • {itemCount} lines • {totalQty} qty</div>
            <div className="text-3xl sm:text-4xl font-extrabold tabular-nums leading-none mt-1">{hidePrices ? '••••' : formatPKR(total)}</div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {cart.length > 0 && (
              <>
                <button onClick={onHold} className="h-10 sm:h-12 px-2.5 rounded-2xl bg-white/15 hover:bg-amber-500/50 text-white text-xs font-extrabold border-2 border-white/20 inline-flex items-center gap-1">
                  <Pause className="h-3.5 w-3.5" /> Hold
                </button>
                <button onClick={onClear} className="h-10 sm:h-12 px-2.5 rounded-2xl bg-white/15 hover:bg-rose-500/50 text-white text-xs font-extrabold border-2 border-white/20">Clear</button>
              </>
            )}
            {isMobile && (
              <button onClick={onCloseMobile} className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-white/15 flex items-center justify-center border-2 border-white/20">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 px-3 py-2.5 border-b-2 border-slate-100 bg-slate-50">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <User className="h-4 w-4 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
              className="h-12 sm:h-14 w-full rounded-2xl border-4 border-slate-200 bg-white pl-10 pr-9 text-sm font-bold focus:outline-none focus:border-amber-500 appearance-none">
              <option value="">Walk-in Customer</option>
              {customers.map((c: any) => (<option key={c.id} value={c.id}>{c.name}{c.balance > 0 ? ` • Bal ${formatPKR(c.balance)}` : ''}</option>))}
            </select>
            <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button onClick={onAddCustomer} className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-amber-700 hover:bg-amber-800 text-white flex items-center justify-center shadow-md shrink-0">
            <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2 bg-slate-50/50 min-h-0">
        {cart.length === 0 ? (
          <div className="rounded-3xl bg-white border-4 border-dashed border-slate-200 p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-slate-100 mx-auto flex items-center justify-center"><ShoppingCart className="h-8 w-8 text-slate-400" /></div>
            <p className="mt-4 font-extrabold text-slate-700 text-lg">Cart is empty</p>
            <p className="text-xs text-slate-500 font-semibold mt-1">Tap a product to add</p>
          </div>
        ) : (
          cart.map((l: CartLine) => (
            <div key={l.id} className="rounded-2xl bg-white border-4 border-slate-200 p-2.5 sm:p-3 shadow-sm">
              <div className="flex items-start gap-2.5 sm:gap-3">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-slate-100">
                  {l.image ? <img src={l.image} alt="" className="w-full h-full object-cover" /> : <Sofa className="h-6 w-6 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight line-clamp-2">{l.name}</div>
                  {l.category && <div className="text-[10px] font-bold text-amber-700 mt-0.5">{l.category.replace(/_/g, ' ')}</div>}
                  <div className="text-xs sm:text-sm font-bold text-blue-700 mt-0.5">{formatPKR(l.unitPrice)}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {l.requiresAssembly && <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold">🔨 Assembly</span>}
                    {l.requiresLargeVehicle && <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[9px] font-extrabold">🚚 Large Vehicle</span>}
                  </div>
                </div>
                <button onClick={() => onRemove(l.id)}
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              <div className="mt-2.5 sm:mt-3 flex items-center justify-between gap-2">
                <div className="inline-flex items-center bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200">
                  <button onClick={() => onChangeQty(l.id, -1)} className="h-12 sm:h-14 w-12 sm:w-14 hover:bg-slate-200 flex items-center justify-center">
                    <Minus className="h-5 w-5 sm:h-6 sm:w-6 text-slate-700" />
                  </button>
                  <div className="h-12 sm:h-14 min-w-[70px] w-[70px] sm:min-w-[80px] sm:w-[80px] text-center flex items-center justify-center bg-white text-lg sm:text-xl font-extrabold tabular-nums">
                    {l.quantity}
                  </div>
                  <button onClick={() => onChangeQty(l.id, 1)} className="h-12 sm:h-14 w-12 sm:w-14 bg-amber-700 hover:bg-amber-800 text-white flex items-center justify-center">
                    <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 tabular-nums">
                  {hidePrices ? '•••' : formatPKR(l.lineTotal)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {cart.length > 0 && (
        <div className="shrink-0 p-2.5 sm:p-3 border-t-4 border-slate-100 bg-white space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] font-extrabold text-slate-600 shrink-0">
              <Percent className="h-3.5 w-3.5 text-amber-600" /><span className="hidden sm:inline">Discount:</span>
            </div>
            <div className="flex gap-1 flex-1">
              {[0, 5, 10, 15, 20].map((d) => (
                <button key={d} onClick={() => setDiscountPct(d)}
                  className={`flex-1 h-9 sm:h-10 rounded-xl text-[11px] font-extrabold ${discountPct === d ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                  {d === 0 ? 'None' : `${d}%`}
                </button>
              ))}
            </div>
          </div>

          {(anyRequiresLargeVehicle || anyRequiresAssembly) && (
            <div className="grid grid-cols-2 gap-2">
              {anyRequiresLargeVehicle && (
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-orange-700 mb-1 items-center gap-1">
                    <Truck className="h-3 w-3" /> Delivery
                  </label>
                  <input type="number" value={deliveryCharge} onChange={(e) => setDeliveryCharge(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="h-10 w-full rounded-lg border-2 border-orange-200 bg-orange-50 px-2 text-sm font-extrabold tabular-nums focus:outline-none focus:border-orange-500" />
                </div>
              )}
              {anyRequiresAssembly && (
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-violet-700 mb-1 items-center gap-1">
                    <Hammer className="h-3 w-3" /> Assembly
                  </label>
                  <input type="number" value={assemblyCharge} onChange={(e) => setAssemblyCharge(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="h-10 w-full rounded-lg border-2 border-violet-200 bg-violet-50 px-2 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
                </div>
              )}
            </div>
          )}

          <button onClick={onCheckout} disabled={!canCheckout}
            className="w-full h-[76px] sm:h-[88px] rounded-3xl font-extrabold text-white shadow-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between px-5 sm:px-6">
            <div className="text-left">
              <div className="text-[10px] sm:text-xs uppercase font-extrabold text-white/80">Checkout <span className="hidden sm:inline">(F9)</span></div>
              <div className="text-2xl sm:text-3xl tabular-nums leading-none mt-0.5">{formatPKR(total)}</div>
            </div>
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <ArrowRight className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
          </button>
        </div>
      )}
    </aside>
  );
}
