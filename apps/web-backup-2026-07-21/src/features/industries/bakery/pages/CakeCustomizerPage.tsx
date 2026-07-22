import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Sparkles, User, Phone, Mail, Calendar, MapPin,
  Cake, Palette, Type, Camera, X, Check, ChevronRight, ChevronLeft,
  Heart, AlertCircle, Truck, Home, Building2, DollarSign, Search,
  Star, Award,
} from 'lucide-react';
import { cakeOrdersApi } from '../api/cake-orders.api';
import { customersApi } from '@/api/customers.api';
import { SIZES, SHAPES, FLAVORS, CREAMS, OCCASIONS } from '../api/constants';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, label: 'Customer', icon: User },
  { id: 2, label: 'Cake Basics', icon: Cake },
  { id: 3, label: 'Flavor & Cream', icon: Palette },
  { id: 4, label: 'Personalization', icon: Type },
  { id: 5, label: 'Occasion', icon: Sparkles },
  { id: 6, label: 'Delivery', icon: Truck },
  { id: 7, label: 'Review', icon: Check },
];

const DELIVERY_TYPES = [
  { value: 'SELF_PICKUP', label: 'Self Pickup', emoji: '🚶', icon: Home },
  { value: 'HOME_DELIVERY', label: 'Home Delivery', emoji: '🏠', icon: Truck },
  { value: 'VENUE_DELIVERY', label: 'Venue Delivery', emoji: '💒', icon: Building2 },
  { value: 'COURIER', label: 'Courier', emoji: '📦', icon: Truck },
];

