import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench, Search, X, Plus, Trash2, User, UserPlus, Package, Sparkles,
  CheckCircle2, Star, Zap, TrendingUp, Shield, Clock, Award,
  MapPin, Briefcase, Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import { customersApi } from '@/api/customers.api';
import { salesApi, type PaymentMethod } from '@/api/sales.api';
import { useSharedPosCart } from '@/features/pos/hooks/useSharedPosCart';
import { catalogApi } from '../api/catalog.api';

const CATEGORIES = [
  { value: 'all', label: 'All', emoji: '🛠️' },
  { value: 'REPAIR', label: 'Repair', emoji: '🛠️' },
  { value: 'INSTALLATION', label: 'Installation', emoji: '🔧' },
  { value: 'MAINTENANCE', label: 'Maintenance', emoji: '⚙️' },
  { value: 'CLEANING_SERVICE', label: 'Cleaning', emoji: '🧹' },
  { value: 'INSPECTION', label: 'Inspection', emoji: '🔍' },
  { value: 'EMERGENCY', label: 'Emergency', emoji: '🚨' },
  { value: 'CONSULTATION', label: 'Consult', emoji: '💬' },
];

export default function ServicesBizPosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<'all' | 'featured' | 'popular' | 'emergency'>('all');
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  const {
    cart, setCart, customerId, setCustomerId,
    paymentMethod, setPaymentMethod, paidAmount, setPaidAmount,
    saleMode, setSaleMode, globalDiscount, setGlobalDiscount,
    subtotal, total, totalItems, effectivePaid, credit, clearCart,
  } = useSharedPosCart();

  const { data: services = [] } = useQuery({
    queryKey: ['catalog-services-pos', categoryFilter, tagFilter],
    queryFn: () => catalogApi.list({
      active: true,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      featured: tagFilter === 'featured' ? true : undefined,
      popular: tagFilter === 'popular' ? true : undefined,
      emergency: tagFilter === 'emergency' ? true : undefined,
    }),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-svc-pos'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });
  const customers = customersData?.items ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return services;
    const q = search.toLowerCase().trim();
    return services.filter((s: any) =>
      s.name?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q)
    );
  }, [services, search]);

  const addToCart = (svc: any) => {
    const price = svc.baseCharge || svc.visitCharge || svc.hourlyRate || 0;
    const existing = cart.find((c) => c.cartLineId === svc.id);
    if (existing) {
      setCart((prev) => prev.map((c) => c.cartLineId === svc.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart((prev) => [...prev, {
        cartLineId: svc.id,
        productId: svc.id,
        name: svc.name,
        variantImage: svc.imageUrl || svc.imageUrls?.[0],
        basePrice: Number(price),
        priceOverride: Number(price),
        stock: 9999,
        quantity: 1,
        unit: svc.chargeType === 'HOURLY' ? 'hour' : 'service',
        useWholesale: false,
        lineDiscount: 0,
      }]);
    }
    toast.success(`${svc.name} added`);
  };

  const addCustomerMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: (customer) => {
      toast.success(`${customer.name} added`);
      setCustomerId(customer.id);
      setShowCustomerAdd(false);
      setNewCustomer({ name: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['customers-for-svc-pos'] });
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
      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-cyan-600 to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2"><UserPlus className="h-5 w-5" /><h3 className="font-extrabold">Quick Add Customer</h3></div>
              <button onClick={() => setShowCustomerAdd(false)} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <input autoFocus value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} placeholder="Customer name" className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-cyan-500" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} placeholder="03XX..." className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-cyan-500" />
              <Button size="lg" className="w-full bg-gradient-to-r from-cyan-600 to-blue-700" onClick={() => { if (!newCustomer.name.trim()) return toast.error('Name required'); addCustomerMutation.mutate({ name: newCustomer.name.trim(), phone: newCustomer.phone.trim() || undefined }); }} loading={addCustomerMutation.isPending}>Add Customer</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr_460px] gap-4 h-[calc(100dvh-7rem)]">
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-cyan-900 to-blue-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-cyan-400/20 blur-2xl" />
            <div className="relative px-5 py-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold border border-white/20">
                    <Wrench className="h-3 w-3 text-amber-300" />
                    Services POS
                  </div>
                  <h2 className="mt-2 text-2xl font-extrabold">Field Service Billing 🛠️</h2>
                </div>
                <Link to="/services-biz/jobs/new">
                  <Button className="bg-amber-500 text-white hover:bg-amber-600 shadow-lg">
                    <Briefcase className="h-4 w-4" /> New Job
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="shrink-0 px-4 py-3 bg-slate-50/80 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services..." className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-cyan-500" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center"><X className="h-3.5 w-3.5" /></button>}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {CATEGORIES.map((c) => (
                <button key={c.value} onClick={() => setCategoryFilter(c.value)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 ${categoryFilter === c.value ? 'bg-cyan-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'}`}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {[
                { v: 'all' as const, label: 'All', color: 'bg-slate-600' },
                { v: 'featured' as const, label: '⭐ Featured', color: 'bg-amber-600' },
                { v: 'popular' as const, label: '🔥 Popular', color: 'bg-red-600' },
                { v: 'emergency' as const, label: '🚨 Emergency', color: 'bg-red-700' },
              ].map((t) => (
                <button key={t.v} onClick={() => setTagFilter(t.v)} className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${tagFilter === t.v ? t.color + ' text-white shadow' : 'bg-white border border-slate-200 text-slate-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30">
            {filtered.length === 0 ? (
              <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                <Wrench className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700">No services</p>
                <p className="text-xs text-slate-500 font-semibold mt-1">Try different filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {filtered.map((svc: any) => {
                  const price = svc.baseCharge || svc.visitCharge || svc.hourlyRate || 0;
                  return (
                    <button key={svc.id} onClick={() => addToCart(svc)} className="group text-left rounded-2xl border-2 border-slate-200 overflow-hidden hover:border-cyan-400 hover:shadow-md hover:-translate-y-0.5 transition bg-white relative">
                      <div className="aspect-square bg-gradient-to-br from-cyan-100 via-blue-100 to-cyan-100 overflow-hidden relative">
                        {svc.imageUrl ? (
                          <img src={svc.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-5xl">🛠️</div>
                        )}
                        <div className="absolute top-1 left-1 flex flex-col gap-1">
                          {svc.isFeatured && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase shadow inline-flex items-center gap-0.5"><Star className="h-2 w-2 fill-current" /> FT</span>}
                          {svc.isEmergency && <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-extrabold uppercase shadow inline-flex items-center gap-0.5 animate-pulse"><Zap className="h-2 w-2" /> URGENT</span>}
                        </div>
                        {svc.estimatedDurationMin && (
                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur text-white text-[9px] font-extrabold inline-flex items-center gap-0.5"><Clock className="h-2 w-2" /> {svc.estimatedDurationMin}m</div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="font-extrabold text-slate-900 text-xs line-clamp-2 leading-tight min-h-[2rem]">{svc.name}</div>
                        <div className="text-[9px] font-extrabold text-cyan-600 mt-0.5 uppercase">{svc.category.replace('_', ' ')}</div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(price)}</div>
                          {svc.warrantyDays > 0 && <div className="text-[9px] font-bold text-emerald-700 inline-flex items-center gap-0.5"><Shield className="h-2 w-2" /> {svc.warrantyDays}d</div>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold border border-white/20"><Wrench className="h-2.5 w-2.5" /> Service Cart</div>
                <div className="text-2xl font-extrabold tabular-nums mt-1">{totalItems.toFixed(0)} items</div>
                <div className="text-xs text-white/80 font-semibold">{formatPKRFull(total)}</div>
              </div>
              {cart.length > 0 && <button onClick={() => { if (confirm('Clear cart?')) clearCart(); }} className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-rose-500/40 text-white text-xs font-extrabold border border-white/20">Clear</button>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-3 border-b border-slate-100 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5"><User className="h-3 w-3 text-cyan-600" /> Customer</label>
                <button onClick={() => setShowCustomerAdd(true)} className="text-xs font-extrabold text-cyan-600 hover:text-cyan-700 inline-flex items-center gap-1"><UserPlus className="h-3 w-3" /> Add</button>
              </div>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500 appearance-none">
                <option value="">Walk-in Customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` • ${c.phone}` : ''}{c.balance > 0 ? ` • Udhaar: ${formatPKR(c.balance)}` : ''}</option>)}
              </select>
            </div>

            <div className="p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <Wrench className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">Empty cart</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Click a service to add</p>
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
                        <button onClick={() => setCart((prev) => prev.map((c) => c.cartLineId === item.cartLineId ? { ...c, quantity: c.quantity + 1 } : c))} className="h-8 w-8 bg-cyan-600 text-white hover:bg-cyan-700 font-extrabold">+</button>
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
                  <button key={m} onClick={() => setSaleMode(m)} className={`py-2 rounded-lg text-[10px] font-extrabold transition ${saleMode === m ? 'bg-cyan-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'}`}>
                    {m === 'FULL_PAYMENT' ? 'Full Pay' : m === 'PARTIAL_CREDIT' ? 'Partial' : 'Udhaar'}
                  </button>
                ))}
              </div>

              {saleMode === 'PARTIAL_CREDIT' && (
                <input type="number" placeholder="Paid amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="h-10 w-full rounded-lg border-2 border-amber-300 bg-amber-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
              )}

              <div className="rounded-xl bg-gradient-to-br from-slate-950 to-cyan-900 text-white p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
                {Number(globalDiscount) > 0 && <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(Number(globalDiscount))}</span></div>}
                <div className="pt-1 mt-1 border-t border-white/20 flex justify-between items-center">
                  <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                  <span className="text-2xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
                </div>
                {credit > 0 && <div className="flex justify-between text-amber-300 pt-1 border-t border-white/20 mt-1"><span className="font-extrabold">Udhaar</span><span className="font-extrabold tabular-nums">{formatPKR(credit)}</span></div>}
              </div>

              <Button size="lg" className="w-full bg-gradient-to-r from-cyan-600 to-blue-700" onClick={handleCheckout} loading={checkoutMutation.isPending} disabled={!currentShopId}>
                <CheckCircle2 className="h-5 w-5" /> Complete Sale
              </Button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
