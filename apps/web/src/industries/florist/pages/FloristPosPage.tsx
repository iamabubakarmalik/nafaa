import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, X, Camera, ScanLine, UserPlus, CheckCircle2,
  Store, Eye, EyeOff, ArrowRight, Printer, Star, Play, Pause,
  Flower2, Truck, Wifi, WifiOff, Wand2, Package,
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
import { floristProductsApi } from '../api/products.api';
import { floristOrdersApi } from '../api/orders.api';
import { DeliverySchedulerModal, type DeliveryDetails } from '../components/pos/DeliverySchedulerModal';
import { FloristPosCart, type CartLine } from '../components/pos/FloristPosCart';

const HIDE_KEY = 'nafaa.florist-pos.hide-prices';
const lineId = () => `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const CATEGORY_CHIPS = [
  { v: '', l: 'All', e: '🌸' }, { v: 'BOUQUET', l: 'Bouquets', e: '💐' },
  { v: 'FRESH_FLOWER_STEM', l: 'Stems', e: '🌹' }, { v: 'ARRANGEMENT', l: 'Arrangements', e: '🌷' },
  { v: 'BASKET', l: 'Baskets', e: '🧺' }, { v: 'POTTED_PLANT', l: 'Plants', e: '🪴' },
  { v: 'FLOWER_GIFT_BOX', l: 'Gift Box', e: '🎁' }, { v: 'ARTIFICIAL_FLOWER', l: 'Artificial', e: '🌼' },
];
const OCCASIONS = ['Birthday', 'Anniversary', 'Wedding', 'Sympathy', 'Congratulations'];

export default function FloristPosPage() {
  const qc = useQueryClient();
  const shopId = useAuthStore((s) => s.currentShopId);
  const tenant = useAuthStore((s) => s.tenant);

  const [hidePrices, setHidePrices] = useState(() => localStorage.getItem(HIDE_KEY) === 'true');
  const [search, setSearch] = useState('');
  const [dSearch, setDSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [occFilter, setOccFilter] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [scanner, setScanner] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showDelivery, setShowDelivery] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryDetails | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAddCust, setShowAddCust] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [held, setHeld] = useState<Array<{ id: string; lines: CartLine[]; customerId: string; total: number; at: number }>>([]);
  const [showHeld, setShowHeld] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '' });
  const [last, setLast] = useState<{ id: string; number: string; change: number; orderNumber?: string } | null>(null);
  const [visible, setVisible] = useState(60);
  const [online, setOnline] = useState(navigator.onLine);
  const [customizing, setCustomizing] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');

  const barcodeRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem(HIDE_KEY, String(hidePrices)); }, [hidePrices]);
  useEffect(() => { const t = setTimeout(() => setDSearch(search), 120); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setVisible(60); if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [dSearch, catFilter, occFilter]);
  useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); setScanner(true); }
      if (e.key === 'F9') { e.preventDefault(); if (cart.length) setShowDelivery(true); }
      if (e.key === 'Escape') { setScanner(false); setShowDelivery(false); setShowCheckout(false); setShowMobileCart(false); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [cart.length]);

  const { data: pData, isLoading } = useQuery({
    queryKey: ['products-for-florist-pos'],
    queryFn: () => productsApi.list({ page: 1, limit: 2000 }), staleTime: 30_000,
  });
  const { data: cData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }), staleTime: 60_000,
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ['florist-profiles-all'],
    queryFn: () => floristProductsApi.list(), staleTime: 60_000,
  });

  const products: Product[] = pData?.items ?? [];
  const customers = cData?.items ?? [];
  const customer = customers.find((c) => c.id === customerId);
  const pmap = useMemo(() => {
    const m = new Map<string, any>();
    (profiles as any[]).forEach((p) => m.set(p.productId, p));
    return m;
  }, [profiles]);

  const filtered = useMemo(() => {
    let l = products.filter((p) => p.isActive !== false);
    if (catFilter) l = l.filter((p) => pmap.get(p.id)?.categoryType === catFilter);
    if (occFilter) l = l.filter((p) => pmap.get(p.id)?.occasions?.includes(occFilter));
    const q = dSearch.toLowerCase().trim();
    if (q) l = l.filter((p) => {
      const pr = pmap.get(p.id);
      return p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) ||
        (pr?.flowerType || '').toLowerCase().includes(q) || (pr?.color || '').toLowerCase().includes(q);
    });
    return l.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      if ((a.stock <= 0) !== (b.stock <= 0)) return a.stock <= 0 ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [products, dSearch, catFilter, occFilter, pmap]);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.lineTotal, 0), [cart]);
  const discountAmount = (subtotal * discountPct) / 100;
  const afterDiscount = subtotal - discountAmount;
  const extra = (delivery?.deliveryCharge || 0) + (delivery?.wrappingCharge || 0);
  const total = afterDiscount + extra;
  const totalQty = cart.reduce((s, l) => s + l.quantity, 0);

  const addProduct = useCallback((p: Product) => {
    if (p.stock <= 0) return toast.error(`${p.name} — out of stock`);
    const pr = pmap.get(p.id);
    const ex = cart.find((l) => l.productId === p.id && !l.customization);
    if (ex) {
      const q = ex.quantity + 1;
      if (q > p.stock) return toast.error(`Stock only ${p.stock}`);
      setCart((c) => c.map((l) => l.id === ex.id ? { ...l, quantity: q, lineTotal: q * l.unitPrice } : l));
      return toast.success(`${p.name} +1`, { duration: 800 });
    }
    setCart((c) => [...c, {
      id: lineId(), productId: p.id, name: p.name, image: p.images?.[0]?.url,
      flowerType: pr?.flowerType, color: pr?.color, colorHex: pr?.colorHex,
      unitPrice: p.price, quantity: 1, baseStock: p.stock, lineTotal: p.price,
      isCustomizable: pr?.isCustomizable,
    }]);
    toast.success(`${p.name} added`, { duration: 800 });
  }, [cart, pmap]);

  const changeQty = (id: string, d: number) => setCart((c) => c.flatMap((l) => {
    if (l.id !== id) return [l];
    const q = l.quantity + d;
    if (q <= 0) return [];
    if (q > l.baseStock) { toast.error(`Stock only ${l.baseStock}`); return [l]; }
    return [{ ...l, quantity: q, lineTotal: q * l.unitPrice }];
  }));
  const setQty = (id: string, q: number) => setCart((c) => c.flatMap((l) => {
    if (l.id !== id) return [l];
    if (q <= 0) return [];
    if (q > l.baseStock) { toast.error(`Stock only ${l.baseStock}`); return [l]; }
    return [{ ...l, quantity: q, lineTotal: q * l.unitPrice }];
  }));
  const clearCart = () => { setCart([]); setCustomerId(''); setDiscountPct(0); setDelivery(null); };

  const handleBarcode = async (code: string) => {
    setScanner(false);
    const t = code.trim(); if (!t) return;
    try { addProduct(await productsApi.byBarcode(t)); }
    catch { toast.error(`Barcode "${t}" not found`); }
  };

  const addCust = useMutation({
    mutationFn: customersApi.create,
    onSuccess: (c) => {
      toast.success(`${c.name} added`); setCustomerId(c.id); setShowAddCust(false);
      setNewCust({ name: '', phone: '' });
      qc.invalidateQueries({ queryKey: ['customers-for-pos'] });
    },
  });

  const checkout = useMutation({
    mutationFn: async (d: { paymentMethod: PaymentMethod; paidAmount: number }) => {
      if (!shopId) throw new Error('Select shop first');
      const sale = await salesApi.create({
        shopId, customerId: customerId || undefined,
        paymentMethod: d.paymentMethod, paidAmount: d.paidAmount, discount: discountAmount,
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, priceOverride: l.unitPrice, note: l.customization })),
      });
      let orderNumber: string | undefined;
      if (delivery && delivery.orderType !== 'WALK_IN') {
        try {
          const o = await floristOrdersApi.create({
            orderType: delivery.orderType as any,
            customerId: customerId || undefined,
            customerName: customer?.name || delivery.senderName || 'Walk-in',
            customerPhone: customer?.phone || delivery.recipientPhone || '',
            senderName: delivery.isAnonymous ? undefined : delivery.senderName,
            recipientName: delivery.recipientName, recipientPhone: delivery.recipientPhone,
            deliveryAddress: delivery.deliveryAddress, city: delivery.city,
            area: delivery.area, landmark: delivery.landmark,
            messageCard: delivery.messageCard, isAnonymous: delivery.isAnonymous,
            items: cart.map((l) => ({
              productId: l.productId, productName: l.name, quantity: l.quantity,
              unitPrice: l.unitPrice, total: l.lineTotal, customization: l.customization,
            })),
            discountAmount, deliveryCharge: delivery.deliveryCharge,
            wrappingCharge: delivery.wrappingCharge, advancePaid: d.paidAmount,
            paymentMethod: d.paymentMethod, deliveryTimeSlot: delivery.deliveryTimeSlot as any,
            scheduledDeliveryDate: delivery.scheduledDeliveryDate,
            scheduledDeliveryTime: delivery.scheduledDeliveryTime,
            eventName: delivery.eventName || undefined, eventVenue: delivery.eventVenue || undefined,
            specialInstructions: delivery.specialInstructions,
            notes: `POS sale ${sale.saleNumber}`,
          } as any);
          orderNumber = o.orderNumber;
        } catch { toast.error('Sale saved but delivery order failed — create it manually'); }
      }
      return { sale, orderNumber };
    },
    onSuccess: ({ sale, orderNumber }, v) => {
      setLast({ id: sale.id, number: sale.saleNumber, change: Math.max(v.paidAmount - total, 0), orderNumber });
      setShowCheckout(false); setShowMobileCart(false); clearCart();
      ['products-for-florist-pos', 'sales-list', 'florist-orders-list', 'florist-dashboard-overview']
        .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      if (localStorage.getItem('nafaa.pos.auto-open-receipt') !== 'false')
        window.open(`/sales/${sale.id}/receipt?auto=1`, '_blank');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Sale failed'),
  });

  return (
    <>
      {scanner && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScanner(false)} />}

      {showDelivery && (
        <DeliverySchedulerModal cartTotal={afterDiscount}
          customerName={customer?.name || undefined} customerPhone={customer?.phone || undefined}
          initial={delivery ?? undefined}
          onConfirm={(d) => { setDelivery(d); setShowDelivery(false); setShowCheckout(true); }}
          onClose={() => setShowDelivery(false)} />
      )}

      {showCheckout && (
        <RetailQuickCash total={total} itemCount={cart.length} loading={checkout.isPending}
          customerName={customer?.name} customerBalance={Number(customer?.balance || 0)}
          hasCustomer={!!customerId}
          onConfirm={({ paymentMethod, paidAmount }) => checkout.mutate({ paymentMethod, paidAmount })}
          onClose={() => setShowCheckout(false)} />
      )}

      {customizing && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2"><Wand2 className="h-6 w-6" /><h3 className="font-extrabold text-xl">Customize</h3></div>
              <button onClick={() => { setCustomizing(null); setCustomText(''); }}
                className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <textarea autoFocus rows={4} value={customText} onChange={(e) => setCustomText(e.target.value)}
                placeholder="Extra roses, gold ribbon, add chocolate box..."
                className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-base font-semibold focus:outline-none focus:border-violet-500" />
              <div className="flex gap-2">
                <button onClick={() => { setCustomizing(null); setCustomText(''); }}
                  className="flex-1 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 font-extrabold text-slate-700">Cancel</button>
                <button onClick={() => {
                  setCart((c) => c.map((l) => l.id === customizing ? { ...l, customization: customText.trim() || undefined } : l));
                  setCustomizing(null); setCustomText(''); toast.success('Saved');
                }} className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 font-extrabold text-white">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddCust && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2"><UserPlus className="h-6 w-6" /><h3 className="font-extrabold text-xl">New Customer</h3></div>
              <button onClick={() => setShowAddCust(false)} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <input autoFocus value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                placeholder="Customer name"
                className="h-16 w-full rounded-2xl border-4 border-slate-200 px-4 text-xl font-bold focus:outline-none focus:border-pink-500" />
              <input value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                placeholder="03XX XXXXXXX"
                className="h-16 w-full rounded-2xl border-4 border-slate-200 px-4 text-xl font-bold focus:outline-none focus:border-pink-500" />
              <button onClick={() => {
                if (!newCust.name.trim()) return toast.error('Name required');
                addCust.mutate({ name: newCust.name.trim(), phone: newCust.phone.trim() || undefined });
              }} disabled={addCust.isPending}
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 font-extrabold text-white text-xl shadow-lg disabled:opacity-50">
                Add Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {showHeld && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2"><Pause className="h-6 w-6" /><h3 className="font-extrabold text-xl">Held Carts</h3></div>
              <button onClick={() => setShowHeld(false)} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {held.length === 0 ? (
                <div className="text-center py-12"><Pause className="h-12 w-12 text-slate-300 mx-auto mb-2" /><p className="font-extrabold text-slate-700">No held carts</p></div>
              ) : held.map((h) => (
                <div key={h.id} className="rounded-2xl border-2 border-slate-200 p-3 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><ShoppingCart className="h-6 w-6" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 text-sm">{h.lines.length} items • {formatPKR(h.total)}</div>
                    <div className="text-xs text-slate-500 font-bold">{new Date(h.at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <button onClick={() => { setCart(h.lines); setCustomerId(h.customerId); setHeld((p) => p.filter((x) => x.id !== h.id)); setShowHeld(false); }}
                    className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
                    <Play className="h-3.5 w-3.5" /> Resume
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {last && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLast(null)}>
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 py-8 bg-gradient-to-br from-emerald-500 to-green-600 text-white text-center">
              <button onClick={() => setLast(null)} className="absolute top-3 right-3 h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center"><X className="h-5 w-5" /></button>
              <div className="h-20 w-20 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-3"><CheckCircle2 className="h-12 w-12" /></div>
              <h3 className="text-3xl font-extrabold">Sale Complete! 🌸</h3>
              <p className="text-sm font-bold text-white/90 mt-1 font-mono">{last.number}</p>
              {last.orderNumber && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-xs font-extrabold">
                  <Truck className="h-3.5 w-3.5" /> Delivery order {last.orderNumber}
                </div>
              )}
            </div>
            {last.change > 0 && (
              <div className="px-6 py-5 bg-amber-50 border-b-4 border-amber-200 text-center">
                <div className="text-xs uppercase font-extrabold text-amber-800 tracking-wider">Give change</div>
                <div className="text-5xl font-extrabold text-amber-700 tabular-nums mt-1">{formatPKR(last.change)}</div>
              </div>
            )}
            <div className="p-4 grid grid-cols-2 gap-2">
              <button onClick={() => window.open(`/sales/${last.id}/receipt`, '_blank')}
                className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 font-extrabold text-slate-700 inline-flex items-center justify-center gap-2">
                <Printer className="h-5 w-5" /> Receipt
              </button>
              <button onClick={() => setLast(null)}
                className="h-14 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 font-extrabold text-white text-lg shadow-lg inline-flex items-center justify-center gap-2">
                New Sale <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LAYOUT */}
      <div className="min-h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-7rem)] flex flex-col lg:grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px] gap-2 lg:gap-3">
        <section className="lg:flex-1 rounded-2xl lg:rounded-3xl bg-white border-2 border-slate-200 shadow-sm lg:overflow-hidden flex flex-col lg:min-h-0">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-pink-400/20 blur-2xl" />
            <div className="relative px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-2 ring-white/20 shrink-0">
                  <Flower2 className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-extrabold leading-none">🌸 Florist POS</h2>
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center ${online ? 'bg-emerald-500/30' : 'bg-amber-500/30'}`}>
                      {online ? <Wifi className="h-3 w-3 text-emerald-200" /> : <WifiOff className="h-3 w-3 text-amber-200" />}
                    </div>
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/80 font-semibold mt-0.5 flex items-center gap-1 truncate">
                    <Store className="h-3 w-3 shrink-0" /><span className="truncate">{tenant?.name || 'Flower Shop'}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {held.length > 0 && (
                  <button onClick={() => setShowHeld(true)}
                    className="h-10 sm:h-11 px-2.5 rounded-2xl bg-amber-500/30 hover:bg-amber-500/50 text-xs font-extrabold inline-flex items-center gap-1 border-2 border-amber-300/40">
                    <Pause className="h-4 w-4" /> {held.length}
                  </button>
                )}
                <button onClick={() => setHidePrices((v) => !v)}
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center border-2 border-white/20">
                  {hidePrices ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                <button onClick={() => setShowMobileCart(true)}
                  className="lg:hidden relative h-10 w-10 rounded-2xl bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5" />
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">{cart.length}</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="shrink-0 px-3 sm:px-4 py-2.5 bg-slate-50 border-b-2 border-slate-100 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Bouquet / flower / colour..."
                  className="h-14 sm:h-16 w-full rounded-2xl border-4 border-slate-200 bg-white pl-11 sm:pl-14 pr-10 text-lg sm:text-xl font-bold focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-200" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center">
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                )}
              </div>
              <button onClick={() => setScanner(true)}
                className="h-14 sm:h-16 w-16 sm:w-20 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 text-white flex flex-col items-center justify-center gap-0.5 shadow-lg shrink-0">
                <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-[9px] font-extrabold uppercase">Scan</span>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (barcodeInput.trim()) { handleBarcode(barcodeInput); setBarcodeInput(''); } }} className="relative">
              <ScanLine className="h-4 w-4 text-pink-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input ref={barcodeRef} value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Barcode..."
                className="h-10 sm:h-12 w-full rounded-2xl border-2 border-pink-300 bg-pink-50 pl-10 pr-3 text-sm font-mono font-extrabold focus:outline-none focus:border-pink-600" />
            </form>

            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {CATEGORY_CHIPS.map((c) => (
                <button key={c.v} onClick={() => setCatFilter(catFilter === c.v ? '' : c.v)}
                  className={`shrink-0 h-9 sm:h-10 px-3 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 border-2 transition ${
                    catFilter === c.v ? 'bg-pink-600 text-white border-pink-600 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-pink-300'}`}>
                  <span>{c.e}</span>{c.l}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              <span className="shrink-0 text-[10px] uppercase font-extrabold text-slate-500 self-center pr-1">Occasion:</span>
              {OCCASIONS.map((o) => (
                <button key={o} onClick={() => setOccFilter(occFilter === o ? '' : o)}
                  className={`shrink-0 h-8 px-2.5 rounded-lg text-[11px] font-extrabold border-2 transition ${
                    occFilter === o ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300'}`}>
                  {o}
                </button>
              ))}
            </div>
          </div>

          <div ref={scrollRef}
            onScroll={(e) => {
              const t = e.currentTarget;
              if (filtered.length > visible && (t.scrollTop + t.clientHeight) / t.scrollHeight > 0.85)
                setVisible((c) => Math.min(c + 60, filtered.length));
            }}
            className="lg:flex-1 lg:overflow-y-auto p-2 sm:p-3 bg-slate-50/50 lg:min-h-0">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-200 animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="h-20 w-20 rounded-3xl bg-slate-200 flex items-center justify-center"><Package className="h-10 w-10 text-slate-400" /></div>
                <h3 className="mt-4 font-extrabold text-slate-900 text-xl">No products found</h3>
                <p className="mt-2 text-sm text-slate-500 font-semibold">{search ? `Search: "${search}"` : 'Add products first'}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                  {filtered.slice(0, visible).map((p) => {
                    const pr = pmap.get(p.id);
                    const inCart = cart.filter((l) => l.productId === p.id).reduce((s, l) => s + l.quantity, 0);
                    const out = p.stock <= 0;
                    const low = !out && p.stock <= (p.lowStockAlert || 0);
                    const freshDays = pr?.freshUntil ? Math.ceil((new Date(pr.freshUntil).getTime() - Date.now()) / 86400000) : null;
                    return (
                      <button key={p.id} onClick={() => addProduct(p)} disabled={out}
                        className={`group relative text-left rounded-2xl border-4 overflow-hidden transition-all active:scale-95 ${
                          out ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
                            : inCart > 0 ? 'border-emerald-500 bg-emerald-50 shadow-xl ring-4 ring-emerald-200'
                              : 'border-slate-200 bg-white hover:border-pink-400 hover:shadow-xl hover:-translate-y-1'}`}>
                        {inCart > 0 && (
                          <div className="absolute -top-2 -right-2 min-w-[32px] h-8 px-2 rounded-full bg-emerald-600 text-white text-sm font-extrabold flex items-center justify-center shadow-xl ring-4 ring-white z-10 tabular-nums">{inCart}</div>
                        )}
                        <div className="aspect-square bg-slate-100 overflow-hidden relative">
                          {p.images?.[0]?.url ? (
                            <img src={p.images[0].url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50"><Flower2 className="h-12 w-12 text-pink-300" /></div>
                          )}
                          {out && <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center"><span className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs font-extrabold shadow-lg">OUT</span></div>}
                          {low && !out && <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-extrabold shadow-lg animate-pulse">LOW</div>}
                          {p.isFeatured && !out && <div className="absolute top-1.5 left-1.5 h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center shadow-lg"><Star className="h-3.5 w-3.5 fill-white text-white" /></div>}
                          {freshDays !== null && freshDays <= 2 && !out && (
                            <div className={`absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-white text-[9px] font-extrabold shadow ${freshDays <= 0 ? 'bg-rose-600' : 'bg-amber-500'}`}>
                              {freshDays <= 0 ? '🥀' : `${freshDays}D`}
                            </div>
                          )}
                          {pr?.isCustomizable && !out && (
                            <div className="absolute bottom-1.5 left-1.5 h-6 px-1.5 rounded-md bg-violet-600 flex items-center gap-1 text-white text-[9px] font-extrabold shadow">
                              <Wand2 className="h-2.5 w-2.5" /> CUSTOM
                            </div>
                          )}
                        </div>
                        <div className="p-2 sm:p-3">
                          <div className="font-extrabold text-slate-900 text-sm sm:text-base line-clamp-2 leading-tight min-h-[2.25rem]">{p.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {pr?.color && <span className="h-3 w-3 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: pr.colorHex || '#ec4899' }} />}
                            {pr?.flowerType && <span className="text-[9px] font-extrabold uppercase text-pink-700 truncate">{pr.flowerType}</span>}
                          </div>
                          <div className="mt-1.5 flex items-end justify-between gap-1">
                            <div className="text-lg sm:text-2xl font-extrabold text-emerald-700 leading-none tabular-nums">{hidePrices ? '•••' : formatPKR(p.price)}</div>
                            <div className={`text-xs sm:text-sm font-extrabold tabular-nums shrink-0 ${out ? 'text-rose-700' : low ? 'text-amber-700' : 'text-slate-600'}`}>{p.stock}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {filtered.length > visible && (
                  <button onClick={() => setVisible((c) => c + 60)}
                    className="mt-3 w-full h-12 rounded-2xl bg-white border-4 border-slate-200 hover:border-pink-400 text-slate-700 text-sm font-extrabold inline-flex items-center justify-center gap-2">
                    <Package className="h-4 w-4" /> Load more ({filtered.length - visible} remaining)
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        <FloristPosCart
          isMobile={showMobileCart} onCloseMobile={() => setShowMobileCart(false)}
          cart={cart} itemCount={cart.length} totalQty={totalQty}
          subtotal={subtotal} total={total} extraCharges={extra}
          discountPct={discountPct} setDiscountPct={setDiscountPct}
          hidePrices={hidePrices} customers={customers} customerId={customerId}
          setCustomerId={setCustomerId} onAddCustomer={() => setShowAddCust(true)}
          onHold={() => {
            if (!cart.length) return;
            setHeld((p) => [...p, { id: `h-${Date.now()}`, lines: cart, customerId, total, at: Date.now() }]);
            clearCart(); toast.success('Cart held');
          }}
          onClear={() => { if (confirm('Clear cart?')) clearCart(); }}
          onChangeQty={changeQty} onSetQty={setQty}
          onRemove={(id) => setCart((c) => c.filter((l) => l.id !== id))}
          onCustomize={(id, cur) => { setCustomizing(id); setCustomText(cur || ''); }}
          onProceed={() => setShowDelivery(true)} canProceed={!!shopId}
          hasDelivery={!!delivery}
        />
      </div>

      {cart.length > 0 && !showMobileCart && (
        <div className="lg:hidden fixed bottom-4 inset-x-4 z-30">
          <button onClick={() => setShowMobileCart(true)}
            className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-2xl active:scale-[0.98] flex items-center justify-between px-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 min-w-[22px] h-5 px-1 rounded-full bg-white text-emerald-700 text-[11px] font-extrabold flex items-center justify-center">{cart.length}</span>
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
