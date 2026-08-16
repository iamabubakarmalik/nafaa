import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Package, X, Plus, Minus, Trash2,
  Camera, ScanLine, User, UserPlus, CheckCircle2, Store,
  ChevronDown, Eye, EyeOff, ArrowRight, Printer,
  Star, Pause, Play, Percent, Baby, Gift, Cake,
  Wifi, WifiOff, Sparkles, Heart, GraduationCap, AlertTriangle,
} from 'lucide-react';
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
import { toyProductsApi } from '../api/products.api';

const HIDE_PRICES_KEY = 'nafaa.toy-pos.hide-prices';
const VIEW_MODE_KEY = 'nafaa.toy-pos.view-mode';

const AGE_GROUPS = [
  { v: 'NEWBORN_0_6M', l: '0-6M', e: '👶' },
  { v: 'INFANT_6_12M', l: '6-12M', e: '🍼' },
  { v: 'TODDLER_1_2Y', l: '1-2Y', e: '🧸' },
  { v: 'TODDLER_2_3Y', l: '2-3Y', e: '🎈' },
  { v: 'PRESCHOOL_3_5Y', l: '3-5Y', e: '🎨' },
  { v: 'KIDS_5_8Y', l: '5-8Y', e: '🎒' },
  { v: 'KIDS_8_12Y', l: '8-12Y', e: '⚽' },
  { v: 'TWEEN_12_14Y', l: '12-14Y', e: '📱' },
  { v: 'TEEN_14_PLUS', l: '14+', e: '🎮' },
];

interface CartLine {
  id: string;
  productId: string;
  name: string;
  image?: string;
  brand?: string;
  ageGroup?: string;
  unitPrice: number;
  quantity: number;
  baseStock: number;
  lineTotal: number;
  giftWrap: boolean;
  giftMessage: string;
  chokingHazard?: boolean;
}

