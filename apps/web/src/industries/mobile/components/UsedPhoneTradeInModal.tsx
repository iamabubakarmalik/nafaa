import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, Smartphone, Sparkles, Calculator, CheckCircle2, AlertCircle,
  User, Camera, Star, RefreshCw, GraduationCap, ArrowRight,
  ScanLine, Trash2, TrendingUp, Info, Shield, Package,
  AlertOctagon, Loader2, DollarSign,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import {
  usedPhonesApi,
  type UsedPhoneCondition,
  type TradeInSource,
  type CreateUsedPhonePayload,
  CONDITION_LABELS,
  CONDITION_COLORS,
} from '../api/used-phones.api';
import {
  PTA_STATUS_LABELS,
  PTA_STATUS_COLORS,
  type PtaStatus,
} from '../api/imei.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';

/* ═════════════════════════════════════════════════════════════
   NAFAA USED PHONE TRADE-IN MODAL — FULL BEST v2
   ─────────────────────────────────────────────────────────────
   📷 IMEI Scanner (camera) — with early permission
   🎓 Teacher — har step pe guide
   ⌨️ Keyboard: Ctrl+↵ next, Ctrl+S save, Esc close
   💡 Live insights: margin %, ROI warnings
   🌙 Dark mode + 📱 Bottom-sheet on mobile
   🎯 Top brands chips + condition multipliers
   ✅ Backend duplicate check (no client-side query)
   ═════════════════════════════════════════════════════════════ */

interface Props {
  onSuccess?: (usedPhoneId: string) => void;
  onClose: () => void;
}

const CONDITIONS: UsedPhoneCondition[] = ['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR'];
const PTA_OPTIONS: PtaStatus[] = ['APPROVED', 'NON_PTA', 'PATCH', 'PENDING', 'EXEMPT'];

const TOP_BRANDS = [
  { name: 'Apple', emoji: '🍎' },
  { name: 'Samsung', emoji: '📱' },
  { name: 'Xiaomi', emoji: '🔶' },
  { name: 'Oppo', emoji: '🟢' },
  { name: 'Vivo', emoji: '🔵' },
  { name: 'Infinix', emoji: '🟠' },
  { name: 'Tecno', emoji: '🟣' },
  { name: 'Realme', emoji: '🟡' },
];

const CONDITION_MULTIPLIERS: Record<UsedPhoneCondition, number> = {
  EXCELLENT: 0.85,
  VERY_GOOD: 0.75,
  GOOD: 0.65,
  FAIR: 0.50,
  POOR: 0.35,
};

const CONDITION_EMOJIS: Record<UsedPhoneCondition, string> = {
  EXCELLENT: '✨',
  VERY_GOOD: '⭐',
  GOOD: '👍',
  FAIR: '👌',
  POOR: '⚠️',
};

const CONDITION_HINTS: Record<UsedPhoneCondition, string> = {
  EXCELLENT: 'Bilkul naya jaisa — koi khraash nahi',
  VERY_GOOD: 'Light use — chhoti khraash chalegi',
  GOOD: 'Normal use — kuch minor scratches',
  FAIR: 'Kaafi use hua — visible scratches, dents',
  POOR: 'Bahut khraab — cracked screen ya major issues',
};

