import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Package, X, Plus, Minus, Trash2,
  Camera, ScanLine, User, UserPlus, CheckCircle2, Store,
  ChevronDown, Eye, EyeOff, Grid3x3, ArrowRight, Printer,
  Star, Pause, Play, Percent, Gamepad2, CreditCard, Copy,
  Wifi, WifiOff, Sparkles, Layers, Zap, Rocket, Timer,
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
import { gamingProductsApi } from '../api/products.api';
import { gamingTopupsApi } from '../api/topups.api';
import { TopupPickerModal } from '../components/pos/TopupPickerModal';

const HIDE_PRICES_KEY = 'nafaa.gaming-pos.hide-prices';
const AUTO_CLOSE_KEY = 'nafaa.gaming-pos.auto-close-success';
const VIEW_MODE_KEY = 'nafaa.gaming-pos.view-mode';

type ViewMode = 'products' | 'topups';

interface CartLine {
  id: string;
  type: 'product' | 'topup';
  productId?: string;
  topupId?: string;
  name: string;
  image?: string;
  platform?: string;
  provider?: string;
  cardCode?: string;
  cardPin?: string;
  unitPrice: number;
  quantity: number;
  baseStock: number;
  lineTotal: number;
  note?: string;
  isPreOrder?: boolean;
}

interface HeldCart {
  id: string; lines: CartLine[]; customerId: string; total: number; heldAt: number;
}

