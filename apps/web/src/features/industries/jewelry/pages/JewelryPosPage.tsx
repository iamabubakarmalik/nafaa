import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Gem, Search, X, Plus, Trash2, User, UserPlus, Scale, Calculator,
  Coins, TrendingUp, Sparkles, DollarSign, CheckCircle2, ChevronDown,
  Award, ShieldCheck, Repeat, Package, Diamond, Percent, ArrowLeft, Camera,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import { productsApi, type Product } from '@/api/products.api';
import { customersApi } from '@/api/customers.api';
import { jewelrySalesApi } from '../api/sales.api';
import { jewelryProductsApi } from '../api/products.api';
import { metalRatesApi } from '../api/metal-rates.api';
import { useSharedPosCart, cartLineId } from '@/features/pos/hooks/useSharedPosCart';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';

const METAL_ICONS: Record<string, string> = {
  GOLD: '🥇', SILVER: '🥈', PLATINUM: '💠',
  ROSE_GOLD: '🌹', WHITE_GOLD: '⚪', PALLADIUM: '⬜',
};

const METAL_COLORS: Record<string, string> = {
  GOLD: 'from-amber-500 to-yellow-600',
  SILVER: 'from-slate-400 to-slate-500',
  PLATINUM: 'from-cyan-400 to-blue-500',
  ROSE_GOLD: 'from-rose-400 to-pink-500',
  WHITE_GOLD: 'from-slate-300 to-slate-400',
  PALLADIUM: 'from-slate-500 to-slate-600',
};

interface JewelryCartLine {
  cartLineId: string;
  productId: string;
  jewelryProfileId?: string;
  name: string;
  category: string;
  metalType: string;
  purity: string;
  ratePerGram: number;
  grossWeight: number;
  netWeight: number;
  stoneWeight: number;
  makingChargePerGram: number;
  makingChargeFixed: number;
  makingChargePct: number;
  wastagePct: number;
  polishCharges: number;
  hallmarkCharges: number;
  stoneValue: number;
  quantity: number;
  hallmarkNumber?: string;
  isCertified: boolean;
  buyBackPct: number;
  imageUrl?: string;
}

