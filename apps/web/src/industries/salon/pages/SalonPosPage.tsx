import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Scissors, Search, X, Plus, Trash2, User, UserPlus, Clock,
  ChevronDown, CheckCircle2, DollarSign, Award, Star, Sparkles,
  Calendar, Users, Phone, Timer, ArrowLeft, ArrowRight, Zap,
  ReceiptText, Send, Save, TrendingUp, Heart, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { salonServicesApi, type SalonService, type ServiceCategory } from '../api/services.api';
import { staffProfilesApi } from '../api/staff-profiles.api';
import { appointmentsApi } from '../api/appointments.api';
import { salonCustomerProfilesApi } from '../api/customer-profiles.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';

type Screen = 'customer' | 'services' | 'schedule' | 'checkout';

const CATEGORY_EMOJI: Record<ServiceCategory, string> = {
  HAIR_CUT: '✂️', HAIR_COLOR: '🎨', HAIR_TREATMENT: '💆', HAIR_STYLING: '💇',
  BEARD_SHAVE: '🪒', FACIAL: '✨', MAKEUP: '💄', BRIDAL_MAKEUP: '👰',
  PARTY_MAKEUP: '🎉', MANICURE: '💅', PEDICURE: '🦶', NAIL_ART: '💎',
  WAXING: '🧴', THREADING: '🧵', MASSAGE: '💆‍♀️', BODY_TREATMENT: '🧖',
  SPA_PACKAGE: '🌿', MEHNDI: '🎨', HAIR_EXTENSION: '💇‍♀️', KERATIN: '🔬',
  BOTOX: '💉', OTHER: '⭐',
};

interface CartService {
  cartLineId: string;
  serviceId: string;
  serviceName: string;
  category: ServiceCategory;
  imageUrl?: string;
  price: number;
  discountPrice?: number;
  durationMinutes: number;
  commissionPct: number;
  commissionFixed: number;
  staffProfileId?: string;
  staffName?: string;
  notes?: string;
  lineDiscount: number;
}