export function UsedPhoneTradeInModal({ onSuccess, onClose }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'imei1' | 'imei2'>('imei1');
  const [showTeacher, setShowTeacher] = useState(false);
  const imei1Ref = useRef<HTMLInputElement>(null);

  // Step 1: Device Info
  const [imei1, setImei1] = useState('');
  const [imei2, setImei2] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [storage, setStorage] = useState('');
  const [ram, setRam] = useState('');
  const [color, setColor] = useState('');
  const [modelYear, setModelYear] = useState('');
  const [ptaStatus, setPtaStatus] = useState<PtaStatus>('PENDING');
  const [ptaTaxPaid, setPtaTaxPaid] = useState('');

  // Step 2: Condition + Accessories
  const [condition, setCondition] = useState<UsedPhoneCondition>('GOOD');
  const [conditionNotes, setConditionNotes] = useState('');
  const [hasOriginalBox, setHasOriginalBox] = useState(false);
  const [hasOriginalCharger, setHasOriginalCharger] = useState(false);
  const [hasOriginalCable, setHasOriginalCable] = useState(false);
  const [hasOriginalEarphones, setHasOriginalEarphones] = useState(false);
  const [hasOriginalReceipt, setHasOriginalReceipt] = useState(false);
  const [hasWarrantyLeft, setHasWarrantyLeft] = useState(false);
  const [batteryHealth, setBatteryHealth] = useState('');

  // Step 3: Pricing + Customer
  const [source, setSource] = useState<TradeInSource>('CASH_BUYBACK');
  const [referencePrice, setReferencePrice] = useState('');
  const [buybackPrice, setBuybackPrice] = useState('');
  const [resalePrice, setResalePrice] = useState('');
  const [refurbishCost, setRefurbishCost] = useState('');
  const [fromCustomerId, setFromCustomerId] = useState('');
  const [fromCustomerName, setFromCustomerName] = useState('');
  const [fromCustomerPhone, setFromCustomerPhone] = useState('');
  const [fromCustomerCnic, setFromCustomerCnic] = useState('');
  const [notes, setNotes] = useState('');

  /* ─── Data fetching ────────────────────────────────── */
  const { data: customersData } = useQuery({
    queryKey: ['customers-for-tradein'],
    queryFn: () => customersApi.list({ page: 1, limit: 200 }),
  });

  /* ─── Auto-focus IMEI 1 on open ────────────────────── */
  useEffect(() => {
    setTimeout(() => imei1Ref.current?.focus(), 100);
  }, []);

  /* ─── Auto-valuation ───────────────────────────────── */
  const valuationMutation = useMutation({
    mutationFn: usedPhonesApi.estimate,
    onSuccess: (data) => {
      setBuybackPrice(String(data.suggestedBuyback));
      if (!resalePrice) {
        setResalePrice(String(Math.round(data.suggestedBuyback * 1.15)));
      }
      toast.success(`💡 Suggested: ${formatPKR(data.suggestedBuyback)}`);
    },
    onError: () => toast.error('Valuation fail hua'),
  });

  const triggerEstimate = () => {
    const ref = Number(referencePrice) || 0;
    if (ref <= 0) {
      toast.error('Pehle Reference Price daalein (naye phone ki market price)');
      return;
    }
    valuationMutation.mutate({
      referencePrice: ref,
      condition,
      modelYear: modelYear ? Number(modelYear) : undefined,
      hasOriginalBox,
      hasOriginalCharger,
      hasOriginalReceipt,
      hasWarrantyLeft,
      batteryHealth: batteryHealth ? Number(batteryHealth) : undefined,
    });
  };

  /* ─── Live calculations ────────────────────────────── */
  const totalCost = useMemo(
    () => (Number(buybackPrice) || 0) + (Number(refurbishCost) || 0),
    [buybackPrice, refurbishCost],
  );

  const expectedProfit = useMemo(
    () => (Number(resalePrice) || 0) - totalCost,
    [resalePrice, totalCost],
  );

  const marginPct = useMemo(
    () => totalCost > 0 ? (expectedProfit / totalCost) * 100 : 0,
    [expectedProfit, totalCost],
  );

  const conditionMultiplier = CONDITION_MULTIPLIERS[condition];
  const conditionSuggestedBuyback = referencePrice
    ? Math.round(Number(referencePrice) * conditionMultiplier)
    : 0;

  /* ─── Validation ───────────────────────────────────── */
  const step1Errors = useMemo(() => {
    const e: string[] = [];
    if (imei1.length !== 15) e.push('IMEI 1 = 15 digits');
    if (!brand.trim()) e.push('Brand');
    if (!model.trim()) e.push('Model');
    return e;
  }, [imei1, brand, model]);

  const step3Errors = useMemo(() => {
    const e: string[] = [];
    if (!buybackPrice || Number(buybackPrice) <= 0) e.push('Buyback price');
    return e;
  }, [buybackPrice]);

  const canGoNext = step === 1 ? step1Errors.length === 0
    : step === 2 ? true
    : step3Errors.length === 0;

  /* ─── Submit ───────────────────────────────────────── */
  const createMutation = useMutation({
    mutationFn: usedPhonesApi.create,
    onSuccess: (phone) => {
      toast.success(`✅ ${phone.usedPhoneCode} — trade-in add ho gaya!`);
      queryClient.invalidateQueries({ queryKey: ['used-phones'] });
      queryClient.invalidateQueries({ queryKey: ['used-phones-stats'] });
      onSuccess?.(phone.id);
      onClose();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || 'Fail hua';
      // If backend rejects duplicate IMEI, jump to step 1
      if (/imei/i.test(msg) && /exist|duplicate/i.test(msg)) {
        setStep(1);
        toast.error('⚠️ Ye IMEI already register hai');
      } else {
        toast.error(msg);
      }
    },
  });

  const handleSubmit = () => {
    if (imei1.length !== 15) { toast.error('IMEI 1 zaroori — 15 digits'); setStep(1); return; }
    if (!brand.trim() || !model.trim()) { toast.error('Brand aur Model zaroori'); setStep(1); return; }
    if (!buybackPrice || Number(buybackPrice) <= 0) { toast.error('Buyback price zaroori'); setStep(3); return; }

    const payload: CreateUsedPhonePayload = {
      imei1,
      imei2: imei2 || undefined,
      brand: brand.trim(),
      model: model.trim(),
      storage: storage.trim() || undefined,
      ram: ram.trim() || undefined,
      color: color.trim() || undefined,
      modelYear: modelYear ? Number(modelYear) : undefined,
      ptaStatus,
      ptaTaxPaid: Number(ptaTaxPaid) || 0,
      condition,
      conditionNotes: conditionNotes.trim() || undefined,
      hasOriginalBox,
      hasOriginalCharger,
      hasOriginalCable,
      hasOriginalEarphones,
      hasOriginalReceipt,
      hasWarrantyLeft,
      source,
      buybackPrice: Number(buybackPrice),
      estimatedValue: Number(referencePrice) || 0,
      refurbishCost: Number(refurbishCost) || 0,
      resalePrice: Number(resalePrice) || 0,
      fromCustomerId: fromCustomerId || undefined,
      fromCustomerName: fromCustomerName.trim() || undefined,
      fromCustomerPhone: fromCustomerPhone.trim() || undefined,
      fromCustomerCnic: fromCustomerCnic.trim() || undefined,
      notes: notes.trim() || undefined,
      status: 'PENDING_INSPECTION',
    };
    createMutation.mutate(payload);
  };

  /* ─── Reset form ───────────────────────────────────── */
  const resetForm = () => {
    if (!confirm('Form clear kar dein? Sari values chali jayengi.')) return;
    setImei1(''); setImei2(''); setBrand(''); setModel('');
    setStorage(''); setRam(''); setColor(''); setModelYear('');
    setPtaStatus('PENDING'); setPtaTaxPaid('');
    setCondition('GOOD'); setConditionNotes(''); setBatteryHealth('');
    setHasOriginalBox(false); setHasOriginalCharger(false); setHasOriginalCable(false);
    setHasOriginalEarphones(false); setHasOriginalReceipt(false); setHasWarrantyLeft(false);
    setSource('CASH_BUYBACK'); setReferencePrice(''); setBuybackPrice('');
    setResalePrice(''); setRefurbishCost('');
    setFromCustomerId(''); setFromCustomerName(''); setFromCustomerPhone(''); setFromCustomerCnic('');
    setNotes(''); setStep(1);
    setTimeout(() => imei1Ref.current?.focus(), 100);
    toast.success('Form reset ho gaya');
  };

  /* ─── Keyboard shortcuts ───────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showScanner) return; // scanner handles own Esc
        if (showTeacher) { setShowTeacher(false); return; }
        onClose();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (step === 3 && canGoNext && !createMutation.isPending) handleSubmit();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (step < 3 && canGoNext) setStep((s) => (s + 1) as 1 | 2 | 3);
        else if (step === 3 && canGoNext) handleSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, canGoNext, showScanner, showTeacher, createMutation.isPending]);

  /* ─── Handle scanner result ────────────────────────── */
  const handleScanResult = (code: string) => {
    const digits = code.replace(/\D/g, '').slice(0, 15);
    if (digits.length !== 15) {
      toast.error(`Scanned code ${digits.length} digits — IMEI 15 chahiye`);
      setShowScanner(false);
      return;
    }
    if (scannerTarget === 'imei1') setImei1(digits);
    else setImei2(digits);
    setShowScanner(false);
    toast.success(`✓ IMEI ${scannerTarget === 'imei1' ? '1' : '2'} scan ho gaya`);
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full sm:max-w-4xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
          {/* ═══ HEADER ═══ */}
          <div className="px-5 py-4 border-b-2 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-500/15 dark:to-fuchsia-500/15 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/40">
                <RefreshCw className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-violet-700 dark:text-violet-300 font-extrabold">
                  Used Phone Trade-In
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                  {imei1.length === 15 && brand ? `${brand} ${model || '...'}` : 'Naya Trade-In Entry'}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setShowTeacher(true)}
                className="h-9 px-2.5 rounded-xl bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-extrabold inline-flex items-center gap-1 border-2 border-amber-300 dark:border-amber-500/40 transition"
                title="Kaise bharun?"
              >
                <GraduationCap className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Guide</span>
              </button>
              <button
                onClick={resetForm}
                className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-300 flex items-center justify-center transition"
                title="Form clear"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onClose}
                className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center transition"
              >
                <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          </div>

          {/* ═══ STEP INDICATOR ═══ */}
          <div className="px-5 py-3 border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2 shrink-0">
            {[
              { n: 1, label: 'Device Info', icon: Smartphone },
              { n: 2, label: 'Condition', icon: Star },
              { n: 3, label: 'Pricing & Customer', icon: DollarSign },
            ].map((s) => {
              const Icon = s.icon;
              const active = step === s.n;
              const done = step > s.n;
              return (
                <button
                  key={s.n}
                  onClick={() => setStep(s.n as 1 | 2 | 3)}
                  className={`flex-1 h-11 rounded-xl font-extrabold text-xs transition border-2 ${
                    active
                      ? 'bg-violet-600 text-white border-violet-700 shadow-md shadow-violet-500/30'
                      : done
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{s.n}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ═══ CONTENT ═══ */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50/30 dark:bg-slate-900/50">
            {/* ─── STEP 1: DEVICE INFO ─── */}
            {step === 1 && (
              <div className="space-y-4">
                {/* IMEI Row */}
                <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 flex items-center justify-center">
                      <ScanLine className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">IMEI Number</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        Phone dial pad me *#06# dabaao — ya scanner use karo
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        IMEI 1 * (15 digits)
                      </label>
                      <div className="relative">
                        <input
                          ref={imei1Ref}
                          value={imei1}
                          onChange={(e) => setImei1(e.target.value.replace(/\D/g, '').slice(0, 15))}
                          placeholder="354895112345678"
                          maxLength={15}
                          className={`h-12 w-full rounded-xl border-2 pl-3 pr-11 text-sm font-mono font-bold focus:outline-none transition ${
                            imei1.length === 15
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-slate-900 dark:text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-violet-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => { setScannerTarget('imei1'); setShowScanner(true); }}
                          title="Scan IMEI (camera)"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow-md shadow-violet-500/40 transition"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      </div>
                      {imei1.length > 0 && imei1.length !== 15 && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {imei1.length}/15 digits
                        </div>
                      )}
                      {imei1.length === 15 && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          IMEI valid — 15 digits complete
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        IMEI 2 <span className="text-slate-400 dark:text-slate-500 normal-case font-semibold">(Dual SIM)</span>
                      </label>
                      <div className="relative">
                        <input
                          value={imei2}
                          onChange={(e) => setImei2(e.target.value.replace(/\D/g, '').slice(0, 15))}
                          placeholder="Optional"
                          maxLength={15}
                          className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 pl-3 pr-11 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                        />
                        <button
                          type="button"
                          onClick={() => { setScannerTarget('imei2'); setShowScanner(true); }}
                          title="Scan IMEI 2"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-violet-600 hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center transition"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Brand — quick chips */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    Brand * <span className="text-slate-400 dark:text-slate-500 normal-case font-semibold">— select ya likho</span>
                  </label>
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {TOP_BRANDS.map((b) => (
                      <button
                        key={b.name}
                        type="button"
                        onClick={() => setBrand(b.name)}
                        className={`px-3 h-9 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 border-2 transition ${
                          brand === b.name
                            ? 'bg-violet-600 text-white border-violet-700 shadow-md'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-violet-400'
                        }`}
                      >
                        <span>{b.emoji}</span> {b.name}
                      </button>
                    ))}
                  </div>
                  <input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Ya custom brand likho..."
                    className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                  />
                </div>

                {/* Model */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Model *
                  </label>
                  <input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="iPhone 13 Pro, Galaxy S22, Redmi Note 12..."
                    className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                  />
                </div>

                {/* Storage / RAM / Color / Year */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <InputCompact label="Storage" value={storage} onChange={setStorage} placeholder="128GB" />
                  <InputCompact label="RAM" value={ram} onChange={setRam} placeholder="6GB" />
                  <InputCompact label="Color" value={color} onChange={setColor} placeholder="Black" />
                  <InputCompact label="Year" value={modelYear} onChange={setModelYear} placeholder="2022" type="number" />
                </div>

                {/* PTA Status */}
                <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">PTA Status</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        Pakistan me lazmi — non-approved phone mushkil se bikta hai
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {PTA_OPTIONS.map((s) => {
                      const colors = PTA_STATUS_COLORS[s];
                      const active = ptaStatus === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setPtaStatus(s)}
                          className={`px-2 py-2 rounded-lg text-[10px] font-extrabold border-2 transition ${
                            active
                              ? `${colors.bg} ${colors.text} ${colors.border} shadow-md scale-105`
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {PTA_STATUS_LABELS[s]}
                        </button>
                      );
                    })}
                  </div>
                  {(ptaStatus === 'APPROVED' || ptaStatus === 'PATCH') && (
                    <div className="mt-3">
                      <InputCompact
                        label="PTA Tax Paid (PKR)"
                        value={ptaTaxPaid}
                        onChange={setPtaTaxPaid}
                        placeholder="0"
                        type="number"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── STEP 2: CONDITION ─── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                        <Star className="h-4 w-4 fill-current" />
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                          Condition Rating *
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                          Honestly mark karo — resale price isi pe hai
                        </div>
                      </div>
                    </div>
                    {referencePrice && (
                      <div className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums bg-emerald-50 dark:bg-emerald-500/15 px-2 py-1 rounded-lg">
                        💡 ~{formatPKR(conditionSuggestedBuyback)} suggested
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {CONDITIONS.map((c) => {
                      const colors = CONDITION_COLORS[c];
                      const active = condition === c;
                      const mult = CONDITION_MULTIPLIERS[c];
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCondition(c)}
                          className={`p-3 rounded-xl border-2 transition ${
                            active
                              ? `${colors.bg} ${colors.text} ${colors.border} shadow-lg scale-105`
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400'
                          }`}
                        >
                          <div className="text-2xl mb-1">{CONDITION_EMOJIS[c]}</div>
                          <div className="text-[10px] font-extrabold">{CONDITION_LABELS[c]}</div>
                          <div className={`text-[9px] font-bold mt-0.5 ${active ? 'opacity-90' : 'opacity-60'}`}>
                            {(mult * 100).toFixed(0)}%
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 rounded-lg bg-slate-100 dark:bg-slate-900 p-2.5 text-xs text-slate-700 dark:text-slate-200 font-semibold flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                    {CONDITION_HINTS[condition]}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Condition Notes
                    </label>
                    <textarea
                      rows={2}
                      value={conditionNotes}
                      onChange={(e) => setConditionNotes(e.target.value)}
                      placeholder="Light scratch left side, screen protector already lagaya hua..."
                      className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Battery Health % <span className="text-slate-400 dark:text-slate-500 normal-case font-semibold">(agar pata ho)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={batteryHealth}
                        onChange={(e) => setBatteryHealth(e.target.value)}
                        placeholder="85"
                        className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 pl-3 pr-8 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-500 dark:text-slate-400">%</span>
                    </div>
                    {batteryHealth && Number(batteryHealth) < 80 && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Battery kaafi kam hai — resale price adjust karo
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">Accessories</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        Original items = zyada resale value
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { key: 'box', label: 'Original Box', emoji: '📦', val: hasOriginalBox, set: setHasOriginalBox },
                      { key: 'charger', label: 'Charger', emoji: '🔌', val: hasOriginalCharger, set: setHasOriginalCharger },
                      { key: 'cable', label: 'Cable', emoji: '🔗', val: hasOriginalCable, set: setHasOriginalCable },
                      { key: 'earphones', label: 'Earphones', emoji: '🎧', val: hasOriginalEarphones, set: setHasOriginalEarphones },
                      { key: 'receipt', label: 'Receipt', emoji: '🧾', val: hasOriginalReceipt, set: setHasOriginalReceipt },
                      { key: 'warranty', label: 'Warranty', emoji: '🛡️', val: hasWarrantyLeft, set: setHasWarrantyLeft },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition ${
                          item.val
                            ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-400 dark:border-emerald-500/50 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.val}
                          onChange={(e) => item.set(e.target.checked)}
                          className="h-4 w-4 rounded accent-emerald-600"
                        />
                        <span className="text-lg">{item.emoji}</span>
                        <span className={`text-xs font-extrabold ${item.val ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 3: PRICING + CUSTOMER ─── */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    Trade-In Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { val: 'CASH_BUYBACK', label: 'Cash Buyback', emoji: '💵', desc: 'Cash de kar khareedo' },
                      { val: 'EXCHANGE', label: 'Exchange', emoji: '🔄', desc: 'Naye phone ke sath swap' },
                      { val: 'CONSIGNMENT', label: 'Consignment', emoji: '🤝', desc: 'Bikne pe paise do' },
                    ] as { val: TradeInSource; label: string; emoji: string; desc: string }[]).map((s) => (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => setSource(s.val)}
                        className={`p-2.5 rounded-xl border-2 text-xs font-extrabold transition text-left ${
                          source === s.val
                            ? 'bg-violet-50 dark:bg-violet-500/15 border-violet-400 dark:border-violet-500/50 text-violet-800 dark:text-violet-300 shadow-md'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <div className="text-lg mb-0.5">{s.emoji}</div>
                        <div>{s.label}</div>
                        <div className="text-[9px] font-semibold opacity-70 mt-0.5">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-500/15 dark:to-fuchsia-500/15 border-2 border-violet-200 dark:border-violet-500/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center shadow-md">
                      <Calculator className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-violet-900 dark:text-violet-200 text-sm">
                        🧠 Auto-Valuation Helper
                      </div>
                      <div className="text-[10px] text-violet-700 dark:text-violet-300 font-semibold">
                        Naye phone ki market price daalo → AI suggest karega
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <input
                      type="number"
                      value={referencePrice}
                      onChange={(e) => setReferencePrice(e.target.value)}
                      placeholder="Naye phone ki market price (e.g. 150000)"
                      className="h-11 flex-1 min-w-[180px] rounded-xl border-2 border-violet-300 dark:border-violet-500/40 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                    />
                    <button
                      onClick={triggerEstimate}
                      disabled={valuationMutation.isPending}
                      className="h-11 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-xs font-extrabold shadow-lg shadow-violet-500/40 disabled:opacity-50 inline-flex items-center gap-1.5 transition"
                    >
                      {valuationMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Estimate
                    </button>
                  </div>
                  {valuationMutation.data && (
                    <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-violet-200 dark:border-violet-500/40">
                      <div className="text-sm font-extrabold flex items-center gap-2 flex-wrap">
                        <span className="text-violet-800 dark:text-violet-200">💡 Suggested:</span>
                        <span className="text-emerald-700 dark:text-emerald-400 text-lg tabular-nums">
                          {formatPKR(valuationMutation.data.suggestedBuyback)}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                          ({(valuationMutation.data.multiplier * 100).toFixed(0)}% of market)
                        </span>
                      </div>
                      {valuationMutation.data.reasoning?.length > 0 && (
                        <div className="mt-1.5 text-[10px] text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                          {valuationMutation.data.reasoning.join(' · ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <PricingInput label="Buyback Price *" hint="Customer ko diye" value={buybackPrice} onChange={setBuybackPrice} tone="emerald" required />
                  <PricingInput label="Refurbish Cost" hint="Repair ka kharcha" value={refurbishCost} onChange={setRefurbishCost} tone="amber" />
                  <PricingInput label="Expected Resale" hint="Naye customer ko" value={resalePrice} onChange={setResalePrice} tone="blue" />
                </div>

                {(buybackPrice || resalePrice) && (
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-emerald-500/10 dark:via-slate-900/60 dark:to-blue-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-4">
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <ProfitStat label="Total Cost" value={formatPKR(totalCost)} tone="slate" />
                      <ProfitStat label="Resale" value={formatPKR(Number(resalePrice) || 0)} tone="blue" />
                      <ProfitStat label="Profit" value={formatPKR(expectedProfit)} tone={expectedProfit >= 0 ? 'emerald' : 'rose'} big />
                      <ProfitStat label="Margin" value={`${marginPct.toFixed(1)}%`} tone={marginPct >= 15 ? 'emerald' : marginPct >= 5 ? 'amber' : 'rose'} />
                    </div>
                    {expectedProfit < 0 && (
                      <div className="mt-3 rounded-xl bg-rose-100 dark:bg-rose-500/15 border-2 border-rose-300 dark:border-rose-500/40 p-2.5 text-xs font-extrabold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                        <AlertOctagon className="h-4 w-4 shrink-0" />
                        ⚠️ Loss! Buyback price zyada hai resale se
                      </div>
                    )}
                    {marginPct >= 0 && marginPct < 5 && expectedProfit >= 0 && (
                      <div className="mt-3 rounded-xl bg-amber-100 dark:bg-amber-500/15 border-2 border-amber-300 dark:border-amber-500/40 p-2.5 text-xs font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        Margin bahut kam ({marginPct.toFixed(1)}%) — thora resale price barhao
                      </div>
                    )}
                    {marginPct >= 15 && (
                      <div className="mt-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 border-2 border-emerald-300 dark:border-emerald-500/40 p-2.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 shrink-0" />
                        ✨ Achha margin — profitable deal!
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                        Customer <span className="text-slate-400 dark:text-slate-500 font-semibold">(jinse phone khareeda)</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        CNIC record rakho — chori ke phone se bachne ke liye
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Existing Customer
                    </label>
                    <select
                      value={fromCustomerId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setFromCustomerId(id);
                        if (id) {
                          const c = customersData?.items.find((c: any) => c.id === id);
                          if (c) {
                            setFromCustomerName(c.name);
                            setFromCustomerPhone(c.phone || '');
                            setFromCustomerCnic(c.cnic || '');
                          }
                        }
                      }}
                      className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                    >
                      <option value="">— Walk-in (neeche details bharo) —</option>
                      {customersData?.items.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `• ${c.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <InputCompact label="Name" value={fromCustomerName} onChange={setFromCustomerName} placeholder="Customer name" />
                    <InputCompact label="Phone" value={fromCustomerPhone} onChange={setFromCustomerPhone} placeholder="03XXXXXXXXX" />
                    <InputCompact
                      label="CNIC (13 digits)"
                      value={fromCustomerCnic}
                      onChange={(v) => setFromCustomerCnic(v.replace(/\D/g, '').slice(0, 13))}
                      placeholder="XXXXXXXXXXXXX"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Internal Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional info, deal terms, kya customer ne kuch bataya..."
                    className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ═══ FOOTER ═══ */}
          <div className="px-4 sm:px-5 py-3 border-t-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <span className="hidden md:inline-flex items-center gap-1">
                  <Kbd>Ctrl</Kbd>+<Kbd>↵</Kbd> next
                </span>
                <span className="hidden md:inline-flex items-center gap-1">
                  <Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save
                </span>
                <span className="hidden md:inline-flex items-center gap-1">
                  <Kbd>Esc</Kbd> close
                </span>
              </div>
              <div className="flex gap-2 ml-auto">
                {step > 1 && (
                  <Button variant="secondary" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
                    ← Back
                  </Button>
                )}
                {step < 3 ? (
                  <Button
                    onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                    disabled={!canGoNext}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 font-extrabold shadow-lg shadow-violet-500/30"
                  >
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    loading={createMutation.isPending}
                    disabled={!canGoNext}
                    className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 font-extrabold shadow-lg shadow-emerald-500/40"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Save Trade-In
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BARCODE / IMEI SCANNER ═══ */}
      {showScanner && (
        <BarcodeScanner
          onDetected={handleScanResult}
          onClose={() => setShowScanner(false)}
          title={`Scan IMEI ${scannerTarget === 'imei1' ? '1' : '2'}`}
          hint="Phone ke pichay ka IMEI sticker ya box ka barcode camera ke samne rakhein"
        />
      )}

      {/* ═══ TEACHER MODAL ═══ */}
      {showTeacher && <TradeInFormTeacher step={step} onClose={() => setShowTeacher(false)} />}
    </>
  );
}

/* ═════════════════════════════════════════════════════════════
   TEACHER MODAL
   ═════════════════════════════════════════════════════════════ */
function TradeInFormTeacher({ step, onClose }: { step: 1 | 2 | 3; onClose: () => void }) {
  const CONTENT = {
    1: {
      title: 'Step 1: Device Info',
      emoji: '📱',
      color: 'from-violet-500 to-fuchsia-600',
      tips: [
        { emoji: '📷', text: '**IMEI Scan**: Camera icon click karo → phone ka IMEI sticker ya box ka barcode scan karo. Ya manual likho.' },
        { emoji: '📞', text: '**IMEI kaise pata karein?** Phone dial pad me `*#06#` type karo — screen pe aa jayega' },
        { emoji: '🛡️', text: '**PTA Status important hai!** Non-approved phones ki resale mushkil hoti hai. Approved > Patch > Non-PTA' },
        { emoji: '⚠️', text: '**Duplicate check**: Server automatically check karega — agar IMEI already system me hai to error aayegi' },
      ],
    },
    2: {
      title: 'Step 2: Condition Rating',
      emoji: '⭐',
      color: 'from-amber-500 to-orange-600',
      tips: [
        { emoji: '✨', text: '**Excellent (85%)**: Bilkul naya jaisa — koi khraash ya dent nahi, box+charger sath' },
        { emoji: '⭐', text: '**Very Good (75%)**: Light use, chhoti khraash chalegi, sab kuch working' },
        { emoji: '👍', text: '**Good (65%)**: Normal daily use, kuch minor scratches, well maintained' },
        { emoji: '👌', text: '**Fair (50%)**: Kaafi use hua, visible scratches ya dents, working fine' },
        { emoji: '⚠️', text: '**Poor (35%)**: Cracked screen, battery issue, ya major cosmetic damage' },
        { emoji: '📦', text: '**Accessories**: Original box, charger, cable — sab check karo. Zyada items = zyada resale value' },
      ],
    },
    3: {
      title: 'Step 3: Pricing & Customer',
      emoji: '💰',
      color: 'from-emerald-500 to-teal-600',
      tips: [
        { emoji: '🧠', text: '**Auto-Valuation**: Naye phone ki market price daalo → AI condition ke hisab se suggest karega' },
        { emoji: '💵', text: '**Buyback Price**: Customer ko diye. Kam se kam market price ka 65% (Good condition)' },
        { emoji: '🔧', text: '**Refurbish Cost**: Battery change, screen repair ka kharcha — realistic estimate lagao' },
        { emoji: '💰', text: '**Resale Price**: Naye customer ko becho ge. Cost + 15% margin minimum rakho' },
        { emoji: '🆔', text: '**Customer CNIC lazmi**: Chori ke phones se bachne ke liye — record rakho' },
        { emoji: '⚠️', text: '**Margin warnings**: <5% = kam profit, >15% = achha deal' },
      ],
    },
  };

  const c = CONTENT[step];

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-5 py-4 bg-gradient-to-br ${c.color} text-white flex items-center justify-between sticky top-0 z-10`}>
          <div className="flex items-center gap-2">
            <div className="text-2xl">{c.emoji}</div>
            <div>
              <div className="text-[10px] uppercase tracking-widest font-extrabold opacity-80">Guide</div>
              <h3 className="font-extrabold">{c.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-2.5">
          {c.tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3">
              <span className="text-xl shrink-0">{tip.emoji}</span>
              <div
                className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: tip.text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-900 dark:text-white">$1</strong>') }}
              />
            </div>
          ))}

          <Button
            className={`w-full mt-3 bg-gradient-to-r ${c.color} font-extrabold shadow-lg h-11`}
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function InputCompact({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
      />
    </div>
  );
}

function PricingInput({
  label, hint, value, onChange, tone, required,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  tone: 'emerald' | 'amber' | 'blue';
  required?: boolean;
}) {
  const tones = {
    emerald: 'border-emerald-400 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10 focus:border-emerald-600 text-emerald-900 dark:text-emerald-200',
    amber: 'border-amber-400 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/10 focus:border-amber-600 text-amber-900 dark:text-amber-200',
    blue: 'border-blue-400 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-500/10 focus:border-blue-600 text-blue-900 dark:text-blue-200',
  };
  const labelTones = {
    emerald: 'text-emerald-700 dark:text-emerald-400',
    amber: 'text-amber-700 dark:text-amber-400',
    blue: 'text-blue-700 dark:text-blue-400',
  };
  return (
    <div>
      <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-1 ${labelTones[tone]}`}>
        {label} {required && <span>*</span>}
      </label>
      <div className="relative">
        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-extrabold ${labelTones[tone]}`}>Rs</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className={`h-12 w-full rounded-xl border-2 pl-9 pr-3 text-base font-extrabold tabular-nums focus:outline-none transition ${tones[tone]}`}
        />
      </div>
      <div className={`text-[9px] font-bold mt-0.5 ${labelTones[tone]} opacity-70`}>{hint}</div>
    </div>
  );
}

function ProfitStat({
  label, value, tone, big,
}: {
  label: string;
  value: string;
  tone: 'slate' | 'blue' | 'emerald' | 'rose' | 'amber';
  big?: boolean;
}) {
  const tones = {
    slate: 'text-slate-700 dark:text-slate-300',
    blue: 'text-blue-700 dark:text-blue-400',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    rose: 'text-rose-700 dark:text-rose-400',
    amber: 'text-amber-700 dark:text-amber-400',
  };
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`font-extrabold tabular-nums ${tones[tone]} ${big ? 'text-lg' : 'text-sm'} mt-0.5`}>
        {value}
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-mono font-bold text-[9px]">
      {children}
    </kbd>
  );
}
