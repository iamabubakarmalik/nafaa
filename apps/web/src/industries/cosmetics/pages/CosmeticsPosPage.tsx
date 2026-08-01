import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Package, X, Plus, Minus, Trash2,
  Camera, ScanLine, User, UserPlus, CheckCircle2, Store,
  ChevronDown, Eye, EyeOff, ArrowRight, Printer, Star,
  Pause, Play, Percent, Sparkles, Wifi, WifiOff, Award,
  Gift, Palette, Crown, Heart,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { offlineProductsApi as productsApi } from '@core/lib/offline/offlineProducts';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { Product } from '@modules/inventory/products/api/products.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { RetailQuickCash } from '@industries/retail/components/pos';
import { cosmeticsProductsApi } from '../api/products.api';
import { cosmeticsLoyaltyApi } from '../api/loyalty.api';
import { cosmeticsGiftBundlesApi } from '../api/gift-bundles.api';

const HIDE_PRICES_KEY = 'nafaa.cosmetics-pos.hide-prices';

interface CartLine {
  id: string;
  type: 'product' | 'bundle';
  productId?: string;
  bundleId?: string;
  name: string;
  image?: string;
  shadeHex?: string;
  unitPrice: number;
  quantity: number;
  baseStock: number;
  lineTotal: number;
  bundleItems?: any[];
  savings?: number;
}

