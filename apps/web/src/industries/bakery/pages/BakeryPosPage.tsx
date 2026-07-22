import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cake, Search, X, Plus, Trash2, User, UserPlus, Package, Sparkles,
  DollarSign, CheckCircle2, Camera, Star, Zap, TrendingUp, Heart,
  Clock, ChefHat, Cookie, Timer, AlertTriangle, Snowflake,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { useSharedPosCart, cartLineId } from '@modules/pos/hooks/useSharedPosCart';
import { bakeryProductsApi } from '../api/products.api';
import { CATEGORIES } from '../api/constants';

export default function BakeryPosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<'all' | 'featured' | 'popular' | 'best' | 'new' | 'seasonal'>('all');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'eggless' | 'vegan' | 'sugar-free'>('all');
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [priceUnitPicker, setPriceUnitPicker] = useState<any>(null);

  const {
    cart, setCart, customerId, setCustomerId,
    paymentMethod, setPaymentMethod, paidAmount, setPaidAmount,
    saleMode, setSaleMode, globalDiscount, setGlobalDiscount,
    subtotal, total, totalItems, effectivePaid, credit, clearCart,
  } = useSharedPosCart();

  const { data: bakeryProfiles = [] } = useQuery({
    queryKey: ['bakery-products-pos', categoryFilter, tagFilter, dietaryFilter],
    queryFn: () => bakeryProductsApi.list({
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      featured: tagFilter === 'featured' ? true : undefined,
      popular: tagFilter === 'popular' ? true : undefined,
      bestSeller: tagFilter === 'best' ? true : undefined,
      newArrival: tagFilter === 'new' ? true : undefined,
      seasonal: tagFilter === 'seasonal' ? true : undefined,
      eggless: dietaryFilter === 'eggless' ? true : undefined,
      vegan: dietaryFilter === 'vegan' ? true : undefined,
      sugarFree: dietaryFilter === 'sugar-free' ? true : undefined,
    }),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });
  const customers = customersData?.items ?? [];

  const filteredProfiles = useMemo(() => {
    if (!search.trim()) return bakeryProfiles;
    const q = search.toLowerCase().trim();
    return bakeryProfiles.filter((p: any) =>
      p.product?.name?.toLowerCase().includes(q) ||
      p.product?.sku?.toLowerCase().includes(q)
    );
  }, [bakeryProfiles, search]);

  const addToCart = (profile: any, unitKey: string, unitPrice: number, unitLabel: string) => {
    const product = profile.product;
    if (!product) return;
    if (product.stock <= 0 && !['CUSTOM_CAKE', 'WEDDING_CAKE', 'BIRTHDAY_CAKE'].includes(profile.category)) {
      toast.error('Out of stock');
      return;
    }
    const cartKey = `${product.id}::${unitKey}`;
    const existing = cart.find((c) => c.cartLineId === cartKey);
    if (existing) {
      setCart((prev) => prev.map((c) =>
        c.cartLineId === cartKey ? { ...c, quantity: c.quantity + 1 } : c,
      ));
    } else {
      setCart((prev) => [...prev, {
        cartLineId: cartKey,
        productId: product.id,
        name: `${product.name} (${unitLabel})`,
        variantImage: product.images?.[0]?.url,
        basePrice: unitPrice,
        priceOverride: unitPrice,
        wholesalePrice: product.wholesalePrice,
        stock: product.stock || 999,
        quantity: 1,
        unit: unitLabel,
        category: product.category,
        useWholesale: false,
        lineDiscount: 0,
      }]);
    }
    toast.success(`${product.name} (${unitLabel}) added`);
    setPriceUnitPicker(null);
  };

  const handleProductClick = (profile: any) => {
    const product = profile.product;
    if (!product) return;
    const priceOptions = [
      { key: 'kg', price: profile.pricePerKg, label: 'Per Kg', emoji: '⚖️' },
      { key: 'pound', price: profile.pricePerPound, label: 'Per Pound', emoji: '⚖️' },
      { key: 'piece', price: profile.pricePerPiece, label: 'Per Piece', emoji: '🎂' },
      { key: 'dozen', price: profile.pricePerDozen, label: 'Per Dozen', emoji: '📦' },
      { key: 'slice', price: profile.pricePerSlice, label: 'Per Slice', emoji: '🍰' },
      { key: 'box', price: profile.pricePerBox, label: 'Per Box', emoji: '📦' },
      { key: 'tray', price: profile.pricePerTray, label: 'Per Tray', emoji: '🍱' },
    ].filter((o) => o.price && Number(o.price) > 0);

    if (priceOptions.length === 0) {
      addToCart(profile, 'default', product.price, product.unit || 'pcs');
      return;
    }
    if (priceOptions.length === 1) {
      addToCart(profile, priceOptions[0].key, Number(priceOptions[0].price), priceOptions[0].label);
      return;
    }
    setPriceUnitPicker({ profile, priceOptions });
  };

  const handleBarcodeScan = async (code: string) => {
    setScannerOpen(false);
    if (!code.trim()) return;
    try {
      const product = await productsApi.byBarcode(code.trim());
      const profile = bakeryProfiles.find((p: any) => p.productId === product.id);
      if (profile) handleProductClick(profile);
      else toast.error('Not a bakery product');
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
          variantId: c.variantId,
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
      queryClient.invalidateQueries({ queryKey: ['bakery-products-pos'] });
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

      {priceUnitPicker && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-pink-600 to-fuchsia-700 text-white flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/80">Select Unit</div>
                <h3 className="text-xl font-extrabold">{priceUnitPicker.profile.product.name}</h3>
              </div>
              <button onClick={() => setPriceUnitPicker(null)} className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-2">
              {priceUnitPicker.priceOptions.map((opt: any) => (
                <button
                  key={opt.key}
                  onClick={() => addToCart(priceUnitPicker.profile, opt.key, Number(opt.price), opt.label)}
                  className="p-4 rounded-2xl border-2 border-pink-200 bg-pink-50 hover:border-pink-500 hover:bg-pink-100 transition group text-left"
                >
                  <div className="text-2xl mb-1">{opt.emoji}</div>
                  <div className="text-sm font-extrabold text-slate-900">{opt.label}</div>
                  <div className="text-lg font-extrabold text-pink-700 tabular-nums mt-1">{formatPKR(Number(opt.price))}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-pink-600 to-fuchsia-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2"><UserPlus className="h-5 w-5" /><h3 className="font-extrabold">Quick Add Customer</h3></div>
              <button onClick={() => setShowCustomerAdd(false)} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <input autoFocus value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} placeholder="Customer name" className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-pink-500" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} placeholder="03XX..." className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-pink-500" />
              <Button size="lg" className="w-full bg-gradient-to-r from-pink-600 to-fuchsia-700" onClick={() => { if (!newCustomer.name.trim()) return toast.error('Name required'); addCustomerMutation.mutate({ name: newCustomer.name.trim(), phone: newCustomer.phone.trim() || undefined }); }} loading={addCustomerMutation.isPending}>Add Customer</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr_460px] gap-4 h-[calc(100dvh-7rem)]">
        {/* BAKERY SIDE */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-pink-400/20 blur-2xl" />
            <div className="relative px-5 py-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold border border-white/20">
                    <Cake className="h-3 w-3 text-amber-300" />
                    Bakery POS
                  </div>
                  <h2 className="mt-2 text-2xl font-extrabold">Sweet Sales 🍰</h2>
                </div>
                <Link to="/bakery/cake-orders/new">
                  <Button className="bg-amber-500 text-white hover:bg-amber-600 shadow-lg">
                    <Cake className="h-4 w-4" /> Custom Cake Order
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="shrink-0 px-4 py-3 bg-slate-50/80 border-b border-slate-100 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cake, bread, cookie..." className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-pink-500" />
                {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center"><X className="h-3.5 w-3.5" /></button>}
              </div>
              <button onClick={() => setScannerOpen(true)} className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white flex items-center justify-center shadow-lg"><Camera className="h-5 w-5" /></button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => setCategoryFilter('all')} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${categoryFilter === 'all' ? 'bg-pink-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'}`}>All</button>
              {CATEGORIES.slice(0, 20).map((c) => (
                <button key={c.value} onClick={() => setCategoryFilter(c.value)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 ${categoryFilter === c.value ? 'bg-pink-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'}`}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {[
                { v: 'all' as const, label: 'All', color: 'bg-slate-600' },
                { v: 'featured' as const, label: '⭐ Featured', color: 'bg-amber-600' },
                { v: 'popular' as const, label: '🔥 Popular', color: 'bg-red-600' },
                { v: 'best' as const, label: '🏆 Best', color: 'bg-rose-600' },
                { v: 'new' as const, label: '✨ New', color: 'bg-emerald-600' },
                { v: 'seasonal' as const, label: '🌸 Seasonal', color: 'bg-fuchsia-600' },
              ].map((t) => (
                <button key={t.v} onClick={() => setTagFilter(t.v)} className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${tagFilter === t.v ? t.color + ' text-white shadow' : 'bg-white border border-slate-200 text-slate-700'}`}>
                  {t.label}
                </button>
              ))}
              <div className="w-px bg-slate-300 mx-1" />
              {[
                { v: 'all' as const, label: 'All Diets' },
                { v: 'eggless' as const, label: '🥚 Eggless' },
                { v: 'vegan' as const, label: '🌱 Vegan' },
                { v: 'sugar-free' as const, label: '🍬 Sugar-free' },
              ].map((t) => (
                <button key={t.v} onClick={() => setDietaryFilter(t.v)} className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${dietaryFilter === t.v ? 'bg-emerald-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30">
            {filteredProfiles.length === 0 ? (
              <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                <Cake className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700">No bakery items</p>
                <p className="text-xs text-slate-500 font-semibold mt-1">Try different filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {filteredProfiles.map((profile: any) => {
                  const p = profile.product;
                  if (!p) return null;
                  const category = CATEGORIES.find((c) => c.value === profile.category);
                  const outOfStock = p.stock <= 0 && !['CUSTOM_CAKE', 'WEDDING_CAKE', 'BIRTHDAY_CAKE'].includes(profile.category);
                  const minPrice = [profile.pricePerKg, profile.pricePerPound, profile.pricePerPiece, profile.pricePerDozen, profile.pricePerSlice, profile.pricePerBox, profile.pricePerTray]
                    .map((x) => Number(x || 0)).filter((x) => x > 0).sort((a, b) => a - b)[0] || Number(p.price || 0);
                  return (
                    <button
                      key={profile.id}
                      onClick={() => handleProductClick(profile)}
                      disabled={outOfStock}
                      className={`group text-left rounded-2xl border-2 overflow-hidden transition bg-white relative ${outOfStock ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-slate-200 hover:border-pink-400 hover:shadow-md hover:-translate-y-0.5'}`}
                    >
                      <div className="aspect-square bg-gradient-to-br from-pink-100 via-fuchsia-100 to-purple-100 overflow-hidden relative">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : profile.imageUrls?.[0] ? (
                          <img src={profile.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-5xl">{category?.emoji || '🎂'}</div>
                        )}
                        <div className="absolute top-1 left-1 flex flex-col gap-1">
                          {profile.isFeatured && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase shadow inline-flex items-center gap-0.5"><Star className="h-2 w-2 fill-current" /> FT</span>}
                          {profile.isBestSeller && <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase shadow inline-flex items-center gap-0.5"><TrendingUp className="h-2 w-2" /> BEST</span>}
                          {profile.isNewArrival && <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold uppercase shadow inline-flex items-center gap-0.5"><Sparkles className="h-2 w-2" /> NEW</span>}
                        </div>
                        <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                          {profile.isEggless && <span className="h-5 w-5 rounded-full bg-emerald-500/90 backdrop-blur text-white flex items-center justify-center text-[9px] shadow" title="Eggless">🥚</span>}
                          {profile.isVegan && <span className="h-5 w-5 rounded-full bg-green-600/90 backdrop-blur text-white flex items-center justify-center text-[9px] shadow" title="Vegan">🌱</span>}
                          {profile.isSugarFree && <span className="h-5 w-5 rounded-full bg-blue-500/90 backdrop-blur text-white flex items-center justify-center text-[9px] shadow" title="Sugar-free">🍬</span>}
                        </div>
                        {outOfStock && <div className="absolute inset-x-0 bottom-0 py-1 bg-rose-600 text-white text-center text-[10px] font-extrabold">OUT OF STOCK</div>}
                      </div>
                      <div className="p-2">
                        <div className="font-extrabold text-slate-900 text-xs line-clamp-2 leading-tight min-h-[2rem]">{p.name}</div>
                        {category && <div className="text-[9px] font-extrabold text-pink-600 mt-0.5">{category.emoji} {category.label}</div>}
                        <div className="mt-1 flex items-baseline justify-between">
                          <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(minPrice)}</div>
                          {profile.prepTimeHours && <div className="text-[9px] font-bold text-amber-700 inline-flex items-center gap-0.5"><Clock className="h-2 w-2" /> {profile.prepTimeHours}h</div>}
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
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold border border-white/20"><Cake className="h-2.5 w-2.5" /> Bakery Cart</div>
                <div className="text-2xl font-extrabold tabular-nums mt-1">{totalItems.toFixed(0)} items</div>
                <div className="text-xs text-white/80 font-semibold">{formatPKRFull(total)}</div>
              </div>
              {cart.length > 0 && <button onClick={() => { if (confirm('Clear cart?')) clearCart(); }} className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-rose-500/40 text-white text-xs font-extrabold border border-white/20">Clear</button>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-3 border-b border-slate-100 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5"><User className="h-3 w-3 text-pink-600" /> Customer</label>
                <button onClick={() => setShowCustomerAdd(true)} className="text-xs font-extrabold text-pink-600 hover:text-pink-700 inline-flex items-center gap-1"><UserPlus className="h-3 w-3" /> Add</button>
              </div>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-pink-500 appearance-none">
                <option value="">Walk-in Customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` • ${c.phone}` : ''}{c.balance > 0 ? ` • Udhaar: ${formatPKR(c.balance)}` : ''}</option>)}
              </select>
            </div>

            <div className="p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <Cake className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">Empty cart</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Click a bakery item to add</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.cartLineId} className="rounded-xl border-2 border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {item.variantImage && <img src={item.variantImage} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-sm text-slate-900 truncate">{item.name}</div>
                          <div className="text-xs font-semibold text-slate-500">{formatPKR(item.basePrice)} × {item.quantity}</div>
                        </div>
                      </div>
                      <button onClick={() => setCart((prev) => prev.filter((c) => c.cartLineId !== item.cartLineId))} className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center bg-slate-100 rounded-lg overflow-hidden">
                        <button onClick={() => setCart((prev) => prev.map((c) => c.cartLineId === item.cartLineId ? { ...c, quantity: Math.max(0.01, c.quantity - 1) } : c))} className="h-8 w-8 hover:bg-slate-200 font-extrabold">−</button>
                        <span className="h-8 w-10 flex items-center justify-center text-sm font-extrabold tabular-nums">{item.quantity}</span>
                        <button onClick={() => setCart((prev) => prev.map((c) => c.cartLineId === item.cartLineId ? { ...c, quantity: c.quantity + 1 } : c))} className="h-8 w-8 bg-pink-600 text-white hover:bg-pink-700 font-extrabold">+</button>
                      </div>
                      <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(item.basePrice * item.quantity)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {cart.length > 0 && (
            <div className="shrink-0 border-t-2 border-slate-200 bg-slate-50/50 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input type="number" placeholder="Discount" value={globalDiscount} onChange={(e) => setGlobalDiscount(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 font-bold tabular-nums" />
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold">
                  <option value="CASH">Cash</option><option value="CARD">Card</option><option value="JAZZCASH">JazzCash</option><option value="EASYPAISA">EasyPaisa</option><option value="BANK_TRANSFER">Bank</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {(['FULL_PAYMENT', 'PARTIAL_CREDIT', 'FULL_CREDIT'] as const).map((m) => (
                  <button key={m} onClick={() => setSaleMode(m)} className={`py-2 rounded-lg text-[10px] font-extrabold transition ${saleMode === m ? 'bg-pink-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'}`}>
                    {m === 'FULL_PAYMENT' ? 'Full Pay' : m === 'PARTIAL_CREDIT' ? 'Partial' : 'Udhaar'}
                  </button>
                ))}
              </div>

              {saleMode === 'PARTIAL_CREDIT' && (
                <input type="number" placeholder="Paid amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="h-10 w-full rounded-lg border-2 border-amber-300 bg-amber-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
              )}

              <div className="rounded-xl bg-gradient-to-br from-slate-950 to-pink-900 text-white p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
                {Number(globalDiscount) > 0 && <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(Number(globalDiscount))}</span></div>}
                <div className="pt-1 mt-1 border-t border-white/20 flex justify-between items-center">
                  <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                  <span className="text-2xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
                </div>
                {credit > 0 && <div className="flex justify-between text-amber-300 pt-1 border-t border-white/20 mt-1"><span className="font-extrabold">Udhaar</span><span className="font-extrabold tabular-nums">{formatPKR(credit)}</span></div>}
              </div>

              <Button size="lg" className="w-full bg-gradient-to-r from-pink-600 to-fuchsia-700" onClick={handleCheckout} loading={checkoutMutation.isPending} disabled={!currentShopId}>
                <CheckCircle2 className="h-5 w-5" /> Complete Sale
              </Button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
