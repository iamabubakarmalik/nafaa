import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Smartphone, Search, ScanLine, X, Plus, Trash2, User, UserPlus,
  Package, ShieldCheck, ShieldAlert, CreditCard, ArrowLeft,
  Sparkles, DollarSign, CheckCircle2, AlertTriangle, Zap,
  Award, Camera, ChevronDown, Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { imeiApi, type ProductImei, PTA_STATUS_COLORS, PTA_STATUS_LABELS } from '../api/imei.api';
import { QuickEmiFromSaleModal } from '../components/emi/QuickEmiFromSaleModal';
import { useSharedPosCart, cartLineId } from '@modules/pos/hooks/useSharedPosCart';

export default function MobilePosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const [imeiSearch, setImeiSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showAccessories, setShowAccessories] = useState(false);
  const [emiPromptData, setEmiPromptData] = useState<any>(null);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  const {
    cart, setCart, customerId, setCustomerId,
    paymentMethod, setPaymentMethod, paidAmount, setPaidAmount,
    saleMode, setSaleMode, globalDiscount, setGlobalDiscount,
    subtotal, total, totalItems, effectivePaid, credit, clearCart,
  } = useSharedPosCart();

  const { data: imeiSearchResults = [] } = useQuery({
    queryKey: ['imei-search', imeiSearch],
    queryFn: () => imeiApi.search(imeiSearch.trim()),
    enabled: imeiSearch.trim().length >= 4,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-for-mobile-pos', productSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 100, search: productSearch || undefined }),
    enabled: showAccessories,
  });
  const products = productsData?.items ?? [];

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });
  const customers = customersData?.items ?? [];
  const selectedCustomer = customers.find((c) => c.id === customerId);

  const excludedImeis = cart.filter((c) => c.imeiId).map((c) => c.imeiId!);
  const availableImeis = imeiSearchResults.filter((i: ProductImei) => !excludedImeis.includes(i.id) && i.status === 'IN_STOCK');

  const addImeiToCart = (imei: ProductImei) => {
    if (excludedImeis.includes(imei.id)) {
      toast.error('Already in cart');
      return;
    }
    if (imei.status !== 'IN_STOCK') {
      toast.error(`IMEI status: ${imei.status}`);
      return;
    }
    setCart((prev) => [...prev, {
      cartLineId: cartLineId(),
      productId: imei.productId,
      variantId: imei.variantId || undefined,
      imeiId: imei.id,
      imeiNumber: imei.imei1,
      name: imei.product?.name || 'Mobile',
      variantName: imei.variant?.name,
      variantImage: (imei.product as any)?.images?.[0]?.url,
      variantColor: imei.color || imei.variant?.color || undefined,
      basePrice: Number((imei as any).salePrice || (imei.product as any)?.price || 0),
      wholesalePrice: null,
      stock: 1,
      quantity: 1,
      unit: 'unit',
      category: (imei.product as any)?.category,
      useWholesale: false,
      lineDiscount: 0,
      note: `IMEI: ${imei.imei1}${imei.imei2 ? ` / ${imei.imei2}` : ''} • ${PTA_STATUS_LABELS[imei.ptaStatus]}${imei.warrantyMonths ? ` • ${imei.warrantyMonths}m warranty` : ''}`,
    }]);
    toast.success(`${imei.product?.name} added (IMEI: ${imei.imei1})`);
    setImeiSearch('');
  };

  const addAccessoryToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error('Out of stock');
      return;
    }
    const existing = cart.find((c) => c.productId === product.id && !c.imeiId);
    if (existing) {
      if (existing.quantity >= product.stock) {
        toast.error('Stock limit');
        return;
      }
      setCart((prev) => prev.map((c) => c.cartLineId === existing.cartLineId ? { ...c, quantity: c.quantity + 1 } : c));
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
        unit: product.unit,
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
    setImeiSearch(code.trim());
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
          imeiId: c.imeiId,
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

      // Offer EMI plan for IMEI + credit sales
      const hasImeiItem = cart.some((c) => c.imeiId);
      if (hasImeiItem && customerId && selectedCustomer && credit > 0) {
        setEmiPromptData({
          saleId: sale.id,
          saleNumber: sale.saleNumber,
          total: sale.total,
          paidAmount: sale.paidAmount,
          customerId,
          customerName: selectedCustomer.name,
          customerPhone: selectedCustomer.phone ?? undefined,
        });
      }
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['imei-available'] });
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

      {emiPromptData && (
        <QuickEmiFromSaleModal
          saleId={emiPromptData.saleId}
          saleNumber={emiPromptData.saleNumber}
          saleTotal={emiPromptData.total}
          paidAmount={emiPromptData.paidAmount}
          customerId={emiPromptData.customerId}
          customerName={emiPromptData.customerName}
          customerPhone={emiPromptData.customerPhone}
          onSuccess={() => setEmiPromptData(null)}
          onClose={() => setEmiPromptData(null)}
        />
      )}

      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-between">
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
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-blue-500" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="03XX..."
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-blue-500" />
              <Button size="lg" className="w-full bg-gradient-to-r from-blue-600 to-indigo-700"
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
        {/* IMEI + ACCESSORY SIDE */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
            <div className="relative px-5 py-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold border border-white/20">
                <Smartphone className="h-3 w-3 text-amber-300" />
                Mobile POS
              </div>
              <h2 className="mt-2 text-2xl font-extrabold">IMEI Search & Sell</h2>
              <p className="text-xs text-white/80 font-semibold mt-1">
                Scan IMEI, PTA status verify, EMI plan add karo — sab ek jagah
              </p>
            </div>
          </div>

          {/* IMEI Search */}
          <div className="shrink-0 px-4 py-3 bg-slate-50/80 border-b border-slate-100 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Smartphone className="h-5 w-5 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  value={imeiSearch}
                  onChange={(e) => setImeiSearch(e.target.value)}
                  placeholder="Scan or type IMEI (15 digits) or search by name..."
                  className="h-14 w-full rounded-xl border-2 border-blue-300 bg-blue-50 pl-12 pr-10 text-base font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                {imeiSearch && (
                  <button onClick={() => setImeiSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                )}
              </div>
              <button onClick={() => setScannerOpen(true)}
                className="h-14 w-14 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white flex items-center justify-center shadow-lg">
                <Camera className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAccessories(false)}
                className={[
                  'flex-1 h-10 rounded-xl text-sm font-extrabold transition inline-flex items-center justify-center gap-1',
                  !showAccessories ? 'bg-blue-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                ].join(' ')}
              >
                <Smartphone className="h-3.5 w-3.5" />
                IMEIs
              </button>
              <button
                onClick={() => setShowAccessories(true)}
                className={[
                  'flex-1 h-10 rounded-xl text-sm font-extrabold transition inline-flex items-center justify-center gap-1',
                  showAccessories ? 'bg-blue-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                ].join(' ')}
              >
                <Package className="h-3.5 w-3.5" />
                Accessories
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30">
            {!showAccessories ? (
              // IMEI results
              imeiSearch.trim().length < 4 ? (
                <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <Smartphone className="h-16 w-16 text-slate-400 mx-auto mb-3" />
                  <p className="font-extrabold text-slate-700 text-lg">Enter IMEI to search</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Type at least 4 digits, or scan barcode on phone box
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 text-[10px] text-blue-700 font-bold bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                    <Zap className="h-3 w-3" />
                    Search works with IMEI, product name, or serial number
                  </div>
                </div>
              ) : availableImeis.length === 0 ? (
                <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">No IMEIs found</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Try different search or scan again</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableImeis.map((imei: ProductImei) => {
                    const ptaCfg = PTA_STATUS_COLORS[imei.ptaStatus];
                    return (
                      <button
                        key={imei.id}
                        onClick={() => addImeiToCart(imei)}
                        className="w-full rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-md p-3 flex items-start gap-3 text-left transition"
                      >
                        <div className="h-14 w-14 rounded-xl bg-blue-100 overflow-hidden flex items-center justify-center shrink-0">
                          {(imei.product as any)?.images?.[0]?.url ? (
                            <img src={(imei.product as any).images[0].url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Smartphone className="h-7 w-7 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-slate-900 text-sm truncate">{imei.product?.name}</div>
                          {imei.variant?.name && (
                            <div className="text-xs font-semibold text-violet-700">{imei.variant.name}</div>
                          )}
                          <div className="text-xs font-mono text-slate-600 mt-0.5">IMEI: <strong>{imei.imei1}</strong></div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-extrabold uppercase ${ptaCfg.bg} ${ptaCfg.text} ${ptaCfg.border}`}>
                              <ShieldCheck className="h-2.5 w-2.5" />
                              {PTA_STATUS_LABELS[imei.ptaStatus]}
                            </span>
                            {(imei.warrantyMonths ?? 0) > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                                <Award className="h-2.5 w-2.5" />
                                {imei.warrantyMonths}m warranty
                              </span>
                            )}
                            {imei.color && (
                              <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-extrabold">
                                {imei.color}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xl font-extrabold text-emerald-700 tabular-nums">
                            {formatPKR((imei as any).salePrice || (imei.product as any)?.price || 0)}
                          </div>
                          <Plus className="h-4 w-4 text-blue-600 ml-auto mt-1" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              // Accessories
              <div className="space-y-3">
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search accessories..."
                    className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-blue-500" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {products.map((p) => (
                    <button key={p.id} onClick={() => addAccessoryToCart(p)}
                      disabled={p.stock <= 0}
                      className={[
                        'group text-left rounded-2xl border-2 overflow-hidden transition bg-white',
                        p.stock <= 0 ? 'opacity-40 cursor-not-allowed border-slate-200'
                          : 'border-slate-200 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5',
                      ].join(' ')}
                    >
                      <div className="aspect-square bg-slate-100 overflow-hidden">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="font-extrabold text-slate-900 text-xs line-clamp-2 leading-tight min-h-[2rem]">{p.name}</div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.price)}</div>
                          <div className="text-[9px] font-bold text-slate-500">{p.stock} {p.unit}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* CART SIDE */}
        <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                  <Smartphone className="h-2.5 w-2.5" />
                  Mobile Cart
                </div>
                <div className="text-2xl font-extrabold tabular-nums mt-1">{totalItems.toFixed(0)} items</div>
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
            {/* Customer */}
            <div className="p-3 border-b border-slate-100 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <User className="h-3 w-3 text-blue-600" />
                  Customer
                </label>
                <button onClick={() => setShowCustomerAdd(true)}
                  className="text-xs font-extrabold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
                  <UserPlus className="h-3 w-3" />
                  Add
                </button>
              </div>
              <div className="relative">
                <User className="h-3.5 w-3.5 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-9 pr-9 text-sm font-bold focus:outline-none focus:border-blue-500 appearance-none">
                  <option value="">Walk-in Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.phone ? ` • ${c.phone}` : ''}{c.balance > 0 ? ` • Udhaar: ${formatPKR(c.balance)}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Cart items */}
            <div className="p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <Smartphone className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">Empty cart</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Search IMEI or scan barcode</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.cartLineId} className={[
                    'rounded-xl border-2 p-3 space-y-2',
                    item.imeiId ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white',
                  ].join(' ')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.imeiId && <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />}
                          <div className="font-extrabold text-sm text-slate-900 truncate">{item.name}</div>
                        </div>
                        {item.variantName && (
                          <div className="text-xs font-semibold text-violet-700">{item.variantName}</div>
                        )}
                        {item.note && (
                          <div className="mt-1 text-[10px] font-mono text-blue-700 bg-blue-100 rounded px-1.5 py-0.5 inline-block">
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
                      {item.imeiId ? (
                        <span className="text-xs font-extrabold text-slate-600">
                          1 unit (IMEI-locked)
                        </span>
                      ) : (
                        <div className="inline-flex items-center bg-slate-100 rounded-lg overflow-hidden">
                          <button onClick={() => setCart((prev) => prev.map((c) => c.cartLineId === item.cartLineId ? { ...c, quantity: Math.max(0.01, c.quantity - 1) } : c))}
                            className="h-7 w-7 hover:bg-slate-200 font-extrabold">−</button>
                          <span className="h-7 w-10 flex items-center justify-center text-xs font-extrabold tabular-nums">{item.quantity}</span>
                          <button onClick={() => setCart((prev) => prev.map((c) => c.cartLineId === item.cartLineId ? { ...c, quantity: c.quantity + 1 } : c))}
                            className="h-7 w-7 bg-blue-600 text-white hover:bg-blue-700 font-extrabold">+</button>
                        </div>
                      )}
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
                      saleMode === m ? 'bg-blue-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                    ].join(' ')}>
                    {m === 'FULL_PAYMENT' ? 'Full Pay' : m === 'PARTIAL_CREDIT' ? 'Partial' : 'Udhaar'}
                  </button>
                ))}
              </div>

              {saleMode === 'PARTIAL_CREDIT' && (
                <input type="number" placeholder="Paid amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                  className="h-10 w-full rounded-lg border-2 border-amber-300 bg-amber-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
              )}

              <div className="rounded-xl bg-gradient-to-br from-slate-950 to-blue-900 text-white p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
                {Number(globalDiscount) > 0 && <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(Number(globalDiscount))}</span></div>}
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

              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700"
                onClick={handleCheckout}
                loading={checkoutMutation.isPending}
                disabled={!currentShopId}
              >
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