const lineId = () => `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function CosmeticsPosPage() {
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const tenant = useAuthStore((s) => s.tenant);

  const [hidePrices, setHidePrices] = useState(() => localStorage.getItem(HIDE_PRICES_KEY) === 'true');
  const [viewMode, setViewMode] = useState<'products' | 'bundles'>('products');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [loyaltyMember, setLoyaltyMember] = useState<any>(null);
  const [discountPct, setDiscountPct] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem(HIDE_PRICES_KEY, String(hidePrices)); }, [hidePrices]);
  useEffect(() => {
    const on = () => setIsOnline(true); const off = () => setIsOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const { data: productsData } = useQuery({
    queryKey: ['products-for-cosmetics-pos'],
    queryFn: () => productsApi.list({ page: 1, limit: 2000 }),
  });
  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ['cosmetics-profiles-all'],
    queryFn: () => cosmeticsProductsApi.list(),
  });
  const { data: bundles = [] } = useQuery({
    queryKey: ['cosmetics-active-bundles'],
    queryFn: () => cosmeticsGiftBundlesApi.list({ active: true }),
  });

  const products: Product[] = productsData?.items ?? [];
  const customers = customersData?.items ?? [];
  const selectedCustomer = customers.find((c) => c.id === customerId);

  const profileByProduct = useMemo(() => {
    const m = new Map<string, any>();
    (profiles as any[]).forEach((p) => m.set(p.productId, p));
    return m;
  }, [profiles]);

  // Load loyalty member when customer is selected
  useEffect(() => {
    (async () => {
      if (selectedCustomer?.phone) {
        try {
          const m = await cosmeticsLoyaltyApi.byPhone(selectedCustomer.phone);
          setLoyaltyMember(m);
          setPointsToRedeem(0);
        } catch {
          setLoyaltyMember(null);
        }
      } else {
        setLoyaltyMember(null);
        setPointsToRedeem(0);
      }
    })();
  }, [selectedCustomer]);

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => p.isActive !== false);
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((p) => {
      const pr = profileByProduct.get(p.id);
      return p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (pr?.shadeName || '').toLowerCase().includes(q);
    });
    return list.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).slice(0, 200);
  }, [products, search, profileByProduct]);

  const filteredBundles = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return bundles;
    return bundles.filter((b: any) => b.name.toLowerCase().includes(q));
  }, [bundles, search]);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.lineTotal, 0), [cart]);
  const discountAmount = useMemo(() => (subtotal * discountPct) / 100, [subtotal, discountPct]);
  const loyaltyRedeem = Math.min(pointsToRedeem, loyaltyMember?.pointsBalance || 0);
  const total = Math.max(0, subtotal - discountAmount - loyaltyRedeem);
  const itemCount = cart.length;

  const addProduct = (p: Product) => {
    if (p.stock <= 0) return toast.error(`${p.name} out of stock`);
    const existing = cart.find((l) => l.productId === p.id);
    if (existing) {
      if (existing.quantity + 1 > p.stock) return toast.error(`Stock only ${p.stock}`);
      setCart((prev) => prev.map((l) => l.id === existing.id ? { ...l, quantity: l.quantity + 1, lineTotal: (l.quantity + 1) * l.unitPrice } : l));
      return;
    }
    const profile = profileByProduct.get(p.id);
    setCart((prev) => [...prev, {
      id: lineId(),
      type: 'product',
      productId: p.id,
      name: p.name,
      image: p.images?.[0]?.url,
      shadeHex: profile?.shadeHex,
      unitPrice: p.price,
      quantity: 1,
      baseStock: p.stock,
      lineTotal: p.price,
    }]);
    toast.success(`${p.name} added`, { duration: 900 });
  };

  const addBundle = (b: any) => {
    for (const item of b.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      if (product.stock < Number(item.quantity)) return toast.error(`${product.name} stock ${product.stock}, need ${item.quantity}`);
    }
    setCart((prev) => [...prev, {
      id: lineId(),
      type: 'bundle',
      bundleId: b.id,
      name: b.name,
      image: b.imageUrl,
      unitPrice: Number(b.bundlePrice),
      quantity: 1,
      baseStock: 9999,
      lineTotal: Number(b.bundlePrice),
      bundleItems: b.items,
      savings: Number(b.savings || 0),
    }]);
    toast.success(`🎁 ${b.name} added`, { duration: 900 });
  };

  const changeQty = (id: string, delta: number) => {
    setCart((prev) => prev.flatMap((l) => {
      if (l.id !== id) return [l];
      const nextQty = l.quantity + delta;
      if (nextQty <= 0) return [];
      if (l.type === 'product' && nextQty > l.baseStock) { toast.error(`Stock only ${l.baseStock}`); return [l]; }
      return [{ ...l, quantity: nextQty, lineTotal: nextQty * l.unitPrice }];
    }));
  };

  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.id !== id));
  const clearCart = () => { setCart([]); setCustomerId(''); setDiscountPct(0); setPointsToRedeem(0); };

  const handleBarcode = async (code: string) => {
    setScannerOpen(false);
    const trimmed = code.trim();
    if (!trimmed) return;
    try {
      const p = await productsApi.byBarcode(trimmed);
      addProduct(p);
    } catch { toast.error(`Barcode "${trimmed}" not found`); }
  };

  const checkoutMutation = useMutation({
    mutationFn: async (data: { paymentMethod: PaymentMethod; paidAmount: number }) => {
      if (!currentShopId) throw new Error('Select shop first');

      const items: any[] = [];
      cart.forEach((l) => {
        if (l.type === 'bundle' && l.bundleItems) {
          l.bundleItems.forEach((ci: any) => {
            items.push({
              productId: ci.productId,
              quantity: Number(ci.quantity) * l.quantity,
              priceOverride: Number(ci.unitPrice) * (Number(l.unitPrice) / ((l.bundleItems || []).reduce((s: number, x: any) => s + Number(x.unitPrice), 0) || 1)),
              note: `Bundle: ${l.name}`,
            });
          });
        } else if (l.type === 'product' && l.productId) {
          items.push({ productId: l.productId, quantity: l.quantity, priceOverride: l.unitPrice });
        }
      });

      const sale = await salesApi.create({
        shopId: currentShopId,
        customerId: customerId || undefined,
        paymentMethod: data.paymentMethod,
        paidAmount: data.paidAmount,
        discount: discountAmount + loyaltyRedeem,
        items,
      });

      let updatedMember = null;
      if (loyaltyMember?.id) {
        if (loyaltyRedeem > 0) {
          await cosmeticsLoyaltyApi.redeemPoints(loyaltyMember.id, loyaltyRedeem, `Sale ${sale.saleNumber}`);
        }
        updatedMember = await cosmeticsLoyaltyApi.recordPurchase(loyaltyMember.id, total);
      }

      return { sale, updatedMember, pointsEarned: Math.floor(total / 10) };
    },
    onSuccess: ({ sale, updatedMember, pointsEarned }, vars) => {
      const change = Math.max(vars.paidAmount - total, 0);
      setLastSale({ ...sale, change, total, pointsEarned, updatedMember });
      setShowCheckout(false);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['products-for-cosmetics-pos'] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });

      const autoOpen = localStorage.getItem('nafaa.pos.auto-open-receipt') !== 'false';
      if (autoOpen) window.open(`/sales/${sale.id}/receipt?auto=1`, '_blank');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Sale failed'),
  });

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScannerOpen(false)} />}

      {showCheckout && (
        <RetailQuickCash
          total={total}
          itemCount={itemCount}
          loading={checkoutMutation.isPending}
          customerName={selectedCustomer?.name}
          hasCustomer={!!customerId}
          onConfirm={({ paymentMethod, paidAmount }) => checkoutMutation.mutate({ paymentMethod, paidAmount })}
          onClose={() => setShowCheckout(false)}
        />
      )}

      {lastSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLastSale(null)}>
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-8 bg-gradient-to-br from-pink-500 to-rose-600 text-white text-center">
              <button onClick={() => setLastSale(null)} className="absolute top-3 right-3 h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
              <div className="h-20 w-20 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h3 className="text-3xl font-extrabold">Sale Complete! 💄</h3>
              <p className="text-sm font-bold text-white/90 mt-1 font-mono">{lastSale.saleNumber}</p>
            </div>
            {lastSale.change > 0 && (
              <div className="px-6 py-5 bg-amber-50 border-b-4 border-amber-200 text-center">
                <div className="text-xs uppercase font-extrabold text-amber-800 tracking-wider">Give change</div>
                <div className="text-5xl font-extrabold text-amber-700 tabular-nums mt-1">{formatPKR(lastSale.change)}</div>
              </div>
            )}
            {lastSale.updatedMember && (
              <div className="px-6 py-4 bg-pink-50 border-b-4 border-pink-200 text-center space-y-1">
                <div className="text-xs uppercase font-extrabold text-pink-800 tracking-wider inline-flex items-center gap-1 justify-center">
                  <Award className="h-3 w-3" /> Loyalty rewards
                </div>
                <div className="text-2xl font-extrabold text-pink-700">
                  +{lastSale.pointsEarned} points earned
                </div>
                <div className="text-sm font-bold text-pink-800">
                  Tier: <strong>{lastSale.updatedMember.tier}</strong> • Balance: {lastSale.updatedMember.pointsBalance} pts
                </div>
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

      <div className="min-h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-7rem)] flex flex-col lg:grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px] gap-2 lg:gap-3">
        <section className="lg:flex-1 rounded-2xl lg:rounded-3xl bg-white border-2 border-slate-200 shadow-sm lg:overflow-hidden flex flex-col lg:min-h-0">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold">💄 Cosmetics POS</h2>
                    {isOnline ? <Wifi className="h-3 w-3 text-emerald-200" /> : <WifiOff className="h-3 w-3 text-amber-200" />}
                  </div>
                  <p className="text-xs text-white/80 font-semibold mt-0.5 flex items-center gap-1 truncate">
                    <Store className="h-3 w-3" />
                    <span className="truncate">{tenant?.name || 'Beauty Store'}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setHidePrices((v) => !v)}
                className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center border-2 border-white/20">
                {hidePrices ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="shrink-0 px-4 pt-3 bg-slate-50 border-b-2 border-slate-100">
            <div className="flex gap-1.5 bg-white rounded-2xl border-2 border-slate-200 p-1">
              <button onClick={() => setViewMode('products')}
                className={`flex-1 h-12 rounded-xl text-sm font-extrabold inline-flex items-center justify-center gap-1.5 ${viewMode === 'products' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-600'}`}>
                <Package className="h-4 w-4" /> Products
              </button>
              <button onClick={() => setViewMode('bundles')}
                className={`flex-1 h-12 rounded-xl text-sm font-extrabold inline-flex items-center justify-center gap-1.5 relative ${viewMode === 'bundles' ? 'bg-fuchsia-600 text-white shadow-md' : 'text-slate-600'}`}>
                <Gift className="h-4 w-4" /> Gift Bundles
                {bundles.length > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-fuchsia-500 animate-pulse" />}
              </button>
            </div>
          </div>

          <div className="shrink-0 px-4 py-3 bg-slate-50 border-b-2 border-slate-100 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-6 w-6 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input className="h-16 w-full rounded-2xl border-4 border-slate-200 bg-white pl-14 pr-4 text-xl font-bold focus:outline-none focus:border-pink-500"
                  placeholder={viewMode === 'products' ? 'Product / shade / SKU...' : 'Bundle name...'}
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <button onClick={() => setScannerOpen(true)}
                className="h-16 w-20 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center gap-0.5 shadow-lg">
                <Camera className="h-6 w-6" />
                <span className="text-[10px] font-extrabold">SCAN</span>
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (barcodeInput.trim()) { handleBarcode(barcodeInput); setBarcodeInput(''); } }} className="relative">
              <ScanLine className="h-5 w-5 text-pink-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input ref={barcodeRef} value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Barcode..."
                className="h-12 w-full rounded-2xl border-2 border-pink-300 bg-pink-50 pl-11 pr-3 text-base font-mono font-extrabold focus:outline-none focus:border-pink-600" />
            </form>
          </div>

          <div className="lg:flex-1 lg:overflow-y-auto p-3 bg-slate-50/50">
            {viewMode === 'products' ? (
              filteredProducts.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="h-16 w-16 text-slate-300 mx-auto" />
                  <p className="mt-4 font-extrabold text-slate-700">No products found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredProducts.map((p) => {
                    const profile = profileByProduct.get(p.id);
                    const inCart = cart.find((l) => l.productId === p.id);
                    const cartQty = inCart?.quantity || 0;
                    const out = p.stock <= 0;
                    return (
                      <button key={p.id} onClick={() => addProduct(p)} disabled={out}
                        className={`group relative text-left rounded-2xl border-4 overflow-hidden transition-all active:scale-95 ${
                          out ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
                            : cartQty > 0 ? 'border-emerald-500 bg-emerald-50 shadow-xl ring-4 ring-emerald-200'
                              : 'border-slate-200 bg-white hover:border-pink-400 hover:shadow-xl'}`}>
                        {cartQty > 0 && (
                          <div className="absolute -top-2 -right-2 min-w-[36px] h-9 px-2 rounded-full bg-emerald-600 text-white text-base font-extrabold flex items-center justify-center shadow-xl ring-4 ring-white z-10">
                            {cartQty}
                          </div>
                        )}
                        <div className="aspect-square bg-slate-100 overflow-hidden relative">
                          {p.images?.[0]?.url ? (
                            <img src={p.images[0].url} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50">
                              <Sparkles className="h-12 w-12 text-pink-300" />
                            </div>
                          )}
                          {out && <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center"><span className="px-3 py-1 rounded-xl bg-rose-600 text-white text-sm font-extrabold">OUT</span></div>}
                          {profile?.shadeHex && (
                            <div className="absolute bottom-1.5 right-1.5 h-8 w-8 rounded-full border-2 border-white shadow" style={{ backgroundColor: profile.shadeHex }} />
                          )}
                          {profile?.isViral && (
                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-extrabold shadow">🔥</div>
                          )}
                          {profile?.isHalalCertified && !profile?.isViral && (
                            <div className="absolute top-1.5 left-1.5 h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shadow text-xs">🕌</div>
                          )}
                        </div>
                        <div className="p-2.5">
                          <div className="font-extrabold text-slate-900 text-sm line-clamp-2 leading-tight min-h-[2.5rem]">{p.name}</div>
                          {profile?.shadeName && (
                            <div className="mt-0.5 text-[10px] font-bold text-slate-500 truncate">{profile.shadeName}</div>
                          )}
                          <div className="mt-1.5 flex items-end justify-between">
                            <div className="text-xl font-extrabold text-emerald-700 tabular-nums leading-none">{hidePrices ? '•••' : formatPKR(p.price)}</div>
                            <div className={`text-sm font-extrabold ${out ? 'text-rose-700' : 'text-slate-600'}`}>{p.stock}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              filteredBundles.length === 0 ? (
                <div className="text-center py-16">
                  <Gift className="h-16 w-16 text-slate-300 mx-auto" />
                  <p className="mt-4 font-extrabold text-slate-700">No gift bundles yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredBundles.map((b: any) => (
                    <button key={b.id} onClick={() => addBundle(b)}
                      className="group relative text-left rounded-2xl border-4 border-fuchsia-300 bg-gradient-to-br from-white via-fuchsia-50 to-white overflow-hidden transition-all active:scale-95 hover:border-fuchsia-500 hover:shadow-xl">
                      <div className="aspect-square bg-gradient-to-br from-fuchsia-100 to-pink-100 relative overflow-hidden">
                        {b.imageUrl ? (
                          <img src={b.imageUrl} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Gift className="h-16 w-16 text-fuchsia-400" />
                          </div>
                        )}
                        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-fuchsia-600 text-white text-[9px] font-extrabold uppercase">BUNDLE</div>
                        {b.savings > 0 && (
                          <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-emerald-500 text-white text-xs font-extrabold">Save {formatPKR(b.savings)}</div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="font-extrabold text-slate-900 text-sm line-clamp-2 leading-tight min-h-[2.5rem]">{b.name}</div>
                        {b.occasion && <div className="text-[10px] font-bold text-fuchsia-700 uppercase mt-0.5">{b.occasion}</div>}
                        <div className="mt-1.5 flex items-end justify-between">
                          <div>
                            {b.originalPrice > b.bundlePrice && (
                              <div className="text-[10px] text-slate-500 line-through font-bold">{formatPKR(b.originalPrice)}</div>
                            )}
                            <div className="text-xl font-extrabold text-emerald-700 tabular-nums leading-none">{hidePrices ? '•••' : formatPKR(b.bundlePrice)}</div>
                          </div>
                          <div className="text-[10px] font-extrabold text-fuchsia-700">{b.items?.length} items</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        </section>

        {/* CART PANEL */}
        <aside className="hidden lg:flex rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden flex-col min-h-0">
          <div className="shrink-0 bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] uppercase font-extrabold text-white/70 tracking-wider">Cart • {itemCount} items</div>
                <div className="text-4xl font-extrabold tabular-nums leading-none mt-1">{hidePrices ? '••••' : formatPKR(total)}</div>
              </div>
              {cart.length > 0 && (
                <button onClick={() => { if (confirm('Clear cart?')) clearCart(); }}
                  className="h-12 px-3 rounded-2xl bg-white/15 hover:bg-rose-500/50 text-white text-sm font-extrabold border-2 border-white/20">Clear</button>
              )}
            </div>
          </div>

          <div className="shrink-0 px-3 py-2.5 border-b-2 border-slate-100 bg-slate-50">
            <div className="relative">
              <User className="h-5 w-5 text-pink-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                className="h-14 w-full rounded-2xl border-4 border-slate-200 bg-white pl-11 pr-9 text-base font-bold focus:outline-none focus:border-pink-500 appearance-none">
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
              <ChevronDown className="h-5 w-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* LOYALTY BANNER */}
          {loyaltyMember && (
            <div className="shrink-0 mx-3 mt-2 rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-700 text-white p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-extrabold text-white/80">{loyaltyMember.tier} member</div>
                    <div className="text-sm font-extrabold">{loyaltyMember.pointsBalance} pts available</div>
                  </div>
                </div>
                {loyaltyMember.pointsBalance > 0 && total > 0 && (
                  <button onClick={() => setPointsToRedeem(pointsToRedeem > 0 ? 0 : Math.min(loyaltyMember.pointsBalance, Math.floor(subtotal - discountAmount)))}
                    className="px-3 py-1.5 rounded-xl bg-white text-pink-700 text-xs font-extrabold shadow">
                    {pointsToRedeem > 0 ? `-${pointsToRedeem} pts` : 'Redeem all'}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50 min-h-0">
            {cart.length === 0 ? (
              <div className="rounded-3xl bg-white border-4 border-dashed border-slate-200 p-10 text-center">
                <ShoppingCart className="h-10 w-10 text-slate-400 mx-auto" />
                <p className="mt-4 font-extrabold text-slate-700 text-xl">Cart is empty</p>
              </div>
            ) : (
              cart.map((l) => (
                <div key={l.id} className={`rounded-2xl bg-white border-4 p-3 ${l.type === 'bundle' ? 'border-fuchsia-300' : 'border-slate-200'}`}>
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-slate-100 relative">
                      {l.image ? <img src={l.image} className="w-full h-full object-cover" /> : <Sparkles className="h-6 w-6 text-slate-400" />}
                      {l.shadeHex && (
                        <div className="absolute bottom-0 right-0 h-5 w-5 rounded-tl-lg border-2 border-white" style={{ backgroundColor: l.shadeHex }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-slate-900 text-sm line-clamp-2 leading-tight">{l.name}</div>
                      {l.type === 'bundle' && <span className="mt-0.5 inline-block px-1.5 py-0.5 rounded bg-fuchsia-600 text-white text-[9px] font-extrabold uppercase">Bundle</span>}
                      <div className="text-xs font-bold text-pink-700 mt-0.5">{formatPKR(l.unitPrice)}</div>
                    </div>
                    <button onClick={() => removeLine(l.id)} className="h-10 w-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200">
                      <button onClick={() => changeQty(l.id, -1)} className="h-12 w-12 hover:bg-slate-200 flex items-center justify-center">
                        <Minus className="h-5 w-5 text-slate-700" />
                      </button>
                      <div className="h-12 min-w-[70px] text-center bg-white border-0 text-xl font-extrabold tabular-nums flex items-center justify-center">
                        {l.quantity}
                      </div>
                      <button onClick={() => changeQty(l.id, 1)}
                        className={`h-12 w-12 text-white flex items-center justify-center ${l.type === 'bundle' ? 'bg-fuchsia-600' : 'bg-pink-600'}`}>
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">{hidePrices ? '•••' : formatPKR(l.lineTotal)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="shrink-0 p-3 border-t-4 border-slate-100 bg-white space-y-2">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-amber-600" />
                <div className="flex gap-1 flex-1">
                  {[0, 5, 10, 15, 20].map((d) => (
                    <button key={d} onClick={() => setDiscountPct(d)}
                      className={`flex-1 h-10 rounded-xl text-xs font-extrabold ${discountPct === d ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                      {d === 0 ? 'None' : `${d}%`}
                    </button>
                  ))}
                </div>
              </div>

              {loyaltyRedeem > 0 && (
                <div className="rounded-xl bg-pink-50 border-2 border-pink-200 p-2 text-xs font-extrabold text-pink-800 flex items-center justify-between">
                  <span>🎁 Loyalty redemption</span>
                  <span>-{formatPKR(loyaltyRedeem)}</span>
                </div>
              )}

              <button onClick={() => setShowCheckout(true)} disabled={!currentShopId}
                className="w-full h-[88px] rounded-3xl font-extrabold text-white shadow-2xl transition-all active:scale-[0.98] bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 flex items-center justify-between px-6">
                <div className="text-left">
                  <div className="text-xs uppercase font-extrabold text-white/80 tracking-wider">Checkout</div>
                  <div className="text-3xl tabular-nums leading-none mt-0.5">{formatPKR(total)}</div>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <ArrowRight className="h-8 w-8" />
                </div>
              </button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
