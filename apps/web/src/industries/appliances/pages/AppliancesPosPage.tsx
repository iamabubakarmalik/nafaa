import { useState, useMemo, useEffect, useRef, useCallback, forwardRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Package, X, Camera, ScanLine,
  CheckCircle2, ArrowRight, Printer, Pause, Play,
  Home, Wifi, WifiOff, HardHat, UserPlus,
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
import { applianceProductsApi } from '../api/products.api';
import { applianceSerialApi } from '../api/serial-tracking.api';
import { installationsApi } from '../api/installations.api';
import { ApplianceProductTile } from '../components/pos/ApplianceProductTile';
import { ApplianceCartPanel } from '../components/pos/ApplianceCartPanel';
import { InstallationBookingModal } from '../components/pos/InstallationBookingModal';
import { NewCustomerModal } from '../components/pos/NewCustomerModal';
import { CategoryChips } from '../components/pos/CategoryChips';

const HIDE_PRICES_KEY = 'nafaa.appliances-pos.hide-prices';

export interface CartLine {
  id: string;
  productId: string;
  name: string;
  image?: string;
  modelNumber?: string;
  brandName?: string;
  capacity?: string;
  unitPrice: number;
  quantity: number;
  baseStock: number;
  lineTotal: number;
  serialTrackingId?: string;
  serialNumber?: string;
  warrantyMonths?: number;
  requiresInstallation?: boolean;
  installationCharge?: number;
  installationCovered?: boolean;
  bookInstallation?: boolean;
  installationScheduledDate?: string;
  installationTimeSlot?: string;
  requiresLargeVehicle?: boolean;
  note?: string;
}

interface HeldCart {
  id: string; lines: CartLine[]; customerId: string; total: number; heldAt: number;
}

const lineId = () => `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const heldId = () => `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function AppliancesPosPage() {
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const tenant = useAuthStore((s) => s.tenant);

  const [hidePrices, setHidePrices] = useState(() => localStorage.getItem(HIDE_PRICES_KEY) === 'true');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryType, setCategoryType] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [showInstallationBooking, setShowInstallationBooking] = useState<CartLine | null>(null);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [lastSale, setLastSale] = useState<{ id: string; number: string; change: number; total: number; installationsBooked: number } | null>(null);
  const [visibleCount, setVisibleCount] = useState(60);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem(HIDE_PRICES_KEY, String(hidePrices)); }, [hidePrices]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 120);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    setVisibleCount(60);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [debouncedSearch, categoryType]);

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
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); setScannerOpen(true); }
      if (e.key === 'F9') { e.preventDefault(); if (cart.length > 0) setShowCheckout(true); }
      if (e.key === 'Escape') {
        if (scannerOpen) setScannerOpen(false);
        if (showCheckout) setShowCheckout(false);
        if (showInstallationBooking) setShowInstallationBooking(null);
        if (showMobileCart) setShowMobileCart(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart.length, scannerOpen, showCheckout, showInstallationBooking, showMobileCart]);

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-for-appliances-pos'],
    queryFn: () => productsApi.list({ page: 1, limit: 2000 }),
    staleTime: 30_000,
  });
  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
    staleTime: 60_000,
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ['appliance-profiles-all'],
    queryFn: () => applianceProductsApi.list(),
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
    if (categoryType) {
      list = list.filter((p) => {
        const profile = profileByProduct.get(p.id);
        return profile?.categoryType === categoryType;
      });
    }
    const q = debouncedSearch.toLowerCase().trim();
    if (q) {
      list = list.filter((p) => {
        const profile = profileByProduct.get(p.id);
        return p.name.toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.barcode || '').toLowerCase().includes(q) ||
          (profile?.modelNumber || '').toLowerCase().includes(q) ||
          (profile?.capacity || '').toLowerCase().includes(q);
      });
    }
    return list.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      const aOut = a.stock <= 0, bOut = b.stock <= 0;
      if (aOut !== bOut) return aOut ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [products, debouncedSearch, categoryType, profileByProduct]);

  const visibleProducts = useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);
  const hasMore = filteredProducts.length > visibleCount;

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.lineTotal, 0), [cart]);
  const installationCharges = useMemo(() =>
    cart.filter((l) => l.bookInstallation && !l.installationCovered).reduce((s, l) => s + Number(l.installationCharge || 0), 0),
    [cart]
  );
  const discountAmount = useMemo(() => (subtotal * discountPct) / 100, [subtotal, discountPct]);
  const total = useMemo(() => subtotal - discountAmount + installationCharges, [subtotal, discountAmount, installationCharges]);
  const itemCount = cart.length;
  const totalQty = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);
  const installsBooked = useMemo(() => cart.filter((l) => l.bookInstallation).length, [cart]);

  const addProductLine = (product: Product, qty: number, profile?: any, serial?: any) => {
    const existing = cart.find((l) => l.productId === product.id && (!serial || l.serialTrackingId === serial.id));
    if (existing && !serial) {
      const newQty = existing.quantity + qty;
      if (newQty > product.stock) { toast.error(`Stock only ${product.stock}`); return; }
      setCart((prev) => prev.map((l) => l.id === existing.id
        ? { ...l, quantity: newQty, lineTotal: newQty * l.unitPrice } : l));
      toast.success(`${product.name} +${qty}`, { duration: 900 });
      return;
    }
    setCart((prev) => [...prev, {
      id: lineId(),
      productId: product.id,
      name: product.name,
      image: product.images?.[0]?.url,
      modelNumber: profile?.modelNumber,
      brandName: profile?.brand?.name,
      capacity: profile?.capacity,
      unitPrice: product.price,
      quantity: qty,
      baseStock: product.stock,
      lineTotal: qty * product.price,
      serialTrackingId: serial?.id,
      serialNumber: serial?.serialNumber,
      warrantyMonths: profile?.warrantyMonths,
      requiresInstallation: profile?.requiresInstallation ?? false,
      installationCharge: profile?.installationCharge ?? 0,
      installationCovered: profile?.installationCovered ?? false,
      requiresLargeVehicle: profile?.requiresLargeVehicle ?? false,
      bookInstallation: false,
    }]);
    toast.success(`${product.name} added`, { duration: 900 });
  };

  const openProduct = useCallback(async (product: Product) => {
    if (product.stock <= 0) { toast.error(`${product.name} — out of stock`); return; }
    const profile = profileByProduct.get(product.id);
    addProductLine(product, 1, profile);
  }, [profileByProduct, cart]);

  const changeQty = (id: string, delta: number) => {
    setCart((prev) => prev.flatMap((l) => {
      if (l.id !== id) return [l];
      if (l.serialTrackingId && delta > 0) { toast.error('Serial-tracked items limited to qty 1'); return [l]; }
      const nextQty = l.quantity + delta;
      if (nextQty <= 0) return [];
      if (nextQty > l.baseStock) { toast.error(`Stock only ${l.baseStock}`); return [l]; }
      return [{ ...l, quantity: nextQty, lineTotal: nextQty * l.unitPrice }];
    }));
  };

  const setQtyDirect = (id: string, qty: number) => {
    setCart((prev) => prev.flatMap((l) => {
      if (l.id !== id) return [l];
      if (qty <= 0) return [];
      if (l.serialTrackingId && qty > 1) { toast.error('Serial-tracked items limited to qty 1'); return [l]; }
      if (qty > l.baseStock) { toast.error(`Stock only ${l.baseStock}`); return [l]; }
      return [{ ...l, quantity: qty, lineTotal: qty * l.unitPrice }];
    }));
  };

  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.id !== id));
  const clearCart = () => { setCart([]); setCustomerId(''); setDiscountPct(0); setDeliveryAddress(''); };

  const toggleInstallation = (line: CartLine) => {
    if (!line.bookInstallation) {
      setShowInstallationBooking(line);
    } else {
      setCart((prev) => prev.map((l) => l.id === line.id
        ? { ...l, bookInstallation: false, installationScheduledDate: undefined, installationTimeSlot: undefined }
        : l));
    }
  };

  const confirmInstallation = (line: CartLine, scheduledDate: string, timeSlot: string) => {
    setCart((prev) => prev.map((l) => l.id === line.id
      ? { ...l, bookInstallation: true, installationScheduledDate: scheduledDate, installationTimeSlot: timeSlot }
      : l));
    setShowInstallationBooking(null);
    toast.success('Installation booked');
  };

  const handleBarcode = async (code: string) => {
    setScannerOpen(false);
    const trimmed = code.trim();
    if (!trimmed) return;

    try {
      const serial = await applianceSerialApi.lookup(trimmed);
      if (serial && serial.status === 'IN_STOCK') {
        const product = products.find((p) => p.id === serial.productId);
        if (product) {
          const profile = profileByProduct.get(product.id);
          addProductLine(product, 1, profile, serial);
          return;
        }
      }
    } catch {}

    try {
      const product = await productsApi.byBarcode(trimmed);
      await openProduct(product);
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
  };

  const checkoutMutation = useMutation({
    mutationFn: async (data: { paymentMethod: PaymentMethod; paidAmount: number }) => {
      if (!currentShopId) throw new Error('Select shop first');

      const items = cart.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        priceOverride: l.unitPrice,
        note: l.note,
      }));

      const sale = await offlineSalesApi.create({
        shopId: currentShopId,
        customerId: customerId || undefined,
        paymentMethod: data.paymentMethod,
        paidAmount: data.paidAmount,
        discount: discountAmount,
        items,
      });

      let installationsBooked = 0;
      for (const line of cart) {
        if (line.bookInstallation && line.installationScheduledDate) {
          try {
            await installationsApi.create({
              productId: line.productId,
              productName: line.name,
              serialNumber: line.serialNumber,
              serialTrackingId: line.serialTrackingId,
              saleId: sale.id,
              customerId: customerId || undefined,
              customerName: selectedCustomer?.name || 'Walk-in',
              customerPhone: selectedCustomer?.phone || '',
              customerAddress: deliveryAddress || selectedCustomer?.address || '',
              serviceType: 'INSTALLATION',
              scheduledDate: line.installationScheduledDate,
              scheduledTimeSlot: line.installationTimeSlot,
            });
            installationsBooked++;
          } catch {}
        }

        if (line.serialTrackingId) {
          try {
            await applianceSerialApi.update(line.serialTrackingId, {
              status: 'SOLD',
              soldPrice: line.unitPrice,
              soldAt: new Date().toISOString(),
              soldToCustomerId: customerId,
              customerName: selectedCustomer?.name,
              customerPhone: selectedCustomer?.phone,
              saleId: sale.id,
              invoiceNumber: sale.saleNumber,
              deliveryAddress,
            } as any);
          } catch {}
        }
      }

      return { sale, installationsBooked };
    },
    onSuccess: ({ sale, installationsBooked }, vars) => {
      const change = Math.max(vars.paidAmount - total, 0);
      setLastSale({ id: sale.id, number: sale.saleNumber, change, total, installationsBooked });
      setShowCheckout(false);
      setShowMobileCart(false);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['products-for-appliances-pos'] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      queryClient.invalidateQueries({ queryKey: ['installations-list'] });
      const autoOpen = localStorage.getItem('nafaa.pos.auto-open-receipt') !== 'false';
      if (autoOpen) window.open(`/sales/${sale.id}/receipt?auto=1`, '_blank');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Sale failed'),
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

      {showInstallationBooking && (
        <InstallationBookingModal
          line={showInstallationBooking}
          onConfirm={(date, slot) => confirmInstallation(showInstallationBooking, date, slot)}
          onClose={() => setShowInstallationBooking(null)}
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
        <SaleSuccessModal
          sale={lastSale}
          onClose={() => setLastSale(null)}
          onPrint={() => window.open(`/sales/${lastSale.id}/receipt`, '_blank')}
        />
      )}

      {showCustomerAdd && (
        <NewCustomerModal
          onClose={() => setShowCustomerAdd(false)}
          onCreated={(customer) => {
            setCustomerId(customer.id);
            setShowCustomerAdd(false);
            queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
          }}
        />
      )}

      {showHeldCarts && (
        <HeldCartsModal
          carts={heldCarts}
          onResume={resumeCart}
          onClose={() => setShowHeldCarts(false)}
        />
      )}

      <div className="min-h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-7rem)] flex flex-col lg:grid lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_480px] gap-2 lg:gap-3">

        {/* LEFT PANEL */}
        <section className="lg:flex-1 rounded-2xl lg:rounded-3xl bg-white border-2 border-slate-200 shadow-sm lg:overflow-hidden flex flex-col lg:min-h-0">
          <PosHeader
            tenantName={tenant?.name}
            isOnline={isOnline}
            hidePrices={hidePrices}
            onTogglePrices={() => setHidePrices((v) => !v)}
            heldCount={heldCarts.length}
            onShowHeld={() => setShowHeldCarts(true)}
            cartCount={itemCount}
            onShowMobileCart={() => setShowMobileCart(true)}
          />

          <div className="shrink-0 px-3 sm:px-4 py-2.5 bg-slate-50 border-b-2 border-slate-100 space-y-2">
            <SearchBar
              value={search}
              onChange={setSearch}
              onOpenScanner={() => setScannerOpen(true)}
            />
            <BarcodeInput
              ref={barcodeRef}
              value={barcodeInput}
              onChange={setBarcodeInput}
              onSubmit={() => { if (barcodeInput.trim()) { handleBarcode(barcodeInput); setBarcodeInput(''); } }}
            />
            <CategoryChips
              value={categoryType}
              onChange={setCategoryType}
              productCount={products.length}
            />
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="lg:flex-1 lg:overflow-y-auto p-2 sm:p-3 bg-slate-50/50 lg:min-h-0">
            {loadingProducts ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-200 animate-pulse" />)}
              </div>
            ) : filteredProducts.length === 0 ? (
              <EmptyProducts search={search} onClear={search ? () => setSearch('') : undefined} />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                  {visibleProducts.map((p) => {
                    const profile = profileByProduct.get(p.id);
                    return <ApplianceProductTile key={p.id} product={p} profile={profile} cart={cart} hidePrices={hidePrices} onClick={() => openProduct(p)} />;
                  })}
                </div>
                {hasMore && (
                  <button onClick={() => setVisibleCount((c) => c + 60)}
                    className="mt-3 w-full h-12 rounded-2xl bg-white border-4 border-slate-200 hover:border-cyan-400 text-slate-700 text-sm font-extrabold inline-flex items-center justify-center gap-2 transition">
                    <Package className="h-4 w-4" /> Load more ({filteredProducts.length - visibleCount} remaining)
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        <ApplianceCartPanel
          isMobile={showMobileCart}
          onCloseMobile={() => setShowMobileCart(false)}
          cart={cart}
          itemCount={itemCount}
          totalQty={totalQty}
          subtotal={subtotal}
          installationCharges={installationCharges}
          total={total}
          installsBooked={installsBooked}
          discountPct={discountPct}
          setDiscountPct={setDiscountPct}
          discountAmount={discountAmount}
          hidePrices={hidePrices}
          customers={customers}
          customerId={customerId}
          setCustomerId={setCustomerId}
          selectedCustomer={selectedCustomer}
          deliveryAddress={deliveryAddress}
          setDeliveryAddress={setDeliveryAddress}
          onAddCustomer={() => setShowCustomerAdd(true)}
          onHold={holdCart}
          onClear={() => { if (confirm('Clear cart?')) clearCart(); }}
          onChangeQty={changeQty}
          onSetQty={setQtyDirect}
          onRemove={removeLine}
          onToggleInstallation={toggleInstallation}
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

/* ══════════ Inline mini components ══════════ */

function PosHeader({ tenantName, isOnline, hidePrices, onTogglePrices, heldCount, onShowHeld, cartCount, onShowMobileCart }: any) {
  return (
    <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-cyan-900 to-teal-700 text-white">
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-cyan-400/20 blur-2xl" />
      <div className="relative px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-2 ring-white/20 shrink-0">
            <Home className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold leading-none">🏠 Appliances POS</h2>
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
            <p className="text-[11px] sm:text-xs text-white/80 font-semibold mt-0.5 truncate">
              {tenantName || 'Appliances Store'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {heldCount > 0 && (
            <button onClick={onShowHeld}
              className="h-10 sm:h-11 px-2.5 rounded-2xl bg-amber-500/30 hover:bg-amber-500/50 text-white text-xs font-extrabold inline-flex items-center gap-1 border-2 border-amber-300/40 transition">
              <Pause className="h-4 w-4" /> {heldCount}
            </button>
          )}
          <button onClick={onTogglePrices}
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center border-2 border-white/20 transition">
            {hidePrices ? '👁️‍🗨️' : '👁️'}
          </button>
          <button onClick={onShowMobileCart}
            className="lg:hidden relative h-10 w-10 rounded-2xl bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchBar({ value, onChange, onOpenScanner }: any) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
        <input
          className="h-14 sm:h-16 w-full rounded-2xl border-4 border-slate-200 bg-white pl-11 sm:pl-14 pr-10 sm:pr-12 text-lg sm:text-xl font-bold focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-200 transition"
          placeholder="Product / model / capacity..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center transition">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        )}
      </div>
      <button onClick={onOpenScanner}
        className="h-14 sm:h-16 w-16 sm:w-20 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 text-white flex flex-col items-center justify-center gap-0.5 shadow-lg transition shrink-0">
        <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
        <span className="text-[9px] sm:text-[10px] font-extrabold uppercase">Scan</span>
      </button>
    </div>
  );
}

const BarcodeInput = forwardRef<HTMLInputElement, { value: string; onChange: (v: string) => void; onSubmit: () => void }>(
  ({ value, onChange, onSubmit }, ref) => {
    return (
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="relative">
        <ScanLine className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Barcode / Serial (auto-detect)..."
          className="h-10 sm:h-12 w-full rounded-2xl border-2 border-cyan-300 bg-cyan-50 pl-10 sm:pl-11 pr-3 text-sm sm:text-base font-mono font-extrabold focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-200"
        />
      </form>
    );
  }
);

BarcodeInput.displayName = 'BarcodeInput';


function EmptyProducts({ search, onClear }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="h-20 w-20 rounded-3xl bg-slate-200 flex items-center justify-center">
        <Home className="h-10 w-10 text-slate-400" />
      </div>
      <h3 className="mt-4 font-extrabold text-slate-900 text-xl">No appliances found</h3>
      <p className="mt-2 text-sm text-slate-500 text-center font-semibold">{search ? `Search: "${search}"` : 'Add products first'}</p>
      {onClear && (
        <button onClick={onClear} className="mt-4 h-12 px-5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold transition">
          Clear
        </button>
      )}
    </div>
  );
}

function SaleSuccessModal({ sale, onClose, onPrint }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="relative px-6 py-8 bg-gradient-to-br from-emerald-500 to-green-600 text-white text-center">
          <button onClick={onClose} className="absolute top-3 right-3 h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
          <div className="h-20 w-20 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-3">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h3 className="text-3xl font-extrabold">Sale Complete! 🎉</h3>
          <p className="text-sm font-bold text-white/90 mt-1 font-mono">{sale.number}</p>
          {sale.installationsBooked > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1 text-xs font-extrabold">
              <HardHat className="h-3 w-3" /> {sale.installationsBooked} installations booked
            </div>
          )}
        </div>
        {sale.change > 0 && (
          <div className="px-6 py-5 bg-amber-50 border-b-4 border-amber-200 text-center">
            <div className="text-xs uppercase font-extrabold text-amber-800 tracking-wider">Give change</div>
            <div className="text-5xl font-extrabold text-amber-700 tabular-nums mt-1">{formatPKR(sale.change)}</div>
          </div>
        )}
        <div className="p-4 grid grid-cols-2 gap-2">
          <button onClick={onPrint} className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 font-extrabold text-slate-700 transition inline-flex items-center justify-center gap-2">
            <Printer className="h-5 w-5" /> Receipt
          </button>
          <button onClick={onClose} className="h-14 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 font-extrabold text-white text-lg shadow-lg transition inline-flex items-center justify-center gap-2">
            New Sale <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function HeldCartsModal({ carts, onResume, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pause className="h-6 w-6" />
            <h3 className="font-extrabold text-xl">Held Carts</h3>
          </div>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {carts.length === 0 ? (
            <div className="text-center py-12">
              <Pause className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="font-extrabold text-slate-700">No held carts</p>
            </div>
          ) : carts.map((h: any) => (
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
              <button onClick={() => onResume(h)} className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
                <Play className="h-3.5 w-3.5" /> Resume
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