export default function CakeCustomizerPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [form, setForm] = useState<any>({
    // Customer
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    // Cake basics
    size: 'ONE_KG',
    customWeightKg: '',
    shape: 'ROUND',
    customShapeDesc: '',
    numberOfTiers: 1,
    numberOrLetter: '',
    // Flavor
    flavor: 'CHOCOLATE',
    customFlavorDesc: '',
    creamType: 'BUTTERCREAM',
    // Personalization
    messageOnCake: '',
    messageColor: 'White',
    hasPhotoOnCake: false,
    photoUrl: '',
    hasEdibleImage: false,
    designReferenceUrls: [] as string[],
    designInstructions: '',
    colorTheme: '',
    primaryColor: '',
    secondaryColor: '',
    decorativeItems: [] as string[],
    candlesRequired: 0,
    candleType: '',
    cakeStand: false,
    cakeKnife: false,
    // Occasion
    occasion: 'BIRTHDAY',
    celebrantName: '',
    celebrantAge: '',
    eventDate: '',
    eventTime: '',
    eventVenue: '',
    // Dietary
    isEggless: false,
    isSugarFree: false,
    isVegan: false,
    allergies: [] as string[],
    dietaryNotes: '',
    // Delivery
    deliveryType: 'SELF_PICKUP',
    neededBy: '',
    deliveryDate: '',
    deliveryTime: '',
    deliveryAddress: '',
    deliveryLandmark: '',
    deliveryCharges: 0,
    // Pricing
    basePrice: 0,
    customizationCharges: 0,
    photoCakeCharges: 0,
    taxAmount: 0,
    discount: 0,
    advanceRequired: 0,
    advancePaid: 0,
    // Notes
    specialInstructions: '',
  });

  const [customerSearch, setCustomerSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-cake', customerSearch],
    queryFn: () => customersApi.list({ limit: 50, search: customerSearch || undefined }),
    enabled: showPicker,
  });

  const total = Math.max(
    Number(form.basePrice) + Number(form.customizationCharges) + Number(form.photoCakeCharges) +
    Number(form.deliveryCharges) + Number(form.taxAmount) - Number(form.discount),
    0
  );

  const createMutation = useMutation({
    mutationFn: () => cakeOrdersApi.create({
      ...form,
      customWeightKg: form.customWeightKg ? Number(form.customWeightKg) : undefined,
      numberOfTiers: Number(form.numberOfTiers) || 1,
      celebrantAge: form.celebrantAge ? Number(form.celebrantAge) : undefined,
      candlesRequired: form.candlesRequired ? Number(form.candlesRequired) : undefined,
      deliveryCharges: Number(form.deliveryCharges) || 0,
      basePrice: Number(form.basePrice) || 0,
      customizationCharges: Number(form.customizationCharges) || 0,
      photoCakeCharges: Number(form.photoCakeCharges) || 0,
      taxAmount: Number(form.taxAmount) || 0,
      discount: Number(form.discount) || 0,
      advanceRequired: Number(form.advanceRequired) || (total * 0.5),
      advancePaid: Number(form.advancePaid) || 0,
    }),
    onSuccess: (order) => {
      toast.success('Cake order ' + order.orderNumber + ' created! 🎂');
      navigate('/bakery/cake-orders/' + order.id);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const canProceed = () => {
    if (step === 1) return form.customerName && form.customerPhone;
    if (step === 2) return form.size && form.shape;
    if (step === 3) return form.flavor;
    if (step === 5) return form.occasion;
    if (step === 6) return form.neededBy;
    return true;
  };

  const selectedSize = SIZES.find((s) => s.value === form.size);
  const selectedShape = SHAPES.find((s) => s.value === form.shape);
  const selectedFlavor = FLAVORS.find((f) => f.value === form.flavor);
  const selectedCream = CREAMS.find((c) => c.value === form.creamType);
  const selectedOccasion = OCCASIONS.find((o) => o.value === form.occasion);

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/bakery/cake-orders')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                Cake Customizer
              </div>
              <h1 className="mt-1 text-2xl font-extrabold">🎂 Design Your Cake</h1>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="mt-6 flex items-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((s, i) => {
            const isActive = s.id === step;
            const isCompleted = s.id < step;
            const StepIcon = s.icon;
            return (
              <div key={s.id} className="flex items-center shrink-0">
                <button
                  onClick={() => (isCompleted || isActive) && setStep(s.id)}
                  className={
                    'flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition ' +
                    (isActive ? 'bg-white/25 shadow' :
                     isCompleted ? 'text-white/90 hover:bg-white/10' : 'text-white/50 cursor-not-allowed')
                  }
                >
                  <div className={
                    'h-8 w-8 rounded-full flex items-center justify-center ' +
                    (isActive ? 'bg-white text-pink-700' :
                     isCompleted ? 'bg-emerald-500 text-white' : 'bg-white/20')
                  }>
                    {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                  </div>
                  <span className="text-[9px] font-extrabold uppercase whitespace-nowrap">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={'h-0.5 w-4 mx-0.5 ' + (isCompleted ? 'bg-emerald-500' : 'bg-white/20')} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* STEP 1: Customer */}
          {step === 1 && (
            <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-pink-200 dark:border-pink-800 shadow-sm p-5 space-y-4">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-pink-600" />
                Who is this cake for?
              </h3>

              {form.customerId ? (
                <div className="rounded-xl bg-pink-50 dark:bg-pink-950/30 border-2 border-pink-200 p-3 flex items-center gap-3">
                  <User className="h-5 w-5 text-pink-600" />
                  <div className="flex-1">
                    <div className="font-extrabold">{form.customerName}</div>
                    {form.customerPhone && <div className="text-xs text-slate-600 font-bold">{form.customerPhone}</div>}
                  </div>
                  <button onClick={() => setForm({ ...form, customerId: '', customerName: '', customerPhone: '', customerEmail: '' })} className="text-xs font-extrabold text-pink-600 hover:underline">Change</button>
                </div>
              ) : (
                <>
                  <button onClick={() => setShowPicker(!showPicker)} className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-extrabold text-slate-600 hover:border-pink-400">
                    <Search className="h-4 w-4 inline mr-1" />
                    Search Existing Customer
                  </button>

                  {showPicker && (
                    <div className="rounded-xl border-2 border-pink-300 bg-pink-50/50 p-3 space-y-2">
                      <input autoFocus value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search by name/phone..." className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
                      <div className="max-h-52 overflow-y-auto space-y-1">
                        {(customersData?.items ?? []).map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setForm({ ...form, customerId: c.id, customerName: c.name, customerPhone: c.phone || '', customerEmail: (c as any).email || '' });
                              setShowPicker(false);
                              setCustomerSearch('');
                            }}
                            className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white text-left"
                          >
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-sm font-extrabold flex-1 truncate">{c.name}</span>
                            <span className="text-[10px] text-slate-500 font-bold">{c.phone}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Customer Name *</label>
                      <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Full name" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Phone *</label>
                      <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="03xx-xxxxxxx" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Email (optional)</label>
                <input value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} placeholder="email@example.com" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
              </div>
            </section>
          )}

          {/* STEP 2: Cake Basics */}
          {step === 2 && (
            <>
              <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-pink-200 dark:border-pink-800 shadow-sm p-5 space-y-4">
                <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                  <Cake className="h-5 w-5 text-pink-600" />
                  Choose Size
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {SIZES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setForm({ ...form, size: s.value })}
                      className={
                        'p-3 rounded-xl border-2 text-center transition ' +
                        (form.size === s.value ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/40 shadow ring-2 ring-pink-100' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-pink-300')
                      }
                    >
                      <div className="text-2xl">{s.emoji}</div>
                      <div className="text-[10px] font-extrabold mt-1">{s.label}</div>
                    </button>
                  ))}
                </div>

                {form.size === 'CUSTOM' && (
                  <input type="number" step="0.1" value={form.customWeightKg} onChange={(e) => setForm({ ...form, customWeightKg: e.target.value })} placeholder="Custom weight in kg..." className="h-11 w-full rounded-xl border-2 border-pink-300 bg-pink-50 dark:bg-pink-950/30 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
                )}
              </section>

              <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-pink-200 dark:border-pink-800 shadow-sm p-5 space-y-4">
                <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                  <Palette className="h-5 w-5 text-fuchsia-600" />
                  Choose Shape
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {SHAPES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setForm({ ...form, shape: s.value })}
                      className={
                        'p-3 rounded-xl border-2 text-center transition ' +
                        (form.shape === s.value ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40 shadow ring-2 ring-fuchsia-100' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-fuchsia-300')
                      }
                    >
                      <div className="text-3xl">{s.emoji}</div>
                      <div className="text-[10px] font-extrabold mt-1">{s.label}</div>
                    </button>
                  ))}
                </div>

                {form.shape === 'CUSTOM_SHAPE' && (
                  <input value={form.customShapeDesc} onChange={(e) => setForm({ ...form, customShapeDesc: e.target.value })} placeholder="Describe custom shape..." className="h-11 w-full rounded-xl border-2 border-fuchsia-300 bg-fuchsia-50 dark:bg-fuchsia-950/30 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
                )}

                {['NUMBER', 'LETTER'].includes(form.shape) && (
                  <input value={form.numberOrLetter} onChange={(e) => setForm({ ...form, numberOrLetter: e.target.value })} placeholder={form.shape === 'NUMBER' ? 'Which number? (e.g. 25)' : 'Which letter? (e.g. A)'} className="h-11 w-full rounded-xl border-2 border-fuchsia-300 bg-fuchsia-50 dark:bg-fuchsia-950/30 px-3 text-lg font-extrabold text-center focus:outline-none focus:border-fuchsia-500" />
                )}

                {['TIER_2', 'TIER_3', 'TIER_4', 'TIER_5'].includes(form.shape) && (
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 p-3">
                    <div className="text-xs font-extrabold text-amber-900 mb-2">🏛️ Multi-Tier Cake</div>
                    <input type="number" min="2" max="10" value={form.numberOfTiers} onChange={(e) => setForm({ ...form, numberOfTiers: e.target.value })} placeholder="Number of tiers" className="h-11 w-full rounded-lg border-2 border-amber-300 bg-white dark:bg-amber-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
                  </div>
                )}
              </section>
            </>
          )}

          {/* STEP 3: Flavor & Cream */}
          {step === 3 && (
            <>
              <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-pink-200 dark:border-pink-800 shadow-sm p-5 space-y-4">
                <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                  <Palette className="h-5 w-5 text-pink-600" />
                  Choose Flavor
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {FLAVORS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setForm({ ...form, flavor: f.value })}
                      className={
                        'relative p-3 rounded-xl border-2 text-center transition overflow-hidden ' +
                        (form.flavor === f.value ? 'border-pink-500 shadow-lg ring-2 ring-pink-200 scale-105' : 'border-slate-200 dark:border-neutral-700 hover:border-pink-300')
                      }
                    >
                      <div className={'absolute inset-0 bg-gradient-to-br ' + f.color + ' opacity-30'} />
                      <div className="relative">
                        <div className="text-2xl">{f.emoji}</div>
                        <div className="text-[10px] font-extrabold mt-1 text-slate-900 dark:text-white">{f.label}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {form.flavor === 'CUSTOM_FLAVOR' && (
                  <input value={form.customFlavorDesc} onChange={(e) => setForm({ ...form, customFlavorDesc: e.target.value })} placeholder="Describe custom flavor..." className="h-11 w-full rounded-xl border-2 border-pink-300 bg-pink-50 dark:bg-pink-950/30 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
                )}
              </section>

              <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-pink-200 dark:border-pink-800 shadow-sm p-5 space-y-4">
                <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                  <Palette className="h-5 w-5 text-fuchsia-600" />
                  Cream Type
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CREAMS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setForm({ ...form, creamType: c.value })}
                      className={
                        'p-3 rounded-xl border-2 text-center transition ' +
                        (form.creamType === c.value ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-fuchsia-300')
                      }
                    >
                      <div className="text-2xl">{c.emoji}</div>
                      <div className="text-[10px] font-extrabold mt-1">{c.label}</div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Dietary */}
              <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-200 dark:border-emerald-800 shadow-sm p-5 space-y-3">
                <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                  <Heart className="h-5 w-5 text-emerald-600" />
                  Dietary Preferences
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <label className={
                    'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition ' +
                    (form.isEggless ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'border-slate-200 dark:border-neutral-700')
                  }>
                    <input type="checkbox" checked={form.isEggless} onChange={(e) => setForm({ ...form, isEggless: e.target.checked })} className="h-4 w-4 rounded" />
                    <span className="text-sm font-extrabold">🥚 Eggless</span>
                  </label>
                  <label className={
                    'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition ' +
                    (form.isSugarFree ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'border-slate-200 dark:border-neutral-700')
                  }>
                    <input type="checkbox" checked={form.isSugarFree} onChange={(e) => setForm({ ...form, isSugarFree: e.target.checked })} className="h-4 w-4 rounded" />
                    <span className="text-sm font-extrabold">🍬 Sugar-free</span>
                  </label>
                  <label className={
                    'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition ' +
                    (form.isVegan ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'border-slate-200 dark:border-neutral-700')
                  }>
                    <input type="checkbox" checked={form.isVegan} onChange={(e) => setForm({ ...form, isVegan: e.target.checked })} className="h-4 w-4 rounded" />
                    <span className="text-sm font-extrabold">🌱 Vegan</span>
                  </label>
                </div>
                <textarea rows={2} value={form.dietaryNotes} onChange={(e) => setForm({ ...form, dietaryNotes: e.target.value })} placeholder="Any allergies or dietary notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />
              </section>
            </>
          )}

          {/* STEP 4: Personalization */}
          {step === 4 && (
            <>
              <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-pink-200 dark:border-pink-800 shadow-sm p-5 space-y-4">
                <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                  <Type className="h-5 w-5 text-pink-600" />
                  Message on Cake
                </h3>
                <input value={form.messageOnCake} onChange={(e) => setForm({ ...form, messageOnCake: e.target.value })} placeholder="Happy Birthday Ali!" maxLength={100} className="h-14 w-full rounded-xl border-2 border-pink-300 bg-pink-50 dark:bg-pink-950/30 px-4 text-xl font-extrabold focus:outline-none focus:border-pink-500" />
                <div className="text-[10px] text-slate-500 text-right">{form.messageOnCake.length}/100 characters</div>
                <input value={form.messageColor} onChange={(e) => setForm({ ...form, messageColor: e.target.value })} placeholder="Message color (White, Gold, Red...)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
              </section>

              <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-fuchsia-200 dark:border-fuchsia-800 shadow-sm p-5 space-y-4">
                <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                  <Camera className="h-5 w-5 text-fuchsia-600" />
                  Photo Cake
                </h3>
                <label className={
                  'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ' +
                  (form.hasPhotoOnCake ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40' : 'border-slate-200 dark:border-neutral-700')
                }>
                  <input type="checkbox" checked={form.hasPhotoOnCake} onChange={(e) => setForm({ ...form, hasPhotoOnCake: e.target.checked })} className="h-5 w-5 rounded" />
                  <Camera className="h-5 w-5 text-fuchsia-600" />
                  <div className="flex-1">
                    <div className="text-sm font-extrabold">Add photo on cake</div>
                    <div className="text-xs text-slate-500 font-semibold">Edible print on top of cake</div>
                  </div>
                </label>

                {form.hasPhotoOnCake && (
                  <div className="pl-8 space-y-3">
                    {form.photoUrl ? (
                      <div className="relative w-40 h-40 rounded-xl overflow-hidden border-2 border-fuchsia-300">
                        <img src={form.photoUrl} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setForm({ ...form, photoUrl: '' })} className="absolute top-1 right-1 h-6 w-6 rounded bg-rose-600 text-white flex items-center justify-center">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <UploadDropzone onUploaded={(records) => {
                        const first = Array.isArray(records) ? records[0] : records;
                        const url = typeof first === 'string' ? first : (first as any)?.url;
                        if (url) setForm({ ...form, photoUrl: url });
                      }} />
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.hasEdibleImage} onChange={(e) => setForm({ ...form, hasEdibleImage: e.target.checked })} className="h-4 w-4 rounded" />
                      <span className="text-sm font-bold">✨ Use edible image printing (premium)</span>
                    </label>
                  </div>
                )}
              </section>

              <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-violet-200 dark:border-violet-800 shadow-sm p-5 space-y-4">
                <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                  <Palette className="h-5 w-5 text-violet-600" />
                  Design & Theme
                </h3>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Design Reference Photos</label>
                  {form.designReferenceUrls.length > 0 && (
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      {form.designReferenceUrls.map((url: string, i: number) => (
                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => setForm({ ...form, designReferenceUrls: form.designReferenceUrls.filter((_: any, idx: number) => idx !== i) })} className="absolute top-0 right-0 h-5 w-5 rounded-bl bg-rose-600 text-white flex items-center justify-center">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <UploadDropzone onUploaded={(records) => {
                    const urls = Array.isArray(records) ? records.map((r: any) => r.url || r).filter(Boolean) : [(records as any)?.url || records];
                    setForm({ ...form, designReferenceUrls: [...form.designReferenceUrls, ...urls] });
                  }} />
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <input value={form.colorTheme} onChange={(e) => setForm({ ...form, colorTheme: e.target.value })} placeholder="Theme (Frozen, Cars...)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
                  <input value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} placeholder="Primary color" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
                  <input value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} placeholder="Secondary color" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
                </div>

                <textarea rows={3} value={form.designInstructions} onChange={(e) => setForm({ ...form, designInstructions: e.target.value })} placeholder="Specific design instructions..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />
              </section>

              <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-amber-200 dark:border-amber-800 shadow-sm p-5 space-y-3">
                <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-amber-600" />
                  Extras
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Candles Required</label>
                    <input type="number" min="0" value={form.candlesRequired} onChange={(e) => setForm({ ...form, candlesRequired: e.target.value })} placeholder="0" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Candle Type</label>
                    <input value={form.candleType} onChange={(e) => setForm({ ...form, candleType: e.target.value })} placeholder="Number candles, sparklers..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className={
                    'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' +
                    (form.cakeStand ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'border-slate-200 dark:border-neutral-700')
                  }>
                    <input type="checkbox" checked={form.cakeStand} onChange={(e) => setForm({ ...form, cakeStand: e.target.checked })} className="h-4 w-4 rounded" />
                    <span className="text-sm font-extrabold">🎂 Cake Stand</span>
                  </label>
                  <label className={
                    'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' +
                    (form.cakeKnife ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'border-slate-200 dark:border-neutral-700')
                  }>
                    <input type="checkbox" checked={form.cakeKnife} onChange={(e) => setForm({ ...form, cakeKnife: e.target.checked })} className="h-4 w-4 rounded" />
                    <span className="text-sm font-extrabold">🔪 Cake Knife</span>
                  </label>
                </div>
              </section>
            </>
          )}

          {/* STEP 5: Occasion */}
          {step === 5 && (
            <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-fuchsia-200 dark:border-fuchsia-800 shadow-sm p-5 space-y-4">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-fuchsia-600" />
                Occasion & Event
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {OCCASIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setForm({ ...form, occasion: o.value })}
                    className={
                      'p-3 rounded-xl border-2 text-center transition ' +
                      (form.occasion === o.value ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40 shadow ring-2 ring-fuchsia-100' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-fuchsia-300')
                    }
                  >
                    <div className="text-2xl">{o.emoji}</div>
                    <div className="text-[10px] font-extrabold mt-1">{o.label}</div>
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Celebrant Name</label>
                  <input value={form.celebrantName} onChange={(e) => setForm({ ...form, celebrantName: e.target.value })} placeholder="Who is this for?" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Age (if birthday)</label>
                  <input type="number" value={form.celebrantAge} onChange={(e) => setForm({ ...form, celebrantAge: e.target.value })} placeholder="25" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-fuchsia-500" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Event Date</label>
                  <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Event Time</label>
                  <input type="time" value={form.eventTime} onChange={(e) => setForm({ ...form, eventTime: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
                </div>
              </div>

              <input value={form.eventVenue} onChange={(e) => setForm({ ...form, eventVenue: e.target.value })} placeholder="Event venue (optional)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
            </section>
          )}

          {/* STEP 6: Delivery */}
          {step === 6 && (
            <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-blue-200 dark:border-blue-800 shadow-sm p-5 space-y-4">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                <Truck className="h-5 w-5 text-blue-600" />
                Delivery Details
              </h3>

              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Delivery Type *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DELIVERY_TYPES.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setForm({ ...form, deliveryType: d.value })}
                      className={
                        'p-3 rounded-xl border-2 text-center transition ' +
                        (form.deliveryType === d.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-blue-300')
                      }
                    >
                      <div className="text-2xl mb-1">{d.emoji}</div>
                      <div className="text-[10px] font-extrabold">{d.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Needed By *</label>
                  <input type="datetime-local" value={form.neededBy} onChange={(e) => setForm({ ...form, neededBy: e.target.value })} className="h-11 w-full rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-3 text-sm font-extrabold focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Preferred Time</label>
                  <input type="time" value={form.deliveryTime} onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              {form.deliveryType !== 'SELF_PICKUP' && (
                <>
                  <div>
                    <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Delivery Address *</label>
                    <textarea rows={3} value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} placeholder="Full delivery address..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input value={form.deliveryLandmark} onChange={(e) => setForm({ ...form, deliveryLandmark: e.target.value })} placeholder="Landmark" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                    <input type="number" value={form.deliveryCharges} onChange={(e) => setForm({ ...form, deliveryCharges: e.target.value })} placeholder="Delivery charges" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
                  </div>
                </>
              )}
            </section>
          )}

          {/* STEP 7: Review */}
          {step === 7 && (
            <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-200 dark:border-emerald-800 shadow-sm p-5 space-y-4">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                <Check className="h-5 w-5 text-emerald-600" />
                Review & Confirm
              </h3>

              <div className="rounded-2xl bg-gradient-to-br from-pink-50 via-white to-fuchsia-50 dark:from-pink-950/30 dark:to-fuchsia-950/30 border-2 border-pink-200 p-5 space-y-3">
                <div className="text-center">
                  <div className="text-5xl mb-2">{selectedOccasion?.emoji} {selectedFlavor?.emoji}</div>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {selectedOccasion?.label} Cake for {form.celebrantName || form.customerName}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-500 font-semibold">Size:</span> <span className="font-extrabold">{selectedSize?.emoji} {selectedSize?.label}</span></div>
                  <div><span className="text-slate-500 font-semibold">Shape:</span> <span className="font-extrabold">{selectedShape?.emoji} {selectedShape?.label}</span></div>
                  <div><span className="text-slate-500 font-semibold">Flavor:</span> <span className="font-extrabold">{selectedFlavor?.emoji} {selectedFlavor?.label}</span></div>
                  <div><span className="text-slate-500 font-semibold">Cream:</span> <span className="font-extrabold">{selectedCream?.emoji} {selectedCream?.label}</span></div>
                </div>
                {form.messageOnCake && (
                  <div className="rounded-xl bg-white dark:bg-neutral-800 border-2 border-pink-300 p-3 text-center">
                    <div className="text-[10px] uppercase font-extrabold text-pink-700">Message</div>
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white">"{form.messageOnCake}"</div>
                  </div>
                )}
                {(form.isEggless || form.isSugarFree || form.isVegan) && (
                  <div className="flex flex-wrap gap-1 justify-center">
                    {form.isEggless && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-extrabold">🥚 Eggless</span>}
                    {form.isSugarFree && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-extrabold">🍬 Sugar-free</span>}
                    {form.isVegan && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-extrabold">🌱 Vegan</span>}
                  </div>
                )}
              </div>

              {/* Pricing */}
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-3">
                <div className="text-sm font-extrabold text-emerald-900 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Base Price *</label>
                    <input type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Customization</label>
                    <input type="number" value={form.customizationCharges} onChange={(e) => setForm({ ...form, customizationCharges: e.target.value })} className="h-14 w-full rounded-xl border-2 border-slate-200 bg-white dark:bg-neutral-800 px-3 text-xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-extrabold text-fuchsia-700 mb-1 block">Photo Cake</label>
                    <input type="number" value={form.photoCakeCharges} onChange={(e) => setForm({ ...form, photoCakeCharges: e.target.value })} className="h-14 w-full rounded-xl border-2 border-fuchsia-200 bg-white dark:bg-neutral-800 px-3 text-xl font-extrabold tabular-nums focus:outline-none focus:border-fuchsia-500" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Tax</label>
                    <input type="number" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-extrabold text-rose-700 mb-1 block">Discount</label>
                    <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="h-11 w-full rounded-xl border-2 border-rose-200 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Advance Paid</label>
                    <input type="number" value={form.advancePaid} onChange={(e) => setForm({ ...form, advancePaid: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-200 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
                  </div>
                </div>
              </div>

              <textarea rows={3} value={form.specialInstructions} onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })} placeholder="Any special instructions..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />
            </section>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="secondary" className="flex-1" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            )}
            {step < 7 ? (
              <Button
                className="flex-1 bg-gradient-to-r from-pink-600 to-fuchsia-700"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700"
                onClick={() => createMutation.mutate()}
                loading={createMutation.isPending}
                disabled={!form.basePrice}
                size="lg"
              >
                <Save className="h-5 w-5" />
                Create Cake Order
              </Button>
            )}
          </div>
        </div>

        {/* Sticky sidebar preview */}
        <aside>
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-pink-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3">🎂 Live Preview</div>

              <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4 text-center space-y-2">
                <div className="text-6xl">{selectedFlavor?.emoji || '🎂'}</div>
                <div className="text-lg font-extrabold">{selectedOccasion?.emoji} {selectedOccasion?.label || 'Cake'}</div>
                <div className="flex flex-wrap gap-1 justify-center">
                  <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-extrabold">{selectedSize?.label}</span>
                  <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-extrabold">{selectedShape?.label}</span>
                </div>
                {form.messageOnCake && (
                  <div className="text-xs italic mt-2">"{form.messageOnCake}"</div>
                )}
                {form.customerName && (
                  <div className="text-xs font-bold text-white/80 mt-2">For: {form.customerName}</div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-white/20 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Base</span><span className="font-bold tabular-nums">{formatPKR(Number(form.basePrice) || 0)}</span></div>
                {Number(form.customizationCharges) > 0 && (
                  <div className="flex justify-between"><span className="text-white/70">Customization</span><span className="font-bold tabular-nums">+{formatPKR(Number(form.customizationCharges))}</span></div>
                )}
                {Number(form.photoCakeCharges) > 0 && (
                  <div className="flex justify-between text-fuchsia-300"><span>Photo Cake</span><span className="font-bold tabular-nums">+{formatPKR(Number(form.photoCakeCharges))}</span></div>
                )}
                {Number(form.deliveryCharges) > 0 && (
                  <div className="flex justify-between text-blue-300"><span>Delivery</span><span className="font-bold tabular-nums">+{formatPKR(Number(form.deliveryCharges))}</span></div>
                )}
                {Number(form.taxAmount) > 0 && (
                  <div className="flex justify-between"><span className="text-white/70">Tax</span><span className="font-bold tabular-nums">+{formatPKR(Number(form.taxAmount))}</span></div>
                )}
                {Number(form.discount) > 0 && (
                  <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(Number(form.discount))}</span></div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
              </div>

              {Number(form.advancePaid) > 0 && (
                <div className="mt-2 rounded-lg bg-emerald-500/20 border border-emerald-400/30 p-2 text-center text-xs">
                  <div className="font-extrabold">Advance: {formatPKR(Number(form.advancePaid))}</div>
                  <div className="text-emerald-200">Balance: {formatPKR(Math.max(total - Number(form.advancePaid), 0))}</div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
