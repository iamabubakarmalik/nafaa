import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench, Search, X, Plus, Trash2, User, UserPlus, Package, ArrowLeft,
  Sparkles, CheckCircle2, ChevronDown, Camera, Car, Hash, ShieldCheck,
  Zap, AlertCircle, Truck, Cog,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { partProfilesApi, type PartCategory } from '../api/part-profiles.api';
import { customerVehiclesApi } from '../api/customer-vehicles.api';
import { useSharedPosCart, cartLineId } from '@modules/pos/hooks/useSharedPosCart';
import { FbrModeIndicator } from '@integrations/fbr/components/FbrModeIndicator';

const PART_CATEGORIES: { value: PartCategory | 'all'; label: string; emoji: string }[] = [
  { value: 'all', label: 'All', emoji: '📦' },
  { value: 'ENGINE', label: 'Engine', emoji: '⚙️' },
  { value: 'BRAKES', label: 'Brakes', emoji: '🛑' },
  { value: 'SUSPENSION', label: 'Suspension', emoji: '🔩' },
  { value: 'ELECTRICAL', label: 'Electrical', emoji: '⚡' },
  { value: 'BATTERY', label: 'Battery', emoji: '🔋' },
  { value: 'FILTERS', label: 'Filters', emoji: '🌀' },
  { value: 'OILS_FLUIDS', label: 'Oils', emoji: '🛢️' },
  { value: 'TIRES_WHEELS', label: 'Tires', emoji: '🛞' },
  { value: 'LIGHTING', label: 'Lighting', emoji: '💡' },
  { value: 'AC_HEATING', label: 'A/C', emoji: '❄️' },
];

