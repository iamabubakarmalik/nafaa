import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shirt, Search, X, Plus, Trash2, User, UserPlus,
  Package, ArrowLeft, Sparkles, DollarSign, CheckCircle2,
  Ruler, ChevronDown, Camera, Palette, Star, Zap, Filter,
  Users as UsersIcon, Scissors, Bookmark, CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { useSharedPosCart, cartLineId } from '@modules/pos/hooks/useSharedPosCart';
import { garmentProductsApi } from '../api/products.api';
import { FbrModeIndicator } from '@integrations/fbr/components/FbrModeIndicator';

const GENDERS = [
  { value: 'all', label: 'All', emoji: '👥' },
  { value: 'MEN', label: 'Men', emoji: '👨' },
  { value: 'WOMEN', label: 'Women', emoji: '👩' },
  { value: 'BOYS', label: 'Boys', emoji: '👦' },
  { value: 'GIRLS', label: 'Girls', emoji: '👧' },
  { value: 'KIDS', label: 'Kids', emoji: '🧒' },
];

const CATEGORY_TYPES = [
  { value: 'all', label: 'All', emoji: '🛍️' },
  { value: 'KURTA', label: 'Kurta', emoji: '👘' },
  { value: 'SHALWAR_KAMEEZ', label: 'Shalwar', emoji: '👗' },
  { value: 'THREE_PIECE', label: '3-Piece', emoji: '🧥' },
  { value: 'SHIRT', label: 'Shirt', emoji: '👔' },
  { value: 'T_SHIRT', label: 'T-Shirt', emoji: '👕' },
  { value: 'TROUSER', label: 'Trouser', emoji: '👖' },
  { value: 'ABAYA', label: 'Abaya', emoji: '🧕' },
  { value: 'LEHENGA', label: 'Lehenga', emoji: '💃' },
];

