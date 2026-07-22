import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Pill, Search, Camera, X, Plus, Trash2, User, UserPlus,
  Package, ShieldAlert, Snowflake, FileText, ArrowLeft,
  CheckCircle2, ChevronDown, AlertTriangle, Beaker,
  Clock, Award, Stethoscope, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { medicinesApi } from '../api/medicines.api';
import { batchesApi } from '../api/batches.api';
import { useSharedPosCart, cartLineId } from '@modules/pos/hooks/useSharedPosCart';

const PTA_LABELS: Record<string, string> = {
  APPROVED: 'PTA Approved', NON_PTA: 'Non-PTA', PATCH: 'Patched',
};

export default function PharmacyPosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'rx' | 'otc' | 'cold'>('all');
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', cnic: '' });
  const [prescriptionAttached, setPrescriptionAttached] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [doctorRegNumber, setDoctorRegNumber] = useState('');

  const {
    cart, setCart, customerId, setCustomerId,
    paymentMethod, setPaymentMethod, paidAmount, setPaidAmount,
    saleMode, setSaleMode, globalDiscount, setGlobalDiscount,
    subtotal, total, totalItems, effectivePaid, credit, clearCart,
  } = useSharedPosCart();

  const { data: productsData } = useQuery({
    queryKey: ['products-for-pharmacy-pos', search],
    queryFn: () => productsApi.list({ page: 1, limit: 100, search: search || undefined }),
  });
  const products = productsData?.items ?? [];

  const { data: medicines = [] } = useQuery({
    queryKey: ['pharmacy-medicines'],
    queryFn: () => medicinesApi.list({}),
  });

  const medicineMap = useMemo(() => {
    const map = new Map();
    for (const m of medicines) {
      map.set(m.productId, m);
    }
    return map;
  }, [medicines]);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });
  const customers = customersData?.items ?? [];
  const selectedCustomer = customers.find((c) => c.id === customerId);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeTab === 'rx') {
      list = list.filter((p) => {
        const med = medicineMap.get(p.id);
        return med?.requiresPrescription;
      });
    } else if (activeTab === 'otc') {
      list = list.filter((p) => {
        const med = medicineMap.get(p.id);
        return !med?.requiresPrescription;
      });
    } else if (activeTab === 'cold') {
      list = list.filter((p) => {
        const med = medicineMap.get(p.id);
        return med?.requiresColdChain;
      });
    }
    return list;
  }, [products, medicineMap, activeTab]);

  const needsPrescription = cart.some((item) => {
    const med = medicineMap.get(item.productId);
    return med?.requiresPrescription;
  });

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error('Out of stock');
      return;
    }
    const med = medicineMap.get(product.id);
    if (med?.requiresPrescription && !prescriptionAttached) {
      toast.warning(`${product.name} needs prescription — attach Rx below`);
    }

    const existing = cart.find((c) => c.productId === product.id);
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
        note: med?.dosageForm ? `${med.dosageForm}${med.packSize ? ' • ' + med.packSize : ''}` : undefined,
      }]);
    }
    toast.success(`${product.name} added`);
  };

  const handleBarcodeScan = async (code: string) => {
    setScannerOpen(false);
    if (!code.trim()) return;
    try {
      const product = await productsApi.byBarcode(code.trim());
      addToCart(product);
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
      setNewCustomer({ name: '', phone: '', cnic: '' });
      queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: () => {
      if (!currentShopId) throw new Error('Shop required');
      const rxNote = prescriptionAttached && doctorName
        ? `Rx by Dr. ${doctorName}${doctorRegNumber ? ' (PMDC: ' + doctorRegNumber + ')' : ''}`
        : undefined;

      return salesApi.create({
        shopId: currentShopId,
        customerId: customerId || undefined,
        paymentMethod,
        paidAmount: effectivePaid,
        discount: Number(globalDiscount) || 0,
        note: rxNote,
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
      setPrescriptionAttached(false);
      setDoctorName('');
      setDoctorRegNumber('');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Sale failed'),
  });

  const handleCheckout = () => {
    if (cart.length === 0) return toast.error('Cart empty');
    if (!currentShopId) return toast.error('Select shop first');
    if (needsPrescription && !prescriptionAttached) {
      return toast.error('Prescription required for Rx medicines');
    }
    if (credit > 0 && !customerId) return toast.error('Customer required for credit');
    checkoutMutation.mutate();
  };

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleBarcodeScan} onClose={() => setScannerOpen(false)} />}

      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-teal-600 to-cyan-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                <h3 className="font-extrabold">Quick Add Patient</h3>
              </div>
              <button onClick={() => setShowCustomerAdd(false)} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input autoFocus value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Patient name *"
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-teal-500" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="03XX..."
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-teal-500" />
              <input value={newCustomer.cnic} onChange={(e) => setNewCustomer({ ...newCustomer, cnic: e.target.value })}
                placeholder="CNIC (required for narcotics)"
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-mono font-bold focus:outline-none focus:border-teal-500" />
              <Button size="lg" className="w-full bg-gradient-to-r from-teal-600 to-cyan-700"
                onClick={() => {
                  if (!newCustomer.name.trim()) return toast.error('Name required');
                  addCustomerMutation.mutate({
                    name: newCustomer.name.trim(),
                    phone: newCustomer.phone.trim() || undefined,
                    cnic: newCustomer.cnic.trim() || undefined,
                  });
                }}
                loading={addCustomerMutation.isPending}>
                Add Patient
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr_460px] gap-4 h-[calc(100dvh-7rem)]">
        {/* MEDICINES SIDE */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-teal-900 to-cyan-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-teal-400/20 blur-2xl" />
            <div className="relative px-5 py-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold border border-white/20">
                <Pill className="h-3 w-3 text-amber-300" />
                Pharmacy POS
              </div>
              <h2 className="mt-2 text-2xl font-extrabold">Dispense Medicines</h2>
              <p className="text-xs text-white/80 font-semibold mt-1">
                Rx-only, cold chain, DRAP registered — sab track
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="shrink-0 px-4 py-3 bg-slate-50/80 border-b border-slate-100 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search medicine, salt, brand..."
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-teal-500" />
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

            <div className="flex gap-2 overflow-x-auto">
              {[
                { v: 'all' as const, label: 'All', icon: Pill },
                { v: 'otc' as const, label: 'OTC', icon: CheckCircle2 },
                { v: 'rx' as const, label: 'Rx Only', icon: FileText },
                { v: 'cold' as const, label: '❄️ Cold Chain', icon: Snowflake },
              ].map((t) => (
                <button key={t.v} onClick={() => setActiveTab(t.v)}
                  className={[
                    'shrink-0 h-10 px-3 rounded-xl text-sm font-extrabold transition inline-flex items-center gap-1',
                    activeTab === t.v ? 'bg-teal-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                  ].join(' ')}>
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30">
            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                <Pill className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700">No medicines</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {filteredProducts.map((p) => {
                  const med = medicineMap.get(p.id);
                  return (
                    <button key={p.id} onClick={() => addToCart(p)}
                      disabled={p.stock <= 0}
                      className={[
                        'group text-left rounded-2xl border-2 overflow-hidden transition bg-white',
                        p.stock <= 0 ? 'opacity-40 cursor-not-allowed border-slate-200'
                          : 'border-slate-200 hover:border-teal-400 hover:shadow-md hover:-translate-y-0.5',
                      ].join(' ')}>
                      <div className="aspect-square bg-slate-100 overflow-hidden relative">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Pill className="h-8 w-8 text-teal-400" />
                          </div>
                        )}
                        <div className="absolute top-1 left-1 flex flex-wrap gap-0.5">
                          {med?.requiresPrescription && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold">Rx</span>
                          )}
                          {med?.isNarcotic && (
                            <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-extrabold">NAR</span>
                          )}
                          {med?.requiresColdChain && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-extrabold inline-flex items-center gap-0.5">
                              <Snowflake className="h-2 w-2" />
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-2">
                        <div className="font-extrabold text-slate-900 text-xs line-clamp-2 leading-tight min-h-[2rem]">{p.name}</div>
                        {med?.dosageForm && (
                          <div className="text-[10px] text-slate-500 font-bold mt-0.5">{med.dosageForm}</div>
                        )}
                        <div className="mt-1 flex items-baseline justify-between">
                          <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.price)}</div>
                          <div className="text-[9px] font-bold text-slate-500">{p.stock} {p.unit}</div>
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
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-teal-900 to-cyan-700 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                  <Pill className="h-2.5 w-2.5" />
                  Prescription Cart
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
                  <User className="h-3 w-3 text-teal-600" />
                  Patient
                </label>
                <button onClick={() => setShowCustomerAdd(true)}
                  className="text-xs font-extrabold text-teal-600 inline-flex items-center gap-1">
                  <UserPlus className="h-3 w-3" />
                  Add
                </button>
              </div>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-teal-500 appearance-none">
                <option value="">Walk-in Patient</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` • ${c.phone}` : ''}</option>
                ))}
              </select>
            </div>

            {/* Prescription warning + attach */}
            {needsPrescription && (
              <div className={`p-3 border-b space-y-2 ${prescriptionAttached ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-2">
                  {prescriptionAttached ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  <div className="text-xs font-extrabold flex-1">
                    {prescriptionAttached ? 'Rx attached ✓' : 'Prescription required'}
                  </div>
                  <label className="inline-flex items-center gap-1 text-xs font-bold cursor-pointer">
                    <input type="checkbox" checked={prescriptionAttached}
                      onChange={(e) => setPrescriptionAttached(e.target.checked)}
                      className="h-4 w-4 rounded" />
                    <span>Attach Rx</span>
                  </label>
                </div>
                {prescriptionAttached && (
                  <div className="grid grid-cols-2 gap-2">
                    <input value={doctorName} onChange={(e) => setDoctorName(e.target.value)}
                      placeholder="Doctor name"
                      className="h-9 rounded-lg border-2 border-emerald-300 bg-white px-2 text-xs font-bold focus:outline-none focus:border-emerald-500" />
                    <input value={doctorRegNumber} onChange={(e) => setDoctorRegNumber(e.target.value)}
                      placeholder="PMDC #"
                      className="h-9 rounded-lg border-2 border-emerald-300 bg-white px-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500" />
                  </div>
                )}
              </div>
            )}

            {/* Cart items */}
            <div className="p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <Pill className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">Empty cart</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Search or scan medicine</p>
                </div>
              ) : (
                cart.map((item) => {
                  const med = medicineMap.get(item.productId);
                  return (
                    <div key={item.cartLineId} className={[
                      'rounded-xl border-2 p-3 space-y-2',
                      med?.requiresPrescription ? 'border-amber-200 bg-amber-50/40'
                        : med?.requiresColdChain ? 'border-blue-200 bg-blue-50/40'
                        : 'border-slate-200 bg-white',
                    ].join(' ')}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {med?.requiresPrescription && <FileText className="h-3.5 w-3.5 text-amber-600" />}
                            {med?.requiresColdChain && <Snowflake className="h-3.5 w-3.5 text-blue-600" />}
                            {med?.isNarcotic && <ShieldAlert className="h-3.5 w-3.5 text-red-600" />}
                            <div className="font-extrabold text-sm text-slate-900 truncate">{item.name}</div>
                          </div>
                          {item.note && (
                            <div className="mt-1 text-[10px] text-teal-700 font-semibold">{item.note}</div>
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
                            className="h-7 w-7 bg-teal-600 text-white hover:bg-teal-700 font-extrabold">+</button>
                        </div>
                        <div className="font-extrabold text-emerald-700 tabular-nums">
                          {formatPKR(item.basePrice * item.quantity)}
                        </div>
                      </div>
                    </div>
                  );
                })
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
                      saleMode === m ? 'bg-teal-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                    ].join(' ')}>
                    {m === 'FULL_PAYMENT' ? 'Full Pay' : m === 'PARTIAL_CREDIT' ? 'Partial' : 'Udhaar'}
                  </button>
                ))}
              </div>

              {saleMode === 'PARTIAL_CREDIT' && (
                <input type="number" placeholder="Paid amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                  className="h-10 w-full rounded-lg border-2 border-amber-300 bg-amber-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
              )}

              <div className="rounded-xl bg-gradient-to-br from-slate-950 to-teal-900 text-white p-3 space-y-1 text-xs">
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

              <Button size="lg" className="w-full bg-gradient-to-r from-teal-600 to-cyan-700"
                onClick={handleCheckout} loading={checkoutMutation.isPending} disabled={!currentShopId}>
                <CheckCircle2 className="h-5 w-5" />
                Dispense & Print
              </Button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