export default function JewelryPosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const [search, setSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cart, setCart] = useState<JewelryCartLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCnic, setCustomerCnic] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState('');
  const [gstAmount, setGstAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'BANK' | 'MIXED'>('CASH');
  const [exchangeGrams, setExchangeGrams] = useState('');
  const [exchangePurity, setExchangePurity] = useState('');
  const [exchangeValue, setExchangeValue] = useState('');
  const [hallmarkVerified, setHallmarkVerified] = useState(false);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  const { data: rates = [] } = useQuery({
    queryKey: ['metal-rates-current'],
    queryFn: () => metalRatesApi.current(),
    refetchInterval: 60_000,
  });

  const { data: productsData } = useQuery({
    queryKey: ['jewelry-products-for-pos', search],
    queryFn: () => jewelryProductsApi.list({}),
  });
  const jewelryProducts = (productsData as any[]) ?? [];

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return jewelryProducts;
    return jewelryProducts.filter((p: any) =>
      p.product?.name?.toLowerCase().includes(q) ||
      p.itemCode?.toLowerCase().includes(q) ||
      p.designNumber?.toLowerCase().includes(q) ||
      p.hallmarkNumber?.toLowerCase().includes(q) ||
      p.metalType?.toLowerCase().includes(q),
    );
  }, [jewelryProducts, search]);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });
  const customers = customersData?.items ?? [];
  const selectedCustomer = customers.find((c) => c.id === customerId);

  const getRate = (metalType: string, purity: string) => {
    return (rates as any[]).find((r) => r.metalType === metalType && r.purity === purity)?.ratePerGram ?? 0;
  };

  const addJewelryProduct = (p: any) => {
    const rate = getRate(p.metalType, p.purity);
    if (rate === 0) {
      toast.error(`Metal rate for ${p.metalType} ${p.purity} not set. Update rates first.`);
      return;
    }
    setCart((prev) => [...prev, {
      cartLineId: cartLineId(),
      productId: p.productId,
      jewelryProfileId: p.id,
      name: p.product?.name || 'Jewelry Item',
      category: p.category,
      metalType: p.metalType,
      purity: p.purity,
      ratePerGram: rate,
      grossWeight: p.grossWeight,
      netWeight: p.netWeight,
      stoneWeight: p.stoneWeight,
      makingChargePerGram: p.makingChargePerGram,
      makingChargeFixed: p.makingChargeFixed,
      makingChargePct: p.makingChargePct,
      wastagePct: p.wastagePct,
      polishCharges: p.polishCharge,
      hallmarkCharges: p.hallmarkCharge,
      stoneValue: 0,
      quantity: 1,
      hallmarkNumber: p.hallmarkNumber,
      isCertified: p.isCertified,
      buyBackPct: p.buyBackPct ?? 0,
      imageUrl: p.product?.images?.[0]?.url,
    }]);
    toast.success(`${p.product?.name} added`);
  };

  const updateLine = (id: string, patch: Partial<JewelryCartLine>) => {
    setCart((prev) => prev.map((c) => c.cartLineId === id ? { ...c, ...patch } : c));
  };

  const removeLine = (id: string) => {
    setCart((prev) => prev.filter((c) => c.cartLineId !== id));
  };

  const handleBarcodeScan = (code: string) => {
    setScannerOpen(false);
    setSearch(code.trim());
  };

  // Calculate totals with live metal rates
  const itemCalcs = useMemo(() => cart.map((it) => {
    const metalValue = it.netWeight * it.ratePerGram;
    const makingCharge = (it.makingChargePerGram * it.netWeight) + it.makingChargeFixed + (metalValue * it.makingChargePct / 100);
    const wastageValue = (it.wastagePct / 100) * metalValue;
    const itemTotal = (metalValue + makingCharge + wastageValue + it.polishCharges + it.hallmarkCharges + it.stoneValue) * it.quantity;
    return { metalValue, makingCharge, wastageValue, itemTotal };
  }), [cart]);

  const subtotal = itemCalcs.reduce((s, c) => s + c.itemTotal, 0);
  const totalWeight = cart.reduce((s, c) => s + c.netWeight * c.quantity, 0);
  const discount = Number(globalDiscount) || 0;
  const gst = Number(gstAmount) || 0;
  const exchange = Number(exchangeValue) || 0;
  const total = Math.max(subtotal + gst - discount - exchange, 0);
  const paid = Number(paidAmount) || 0;
  const balance = Math.max(total - paid, 0);

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
    mutationFn: () => {
      if (!currentShopId) throw new Error('Shop required');
      return jewelrySalesApi.create({
        customerId: customerId || undefined,
        customerName: customerName || selectedCustomer?.name || 'Walk-in',
        customerPhone: customerPhone || selectedCustomer?.phone || undefined,
        customerCnic: customerCnic || undefined,
        gstAmount: gst,
        discount,
        paidAmount: paid,
        paymentMethod,
        exchangeMetalGrams: Number(exchangeGrams) || 0,
        exchangeMetalPurity: exchangePurity || undefined,
        exchangeValue: exchange,
        hallmarkVerified,
        items: cart.map((c) => ({
          productId: c.productId,
          productName: c.name,
          category: c.category,
          metalType: c.metalType,
          purity: c.purity,
          ratePerGram: c.ratePerGram,
          grossWeight: c.grossWeight,
          netWeight: c.netWeight,
          makingChargePerGram: c.makingChargePerGram,
          makingChargeFixed: c.makingChargeFixed,
          makingChargePct: c.makingChargePct,
          wastagePct: c.wastagePct,
          polishCharges: c.polishCharges,
          hallmarkCharges: c.hallmarkCharges,
          stoneValue: c.stoneValue,
          quantity: c.quantity,
          hallmarkNumber: c.hallmarkNumber,
        })),
      });
    },
    onSuccess: (sale: any) => {
      window.open(`/jewelry/sales/${sale.id}/receipt?auto=1`, '_blank');
      setCart([]);
      setCustomerId('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerCnic('');
      setGlobalDiscount('');
      setGstAmount('');
      setPaidAmount('');
      setExchangeGrams('');
      setExchangePurity('');
      setExchangeValue('');
      setHallmarkVerified(false);
      queryClient.invalidateQueries({ queryKey: ['jewelry-products'] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      toast.success('Sale complete! Receipt printing...');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Sale failed'),
  });

  const handleCheckout = () => {
    if (cart.length === 0) return toast.error('Cart empty');
    if (!currentShopId) return toast.error('Select shop first');
    if (!customerName && !selectedCustomer && !customerId) return toast.error('Customer name required');
    if (total > 50000 && !customerCnic && !selectedCustomer?.cnic) {
      if (!confirm('High-value sale (>Rs 50,000) — CNIC recommended. Proceed anyway?')) return;
    }
    checkoutMutation.mutate();
  };

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleBarcodeScan} onClose={() => setScannerOpen(false)} />}

      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-amber-600 to-yellow-700 text-white flex items-center justify-between">
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
                placeholder="Customer name"
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-amber-500" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="03XX..."
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-amber-500" />
              <Button size="lg" className="w-full bg-gradient-to-r from-amber-600 to-yellow-700"
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
        {/* JEWELRY SELECTION SIDE */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-amber-900 to-yellow-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />
            <div className="relative px-5 py-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold border border-white/20">
                <Gem className="h-3 w-3 text-amber-300" />
                Jewelry POS
              </div>
              <h2 className="mt-2 text-2xl font-extrabold">Live Rate Pricing</h2>
              <p className="text-xs text-white/80 font-semibold mt-1">
                Metal weight × live rate + making + wastage + stones = auto-calculated
              </p>
            </div>
          </div>

          {/* Live Rates Ticker */}
          {rates.length > 0 && (
            <div className="shrink-0 px-4 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200 overflow-x-auto">
              <div className="flex gap-2 items-center min-w-max">
                <div className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 uppercase shrink-0">
                  <Coins className="h-3 w-3" />
                  Live Rates:
                </div>
                {(rates as any[]).slice(0, 8).map((r: any) => (
                  <div key={r.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-amber-200 text-[11px] font-bold shrink-0">
                    <span>{METAL_ICONS[r.metalType]}</span>
                    <span className="text-slate-700">{r.purity.replace('KARAT_', '').replace('SILVER_', 'S').replace('PLATINUM_', 'Pt-')}K:</span>
                    <span className="font-extrabold text-amber-700 tabular-nums">Rs {r.ratePerGram.toLocaleString()}/g</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="shrink-0 px-4 py-3 bg-slate-50/80 border-b border-slate-100">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, item code, hallmark, design number..."
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-amber-500" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button onClick={() => setScannerOpen(true)}
                className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white flex items-center justify-center shadow-lg">
                <Camera className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30">
            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                <Gem className="h-12 w-12 text-amber-400 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700">No jewelry items</p>
                <p className="text-xs text-slate-500 mt-1">Add items via wizard first</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {filteredProducts.map((p: any) => {
                  const rate = getRate(p.metalType, p.purity);
                  const metalColor = METAL_COLORS[p.metalType] || 'from-slate-400 to-slate-600';
                  const rateAvailable = rate > 0;
                  return (
                    <button key={p.id} onClick={() => addJewelryProduct(p)}
                      disabled={!rateAvailable}
                      className={`group text-left rounded-2xl border-2 overflow-hidden transition bg-white ${
                        rateAvailable
                          ? 'border-slate-200 hover:border-amber-400 hover:shadow-lg hover:-translate-y-0.5'
                          : 'opacity-50 cursor-not-allowed border-rose-200'
                      }`}>
                      <div className="aspect-square bg-slate-100 overflow-hidden relative">
                        {p.product?.images?.[0]?.url ? (
                          <img src={p.product.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${metalColor} text-white text-4xl`}>
                            {METAL_ICONS[p.metalType] || '💎'}
                          </div>
                        )}
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-amber-600 text-white text-[9px] font-extrabold font-mono">
                          {p.itemCode || p.designNumber || p.id.slice(-6)}
                        </div>
                        {p.hallmarkNumber && (
                          <div className="absolute top-1 right-1 h-5 w-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow">
                            <ShieldCheck className="h-3 w-3" />
                          </div>
                        )}
                        {p.isBridalCollection && (
                          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold">
                            👰 BRIDAL
                          </div>
                        )}
                        {!rateAvailable && (
                          <div className="absolute inset-x-0 bottom-0 py-1 bg-rose-600 text-white text-center text-[9px] font-extrabold">
                            NO LIVE RATE
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="font-extrabold text-slate-900 text-xs line-clamp-2 min-h-[2rem] leading-tight">
                          {p.product?.name || 'Item'}
                        </div>
                        <div className="mt-1 text-[10px] font-bold text-slate-600 uppercase">
                          {p.metalType.replace('_', ' ')} {p.purity.replace('KARAT_', '').replace('SILVER_', 'S').replace('PLATINUM_', 'Pt-')}K
                        </div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <div className="text-xs font-extrabold text-emerald-700 tabular-nums">
                            {p.netWeight.toFixed(2)}g
                          </div>
                          {rateAvailable && (
                            <div className="text-[10px] font-bold text-amber-700 tabular-nums">
                              ~{formatPKR(p.netWeight * rate)}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* CART SIDE */}
        <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-amber-900 to-yellow-700 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                  <Gem className="h-2.5 w-2.5" />
                  Jewelry Cart
                </div>
                <div className="text-2xl font-extrabold tabular-nums mt-1">{cart.length} items</div>
                <div className="text-xs text-white/80 font-semibold">
                  {totalWeight.toFixed(2)}g • {formatPKRFull(total)}
                </div>
              </div>
              {cart.length > 0 && (
                <button onClick={() => { if (confirm('Clear cart?')) setCart([]); }}
                  className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-rose-500/40 text-white text-xs font-extrabold border border-white/20">
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Customer */}
            <div className="p-3 border-b border-slate-100 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <User className="h-3 w-3 text-amber-600" />
                  Customer
                </label>
                <button onClick={() => setShowCustomerAdd(true)}
                  className="text-xs font-extrabold text-amber-600 inline-flex items-center gap-1">
                  <UserPlus className="h-3 w-3" />
                  Add
                </button>
              </div>
              <select value={customerId} onChange={(e) => {
                setCustomerId(e.target.value);
                const c = customers.find((x) => x.id === e.target.value);
                if (c) {
                  setCustomerName(c.name);
                  setCustomerPhone(c.phone || '');
                }
              }} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500 appearance-none">
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` • ${c.phone}` : ''}</option>
                ))}
              </select>
              {!customerId && (
                <>
                  <input value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name *"
                    className="h-10 w-full rounded-lg border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
                  <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone"
                    className="h-10 w-full rounded-lg border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
                </>
              )}
              {total > 50000 && (
                <input value={customerCnic} onChange={(e) => setCustomerCnic(e.target.value)}
                  placeholder="CNIC (recommended for >Rs 50k)"
                  className="h-10 w-full rounded-lg border-2 border-amber-300 bg-amber-50 px-3 text-sm font-mono font-bold focus:outline-none focus:border-amber-500" />
              )}
            </div>

            {/* Cart items */}
            <div className="p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <Gem className="h-12 w-12 text-amber-400 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">Empty cart</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Click jewelry items to add</p>
                </div>
              ) : (
                cart.map((item, idx) => {
                  const calc = itemCalcs[idx];
                  return (
                    <div key={item.cartLineId} className="rounded-xl border-2 border-amber-200 bg-amber-50/40 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Gem className="h-3.5 w-3.5 text-amber-700" />
                            <span className="font-extrabold text-sm text-slate-900 truncate">{item.name}</span>
                            {item.hallmarkNumber && <ShieldCheck className="h-3 w-3 text-emerald-600" />}
                          </div>
                          <div className="text-[10px] font-bold text-slate-600 uppercase mt-0.5">
                            {item.metalType.replace('_', ' ')} {item.purity.replace('KARAT_', '').replace('SILVER_', 'S').replace('PLATINUM_', 'Pt-')}K
                            {item.buyBackPct > 0 && ` • Buyback: ${item.buyBackPct}%`}
                          </div>
                        </div>
                        <button onClick={() => removeLine(item.cartLineId)}
                          className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="text-[9px] uppercase font-extrabold text-blue-700 block">Rate/g</label>
                          <input type="number" value={item.ratePerGram} onChange={(e) => updateLine(item.cartLineId, { ratePerGram: Number(e.target.value) })}
                            className="h-9 w-full rounded-lg border border-blue-300 bg-blue-50 px-2 text-xs font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-extrabold text-emerald-700 block">Net (g)</label>
                          <input type="number" step="0.001" value={item.netWeight} onChange={(e) => updateLine(item.cartLineId, { netWeight: Number(e.target.value) })}
                            className="h-9 w-full rounded-lg border border-emerald-300 bg-emerald-50 px-2 text-xs font-extrabold tabular-nums text-center focus:outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-extrabold text-slate-600 block">Qty</label>
                          <input type="number" min="1" value={item.quantity} onChange={(e) => updateLine(item.cartLineId, { quantity: Number(e.target.value) })}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-extrabold tabular-nums text-center focus:outline-none focus:border-amber-500" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="text-[9px] uppercase font-extrabold text-purple-700 block">Making %</label>
                          <input type="number" step="0.1" value={item.makingChargePct} onChange={(e) => updateLine(item.cartLineId, { makingChargePct: Number(e.target.value) })}
                            placeholder="0" className="h-8 w-full rounded-lg border border-purple-200 bg-purple-50 px-2 text-[11px] font-extrabold tabular-nums text-center focus:outline-none focus:border-purple-500" />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-extrabold text-orange-700 block">Wastage %</label>
                          <input type="number" step="0.1" value={item.wastagePct} onChange={(e) => updateLine(item.cartLineId, { wastagePct: Number(e.target.value) })}
                            placeholder="0" className="h-8 w-full rounded-lg border border-orange-200 bg-orange-50 px-2 text-[11px] font-extrabold tabular-nums text-center focus:outline-none focus:border-orange-500" />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-extrabold text-cyan-700 block">Stones</label>
                          <input type="number" value={item.stoneValue} onChange={(e) => updateLine(item.cartLineId, { stoneValue: Number(e.target.value) })}
                            placeholder="0" className="h-8 w-full rounded-lg border border-cyan-200 bg-cyan-50 px-2 text-[11px] font-extrabold tabular-nums text-center focus:outline-none focus:border-cyan-500" />
                        </div>
                      </div>

                      {/* Live breakdown */}
                      <div className="rounded-lg bg-white border border-amber-200 p-2 space-y-0.5 text-[10px]">
                        <div className="flex justify-between"><span className="text-slate-600">Metal:</span><span className="font-bold tabular-nums">{formatPKR(calc.metalValue)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-600">Making:</span><span className="font-bold tabular-nums">{formatPKR(calc.makingCharge)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-600">Wastage:</span><span className="font-bold tabular-nums">{formatPKR(calc.wastageValue)}</span></div>
                        <div className="flex justify-between font-extrabold text-emerald-800 border-t border-amber-300 pt-1 mt-1">
                          <span>Total (×{item.quantity}):</span>
                          <span className="tabular-nums">{formatPKR(calc.itemTotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Exchange */}
            {cart.length > 0 && (
              <div className="p-3 border-t border-slate-100 bg-violet-50/50 space-y-2">
                <div className="text-[10px] uppercase font-extrabold text-violet-700 inline-flex items-center gap-1">
                  <Repeat className="h-3 w-3" />
                  Old Gold Exchange (optional)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" step="0.01" value={exchangeGrams} onChange={(e) => setExchangeGrams(e.target.value)}
                    placeholder="Grams" className="h-9 rounded-lg border border-violet-300 bg-white px-2 text-xs font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
                  <input value={exchangePurity} onChange={(e) => setExchangePurity(e.target.value)}
                    placeholder="Purity" className="h-9 rounded-lg border border-violet-300 bg-white px-2 text-xs font-bold focus:outline-none focus:border-violet-500" />
                  <input type="number" value={exchangeValue} onChange={(e) => setExchangeValue(e.target.value)}
                    placeholder="Value (Rs)" className="h-9 rounded-lg border border-emerald-300 bg-emerald-50 px-2 text-xs font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="shrink-0 border-t-2 border-slate-200 bg-slate-50/50 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input type="number" placeholder="Discount" value={globalDiscount} onChange={(e) => setGlobalDiscount(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 font-bold tabular-nums" />
                <input type="number" placeholder="GST" value={gstAmount} onChange={(e) => setGstAmount(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 font-bold tabular-nums" />
              </div>

              <label className="flex items-center gap-2 p-2 rounded-lg border-2 border-emerald-200 bg-emerald-50 cursor-pointer">
                <input type="checkbox" checked={hallmarkVerified} onChange={(e) => setHallmarkVerified(e.target.checked)} className="h-4 w-4 rounded" />
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-extrabold text-emerald-900">Hallmark Verified</span>
              </label>

              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold">
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK">Bank Transfer</option>
                <option value="MIXED">Mixed Payment</option>
              </select>

              <div className="rounded-xl bg-gradient-to-br from-slate-950 to-amber-900 text-white p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Total Weight</span><span className="font-bold tabular-nums">{totalWeight.toFixed(3)}g</span></div>
                {gst > 0 && <div className="flex justify-between"><span className="text-white/70">GST</span><span className="font-bold tabular-nums">+{formatPKR(gst)}</span></div>}
                {discount > 0 && <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(discount)}</span></div>}
                {exchange > 0 && <div className="flex justify-between text-violet-300"><span>Exchange</span><span className="font-bold tabular-nums">-{formatPKR(exchange)}</span></div>}
                <div className="pt-1 mt-1 border-t border-white/20 flex justify-between items-center">
                  <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                  <span className="text-2xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
                </div>
              </div>

              <input type="number" placeholder="Paid Amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                className="h-11 w-full rounded-lg border-2 border-emerald-300 bg-emerald-50 px-3 text-base font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />

              {balance > 0 && (
                <div className="rounded-lg bg-amber-50 border-2 border-amber-300 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-amber-800">Balance (Udhaar)</span>
                  <span className="text-base font-extrabold text-amber-700 tabular-nums">{formatPKR(balance)}</span>
                </div>
              )}

              <Button size="lg" className="w-full bg-gradient-to-r from-amber-600 to-yellow-700"
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
