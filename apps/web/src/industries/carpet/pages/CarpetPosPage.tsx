import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers, Search, X, Plus, Trash2, User, UserPlus, Scissors, Package,
  Sparkles, CheckCircle2, ChevronDown, Camera, ScanLine, Wifi, WifiOff,
  ShoppingCart, ArrowRight, Store, Eye, EyeOff, Wrench, MapPin, Ruler,
  Filter, SortAsc, TrendingDown, Pause, Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { CarpetRollPicker } from '@/industries/carpet/components/pos-extensions/CarpetRollPicker';
import { CarpetCutPiecePicker } from '@/industries/carpet/components/pos-extensions/CarpetCutPiecePicker';
import { carpetRollsApi } from '../api/carpet-rolls.api';
import { carpetCutPiecesApi, type CarpetCutPiece } from '../api/carpet-cut-pieces.api';
import { useSharedPosCart, cartLineId } from '@modules/pos/hooks/useSharedPosCart';

const VIEW_KEY = 'nafaa.carpet-pos.view';
const HIDE_KEY = 'nafaa.carpet-pos.hide-prices';

type Tab = 'rolls' | 'pieces' | 'accessories';
type SortBy = 'largest' | 'newest' | 'cheapest';

interface HeldCart { id: string; lines: any[]; customerId: string; total: number; heldAt: number; }
const heldId = () => `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function CarpetPosPage() {
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const tenant = useAuthStore((s) => s.tenant);

  const [activeTab, setActiveTab] = useState<Tab>(() => (localStorage.getItem(VIEW_KEY) as Tab) || 'rolls');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('largest');
  const [carpetPickerData, setCarpetPickerData] = useState<{ product: Product; preSelectedRoll?: any } | null>(null);
  const [cutPiecePickerData, setCutPiecePickerData] = useState<{ product: Product } | null>(null);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [hidePrices, setHidePrices] = useState(() => localStorage.getItem(HIDE_KEY) === 'true');
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [visibleCount, setVisibleCount] = useState(80);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [barcodeInput, setBarcodeInput] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const {
    cart, setCart, customerId, setCustomerId,
    paymentMethod, setPaymentMethod, paidAmount, setPaidAmount,
    saleMode, setSaleMode, globalDiscount, setGlobalDiscount,
    serviceCharges, setServiceCharges,
    subtotal, total, effectivePaid, credit, clearCart,
  } = useSharedPosCart();

  useEffect(() => { localStorage.setItem(VIEW_KEY, activeTab); }, [activeTab]);
  useEffect(() => { localStorage.setItem(HIDE_KEY, String(hidePrices)); }, [hidePrices]);
  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 150); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setVisibleCount(80); if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [debouncedSearch, sortBy, activeTab]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    const refocus = () => {
      if (scannerOpen || carpetPickerData || cutPiecePickerData || showCustomerAdd || showHeldCarts) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== barcodeRef.current) {
        const tag = active.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.isContentEditable) return;
      }
      barcodeRef.current?.focus();
    };
    const t = setTimeout(refocus, 300);
    return () => clearTimeout(t);
  }, [scannerOpen, carpetPickerData, cutPiecePickerData, showCustomerAdd, showHeldCarts]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); setScannerOpen(true); }
      if (e.key === 'F7') { e.preventDefault(); setActiveTab('rolls'); }
      if (e.key === 'F8') { e.preventDefault(); setActiveTab('pieces'); }
      if (e.key === 'F9') { e.preventDefault(); setActiveTab('accessories'); }
      if (e.key === 'Escape') {
        if (scannerOpen) setScannerOpen(false);
        if (carpetPickerData) setCarpetPickerData(null);
        if (cutPiecePickerData) setCutPiecePickerData(null);
        if (showMobileCart) setShowMobileCart(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [scannerOpen, carpetPickerData, cutPiecePickerData, showMobileCart]);

  const { data: productsData } = useQuery({
    queryKey: ['products-for-carpet-pos'],
    queryFn: () => productsApi.list({ page: 1, limit: 500 }),
    staleTime: 30_000,
  });
  const products: Product[] = productsData?.items ?? [];
  const nonCarpetProducts = useMemo(() =>
    products.filter((p) => !['sqft', 'sqm', 'sqyd'].includes(p.unit) && p.isActive !== false),
  [products]);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ limit: 500 }),
    staleTime: 60_000,
  });
  const customers = customersData?.items ?? [];
  const selectedCustomer = customers.find((c) => c.id === customerId);

  const { data: allRollsData } = useQuery({
    queryKey: ['carpet-rolls-available'],
    queryFn: () => carpetRollsApi.list({ inStockOnly: true, limit: 1000 }),
    enabled: activeTab === 'rolls',
    staleTime: 30_000,
  });
  const allRolls: any[] = allRollsData?.items ?? [];

  const { data: allCutPiecesData } = useQuery({
    queryKey: ['carpet-cut-pieces-available'],
    queryFn: () => carpetCutPiecesApi.list({ status: 'AVAILABLE', limit: 1000 }),
    enabled: activeTab === 'pieces',
    staleTime: 30_000,
  });
  const allCutPieces: any[] = allCutPiecesData?.items ?? [];

  const filteredRolls = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    let result = q ? allRolls.filter((r: any) => {
      const hay = [r.rollNumber, r.product?.name, r.designCode, r.rackNumber, r.variant?.name, r.variant?.color, r.quality, r.pile]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    }) : [...allRolls];

    result.sort((a: any, b: any) => {
      if (sortBy === 'largest') return Number(b.remainingSqft) - Number(a.remainingSqft);
      if (sortBy === 'cheapest') return Number(a.salePricePerSqft) - Number(b.salePricePerSqft);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [allRolls, debouncedSearch, sortBy]);

  const filteredCutPieces = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    let result = q ? allCutPieces.filter((c: any) =>
      c.pieceCode.toLowerCase().includes(q) ||
      c.product?.name.toLowerCase().includes(q) ||
      (c.variant?.name || '').toLowerCase().includes(q)
    ) : [...allCutPieces];

    result.sort((a: any, b: any) => {
      if (sortBy === 'largest') return Number(b.totalSqft) - Number(a.totalSqft);
      if (sortBy === 'cheapest') return Number(a.salePrice) - Number(b.salePrice);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [allCutPieces, debouncedSearch, sortBy]);

  const filteredAccessories = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    if (!q) return nonCarpetProducts;
    return nonCarpetProducts.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q)
    );
  }, [nonCarpetProducts, debouncedSearch]);

  const visibleRolls = filteredRolls.slice(0, visibleCount);
  const visiblePieces = filteredCutPieces.slice(0, visibleCount);
  const visibleAccessories = filteredAccessories.slice(0, visibleCount);

  const hasMore = activeTab === 'rolls' ? filteredRolls.length > visibleCount
    : activeTab === 'pieces' ? filteredCutPieces.length > visibleCount
    : filteredAccessories.length > visibleCount;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore) return;
    const t = e.currentTarget;
    if ((t.scrollTop + t.clientHeight) / t.scrollHeight > 0.85) setVisibleCount((c) => c + 60);
  }, [hasMore]);

  const totalStats = useMemo(() => ({
    rolls: allRolls.length,
    rollSqft: allRolls.reduce((s, r) => s + Number(r.remainingSqft || 0), 0),
    pieces: allCutPieces.length,
    pieceSqft: allCutPieces.reduce((s, p) => s + Number(p.totalSqft || 0), 0),
  }), [allRolls, allCutPieces]);

  const openRollCutFor = (roll: any) => {
    if (!roll.product) return toast.error('Roll ka product info missing');
    setCarpetPickerData({ product: roll.product, preSelectedRoll: roll });
  };

  const handleCarpetRollConfirm = (data: any) => {
    if (!carpetPickerData) return;
    const { product } = carpetPickerData;
    const { roll } = data;
    const wInchPart = data.customerWidthInch > 0 ? ` ${data.customerWidthInch}in` : '';
    const lInchPart = data.lengthInch > 0 ? ` ${data.lengthInch}in` : '';
    let note = `Cut from ${roll.rollNumber}: ${data.customerWidthFt}ft${wInchPart} × ${data.lengthFt}ft${lInchPart} = ${data.cutSqft.toFixed(2)} sqft`;
    if (data.isCustomRate) note += ` @ Rs ${data.pricePerSqft}/sqft (Custom)`;

    setCart((prev) => [...prev, {
      cartLineId: cartLineId(),
      productId: product.id,
      rollId: roll.id,
      rollNumber: roll.rollNumber,
      cutWidthFt: data.customerWidthFt, cutWidthInch: data.customerWidthInch,
      cutLengthFt: data.lengthFt, cutLengthInch: data.lengthInch,
      cutLengthReal: data.lengthReal, cutWidthReal: data.widthReal,
      cutSqft: data.cutSqft, createLeftover: data.createLeftover,
      rollCustomerWidthFt: data.widthReal,
      rollFullWidthFt: Number(roll.widthFt) + Number(roll.widthInch || 0) / 12,
      name: product.name,
      basePrice: data.pricePerSqft,
      wholesalePrice: roll.wholesalePricePerSqft ?? null,
      stock: data.cutSqft, quantity: data.cutSqft, unit: product.unit,
      category: product.category,
      useWholesale: false, priceOverride: data.pricePerSqft, lineDiscount: 0,
      note,
    }]);

    toast.success(`${roll.rollNumber} → ${data.cutSqft.toFixed(2)} sqft added`, { duration: 1200 });
    setCarpetPickerData(null);
  };

  const handleCutPieceSelect = (piece: CarpetCutPiece) => {
    const product = (piece as any).product;
    if (!product) return;
    setCart((prev) => [...prev, {
      cartLineId: cartLineId(),
      productId: product.id,
      cutPieceId: piece.id, cutPieceCode: piece.pieceCode,
      cutSqft: (piece as any).totalSqft,
      name: product.name,
      basePrice: (piece as any).salePrice, wholesalePrice: null,
      stock: (piece as any).totalSqft, quantity: (piece as any).totalSqft,
      unit: product.unit, category: product.category,
      useWholesale: false,
      priceOverride: (piece as any).salePrice / Math.max((piece as any).totalSqft, 0.01),
      lineDiscount: 0,
      note: `Cut piece ${piece.pieceCode} • ${(piece as any).widthFt}ft × ${(piece as any).lengthFt}ft`,
    }]);
    toast.success(`Piece ${piece.pieceCode} added`, { duration: 1200 });
    setCutPiecePickerData(null);
  };

  const addAccessoryToCart = (product: Product) => {
    if (product.stock <= 0) return toast.error(`${product.name} — stock khatam`);
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id && !c.rollId && !c.cutPieceId);
      if (existing) {
        return prev.map((c) => c.cartLineId === existing.cartLineId
          ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        cartLineId: cartLineId(),
        productId: product.id, name: product.name,
        variantImage: product.images?.[0]?.url,
        basePrice: product.price, wholesalePrice: product.wholesalePrice,
        stock: product.stock, quantity: 1, unit: product.unit,
        category: product.category, useWholesale: false, lineDiscount: 0,
      }];
    });
    toast.success(`${product.name} +1`, { duration: 900 });
  };

  const handleBarcodeScan = async (code: string) => {
    setScannerOpen(false);
    const trimmed = code.trim();
    if (!trimmed) return;

    const matchingRoll = allRolls.find((r: any) => r.rollNumber.toLowerCase() === trimmed.toLowerCase());
    if (matchingRoll) return openRollCutFor(matchingRoll);

    const matchingPiece = allCutPieces.find((p: any) => p.pieceCode.toLowerCase() === trimmed.toLowerCase());
    if (matchingPiece) return handleCutPieceSelect(matchingPiece);

    try {
      const product = await productsApi.byBarcode(trimmed);
      if (['sqft', 'sqm', 'sqyd'].includes(product.unit)) {
        setCarpetPickerData({ product });
      } else {
        addAccessoryToCart(product);
      }
    } catch { toast.error(`"${trimmed}" nahi mila`); }
  };

  const holdCart = () => {
    if (cart.length === 0) return;
    setHeldCarts((prev) => [...prev, { id: heldId(), lines: cart, customerId, total, heldAt: Date.now() }]);
    clearCart();
    toast.success('Cart hold ho gaya', { duration: 900 });
  };
  const resumeCart = (h: HeldCart) => {
    setCart(h.lines); setCustomerId(h.customerId);
    setHeldCarts((prev) => prev.filter((x) => x.id !== h.id));
    setShowHeldCarts(false);
    toast.success('Cart resume ho gaya', { duration: 900 });
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
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Add fail'),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => {
      if (!currentShopId) throw new Error('Shop required');
      return salesApi.create({
        shopId: currentShopId,
        customerId: customerId || undefined,
        paymentMethod, paidAmount: effectivePaid,
        discount: Number(globalDiscount) || 0,
        serviceCharges,
        items: cart.map((c) => ({
          productId: c.productId, quantity: c.quantity,
          priceOverride: c.priceOverride, lineDiscount: c.lineDiscount,
          useWholesale: c.useWholesale, note: c.note,
        })),
      });
    },
    onSuccess: (sale) => {
      window.open(`/sales/${sale.id}/receipt?auto=1`, '_blank');
      clearCart();
      setShowMobileCart(false);
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls-available'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-cut-pieces-available'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      toast.success('Sale complete!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Sale fail'),
  });

  const handleCheckout = () => {
    if (cart.length === 0) return toast.error('Cart khaali hai');
    if (!currentShopId) return toast.error('Shop select karein');
    if (credit > 0 && !customerId) return toast.error('Udhaar sale ke liye customer chahiye');
    checkoutMutation.mutate();
  };

  const addServiceCharge = () => setServiceCharges((prev) => [...prev, { type: 'CUSTOM', label: '', amount: 0 }]);

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleBarcodeScan} onClose={() => setScannerOpen(false)} />}

      {carpetPickerData && (
        <CarpetRollPicker
          product={carpetPickerData.product}
          preSelectedRoll={carpetPickerData.preSelectedRoll}
          onConfirm={handleCarpetRollConfirm}
          onClose={() => setCarpetPickerData(null)}
        />
      )}

      {cutPiecePickerData && (
        <CarpetCutPiecePicker
          product={cutPiecePickerData.product}
          onSelect={handleCutPieceSelect}
          onClose={() => setCutPiecePickerData(null)}
        />
      )}

      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-5 py-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                <h3 className="font-extrabold">Naya Customer</h3>
              </div>
              <button onClick={() => setShowCustomerAdd(false)}
                className="h-9 w-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center active:scale-95">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input autoFocus value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Customer ka naam *"
                className="h-14 w-full rounded-2xl border-2 border-slate-200 px-4 text-lg font-bold focus:outline-none focus:border-emerald-500" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="03XX XXXXXXX"
                className="h-14 w-full rounded-2xl border-2 border-slate-200 px-4 text-lg font-bold focus:outline-none focus:border-emerald-500" />
              <Button size="lg" className="w-full bg-gradient-to-r from-emerald-600 to-teal-700"
                onClick={() => {
                  if (!newCustomer.name.trim()) return toast.error('Naam likhein');
                  addCustomerMutation.mutate({ name: newCustomer.name.trim(), phone: newCustomer.phone.trim() || undefined });
                }}
                loading={addCustomerMutation.isPending}>
                Add Karo
              </Button>
            </div>
          </div>
        </div>
      )}

      {showHeldCarts && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pause className="h-5 w-5" />
                <h3 className="font-extrabold">Held Carts ({heldCarts.length})</h3>
              </div>
              <button onClick={() => setShowHeldCarts(false)}
                className="h-9 w-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center active:scale-95">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {heldCarts.length === 0 ? (
                <div className="text-center py-12">
                  <Pause className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">Koi held cart nahi</p>
                </div>
              ) : heldCarts.map((h) => (
                <div key={h.id} className="rounded-2xl border-2 border-slate-200 p-3 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 text-sm">{h.lines.length} items • {formatPKR(h.total)}</div>
                    <div className="text-xs text-slate-500 font-bold">
                      {new Date(h.heldAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button onClick={() => resumeCart(h)}
                    className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1 active:scale-95">
                    <Play className="h-3.5 w-3.5" /> Resume
                  </button>
                  <button onClick={() => setHeldCarts((prev) => prev.filter((x) => x.id !== h.id))}
                    className="h-10 w-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center active:scale-95">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="min-h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-7rem)] flex flex-col lg:grid lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_480px] gap-2 lg:gap-3">

        {/* MAIN */}
        <section className="lg:flex-1 rounded-2xl lg:rounded-3xl bg-white border-2 border-slate-200 shadow-sm lg:overflow-hidden flex flex-col lg:min-h-0">

          {/* Header */}
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="relative px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-2 ring-white/20 shrink-0">
                  <Layers className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-extrabold leading-none">🧶 Carpet POS</h2>
                    {isOnline ? (
                      <div className="h-6 w-6 rounded-full bg-emerald-500/30 flex items-center justify-center" title="Online">
                        <Wifi className="h-3 w-3 text-emerald-200" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-amber-500/30 flex items-center justify-center" title="Offline">
                        <WifiOff className="h-3 w-3 text-amber-200" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/80 font-semibold mt-0.5 flex items-center gap-1 truncate">
                    <Store className="h-3 w-3 shrink-0" />
                    <span className="truncate">{tenant?.name || 'Carpet Store'}</span>
                    <span className="text-white/40">•</span>
                    <span className="text-emerald-300 font-extrabold">{totalStats.rolls} rolls</span>
                    <span className="text-white/40">•</span>
                    <span className="text-amber-300 font-extrabold">{totalStats.pieces} pieces</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {heldCarts.length > 0 && (
                  <button onClick={() => setShowHeldCarts(true)}
                    className="h-10 px-2.5 rounded-2xl bg-amber-500/30 hover:bg-amber-500/50 text-white text-xs font-extrabold inline-flex items-center gap-1 border-2 border-amber-300/40 transition active:scale-95">
                    <Pause className="h-4 w-4" /> {heldCarts.length}
                  </button>
                )}
                <button onClick={() => setHidePrices((v) => !v)}
                  className="h-10 w-10 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center border-2 border-white/20 transition">
                  {hidePrices ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button onClick={() => setShowMobileCart(true)}
                  className="lg:hidden relative h-10 w-10 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 flex items-center justify-center transition">
                  <ShoppingCart className="h-4 w-4" />
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                      {cart.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="shrink-0 px-3 sm:px-4 pt-3 bg-slate-50 border-b-2 border-slate-100">
            <div className="flex gap-1.5 bg-white rounded-2xl border-2 border-slate-200 p-1">
              <TabButton active={activeTab === 'rolls'} onClick={() => setActiveTab('rolls')}
                icon={Layers} label="Rolls" count={totalStats.rolls} color="emerald" shortcut="F7" />
              <TabButton active={activeTab === 'pieces'} onClick={() => setActiveTab('pieces')}
                icon={Scissors} label="Pieces" count={totalStats.pieces} color="violet" shortcut="F8" />
              <TabButton active={activeTab === 'accessories'} onClick={() => setActiveTab('accessories')}
                icon={Package} label="Accessories" count={nonCarpetProducts.length} color="amber" shortcut="F9" />
            </div>
          </div>

          {/* Search + Barcode */}
          <div className="shrink-0 px-3 sm:px-4 py-2.5 bg-slate-50 border-b-2 border-slate-100 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={activeTab === 'rolls' ? 'Roll #, design, rack, size...'
                    : activeTab === 'pieces' ? 'Piece code, product...'
                    : 'Product naam, SKU...'}
                  className="h-14 sm:h-16 w-full rounded-2xl border-4 border-slate-200 bg-white pl-11 sm:pl-14 pr-10 sm:pr-12 text-base sm:text-lg font-bold focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 transition" />
                {search && (
                  <button onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl hover:bg-slate-100 active:scale-95 flex items-center justify-center transition">
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                )}
              </div>
              <button onClick={() => setScannerOpen(true)}
                className="h-14 sm:h-16 w-16 sm:w-20 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 active:scale-95 text-white flex flex-col items-center justify-center gap-0.5 shadow-lg transition shrink-0">
                <Camera className="h-5 w-5" />
                <span className="text-[9px] font-extrabold uppercase">Scan</span>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (barcodeInput.trim()) { handleBarcodeScan(barcodeInput); setBarcodeInput(''); } }} className="relative">
              <ScanLine className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input ref={barcodeRef} value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Barcode ready... (roll #, piece code, product barcode)"
                className="h-10 sm:h-12 w-full rounded-2xl border-2 border-emerald-300 bg-emerald-50 pl-10 sm:pl-11 pr-3 text-sm font-mono font-extrabold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200" />
            </form>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                { v: 'largest' as SortBy, l: 'Largest', icon: SortAsc },
                { v: 'newest' as SortBy, l: 'Newest', icon: Sparkles },
                { v: 'cheapest' as SortBy, l: 'Cheapest', icon: TrendingDown },
              ].map((opt) => {
                const Icon = opt.icon; const active = sortBy === opt.v;
                return (
                  <button key={opt.v} onClick={() => setSortBy(opt.v)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition active:scale-95 ${
                      active ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}>
                    <Icon className="h-3 w-3" /> {opt.l}
                  </button>
                );
              })}
              <div className="ml-auto text-[10px] font-extrabold text-slate-500 self-center shrink-0 pr-1">
                {activeTab === 'rolls' ? filteredRolls.length : activeTab === 'pieces' ? filteredCutPieces.length : filteredAccessories.length} items
              </div>
            </div>
          </div>

          {/* Grid */}
          <div ref={scrollRef} onScroll={handleScroll} className="lg:flex-1 lg:overflow-y-auto p-2 sm:p-3 bg-slate-50/50 lg:min-h-0">
            {activeTab === 'rolls' && (
              filteredRolls.length === 0 ? (
                <EmptyState icon={Layers} title="Koi roll nahi mila" hint={search ? 'Search change karo' : 'Inventory me rolls add karo'} />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                    {visibleRolls.map((roll: any) => (
                      <RollTile key={roll.id} roll={roll} hidePrices={hidePrices} onClick={() => openRollCutFor(roll)} />
                    ))}
                  </div>
                  {hasMore && (
                    <button onClick={() => setVisibleCount((c) => c + 80)}
                      className="mt-3 w-full h-12 rounded-2xl bg-white border-4 border-slate-200 hover:border-emerald-400 active:scale-[0.98] text-slate-700 text-sm font-extrabold inline-flex items-center justify-center gap-2 transition">
                      <Layers className="h-4 w-4" /> Aur dikhao ({filteredRolls.length - visibleCount} baqi)
                    </button>
                  )}
                </>
              )
            )}

            {activeTab === 'pieces' && (
              filteredCutPieces.length === 0 ? (
                <EmptyState icon={Scissors} title="Koi cut piece nahi" hint="Cut pieces auto banti hain jab roll cut karte ho smaller width se" />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                    {visiblePieces.map((piece: any) => (
                      <PieceTile key={piece.id} piece={piece} hidePrices={hidePrices} onClick={() => handleCutPieceSelect(piece)} />
                    ))}
                  </div>
                  {hasMore && (
                    <button onClick={() => setVisibleCount((c) => c + 80)}
                      className="mt-3 w-full h-12 rounded-2xl bg-white border-4 border-slate-200 hover:border-violet-400 text-sm font-extrabold transition">
                      Aur dikhao ({filteredCutPieces.length - visibleCount} baqi)
                    </button>
                  )}
                </>
              )
            )}

            {activeTab === 'accessories' && (
              filteredAccessories.length === 0 ? (
                <EmptyState icon={Package} title="Koi accessory nahi" hint="Non-carpet products add karo — glue, edging, tools" />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                    {visibleAccessories.map((p) => (
                      <AccessoryTile key={p.id} product={p} hidePrices={hidePrices} cart={cart} onClick={() => addAccessoryToCart(p)} />
                    ))}
                  </div>
                  {hasMore && (
                    <button onClick={() => setVisibleCount((c) => c + 80)}
                      className="mt-3 w-full h-12 rounded-2xl bg-white border-4 border-slate-200 hover:border-amber-400 text-sm font-extrabold transition">
                      Aur dikhao
                    </button>
                  )}
                </>
              )
            )}
          </div>
        </section>

        {/* CART */}
        <CartPanel
          isMobile={showMobileCart}
          onCloseMobile={() => setShowMobileCart(false)}
          cart={cart} setCart={setCart}
          customerId={customerId} setCustomerId={setCustomerId}
          customers={customers} selectedCustomer={selectedCustomer}
          onAddCustomer={() => setShowCustomerAdd(true)}
          onHold={holdCart}
          onClear={() => { if (confirm('Cart khaali karein?')) clearCart(); }}
          paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
          saleMode={saleMode} setSaleMode={setSaleMode}
          paidAmount={paidAmount} setPaidAmount={setPaidAmount}
          globalDiscount={globalDiscount} setGlobalDiscount={setGlobalDiscount}
          serviceCharges={serviceCharges} setServiceCharges={setServiceCharges}
          addServiceCharge={addServiceCharge}
          subtotal={subtotal} total={total} credit={credit}
          hidePrices={hidePrices}
          onCheckout={handleCheckout}
          loading={checkoutMutation.isPending}
          canCheckout={!!currentShopId}
        />
      </div>

      {/* Mobile FAB */}
      {cart.length > 0 && !showMobileCart && (
        <div className="lg:hidden fixed bottom-4 inset-x-4 z-30">
          <button onClick={() => setShowMobileCart(true)}
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-2xl active:scale-[0.98] flex items-center justify-between px-5 transition">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 min-w-[22px] h-5 px-1 rounded-full bg-white text-emerald-700 text-[11px] font-extrabold flex items-center justify-center">
                  {cart.length}
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

function TabButton({ active, onClick, icon: Icon, label, count, color, shortcut }: any) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-600 text-white shadow-md',
    violet: 'bg-violet-600 text-white shadow-md',
    amber: 'bg-amber-600 text-white shadow-md',
  };
  return (
    <button onClick={onClick}
      className={`flex-1 h-11 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition active:scale-95 relative ${
        active ? colors[color] : 'bg-transparent text-slate-600 hover:bg-slate-100'
      }`}>
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

function RollTile({ roll, hidePrices, onClick }: any) {
  const remaining = Number(roll.remainingSqft || 0);
  const original = Number(roll.originalSqft || 0);
  const percent = original > 0 ? (remaining / original) * 100 : 0;
  const isLow = percent < 20;

  return (
    <button onClick={onClick}
      className="group text-left rounded-2xl border-4 border-slate-200 hover:border-emerald-500 hover:shadow-xl hover:-translate-y-1 bg-white overflow-hidden transition active:scale-95 relative">
      <div className="aspect-square bg-slate-100 overflow-hidden relative">
        {roll.product?.images?.[0]?.url ? (
          <img src={roll.product.images[0].url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
            <Layers className="h-12 w-12 text-emerald-300" />
          </div>
        )}
        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-extrabold font-mono shadow-lg">
          {roll.rollNumber}
        </div>
        {roll.variant && (
          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-violet-600 text-white text-[10px] font-extrabold inline-flex items-center gap-1">
            {roll.variant.colorHex && <span className="h-2 w-2 rounded-full border border-white" style={{ backgroundColor: roll.variant.colorHex }} />}
            {roll.variant.name}
          </div>
        )}
        {isLow && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold animate-pulse">LOW</div>
        )}
      </div>
      <div className="p-2 sm:p-2.5">
        <div className="font-extrabold text-slate-900 text-xs sm:text-sm line-clamp-2 min-h-[2rem] leading-tight">
          {roll.product?.name}
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <div className="text-sm sm:text-base font-extrabold text-emerald-700 tabular-nums">
            {hidePrices ? '•••' : formatPKR(roll.salePricePerSqft || 0)}
          </div>
          <div className="text-[10px] font-extrabold text-slate-600 tabular-nums">{remaining.toFixed(0)} sqft</div>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500 font-bold">
          <Ruler className="h-2.5 w-2.5" />
          {Number(roll.widthFt)}ft × {Number(roll.remainingLengthFt)}ft
          {roll.rackNumber && (<><span>•</span><MapPin className="h-2.5 w-2.5" />{roll.rackNumber}</>)}
        </div>
        <div className="mt-1 h-1 rounded-full bg-slate-200 overflow-hidden">
          <div className={`h-full ${percent > 50 ? 'bg-emerald-500' : percent > 20 ? 'bg-amber-500' : 'bg-rose-500'}`}
            style={{ width: `${Math.max(percent, 3)}%` }} />
        </div>
      </div>
    </button>
  );
}

function PieceTile({ piece, hidePrices, onClick }: any) {
  return (
    <button onClick={onClick}
      className="group text-left rounded-2xl border-4 border-slate-200 hover:border-violet-500 hover:shadow-xl hover:-translate-y-1 bg-white overflow-hidden transition active:scale-95">
      <div className="aspect-square bg-gradient-to-br from-violet-100 to-fuchsia-100 relative flex flex-col items-center justify-center p-3">
        <Scissors className="h-10 w-10 text-violet-500 mb-1" />
        <div className="text-xs font-mono font-extrabold text-violet-900 text-center">{piece.pieceCode}</div>
        <div className="text-[10px] font-bold text-slate-600 mt-0.5">{piece.widthFt}ft × {piece.lengthFt}ft</div>
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-violet-600 text-white text-[9px] font-extrabold">
          {Number(piece.totalSqft).toFixed(1)} sqft
        </div>
        {piece.variant?.colorHex && (
          <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full border-2 border-white shadow" style={{ backgroundColor: piece.variant.colorHex }} />
        )}
      </div>
      <div className="p-2 sm:p-2.5">
        <div className="font-extrabold text-slate-900 text-xs sm:text-sm line-clamp-2 min-h-[2rem] leading-tight">{piece.product?.name}</div>
        <div className="mt-1 flex items-baseline justify-between">
          <div className="text-base font-extrabold text-emerald-700 tabular-nums">
            {hidePrices ? '•••' : formatPKR(piece.salePrice || 0)}
          </div>
          {piece.rackNumber && (
            <div className="text-[10px] font-bold text-slate-500 inline-flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5" />{piece.rackNumber}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function AccessoryTile({ product, hidePrices, cart, onClick }: any) {
  const inCart = cart.filter((l: any) => l.productId === product.id && !l.rollId && !l.cutPieceId);
  const cartQty = inCart.reduce((s: number, l: any) => s + l.quantity, 0);
  const out = product.stock <= 0;

  return (
    <button onClick={onClick} disabled={out}
      className={`group relative text-left rounded-2xl border-4 overflow-hidden transition active:scale-95 ${
        out ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-100'
          : cartQty > 0 ? 'border-emerald-500 bg-emerald-50 shadow-xl ring-4 ring-emerald-200'
          : 'border-slate-200 bg-white hover:border-amber-400 hover:shadow-xl hover:-translate-y-1'
      }`}>
      {cartQty > 0 && (
        <div className="absolute -top-2 -right-2 min-w-[28px] h-7 px-1.5 rounded-full bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center shadow-xl ring-4 ring-white z-10">
          {cartQty}
        </div>
      )}
      <div className="aspect-square bg-slate-100 overflow-hidden relative">
        {product.images?.[0]?.url ? (
          <img src={product.images[0].url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-10 w-10 text-slate-300" />
          </div>
        )}
        {out && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
            <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-xs font-extrabold">KHATAM</span>
          </div>
        )}
      </div>
      <div className="p-2 sm:p-2.5">
        <div className="font-extrabold text-slate-900 text-xs sm:text-sm line-clamp-2 min-h-[2rem] leading-tight">{product.name}</div>
        <div className="mt-1 flex items-baseline justify-between">
          <div className="text-base font-extrabold text-emerald-700 tabular-nums">
            {hidePrices ? '•••' : formatPKR(product.price)}
          </div>
          <div className="text-[10px] font-bold text-slate-500">{product.stock} {product.unit}</div>
        </div>
      </div>
    </button>
  );
}

function EmptyState({ icon: Icon, title, hint }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="h-20 w-20 rounded-3xl bg-slate-200 flex items-center justify-center">
        <Icon className="h-10 w-10 text-slate-400" />
      </div>
      <h3 className="mt-4 font-extrabold text-slate-900 text-xl">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 text-center font-semibold max-w-sm">{hint}</p>
    </div>
  );
}

function CartPanel(props: any) {
  const {
    isMobile, onCloseMobile, cart, setCart, customerId, setCustomerId, customers, selectedCustomer,
    onAddCustomer, onHold, onClear, paymentMethod, setPaymentMethod, saleMode, setSaleMode,
    paidAmount, setPaidAmount, globalDiscount, setGlobalDiscount, serviceCharges, setServiceCharges,
    addServiceCharge, subtotal, total, credit, hidePrices, onCheckout, loading, canCheckout,
  } = props;

  const containerClass = isMobile
    ? 'fixed inset-0 z-40 bg-white flex flex-col lg:hidden animate-in slide-in-from-bottom duration-200'
    : 'hidden lg:flex rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden flex-col min-h-0';

  const serviceTotal = serviceCharges.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);

  return (
    <aside className={containerClass}>
      <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">
              🧶 Carpet Cart • {cart.length} items
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tabular-nums leading-none mt-1">
              {hidePrices ? '••••' : formatPKR(total)}
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {cart.length > 0 && (
              <>
                <button onClick={onHold}
                  className="h-10 sm:h-12 px-2.5 rounded-2xl bg-white/15 hover:bg-amber-500/50 active:scale-95 text-white text-xs sm:text-sm font-extrabold border-2 border-white/20 transition inline-flex items-center gap-1">
                  <Pause className="h-3.5 w-3.5" /> Hold
                </button>
                <button onClick={onClear}
                  className="h-10 sm:h-12 px-2.5 rounded-2xl bg-white/15 hover:bg-rose-500/50 active:scale-95 text-white text-xs sm:text-sm font-extrabold border-2 border-white/20 transition">
                  Khaali
                </button>
              </>
            )}
            {isMobile && (
              <button onClick={onCloseMobile}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center border-2 border-white/20 transition">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customer */}
      <div className="shrink-0 px-3 py-2.5 border-b-2 border-slate-100 bg-slate-50">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <User className="h-4 w-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
              className="h-12 w-full rounded-2xl border-4 border-slate-200 bg-white pl-10 pr-9 text-sm font-bold focus:outline-none focus:border-emerald-500 appearance-none">
              <option value="">Walk-in Customer</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.balance > 0 ? ` • Udhaar ${formatPKR(c.balance)}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button onClick={onAddCustomer}
            className="h-12 w-12 rounded-2xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white flex items-center justify-center shadow-md shrink-0 transition">
            <UserPlus className="h-5 w-5" />
          </button>
        </div>
        {selectedCustomer && selectedCustomer.balance > 0 && (
          <div className="mt-2 px-3 py-1.5 rounded-xl bg-amber-100 border-2 border-amber-300 text-xs font-extrabold text-amber-900">
            ⚠️ Purana udhaar: {formatPKR(selectedCustomer.balance)}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-slate-50/50 min-h-0">
        {cart.length === 0 ? (
          <div className="rounded-3xl bg-white border-4 border-dashed border-slate-200 p-8 text-center">
            <ShoppingCart className="h-10 w-10 text-slate-400 mx-auto" />
            <p className="mt-3 font-extrabold text-slate-700 text-lg">Cart khaali hai</p>
            <p className="text-xs text-slate-500 font-semibold mt-1">Roll cut karo, piece add karo ya accessory</p>
          </div>
        ) : (
          cart.map((item: any) => (
            <div key={item.cartLineId} className={`rounded-2xl border-4 p-3 shadow-sm ${
              item.rollId ? 'border-emerald-300 bg-emerald-50/50'
                : item.cutPieceId ? 'border-violet-300 bg-violet-50/50'
                : 'border-slate-200 bg-white'
            }`}>
              <div className="flex items-start gap-2.5">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                  item.rollId ? 'bg-emerald-600 text-white'
                    : item.cutPieceId ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {item.rollId ? <Layers className="h-5 w-5" /> :
                   item.cutPieceId ? <Scissors className="h-5 w-5" /> :
                   <Package className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm text-slate-900 leading-tight">{item.name}</div>
                  {item.rollNumber && (
                    <div className="text-[10px] font-mono font-extrabold text-emerald-700 mt-0.5">Roll: {item.rollNumber}</div>
                  )}
                  {item.cutPieceCode && (
                    <div className="text-[10px] font-mono font-extrabold text-violet-700 mt-0.5">Piece: {item.cutPieceCode}</div>
                  )}
                  {item.note && (
                    <div className="text-[10px] font-mono text-slate-600 mt-1 bg-white/60 rounded px-1.5 py-0.5 truncate">{item.note}</div>
                  )}
                </div>
                <button onClick={() => setCart((prev: any) => prev.filter((c: any) => c.cartLineId !== item.cartLineId))}
                  className="h-9 w-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 active:scale-95 transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                {!item.rollId && !item.cutPieceId ? (
                  <div className="inline-flex items-center bg-white rounded-xl overflow-hidden border-2 border-slate-200">
                    <button onClick={() => setCart((prev: any) => prev.map((c: any) => c.cartLineId === item.cartLineId
                      ? { ...c, quantity: Math.max(1, c.quantity - 1) } : c))}
                      className="h-10 w-10 hover:bg-slate-100 active:scale-95 text-slate-700 font-extrabold">−</button>
                    <input type="number" value={item.quantity} onChange={(e) => setCart((prev: any) => prev.map((c: any) => c.cartLineId === item.cartLineId
                      ? { ...c, quantity: Math.max(1, Number(e.target.value)) } : c))}
                      className="h-10 w-14 text-center bg-transparent border-x-2 border-slate-200 font-extrabold text-sm focus:outline-none tabular-nums" />
                    <button onClick={() => setCart((prev: any) => prev.map((c: any) => c.cartLineId === item.cartLineId
                      ? { ...c, quantity: c.quantity + 1 } : c))}
                      className="h-10 w-10 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold">+</button>
                  </div>
                ) : (
                  <div className="text-xs font-extrabold text-slate-600">
                    {item.quantity.toFixed(2)} {item.unit}
                  </div>
                )}
                <div className="text-xl font-extrabold text-emerald-700 tabular-nums">
                  {hidePrices ? '•••' : formatPKR((item.priceOverride ?? item.basePrice) * item.quantity)}
                </div>
              </div>
            </div>
          ))
        )}

        {cart.length > 0 && (
          <div className="rounded-2xl bg-orange-50 border-4 border-orange-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase font-extrabold text-orange-700 inline-flex items-center gap-1">
                <Wrench className="h-3 w-3" /> Service Charges
              </div>
              <button onClick={addServiceCharge} className="text-xs font-extrabold text-orange-600 inline-flex items-center gap-0.5 active:scale-95">
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            {serviceCharges.map((sc: any, idx: number) => (
              <div key={idx} className="grid grid-cols-[1fr_100px_auto] gap-1">
                <input value={sc.label} onChange={(e) => {
                  const next = [...serviceCharges]; next[idx] = { ...next[idx], label: e.target.value }; setServiceCharges(next);
                }} placeholder="Service naam"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-orange-500" />
                <input type="number" value={sc.amount || ''} onChange={(e) => {
                  const next = [...serviceCharges]; next[idx] = { ...next[idx], amount: Number(e.target.value) }; setServiceCharges(next);
                }} placeholder="Rs"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold tabular-nums text-right focus:outline-none focus:border-orange-500" />
                <button onClick={() => setServiceCharges(serviceCharges.filter((_: any, i: number) => i !== idx))}
                  className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center active:scale-95">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Checkout */}
      {cart.length > 0 && (
        <div className="shrink-0 p-3 border-t-4 border-slate-100 bg-white space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Discount" value={globalDiscount} onChange={(e) => setGlobalDiscount(e.target.value)}
              className="h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="h-10 rounded-xl border-2 border-slate-200 bg-white px-2 text-xs font-extrabold focus:outline-none focus:border-emerald-500">
              <option value="CASH">💵 Cash</option>
              <option value="CARD">💳 Card</option>
              <option value="JAZZCASH">📱 JazzCash</option>
              <option value="EASYPAISA">⚡ EasyPaisa</option>
              <option value="BANK_TRANSFER">🏦 Bank</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {(['FULL_PAYMENT', 'PARTIAL_CREDIT', 'FULL_CREDIT'] as const).map((m) => (
              <button key={m} onClick={() => setSaleMode(m)}
                className={`py-2 rounded-lg text-[10px] font-extrabold transition active:scale-95 ${
                  saleMode === m ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}>
                {m === 'FULL_PAYMENT' ? '💵 Full' : m === 'PARTIAL_CREDIT' ? '📝 Partial' : '📔 Udhaar'}
              </button>
            ))}
          </div>

          {saleMode === 'PARTIAL_CREDIT' && (
            <input type="number" placeholder="Paid amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
              className="h-11 w-full rounded-xl border-2 border-amber-300 bg-amber-50 px-3 text-base font-extrabold tabular-nums text-center focus:outline-none focus:border-amber-500" />
          )}

          <div className="rounded-xl bg-gradient-to-br from-slate-950 to-emerald-900 text-white p-3 space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
            {serviceTotal > 0 && (
              <div className="flex justify-between text-orange-300">
                <span>Services</span>
                <span className="font-bold tabular-nums">+{formatPKR(serviceTotal)}</span>
              </div>
            )}
            {Number(globalDiscount) > 0 && (
              <div className="flex justify-between text-rose-300">
                <span>Discount</span>
                <span className="font-bold tabular-nums">-{formatPKR(Number(globalDiscount))}</span>
              </div>
            )}
            <div className="pt-1.5 mt-1.5 border-t border-white/20 flex justify-between items-center">
              <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
              <span className="text-2xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
            </div>
            {credit > 0 && (
              <div className="flex justify-between text-amber-300 pt-1.5 border-t border-white/20">
                <span className="font-extrabold">Udhaar</span>
                <span className="font-extrabold tabular-nums">{formatPKR(credit)}</span>
              </div>
            )}
          </div>

          <button onClick={onCheckout} disabled={!canCheckout || loading}
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.98] text-white font-extrabold shadow-2xl transition disabled:opacity-50 flex items-center justify-between px-5">
            <div className="text-left">
              <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider">
                {loading ? 'Processing...' : 'Complete Sale'}
              </div>
              <div className="text-xl tabular-nums leading-none mt-0.5">{formatPKR(total)}</div>
            </div>
            <CheckCircle2 className="h-8 w-8" />
          </button>
          {!canCheckout && <p className="text-center text-xs font-extrabold text-rose-600">⚠️ Pehle shop select karein</p>}
        </div>
      )}
    </aside>
  );
}
