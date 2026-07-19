import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Beef, Search, X, Plus, Trash2, User, UserPlus, Package,
  ShieldCheck, Scissors, Weight, ArrowLeft, Sparkles,
  DollarSign, CheckCircle2, Camera, ChevronDown, Snowflake,
  Leaf, Award, Flame,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import { productsApi, type Product } from '@/api/products.api';
import { customersApi } from '@/api/customers.api';
import { salesApi, type PaymentMethod } from '@/api/sales.api';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';
import { meatProductsApi } from '../api/products.api';
import { useSharedPosCart, cartLineId } from '@/features/pos/hooks/useSharedPosCart';

const ANIMAL_EMOJI: Record<string, string> = {
  BEEF: '🐄', MUTTON: '🐑', GOAT: '🐐', LAMB: '🐏',
  CHICKEN: '🐔', DUCK: '🦆', TURKEY: '🦃', QUAIL: '🐦',
  CAMEL: '🐫', BUFFALO: '🐃', FISH: '🐟', PRAWN: '🦐',
};

const ANIMAL_TYPES = [
  { value: 'all', label: 'All', emoji: '🥩' },
  { value: 'BEEF', label: 'Beef', emoji: '🐄' },
  { value: 'MUTTON', label: 'Mutton', emoji: '🐑' },
  { value: 'GOAT', label: 'Goat', emoji: '🐐' },
  { value: 'CHICKEN', label: 'Chicken', emoji: '🐔' },
  { value: 'FISH', label: 'Fish', emoji: '🐟' },
];

