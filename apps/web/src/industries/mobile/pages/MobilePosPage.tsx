// src/industries/mobile/pages/MobilePosPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Smartphone, Search, X, Plus, Minus, Trash2, User, UserPlus,
  Package, ShieldCheck, CheckCircle2, AlertTriangle, Award, Camera,
  ChevronDown, GraduationCap, Cable, Wifi, WifiOff, Pause, Play,
  ArrowRight, Printer, Tag, Percent, Banknote, RotateCcw, Check,
  AlertOctagon, RefreshCw, Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { offlineSalesApi } from '@core/lib/offline/offlineSales';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import {
  imeiApi, type ProductImei, type PtaStatus,
  PTA_STATUS_COLORS, PTA_STATUS_LABELS,
} from '../api/imei.api';
import {
  usedPhonesApi, type UsedPhone,
  CONDITION_LABELS, CONDITION_COLORS,
} from '../api/used-phones.api';
import { QuickEmiFromSaleModal } from '../components/emi/QuickEmiFromSaleModal';
import { FbrModeIndicator } from '@integrations/fbr/components/FbrModeIndicator';

/* ═════════════════════════════════════════════════════════════
   NAFAA MOBILE POS — FULL BEST v2
   ─────────────────────────────────────────────────────────────
   📱 IMEI search + camera scan (new phones)
   🔄 Used Phones tab — sell trade-in stock directly
   🎧 Accessories tab — REAL filter (products with no IMEI records)
   🛡️ PTA badge + red guard on non-PTA at checkout
   💎 Discount modal (%/Rs) • 💳 Line price override
   ⏸️ Hold cart • 🎓 Teacher guide • 🌙 Dark mode complete
   📴 Offline-safe checkout • 💳 EMI auto-prompt on credit sale
   ⌨️ F2 scan • F9 checkout • F7/F8/F9tab tabs • F1 guide • Esc close
   ═════════════════════════════════════════════════════════════ */

type ViewMode = 'imei' | 'usedphone' | 'accessories';
type SaleMode = 'FULL_PAYMENT' | 'PARTIAL_CREDIT' | 'FULL_CREDIT';
type DiscountMode = 'pct' | 'rs';

interface CartLine {
  id: string;
  type: 'imei' | 'usedphone' | 'accessory';
  productId?: string;
  variantId?: string;
  imeiId?: string;
  imeiNumber?: string;
  usedPhoneId?: string;
  usedPhoneCode?: string;
  ptaStatus?: PtaStatus;
  warrantyMonths?: number;
  color?: string;
  name: string;
  image?: string;
  unitPrice: number;
  basePrice: number;
  quantity: number;
  stock: number;
  lineTotal: number;
  note?: string;
}