export default function AutoPartsPosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<PartCategory | 'all'>('all');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  const {
    cart, setCart, customerId, setCustomerId,
    paymentMethod, setPaymentMethod, paidAmount, setPaidAmount,
    saleMode, setSaleMode, globalDiscount, setGlobalDiscount,
    subtotal, total, totalItems, effectivePaid, credit, clearCart,
  } = useSharedPosCart();

  // Load parts with fitment info
  const { data: parts = [] } = useQuery({
    queryKey: ['auto-parts-pos', search, categoryFilter],
    queryFn: () => partProfilesApi.list({
      search: search.trim() || undefined,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
    }),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });
  const customers = customersData?.items ?? [];

  const { data: customerVehicles = [] } = useQuery({
    queryKey: ['customer-vehicles-for-pos', customerId],
    queryFn: () => customerVehiclesApi.list({ customerId }),
    enabled: !!customerId,
  });

  const filteredParts = useMemo(() => {
    if (!selectedVehicleId) return parts;
    // Filter parts compatible with selected vehicle
    const vehicle = (customerVehicles as any[]).find((v) => v.id === selectedVehicleId);
    if (!vehicle) return parts;
    return parts.filter((p: any) => {
      const comp = p.compatibility as any;
      if (!comp) return true;
      if (comp.isUniversal) return true;
      if (!Array.isArray(comp.fitments) || comp.fitments.length === 0) return true;
      return comp.fitments.some((f: any) => {
        const makeMatch = !f.makeId || f.makeId === vehicle.makeId;
        const modelMatch = !f.modelId || f.modelId === vehicle.modelId;
        return makeMatch && modelMatch;
      });
    });
  }, [parts, selectedVehicleId, customerVehicles]);

  const addPartToCart = (part: any) => {
    const product = part.product;
    if (!product) return;
    if (product.stock <= 0) return toast.error('Out of stock');
    const existing = cart.find((c) => c.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return toast.error('Stock limit');
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
        note: part.partNumber ? `Part#: ${part.partNumber}${part.oemNumber ? ` / OEM: ${part.oemNumber}` : ''}` : undefined,
      }]);
    }
    toast.success(`${product.name} added`);
  };

  const handleBarcodeScan = async (code: string) => {
    setScannerOpen(false);
    if (!code.trim()) return;
    try {
      const product = await productsApi.byBarcode(code.trim());
      const matchingPart = parts.find((p: any) => p.productId === product.id);
      if (matchingPart) addPartToCart(matchingPart);
      else toast.error('Not an auto part');
    } catch { toast.error(`Barcode "${code}" not found`); }
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
        note: selectedVehicleId ? `Vehicle: ${selectedVehicleId}` : undefined,
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
      setSelectedVehicleId('');
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

      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2"><UserPlus className="h-5 w-5" /><h3 className="font-extrabold">Quick Add Customer</h3></div>
              <button onClick={() => setShowCustomerAdd(false)} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <input autoFocus value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Customer name"
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-slate-700" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="03XX..."
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-slate-700" />
              <Button size="lg" className="w-full bg-gradient-to-r from-slate-700 to-slate-900"
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
        {/* PARTS SIDE */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-800 to-slate-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-slate-400/20 blur-2xl" />
            <div className="relative px-5 py-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold border border-white/20">
                <Wrench className="h-3 w-3 text-amber-300" />
                Auto Parts POS
              </div>
              <h2 className="mt-2 text-2xl font-extrabold">Parts Catalog & Fitment</h2>
              <p className="text-xs text-white/80 font-semibold mt-1">Vehicle select karo, compatible parts auto-filter honge</p>
            </div>
          </div>

          {/* Search + Scanner */}
          <div className="shrink-0 px-4 py-3 bg-slate-50/80 border-b border-slate-100 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search part name, part #, OEM #, brand..."
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-slate-700" />
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

            {/* Vehicle filter */}
            {customerId && customerVehicles.length > 0 && (
              <div className="rounded-xl bg-fuchsia-50 border-2 border-fuchsia-200 p-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <Car className="h-3.5 w-3.5 text-fuchsia-700" />
                  <label className="text-[10px] uppercase font-extrabold text-fuchsia-700">Customer's Vehicle (Fitment Filter)</label>
                </div>
                <select value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="h-10 w-full rounded-lg border-2 border-fuchsia-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500">
                  <option value="">All parts (no filter)</option>
                  {customerVehicles.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.make?.name} {v.model?.name} ({v.year || 'N/A'}) — {v.registrationNumber}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Category chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {PART_CATEGORIES.map((c) => (
                <button key={c.value} onClick={() => setCategoryFilter(c.value)}
                  className={[
                    'shrink-0 px-3 h-8 rounded-lg text-xs font-extrabold transition inline-flex items-center gap-1',
                    categoryFilter === c.value ? 'bg-slate-800 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                  ].join(' ')}>
                  <span>{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Parts grid */}
          <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30">
            {filteredParts.length === 0 ? (
              <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                <Wrench className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700">No parts found</p>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  {selectedVehicleId ? 'Try clearing vehicle filter or search different' : 'Add auto parts to see them here'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {filteredParts.map((part: any) => {
                  const p = part.product;
                  if (!p) return null;
                  const outOfStock = p.stock <= 0;
                  return (
                    <button key={part.id} onClick={() => addPartToCart(part)} disabled={outOfStock}
                      className={[
                        'group text-left rounded-2xl border-2 overflow-hidden transition bg-white',
                        outOfStock ? 'opacity-40 cursor-not-allowed border-slate-200' : 'border-slate-200 hover:border-slate-700 hover:shadow-lg hover:-translate-y-0.5',
                      ].join(' ')}>
                      <div className="aspect-square bg-slate-100 overflow-hidden relative">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Wrench className="h-8 w-8 text-slate-400" />
                          </div>
                        )}
                        <div className="absolute top-1 left-1 flex flex-wrap gap-1">
                          {part.isFastMoving && (
                            <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
                              <Zap className="h-2 w-2" /> FAST
                            </span>
                          )}
                          {part.isCritical && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
                              <AlertCircle className="h-2 w-2" /> CRIT
                            </span>
                          )}
                          {part.condition === 'GENUINE' && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold uppercase shadow">
                              GEN
                            </span>
                          )}
                        </div>
                        {outOfStock && (
                          <div className="absolute inset-x-0 bottom-0 py-1 bg-rose-600 text-white text-center text-[10px] font-extrabold">OUT</div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="font-extrabold text-slate-900 text-xs line-clamp-2 min-h-[2rem] leading-tight">{p.name}</div>
                        {(part.partNumber || part.oemNumber) && (
                          <div className="text-[9px] font-mono text-slate-500 mt-0.5 truncate">
                            {part.partNumber && <span>P: {part.partNumber}</span>}
                          </div>
                        )}
                        <div className="mt-1 flex items-baseline justify-between">
                          <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.price)}</div>
                          <div className="text-[9px] font-bold text-slate-500">{p.stock} {p.unit}</div>
                        </div>
                        {part.warrantyMonths > 0 && (
                          <div className="mt-0.5 text-[9px] font-bold text-teal-700 inline-flex items-center gap-0.5">
                            <ShieldCheck className="h-2.5 w-2.5" /> {part.warrantyMonths}m
                          </div>
                        )}
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
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-800 to-slate-700 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                  <Wrench className="h-2.5 w-2.5" />
                  Parts Cart
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
                  <User className="h-3 w-3 text-slate-700" />
                  Customer
                </label>
                <button onClick={() => setShowCustomerAdd(true)}
                  className="text-xs font-extrabold text-slate-700 inline-flex items-center gap-1">
                  <UserPlus className="h-3 w-3" /> Add
                </button>
              </div>
              <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setSelectedVehicleId(''); }}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-slate-700 appearance-none">
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` • ${c.phone}` : ''}</option>
                ))}
              </select>

              {selectedVehicleId && customerId && (
                <div className="text-[10px] font-bold text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-200 rounded-lg px-2 py-1.5 inline-flex items-center gap-1">
                  <Car className="h-3 w-3" />
                  Filtering by selected vehicle
                  <button onClick={() => setSelectedVehicleId('')} className="ml-1"><X className="h-3 w-3" /></button>
                </div>
              )}
            </div>

            {/* Cart items */}
            <div className="p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <Wrench className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">Empty cart</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Click parts to add</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.cartLineId} className="rounded-xl border-2 border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm text-slate-900 truncate">{item.name}</div>
                        {item.note && (
                          <div className="text-[10px] font-mono text-slate-600 bg-slate-100 rounded px-1.5 py-0.5 mt-1 inline-block">
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
                      <div className="inline-flex items-center bg-slate-100 rounded-lg overflow-hidden">
                        <button onClick={() => setCart((prev) => prev.map((c) => c.cartLineId === item.cartLineId ? { ...c, quantity: Math.max(0.01, c.quantity - 1) } : c))}
                          className="h-7 w-7 hover:bg-slate-200 font-extrabold">−</button>
                        <span className="h-7 w-10 flex items-center justify-center text-xs font-extrabold tabular-nums">{item.quantity}</span>
                        <button onClick={() => setCart((prev) => prev.map((c) => c.cartLineId === item.cartLineId ? { ...c, quantity: c.quantity + 1 } : c))}
                          className="h-7 w-7 bg-slate-800 text-white hover:bg-slate-900 font-extrabold">+</button>
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
                      saleMode === m ? 'bg-slate-800 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                    ].join(' ')}>
                    {m === 'FULL_PAYMENT' ? 'Full Pay' : m === 'PARTIAL_CREDIT' ? 'Partial' : 'Udhaar'}
                  </button>
                ))}
              </div>

              {saleMode === 'PARTIAL_CREDIT' && (
                <input type="number" placeholder="Paid amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                  className="h-10 w-full rounded-lg border-2 border-amber-300 bg-amber-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
              )}

              <div className="rounded-xl bg-gradient-to-br from-slate-950 to-slate-800 text-white p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
                {Number(globalDiscount) > 0 && <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(Number(globalDiscount))}</span></div>}
                <div className="pt-1 mt-1 border-t border-white/20 flex justify-between items-center">
                  <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                  <FbrModeIndicator saleTotal={total} className="mb-2" />
                  <span className="text-2xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
                </div>
                {credit > 0 && (
                  <div className="flex justify-between text-amber-300 pt-1 border-t border-white/20 mt-1">
                    <span className="font-extrabold">Udhaar</span>
                    <span className="font-extrabold tabular-nums">{formatPKR(credit)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="lg" onClick={() => navigate('/autoparts/jobs/new')}
                  className="border-2 border-orange-300">
                  <Wrench className="h-4 w-4" /> Job Card
                </Button>
                <Button size="lg" className="bg-gradient-to-r from-slate-700 to-slate-900"
                  onClick={handleCheckout} loading={checkoutMutation.isPending} disabled={!currentShopId}>
                  <CheckCircle2 className="h-5 w-5" /> Sale
                </Button>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold text-center">
                "Sale" — quick parts sale • "Job Card" — full workshop job with labor + parts
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