const lineId = () => `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function ToystorePosPage() {
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const tenant = useAuthStore((s) => s.tenant);

  const [hidePrices, setHidePrices] = useState(() => localStorage.getItem(HIDE_PRICES_KEY) === 'true');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [ageFilter, setAgeFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [lastSale, setLastSale] = useState<{ id: string; number: string; change: number; total: number } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [visibleCount, setVisibleCount] = useState(60);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem(HIDE_PRICES_KEY, String(hidePrices)); }, [hidePrices]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 120);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setVisibleCount(60); }, [debouncedSearch, ageFilter, genderFilter]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products-for-toy-pos'],
    queryFn: () => productsApi.list({ page: 1, limit: 2000 }),
    staleTime: 30_000,
  });
  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
    staleTime: 60_000,
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ['toy-profiles-pos'],
    queryFn: () => toyProductsApi.list(),
    staleTime: 60_000,
  });

  const products: Product[] = productsData?.items ?? [];
  const customers = customersData?.items ?? [];
  const selectedCustomer = customers.find((c) => c.id === customerId);
  const profileByProduct = useMemo(() => {
    const map = new Map<string, any>();
    (profiles as any[]).forEach((p) => map.set(p.productId, p));
    return map;
  }, [profiles]);

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => p.isActive !== false);
    if (ageFilter) {
      list = list.filter((p) => {
        const pr = profileByProduct.get(p.id);
        return pr?.ageGroup === ageFilter || (pr?.ageGroups ?? []).includes(ageFilter) || pr?.ageGroup === 'ALL_AGES';
      });
    }
    if (genderFilter) {
      list = list.filter((p) => {
        const pr = profileByProduct.get(p.id);
        return pr?.genderTarget === genderFilter || pr?.genderTarget === 'UNISEX';
      });
    }
    const q = debouncedSearch.toLowerCase().trim();
    if (q) {
      list = list.filter((p) => {
        const pr = profileByProduct.get(p.id);
        return p.name.toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.barcode || '').toLowerCase().includes(q) ||
          (pr?.brand || '').toLowerCase().includes(q) ||
          (pr?.characterFranchise || '').toLowerCase().includes(q);
      });
    }
    return list.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      const aOut = a.stock <= 0, bOut = b.stock <= 0;
      if (aOut !== bOut) return aOut ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [products, debouncedSearch, ageFilter, genderFilter, profileByProduct]);

  const visibleProducts = useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);
  const hasMore = filteredProducts.length > visibleCount;

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.lineTotal, 0), [cart]);
  const giftWrapCharge = useMemo(() => cart.filter((l) => l.giftWrap).length * 50, [cart]); // Rs 50 per gift wrap
  const discountAmount = useMemo(() => (subtotal * discountPct) / 100, [subtotal, discountPct]);
  const total = useMemo(() => subtotal + giftWrapCharge - discountAmount, [subtotal, giftWrapCharge, discountAmount]);
  const itemCount = cart.length;
  const totalQty = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);

  const openProduct = useCallback((product: Product) => {
    if (product.stock <= 0) { toast.error(`${product.name} — out of stock`); return; }
    const profile = profileByProduct.get(product.id);
    const existing = cart.find((l) => l.productId === product.id);
    if (existing) {
      const newQty = existing.quantity + 1;
      if (newQty > product.stock) { toast.error(`Stock only ${product.stock}`); return; }
      setCart((prev) => prev.map((l) => l.id === existing.id
        ? { ...l, quantity: newQty, lineTotal: newQty * l.unitPrice } : l));
      return;
    }
    setCart((prev) => [...prev, {
      id: lineId(),
      productId: product.id,
      name: product.name,
      image: product.images?.[0]?.url,
      brand: profile?.brand,
      ageGroup: profile?.ageGroup,
      unitPrice: product.price,
      quantity: 1,
      baseStock: product.stock,
      lineTotal: product.price,
      giftWrap: false,
      giftMessage: '',
      chokingHazard: profile?.chokingHazard,
    }]);
    toast.success(`${product.name} added`, { duration: 900 });
  }, [profileByProduct, cart]);

  const changeQty = (id: string, delta: number) => {
    setCart((prev) => prev.flatMap((l) => {
      if (l.id !== id) return [l];
      const nextQty = l.quantity + delta;
      if (nextQty <= 0) return [];
      if (nextQty > l.baseStock) { toast.error(`Stock only ${l.baseStock}`); return [l]; }
      return [{ ...l, quantity: nextQty, lineTotal: nextQty * l.unitPrice }];
    }));
  };

  const toggleGiftWrap = (id: string) => {
    setCart((prev) => prev.map((l) => l.id === id ? { ...l, giftWrap: !l.giftWrap } : l));
  };

  const updateGiftMessage = (id: string, msg: string) => {
    setCart((prev) => prev.map((l) => l.id === id ? { ...l, giftMessage: msg } : l));
  };

  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.id !== id));
  const clearCart = () => { setCart([]); setCustomerId(''); setDiscountPct(0); };

  const handleBarcode = async (code: string) => {
    setScannerOpen(false);
    const trimmed = code.trim();
    if (!trimmed) return;
    try {
      const product = await productsApi.byBarcode(trimmed);
      openProduct(product);
    } catch { toast.error(`Barcode "${trimmed}" not found`); }
  };

  const addCustomerMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: (c) => {
      toast.success(`${c.name} added`);
      setCustomerId(c.id);
      setShowCustomerAdd(false);
      setNewCustomer({ name: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (data: { paymentMethod: PaymentMethod; paidAmount: number }) => {
      if (!currentShopId) throw new Error('Select shop first');
      const items = cart.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        priceOverride: l.unitPrice,
        note: [
          l.giftWrap ? '🎁 Gift wrapped' : null,
          l.giftMessage ? `Message: "${l.giftMessage}"` : null,
        ].filter(Boolean).join(' • '),
      }));
      const sale = await offlineSalesApi.create({
        shopId: currentShopId,
        customerId: customerId || undefined,
        paymentMethod: data.paymentMethod,
        paidAmount: data.paidAmount,
        discount: discountAmount,
        items,
      });
      return sale;
    },
    onSuccess: (sale, vars) => {
      const change = Math.max(vars.paidAmount - total, 0);
      setLastSale({ id: sale.id, number: sale.saleNumber, change, total });
      setShowCheckout(false);
      setShowMobileCart(false);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['products-for-toy-pos'] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
    },
  });

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore) return;
    const t = e.currentTarget;
    if ((t.scrollTop + t.clientHeight) / t.scrollHeight > 0.85) {
      setVisibleCount((c) => Math.min(c + 60, filteredProducts.length));
    }
  }, [hasMore, filteredProducts.length]);

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScannerOpen(false)} />}

      {showCheckout && (
        <RetailQuickCash
          total={total}
          itemCount={itemCount}
          loading={checkoutMutation.isPending}
          customerName={selectedCustomer?.name}
          customerBalance={Number(selectedCustomer?.balance || 0)}
          hasCustomer={!!customerId}
          onConfirm={({ paymentMethod, paidAmount }) => checkoutMutation.mutate({ paymentMethod, paidAmount })}
          onClose={() => setShowCheckout(false)}
        />
      )}

      {lastSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLastSale(null)}>
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-8 bg-gradient-to-br from-pink-500 to-rose-600 text-white text-center">
              <div className="h-20 w-20 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h3 className="text-3xl font-extrabold">Sale Complete! 🎉</h3>
              <p className="text-sm font-bold text-white/90 mt-1 font-mono">{lastSale.number}</p>
            </div>
            {lastSale.change > 0 && (
              <div className="px-6 py-5 bg-amber-50 border-b-4 border-amber-200 text-center">
                <div className="text-xs uppercase font-extrabold text-amber-800 tracking-wider">Give change</div>
                <div className="text-5xl font-extrabold text-amber-700 tabular-nums mt-1">{formatPKR(lastSale.change)}</div>
              </div>
            )}
            <div className="p-4 grid grid-cols-2 gap-2">
              <button onClick={() => window.open(`/sales/${lastSale.id}/receipt`, '_blank')}
                className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 font-extrabold text-slate-700 inline-flex items-center justify-center gap-2">
                <Printer className="h-5 w-5" /> Receipt
              </button>
              <button onClick={() => setLastSale(null)}
                className="h-14 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-700 font-extrabold text-white text-lg shadow-lg inline-flex items-center justify-center gap-2">
                New Sale <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-pink-600 to-rose-700 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-xl">New Customer</h3>
              <button onClick={() => setShowCustomerAdd(false)} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input autoFocus value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Customer name"
                className="h-16 w-full rounded-2xl border-4 border-slate-200 px-4 text-xl font-bold focus:outline-none focus:border-pink-500" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="03XX XXXXXXX"
                className="h-16 w-full rounded-2xl border-4 border-slate-200 px-4 text-xl font-bold focus:outline-none focus:border-pink-500" />
              <button onClick={() => {
                if (!newCustomer.name.trim()) return toast.error('Name required');
                addCustomerMutation.mutate({ name: newCustomer.name.trim(), phone: newCustomer.phone.trim() || undefined });
              }} disabled={addCustomerMutation.isPending}
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-700 font-extrabold text-white text-xl shadow-lg disabled:opacity-50">
                Add Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="min-h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-7rem)] flex flex-col lg:grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px] gap-2 lg:gap-3">

        <section className="lg:flex-1 rounded-2xl lg:rounded-3xl bg-white border-2 border-slate-200 shadow-sm lg:overflow-hidden flex flex-col lg:min-h-0">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-pink-400/20 blur-2xl" />
            <div className="relative px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-2 ring-white/20 shrink-0">
                  <Baby className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-extrabold leading-none">🧸 Toy Store POS</h2>
                    {isOnline ? <Wifi className="h-4 w-4 text-emerald-300" /> : <WifiOff className="h-4 w-4 text-amber-300" />}
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/80 font-semibold mt-0.5 flex items-center gap-1 truncate">
                    <Store className="h-3 w-3 shrink-0" />
                    <span className="truncate">{tenant?.name || 'Toy Store'}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => setHidePrices((v) => !v)}
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center border-2 border-white/20 transition">
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
                <input
                  className="h-14 sm:h-16 w-full rounded-2xl border-4 border-slate-200 bg-white pl-11 sm:pl-14 pr-10 sm:pr-12 text-lg sm:text-xl font-bold focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-200"
                  placeholder="Toy / brand / franchise..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center">
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                )}
              </div>
              <button onClick={() => setScannerOpen(true)}
                className="h-14 sm:h-16 w-16 sm:w-20 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center gap-0.5 shadow-lg shrink-0">
                <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase">Scan</span>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (barcodeInput.trim()) { handleBarcode(barcodeInput); setBarcodeInput(''); } }} className="relative">
              <ScanLine className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input ref={barcodeRef} value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Barcode..."
                className="h-10 sm:h-12 w-full rounded-2xl border-2 border-pink-300 bg-pink-50 pl-10 sm:pl-11 pr-3 text-sm sm:text-base font-mono font-extrabold focus:outline-none focus:border-pink-600 focus:ring-2 focus:ring-pink-200" />
            </form>

            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              <FilterChip active={!ageFilter} onClick={() => setAgeFilter('')} label="All Ages" emoji="👨‍👩‍👧‍👦" />
              {AGE_GROUPS.map((a) => (
                <FilterChip key={a.v} active={ageFilter === a.v}
                  onClick={() => setAgeFilter(ageFilter === a.v ? '' : a.v)}
                  label={a.l} emoji={a.e} />
              ))}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              <FilterChip active={!genderFilter} onClick={() => setGenderFilter('')} label="All" emoji="⚧️" />
              <FilterChip active={genderFilter === 'BOYS'} onClick={() => setGenderFilter(genderFilter === 'BOYS' ? '' : 'BOYS')} label="Boys" emoji="👦" />
              <FilterChip active={genderFilter === 'GIRLS'} onClick={() => setGenderFilter(genderFilter === 'GIRLS' ? '' : 'GIRLS')} label="Girls" emoji="👧" />
              <FilterChip active={genderFilter === 'UNISEX'} onClick={() => setGenderFilter(genderFilter === 'UNISEX' ? '' : 'UNISEX')} label="Unisex" emoji="⚧️" />
            </div>
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="lg:flex-1 lg:overflow-y-auto p-2 sm:p-3 bg-slate-50/50 lg:min-h-0">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-200 animate-pulse" />)}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Package className="h-16 w-16 text-slate-300 mb-3" />
                <h3 className="font-extrabold text-slate-700 text-lg">No toys found</h3>
                <p className="text-sm text-slate-500 font-semibold mt-1">Try changing filters</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                  {visibleProducts.map((p) => {
                    const profile = profileByProduct.get(p.id);
                    return <ToyTile key={p.id} product={p} profile={profile} cart={cart} hidePrices={hidePrices} onClick={() => openProduct(p)} />;
                  })}
                </div>
                {hasMore && (
                  <button onClick={() => setVisibleCount((c) => c + 60)}
                    className="mt-3 w-full h-12 rounded-2xl bg-white border-4 border-slate-200 hover:border-pink-400 text-slate-700 text-sm font-extrabold inline-flex items-center justify-center gap-2">
                    <Package className="h-4 w-4" /> Load more ({filteredProducts.length - visibleCount})
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        <CartPanel
          isMobile={showMobileCart}
          onCloseMobile={() => setShowMobileCart(false)}
          cart={cart}
          itemCount={itemCount}
          totalQty={totalQty}
          subtotal={subtotal}
          giftWrapCharge={giftWrapCharge}
          total={total}
          discountPct={discountPct}
          setDiscountPct={setDiscountPct}
          hidePrices={hidePrices}
          customers={customers}
          customerId={customerId}
          setCustomerId={setCustomerId}
          selectedCustomer={selectedCustomer}
          onAddCustomer={() => setShowCustomerAdd(true)}
          onClear={() => { if (confirm('Clear cart?')) clearCart(); }}
          onChangeQty={changeQty}
          onToggleGiftWrap={toggleGiftWrap}
          onUpdateGiftMessage={updateGiftMessage}
          onRemove={removeLine}
          onCheckout={() => setShowCheckout(true)}
          canCheckout={!!currentShopId}
        />
      </div>

      {cart.length > 0 && !showMobileCart && (
        <div className="lg:hidden fixed bottom-4 inset-x-4 z-30">
          <button onClick={() => setShowMobileCart(true)}
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-700 text-white shadow-2xl active:scale-[0.98] flex items-center justify-between px-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 min-w-[22px] h-5 px-1 rounded-full bg-white text-pink-700 text-[11px] font-extrabold flex items-center justify-center">
                  {itemCount}
                </span>
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider">Cart</div>
                <div className="text-lg font-extrabold tabular-nums leading-none">{hidePrices ? '••••' : formatPKR(total)}</div>
              </div>
            </div>
            <ArrowRight className="h-6 w-6" />
          </button>
        </div>
      )}
    </>
  );
}

function FilterChip({ active, onClick, label, emoji }: any) {
  return (
    <button onClick={onClick}
      className={`shrink-0 h-9 sm:h-10 px-3 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 border-2 transition ${
        active ? 'bg-pink-600 text-white border-pink-600 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-pink-300'}`}>
      <span>{emoji}</span>{label}
    </button>
  );
}

function ToyTile({ product: p, profile, cart, hidePrices, onClick }: any) {
  const inCart = cart.filter((l: CartLine) => l.productId === p.id);
  const cartQty = inCart.reduce((s: number, l: CartLine) => s + l.quantity, 0);
  const out = p.stock <= 0;
  const low = !out && p.stock <= (p.lowStockAlert || 0);
  const img = p.images?.[0]?.url;

  return (
    <button onClick={onClick} disabled={out}
      className={`group relative text-left rounded-2xl border-4 overflow-hidden transition-all active:scale-95 ${
        out ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
          : cartQty > 0 ? 'border-emerald-500 bg-emerald-50 shadow-xl ring-4 ring-emerald-200'
            : 'border-slate-200 bg-white hover:border-pink-400 hover:shadow-xl hover:-translate-y-1'}`}>
      {cartQty > 0 && (
        <div className="absolute -top-2 -right-2 min-w-[32px] h-8 sm:min-w-[36px] sm:h-9 px-2 rounded-full bg-emerald-600 text-white text-sm sm:text-base font-extrabold flex items-center justify-center shadow-xl ring-4 ring-white z-10 tabular-nums">
          {cartQty}
        </div>
      )}
      <div className="aspect-square bg-slate-100 overflow-hidden relative">
        {img ? (
          <img src={img} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50">
            <Baby className="h-12 w-12 text-pink-300" />
          </div>
        )}
        {out && <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center"><span className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs sm:text-sm font-extrabold shadow-lg">OUT</span></div>}
        {low && !out && <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-extrabold shadow-lg animate-pulse">LOW</div>}
        {profile?.isEducational && !out && (
          <div className="absolute top-1.5 left-1.5 h-6 px-1.5 rounded-md bg-violet-600 flex items-center gap-1 text-white text-[9px] font-extrabold shadow-lg">
            <GraduationCap className="h-2.5 w-2.5" /> EDU
          </div>
        )}
        {profile?.isBirthdayGift && !out && (
          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-pink-600 text-white text-[9px] font-extrabold shadow-lg">🎂</div>
        )}
        {profile?.chokingHazard && !out && (
          <div className="absolute bottom-1.5 right-1.5 h-5 w-5 rounded-full bg-rose-500 flex items-center justify-center text-white text-[10px]">⚠</div>
        )}
      </div>
      <div className="p-2 sm:p-3">
        <div className="font-extrabold text-slate-900 text-sm sm:text-base line-clamp-2 leading-tight min-h-[2.25rem] sm:min-h-[2.5rem]">{p.name}</div>
        {profile?.ageGroup && (
          <div className="text-[9px] font-extrabold uppercase text-pink-700 mt-0.5">
            {AGE_GROUPS.find((a) => a.v === profile.ageGroup)?.l || profile.ageGroup}
          </div>
        )}
        <div className="mt-1.5 sm:mt-2 flex items-end justify-between gap-1">
          <div className="text-lg sm:text-2xl font-extrabold text-emerald-700 leading-none tabular-nums">{hidePrices ? '•••' : formatPKR(p.price)}</div>
          <div className={`text-xs sm:text-sm font-extrabold tabular-nums shrink-0 ${out ? 'text-rose-700' : low ? 'text-amber-700' : 'text-slate-600'}`}>
            {p.stock}
          </div>
        </div>
      </div>
    </button>
  );
}

function CartPanel({
  isMobile, onCloseMobile, cart, itemCount, totalQty, subtotal, giftWrapCharge, total,
  discountPct, setDiscountPct, hidePrices, customers, customerId,
  setCustomerId, selectedCustomer, onAddCustomer, onClear, onChangeQty,
  onToggleGiftWrap, onUpdateGiftMessage, onRemove, onCheckout, canCheckout,
}: any) {
  const containerClass = isMobile
    ? 'fixed inset-0 z-40 bg-white flex flex-col lg:hidden animate-in slide-in-from-bottom duration-200'
    : 'hidden lg:flex rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden flex-col min-h-0';

  const hazardLines = cart.filter((l: CartLine) => l.chokingHazard);

  return (
    <aside className={containerClass}>
      <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">
              Cart • {itemCount} lines • {totalQty} qty
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tabular-nums leading-none mt-1">
              {hidePrices ? '••••' : formatPKR(total)}
            </div>
            {giftWrapCharge > 0 && (
              <div className="text-xs font-extrabold text-pink-300 mt-1 inline-flex items-center gap-1">
                <Gift className="h-3 w-3" /> Gift wrap {formatPKR(giftWrapCharge)}
              </div>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
            {cart.length > 0 && (
              <button onClick={onClear}
                className="h-10 sm:h-12 px-2.5 rounded-2xl bg-white/15 hover:bg-rose-500/50 text-white text-xs sm:text-sm font-extrabold border-2 border-white/20">
                Clear
              </button>
            )}
            {isMobile && (
              <button onClick={onCloseMobile}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center border-2 border-white/20">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 px-3 py-2.5 border-b-2 border-slate-100 bg-slate-50">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
              className="h-12 sm:h-14 w-full rounded-2xl border-4 border-slate-200 bg-white pl-10 sm:pl-11 pr-9 text-sm sm:text-base font-bold focus:outline-none focus:border-pink-500 appearance-none">
              <option value="">Walk-in Customer</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button onClick={onAddCustomer}
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white flex items-center justify-center shadow-md shrink-0">
            <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
      </div>

      {hazardLines.length > 0 && (
        <div className="shrink-0 mx-3 mt-2 rounded-xl bg-rose-50 border-2 border-rose-300 p-2.5 text-xs font-extrabold text-rose-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{hazardLines.length} item(s) have choking hazard — inform customer</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2 bg-slate-50/50 min-h-0">
        {cart.length === 0 ? (
          <div className="rounded-3xl bg-white border-4 border-dashed border-slate-200 p-8 sm:p-10 text-center">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-slate-100 mx-auto flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
            </div>
            <p className="mt-4 font-extrabold text-slate-700 text-lg sm:text-xl">Cart is empty</p>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">Tap a toy to add</p>
          </div>
        ) : (
          cart.map((l: CartLine) => (
            <div key={l.id} className={`rounded-2xl bg-white border-4 p-2.5 sm:p-3 shadow-sm ${
              l.giftWrap ? 'border-pink-300' : l.chokingHazard ? 'border-rose-300' : 'border-slate-200'}`}>
              <div className="flex items-start gap-2.5 sm:gap-3">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-slate-100">
                  {l.image ? <img src={l.image} alt="" className="w-full h-full object-cover" /> : <Baby className="h-6 w-6 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight line-clamp-2">{l.name}</div>
                  {l.brand && <div className="text-[10px] font-bold text-slate-500 mt-0.5">{l.brand}</div>}
                  <div className="text-xs sm:text-sm font-bold text-pink-700 mt-0.5">{formatPKR(l.unitPrice)}</div>
                  {l.chokingHazard && (
                    <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[9px] font-extrabold">
                      ⚠️ Choking hazard
                    </div>
                  )}
                </div>
                <button onClick={() => onRemove(l.id)}
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              {/* Gift wrap toggle */}
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => onToggleGiftWrap(l.id)}
                  className={`flex-1 h-10 rounded-lg text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition ${
                    l.giftWrap ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-pink-50'}`}>
                  <Gift className="h-3.5 w-3.5" />
                  {l.giftWrap ? '🎁 Wrapped (+Rs 50)' : 'Add Gift Wrap'}
                </button>
              </div>

              {l.giftWrap && (
                <input value={l.giftMessage} onChange={(e) => onUpdateGiftMessage(l.id, e.target.value)}
                  placeholder="Gift message (optional)..."
                  className="mt-2 h-10 w-full rounded-lg border-2 border-pink-200 bg-pink-50 px-3 text-xs font-bold focus:outline-none focus:border-pink-500" />
              )}

              <div className="mt-2.5 sm:mt-3 flex items-center justify-between gap-2">
                <div className="inline-flex items-center bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200">
                  <button onClick={() => onChangeQty(l.id, -1)} className="h-12 sm:h-14 w-12 sm:w-14 hover:bg-slate-200 flex items-center justify-center">
                    <Minus className="h-5 w-5 sm:h-6 sm:w-6 text-slate-700" />
                  </button>
                  <div className="h-12 sm:h-14 min-w-[70px] w-[70px] text-center bg-white flex items-center justify-center text-lg sm:text-xl font-extrabold tabular-nums">
                    {l.quantity}
                  </div>
                  <button onClick={() => onChangeQty(l.id, 1)}
                    className="h-12 sm:h-14 w-12 sm:w-14 bg-pink-600 hover:bg-pink-700 text-white flex items-center justify-center">
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
            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-extrabold text-slate-600 shrink-0">
              <Percent className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
              <span className="hidden sm:inline">Discount:</span>
            </div>
            <div className="flex gap-1 flex-1">
              {[0, 5, 10, 15, 20].map((d) => (
                <button key={d} onClick={() => setDiscountPct(d)}
                  className={`flex-1 h-9 sm:h-10 rounded-xl text-[11px] sm:text-xs font-extrabold ${
                    discountPct === d ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                  {d === 0 ? 'None' : `${d}%`}
                </button>
              ))}
            </div>
          </div>

          <button onClick={onCheckout} disabled={!canCheckout}
            className="w-full h-[76px] sm:h-[88px] rounded-3xl font-extrabold text-white shadow-2xl transition-all active:scale-[0.98] bg-gradient-to-r from-pink-600 to-rose-700 hover:from-pink-700 disabled:opacity-50 flex items-center justify-between px-5 sm:px-6">
            <div className="text-left">
              <div className="text-[10px] sm:text-xs uppercase font-extrabold text-white/80 tracking-wider">
                Checkout
              </div>
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