const lineId = () => `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const HIDE_KEY = 'nafaa.mobile-pos.hide-prices';

export default function MobilePosPage() {
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const [viewMode, setViewMode] = useState<ViewMode>('imei');
  const [imeiSearch, setImeiSearch] = useState('');
  const [debouncedImeiSearch, setDebouncedImeiSearch] = useState('');
  const [usedPhoneSearch, setUsedPhoneSearch] = useState('');
  const [accSearch, setAccSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [showTeacher, setShowTeacher] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountMode, setDiscountMode] = useState<DiscountMode>('rs');
  const [discountPct, setDiscountPct] = useState(0);
  const [discountRs, setDiscountRs] = useState(0);
  const [saleMode, setSaleMode] = useState<SaleMode>('FULL_PAYMENT');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  const [priceEditId, setPriceEditId] = useState<string | null>(null);
  const [emiPromptData, setEmiPromptData] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hidePrices, setHidePrices] = useState(() => localStorage.getItem(HIDE_KEY) === 'true');
  const [showHoldList, setShowHoldList] = useState(false);
  const [heldCarts, setHeldCarts] = useState<{ id: string; cart: CartLine[]; customerId: string; heldAt: number }[]>([]);
  const [lastSale, setLastSale] = useState<{ id: string; number: string } | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem(HIDE_KEY, String(hidePrices)); }, [hidePrices]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedImeiSearch(imeiSearch.trim()), 200);
    return () => clearTimeout(t);
  }, [imeiSearch]);

  useEffect(() => {
    const on = () => { setIsOnline(true); toast.success('🟢 Internet wapas'); };
    const off = () => { setIsOnline(false); toast.warning('📴 Offline — sale queue me chali jayegi'); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'F1' && !typing) { e.preventDefault(); setShowTeacher(true); }
      if (e.key === 'F2') { e.preventDefault(); setScannerOpen(true); }
      if (e.key === 'F7') { e.preventDefault(); setViewMode('imei'); }
      if (e.key === 'F8') { e.preventDefault(); setViewMode('usedphone'); }
      if (e.key === 'F9' && cart.length > 0) { e.preventDefault(); handleCheckout(); }
      if (e.key === 'Escape') {
        if (showDiscountModal) setShowDiscountModal(false);
        else if (showTeacher) setShowTeacher(false);
        else if (scannerOpen) setScannerOpen(false);
        else if (showHoldList) setShowHoldList(false);
        else if (priceEditId) setPriceEditId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, showDiscountModal, showTeacher, scannerOpen, showHoldList, priceEditId]);

  /* ── Data: IMEI search ── */
  const { data: imeiResults = [], isFetching: searchingImei } = useQuery({
    queryKey: ['imei-search', debouncedImeiSearch],
    queryFn: () => imeiApi.search(debouncedImeiSearch),
    enabled: debouncedImeiSearch.length >= 3,
  });

  /* ── Data: all products (for accessories filter) ── */
  const { data: productsData } = useQuery({
    queryKey: ['products-for-mobile-pos'],
    queryFn: () => productsApi.list({ page: 1, limit: 1000, isActive: true } as any),
  });
  const allProducts: Product[] = productsData?.items ?? [];

  /* ── Data: all IMEIs (to derive which products are phone-tracked) ── */
  const { data: imeiListData } = useQuery({
    queryKey: ['imei-list-for-pos-filter'],
    queryFn: () => imeiApi.listAll({ limit: 2000 }),
    staleTime: 60_000,
  });
  const phoneProductIds = useMemo(() => {
    const ids = new Set<string>();
    (imeiListData?.items ?? []).forEach((i: any) => ids.add(i.productId));
    return ids;
  }, [imeiListData]);

  /* Accessories = active products that have NO IMEI records at all */
  const accessories = useMemo(() => {
    let list = allProducts.filter((p) => !phoneProductIds.has(p.id));
    const q = accSearch.toLowerCase().trim();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q));
    return list;
  }, [allProducts, phoneProductIds, accSearch]);

  /* ── Data: used phones (IN_STOCK only) ── */
  const { data: usedPhonesData, isFetching: searchingUsedPhones } = useQuery({
    queryKey: ['used-phones-for-pos'],
    queryFn: () => usedPhonesApi.list({ status: 'IN_STOCK', limit: 500 }),
  });
  const usedPhoneResults = useMemo(() => {
    const list = usedPhonesData?.items ?? [];
    const q = usedPhoneSearch.toLowerCase().trim();
    if (!q) return list;
    return list.filter((p: UsedPhone) =>
      p.usedPhoneCode.toLowerCase().includes(q) ||
      p.imei1.includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.model.toLowerCase().includes(q),
    );
  }, [usedPhonesData, usedPhoneSearch]);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 } as any),
  });
  const customers = customersData?.items ?? [];
  const selectedCustomer = customers.find((c: any) => c.id === customerId);

  /* ── Cart math ── */
  const excludedImeiIds = cart.filter((c) => c.imeiId).map((c) => c.imeiId!);
  const excludedUsedPhoneIds = cart.filter((c) => c.usedPhoneId).map((c) => c.usedPhoneId!);
  const availableImeis = imeiResults.filter((i: ProductImei) => !excludedImeiIds.includes(i.id) && i.status === 'IN_STOCK');
  const availableUsedPhones = usedPhoneResults.filter((p: UsedPhone) => !excludedUsedPhoneIds.includes(p.id));
  const nonPtaInCart = cart.filter((c) => c.ptaStatus === 'NON_PTA' || c.ptaStatus === 'PENDING');

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.lineTotal, 0), [cart]);
  const discountAmount = useMemo(() => {
    if (discountMode === 'pct') return (subtotal * discountPct) / 100;
    return Math.min(Number(discountRs) || 0, subtotal);
  }, [subtotal, discountPct, discountRs, discountMode]);
  const total = useMemo(() => Math.max(subtotal - discountAmount, 0), [subtotal, discountAmount]);

  const effectivePaid = useMemo(() => {
    if (saleMode === 'FULL_PAYMENT') return total;
    if (saleMode === 'FULL_CREDIT') return 0;
    return Number(paidAmount) || 0;
  }, [saleMode, total, paidAmount]);

  const credit = Math.max(total - effectivePaid, 0);

  /* ── Cart ops ── */
  const addImeiToCart = (imei: ProductImei) => {
    if (excludedImeiIds.includes(imei.id)) return toast.error('Already in cart');
    const price = Number((imei as any).salePrice || (imei.product as any)?.price || 0);
    setCart((prev) => [...prev, {
      id: lineId(),
      type: 'imei',
      productId: imei.productId,
      variantId: imei.variantId || undefined,
      imeiId: imei.id,
      imeiNumber: imei.imei1,
      ptaStatus: imei.ptaStatus,
      warrantyMonths: imei.warrantyMonths || undefined,
      color: imei.color || imei.variant?.color || undefined,
      name: imei.product?.name || 'Mobile',
      image: (imei.product as any)?.images?.[0]?.url,
      unitPrice: price,
      basePrice: price,
      quantity: 1,
      stock: 1,
      lineTotal: price,
      note: `IMEI: ${imei.imei1}${imei.imei2 ? ` / ${imei.imei2}` : ''} • ${PTA_STATUS_LABELS[imei.ptaStatus]}${imei.warrantyMonths ? ` • ${imei.warrantyMonths}m warranty` : ''}`,
    }]);
    toast.success(`${imei.product?.name} added — IMEI ${imei.imei1}`, { duration: 1200 });
    setImeiSearch('');
  };

  const addUsedPhoneToCart = (phone: UsedPhone) => {
    if (excludedUsedPhoneIds.includes(phone.id)) return toast.error('Already in cart');
    const price = Number(phone.resalePrice) || 0;
    setCart((prev) => [...prev, {
      id: lineId(),
      type: 'usedphone',
      usedPhoneId: phone.id,
      usedPhoneCode: phone.usedPhoneCode,
      ptaStatus: phone.ptaStatus,
      color: phone.color || undefined,
      name: `${phone.brand} ${phone.model}${phone.storage ? ` ${phone.storage}` : ''} (Used)`,
      unitPrice: price,
      basePrice: price,
      quantity: 1,
      stock: 1,
      lineTotal: price,
      note: `Used • ${phone.usedPhoneCode} • IMEI: ${phone.imei1} • ${CONDITION_LABELS[phone.condition]} • ${PTA_STATUS_LABELS[phone.ptaStatus]}`,
    }]);
    toast.success(`${phone.brand} ${phone.model} added — ${phone.usedPhoneCode}`, { duration: 1200 });
    setUsedPhoneSearch('');
  };

  const addAccessory = (product: Product) => {
    if (product.stock <= 0) return toast.error('Stock khatam');
    const existing = cart.find((c) => c.type === 'accessory' && c.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return toast.error(`Stock sirf ${product.stock}`);
      setCart((prev) => prev.map((c) => c.id === existing.id ? { ...c, quantity: c.quantity + 1, lineTotal: (c.quantity + 1) * c.unitPrice } : c));
    } else {
      setCart((prev) => [...prev, {
        id: lineId(), type: 'accessory', productId: product.id,
        name: product.name, image: product.images?.[0]?.url,
        unitPrice: product.price, basePrice: product.price,
        quantity: 1, stock: product.stock, lineTotal: product.price,
      }]);
    }
    toast.success(`${product.name} added`, { duration: 900 });
  };

  const changeQty = (id: string, delta: number) => {
    setCart((prev) => prev.flatMap((l) => {
      if (l.id !== id || l.type !== 'accessory') return [l];
      const q = l.quantity + delta;
      if (q <= 0) return [];
      if (q > l.stock) { toast.error(`Stock sirf ${l.stock}`); return [l]; }
      return [{ ...l, quantity: q, lineTotal: q * l.unitPrice }];
    }));
  };

  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.id !== id));
  const clearCart = () => { setCart([]); setCustomerId(''); setDiscountPct(0); setDiscountRs(0); setPaidAmount(''); setSaleMode('FULL_PAYMENT'); };

  const setLinePrice = (id: string, price: number) => {
    setCart((prev) => prev.map((l) => l.id === id ? { ...l, unitPrice: Math.max(price, 0), lineTotal: l.quantity * Math.max(price, 0) } : l));
    setPriceEditId(null);
  };

  const handleBarcode = async (code: string) => {
    setScannerOpen(false);
    const trimmed = code.trim();
    if (!trimmed) return;
    setViewMode('imei');
    setImeiSearch(trimmed);
    toast.success(`Searching "${trimmed}"...`);
  };

  const holdCart = () => {
    if (cart.length === 0) return;
    setHeldCarts((prev) => [...prev, { id: lineId(), cart, customerId, heldAt: Date.now() }]);
    clearCart();
    toast.success('Cart hold ho gaya');
  };
  const resumeCart = (h: any) => {
    setCart(h.cart); setCustomerId(h.customerId);
    setHeldCarts((prev) => prev.filter((x) => x.id !== h.id));
    setShowHoldList(false);
    toast.success('Resume ho gaya');
  };

  /* ── Mutations ── */
  const addCustomerMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: (c: any) => {
      toast.success(`${c.name} added`);
      setCustomerId(c.id);
      setShowCustomerAdd(false);
      setNewCustomer({ name: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Add fail hua'),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => {
      if (!currentShopId) throw new Error('Shop select karein');
      return offlineSalesApi.create({
        shopId: currentShopId,
        customerId: customerId || undefined,
        paymentMethod,
        paidAmount: effectivePaid,
        discount: discountAmount,
        items: cart.map((c) => ({
          ...(c.productId ? { productId: c.productId } : {}),
          ...(c.usedPhoneId ? { usedPhoneId: c.usedPhoneId } : {}),
          variantId: c.variantId,
          imeiId: c.imeiId,
          quantity: c.quantity,
          priceOverride: c.unitPrice,
          note: c.note,
        })),
      });
    },
    onSuccess: (sale: any) => {
      setLastSale({ id: sale.id, number: sale.saleNumber });
      const autoOpen = localStorage.getItem('nafaa.pos.auto-open-receipt') !== 'false';
      if (autoOpen) window.open(`/sales/${sale.id}/receipt?auto=1`, '_blank');

      const hasImei = cart.some((c) => c.imeiId || c.usedPhoneId);
      if (hasImei && customerId && selectedCustomer && credit > 0) {
        setEmiPromptData({
          saleId: sale.id, saleNumber: sale.saleNumber, saleTotal: sale.total ?? total,
          paidAmount: sale.paidAmount ?? effectivePaid,
          customerId, customerName: selectedCustomer.name, customerPhone: selectedCustomer.phone ?? undefined,
        });
      } else {
        toast.success(`✓ Sale complete — ${sale.saleNumber}`);
      }
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['imei-search'] });
      queryClient.invalidateQueries({ queryKey: ['imei-list-for-pos-filter'] });
      queryClient.invalidateQueries({ queryKey: ['used-phones-for-pos'] });
      queryClient.invalidateQueries({ queryKey: ['used-phones'] });
      queryClient.invalidateQueries({ queryKey: ['used-phones-stats'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-mobile-pos'] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
    },
    onError: (e: any) => {
      if (!navigator.onLine) toast.info('📴 Offline — sale queue me chali gayi');
      else toast.error(e?.response?.data?.message || 'Sale fail hui');
    },
  });

  const handleCheckout = () => {
    if (cart.length === 0) return toast.error('Cart khaali hai');
    if (!currentShopId) return toast.error('Pehle shop select karein');
    if (credit > 0 && !customerId) return toast.error('Udhaar ke liye customer zaroori hai');
    if (nonPtaInCart.length > 0) {
      if (!confirm(`⚠️ ${nonPtaInCart.length} device(s) Non-PTA/Pending hain. Phir bhi bechna hai?`)) return;
    }
    checkoutMutation.mutate();
  };

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScannerOpen(false)} />}
      {showTeacher && <PosTeacher onClose={() => setShowTeacher(false)} />}

      {showDiscountModal && (
        <DiscountModal
          subtotal={subtotal} mode={discountMode} pct={discountPct} rs={discountRs}
          onApply={(m: DiscountMode, p: number, r: number) => { setDiscountMode(m); setDiscountPct(p); setDiscountRs(r); setShowDiscountModal(false); }}
          onClose={() => setShowDiscountModal(false)}
        />
      )}

      {emiPromptData && (
        <QuickEmiFromSaleModal
          saleId={emiPromptData.saleId}
          saleNumber={emiPromptData.saleNumber}
          saleTotal={emiPromptData.saleTotal}
          paidAmount={emiPromptData.paidAmount}
          customerId={emiPromptData.customerId}
          customerName={emiPromptData.customerName}
          customerPhone={emiPromptData.customerPhone}
          onSuccess={() => { setEmiPromptData(null); toast.success('EMI plan ban gaya!'); }}
          onClose={() => setEmiPromptData(null)}
        />
      )}

      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2"><UserPlus className="h-5 w-5" /><h3 className="font-extrabold">Naya Customer</h3></div>
              <button onClick={() => setShowCustomerAdd(false)} className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <input autoFocus value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Customer ka naam"
                className="h-14 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="03XX XXXXXXX"
                className="h-14 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" />
              <Button size="lg" className="w-full bg-gradient-to-r from-blue-600 to-indigo-700"
                onClick={() => { if (!newCustomer.name.trim()) return toast.error('Naam likhein'); addCustomerMutation.mutate({ name: newCustomer.name.trim(), phone: newCustomer.phone.trim() || undefined } as any); }}
                loading={addCustomerMutation.isPending}>Add Karein</Button>
            </div>
          </div>
        </div>
      )}

      {showHoldList && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2"><Pause className="h-5 w-5" /><h3 className="font-extrabold">Hold Carts</h3></div>
              <button onClick={() => setShowHoldList(false)} className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {heldCarts.length === 0 ? (
                <div className="text-center py-10"><Pause className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" /><p className="font-extrabold text-slate-600 dark:text-slate-300">Koi hold cart nahi</p></div>
              ) : heldCarts.map((h) => (
                <div key={h.id} className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center"><Smartphone className="h-5 w-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white">{h.cart.length} items</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">{new Date(h.heldAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <button onClick={() => resumeCart(h)} className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1"><Play className="h-3.5 w-3.5" /> Resume</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {lastSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLastSale(null)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-8 bg-gradient-to-br from-emerald-500 to-green-600 text-white text-center">
              <div className="h-16 w-16 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-3"><CheckCircle2 className="h-10 w-10" /></div>
              <h3 className="text-2xl font-extrabold">Sale Ho Gayi! 📱</h3>
              <p className="text-sm font-bold text-white/90 mt-1 font-mono">{lastSale.number}</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              <button onClick={() => window.open(`/sales/${lastSale.id}/receipt`, '_blank')} className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-2"><Printer className="h-4 w-4" /> Receipt</button>
              <button onClick={() => setLastSale(null)} className="h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 font-extrabold text-white inline-flex items-center justify-center gap-2">Nayi Sale <ArrowRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr_440px] gap-3 h-[calc(100dvh-7rem)]">
        {/* SEARCH SIDE */}
        <section className="rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-900 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
            <div className="relative px-4 py-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-extrabold border border-white/20">
                  <Smartphone className="h-3 w-3 text-amber-300" /> Mobile POS
                  {isOnline ? (
                    <span className="inline-flex items-center gap-1 text-emerald-200"><Wifi className="h-3 w-3" />LIVE</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-200 animate-pulse"><WifiOff className="h-3 w-3" />OFFLINE</span>
                  )}
                </div>
                <h2 className="mt-1.5 text-xl font-extrabold">📱 Device Sale</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setShowTeacher(true)} className="h-10 w-10 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 flex items-center justify-center shadow-lg transition"><GraduationCap className="h-5 w-5" /></button>
                {heldCarts.length > 0 && (
                  <button onClick={() => setShowHoldList(true)} className="h-10 px-2.5 rounded-xl bg-amber-500/30 hover:bg-amber-500/50 text-white text-xs font-extrabold inline-flex items-center gap-1 border border-amber-300/40"><Pause className="h-3.5 w-3.5" />{heldCarts.length}</button>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 px-3 pt-3 bg-slate-50 dark:bg-slate-900/60 border-b-2 border-slate-100 dark:border-slate-800">
            <div className="flex gap-1.5 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-1">
              <button onClick={() => setViewMode('imei')} className={`flex-1 h-11 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition ${viewMode === 'imei' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                <Smartphone className="h-4 w-4" /> New <span className="hidden sm:inline text-[9px] opacity-70 font-mono">F7</span>
              </button>
              <button onClick={() => setViewMode('usedphone')} className={`flex-1 h-11 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition ${viewMode === 'usedphone' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                <RefreshCw className="h-4 w-4" /> Used <span className="hidden sm:inline text-[9px] opacity-70 font-mono">F8</span>
              </button>
              <button onClick={() => setViewMode('accessories')} className={`flex-1 h-11 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition ${viewMode === 'accessories' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                <Cable className="h-4 w-4" /> Accessories
              </button>
            </div>
          </div>

          {viewMode === 'imei' && (
            <>
              <div className="shrink-0 px-3 py-3 bg-slate-50 dark:bg-slate-900/60 border-b-2 border-slate-100 dark:border-slate-800 flex gap-2">
                <div className="relative flex-1">
                  <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input ref={searchRef} autoFocus value={imeiSearch} onChange={(e) => setImeiSearch(e.target.value)}
                    placeholder="IMEI scan karo ya type karo (min 3 digits)..."
                    className="h-14 w-full rounded-2xl border-2 border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 pl-11 pr-10 text-base font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 transition" />
                  {imeiSearch && (
                    <button onClick={() => setImeiSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"><X className="h-4 w-4 text-slate-400" /></button>
                  )}
                </div>
                <button onClick={() => setScannerOpen(true)} className="h-14 w-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-700 dark:to-slate-800 hover:from-slate-800 text-white flex flex-col items-center justify-center gap-0.5 shadow-lg transition shrink-0">
                  <Camera className="h-5 w-5" /><span className="text-[9px] font-extrabold uppercase">Scan</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                {debouncedImeiSearch.length < 3 ? (
                  <EmptyState icon={Smartphone} title="IMEI search karo" hint="Kam se kam 3 digits type karo, ya camera se box ka IMEI barcode scan karo" />
                ) : searchingImei ? (
                  <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />)}</div>
                ) : availableImeis.length === 0 ? (
                  <EmptyState icon={AlertTriangle} title="Koi IMEI nahi mila" hint="Different search try karo ya IMEI double-check karo" tone="amber" />
                ) : (
                  availableImeis.map((imei: ProductImei) => {
                    const ptaCfg = PTA_STATUS_COLORS[imei.ptaStatus];
                    const risky = imei.ptaStatus === 'NON_PTA' || imei.ptaStatus === 'PENDING';
                    return (
                      <button key={imei.id} onClick={() => addImeiToCart(imei)}
                        className={`w-full rounded-2xl bg-white dark:bg-slate-900 border-2 hover:shadow-md p-3 flex items-start gap-3 text-left transition active:scale-[0.99] ${risky ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500/50'}`}>
                        <div className="h-14 w-14 rounded-xl bg-blue-100 dark:bg-blue-500/20 overflow-hidden flex items-center justify-center shrink-0">
                          {(imei.product as any)?.images?.[0]?.url ? (
                            <img src={(imei.product as any).images[0].url} alt="" className="w-full h-full object-cover" />
                          ) : <Smartphone className="h-7 w-7 text-blue-600 dark:text-blue-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{imei.product?.name}</div>
                          {imei.variant?.name && <div className="text-xs font-semibold text-violet-700 dark:text-violet-400">{imei.variant.name}</div>}
                          <div className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-0.5">IMEI: <strong>{imei.imei1}</strong></div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-extrabold uppercase ${ptaCfg.bg} ${ptaCfg.text} ${ptaCfg.border}`}>
                              <ShieldCheck className="h-2.5 w-2.5" />{PTA_STATUS_LABELS[imei.ptaStatus]}
                            </span>
                            {(imei.warrantyMonths ?? 0) > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 text-[9px] font-extrabold inline-flex items-center gap-0.5"><Award className="h-2.5 w-2.5" />{imei.warrantyMonths}m</span>
                            )}
                            {imei.color && <span className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[9px] font-extrabold">{imei.color}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{hidePrices ? '••••' : formatPKR((imei as any).salePrice || (imei.product as any)?.price || 0)}</div>
                          <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-auto mt-1" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}

          {viewMode === 'usedphone' && (
            <>
              <div className="shrink-0 px-3 py-3 bg-slate-50 dark:bg-slate-900/60 border-b-2 border-slate-100 dark:border-slate-800">
                <div className="relative">
                  <RefreshCw className="h-5 w-5 text-violet-600 dark:text-violet-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input autoFocus value={usedPhoneSearch} onChange={(e) => setUsedPhoneSearch(e.target.value)}
                    placeholder="Code / IMEI / brand / model search karo..."
                    className="h-14 w-full rounded-2xl border-2 border-violet-300 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/10 pl-11 pr-10 text-base font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-500/30 transition" />
                  {usedPhoneSearch && (
                    <button onClick={() => setUsedPhoneSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"><X className="h-4 w-4 text-slate-400" /></button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                {searchingUsedPhones ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />)}</div>
                ) : availableUsedPhones.length === 0 ? (
                  <EmptyState icon={RefreshCw} title="Koi used phone in-stock nahi" hint="Trade-in page se pehle used phone add karo, phir yahan bikega" />
                ) : (
                  availableUsedPhones.map((phone: UsedPhone) => {
                    const ptaCfg = PTA_STATUS_COLORS[phone.ptaStatus];
                    const condColors = CONDITION_COLORS[phone.condition];
                    const risky = phone.ptaStatus === 'NON_PTA' || phone.ptaStatus === 'PENDING';
                    return (
                      <button key={phone.id} onClick={() => addUsedPhoneToCart(phone)}
                        className={`w-full rounded-2xl bg-white dark:bg-slate-900 border-2 hover:shadow-md p-3 flex items-start gap-3 text-left transition active:scale-[0.99] ${risky ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-500/50'}`}>
                        <div className="h-14 w-14 rounded-xl bg-violet-100 dark:bg-violet-500/20 overflow-hidden flex items-center justify-center shrink-0">
                          <RefreshCw className="h-7 w-7 text-violet-600 dark:text-violet-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-extrabold text-[10px] text-violet-700 dark:text-violet-300">{phone.usedPhoneCode}</span>
                          </div>
                          <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{phone.brand} {phone.model}{phone.storage ? ` ${phone.storage}` : ''}</div>
                          <div className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-0.5">IMEI: <strong>{phone.imei1}</strong></div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${condColors.bg} ${condColors.text} ${condColors.border}`}>
                              <Star className="h-2.5 w-2.5 inline mr-0.5 fill-current" />{CONDITION_LABELS[phone.condition]}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-extrabold uppercase ${ptaCfg.bg} ${ptaCfg.text} ${ptaCfg.border}`}>
                              <ShieldCheck className="h-2.5 w-2.5" />{PTA_STATUS_LABELS[phone.ptaStatus]}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{hidePrices ? '••••' : formatPKR(phone.resalePrice)}</div>
                          <Plus className="h-4 w-4 text-violet-600 dark:text-violet-400 ml-auto mt-1" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}

          {viewMode === 'accessories' && (
            <>
              <div className="shrink-0 px-3 py-3 bg-slate-50 dark:bg-slate-900/60 border-b-2 border-slate-100 dark:border-slate-800">
                <div className="relative">
                  <Search className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={accSearch} onChange={(e) => setAccSearch(e.target.value)} placeholder="Charger, cover, handsfree..."
                    className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 bg-slate-50/50 dark:bg-slate-950/40">
                {accessories.length === 0 ? (
                  <EmptyState icon={Cable} title="Koi accessory nahi mili" hint="Products page se accessory add karo (naya phone IMEI wale products yahan nahi aate)" />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {accessories.map((p) => (
                      <button key={p.id} onClick={() => addAccessory(p)} disabled={p.stock <= 0}
                        className={`group text-left rounded-2xl border-2 overflow-hidden transition bg-white dark:bg-slate-900 ${p.stock <= 0 ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:shadow-md hover:-translate-y-0.5'}`}>
                        <div className="aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          {p.images?.[0]?.url ? <img src={p.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center"><Cable className="h-8 w-8 text-slate-400 dark:text-slate-500" /></div>}
                        </div>
                        <div className="p-2">
                          <div className="font-extrabold text-slate-900 dark:text-white text-xs line-clamp-2 min-h-[2rem]">{p.name}</div>
                          <div className="mt-1 flex items-baseline justify-between">
                            <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{hidePrices ? '•••' : formatPKR(p.price)}</div>
                            <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{p.stock} {p.unit}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* CART SIDE */}
        <aside className="rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 dark:from-slate-950 dark:via-emerald-950 dark:to-emerald-900 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Cart • {cart.length} items</div>
                <div className="text-3xl font-extrabold tabular-nums leading-none mt-1">{hidePrices ? '••••' : formatPKR(total)}</div>
              </div>
              <div className="flex gap-1.5">
                {cart.length > 0 && (
                  <>
                    <button onClick={holdCart} className="h-10 px-2.5 rounded-xl bg-white/15 hover:bg-amber-500/50 text-white text-xs font-extrabold border-2 border-white/20 transition inline-flex items-center gap-1"><Pause className="h-3.5 w-3.5" /> Hold</button>
                    <button onClick={() => { if (confirm('Cart khaali karein?')) clearCart(); }} className="h-10 px-2.5 rounded-xl bg-white/15 hover:bg-rose-500/50 text-white text-xs font-extrabold border-2 border-white/20 transition">Clear</button>
                  </>
                )}
              </div>
            </div>
            {nonPtaInCart.length > 0 && (
              <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-rose-500/30 border border-rose-300/40 text-[10px] font-extrabold inline-flex items-center gap-1.5">
                <AlertOctagon className="h-3 w-3" /> {nonPtaInCart.length} device Non-PTA/Pending
              </div>
            )}
          </div>

          <div className="shrink-0 p-3 border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5"><User className="h-3 w-3 text-blue-600 dark:text-blue-400" /> Customer</label>
              <button onClick={() => setShowCustomerAdd(true)} className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-700 inline-flex items-center gap-1"><UserPlus className="h-3 w-3" /> Add</button>
            </div>
            <div className="relative">
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-9 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 appearance-none">
                <option value="">Walk-in Customer</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` • ${c.phone}` : ''}{c.balance > 0 ? ` • Udhaar: ${formatPKR(c.balance)}` : ''}</option>)}
              </select>
              <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-slate-50/50 dark:bg-slate-950/40">
            {cart.length === 0 ? (
              <div className="rounded-3xl bg-white dark:bg-slate-900 border-4 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
                <Smartphone className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700 dark:text-slate-200">Cart khaali hai</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">IMEI / used phone search karo ya accessory tap karo</p>
              </div>
            ) : cart.map((line) => (
              <CartLineCard key={line.id} line={line} hidePrices={hidePrices}
                editing={priceEditId === line.id}
                onStartEdit={() => setPriceEditId(line.id)}
                onSetPrice={(p: number) => setLinePrice(line.id, p)}
                onCancelEdit={() => setPriceEditId(null)}
                onChangeQty={(d: number) => changeQty(line.id, d)}
                onRemove={() => removeLine(line.id)}
              />
            ))}
          </div>

          {cart.length > 0 && (
            <div className="shrink-0 p-3 border-t-4 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-2">
              <button onClick={() => setShowDiscountModal(true)}
                className={`w-full h-11 rounded-2xl font-extrabold text-sm inline-flex items-center justify-between px-4 border-2 transition ${discountAmount > 0 ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-400'}`}>
                <span className="inline-flex items-center gap-2"><Tag className="h-4 w-4" />{discountAmount > 0 ? `Discount: ${discountMode === 'pct' ? discountPct + '%' : formatPKR(discountRs)}` : 'Discount lagayein?'}</span>
                <ArrowRight className="h-4 w-4 opacity-60" />
              </button>

              <div className="grid grid-cols-3 gap-1.5">
                {(['FULL_PAYMENT', 'PARTIAL_CREDIT', 'FULL_CREDIT'] as SaleMode[]).map((m) => (
                  <button key={m} onClick={() => setSaleMode(m)} className={`h-10 rounded-xl text-[11px] font-extrabold transition ${saleMode === m ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                    {m === 'FULL_PAYMENT' ? 'Full Pay' : m === 'PARTIAL_CREDIT' ? 'Partial' : 'Udhaar'}
                  </button>
                ))}
              </div>

              {saleMode === 'PARTIAL_CREDIT' && (
                <input type="number" placeholder="Kitna paid?" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                  className="h-11 w-full rounded-xl border-2 border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-3 text-sm font-extrabold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-amber-500" />
              )}

              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500">
                <option value="CASH">💵 Cash</option>
                <option value="CARD">💳 Card</option>
                <option value="JAZZCASH">📱 JazzCash</option>
                <option value="EASYPAISA">⚡ EasyPaisa</option>
                <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
              </select>

              <div className="rounded-xl bg-gradient-to-br from-slate-950 to-blue-900 text-white p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
                {discountAmount > 0 && <div className="flex justify-between text-amber-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(discountAmount)}</span></div>}
                <div className="pt-1.5 mt-1 border-t border-white/20 flex justify-between items-center">
                  <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                  <span className="text-2xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
                </div>
                <FbrModeIndicator saleTotal={total} className="mt-1" />
                {credit > 0 && (
                  <div className="flex justify-between text-amber-300 pt-1 border-t border-white/20 mt-1">
                    <span className="font-extrabold">Udhaar</span><span className="font-extrabold tabular-nums">{formatPKR(credit)}</span>
                  </div>
                )}
              </div>

              <Button size="lg" className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 h-14" onClick={handleCheckout} loading={checkoutMutation.isPending} disabled={!currentShopId}>
                <CheckCircle2 className="h-5 w-5" /> Complete Sale (F9)
              </Button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

/* ══════════ CART LINE ══════════ */
function CartLineCard({ line, hidePrices, editing, onStartEdit, onSetPrice, onCancelEdit, onChangeQty, onRemove }: any) {
  const [draft, setDraft] = useState('');
  useEffect(() => { if (editing) setDraft(String(line.unitPrice)); }, [editing, line.unitPrice]);
  const commit = () => { const v = Number(draft); if (!isNaN(v) && v >= 0) onSetPrice(v); else onCancelEdit(); };
  const isFixedQty = line.type === 'imei' || line.type === 'usedphone';

  return (
    <div className={`rounded-xl border-2 p-3 space-y-2 ${
      line.type === 'imei' ? 'border-blue-200 dark:border-blue-500/40 bg-blue-50/50 dark:bg-blue-500/5' :
      line.type === 'usedphone' ? 'border-violet-200 dark:border-violet-500/40 bg-violet-50/50 dark:bg-violet-500/5' :
      'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {line.type === 'imei' && <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
            {line.type === 'usedphone' && <RefreshCw className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />}
            <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{line.name}</div>
          </div>
          {line.note && <div className="mt-1 text-[10px] font-mono text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/15 rounded px-1.5 py-0.5 inline-block">{line.note}</div>}

          {editing ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Rs</span>
              <input autoFocus type="number" value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancelEdit(); }} onBlur={commit}
                className="h-8 w-24 rounded-lg border-2 border-amber-400 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/10 px-2 text-sm font-extrabold tabular-nums text-amber-900 dark:text-amber-200 focus:outline-none" />
              <button onClick={commit} className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center"><Check className="h-4 w-4" /></button>
            </div>
          ) : (
            <button onClick={onStartEdit} className="mt-1 text-xs font-bold text-sky-700 dark:text-sky-400 hover:underline">{formatPKR(line.unitPrice)} / unit — tap to edit</button>
          )}
        </div>
        <button onClick={onRemove} className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0"><Trash2 className="h-4 w-4" /></button>
      </div>
      <div className="flex items-center justify-between">
        {isFixedQty ? (
          <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">1 unit ({line.type === 'usedphone' ? 'used-phone-locked' : 'IMEI-locked'})</span>
        ) : (
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
            <button onClick={() => onChangeQty(-1)} className="h-8 w-8 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center"><Minus className="h-3.5 w-3.5 text-slate-700 dark:text-slate-200" /></button>
            <span className="h-8 w-9 flex items-center justify-center text-xs font-extrabold tabular-nums text-slate-900 dark:text-white">{line.quantity}</span>
            <button onClick={() => onChangeQty(1)} className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center"><Plus className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{hidePrices ? '•••' : formatPKR(line.lineTotal)}</div>
      </div>
    </div>
  );
}

/* ══════════ DISCOUNT MODAL ══════════ */
function DiscountModal({ subtotal, mode: initMode, pct: initPct, rs: initRs, onApply, onClose }: any) {
  const [mode, setMode] = useState<DiscountMode>(initMode);
  const [pct, setPct] = useState(initPct ? String(initPct) : '');
  const [rs, setRs] = useState(initRs ? String(initRs) : '');
  const pctNum = Math.min(Math.max(Number(pct) || 0, 0), 100);
  const rsNum = Math.max(Math.min(Number(rs) || 0, subtotal), 0);
  const amount = mode === 'pct' ? (subtotal * pctNum) / 100 : rsNum;
  const finalTotal = Math.max(subtotal - amount, 0);
  const apply = () => onApply(mode, pctNum, rsNum);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase font-extrabold">Discount</div>
            <div className="text-xl font-extrabold tabular-nums">Subtotal: {formatPKR(subtotal)}</div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-5 pt-4"><div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          <button onClick={() => setMode('pct')} className={`h-11 rounded-xl text-sm font-extrabold inline-flex items-center justify-center gap-1.5 ${mode === 'pct' ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-md' : 'text-slate-600 dark:text-slate-300'}`}><Percent className="h-4 w-4" /> Percent</button>
          <button onClick={() => setMode('rs')} className={`h-11 rounded-xl text-sm font-extrabold inline-flex items-center justify-center gap-1.5 ${mode === 'rs' ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-md' : 'text-slate-600 dark:text-slate-300'}`}><Banknote className="h-4 w-4" /> Rupees</button>
        </div></div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className={`rounded-2xl border-2 p-4 text-center ${mode === 'pct' ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10' : 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10'}`}>
            <div className="flex items-baseline justify-center gap-1">
              {mode === 'rs' && <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">Rs</span>}
              <div className={`text-5xl font-extrabold tabular-nums ${mode === 'pct' ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{mode === 'pct' ? (pct || '0') : (rs || '0')}</div>
              {mode === 'pct' && <span className="text-2xl font-extrabold text-amber-700 dark:text-amber-300">%</span>}
            </div>
          </div>
          <input autoFocus type="number" value={mode === 'pct' ? pct : rs} onChange={(e) => mode === 'pct' ? setPct(e.target.value) : setRs(e.target.value)}
            className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-center text-lg font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" placeholder="0" />
          <div className="grid grid-cols-5 gap-1.5">
            {(mode === 'pct' ? [5, 10, 15, 20, 25] : [50, 100, 200, 500, 1000]).map((v) => (
              <button key={v} onClick={() => mode === 'pct' ? setPct(String(v)) : setRs(String(v))}
                className="h-10 rounded-xl text-xs font-extrabold border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400 transition tabular-nums">{v}{mode === 'pct' ? '%' : ''}</button>
            ))}
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-slate-800 text-white p-4">
            <div className="flex justify-between text-sm"><span className="text-white/70">Discount</span><span className="tabular-nums text-rose-300">−{formatPKR(amount)}</span></div>
            <div className="flex justify-between text-lg font-extrabold mt-1"><span>Final Total</span><span className="tabular-nums text-emerald-300">{formatPKR(finalTotal)}</span></div>
          </div>
        </div>
        <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-3 grid grid-cols-2 gap-2">
          <button onClick={() => { setPct(''); setRs(''); onApply(mode, 0, 0); }} className="h-12 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1"><RotateCcw className="h-4 w-4" /> Clear</button>
          <button onClick={apply} className="h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-extrabold inline-flex items-center justify-center gap-1.5"><Check className="h-5 w-5" /> Apply</button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint, tone = 'slate' }: any) {
  const tones: Record<string, string> = { slate: 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500', amber: 'bg-amber-100 dark:bg-amber-500/15 text-amber-500 dark:text-amber-400' };
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6">
      <div className={`h-16 w-16 rounded-3xl flex items-center justify-center ${tones[tone]}`}><Icon className="h-8 w-8" /></div>
      <h3 className="mt-3 font-extrabold text-slate-900 dark:text-white text-lg">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 text-center font-semibold">{hint}</p>
    </div>
  );
}

function PosTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-blue-200 dark:border-blue-500/30 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/15 dark:to-indigo-500/15 flex items-center justify-between sticky top-0">
          <h3 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Mobile POS Guide</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center"><X className="h-4 w-4 text-slate-600 dark:text-slate-300" /></button>
        </div>
        <div className="p-5 space-y-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <Tip><strong>New</strong> tab — naye phone ka IMEI search karo</Tip>
          <Tip><strong>Used</strong> tab — trade-in liye hue phones jo In-Stock hain, seedha bikte hain</Tip>
          <Tip><strong>Accessories</strong> tab — jo bhi product IMEI-tracked nahi hai (charger, cover, etc.)</Tip>
          <Tip>Har IMEI/used-phone ka PTA status badge dikhta hai — Non-PTA/Pending pe checkout se pehle warning ata hai</Tip>
          <Tip>Cart me price pe click karo → custom rate laga sakte ho</Tip>
          <Tip>Udhaar sale ho tou customer zaroori — sale ke baad EMI plan offer hoga automatically</Tip>
          <Tip><strong>F2</strong> scan • <strong>F7/F8</strong> tabs • <strong>F9</strong> checkout • <strong>F1</strong> ye guide</Tip>
          <Tip>📴 Offline? Sale phir bhi hoti hai, net aate hi sync ho jati hai</Tip>
          <Button className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-700 h-11" onClick={onClose}><CheckCircle2 className="h-4 w-4" /> Samajh Gaya!</Button>
        </div>
      </div>
    </div>
  );
}
function Tip({ children }: { children: React.ReactNode }) {
  return <div className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>{children}</span></div>;
}
