import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Package, X, Plus, Minus, Trash2,
  Camera, ScanLine, User, UserPlus, CheckCircle2, Store,
  ChevronDown, Eye, EyeOff, ArrowRight, Printer, Star,
  Pause, Play, Percent, Footprints, Ruler, MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { offlineProductsApi as productsApi } from '@core/lib/offline/offlineProducts';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { RetailQuickCash } from '@industries/retail/components/pos';
import { shoeProductsApi } from '../api/products.api';
import { shoeSizeVariantsApi } from '../api/size-variants.api';
import { SizePickerModal } from '../components/pos/SizePickerModal';

interface CartLine {
  id: string;
  productId: string;
  sizeVariantId: string;
  name: string;
  size: string;
  sizeSystem: string;
  image?: string;
  unitPrice: number;
  quantity: number;
  boxNumber?: string;
  shelfLocation?: string;
  lineTotal: number;
}

const lineId = () => `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function ShoePosPage() {
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const tenant = useAuthStore((s) => s.tenant);

  const [hidePrices, setHidePrices] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [sizePickerProduct, setSizePickerProduct] = useState<any>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [lastSale, setLastSale] = useState<{ id: string; number: string; change: number; total: number } | null>(null);

  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 120);
    return () => clearTimeout(t);
  }, [search]);

  const { data: productsData } = useQuery({
    queryKey: ['products-for-shoe-pos'],
    queryFn: () => productsApi.list({ page: 1, limit: 2000 }),
    staleTime: 30_000,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
    staleTime: 60_000,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['shoe-profiles-pos'],
    queryFn: () => shoeProductsApi.list(),
    staleTime: 60_000,
  });

  const products = productsData?.items ?? [];
  const customers = customersData?.items ?? [];
  const selectedCustomer = customers.find((c: any) => c.id === customerId);

  const profileByProduct = useMemo(() => {
    const map = new Map<string, any>();
    (profiles as any[]).forEach((p) => map.set(p.productId, p));
    return map;
  }, [profiles]);

  const filteredProducts = useMemo(() => {
    let list = products.filter((p: any) => p.isActive !== false);
    if (genderFilter) list = list.filter((p: any) => profileByProduct.get(p.id)?.gender === genderFilter);
    const q = debouncedSearch.toLowerCase().trim();
    if (q) {
      list = list.filter((p: any) => {
        const pr = profileByProduct.get(p.id);
        return p.name.toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (pr?.modelName || '').toLowerCase().includes(q) ||
          (pr?.colorName || '').toLowerCase().includes(q);
      });
    }
    return list;
  }, [products, debouncedSearch, genderFilter, profileByProduct]);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.lineTotal, 0), [cart]);
  const discountAmount = useMemo(() => (subtotal * discountPct) / 100, [subtotal, discountPct]);
  const total = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);
  const itemCount = cart.length;

  const openProduct = (product: any) => {
    setSizePickerProduct(product);
  };

  const addToCart = (product: any, variant: any) => {
    const existing = cart.find((l) => l.sizeVariantId === variant.id);
    if (existing) {
      if (existing.quantity + 1 > variant.stock) {
        toast.error(`Only ${variant.stock} in stock for size ${variant.size}`);
        return;
      }
      setCart((prev) => prev.map((l) => l.id === existing.id
        ? { ...l, quantity: l.quantity + 1, lineTotal: (l.quantity + 1) * l.unitPrice } : l));
      toast.success(`Size ${variant.size} +1`);
      return;
    }
    const unitPrice = variant.priceOverride || product.price;
    setCart((prev) => [...prev, {
      id: lineId(),
      productId: product.id,
      sizeVariantId: variant.id,
      name: product.name,
      size: variant.size,
      sizeSystem: variant.sizeSystem,
      image: product.images?.[0]?.url,
      unitPrice,
      quantity: 1,
      boxNumber: variant.boxNumber,
      shelfLocation: variant.shelfLocation,
      lineTotal: unitPrice,
    }]);
    toast.success(`${product.name} • Size ${variant.size} added`);
    setSizePickerProduct(null);
  };

  const changeQty = (id: string, delta: number) => {
    setCart((prev) => prev.flatMap((l) => {
      if (l.id !== id) return [l];
      const nextQty = l.quantity + delta;
      if (nextQty <= 0) return [];
      return [{ ...l, quantity: nextQty, lineTotal: nextQty * l.unitPrice }];
    }));
  };

  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.id !== id));

  const clearCart = () => { setCart([]); setCustomerId(''); setDiscountPct(0); };

  const handleBarcode = async (code: string) => {
    setScannerOpen(false);
    const trimmed = code.trim();
    if (!trimmed) return;
    try {
      const variant = await shoeSizeVariantsApi.byBarcode(trimmed);
      if (variant) {
        const product = products.find((p: any) => p.id === variant.productId);
        if (product) addToCart(product, variant);
        else toast.error('Product not found');
      } else {
        const product = await productsApi.byBarcode(trimmed);
        openProduct(product);
      }
    } catch { toast.error(`Barcode "${trimmed}" not found`); }
  };

  const checkoutMutation = useMutation({
    mutationFn: async (data: { paymentMethod: PaymentMethod; paidAmount: number }) => {
      if (!currentShopId) throw new Error('Select shop first');
      return salesApi.create({
        shopId: currentShopId,
        customerId: customerId || undefined,
        paymentMethod: data.paymentMethod,
        paidAmount: data.paidAmount,
        discount: discountAmount,
        items: cart.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          priceOverride: l.unitPrice,
          note: `Size ${l.size} ${l.sizeSystem}${l.boxNumber ? ` • Box ${l.boxNumber}` : ''}`,
        })),
      });
    },
    onSuccess: (sale, vars) => {
      const change = Math.max(vars.paidAmount - total, 0);
      setLastSale({ id: sale.id, number: sale.saleNumber, change, total });
      setShowCheckout(false);
      setShowMobileCart(false);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['products-for-shoe-pos'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Sale failed'),
  });

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScannerOpen(false)} />}
      {sizePickerProduct && (
        <SizePickerModal product={sizePickerProduct}
          onSelect={(variant) => addToCart(sizePickerProduct, variant)}
          onClose={() => setSizePickerProduct(null)} />
      )}
      {showCheckout && (
        <RetailQuickCash total={total} itemCount={itemCount} loading={checkoutMutation.isPending}
          customerName={selectedCustomer?.name} customerBalance={Number(selectedCustomer?.balance || 0)}
          hasCustomer={!!customerId}
          onConfirm={({ paymentMethod, paidAmount }) => checkoutMutation.mutate({ paymentMethod, paidAmount })}
          onClose={() => setShowCheckout(false)} />
      )}
      {lastSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-6 bg-gradient-to-br from-emerald-500 to-green-600 text-white text-center">
              <div className="h-16 w-16 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-extrabold">Sale Complete! 👟</h3>
              <p className="text-sm font-bold text-white/90 mt-1 font-mono">{lastSale.number}</p>
            </div>
            {lastSale.change > 0 && (
              <div className="px-6 py-4 bg-amber-50 border-b-4 border-amber-200 text-center">
                <div className="text-xs uppercase font-extrabold text-amber-800">Give change</div>
                <div className="text-4xl font-extrabold text-amber-700 tabular-nums mt-1">{formatPKR(lastSale.change)}</div>
              </div>
            )}
            <div className="p-4 grid grid-cols-2 gap-2">
              <button onClick={() => window.open(`/sales/${lastSale.id}/receipt`, '_blank')}
                className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 font-extrabold text-slate-700 inline-flex items-center justify-center gap-2">
                <Printer className="h-5 w-5" /> Receipt
              </button>
              <button onClick={() => setLastSale(null)}
                className="h-14 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-700 font-extrabold text-white shadow-lg inline-flex items-center justify-center gap-2">
                New Sale <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-7rem)] flex flex-col lg:grid lg:grid-cols-[1fr_400px] gap-2 lg:gap-3">
        {/* PRODUCT PANEL */}
        <section className="lg:flex-1 rounded-2xl lg:rounded-3xl bg-white border-2 border-slate-200 shadow-sm flex flex-col lg:min-h-0">
          <div className="shrink-0 bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center">
                  <Footprints className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-extrabold leading-none">👟 Shoe POS</h2>
                  <p className="text-xs text-white/80 font-semibold mt-0.5 truncate">{tenant?.name || 'Shoe Store'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setHidePrices((v) => !v)}
                  className="h-10 w-10 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
                  {hidePrices ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                <button onClick={() => setShowMobileCart(true)}
                  className="lg:hidden relative h-10 w-10 rounded-2xl bg-emerald-500 flex items-center justify-center">
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

          <div className="shrink-0 px-4 py-2.5 bg-slate-50 border-b-2 border-slate-100 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-6 w-6 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input className="h-16 w-full rounded-2xl border-4 border-slate-200 bg-white pl-14 pr-12 text-xl font-bold focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-200"
                  placeholder="Product / model / colour..."
                  value={search} onChange={(e) => setSearch(e.target.value)} />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center">
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                )}
              </div>
              <button onClick={() => setScannerOpen(true)}
                className="h-16 w-20 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center gap-0.5 shadow-lg">
                <Camera className="h-6 w-6" />
                <span className="text-[10px] font-extrabold uppercase">Scan</span>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (barcodeInput.trim()) { handleBarcode(barcodeInput); setBarcodeInput(''); } }} className="relative">
              <ScanLine className="h-5 w-5 text-orange-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input ref={barcodeRef} value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan size variant barcode..."
                className="h-12 w-full rounded-2xl border-2 border-orange-300 bg-orange-50 pl-11 pr-3 text-base font-mono font-extrabold focus:outline-none focus:border-orange-600" />
            </form>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                { v: '', l: 'All', e: '🌐' },
                { v: 'MEN', l: 'Men', e: '👨' },
                { v: 'WOMEN', l: 'Women', e: '👩' },
                { v: 'BOYS', l: 'Boys', e: '👦' },
                { v: 'GIRLS', l: 'Girls', e: '👧' },
                { v: 'UNISEX', l: 'Unisex', e: '🧑' },
              ].map((g) => (
                <button key={g.v} onClick={() => setGenderFilter(genderFilter === g.v ? '' : g.v)}
                  className={`shrink-0 h-10 px-3 rounded-xl text-sm font-extrabold inline-flex items-center gap-1.5 border-2 transition ${
                    genderFilter === g.v ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'}`}>
                  <span>{g.e}</span>{g.l}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:flex-1 lg:overflow-y-auto p-3 bg-slate-50/50 lg:min-h-0">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Footprints className="h-16 w-16 text-slate-300 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((p: any) => (
                  <ProductTile key={p.id} product={p} profile={profileByProduct.get(p.id)} hidePrices={hidePrices} onClick={() => openProduct(p)} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CART PANEL */}
        <CartPanel isMobile={showMobileCart} onCloseMobile={() => setShowMobileCart(false)}
          cart={cart} itemCount={itemCount} subtotal={subtotal} total={total}
          discountPct={discountPct} setDiscountPct={setDiscountPct}
          hidePrices={hidePrices} customers={customers} customerId={customerId}
          setCustomerId={setCustomerId} selectedCustomer={selectedCustomer}
          onAddCustomer={() => setShowCustomerAdd(true)}
          onClear={() => { if (confirm('Clear cart?')) clearCart(); }}
          onChangeQty={changeQty} onRemove={removeLine}
          onCheckout={() => setShowCheckout(true)}
          canCheckout={!!currentShopId} />
      </div>

      {cart.length > 0 && !showMobileCart && (
        <div className="lg:hidden fixed bottom-4 inset-x-4 z-30">
          <button onClick={() => setShowMobileCart(true)}
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-2xl flex items-center justify-between px-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 min-w-[22px] h-5 px-1 rounded-full bg-white text-emerald-700 text-[11px] font-extrabold flex items-center justify-center">
                  {itemCount}
                </span>
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-extrabold text-white/80">Cart</div>
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

function ProductTile({ product: p, profile, hidePrices, onClick }: any) {
  const stock = Number(p.stock || 0);
  const out = stock <= 0;
  return (
    <button onClick={onClick} disabled={out}
      className={`group relative text-left rounded-2xl border-4 overflow-hidden transition active:scale-95 ${
        out ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
          : 'border-slate-200 bg-white hover:border-orange-400 hover:shadow-xl'}`}>
      <div className="aspect-square bg-slate-100 overflow-hidden relative">
        {p.images?.[0]?.url ? (
          <img src={p.images[0].url} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
            <Footprints className="h-12 w-12 text-orange-300" />
          </div>
        )}
        {out && <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center"><span className="px-3 py-1 rounded-xl bg-rose-600 text-white text-sm font-extrabold">OUT</span></div>}
        {profile?.isFeatured && !out && (
          <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center shadow">
            <Star className="h-3.5 w-3.5 fill-white text-white" />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="font-extrabold text-slate-900 text-base line-clamp-2 leading-tight min-h-[2.5rem]">{p.name}</div>
        {profile?.colorName && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="h-2.5 w-2.5 rounded-full border border-slate-300" style={{ backgroundColor: profile.colorHex || '#ccc' }} />
            <span className="text-[10px] font-bold text-slate-600">{profile.colorName}</span>
          </div>
        )}
        <div className="mt-2 flex items-end justify-between gap-1">
          <div className="text-2xl font-extrabold text-emerald-700 tabular-nums leading-none">{hidePrices ? '•••' : formatPKR(p.price)}</div>
          <div className="text-xs font-extrabold text-slate-600">{stock} pairs</div>
        </div>
      </div>
    </button>
  );
}

function CartPanel({ isMobile, onCloseMobile, cart, itemCount, subtotal, total, discountPct, setDiscountPct, hidePrices, customers, customerId, setCustomerId, selectedCustomer, onAddCustomer, onClear, onChangeQty, onRemove, onCheckout, canCheckout }: any) {
  const container = isMobile
    ? 'fixed inset-0 z-40 bg-white flex flex-col lg:hidden'
    : 'hidden lg:flex rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden flex-col min-h-0';

  return (
    <aside className={container}>
      <div className="shrink-0 bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] uppercase font-extrabold text-white/70">Cart • {itemCount} items</div>
            <div className="text-4xl font-extrabold tabular-nums leading-none mt-1">
              {hidePrices ? '••••' : formatPKR(total)}
            </div>
          </div>
          <div className="flex gap-1.5">
            {cart.length > 0 && (
              <button onClick={onClear} className="h-12 px-3 rounded-2xl bg-white/15 text-white text-sm font-extrabold border-2 border-white/20">Clear</button>
            )}
            {isMobile && (
              <button onClick={onCloseMobile} className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center border-2 border-white/20">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 px-3 py-2.5 border-b-2 border-slate-100 bg-slate-50 flex gap-2">
        <div className="relative flex-1">
          <User className="h-5 w-5 text-violet-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
            className="h-14 w-full rounded-2xl border-4 border-slate-200 bg-white pl-11 pr-9 text-base font-bold focus:outline-none focus:border-orange-500 appearance-none">
            <option value="">Walk-in Customer</option>
            {customers.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <ChevronDown className="h-5 w-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <button onClick={onAddCustomer} className="h-14 w-14 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center shadow-md">
          <UserPlus className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50 min-h-0">
        {cart.length === 0 ? (
          <div className="rounded-3xl bg-white border-4 border-dashed border-slate-200 p-10 text-center">
            <ShoppingCart className="h-16 w-16 text-slate-300 mx-auto" />
            <p className="mt-4 font-extrabold text-slate-700 text-xl">Cart is empty</p>
            <p className="text-sm text-slate-500 font-semibold mt-1">Tap product to pick size</p>
          </div>
        ) : (
          cart.map((l: CartLine) => (
            <div key={l.id} className="rounded-2xl bg-white border-4 border-slate-200 p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                  {l.image ? <img src={l.image} className="w-full h-full object-cover" /> : <Footprints className="h-full w-full p-3 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-base text-slate-900 leading-tight line-clamp-2">{l.name}</div>
                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-100 text-orange-800 text-xs font-extrabold">
                    <Ruler className="h-3 w-3" /> Size {l.size} {l.sizeSystem}
                  </div>
                  {(l.boxNumber || l.shelfLocation) && (
                    <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-slate-600">
                      {l.boxNumber && <span className="inline-flex items-center gap-0.5"><Package className="h-2.5 w-2.5" /> {l.boxNumber}</span>}
                      {l.shelfLocation && <span className="inline-flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {l.shelfLocation}</span>}
                    </div>
                  )}
                  <div className="text-sm font-bold text-violet-700 mt-1">{formatPKR(l.unitPrice)}</div>
                </div>
                <button onClick={() => onRemove(l.id)} className="h-10 w-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="inline-flex items-center bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200">
                  <button onClick={() => onChangeQty(l.id, -1)} className="h-14 w-14 hover:bg-slate-200 flex items-center justify-center">
                    <Minus className="h-6 w-6 text-slate-700" />
                  </button>
                  <div className="h-14 min-w-[80px] flex items-center justify-center bg-white text-xl font-extrabold tabular-nums">{l.quantity}</div>
                  <button onClick={() => onChangeQty(l.id, 1)} className="h-14 w-14 bg-orange-600 text-white hover:bg-orange-700 flex items-center justify-center">
                    <Plus className="h-6 w-6" />
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
                  className={`flex-1 h-10 rounded-xl text-xs font-extrabold transition ${discountPct === d ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                  {d === 0 ? 'None' : `${d}%`}
                </button>
              ))}
            </div>
          </div>
          <button onClick={onCheckout} disabled={!canCheckout}
            className="w-full h-[88px] rounded-3xl font-extrabold text-white shadow-2xl bg-gradient-to-r from-emerald-600 to-green-600 disabled:opacity-50 flex items-center justify-between px-6">
            <div className="text-left">
              <div className="text-xs uppercase font-extrabold text-white/80">Checkout</div>
              <div className="text-3xl tabular-nums leading-none mt-0.5">{formatPKR(total)}</div>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <ArrowRight className="h-8 w-8" />
            </div>
          </button>
        </div>
      )}
    </aside>
  );
}