export default function MeatPosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const [search, setSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [animalFilter, setAnimalFilter] = useState<string>('all');
  const [halalOnly, setHalalOnly] = useState(true);
  const [weightPickerData, setWeightPickerData] = useState<{ product: Product; profile: any } | null>(null);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  const {
    cart, setCart, customerId, setCustomerId,
    paymentMethod, setPaymentMethod, paidAmount, setPaidAmount,
    saleMode, setSaleMode, globalDiscount, setGlobalDiscount,
    subtotal, total, totalItems, effectivePaid, credit, clearCart,
  } = useSharedPosCart();

  const { data: productsData } = useQuery({
    queryKey: ['meat-products-pos', search],
    queryFn: () => productsApi.list({ page: 1, limit: 200, search: search || undefined }),
  });
  const products = productsData?.items ?? [];

  const { data: meatProfiles = [] } = useQuery({
    queryKey: ['meat-profiles-all'],
    queryFn: () => meatProductsApi.list({}),
  });

  const meatByProductId = useMemo(() => {
    const map = new Map<string, any>();
    (meatProfiles as any[]).forEach((mp) => map.set(mp.productId, mp));
    return map;
  }, [meatProfiles]);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });
  const customers = customersData?.items ?? [];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const profile = meatByProductId.get(p.id);
      if (!profile) return false;
      if (animalFilter !== 'all' && profile.animalType !== animalFilter) return false;
      if (halalOnly && !profile.isHalalCertified) return false;
      return true;
    });
  }, [products, meatByProductId, animalFilter, halalOnly]);

  const openWeightPicker = (product: Product) => {
    const profile = meatByProductId.get(product.id);
    if (!profile) return toast.error('Meat profile missing');
    setWeightPickerData({ product, profile });
  };

  const addToCartWithWeight = (weight: number) => {
    if (!weightPickerData) return;
    const { product, profile } = weightPickerData;
    const pricePerKg = Number(profile.pricePerKg || product.price || 0);
    const totalPrice = pricePerKg * weight;

    setCart((prev) => [...prev, {
      cartLineId: cartLineId(),
      productId: product.id,
      name: product.name,
      variantImage: product.images?.[0]?.url,
      basePrice: pricePerKg,
      wholesalePrice: product.wholesalePrice,
      stock: 9999,
      quantity: weight,
      unit: 'kg',
      category: product.category,
      useWholesale: false,
      lineDiscount: 0,
      priceOverride: pricePerKg,
      note: `${weight.toFixed(3)}kg @ ${formatPKR(pricePerKg)}/kg${profile.isHalalCertified ? ' • HALAL' : ''}${profile.qualityGrade ? ' • ' + profile.qualityGrade.replace('_', ' ') : ''}`,
    }]);
    toast.success(`${product.name} - ${weight.toFixed(3)}kg added`);
    setWeightPickerData(null);
  };

  const handleBarcodeScan = async (code: string) => {
    setScannerOpen(false);
    if (!code.trim()) return;
    try {
      const product = await productsApi.byBarcode(code.trim());
      openWeightPicker(product);
    } catch {
      toast.error(`Barcode "${code}" not found`);
    }
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
  });

  const checkoutMutation = useMutation({
    mutationFn: () => {
      if (!currentShopId) throw new Error('Shop required');
      return salesApi.create({
        shopId: currentShopId,
        customerId: customerId || undefined,
        paymentMethod,
        paidAmount: effectivePaid,
        discount: Number(globalDiscount) || 0,
        items: cart.map((c) => ({
          productId: c.productId,
          quantity: c.quantity,
          priceOverride: c.priceOverride,
          lineDiscount: c.lineDiscount,
          useWholesale: c.useWholesale,
          note: c.note,
        })),
      });
    },
    onSuccess: (sale) => {
      window.open(`/sales/${sale.id}/receipt?auto=1`, '_blank');
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Sale failed'),
  });

  const handleCheckout = () => {
    if (cart.length === 0) return toast.error('Cart empty');
    if (!currentShopId) return toast.error('Select shop first');
    if (credit > 0 && !customerId) return toast.error('Customer required for credit');
    checkoutMutation.mutate();
  };

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleBarcodeScan} onClose={() => setScannerOpen(false)} />}

      {weightPickerData && (
        <WeightPickerModal
          product={weightPickerData.product}
          profile={weightPickerData.profile}
          onConfirm={addToCartWithWeight}
          onClose={() => setWeightPickerData(null)}
        />
      )}

      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-between">
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
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-red-500" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="03XX..."
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-red-500" />
              <Button size="lg" className="w-full bg-gradient-to-r from-red-600 to-rose-700"
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
        {/* MEAT PRODUCTS SIDE */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-red-900 to-rose-800 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-red-400/20 blur-2xl" />
            <div className="relative px-5 py-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold border border-white/20">
                <Beef className="h-3 w-3 text-amber-300" />
                Meat POS
              </div>
              <h2 className="mt-2 text-2xl font-extrabold">Weight-Based Sales</h2>
              <p className="text-xs text-white/80 font-semibold mt-1">
                Halal certified, quality grade, freshness — sab track
              </p>
            </div>
          </div>

          <div className="shrink-0 px-4 py-3 bg-slate-50/80 border-b border-slate-100 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search meat products..."
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-red-500" />
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

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {ANIMAL_TYPES.map((a) => (
                <button key={a.value} onClick={() => setAnimalFilter(a.value)}
                  className={[
                    'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition',
                    animalFilter === a.value ? 'bg-red-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                  ].join(' ')}>
                  <span>{a.emoji}</span>{a.label}
                </button>
              ))}
              <button onClick={() => setHalalOnly(!halalOnly)}
                className={[
                  'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition border',
                  halalOnly ? 'bg-emerald-600 text-white border-emerald-600 shadow' : 'bg-white border-slate-200 text-slate-700',
                ].join(' ')}>
                <ShieldCheck className="h-3 w-3" />
                Halal Only
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30">
            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                <Beef className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700">No meat products</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {filteredProducts.map((p) => {
                  const profile = meatByProductId.get(p.id);
                  const emoji = ANIMAL_EMOJI[profile?.animalType] || '🥩';
                  return (
                    <button key={p.id} onClick={() => openWeightPicker(p)}
                      className="group text-left rounded-2xl border-2 border-slate-200 hover:border-red-400 hover:shadow-lg bg-white overflow-hidden transition">
                      <div className="aspect-square bg-slate-100 overflow-hidden relative">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-5xl">{emoji}</div>
                        )}
                        <div className="absolute top-1 left-1 flex flex-col gap-1">
                          {profile?.isHalalCertified && (
                            <div className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-extrabold inline-flex items-center gap-0.5 shadow">
                              <ShieldCheck className="h-2 w-2" /> HALAL
                            </div>
                          )}
                          {profile?.isFrozen && (
                            <div className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-extrabold shadow">
                              <Snowflake className="h-2 w-2 inline mr-0.5" />FROZEN
                            </div>
                          )}
                        </div>
                        {profile?.qualityGrade && (
                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold shadow">
                            {profile.qualityGrade.replace('_', ' ')}
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="font-extrabold text-slate-900 text-xs line-clamp-2 min-h-[2rem]">{p.name}</div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <div className="text-sm font-extrabold text-emerald-700 tabular-nums">
                            {formatPKR(profile?.pricePerKg || p.price)}
                          </div>
                          <div className="text-[9px] font-bold text-slate-500">/kg</div>
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
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-red-900 to-rose-700 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                  <Beef className="h-2.5 w-2.5" />
                  Meat Cart
                </div>
                <div className="text-2xl font-extrabold tabular-nums mt-1">{totalItems.toFixed(2)}kg</div>
                <div className="text-xs text-white/80 font-semibold">{formatPKRFull(total)}</div>
              </div>
              {cart.length > 0 && (
                <button onClick={() => { if (confirm('Clear cart?')) clearCart(); }}
                  className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-rose-500/40 text-white text-xs font-extrabold border border-white/20">
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-3 border-b border-slate-100 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <User className="h-3 w-3 text-red-600" />
                  Customer
                </label>
                <button onClick={() => setShowCustomerAdd(true)}
                  className="text-xs font-extrabold text-red-600 inline-flex items-center gap-1">
                  <UserPlus className="h-3 w-3" /> Add
                </button>
              </div>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-red-500 appearance-none">
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` • ${c.phone}` : ''}</option>
                ))}
              </select>
            </div>

            <div className="p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <Beef className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">Empty cart</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Click a meat product to add</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.cartLineId} className="rounded-xl border-2 border-red-200 bg-red-50/50 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm text-slate-900 truncate">{item.name}</div>
                        {item.note && (
                          <div className="mt-1 text-[10px] font-mono text-red-700 bg-red-100 rounded px-1.5 py-0.5">
                            {item.note}
                          </div>
                        )}
                      </div>
                      <button onClick={() => setCart((prev) => prev.filter((c) => c.cartLineId !== item.cartLineId))}
                        className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-extrabold text-slate-600">
                        {item.quantity.toFixed(3)}kg × {formatPKR(item.basePrice)}
                      </div>
                      <div className="font-extrabold text-emerald-700 tabular-nums">
                        {formatPKR(item.basePrice * item.quantity)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {cart.length > 0 && (
            <div className="shrink-0 border-t-2 border-slate-200 bg-slate-50/50 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input type="number" placeholder="Discount" value={globalDiscount} onChange={(e) => setGlobalDiscount(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 font-bold tabular-nums" />
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="JAZZCASH">JazzCash</option>
                  <option value="EASYPAISA">EasyPaisa</option>
                  <option value="BANK_TRANSFER">Bank</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {(['FULL_PAYMENT', 'PARTIAL_CREDIT', 'FULL_CREDIT'] as const).map((m) => (
                  <button key={m} onClick={() => setSaleMode(m)}
                    className={[
                      'py-2 rounded-lg text-[10px] font-extrabold transition',
                      saleMode === m ? 'bg-red-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                    ].join(' ')}>
                    {m === 'FULL_PAYMENT' ? 'Full Pay' : m === 'PARTIAL_CREDIT' ? 'Partial' : 'Udhaar'}
                  </button>
                ))}
              </div>

              {saleMode === 'PARTIAL_CREDIT' && (
                <input type="number" placeholder="Paid amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                  className="h-10 w-full rounded-lg border-2 border-amber-300 bg-amber-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
              )}

              <div className="rounded-xl bg-gradient-to-br from-slate-950 to-red-900 text-white p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
                {Number(globalDiscount) > 0 && (
                  <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(Number(globalDiscount))}</span></div>
                )}
                <div className="pt-1 mt-1 border-t border-white/20 flex justify-between items-center">
                  <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                  <span className="text-2xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
                </div>
                {credit > 0 && (
                  <div className="flex justify-between text-amber-300 pt-1 border-t border-white/20 mt-1">
                    <span className="font-extrabold">Udhaar</span>
                    <span className="font-extrabold tabular-nums">{formatPKR(credit)}</span>
                  </div>
                )}
              </div>

              <Button size="lg" className="w-full bg-gradient-to-r from-red-600 to-rose-700"
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

function WeightPickerModal({ product, profile, onConfirm, onClose }: any) {
  const [weight, setWeight] = useState<string>('1');
  const pricePerKg = Number(profile.pricePerKg || product.price || 0);
  const w = Number(weight) || 0;
  const total = pricePerKg * w;
  const minOrder = Number(profile.minOrderKg || 0.25);
  const emoji = ANIMAL_EMOJI[profile.animalType] || '🥩';

  const quickWeights = [0.25, 0.5, 1, 1.5, 2, 3, 5];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-red-600 to-rose-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Weight className="h-5 w-5" />
            <div>
              <h3 className="font-extrabold">Select Weight</h3>
              <p className="text-xs text-white/80">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 p-4 text-center">
            <div className="text-5xl mb-2">{emoji}</div>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {profile.isHalalCertified && (
                <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-extrabold inline-flex items-center gap-0.5">
                  <ShieldCheck className="h-2.5 w-2.5" /> HALAL
                </span>
              )}
              {profile.qualityGrade && (
                <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-extrabold">
                  {profile.qualityGrade.replace('_', ' ')}
                </span>
              )}
              {profile.freshnessType && (
                <span className="px-2 py-0.5 rounded bg-blue-500 text-white text-[10px] font-extrabold">
                  {profile.freshnessType.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <div className="mt-3 text-3xl font-extrabold text-red-700 tabular-nums">{formatPKR(pricePerKg)}<span className="text-sm text-slate-500">/kg</span></div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-red-700 mb-2 block">Quick Select</label>
            <div className="grid grid-cols-4 gap-1.5">
              {quickWeights.map((w) => (
                <button key={w} onClick={() => setWeight(String(w))}
                  className={[
                    'py-2 rounded-lg text-xs font-extrabold transition',
                    Number(weight) === w ? 'bg-red-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  ].join(' ')}>
                  {w}kg
                </button>
              ))}
              <button onClick={() => setWeight('10')}
                className="py-2 rounded-lg text-xs font-extrabold bg-slate-100 text-slate-700 hover:bg-slate-200">
                Custom
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-red-700 mb-1 block">Weight (kg)</label>
            <input type="number" step="0.001" min="0" value={weight} onChange={(e) => setWeight(e.target.value)}
              className="h-14 w-full rounded-xl border-2 border-red-300 bg-red-50 px-4 text-2xl font-extrabold tabular-nums text-center focus:outline-none focus:border-red-500" />
            {minOrder > 0 && (
              <p className="text-[10px] text-slate-500 font-bold mt-1">Min order: {minOrder}kg</p>
            )}
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-4 text-center">
            <div className="text-[10px] uppercase font-extrabold text-emerald-700">Total Price</div>
            <div className="text-3xl font-extrabold text-emerald-700 tabular-nums mt-1">{formatPKR(total)}</div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 bg-gradient-to-r from-red-600 to-rose-800"
              onClick={() => onConfirm(w)}
              disabled={w < minOrder || w <= 0}
            >
              <CheckCircle2 className="h-4 w-4" />
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