export default function GarmentPosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<'all' | 'new' | 'best' | 'sale'>('all');
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  const {
    cart, setCart, customerId, setCustomerId,
    paymentMethod, setPaymentMethod, paidAmount, setPaidAmount,
    saleMode, setSaleMode, globalDiscount, setGlobalDiscount,
    subtotal, total, totalItems, effectivePaid, credit, clearCart,
  } = useSharedPosCart();

  const { data: garmentProfiles = [] } = useQuery({
    queryKey: ['garment-products-pos', genderFilter, categoryFilter, tagFilter],
    queryFn: () => garmentProductsApi.list({
      gender: genderFilter === 'all' ? undefined : genderFilter,
      categoryType: categoryFilter === 'all' ? undefined : categoryFilter,
      newArrival: tagFilter === 'new' ? true : undefined,
      bestSeller: tagFilter === 'best' ? true : undefined,
      onSale: tagFilter === 'sale' ? true : undefined,
    }),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });
  const customers = customersData?.items ?? [];

  const filteredProfiles = useMemo(() => {
    if (!search.trim()) return garmentProfiles;
    const q = search.toLowerCase().trim();
    return garmentProfiles.filter((p: any) =>
      p.product?.name?.toLowerCase().includes(q) ||
      p.product?.sku?.toLowerCase().includes(q) ||
      p.styleCode?.toLowerCase().includes(q),
    );
  }, [garmentProfiles, search]);

  const addSimpleProductToCart = (product: Product) => {
    if (product.hasVariants) {
      setVariantPickerProduct(product);
      return;
    }
    if (product.stock <= 0) {
      toast.error('Out of stock');
      return;
    }
    const existing = cart.find((c) => c.productId === product.id && !c.variantId);
    if (existing) {
      if (existing.quantity >= product.stock) {
        toast.error(`Only ${product.stock} available`);
        return;
      }
      setCart((prev) => prev.map((c) =>
        c.cartLineId === existing.cartLineId ? { ...c, quantity: c.quantity + 1 } : c,
      ));
    } else {
      setCart((prev) => [...prev, {
        cartLineId: cartLineId(),
        productId: product.id,
        name: product.name,
        variantImage: product.images?.[0]?.url,
        basePrice: product.price,
        wholesalePrice: product.wholesalePrice,
        stock: product.stock,
        quantity: 1,
        unit: product.unit || 'pcs',
        category: product.category,
        useWholesale: false,
        lineDiscount: 0,
      }]);
    }
    toast.success(`${product.name} added`);
  };

  const handleBarcodeScan = async (code: string) => {
    setScannerOpen(false);
    if (!code.trim()) return;
    try {
      const product = await productsApi.byBarcode(code.trim());
      addSimpleProductToCart(product);
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
      queryClient.invalidateQueries({ queryKey: ['garment-products-pos'] });
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

      {variantPickerProduct && (
        <VariantMatrixPicker
          product={variantPickerProduct}
          onSelect={(variant, qty) => {
            const key = `${variantPickerProduct.id}::${variant.id}`;
            const existing = cart.find((c) => c.variantId === variant.id);
            if (existing) {
              const newQty = Math.min(existing.quantity + qty, variant.stock);
              setCart((prev) => prev.map((c) => c.cartLineId === existing.cartLineId ? { ...c, quantity: newQty } : c));
            } else {
              setCart((prev) => [...prev, {
                cartLineId: cartLineId(),
                productId: variantPickerProduct.id,
                variantId: variant.id,
                name: variantPickerProduct.name,
                variantName: variant.name,
                variantImage: variant.imageUrl || variantPickerProduct.images?.[0]?.url,
                variantColor: variant.color || undefined,
                variantColorHex: variant.colorHex || undefined,
                variantSize: variant.size || undefined,
                basePrice: variant.price || variantPickerProduct.price,
                wholesalePrice: variantPickerProduct.wholesalePrice,
                stock: variant.stock,
                quantity: qty,
                unit: variantPickerProduct.unit || 'pcs',
                category: variantPickerProduct.category,
                useWholesale: false,
                lineDiscount: 0,
              }]);
            }
            toast.success(`${variantPickerProduct.name} (${variant.name}) added`);
            setVariantPickerProduct(null);
          }}
          onClose={() => setVariantPickerProduct(null)}
        />
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
        {/* GARMENTS SIDE */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-pink-400/20 blur-2xl" />
            <div className="relative px-5 py-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold border border-white/20">
                <Shirt className="h-3 w-3 text-amber-300" />
                Garments POS
              </div>
              <h2 className="mt-2 text-2xl font-extrabold">Boutique Sale</h2>
              <p className="text-xs text-white/80 font-semibold mt-1">
                Size × color variants, tailoring, alterations — sab handle
              </p>
            </div>
          </div>

          <div className="shrink-0 px-4 py-3 bg-slate-50/80 border-b border-slate-100 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product name, SKU, style code..." className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-pink-500" />
                {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center"><X className="h-3.5 w-3.5" /></button>}
              </div>
              <button onClick={() => setScannerOpen(true)} className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white flex items-center justify-center shadow-lg"><Camera className="h-5 w-5" /></button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {GENDERS.map((g) => (
                <button key={g.value} onClick={() => setGenderFilter(g.value)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition inline-flex items-center gap-1 ${genderFilter === g.value ? 'bg-pink-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'}`}>
                  {g.emoji} {g.label}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {CATEGORY_TYPES.map((c) => (
                <button key={c.value} onClick={() => setCategoryFilter(c.value)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition inline-flex items-center gap-1 ${categoryFilter === c.value ? 'bg-fuchsia-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'}`}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5">
              {[
                { v: 'all' as const, label: 'All Items', color: 'bg-slate-600' },
                { v: 'new' as const, label: '✨ New', color: 'bg-emerald-600' },
                { v: 'best' as const, label: '🏆 Best', color: 'bg-amber-600' },
                { v: 'sale' as const, label: '🔥 Sale', color: 'bg-rose-600' },
              ].map((t) => (
                <button key={t.v} onClick={() => setTagFilter(t.v)} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${tagFilter === t.v ? t.color + ' text-white shadow' : 'bg-white border border-slate-200 text-slate-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30">
            {filteredProfiles.length === 0 ? (
              <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                <Shirt className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700">No garments</p>
                <p className="text-xs text-slate-500 font-semibold mt-1">Try different filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {filteredProfiles.map((profile: any) => {
                  const p = profile.product;
                  if (!p) return null;
                  const hasVariants = p.hasVariants;
                  const outOfStock = !hasVariants && p.stock <= 0;
                  return (
                    <button
                      key={profile.id}
                      onClick={() => addSimpleProductToCart(p)}
                      disabled={outOfStock}
                      className={`group text-left rounded-2xl border-2 overflow-hidden transition bg-white relative ${outOfStock ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-slate-200 hover:border-pink-400 hover:shadow-md hover:-translate-y-0.5'}`}
                    >
                      <div className="aspect-[3/4] bg-slate-100 overflow-hidden relative">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Shirt className="h-10 w-10 text-slate-400" /></div>
                        )}
                        <div className="absolute top-1 left-1 flex flex-col gap-1">
                          {profile.isNewArrival && <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold uppercase shadow inline-flex items-center gap-0.5"><Sparkles className="h-2 w-2" /> NEW</span>}
                          {profile.isBestSeller && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase shadow inline-flex items-center gap-0.5"><Star className="h-2 w-2 fill-current" /> BEST</span>}
                          {profile.isOnSale && <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase shadow inline-flex items-center gap-0.5"><Zap className="h-2 w-2" /> SALE</span>}
                          {hasVariants && <span className="px-1.5 py-0.5 rounded bg-violet-600 text-white text-[9px] font-extrabold uppercase shadow inline-flex items-center gap-0.5"><Palette className="h-2 w-2" /> VAR</span>}
                        </div>
                        {outOfStock && <div className="absolute inset-x-0 bottom-0 py-1 bg-rose-600 text-white text-center text-[10px] font-extrabold">OUT OF STOCK</div>}
                      </div>
                      <div className="p-2">
                        <div className="font-extrabold text-slate-900 text-xs line-clamp-2 leading-tight min-h-[2rem]">{p.name}</div>
                        {profile.styleCode && <div className="text-[9px] font-mono text-slate-500 mt-0.5">{profile.styleCode}</div>}
                        <div className="mt-1 flex items-baseline justify-between">
                          <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.price)}</div>
                          {!hasVariants && <div className="text-[9px] font-bold text-slate-500">{p.stock} {p.unit}</div>}
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
                <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold border border-white/20"><Shirt className="h-2.5 w-2.5" /> Garment Cart</div>
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
                  <Shirt className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">Empty cart</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Click a garment to add</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.cartLineId} className="rounded-xl border-2 border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {item.variantImage && <img src={item.variantImage} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-sm text-slate-900 truncate">{item.name}</div>
                          {item.variantName && (
                            <div className="text-xs font-semibold text-violet-700 inline-flex items-center gap-1">
                              {item.variantColorHex && <span className="h-2.5 w-2.5 rounded-full border border-slate-300" style={{ backgroundColor: item.variantColorHex }} />}
                              {item.variantName}
                            </div>
                          )}
                        </div>
                      </div>
                      <button onClick={() => setCart((prev) => prev.filter((c) => c.cartLineId !== item.cartLineId))} className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center bg-slate-100 rounded-lg overflow-hidden">
                        <button onClick={() => setCart((prev) => prev.map((c) => c.cartLineId === item.cartLineId ? { ...c, quantity: Math.max(0.01, c.quantity - 1) } : c))} className="h-8 w-8 hover:bg-slate-200 font-extrabold">−</button>
                        <span className="h-8 w-10 flex items-center justify-center text-sm font-extrabold tabular-nums">{item.quantity}</span>
                        <button onClick={() => setCart((prev) => prev.map((c) => c.cartLineId === item.cartLineId ? { ...c, quantity: Math.min(c.stock, c.quantity + 1) } : c))} className="h-8 w-8 bg-pink-600 text-white hover:bg-pink-700 font-extrabold">+</button>
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
                  <FbrModeIndicator saleTotal={total} className="mb-2" />
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

// ═══════════════════════════════════════════════
// VARIANT MATRIX PICKER
// ═══════════════════════════════════════════════
function VariantMatrixPicker({ product, onSelect, onClose }: {
  product: Product;
  onSelect: (variant: any, qty: number) => void;
  onClose: () => void;
}) {
  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants', product.id],
    queryFn: () => productVariantsApi.list(product.id),
  });

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [qty, setQty] = useState(1);

  const sizes = useMemo(() => Array.from(new Set(variants.map((v: any) => v.size).filter(Boolean))), [variants]);
  const colors = useMemo(() => {
    const seen = new Map<string, { name: string; hex?: string }>();
    variants.forEach((v: any) => {
      if (v.color && !seen.has(v.color)) seen.set(v.color, { name: v.color, hex: v.colorHex });
    });
    return Array.from(seen.values());
  }, [variants]);

  const matchingVariant = useMemo(() => {
    if (sizes.length > 0 && !selectedSize) return null;
    if (colors.length > 0 && !selectedColor) return null;
    return variants.find((v: any) => (!sizes.length || v.size === selectedSize) && (!colors.length || v.color === selectedColor));
  }, [variants, selectedSize, selectedColor, sizes, colors]);

  const isVariantAvailable = (size?: string, color?: string) => {
    return variants.some((v: any) =>
      (!size || v.size === size) &&
      (!color || v.color === color) &&
      v.stock > 0,
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl">
        <div className="px-6 py-4 bg-gradient-to-br from-pink-600 to-fuchsia-700 text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-extrabold text-white/80">Select Variant</div>
            <h3 className="text-xl font-extrabold">{product.name}</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {sizes.length > 0 && (
            <div>
              <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Ruler className="h-4 w-4 text-pink-600" /> Size</label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s: any) => {
                  const active = selectedSize === s;
                  const available = isVariantAvailable(s, selectedColor);
                  return (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      disabled={!available}
                      className={`min-w-[3.5rem] h-12 px-3 rounded-xl text-sm font-extrabold border-2 transition ${
                        !available ? 'opacity-30 cursor-not-allowed border-slate-200 line-through' :
                        active ? 'border-pink-600 bg-pink-600 text-white shadow' :
                        'border-slate-200 bg-white text-slate-700 hover:border-pink-400'
                      }`}
                    >{s}</button>
                  );
                })}
              </div>
            </div>
          )}

          {colors.length > 0 && (
            <div>
              <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Palette className="h-4 w-4 text-fuchsia-600" /> Color</label>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => {
                  const active = selectedColor === c.name;
                  const available = isVariantAvailable(selectedSize, c.name);
                  return (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(c.name)}
                      disabled={!available}
                      className={`h-12 px-3 rounded-xl text-sm font-extrabold border-2 transition inline-flex items-center gap-2 ${
                        !available ? 'opacity-30 cursor-not-allowed border-slate-200 line-through' :
                        active ? 'border-fuchsia-600 bg-fuchsia-50 text-fuchsia-800 shadow ring-2 ring-fuchsia-200' :
                        'border-slate-200 bg-white text-slate-700 hover:border-fuchsia-400'
                      }`}
                    >
                      {c.hex && <span className="h-5 w-5 rounded-full border-2 border-white shadow" style={{ backgroundColor: c.hex }} />}
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {matchingVariant && (
            <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-emerald-700">Selected Variant</div>
                  <div className="text-lg font-extrabold text-slate-900">{matchingVariant.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">{formatPKR(matchingVariant.price || product.price)}</div>
                  <div className="text-xs font-bold text-slate-600">{matchingVariant.stock} in stock</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-slate-700">Quantity:</label>
                <div className="inline-flex items-center bg-white border-2 border-emerald-300 rounded-xl overflow-hidden">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-10 w-10 hover:bg-emerald-50 font-extrabold">−</button>
                  <input type="number" min="1" max={matchingVariant.stock} value={qty} onChange={(e) => setQty(Math.min(Math.max(1, Number(e.target.value)), matchingVariant.stock))} className="h-10 w-16 text-center font-extrabold tabular-nums focus:outline-none" />
                  <button onClick={() => setQty(Math.min(matchingVariant.stock, qty + 1))} className="h-10 w-10 bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold">+</button>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-[10px] uppercase font-extrabold text-emerald-700">Total</div>
                  <div className="text-xl font-extrabold text-emerald-900 tabular-nums">{formatPKR((matchingVariant.price || product.price) * qty)}</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              size="lg"
              className="flex-1 bg-gradient-to-r from-pink-600 to-fuchsia-700"
              onClick={() => matchingVariant && onSelect(matchingVariant, qty)}
              disabled={!matchingVariant}
            >
              <Plus className="h-4 w-4" /> Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