const cartLineId = () => `sln-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function SalonPosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const [screen, setScreen] = useState<Screen>('customer');
  const [customerId, setCustomerId] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [cart, setCart] = useState<CartService[]>([]);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | 'all'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'MEN' | 'WOMEN' | 'KIDS'>('all');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  const [saleMode, setSaleMode] = useState<'FULL' | 'PARTIAL' | 'BOOK_ONLY'>('FULL');
  const [globalDiscount, setGlobalDiscount] = useState('');
  const [tip, setTip] = useState(0);
  const [serviceChargePct, setServiceChargePct] = useState(0);
  const [taxPct, setTaxPct] = useState(0);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  const { data: services = [] } = useQuery({
    queryKey: ['salon-services-pos'],
    queryFn: () => salonServicesApi.list({ active: true }),
    enabled: screen === 'services',
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['salon-staff-pos'],
    queryFn: () => staffProfilesApi.list({ bookable: true }),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-salon-pos'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });
  const customers = customersData?.items ?? [];
  const selectedCustomer = customers.find((c) => c.id === customerId);

  const { data: customerProfile } = useQuery({
    queryKey: ['salon-customer-profile', customerId],
    queryFn: () => salonCustomerProfilesApi.byCustomer(customerId),
    enabled: !!customerId,
  });

  const categories = useMemo(() => {
    const set = new Set<ServiceCategory>();
    services.forEach((s) => set.add(s.category));
    return Array.from(set);
  }, [services]);

  const filteredServices = useMemo(() => {
    let list = services;
    if (categoryFilter !== 'all') list = list.filter((s) => s.category === categoryFilter);
    if (genderFilter === 'MEN') list = list.filter((s) => s.forMen);
    if (genderFilter === 'WOMEN') list = list.filter((s) => s.forWomen);
    if (genderFilter === 'KIDS') list = list.filter((s) => s.forKids);
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((s) => s.name.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q));
    return list;
  }, [services, categoryFilter, genderFilter, search]);

  const subtotal = cart.reduce((sum, s) => {
    const price = s.discountPrice && s.discountPrice < s.price ? s.discountPrice : s.price;
    return sum + price - (s.lineDiscount || 0);
  }, 0);
  const svcCharge = subtotal * (serviceChargePct / 100);
  const tax = (subtotal + svcCharge) * (taxPct / 100);
  const gDiscount = Number(globalDiscount) || 0;
  const total = Math.max(subtotal + svcCharge + tax + tip - gDiscount, 0);
  const totalDuration = cart.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalCommission = cart.reduce((sum, s) => {
    const price = s.discountPrice && s.discountPrice < s.price ? s.discountPrice : s.price;
    return sum + (price * s.commissionPct / 100) + s.commissionFixed;
  }, 0);

  const effectivePaid = saleMode === 'FULL' ? total : saleMode === 'BOOK_ONLY' ? 0 : Number(paidAmount || 0);
  const credit = Math.max(total - effectivePaid, 0);

  const addService = (svc: SalonService) => {
    setCart((prev) => [...prev, {
      cartLineId: cartLineId(),
      serviceId: svc.id,
      serviceName: svc.name,
      category: svc.category,
      imageUrl: svc.imageUrl,
      price: svc.price,
      discountPrice: svc.discountPrice,
      durationMinutes: svc.durationMinutes,
      commissionPct: svc.commissionPct,
      commissionFixed: svc.commissionFixed,
      staffProfileId: customerProfile?.preferredStaffId,
      staffName: allStaff.find((s) => s.id === customerProfile?.preferredStaffId)?.staff
        ? `${allStaff.find((s) => s.id === customerProfile?.preferredStaffId)?.staff?.firstName || ''} ${allStaff.find((s) => s.id === customerProfile?.preferredStaffId)?.staff?.lastName || ''}`.trim()
        : undefined,
      lineDiscount: 0,
    }]);
    toast.success(`${svc.name} added`);
  };

  const assignStaff = (lineId: string, staffId: string) => {
    const staff = allStaff.find((s) => s.id === staffId);
    const name = staff?.staff ? `${staff.staff.firstName || ''} ${staff.staff.lastName || ''}`.trim() : '';
    setCart((prev) => prev.map((c) => c.cartLineId === lineId ? { ...c, staffProfileId: staffId, staffName: name } : c));
  };

  const addCustomerMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: (customer) => {
      toast.success(`${customer.name} added`);
      setCustomerId(customer.id);
      setShowCustomerAdd(false);
      setNewCustomer({ name: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['customers-for-salon-pos'] });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!currentShopId) throw new Error('Shop required');

      // Create appointment first
      const start = new Date(`${scheduledDate}T${scheduledTime}`);
      const end = new Date(start.getTime() + totalDuration * 60_000);

      const appointment = await appointmentsApi.create({
        customerId: customerId || undefined,
        customerName: !customerId ? walkInName : undefined,
        customerPhone: !customerId ? walkInPhone : undefined,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        numberOfGuests,
        customerNotes: specialRequests || undefined,
        services: cart.map((c) => ({
          serviceId: c.serviceId,
          staffProfileId: c.staffProfileId,
          price: c.discountPrice && c.discountPrice < c.price ? c.discountPrice : c.price,
          discount: c.lineDiscount,
          notes: c.notes,
        })),
      });

      // If not book-only, create sale
      if (saleMode !== 'BOOK_ONLY' && effectivePaid > 0) {
        const sale = await salesApi.create({
          shopId: currentShopId,
          customerId: customerId || undefined,
          paymentMethod,
          paidAmount: effectivePaid,
          discount: gDiscount,
          items: cart.map((c) => ({
            productId: c.serviceId,
            quantity: 1,
            priceOverride: c.discountPrice && c.discountPrice < c.price ? c.discountPrice : c.price,
            lineDiscount: c.lineDiscount,
            useWholesale: false,
            note: c.staffName ? `Served by: ${c.staffName}` : undefined,
          })),
        });
        return { appointment, sale };
      }
      return { appointment, sale: null };
    },
    onSuccess: ({ appointment, sale }) => {
      if (sale) {
        window.open(`/sales/${sale.id}/receipt?auto=1`, '_blank');
      } else {
        toast.success(`Appointment ${appointment.appointmentNumber} booked`);
        navigate(`/salon/appointments/${appointment.id}`);
      }
      resetAll();
      queryClient.invalidateQueries({ queryKey: ['salon-appointments'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Booking failed'),
  });

  const resetAll = () => {
    setScreen('customer');
    setCustomerId('');
    setWalkInName('');
    setWalkInPhone('');
    setCart([]);
    setSpecialRequests('');
    setPaidAmount('');
    setGlobalDiscount('');
    setTip(0);
    setSaleMode('FULL');
  };

  const canProceedCustomer = customerId || (walkInName && walkInPhone);
  const canProceedServices = cart.length > 0;
  const canProceedSchedule = scheduledDate && scheduledTime;

  // ─── SCREEN A: Customer Selection ──────
  if (screen === 'customer') {
    return (
      <div className="min-h-[calc(100dvh-7rem)] flex flex-col">
        {showCustomerAdd && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-br from-pink-600 to-rose-700 text-white flex items-center justify-between">
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
                  className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-pink-500" />
                <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="03XX-XXXXXXX"
                  className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-pink-500" />
                <Button size="lg" className="w-full bg-gradient-to-r from-pink-600 to-rose-700"
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

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 shadow-2xl mb-6">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Scissors className="h-3.5 w-3.5 text-amber-300" />
              Salon POS
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">💇 New Appointment</h1>
            <p className="mt-2 text-sm text-white/80">Customer select karo — walk-in ya registered</p>
          </div>
        </section>

        <div className="flex-1 space-y-6">
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900 text-lg">Registered Customer</h3>
              <button onClick={() => setShowCustomerAdd(true)}
                className="text-sm font-extrabold text-pink-600 hover:text-pink-700 inline-flex items-center gap-1">
                <UserPlus className="h-4 w-4" /> Add New
              </button>
            </div>
            <div className="relative mb-3">
              <User className="h-4 w-4 text-pink-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-9 text-sm font-bold focus:outline-none focus:border-pink-500 appearance-none">
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.phone ? ` • ${c.phone}` : ''}{c.balance > 0 ? ` • Udhaar: ${formatPKR(c.balance)}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {selectedCustomer && customerProfile && (
              <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-200 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-700 text-white flex items-center justify-center font-extrabold shadow">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-extrabold text-slate-900">{selectedCustomer.name}</div>
                    <div className="text-xs text-slate-600 font-bold">
                      {customerProfile.totalVisits} visits • {formatPKR(customerProfile.totalSpent)} spent
                    </div>
                  </div>
                  {customerProfile.avgRating && (
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-amber-700 inline-flex items-center gap-0.5">
                        <Star className="h-4 w-4 fill-current" />{customerProfile.avgRating.toFixed(1)}
                      </div>
                    </div>
                  )}
                </div>

                {(customerProfile.allergies?.length > 0 || customerProfile.medicalConditions) && (
                  <div className="rounded-lg bg-rose-100 border border-rose-300 p-2 flex items-start gap-1.5">
                    <AlertCircle className="h-3 w-3 text-rose-700 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <div className="font-extrabold text-rose-900 mb-0.5">⚠️ Alerts:</div>
                      {customerProfile.allergies?.length > 0 && (
                        <div className="text-rose-800 font-bold">Allergies: {customerProfile.allergies.join(', ')}</div>
                      )}
                      {customerProfile.medicalConditions && (
                        <div className="text-rose-800 font-bold">Medical: {customerProfile.medicalConditions}</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {customerProfile.hairType && (
                    <div className="rounded-lg bg-white border border-pink-200 p-2">
                      <div className="text-[9px] uppercase font-extrabold text-pink-700">Hair</div>
                      <div className="font-extrabold text-slate-900">{customerProfile.hairType} • {customerProfile.hairLength}</div>
                    </div>
                  )}
                  {customerProfile.skinType && (
                    <div className="rounded-lg bg-white border border-amber-200 p-2">
                      <div className="text-[9px] uppercase font-extrabold text-amber-700">Skin</div>
                      <div className="font-extrabold text-slate-900">{customerProfile.skinType} • {customerProfile.skinTone}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <div className="text-center text-xs font-extrabold text-slate-500 uppercase tracking-wider">— OR —</div>

          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-6">
            <h3 className="font-extrabold text-slate-900 text-lg mb-4">Walk-in Customer</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Name</label>
                <input value={walkInName} onChange={(e) => { setWalkInName(e.target.value); setCustomerId(''); }}
                  placeholder="Guest name"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Phone</label>
                <input value={walkInPhone} onChange={(e) => setWalkInPhone(e.target.value)}
                  placeholder="03XX-XXXXXXX"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
          <Button size="lg" className="bg-gradient-to-r from-pink-600 to-rose-700"
            disabled={!canProceedCustomer} onClick={() => setScreen('services')}>
            Next: Choose Services <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ─── SCREEN B: Services + Cart ──────
  if (screen === 'services') {
    return (
      <div className="grid xl:grid-cols-[1fr_460px] gap-4 h-[calc(100dvh-7rem)]">
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-pink-400/20 blur-2xl" />
            <div className="relative px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <button onClick={() => setScreen('customer')} className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                    <Scissors className="h-2.5 w-2.5 text-amber-300" />
                    {selectedCustomer?.name || walkInName || 'Walk-in'}
                  </div>
                  <h2 className="text-lg font-extrabold leading-tight mt-0.5">Choose Services</h2>
                </div>
              </div>
              <div className="text-xs font-extrabold text-white/80">{filteredServices.length} services</div>
            </div>
          </div>

          <div className="shrink-0 px-4 py-3 bg-slate-50/80 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-pink-500" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center">
                  <X className="h-3.5 w-3.5 text-slate-500" />
                </button>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => setGenderFilter('all')} className={`shrink-0 px-3 h-8 rounded-lg text-xs font-extrabold ${genderFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>All</button>
              <button onClick={() => setGenderFilter('MEN')} className={`shrink-0 px-3 h-8 rounded-lg text-xs font-extrabold ${genderFilter === 'MEN' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>👨 Men</button>
              <button onClick={() => setGenderFilter('WOMEN')} className={`shrink-0 px-3 h-8 rounded-lg text-xs font-extrabold ${genderFilter === 'WOMEN' ? 'bg-pink-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>👩 Women</button>
              <button onClick={() => setGenderFilter('KIDS')} className={`shrink-0 px-3 h-8 rounded-lg text-xs font-extrabold ${genderFilter === 'KIDS' ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>🧒 Kids</button>
            </div>

            {categories.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button onClick={() => setCategoryFilter('all')} className={`shrink-0 px-3 h-8 rounded-lg text-xs font-extrabold ${categoryFilter === 'all' ? 'bg-pink-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'}`}>
                  All ({services.length})
                </button>
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setCategoryFilter(cat)}
                    className={`shrink-0 px-3 h-8 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 ${categoryFilter === cat ? 'bg-pink-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'}`}>
                    {CATEGORY_EMOJI[cat]} {cat.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {filteredServices.map((svc) => {
                const inCart = cart.filter((c) => c.serviceId === svc.id).length;
                const hasDiscount = svc.discountPrice && svc.discountPrice < svc.price;
                return (
                  <button key={svc.id} onClick={() => addService(svc)}
                    className={`group relative text-left rounded-2xl border-2 overflow-hidden transition-all bg-white ${inCart > 0 ? 'border-pink-500 shadow-lg ring-2 ring-pink-200' : svc.isFeatured ? 'border-amber-400 hover:shadow-lg' : 'border-slate-200 hover:border-pink-400 hover:shadow-lg hover:-translate-y-0.5'}`}>
                    {inCart > 0 && (
                      <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-pink-600 text-white text-xs font-extrabold flex items-center justify-center shadow-xl ring-2 ring-white z-10">
                        {inCart}
                      </div>
                    )}
                    <div className="aspect-square bg-gradient-to-br from-pink-100 to-rose-100 overflow-hidden relative">
                      {svc.imageUrl ? (
                        <img src={svc.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl">
                          {CATEGORY_EMOJI[svc.category]}
                        </div>
                      )}
                      {svc.isFeatured && (
                        <div className="absolute top-1 right-1 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shadow">
                          <Star className="h-3 w-3 fill-white text-white" />
                        </div>
                      )}
                      {hasDiscount && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[8px] font-extrabold">
                          {(((svc.price - svc.discountPrice!) / svc.price) * 100).toFixed(0)}% OFF
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-900/80 text-white text-[9px] font-extrabold inline-flex items-center gap-0.5">
                        <Clock className="h-2 w-2" />{svc.durationMinutes}m
                      </div>
                    </div>
                    <div className="p-2">
                      <div className="font-extrabold text-slate-900 text-xs line-clamp-2 leading-tight min-h-[2rem]">{svc.name}</div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <div className="text-sm font-extrabold text-emerald-700 tabular-nums">
                          {formatPKR(hasDiscount ? svc.discountPrice! : svc.price)}
                        </div>
                        {hasDiscount && (
                          <div className="text-[9px] text-slate-400 line-through">{formatPKR(svc.price)}</div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                  <ReceiptText className="h-2.5 w-2.5 text-amber-300" /> Service Cart
                </div>
                <div className="text-2xl font-extrabold tabular-nums mt-1">{cart.length} services</div>
                <div className="text-xs text-white/80 font-semibold">{totalDuration} min • {formatPKRFull(subtotal)}</div>
              </div>
              {cart.length > 0 && (
                <button onClick={() => { if (confirm('Clear all services?')) setCart([]); }}
                  className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-rose-500/40 text-white text-xs font-extrabold border border-white/20">
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/30">
            {cart.length === 0 ? (
              <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                <Scissors className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700">Empty cart</p>
                <p className="text-xs text-slate-500 font-semibold mt-1">Click services to add</p>
              </div>
            ) : (
              cart.map((item) => {
                const effPrice = item.discountPrice && item.discountPrice < item.price ? item.discountPrice : item.price;
                return (
                  <div key={item.cartLineId} className="rounded-xl bg-white border-2 border-slate-200 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="h-10 w-10 rounded-lg bg-pink-100 flex items-center justify-center text-xl shrink-0">
                        {CATEGORY_EMOJI[item.category]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm text-slate-900 truncate">{item.serviceName}</div>
                        <div className="text-[10px] text-slate-500 font-bold inline-flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{item.durationMinutes}m</span>
                          <span className="font-extrabold text-emerald-700">{formatPKR(effPrice - item.lineDiscount)}</span>
                        </div>
                      </div>
                      <button onClick={() => setCart((prev) => prev.filter((c) => c.cartLineId !== item.cartLineId))}
                        className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <select value={item.staffProfileId || ''} onChange={(e) => assignStaff(item.cartLineId, e.target.value)}
                      className="h-9 w-full rounded-lg border-2 border-violet-200 bg-violet-50 px-2 text-xs font-bold focus:outline-none focus:border-violet-500">
                      <option value="">Assign staff...</option>
                      {allStaff.map((s) => {
                        const name = s.staff ? `${s.staff.firstName || ''} ${s.staff.lastName || ''}`.trim() : '';
                        return <option key={s.id} value={s.id}>{name} ({s.role})</option>;
                      })}
                    </select>
                  </div>
                );
              })
            )}
          </div>

          {cart.length > 0 && (
            <div className="shrink-0 border-t-2 border-slate-200 bg-white p-3">
              <Button size="lg" className="w-full bg-gradient-to-r from-pink-600 to-rose-700"
                disabled={!canProceedServices} onClick={() => setScreen('schedule')}>
                Next: Schedule <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </aside>
      </div>
    );
  }

  // ─── SCREEN C: Schedule ──────
  if (screen === 'schedule') {
    return (
      <div className="min-h-[calc(100dvh-7rem)] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setScreen('services')} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border-2 border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>

        <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-5 mb-4 shadow-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold">
            <Calendar className="h-3 w-3" /> Schedule Appointment
          </div>
          <h2 className="mt-2 text-2xl font-extrabold">📅 When to book?</h2>
          <div className="mt-2 flex items-center gap-3 text-sm text-white/80">
            <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5" />Total: {totalDuration} min</span>
            <span className="inline-flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{formatPKR(total)}</span>
          </div>
        </section>

        <div className="flex-1 space-y-4">
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5 block">Date *</label>
                <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="h-14 w-full rounded-xl border-2 border-pink-300 bg-pink-50 px-4 text-lg font-extrabold focus:outline-none focus:border-pink-500" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5 block">Time *</label>
                <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                  className="h-14 w-full rounded-xl border-2 border-pink-300 bg-pink-50 px-4 text-lg font-extrabold focus:outline-none focus:border-pink-500" />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5 block">Number of Guests</label>
              <div className="inline-flex items-center bg-slate-100 rounded-xl overflow-hidden">
                <button onClick={() => setNumberOfGuests(Math.max(1, numberOfGuests - 1))} className="h-12 w-12 hover:bg-slate-200 font-extrabold text-xl">−</button>
                <span className="h-12 w-16 flex items-center justify-center font-extrabold text-2xl tabular-nums">{numberOfGuests}</span>
                <button onClick={() => setNumberOfGuests(numberOfGuests + 1)} className="h-12 w-12 bg-pink-600 text-white hover:bg-pink-700 font-extrabold text-xl">+</button>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1.5 block">Special Requests</label>
              <textarea rows={3} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Any specific preferences, allergies to note, etc..."
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-pink-500 resize-none" />
            </div>
          </section>

          <section className="rounded-3xl bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-200 p-5">
            <div className="text-[10px] uppercase font-extrabold text-pink-700 mb-2">Appointment Summary</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">Services</span><span className="font-extrabold">{cart.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Total Duration</span><span className="font-extrabold">{totalDuration} min</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Estimated End</span>
                <span className="font-extrabold">
                  {(() => {
                    const start = new Date(`${scheduledDate}T${scheduledTime}`);
                    const end = new Date(start.getTime() + totalDuration * 60_000);
                    return end.toTimeString().slice(0, 5);
                  })()}
                </span>
              </div>
              <div className="pt-2 border-t border-pink-200 flex justify-between text-lg">
                <span className="font-extrabold text-pink-900">Amount</span>
                <span className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(total)}</span>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
          <Button size="lg" className="bg-gradient-to-r from-pink-600 to-rose-700"
            disabled={!canProceedSchedule} onClick={() => setScreen('checkout')}>
            Next: Checkout <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ─── SCREEN D: Checkout ──────
  return (
    <div className="min-h-[calc(100dvh-7rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setScreen('schedule')} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border-2 border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-5 mb-4 shadow-xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold">
          <DollarSign className="h-3 w-3" /> Payment
        </div>
        <h2 className="mt-2 text-2xl font-extrabold">💰 Confirm & Pay</h2>
      </section>

      <div className="flex-1 space-y-4">
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="font-extrabold text-slate-900">Sale Mode</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'FULL' as const, label: '💵 Pay in Full', desc: 'Now' },
              { v: 'PARTIAL' as const, label: '📝 Advance', desc: 'Partial' },
              { v: 'BOOK_ONLY' as const, label: '📅 Book Only', desc: 'Pay later' },
            ].map((m) => (
              <button key={m.v} onClick={() => setSaleMode(m.v)}
                className={`p-3 rounded-xl border-2 transition ${saleMode === m.v ? 'border-pink-600 bg-pink-50 shadow-md' : 'border-slate-200 hover:border-pink-300'}`}>
                <div className="text-sm font-extrabold">{m.label}</div>
                <div className="text-[10px] font-bold text-slate-500">{m.desc}</div>
              </button>
            ))}
          </div>
        </section>

        {saleMode !== 'BOOK_ONLY' && (
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900">Payment Method</h3>
            <div className="grid grid-cols-5 gap-2">
              {(['CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER'] as PaymentMethod[]).map((m) => (
                <button key={m} onClick={() => setPaymentMethod(m)}
                  className={`p-3 rounded-xl border-2 text-xs font-extrabold ${paymentMethod === m ? 'border-emerald-600 bg-emerald-50 shadow' : 'border-slate-200'}`}>
                  {m}
                </button>
              ))}
            </div>
            {saleMode === 'PARTIAL' && (
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Advance Amount *</label>
                <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0"
                  className="h-12 w-full rounded-xl border-2 border-amber-300 bg-amber-50 px-4 text-lg font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
              </div>
            )}
          </section>
        )}

        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-2">
          <h3 className="font-extrabold text-slate-900 mb-2">Adjustments</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <input type="number" placeholder="Discount" value={globalDiscount} onChange={(e) => setGlobalDiscount(e.target.value)}
              className="h-10 rounded-lg border-2 border-slate-200 px-2 font-bold tabular-nums focus:border-pink-500 focus:outline-none" />
            <input type="number" placeholder="Tip (Rs)" value={tip || ''} onChange={(e) => setTip(Number(e.target.value))}
              className="h-10 rounded-lg border-2 border-slate-200 px-2 font-bold tabular-nums focus:border-pink-500 focus:outline-none" />
            <input type="number" placeholder="Service Charge %" value={serviceChargePct || ''} onChange={(e) => setServiceChargePct(Number(e.target.value))}
              className="h-10 rounded-lg border-2 border-slate-200 px-2 font-bold tabular-nums focus:border-pink-500 focus:outline-none" />
            <input type="number" placeholder="Tax %" value={taxPct || ''} onChange={(e) => setTaxPct(Number(e.target.value))}
              className="h-10 rounded-lg border-2 border-slate-200 px-2 font-bold tabular-nums focus:border-pink-500 focus:outline-none" />
          </div>
        </section>

        <section className="rounded-3xl bg-gradient-to-br from-slate-950 to-pink-900 text-white p-5 space-y-2 shadow-xl">
          <div className="text-[10px] uppercase font-extrabold text-white/70">Final Bill</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
            {svcCharge > 0 && <div className="flex justify-between"><span className="text-white/70">Service ({serviceChargePct}%)</span><span className="font-bold tabular-nums">+{formatPKR(svcCharge)}</span></div>}
            {tax > 0 && <div className="flex justify-between"><span className="text-white/70">Tax ({taxPct}%)</span><span className="font-bold tabular-nums">+{formatPKR(tax)}</span></div>}
            {tip > 0 && <div className="flex justify-between text-amber-300"><span>Tip</span><span className="font-bold tabular-nums">+{formatPKR(tip)}</span></div>}
            {gDiscount > 0 && <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(gDiscount)}</span></div>}
          </div>
          <div className="pt-2 border-t border-white/20 flex justify-between items-center">
            <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
            <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
          </div>
          {totalCommission > 0 && (
            <div className="pt-2 border-t border-white/20 flex justify-between text-xs text-amber-300">
              <span className="font-extrabold inline-flex items-center gap-1"><Award className="h-3 w-3" />Staff Commission</span>
              <span className="font-extrabold tabular-nums">{formatPKR(totalCommission)}</span>
            </div>
          )}
          {credit > 0 && (
            <div className="pt-2 border-t border-white/20 flex justify-between text-amber-300">
              <span className="font-extrabold">Balance/Udhaar</span>
              <span className="font-extrabold tabular-nums">{formatPKR(credit)}</span>
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-200">
        <Button size="lg" className="w-full bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700"
          onClick={() => checkoutMutation.mutate()} loading={checkoutMutation.isPending}
          disabled={!currentShopId || cart.length === 0}>
          <CheckCircle2 className="h-5 w-5" />
          {saleMode === 'BOOK_ONLY' ? 'Book Appointment' : 'Complete & Print Receipt'}
        </Button>
      </div>
    </div>
  );
}
