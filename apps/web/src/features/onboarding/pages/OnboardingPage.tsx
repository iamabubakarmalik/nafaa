import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Store, User, MapPin, Settings, Package, Users, Check, ArrowRight,
  ArrowLeft, Sparkles, X, Plus, Trash2, Clock, Phone, SkipForward, Crown,
  Search,
} from 'lucide-react';
import { onboardingApi } from '@/api/onboarding.api';
import { useAuthStore } from '@/store/auth.store';
import {
  BusinessTypeSelector,
  BUSINESS_TYPES,
  type BusinessTypeCard,
} from '../components/BusinessTypeSelector';

const stepMeta = [
  { num: 1, title: 'Business Type', icon: Store, color: 'emerald' },
  { num: 2, title: 'Your Profile', icon: User, color: 'blue' },
  { num: 3, title: 'Shop Details', icon: MapPin, color: 'violet' },
  { num: 4, title: 'Preferences', icon: Settings, color: 'pink' },
  { num: 5, title: 'First Products', icon: Package, color: 'amber' },
  { num: 6, title: 'Team & Done', icon: Users, color: 'rose' },
];

const colorMap: Record<string, { bg: string; text: string; ring: string; border: string; gradFrom: string; gradTo: string }> = {
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-700', ring: 'ring-emerald-500', border: 'border-emerald-500', gradFrom: 'from-emerald-500', gradTo: 'to-emerald-700' },
  blue:    { bg: 'bg-blue-600',    text: 'text-blue-700',    ring: 'ring-blue-500',    border: 'border-blue-500',    gradFrom: 'from-blue-500',    gradTo: 'to-blue-700' },
  violet:  { bg: 'bg-violet-600',  text: 'text-violet-700',  ring: 'ring-violet-500',  border: 'border-violet-500',  gradFrom: 'from-violet-500',  gradTo: 'to-violet-700' },
  pink:    { bg: 'bg-pink-600',    text: 'text-pink-700',    ring: 'ring-pink-500',    border: 'border-pink-500',    gradFrom: 'from-pink-500',    gradTo: 'to-pink-700' },
  amber:   { bg: 'bg-amber-500',   text: 'text-amber-700',   ring: 'ring-amber-500',   border: 'border-amber-500',   gradFrom: 'from-amber-500',   gradTo: 'to-amber-700' },
  rose:    { bg: 'bg-rose-600',    text: 'text-rose-700',    ring: 'ring-rose-500',    border: 'border-rose-500',    gradFrom: 'from-rose-500',    gradTo: 'to-rose-700' },
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateTenant = useAuthStore((s) => s.updateTenant);

  const { data: options } = useQuery({ queryKey: ['onboarding-options'], queryFn: onboardingApi.getOptions });
  const { data: progress, isLoading } = useQuery({ queryKey: ['onboarding'], queryFn: onboardingApi.get });

  const [step, setStep] = useState(1);

  useEffect(() => {
    if (progress?.isCompleted) navigate('/dashboard', { replace: true });
    else if (progress) setStep(progress.currentStep);
  }, [progress, navigate]);

  const [s1, setS1] = useState({ businessType: '', businessSize: 'SMALL', city: '', province: '' });
  const [s2, setS2] = useState({ whatsappNumber: '', cnic: '', preferredLanguage: 'roman_ur' });
  const [s3, setS3] = useState({ shopAddress: '', openTime: '09:00', closeTime: '22:00', workingDays: ['mon','tue','wed','thu','fri','sat'], taxNumber: '' });
  const [s4, setS4] = useState({ enabledCategories: [] as string[], paymentMethods: ['CASH'], receiptTemplate: 'THERMAL_58MM', lowStockThreshold: 10 });
  const [s5Products, setS5Products] = useState<Array<{ name: string; price: string; stock: string }>>([]);
  const [s6Team, setS6Team] = useState<Array<{ fullName: string; email: string; password: string; role: 'MANAGER' | 'CASHIER' | 'STAFF' }>>([]);
  const [wantsTutorial, setWantsTutorial] = useState(true);

  // City search
  const [citySearch, setCitySearch] = useState('');

  useEffect(() => {
    if (!progress) return;
    setS1({
      businessType: progress.businessType || '',
      businessSize: progress.businessSize || 'SMALL',
      city: progress.city || '',
      province: progress.province || '',
    });
    setS2({
      whatsappNumber: progress.whatsappNumber || '',
      cnic: progress.cnic || '',
      preferredLanguage: progress.preferredLanguage || 'roman_ur',
    });
    setS3({
      shopAddress: progress.shopAddress || '',
      openTime: progress.openTime || '09:00',
      closeTime: progress.closeTime || '22:00',
      workingDays: progress.workingDays?.length ? progress.workingDays : ['mon','tue','wed','thu','fri','sat'],
      taxNumber: progress.taxNumber || '',
    });
    setS4({
      enabledCategories: progress.enabledCategories || [],
      paymentMethods: progress.paymentMethods?.length ? progress.paymentMethods : ['CASH'],
      receiptTemplate: progress.receiptTemplate || 'THERMAL_58MM',
      lowStockThreshold: progress.lowStockThreshold ?? 10,
    });
  }, [progress]);

  const meta = stepMeta[step - 1];
  const colors = colorMap[meta.color];

  // Filter cities by search
  const filteredCities = useMemo(() => {
    if (!options?.cities) return [];
    const q = citySearch.toLowerCase().trim();
    if (!q) return options.cities.slice(0, 12);
    return options.cities.filter((c: string) => c.toLowerCase().includes(q));
  }, [options, citySearch]);

  // Get business type options from API (with fallback)
  const businessTypeOptions = useMemo(() => {
    if (!options?.businessTypes) return BUSINESS_TYPES;
    // API returns expanded list with highlights
    if (options.businessTypes[0]?.highlights) {
      return options.businessTypes as BusinessTypeCard[];
    }
    return BUSINESS_TYPES;
  }, [options]);

  // Suggested categories based on selected business type
  const suggestedCategories = useMemo(() => {
    const type = s1.businessType || progress?.businessType || 'GENERAL';
    return options?.suggestedCategories?.[type] || options?.suggestedCategories?.OTHER || [];
  }, [s1.businessType, progress, options]);

  const stepMutation = useMutation({
    mutationFn: async () => {
      if (step === 1) {
        const result = await onboardingApi.step1(s1);
        // Auto-update tenant in store so other pages see new businessType
        updateTenant({ businessType: s1.businessType });
        // Invalidate business config cache
        queryClient.invalidateQueries({ queryKey: ['business-config'] });
        return result;
      }
      if (step === 2) return onboardingApi.step2(s2);
      if (step === 3) return onboardingApi.step3(s3);
      if (step === 4) return onboardingApi.step4(s4);
      if (step === 5) {
        const products = s5Products
          .filter((p) => p.name && Number(p.price) > 0)
          .map((p) => ({ name: p.name, price: Number(p.price), stock: Number(p.stock) || 0 }));
        return onboardingApi.step5({ products });
      }
      return onboardingApi.step6({
        teamMembers: s6Team.filter((m) => m.email && m.password),
        wantsTutorial,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      if (data.isCompleted) {
        toast.success('🎉 Mubarak ho! Aap ka shop ready hai!');
        setTimeout(() => navigate('/dashboard'), 800);
      } else {
        setStep(data.currentStep);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message?.[0] || e?.response?.data?.message || 'Save fail ho gaya');
    },
  });

  const skipMutation = useMutation({
    mutationFn: () => onboardingApi.skip(step),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      setStep(data.currentStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  const canProceed = useMemo(() => {
    if (step === 1) return !!s1.businessType && !!s1.businessSize && !!s1.city;
    if (step === 4) return s4.paymentMethods.length > 0;
    return true;
  }, [step, s1, s4]);

  if (isLoading || !options || !progress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-violet-50">
        <div className="text-center">
          <Sparkles className="h-12 w-12 text-violet-600 animate-pulse mx-auto" />
          <p className="mt-3 text-sm font-bold text-slate-600">Setting up your shop...</p>
        </div>
      </div>
    );
  }

  const Icon = meta.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 py-6 px-4">
      <div className="w-full max-w-5xl mx-auto">
        {/* Top header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="h-11 w-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 shadow-sm transition"
              >
                <ArrowLeft className="h-5 w-5 text-slate-700" />
              </button>
            ) : (
              <div className="h-11 w-11" />
            )}
            <div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Step {step} of {stepMeta.length}
              </div>
              <div className="text-xl font-extrabold text-slate-900">{meta.title}</div>
            </div>
          </div>
          <button
            onClick={() => {
              if (confirm('Setup ko abhi skip karein? Aap baad mein settings se complete kar sakte hain.')) {
                navigate('/dashboard');
              }
            }}
            className="h-11 w-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 shadow-sm transition"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-3xl p-4 mb-5 border border-slate-200 shadow-sm">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors.bg} transition-all duration-500 rounded-full`}
              style={{ width: `${(step / stepMeta.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-3">
            {stepMeta.map((m) => {
              const done = progress.completedSteps.includes(m.num);
              const current = m.num === step;
              const StepIcon = m.icon;
              return (
                <div key={m.num} className="flex flex-col items-center gap-1">
                  <div
                    className={`h-10 w-10 rounded-2xl flex items-center justify-center border-2 transition shadow-sm ${
                      done
                        ? `${colorMap[m.color].bg} ${colorMap[m.color].border} text-white`
                        : current
                        ? `bg-white ${colorMap[m.color].border} ${colorMap[m.color].text} ring-4 ring-${m.color}-100`
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 hidden sm:block text-center max-w-[80px] leading-tight">
                    {m.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hero card */}
        <div
          className={`rounded-3xl bg-gradient-to-br ${colors.gradFrom} ${colors.gradTo} text-white p-6 mb-5 shadow-2xl flex items-center gap-4`}
        >
          <div className="h-16 w-16 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
            <Icon className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider text-white/80">
              Step {step}
            </div>
            <div className="text-2xl font-extrabold">{meta.title}</div>
            <p className="text-sm text-white/80 mt-0.5">
              {step === 1 && 'Aap ka business kis tarah ka hai? Software auto-configure ho jayega'}
              {step === 2 && 'Aap ka WhatsApp aur preferred language'}
              {step === 3 && 'Shop address aur working hours'}
              {step === 4 && 'Categories aur payment methods'}
              {step === 5 && 'Apne pehle products quickly add karein'}
              {step === 6 && 'Team members add karein (optional)'}
            </p>
          </div>
        </div>

        {/* Content card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 mb-5 shadow-sm">
          {/* ===== STEP 1 — Business Type ===== */}
          {step === 1 && (
            <div className="space-y-6">
              <BusinessTypeSelector
                value={s1.businessType}
                options={businessTypeOptions}
                onChange={(t) => setS1({ ...s1, businessType: t.value })}
                onSelect={(t) => setS1({ ...s1, businessType: t.value })}
                showConfirmButton={false}
              />

              {/* Business Size */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-3 block">
                  Business ka size? <span className="text-rose-600">*</span>
                </label>
                <div className="grid sm:grid-cols-3 gap-3">
                  {(options.businessSizes || [
                    { value: 'SMALL', label: 'Small', desc: '1-2 staff', icon: '🏠' },
                    { value: 'MEDIUM', label: 'Medium', desc: '3-10 staff', icon: '🏢' },
                    { value: 'LARGE', label: 'Large', desc: '10+ staff', icon: '🏬' },
                  ]).map((bs: any) => {
                    const active = s1.businessSize === bs.value;
                    return (
                      <button
                        key={bs.value}
                        type="button"
                        onClick={() => setS1({ ...s1, businessSize: bs.value })}
                        className={`p-4 rounded-2xl border-2 text-left transition ${
                          active
                            ? `${colors.border} bg-emerald-50 shadow-md`
                            : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{bs.icon}</span>
                          <span className={`font-extrabold ${active ? colors.text : 'text-slate-900'}`}>
                            {bs.label}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">{bs.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* City — with search */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-3 block">
                  Shahar (City) <span className="text-rose-600">*</span>
                </label>
                <div className="relative mb-3">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    placeholder="Search city..."
                    className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto">
                  {filteredCities.map((city: string) => {
                    const active = s1.city === city;
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => setS1({ ...s1, city })}
                        className={`px-4 h-10 rounded-xl border-2 text-sm font-bold transition ${
                          active
                            ? `${colors.bg} ${colors.border} text-white shadow`
                            : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        {city}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Province */}
              <div>
                <label className="text-sm font-bold text-slate-700 mb-3 block">Province (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {options.provinces.map((p: string) => {
                    const active = s1.province === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setS1({ ...s1, province: active ? '' : p })}
                        className={`px-3 h-9 rounded-xl border-2 text-xs font-bold transition ${
                          active
                            ? `${colors.bg} ${colors.border} text-white shadow`
                            : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===== STEP 2 ===== */}
          {step === 2 && (
            <div className="space-y-5 max-w-2xl">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1.5 block">WhatsApp Number</label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 h-11">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    value={s2.whatsappNumber}
                    onChange={(e) => setS2({ ...s2, whatsappNumber: e.target.value })}
                    placeholder="+923001234567"
                    className="flex-1 bg-transparent outline-none text-sm"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Customers ko WhatsApp pe receipts bhejne ke liye</p>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-1.5 block">
                  CNIC <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  value={s2.cnic}
                  onChange={(e) => setS2({ ...s2, cnic: e.target.value })}
                  placeholder="42101-1234567-1"
                  maxLength={15}
                  className="w-full rounded-xl border border-slate-200 px-3 h-11 text-sm outline-none focus:border-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">Optional — sirf identity verification ke liye</p>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Preferred Language</label>
                <div className="grid grid-cols-3 gap-2">
                  {options.languages.map((lang: any) => {
                    const active = s2.preferredLanguage === lang.value;
                    return (
                      <button
                        key={lang.value}
                        type="button"
                        onClick={() => setS2({ ...s2, preferredLanguage: lang.value })}
                        className={`p-3 rounded-xl border-2 text-center transition ${
                          active ? `${colors.border} bg-blue-50 shadow-md` : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`font-extrabold text-lg ${active ? colors.text : 'text-slate-900'}`}>
                          {lang.label}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{lang.english}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===== STEP 3 ===== */}
          {step === 3 && (
            <div className="space-y-5 max-w-2xl">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1.5 block">Shop Address</label>
                <textarea
                  value={s3.shopAddress}
                  onChange={(e) => setS3({ ...s3, shopAddress: e.target.value })}
                  placeholder="Shop ka pura address likhein..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Working Hours</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Open</div>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 h-11">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <input
                        type="time"
                        value={s3.openTime}
                        onChange={(e) => setS3({ ...s3, openTime: e.target.value })}
                        className="flex-1 bg-transparent outline-none font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Close</div>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 h-11">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <input
                        type="time"
                        value={s3.closeTime}
                        onChange={(e) => setS3({ ...s3, closeTime: e.target.value })}
                        className="flex-1 bg-transparent outline-none font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Working Days</label>
                <div className="flex flex-wrap gap-2">
                  {options.workingDays.map((d: any) => {
                    const active = s3.workingDays.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() =>
                          setS3({
                            ...s3,
                            workingDays: active
                              ? s3.workingDays.filter((x: string) => x !== d.value)
                              : [...s3.workingDays, d.value],
                          })
                        }
                        className={`px-4 h-10 rounded-xl border-2 text-sm font-bold transition ${
                          active
                            ? `${colors.bg} ${colors.border} text-white shadow`
                            : 'border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-1.5 block">
                  GST / NTN <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  value={s3.taxNumber}
                  onChange={(e) => setS3({ ...s3, taxNumber: e.target.value })}
                  placeholder="e.g. 1234567-8"
                  className="w-full rounded-xl border border-slate-200 px-3 h-11 text-sm outline-none focus:border-violet-500"
                />
              </div>
            </div>
          )}

          {/* ===== STEP 4 ===== */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">Categories shuru karein</label>
                <p className="text-xs text-slate-500 mb-3">
                  ✨ Aap ke business ke liye auto-suggested. Click karke select karein.
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedCategories.map((cat: string) => {
                    const active = s4.enabledCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() =>
                          setS4({
                            ...s4,
                            enabledCategories: active
                              ? s4.enabledCategories.filter((x) => x !== cat)
                              : [...s4.enabledCategories, cat],
                          })
                        }
                        className={`px-3 h-10 rounded-xl border-2 text-xs font-bold transition ${
                          active
                            ? `${colors.bg} ${colors.border} text-white shadow`
                            : 'border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {active ? '✓ ' : ''}
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">
                  Payment Methods <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {options.paymentMethods.map((pm: any) => {
                    const active = s4.paymentMethods.includes(pm.value);
                    return (
                      <button
                        key={pm.value}
                        type="button"
                        onClick={() =>
                          setS4({
                            ...s4,
                            paymentMethods: active
                              ? s4.paymentMethods.filter((x) => x !== pm.value)
                              : [...s4.paymentMethods, pm.value],
                          })
                        }
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition ${
                          active ? `${colors.border} bg-pink-50 shadow-md` : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xl">{pm.emoji}</span>
                        <span className={`text-sm font-bold flex-1 text-left ${active ? colors.text : 'text-slate-700'}`}>
                          {pm.label}
                        </span>
                        {active && <Check className="h-4 w-4 text-pink-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Receipt Type</label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {options.receiptTemplates.map((rt: any) => {
                    const active = s4.receiptTemplate === rt.value;
                    return (
                      <button
                        key={rt.value}
                        type="button"
                        onClick={() => setS4({ ...s4, receiptTemplate: rt.value })}
                        className={`text-left p-3 rounded-xl border-2 transition ${
                          active ? `${colors.border} bg-pink-50 shadow-md` : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`font-extrabold ${active ? colors.text : 'text-slate-900'}`}>
                          {rt.label}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{rt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="max-w-xs">
                <label className="text-sm font-bold text-slate-700 mb-1.5 block">Low Stock Alert (units)</label>
                <input
                  type="number"
                  min={0}
                  value={s4.lowStockThreshold}
                  onChange={(e) => setS4({ ...s4, lowStockThreshold: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full rounded-xl border border-slate-200 px-3 h-11 text-sm font-bold outline-none focus:border-pink-500"
                />
              </div>
            </div>
          )}

          {/* ===== STEP 5 ===== */}
          {step === 5 && (
            <div className="space-y-4 max-w-2xl">
              <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed">
                  Apne pehle 2-3 products quickly add karein. Aap baad mein Products section se aur add kar sakte hain.
                  Skip bhi kar sakte hain.
                </p>
              </div>

              {s5Products.map((p, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 p-3 space-y-2 bg-slate-50/30">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center text-xs font-extrabold text-amber-700">
                      #{idx + 1}
                    </div>
                    <span className="flex-1 font-bold text-slate-700">Product {idx + 1}</span>
                    <button
                      onClick={() => setS5Products(s5Products.filter((_, i) => i !== idx))}
                      className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center hover:bg-rose-100"
                    >
                      <Trash2 className="h-3 w-3 text-rose-600" />
                    </button>
                  </div>
                  <input
                    value={p.name}
                    onChange={(e) => {
                      const next = [...s5Products];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setS5Products(next);
                    }}
                    placeholder="Product name (e.g. Sugar 1kg)"
                    className="w-full rounded-xl border border-slate-200 px-3 h-10 text-sm outline-none focus:border-amber-500 bg-white"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={p.price}
                      onChange={(e) => {
                        const next = [...s5Products];
                        next[idx] = { ...next[idx], price: e.target.value };
                        setS5Products(next);
                      }}
                      placeholder="Price"
                      className="flex-1 rounded-xl border border-slate-200 px-3 h-10 text-sm outline-none focus:border-amber-500 bg-white"
                    />
                    <input
                      type="number"
                      value={p.stock}
                      onChange={(e) => {
                        const next = [...s5Products];
                        next[idx] = { ...next[idx], stock: e.target.value };
                        setS5Products(next);
                      }}
                      placeholder="Stock"
                      className="flex-1 rounded-xl border border-slate-200 px-3 h-10 text-sm outline-none focus:border-amber-500 bg-white"
                    />
                  </div>
                </div>
              ))}

              <button
                onClick={() => setS5Products([...s5Products, { name: '', price: '', stock: '' }])}
                className="w-full rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-4 flex items-center justify-center gap-2 font-extrabold text-amber-700 hover:bg-amber-100 transition"
              >
                <Plus className="h-4 w-4" /> Add Product
              </button>
            </div>
          )}

          {/* ===== STEP 6 ===== */}
          {step === 6 && (
            <div className="space-y-4 max-w-2xl">
              <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-4 flex items-start gap-3">
                <Crown className="h-5 w-5 text-rose-700 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-rose-900 leading-relaxed">
                  Apne staff (cashier/manager) ko add karein taake wo bhi POS use kar saken. Skip kar sakte hain.
                </p>
              </div>

              {s6Team.map((m, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 p-3 space-y-2 bg-slate-50/30">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-rose-100 flex items-center justify-center text-xs font-extrabold text-rose-700">
                      #{idx + 1}
                    </div>
                    <span className="flex-1 font-bold text-slate-700">Member {idx + 1}</span>
                    <button
                      onClick={() => setS6Team(s6Team.filter((_, i) => i !== idx))}
                      className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center hover:bg-rose-100"
                    >
                      <Trash2 className="h-3 w-3 text-rose-600" />
                    </button>
                  </div>
                  <input
                    value={m.fullName}
                    onChange={(e) => {
                      const next = [...s6Team];
                      next[idx] = { ...next[idx], fullName: e.target.value };
                      setS6Team(next);
                    }}
                    placeholder="Full Name"
                    className="w-full rounded-xl border border-slate-200 px-3 h-10 text-sm outline-none focus:border-rose-500 bg-white"
                  />
                  <input
                    value={m.email}
                    onChange={(e) => {
                      const next = [...s6Team];
                      next[idx] = { ...next[idx], email: e.target.value };
                      setS6Team(next);
                    }}
                    placeholder="Email"
                    type="email"
                    className="w-full rounded-xl border border-slate-200 px-3 h-10 text-sm outline-none focus:border-rose-500 bg-white"
                  />
                  <input
                    value={m.password}
                    onChange={(e) => {
                      const next = [...s6Team];
                      next[idx] = { ...next[idx], password: e.target.value };
                      setS6Team(next);
                    }}
                    placeholder="Set password (min 8)"
                    type="password"
                    className="w-full rounded-xl border border-slate-200 px-3 h-10 text-sm outline-none focus:border-rose-500 bg-white"
                  />
                  <div className="flex gap-1.5">
                    {(['MANAGER', 'CASHIER', 'STAFF'] as const).map((r) => {
                      const active = m.role === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            const next = [...s6Team];
                            next[idx] = { ...next[idx], role: r };
                            setS6Team(next);
                          }}
                          className={`flex-1 h-9 rounded-lg border-2 text-xs font-bold transition ${
                            active
                              ? `${colors.bg} ${colors.border} text-white shadow`
                              : 'border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <button
                onClick={() =>
                  setS6Team([...s6Team, { fullName: '', email: '', password: '', role: 'CASHIER' }])
                }
                className="w-full rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50 p-4 flex items-center justify-center gap-2 font-extrabold text-rose-700 hover:bg-rose-100 transition"
              >
                <Plus className="h-4 w-4" /> Add Team Member
              </button>

              <div className="rounded-2xl border border-slate-200 p-4 flex items-center gap-3 bg-white">
                <div className="flex-1">
                  <div className="font-bold text-slate-900">Tutorial dekhna chahte hain?</div>
                  <div className="text-xs text-slate-500 mt-0.5">App use karne ki guidance</div>
                </div>
                <button
                  type="button"
                  onClick={() => setWantsTutorial(!wantsTutorial)}
                  className={`h-7 w-12 rounded-full p-0.5 transition ${
                    wantsTutorial ? colors.bg : 'bg-slate-300'
                  }`}
                >
                  <div
                    className="h-6 w-6 bg-white rounded-full transition shadow"
                    style={{ transform: `translateX(${wantsTutorial ? 20 : 0}px)` }}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="flex gap-2 sticky bottom-4">
          {(step === 5 || step === 6) && (
            <button
              onClick={() => skipMutation.mutate()}
              disabled={skipMutation.isPending}
              className="h-14 px-6 rounded-2xl border-2 border-slate-200 bg-white flex items-center justify-center gap-1.5 font-bold text-slate-700 hover:bg-slate-50 shadow-lg transition"
            >
              <SkipForward className="h-4 w-4" />
              Skip
            </button>
          )}
          <button
            onClick={() => stepMutation.mutate()}
            disabled={!canProceed || stepMutation.isPending}
            className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 font-extrabold text-white transition shadow-lg ${
              !canProceed || stepMutation.isPending
                ? 'bg-slate-400 cursor-not-allowed'
                : `${colors.bg} hover:opacity-90 hover:shadow-xl`
            }`}
          >
            {stepMutation.isPending ? 'Saving...' : step === 6 ? 'Finish Setup 🎉' : 'Continue'}
            {!stepMutation.isPending && step < 6 && <ArrowRight className="h-5 w-5" />}
            {!stepMutation.isPending && step === 6 && <Check className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