const lineId = () => `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const heldId = () => `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function GamingPosPage() {
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const tenant = useAuthStore((s) => s.tenant);

  const [hidePrices, setHidePrices] = useState(() => localStorage.getItem(HIDE_PRICES_KEY) === 'true');
  const [autoClose, setAutoClose] = useState(() => localStorage.getItem(AUTO_CLOSE_KEY) !== 'false');
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || 'products');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [topupPickerData, setTopupPickerData] = useState<{ provider: string; topupType: string; denomination: number } | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [lastSale, setLastSale] = useState<{ id: string; number: string; change: number; total: number; codesRevealed?: Array<{ label: string; code: string; pin?: string }> } | null>(null);
  const [visibleCount, setVisibleCount] = useState(60);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const successTimerRef = useRef<any>(null);

  useEffect(() => { localStorage.setItem(HIDE_PRICES_KEY, String(hidePrices)); }, [hidePrices]);
  useEffect(() => { localStorage.setItem(AUTO_CLOSE_KEY, String(autoClose)); }, [autoClose]);
  useEffect(() => { localStorage.setItem(VIEW_MODE_KEY, viewMode); }, [viewMode]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 120);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    setVisibleCount(60);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [debouncedSearch, platformFilter, providerFilter, viewMode]);

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

  useEffect(() => {
    const refocus = () => {
      if (scannerOpen || showCheckout || topupPickerData || showCustomerAdd || showHeldCarts || lastSale) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== barcodeRef.current) {
        const tag = active.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.isContentEditable) return;
      }
      barcodeRef.current?.focus();
    };
    const t = setTimeout(refocus, 300);
    return () => clearTimeout(t);
  }, [scannerOpen, showCheckout, topupPickerData, showCustomerAdd, showHeldCarts, lastSale]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); setScannerOpen(true); }
      if (e.key === 'F9') { e.preventDefault(); if (cart.length > 0) setShowCheckout(true); }
      if (e.key === 'F7') { e.preventDefault(); setViewMode('products'); }
      if (e.key === 'F8') { e.preventDefault(); setViewMode('topups'); }
      if (e.key === 'Escape') {
        if (scannerOpen) setScannerOpen(false);
        if (showCheckout) setShowCheckout(false);
        if (topupPickerData) setTopupPickerData(null);
        if (showMobileCart) setShowMobileCart(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart.length, scannerOpen, showCheckout, topupPickerData, showMobileCart]);

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-for-gaming-pos'],
    queryFn: () => productsApi.list({ page: 1, limit: 2000 }),
    staleTime: 30_000,
  });
  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
    staleTime: 60_000,
  });
  const { data: topupInventory = [], isLoading: loadingTopups } = useQuery({
    queryKey: ['pos-topup-inventory'],
    queryFn: () => gamingTopupsApi.inventory(),
    staleTime: 30_000,
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ['gaming-profiles-all'],
    queryFn: () => gamingProductsApi.list(),
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
    if (platformFilter) {
      list = list.filter((p) => profileByProduct.get(p.id)?.platform === platformFilter);
    }
    const q = debouncedSearch.toLowerCase().trim();
    if (q) {
      list = list.filter((p) => {
        const pr = profileByProduct.get(p.id);
        return p.name.toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.barcode || '').toLowerCase().includes(q) ||
          (pr?.publisher || '').toLowerCase().includes(q);
      });
    }
    return list.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      const aOut = a.stock <= 0, bOut = b.stock <= 0;
      if (aOut !== bOut) return aOut ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [products, debouncedSearch, platformFilter, profileByProduct]);

  const filteredTopups = useMemo(() => {
    let list = [...topupInventory];
    if (providerFilter) list = list.filter((t) => t.provider === providerFilter);
    const q = debouncedSearch.toLowerCase().trim();
    if (q) {
      list = list.filter((t) =>
        t.provider.toLowerCase().includes(q) ||
        t.topupType.toLowerCase().includes(q) ||
        String(t.denomination).includes(q)
      );
    }
    return list.sort((a, b) => a.provider.localeCompare(b.provider) || a.denomination - b.denomination);
  }, [topupInventory, debouncedSearch, providerFilter]);

  const visibleProducts = useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);
  const hasMore = filteredProducts.length > visibleCount;

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.lineTotal, 0), [cart]);
  const discountAmount = useMemo(() => (subtotal * discountPct) / 100, [subtotal, discountPct]);
  const total = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);
  const itemCount = cart.length;
  const totalQty = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);

  const openProduct = useCallback((product: Product) => {
    if (product.stock <= 0) { toast.error(`${product.name} — out of stock`); return; }
    const profile = profileByProduct.get(product.id);
    addProductLine(product, 1, profile);
  }, [profileByProduct]);

  const addProductLine = (product: Product, qty: number, profile?: any) => {
    const existing = cart.find((l) => l.productId === product.id);
    if (existing) {
      const newQty = existing.quantity + qty;
      if (newQty > product.stock) { toast.error(`Stock only ${product.stock}`); return; }
      setCart((prev) => prev.map((l) => l.id === existing.id
        ? { ...l, quantity: newQty, lineTotal: newQty * l.unitPrice } : l));
      toast.success(`${product.name} +${qty}`, { duration: 900 });
      return;
    }
    setCart((prev) => [...prev, {
      id: lineId(),
      type: 'product',
      productId: product.id,
      name: product.name,
      image: product.images?.[0]?.url,
      platform: profile?.platform,
      unitPrice: product.price,
      quantity: qty,
      baseStock: product.stock,
      lineTotal: qty * product.price,
      isPreOrder: profile?.isPreOrder,
    }]);
    toast.success(`${product.name} added`, { duration: 900 });
  };

  const openTopupPicker = (row: any) => {
    if (row.count <= 0) { toast.error('No cards in stock'); return; }
    setTopupPickerData({ provider: row.provider, topupType: row.topupType, denomination: row.denomination });
  };

  const addTopupLine = (topup: any) => {
    setCart((prev) => [...prev, {
      id: lineId(),
      type: 'topup',
      topupId: topup.id,
      name: `${topup.provider.replace(/_/g, ' ')} — ${topup.topupType}`,
      provider: topup.provider,
      cardCode: topup.cardCode,
      cardPin: topup.cardPin,
      unitPrice: topup.sellingPrice,
      quantity: 1,
      baseStock: 1,
      lineTotal: topup.sellingPrice,
      note: `${topup.denominationValue} ${topup.denominationCurrency}`,
    }]);
    toast.success(`${topup.provider.replace(/_/g, ' ')} card added`, { duration: 1200 });
  };

  const changeQty = (id: string, delta: number) => {
    setCart((prev) => prev.flatMap((l) => {
      if (l.id !== id) return [l];
      if (l.type === 'topup' && delta > 0) { toast.error('One card per line — add another separately'); return [l]; }
      const nextQty = l.quantity + delta;
      if (nextQty <= 0) return [];
      if (l.type === 'product' && nextQty > l.baseStock) { toast.error(`Stock only ${l.baseStock}`); return [l]; }
      return [{ ...l, quantity: nextQty, lineTotal: nextQty * l.unitPrice }];
    }));
  };

  const setQtyDirect = (id: string, qty: number) => {
    setCart((prev) => prev.flatMap((l) => {
      if (l.id !== id) return [l];
      if (qty <= 0) return [];
      if (l.type === 'topup' && qty > 1) { toast.error('One card per line'); return [l]; }
      if (l.type === 'product' && qty > l.baseStock) { toast.error(`Stock only ${l.baseStock}`); return [l]; }
      return [{ ...l, quantity: qty, lineTotal: qty * l.unitPrice }];
    }));
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

  const holdCart = () => {
    if (cart.length === 0) return;
    setHeldCarts((prev) => [...prev, { id: heldId(), lines: cart, customerId, total, heldAt: Date.now() }]);
    clearCart();
    toast.success('Cart held');
  };

  const resumeCart = (held: HeldCart) => {
    setCart(held.lines);
    setCustomerId(held.customerId);
    setHeldCarts((prev) => prev.filter((h) => h.id !== held.id));
    setShowHeldCarts(false);
    toast.success('Cart resumed');
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
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Add failed'),
  });

  const closeSuccessModal = useCallback(() => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setLastSale(null);
    setTimeout(() => barcodeRef.current?.focus(), 100);
  }, []);

  const checkoutMutation = useMutation({
    mutationFn: async (data: { paymentMethod: PaymentMethod; paidAmount: number }) => {
      if (!currentShopId) throw new Error('Select shop first');

      const productItems = cart.filter((l) => l.type === 'product' && l.productId).map((l) => ({
        productId: l.productId!,
        quantity: l.quantity,
        priceOverride: l.unitPrice,
        note: l.note,
      }));

      const topupLines = cart.filter((l) => l.type === 'topup' && l.topupId);

      const sale = productItems.length > 0 ? await offlineSalesApi.create({
        shopId: currentShopId,
        customerId: customerId || undefined,
        paymentMethod: data.paymentMethod,
        paidAmount: data.paidAmount,
        discount: discountAmount,
        items: productItems,
      }) : null;

      const codesRevealed: Array<{ label: string; code: string; pin?: string }> = [];
      for (const t of topupLines) {
        try {
          const revealed = await gamingTopupsApi.sell(t.topupId!, {
            customerId: customerId || undefined,
            customerName: selectedCustomer?.name,
            customerPhone: selectedCustomer?.phone || undefined,
            deliveredVia: 'POS',
            deliveryReference: sale?.saleNumber,
            actualSellingPrice: t.unitPrice,
          });
          if (revealed.cardCode) {
            codesRevealed.push({
              label: t.name,
              code: revealed.cardCode,
              pin: revealed.cardPin || undefined,
            });
          }
        } catch (e: any) {
          console.error('Topup sell failed', e);
        }
      }

      return { sale, codesRevealed };
    },
    onSuccess: ({ sale, codesRevealed }, vars) => {
      const change = Math.max(vars.paidAmount - total, 0);
      setLastSale({
        id: sale?.id || 'topup-only',
        number: sale?.saleNumber || 'TOPUP-ONLY',
        change,
        total,
        codesRevealed: codesRevealed.length > 0 ? codesRevealed : undefined,
      });
      setShowCheckout(false);
      setShowMobileCart(false);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['products-for-gaming-pos'] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      queryClient.invalidateQueries({ queryKey: ['pos-topup-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['gaming-topups-summary'] });

      const autoOpen = localStorage.getItem('nafaa.pos.auto-open-receipt') !== 'false';
      if (autoOpen && sale) window.open(`/sales/${sale.id}/receipt?auto=1`, '_blank');

      if (autoClose && !codesRevealed.length) {
        successTimerRef.current = setTimeout(() => {
          setLastSale(null);
          setTimeout(() => barcodeRef.current?.focus(), 100);
        }, 3500);
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Sale failed'),
  });

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || viewMode !== 'products') return;
    const t = e.currentTarget;
    if ((t.scrollTop + t.clientHeight) / t.scrollHeight > 0.85) {
      setVisibleCount((c) => Math.min(c + 60, filteredProducts.length));
    }
  }, [hasMore, filteredProducts.length, viewMode]);

  const isLoading = viewMode === 'products' ? loadingProducts : loadingTopups;

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScannerOpen(false)} />}

      {topupPickerData && (
        <TopupPickerModal
          provider={topupPickerData.provider}
          topupType={topupPickerData.topupType}
          denomination={topupPickerData.denomination}
          onConfirm={(topup) => {
            addTopupLine(topup);
            setTopupPickerData(null);
          }}
          onClose={() => setTopupPickerData(null)}
        />
      )}

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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={lastSale.codesRevealed ? undefined : closeSuccessModal}>
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-6 bg-gradient-to-br from-emerald-500 to-green-600 text-white text-center shrink-0">
              <button onClick={closeSuccessModal} className="absolute top-3 right-3 h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <X className="h-5 w-5" />
              </button>
              <div className="h-16 w-16 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-extrabold">Sale Complete! 🎮</h3>
              <p className="text-sm font-bold text-white/90 mt-1 font-mono">{lastSale.number}</p>
            </div>

            {lastSale.change > 0 && (
              <div className="px-6 py-4 bg-amber-50 border-b-4 border-amber-200 text-center shrink-0">
                <div className="text-xs uppercase font-extrabold text-amber-800 tracking-wider">Give change</div>
                <div className="text-4xl font-extrabold text-amber-700 tabular-nums mt-1">{formatPKR(lastSale.change)}</div>
              </div>
            )}

            {lastSale.codesRevealed && lastSale.codesRevealed.length > 0 && (
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-violet-50 border-b-4 border-violet-200">
                <div className="text-xs uppercase font-extrabold text-violet-800 tracking-wider text-center mb-2">
                  🔐 Reveal these codes to customer
                </div>
                {lastSale.codesRevealed.map((c, i) => (
                  <div key={i} className="rounded-xl bg-white border-2 border-violet-300 p-3">
                    <div className="text-[10px] uppercase font-extrabold text-violet-600 mb-1">{c.label}</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 font-mono text-lg font-extrabold text-slate-900 tracking-wider">{c.code}</div>
                      <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success('Copied'); }}
                        className="h-9 w-9 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 flex items-center justify-center">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    {c.pin && (
                      <div className="mt-2 pt-2 border-t border-violet-200 flex items-center gap-2">
                        <span className="text-[10px] uppercase font-extrabold text-violet-600">PIN</span>
                        <span className="font-mono font-extrabold text-slate-900">{c.pin}</span>
                        <button onClick={() => { navigator.clipboard.writeText(c.pin!); toast.success('PIN copied'); }}
                          className="ml-auto h-7 w-7 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 flex items-center justify-center">
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="shrink-0 p-4 grid grid-cols-2 gap-2">
              {lastSale.id !== 'topup-only' && (
                <button onClick={() => window.open(`/sales/${lastSale.id}/receipt`, '_blank')}
                  className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 font-extrabold text-slate-700 transition inline-flex items-center justify-center gap-2">
                  <Printer className="h-5 w-5" /> Receipt
                </button>
              )}
              <button onClick={closeSuccessModal}
                className={`${lastSale.id !== 'topup-only' ? '' : 'col-span-2'} h-14 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-700 hover:from-violet-700 font-extrabold text-white text-lg shadow-lg transition inline-flex items-center justify-center gap-2`}>
                New Sale <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-violet-600 to-fuchsia-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-6 w-6" />
                <h3 className="font-extrabold text-xl">New Customer</h3>
              </div>
              <button onClick={() => setShowCustomerAdd(false)} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input autoFocus value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Customer name"
                className="h-16 w-full rounded-2xl border-4 border-slate-200 px-4 text-xl font-bold focus:outline-none focus:border-violet-500" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="03XX XXXXXXX"
                className="h-16 w-full rounded-2xl border-4 border-slate-200 px-4 text-xl font-bold focus:outline-none focus:border-violet-500" />
              <button onClick={() => {
                if (!newCustomer.name.trim()) return toast.error('Name required');
                addCustomerMutation.mutate({ name: newCustomer.name.trim(), phone: newCustomer.phone.trim() || undefined });
              }} disabled={addCustomerMutation.isPending}
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-700 font-extrabold text-white text-xl shadow-lg transition disabled:opacity-50">
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
              <div className="flex items-center gap-2">
                <Pause className="h-6 w-6" />
                <h3 className="font-extrabold text-xl">Held Carts</h3>
              </div>
              <button onClick={() => setShowHeldCarts(false)} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {heldCarts.length === 0 ? (
                <div className="text-center py-12">
                  <Pause className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">No held carts</p>
                </div>
              ) : heldCarts.map((h) => (
                <div key={h.id} className="rounded-2xl border-2 border-slate-200 p-3 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 text-sm">{h.lines.length} items • {formatPKR(h.total)}</div>
                    <div className="text-xs text-slate-500 font-bold">
                      {new Date(h.heldAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                    </div>
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

      {/* MAIN LAYOUT */}
      <div className="min-h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-7rem)] flex flex-col lg:grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px] gap-2 lg:gap-3">

        <section className="lg:flex-1 rounded-2xl lg:rounded-3xl bg-white border-2 border-slate-200 shadow-sm lg:overflow-hidden flex flex-col lg:min-h-0">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-fuchsia-400/20 blur-2xl" />
            <div className="relative px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-2 ring-white/20 shrink-0">
                  <Gamepad2 className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-extrabold leading-none">🎮 Gaming POS</h2>
                    {isOnline ? (
                      <div className="h-6 w-6 rounded-full bg-emerald-500/30 flex items-center justify-center">
                        <Wifi className="h-3 w-3 text-emerald-200" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-amber-500/30 flex items-center justify-center">
                        <WifiOff className="h-3 w-3 text-amber-200" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/80 font-semibold mt-0.5 flex items-center gap-1 truncate">
                    <Store className="h-3 w-3 shrink-0" />
                    <span className="truncate">{tenant?.name || 'Gaming Shop'}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {heldCarts.length > 0 && (
                  <button onClick={() => setShowHeldCarts(true)}
                    className="h-10 sm:h-11 px-2.5 rounded-2xl bg-amber-500/30 hover:bg-amber-500/50 text-white text-xs font-extrabold inline-flex items-center gap-1 border-2 border-amber-300/40 transition">
                    <Pause className="h-4 w-4" /> {heldCarts.length}
                  </button>
                )}
                <button onClick={() => setHidePrices((v) => !v)}
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center border-2 border-white/20 transition">
                  {hidePrices ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                <button onClick={() => setShowMobileCart(true)}
                  className="lg:hidden relative h-10 w-10 rounded-2xl bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition">
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

          <div className="shrink-0 px-3 sm:px-4 pt-3 bg-slate-50 border-b-2 border-slate-100">
            <div className="flex gap-1.5 bg-white rounded-2xl border-2 border-slate-200 p-1">
              <ViewTab active={viewMode === 'products'} onClick={() => setViewMode('products')}
                icon={Package} label="Products" count={products.length} color="violet" shortcut="F7" />
              <ViewTab active={viewMode === 'topups'} onClick={() => setViewMode('topups')}
                icon={CreditCard} label="Top-ups" count={topupInventory.length} color="amber" shortcut="F8" highlight={topupInventory.length > 0} />
            </div>
          </div>

          <div className="shrink-0 px-3 sm:px-4 py-2.5 bg-slate-50 border-b-2 border-slate-100 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
                <input
                  className="h-14 sm:h-16 w-full rounded-2xl border-4 border-slate-200 bg-white pl-11 sm:pl-14 pr-10 sm:pr-12 text-lg sm:text-xl font-bold focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-200 transition"
                  placeholder={viewMode === 'products' ? 'Game / console / SKU...' : 'PSN / UC / Robux...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center transition">
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                )}
              </div>
              <button onClick={() => setScannerOpen(true)}
                className="h-14 sm:h-16 w-16 sm:w-20 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 text-white flex flex-col items-center justify-center gap-0.5 shadow-lg transition shrink-0">
                <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase">Scan</span>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (barcodeInput.trim()) { handleBarcode(barcodeInput); setBarcodeInput(''); } }} className="relative">
              <ScanLine className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input ref={barcodeRef} value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Barcode..."
                className="h-10 sm:h-12 w-full rounded-2xl border-2 border-violet-300 bg-violet-50 pl-10 sm:pl-11 pr-3 text-sm sm:text-base font-mono font-extrabold focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-200" />
            </form>

            {viewMode === 'products' && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                <FilterChip active={!platformFilter} onClick={() => setPlatformFilter('')} label="All" emoji="🌐" />
                {[
                  { v: 'PS5', l: 'PS5', e: '🎮' },
                  { v: 'PS4', l: 'PS4', e: '🎮' },
                  { v: 'XBOX_SERIES_X', l: 'Xbox X', e: '🟩' },
                  { v: 'NINTENDO_SWITCH', l: 'Switch', e: '🔴' },
                  { v: 'PC', l: 'PC', e: '🖥️' },
                  { v: 'MULTI', l: 'Multi', e: '🌐' },
                ].map((p) => (
                  <FilterChip key={p.v} active={platformFilter === p.v}
                    onClick={() => setPlatformFilter(platformFilter === p.v ? '' : p.v)}
                    label={p.l} emoji={p.e} />
                ))}
              </div>
            )}

            {viewMode === 'topups' && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                <FilterChip active={!providerFilter} onClick={() => setProviderFilter('')} label="All" emoji="💳" />
                {[
                  { v: 'PSN', l: 'PSN', e: '🎮' },
                  { v: 'XBOX_LIVE', l: 'Xbox', e: '🟩' },
                  { v: 'STEAM', l: 'Steam', e: '💨' },
                  { v: 'PUBG_UC', l: 'PUBG UC', e: '🔫' },
                  { v: 'ROBUX', l: 'Robux', e: '🎯' },
                  { v: 'GOOGLE_PLAY', l: 'Play', e: '▶️' },
                ].map((p) => (
                  <FilterChip key={p.v} active={providerFilter === p.v}
                    onClick={() => setProviderFilter(providerFilter === p.v ? '' : p.v)}
                    label={p.l} emoji={p.e} />
                ))}
              </div>
            )}
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="lg:flex-1 lg:overflow-y-auto p-2 sm:p-3 bg-slate-50/50 lg:min-h-0">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-200 animate-pulse" />)}
              </div>
            ) : viewMode === 'products' ? (
              filteredProducts.length === 0 ? (
                <EmptyState icon={Package} title="No products found" hint={search ? `Search: "${search}"` : 'Add products first'} onClear={search ? () => setSearch('') : undefined} />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                    {visibleProducts.map((p) => {
                      const profile = profileByProduct.get(p.id);
                      return <ProductTile key={p.id} product={p} profile={profile} cart={cart} hidePrices={hidePrices} onClick={() => openProduct(p)} />;
                    })}
                  </div>
                  {hasMore && (
                    <button onClick={() => setVisibleCount((c) => c + 60)}
                      className="mt-3 w-full h-12 rounded-2xl bg-white border-4 border-slate-200 hover:border-violet-400 text-slate-700 text-sm font-extrabold inline-flex items-center justify-center gap-2 transition">
                      <Package className="h-4 w-4" /> Load more ({filteredProducts.length - visibleCount} remaining)
                    </button>
                  )}
                </>
              )
            ) : (
              filteredTopups.length === 0 ? (
                <EmptyState icon={CreditCard} title="No top-up cards" hint={topupInventory.length === 0 ? 'Add cards from /gaming/topups' : 'Change filter'} />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                  {filteredTopups.map((t: any, i: number) => (
                    <TopupTile key={`${t.provider}-${t.topupType}-${t.denomination}-${i}`}
                      row={t} hidePrices={hidePrices}
                      onClick={() => openTopupPicker(t)} />
                  ))}
                </div>
              )
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
          total={total}
          discountPct={discountPct}
          setDiscountPct={setDiscountPct}
          discountAmount={discountAmount}
          hidePrices={hidePrices}
          customers={customers}
          customerId={customerId}
          setCustomerId={setCustomerId}
          selectedCustomer={selectedCustomer}
          onAddCustomer={() => setShowCustomerAdd(true)}
          onHold={holdCart}
          onClear={() => { if (confirm('Clear cart?')) clearCart(); }}
          onChangeQty={changeQty}
          onSetQty={setQtyDirect}
          onRemove={removeLine}
          onCheckout={() => setShowCheckout(true)}
          canCheckout={!!currentShopId}
        />
      </div>

      {cart.length > 0 && !showMobileCart && (
        <div className="lg:hidden fixed bottom-4 inset-x-4 z-30">
          <button onClick={() => setShowMobileCart(true)}
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-2xl active:scale-[0.98] flex items-center justify-between px-5 transition">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 min-w-[22px] h-5 px-1 rounded-full bg-white text-emerald-700 text-[11px] font-extrabold flex items-center justify-center">
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

function ViewTab({ active, onClick, icon: Icon, label, count, color, shortcut, highlight }: any) {
  const colors: Record<string, string> = {
    violet: 'bg-violet-600 text-white shadow-md',
    amber: 'bg-amber-600 text-white shadow-md',
  };
  return (
    <button onClick={onClick}
      className={`flex-1 h-12 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition relative ${
        active ? colors[color] : 'bg-transparent text-slate-600 hover:bg-slate-100'}`}>
      {highlight && !active && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {count > 0 && (
        <span className={`px-1.5 rounded-md text-[10px] ${active ? 'bg-white/25' : 'bg-slate-200 text-slate-700'}`}>{count}</span>
      )}
      <span className={`hidden lg:inline text-[9px] font-mono px-1 rounded ${active ? 'bg-white/20' : 'bg-slate-200 text-slate-500'}`}>
        {shortcut}
      </span>
    </button>
  );
}

function FilterChip({ active, onClick, label, emoji }: any) {
  return (
    <button onClick={onClick}
      className={`shrink-0 h-9 sm:h-10 px-3 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 border-2 transition ${
        active ? 'bg-violet-600 text-white border-violet-600 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300'}`}>
      <span>{emoji}</span>{label}
    </button>
  );
}

function ProductTile({ product: p, profile, cart, hidePrices, onClick }: any) {
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
            : 'border-slate-200 bg-white hover:border-violet-400 hover:shadow-xl hover:-translate-y-1'}`}>
      {cartQty > 0 && (
        <div className="absolute -top-2 -right-2 min-w-[32px] h-8 sm:min-w-[36px] sm:h-9 px-2 rounded-full bg-emerald-600 text-white text-sm sm:text-base font-extrabold flex items-center justify-center shadow-xl ring-4 ring-white z-10 tabular-nums">
          {cartQty}
        </div>
      )}
      <div className="aspect-square bg-slate-100 overflow-hidden relative">
        {img ? (
          <img src={img} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-50 to-fuchsia-50">
            <Gamepad2 className="h-12 w-12 text-violet-300" />
          </div>
        )}
        {out && <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center"><span className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs sm:text-sm font-extrabold shadow-lg">OUT</span></div>}
        {low && !out && <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-extrabold shadow-lg animate-pulse">LOW</div>}
        {profile?.isPreOrder && <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold shadow-lg inline-flex items-center gap-0.5"><Rocket className="h-2 w-2" /> PRE-ORDER</div>}
        {p.isFeatured && !profile?.isPreOrder && !out && <div className="absolute top-1.5 left-1.5 h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center shadow-lg"><Star className="h-3.5 w-3.5 fill-white text-white" /></div>}
        {profile?.isRentable && !out && (
          <div className="absolute bottom-1.5 left-1.5 h-6 px-1.5 rounded-md bg-violet-600 flex items-center gap-1 text-white text-[9px] font-extrabold shadow-lg">
            <Timer className="h-2.5 w-2.5" /> RENT
          </div>
        )}
      </div>
      <div className="p-2 sm:p-3">
        <div className="font-extrabold text-slate-900 text-sm sm:text-base line-clamp-2 leading-tight min-h-[2.25rem] sm:min-h-[2.5rem]">{p.name}</div>
        {profile?.platform && (
          <div className="text-[9px] font-extrabold uppercase text-violet-700 mt-0.5">{profile.platform.replace(/_/g, ' ')}</div>
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

function TopupTile({ row, hidePrices, onClick }: any) {
  const providerIcons: Record<string, string> = {
    PSN: '🎮', XBOX_LIVE: '🟩', STEAM: '💨', NINTENDO: '🔴',
    PUBG_UC: '🔫', ROBUX: '🎯', GOOGLE_PLAY: '▶️', APPLE_STORE: '🍎',
    FORTNITE_VBUCKS: '🎪', MOBILE_LEGENDS_DIAMONDS: '💎', FREE_FIRE_DIAMONDS: '🔥',
    NETFLIX: '🎬', SPOTIFY: '🎵', DISCORD_NITRO: '💬', ITUNES: '🎵',
  };
  const icon = providerIcons[row.provider] || '💳';

  return (
    <button onClick={onClick}
      className="group relative text-left rounded-2xl border-4 border-amber-200 bg-gradient-to-br from-white via-amber-50 to-white overflow-hidden transition-all active:scale-95 hover:border-amber-400 hover:shadow-xl hover:-translate-y-1">
      <div className="aspect-square bg-gradient-to-br from-amber-100 to-orange-100 overflow-hidden relative flex items-center justify-center">
        <div className="text-5xl sm:text-6xl">{icon}</div>
        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-amber-600 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-lg">
          Digital
        </div>
        <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-slate-900 text-white text-xs font-extrabold shadow-lg">
          {row.count} in stock
        </div>
      </div>
      <div className="p-2 sm:p-3">
        <div className="font-extrabold text-slate-900 text-sm sm:text-base line-clamp-1 leading-tight">
          {row.provider.replace(/_/g, ' ')}
        </div>
        <div className="text-[10px] font-bold text-slate-500 truncate">{row.topupType}</div>
        <div className="mt-1.5 flex items-end justify-between gap-1">
          <div>
            <div className="text-lg sm:text-2xl font-extrabold text-emerald-700 leading-none tabular-nums">
              {hidePrices ? '•••' : formatPKR(row.sellingPrice)}
            </div>
            <div className="text-[10px] text-slate-500 font-bold mt-0.5">
              ${row.denomination}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function EmptyState({ icon: Icon, title, hint, onClear }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="h-20 w-20 rounded-3xl bg-slate-200 flex items-center justify-center">
        <Icon className="h-10 w-10 text-slate-400" />
      </div>
      <h3 className="mt-4 font-extrabold text-slate-900 text-xl">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 text-center font-semibold">{hint}</p>
      {onClear && (
        <button onClick={onClear} className="mt-4 h-12 px-5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold transition inline-flex items-center gap-2">
          Clear
        </button>
      )}
    </div>
  );
}

function CartPanel({
  isMobile, onCloseMobile, cart, itemCount, totalQty, subtotal, total,
  discountPct, setDiscountPct, discountAmount, hidePrices, customers, customerId,
  setCustomerId, selectedCustomer, onAddCustomer, onHold, onClear, onChangeQty,
  onSetQty, onRemove, onCheckout, canCheckout,
}: any) {
  const containerClass = isMobile
    ? 'fixed inset-0 z-40 bg-white flex flex-col lg:hidden animate-in slide-in-from-bottom duration-200'
    : 'hidden lg:flex rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden flex-col min-h-0';

  return (
    <aside className={containerClass}>
      <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] uppercase font-extrabold text-white/70 tracking-wider">
              Cart • {itemCount} lines • {totalQty} qty
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tabular-nums leading-none mt-1">
              {hidePrices ? '••••' : formatPKR(total)}
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {cart.length > 0 && (
              <>
                <button onClick={onHold}
                  className="h-10 sm:h-12 px-2.5 rounded-2xl bg-white/15 hover:bg-amber-500/50 text-white text-xs sm:text-sm font-extrabold border-2 border-white/20 transition inline-flex items-center gap-1">
                  <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Hold
                </button>
                <button onClick={onClear}
                  className="h-10 sm:h-12 px-2.5 rounded-2xl bg-white/15 hover:bg-rose-500/50 text-white text-xs sm:text-sm font-extrabold border-2 border-white/20 transition">
                  Clear
                </button>
              </>
            )}
            {isMobile && (
              <button onClick={onCloseMobile}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center border-2 border-white/20 transition">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 px-3 py-2.5 border-b-2 border-slate-100 bg-slate-50">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
              className="h-12 sm:h-14 w-full rounded-2xl border-4 border-slate-200 bg-white pl-10 sm:pl-11 pr-9 text-sm sm:text-base font-bold focus:outline-none focus:border-violet-500 appearance-none">
              <option value="">Walk-in Customer</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.balance > 0 ? ` • Balance ${formatPKR(c.balance)}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button onClick={onAddCustomer}
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow-md shrink-0 transition">
            <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2 bg-slate-50/50 min-h-0">
        {cart.length === 0 ? (
          <div className="rounded-3xl bg-white border-4 border-dashed border-slate-200 p-8 sm:p-10 text-center">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-slate-100 mx-auto flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
            </div>
            <p className="mt-4 font-extrabold text-slate-700 text-lg sm:text-xl">Cart is empty</p>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">Tap product or top-up card</p>
          </div>
        ) : (
          cart.map((l: CartLine) => (
            <div key={l.id} className={`rounded-2xl bg-white border-4 p-2.5 sm:p-3 shadow-sm ${
              l.type === 'topup' ? 'border-amber-300' : l.isPreOrder ? 'border-amber-300' : 'border-slate-200'}`}>
              <div className="flex items-start gap-2.5 sm:gap-3">
                <div className={`h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center relative ${
                  l.type === 'topup' ? 'bg-gradient-to-br from-amber-100 to-orange-100' : 'bg-slate-100'}`}>
                  {l.type === 'topup' ? <CreditCard className="h-7 w-7 text-amber-700" /> :
                    l.image ? <img src={l.image} alt="" className="w-full h-full object-cover" /> : <Gamepad2 className="h-6 w-6 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight line-clamp-2">{l.name}</div>
                    {l.type === 'topup' && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-600 text-white text-[9px] font-extrabold uppercase tracking-wider shrink-0">Digital</span>
                    )}
                    {l.isPreOrder && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase tracking-wider shrink-0">Pre-order</span>
                    )}
                  </div>
                  {l.platform && <div className="text-[10px] font-bold text-slate-500 mt-0.5">{l.platform.replace(/_/g, ' ')}</div>}
                  <div className="text-xs sm:text-sm font-bold text-violet-700 mt-0.5">{formatPKR(l.unitPrice)}</div>
                  {l.note && <div className="text-[10px] sm:text-[11px] font-semibold text-amber-700 mt-1 bg-amber-50 px-2 py-1 rounded-lg">{l.note}</div>}
                </div>
                <button onClick={() => onRemove(l.id)}
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 transition">
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              <div className="mt-2.5 sm:mt-3 flex items-center justify-between gap-2">
                <div className="inline-flex items-center bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200">
                  <button onClick={() => onChangeQty(l.id, -1)} className="h-12 sm:h-14 w-12 sm:w-14 hover:bg-slate-200 flex items-center justify-center transition">
                    <Minus className="h-5 w-5 sm:h-6 sm:w-6 text-slate-700" />
                  </button>
                  <input type="number" value={l.quantity}
                    onChange={(e) => onSetQty(l.id, Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    disabled={l.type === 'topup'}
                    className="h-12 sm:h-14 min-w-[70px] w-[70px] sm:min-w-[80px] sm:w-[80px] text-center bg-white border-0 text-lg sm:text-xl font-extrabold tabular-nums focus:outline-none disabled:opacity-70" />
                  <button onClick={() => onChangeQty(l.id, 1)}
                    disabled={l.type === 'topup'}
                    className={`h-12 sm:h-14 w-12 sm:w-14 text-white flex items-center justify-center transition ${
                      l.type === 'topup' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-violet-600 hover:bg-violet-700'}`}>
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
                  className={`flex-1 h-9 sm:h-10 rounded-xl text-[11px] sm:text-xs font-extrabold transition ${
                    discountPct === d ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                  {d === 0 ? 'None' : `${d}%`}
                </button>
              ))}
            </div>
          </div>

          <button onClick={onCheckout} disabled={!canCheckout}
            className="w-full h-[76px] sm:h-[88px] rounded-3xl font-extrabold text-white shadow-2xl transition-all active:scale-[0.98] bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between px-5 sm:px-6">
            <div className="text-left">
              <div className="text-[10px] sm:text-xs uppercase font-extrabold text-white/80 tracking-wider">
                Checkout <span className="hidden sm:inline">(F9)</span>
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
