import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Wrench, Smartphone, AlertCircle, User, CheckCircle2,
  ChevronRight, ChevronLeft, Calendar, DollarSign, Camera,
  Flag, AlertTriangle, Zap, Lock, GraduationCap, Trash2,
  ScanLine, Info, Loader2, Sparkles, Package,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import {
  repairsApi,
  type CreateRepairTicketPayload,
  type RepairPriority,
} from '../../api/repairs.api';
import { CustomerSearchInline } from './CustomerSearchInline';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';

/* ═════════════════════════════════════════════════════════════
   NAFAA CREATE REPAIR TICKET — FULL BEST v2
   ─────────────────────────────────────────────────────────────
   📷 IMEI Scanner (camera)
   🎓 Teacher — har step pe step-aware guide
   ⌨️ Keyboard: Ctrl+↵ next, Ctrl+S save, Esc close
   💡 Live insights: balance calc, ready date suggest
   🌙 Dark mode + 📱 Bottom-sheet on mobile
   🎯 Common issues quick-pick + top brands
   🗑️ Form reset button
   ═════════════════════════════════════════════════════════════ */

interface Props {
  onSuccess?: (ticketId: string) => void;
  onClose: () => void;
}

const PRIORITY_OPTIONS: {
  val: RepairPriority;
  label: string;
  urdu: string;
  emoji: string;
  icon: any;
  color: string;
  bg: string;
  text: string;
  border: string;
  desc: string;
}[] = [
  { val: 'NORMAL',    label: 'Normal',    urdu: 'Aam',              emoji: '🟢', icon: Flag,           color: 'slate',  bg: 'bg-slate-50 dark:bg-slate-800',   text: 'text-slate-700 dark:text-slate-300',   border: 'border-slate-300 dark:border-slate-600', desc: '2-5 din chalega' },
  { val: 'URGENT',    label: 'Urgent',    urdu: 'Jaldi',            emoji: '🟠', icon: AlertTriangle,  color: 'orange', bg: 'bg-orange-50 dark:bg-orange-500/15', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-500/40', desc: '24-48 hrs' },
  { val: 'EMERGENCY', label: 'Emergency', urdu: 'Bohat urgent',     emoji: '🔴', icon: Zap,            color: 'rose',   bg: 'bg-rose-50 dark:bg-rose-500/15',    text: 'text-rose-700 dark:text-rose-300',     border: 'border-rose-400 dark:border-rose-500/50',  desc: '2-6 hrs (extra charge)' },
];

const COMMON_BRANDS = [
  { name: 'Apple', emoji: '🍎' },
  { name: 'Samsung', emoji: '📱' },
  { name: 'Xiaomi', emoji: '🔶' },
  { name: 'Oppo', emoji: '🟢' },
  { name: 'Vivo', emoji: '🔵' },
  { name: 'Infinix', emoji: '🟠' },
  { name: 'Tecno', emoji: '🟣' },
  { name: 'Realme', emoji: '🟡' },
];

const ALL_BRANDS = [
  'Apple', 'Samsung', 'Oppo', 'Vivo', 'Xiaomi', 'Infinix', 'Tecno', 'Realme',
  'Huawei', 'OnePlus', 'Honor', 'Motorola', 'Nokia', 'Itel', 'QMobile', 'ZTE',
];

const COMMON_ISSUES = [
  { emoji: '📱', text: 'Screen broken / Display issue' },
  { emoji: '🔋', text: 'Battery not charging' },
  { emoji: '⚡', text: 'Battery drains fast' },
  { emoji: '🔊', text: 'Speaker not working' },
  { emoji: '🎤', text: 'Microphone not working' },
  { emoji: '📸', text: 'Camera not working' },
  { emoji: '🔌', text: 'Charging port damage' },
  { emoji: '💧', text: 'Water damage' },
  { emoji: '💻', text: 'Software / Hang issue' },
  { emoji: '🆔', text: 'IMEI issue' },
  { emoji: '📶', text: 'Network issue' },
  { emoji: '🎛️', text: 'Buttons not working' },
  { emoji: '👆', text: 'Face ID / Fingerprint issue' },
  { emoji: '🚫', text: 'Phone not turning on' },
];

export function CreateRepairTicketModal({ onSuccess, onClose }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'imei1' | 'imei2'>('imei1');
  const [showTeacher, setShowTeacher] = useState(false);
  const brandInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Device Info
  const [deviceBrand, setDeviceBrand] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceColor, setDeviceColor] = useState('');
  const [imei1, setImei1] = useState('');
  const [imei2, setImei2] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [passcode, setPasscode] = useState('');
  const [hasSimCard, setHasSimCard] = useState(false);
  const [hasMemoryCard, setHasMemoryCard] = useState(false);

  // Step 2: Issue & Priority
  const [reportedIssue, setReportedIssue] = useState('');
  const [priority, setPriority] = useState<RepairPriority>('NORMAL');
  const [estimatedReadyAt, setEstimatedReadyAt] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [warrantyDays, setWarrantyDays] = useState('7');

  // Step 3: Customer & Pricing
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCnic, setCustomerCnic] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [advancePaid, setAdvancePaid] = useState('');
  const [notes, setNotes] = useState('');

  /* ─── Auto-focus brand on open ─────────────────────── */
  useEffect(() => {
    setTimeout(() => brandInputRef.current?.focus(), 100);
  }, []);

  /* ─── Auto-suggest ready date based on priority ────── */
  useEffect(() => {
    if (estimatedReadyAt) return; // don't overwrite user's choice
    const now = new Date();
    if (priority === 'EMERGENCY') now.setHours(now.getHours() + 6);
    else if (priority === 'URGENT') now.setDate(now.getDate() + 1);
    else now.setDate(now.getDate() + 3);
    setEstimatedReadyAt(now.toISOString().slice(0, 16));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priority]);

  const balanceDue = useMemo(() => {
    const est = Number(estimatedCost) || 0;
    const adv = Number(advancePaid) || 0;
    return Math.max(est - adv, 0);
  }, [estimatedCost, advancePaid]);

  const advancePct = useMemo(() => {
    const est = Number(estimatedCost) || 0;
    const adv = Number(advancePaid) || 0;
    return est > 0 ? (adv / est) * 100 : 0;
  }, [estimatedCost, advancePaid]);

  /* ─── Validations ──────────────────────────────────── */
  const step1Valid = deviceBrand.trim() && deviceModel.trim() && (imei1.length === 0 || imei1.length === 15);
  const step2Valid = reportedIssue.trim().length >= 5;
  const step3Valid = customerName.trim() && customerPhone.trim();

  const canGoNext = step === 1 ? step1Valid : step === 2 ? step2Valid : step3Valid;

  const createMutation = useMutation({
    mutationFn: repairsApi.create,
    onSuccess: (ticket) => {
      toast.success(`✅ ${ticket.ticketNumber} — ticket ban gaya!`);
      queryClient.invalidateQueries({ queryKey: ['repair-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['repair-stats'] });
      onSuccess?.(ticket.id);
      onClose();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || 'Ticket create fail hua';
      toast.error(msg);
    },
  });

  const handleSubmit = () => {
    if (!step1Valid) { toast.error('Brand + Model + valid IMEI'); setStep(1); return; }
    if (!step2Valid) { toast.error('Issue description zaroori (min 5 chars)'); setStep(2); return; }
    if (!step3Valid) { toast.error('Customer name + phone zaroori'); setStep(3); return; }

    const payload: CreateRepairTicketPayload = {
      deviceBrand: deviceBrand.trim(),
      deviceModel: deviceModel.trim(),
      deviceColor: deviceColor.trim() || undefined,
      imei1: imei1.trim() || undefined,
      imei2: imei2.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
      passcode: passcode.trim() || undefined,
      hasSimCard,
      hasMemoryCard,
      reportedIssue: reportedIssue.trim(),
      priority,
      estimatedReadyAt: estimatedReadyAt || undefined,
      technicianName: technicianName.trim() || undefined,
      warrantyDays: Number(warrantyDays) || 7,
      customerId: customerId || undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerCnic: customerCnic.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      estimatedCost: Number(estimatedCost) || 0,
      advancePaid: Number(advancePaid) || 0,
      notes: notes.trim() || undefined,
    };

    createMutation.mutate(payload);
  };

  /* ─── Reset form ───────────────────────────────────── */
  const resetForm = () => {
    if (!confirm('Form clear kar dein? Sari values chali jayengi.')) return;
    setDeviceBrand(''); setDeviceModel(''); setDeviceColor('');
    setImei1(''); setImei2(''); setSerialNumber(''); setPasscode('');
    setHasSimCard(false); setHasMemoryCard(false);
    setReportedIssue(''); setPriority('NORMAL'); setEstimatedReadyAt('');
    setTechnicianName(''); setWarrantyDays('7');
    setCustomerId(''); setCustomerName(''); setCustomerPhone('');
    setCustomerCnic(''); setCustomerAddress('');
    setEstimatedCost(''); setAdvancePaid(''); setNotes('');
    setStep(1);
    setTimeout(() => brandInputRef.current?.focus(), 100);
    toast.success('Form reset ho gaya');
  };

  /* ─── Keyboard shortcuts ───────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showScanner) return;
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
      toast.error('Scanned code 15 digits ka nahi — dobara try karo');
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
          <div className="px-4 sm:px-5 py-4 border-b-2 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-500/15 dark:to-amber-500/15 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/40">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-orange-700 dark:text-orange-300 font-extrabold">
                  Repair Service
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                  {deviceBrand && deviceModel ? `${deviceBrand} ${deviceModel}` : 'Naya Repair Ticket'}
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
          <div className="px-4 sm:px-5 py-3 border-b-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2 shrink-0">
            {[
              { num: 1, label: 'Device Info', icon: Smartphone },
              { num: 2, label: 'Issue Details', icon: AlertCircle },
              { num: 3, label: 'Customer & Pricing', icon: User },
            ].map((s) => {
              const StepIcon = s.icon;
              const active = step === s.num;
              const done = step > s.num;
              return (
                <button
                  key={s.num}
                  onClick={() => setStep(s.num as 1 | 2 | 3)}
                  className={`flex-1 h-11 rounded-xl font-extrabold text-xs transition border-2 ${
                    active
                      ? 'bg-orange-600 text-white border-orange-700 shadow-md shadow-orange-500/30'
                      : done
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <StepIcon className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">Step {s.num}</span>
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
                {/* Brand — quick chips */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    Brand * <span className="text-slate-400 dark:text-slate-500 normal-case font-semibold">— chuno ya likho</span>
                  </label>
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {COMMON_BRANDS.map((b) => (
                      <button
                        key={b.name}
                        type="button"
                        onClick={() => setDeviceBrand(b.name)}
                        className={`px-3 h-9 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 border-2 transition ${
                          deviceBrand === b.name
                            ? 'bg-orange-600 text-white border-orange-700 shadow-md'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-orange-400'
                        }`}
                      >
                        <span>{b.emoji}</span> {b.name}
                      </button>
                    ))}
                  </div>
                  <input
                    ref={brandInputRef}
                    list="brands-list"
                    value={deviceBrand}
                    onChange={(e) => setDeviceBrand(e.target.value)}
                    placeholder="Ya custom brand likho..."
                    className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition"
                  />
                  <datalist id="brands-list">
                    {ALL_BRANDS.map((b) => <option key={b} value={b} />)}
                  </datalist>
                </div>

                {/* Model */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Model *
                  </label>
                  <input
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    placeholder="iPhone 12, Galaxy A52, Redmi Note 12..."
                    className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition"
                  />
                </div>

                {/* Color */}
                <div className="grid sm:grid-cols-3 gap-3">
                  <InputCompact label="Color" value={deviceColor} onChange={setDeviceColor} placeholder="Black, Blue..." />
                  <InputCompact label="Serial Number" value={serialNumber} onChange={(v) => setSerialNumber(v.slice(0, 30))} placeholder="Optional" mono />
                  <div />
                </div>

                {/* IMEI Row */}
                <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 flex items-center justify-center">
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
                        IMEI 1 <span className="text-slate-400 dark:text-slate-500 normal-case font-semibold">(15 digits)</span>
                      </label>
                      <div className="relative">
                        <input
                          value={imei1}
                          onChange={(e) => setImei1(e.target.value.replace(/\D/g, '').slice(0, 15))}
                          placeholder="354895112345678"
                          maxLength={15}
                          className={`h-12 w-full rounded-xl border-2 pl-3 pr-11 text-sm font-mono font-bold focus:outline-none transition ${
                            imei1.length === 15
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-slate-900 dark:text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-orange-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => { setScannerTarget('imei1'); setShowScanner(true); }}
                          title="Scan IMEI (camera)"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center shadow-md shadow-orange-500/40 transition"
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
                          Valid IMEI
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
                          className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 pl-3 pr-11 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition"
                        />
                        <button
                          type="button"
                          onClick={() => { setScannerTarget('imei2'); setShowScanner(true); }}
                          title="Scan IMEI 2"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-orange-600 hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center transition"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Passcode */}
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-amber-900 dark:text-amber-200 text-sm">Device Access</div>
                      <div className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                        Customer ki ijazat ke sath — testing ke liye zaroori
                      </div>
                    </div>
                  </div>
                  <input
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Passcode / pattern / face ID note"
                    className="h-11 w-full rounded-xl border-2 border-amber-300 dark:border-amber-500/40 bg-white dark:bg-slate-800 px-3 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
                  />
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold mt-1.5 flex items-start gap-1">
                    <Info className="h-3 w-3 shrink-0 mt-0.5" />
                    Securely stored — delivery ke baad delete ho jayega
                  </p>
                </div>

                {/* SIM / Memory */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition ${
                    hasSimCard
                      ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-400 dark:border-emerald-500/50'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={hasSimCard}
                      onChange={(e) => setHasSimCard(e.target.checked)}
                      className="h-4 w-4 rounded accent-emerald-600"
                    />
                    <span className="text-lg">📶</span>
                    <span className={`text-xs font-extrabold ${hasSimCard ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}>
                      SIM Card andar hai
                    </span>
                  </label>
                  <label className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition ${
                    hasMemoryCard
                      ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-400 dark:border-emerald-500/50'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}>
                    <input
                      type="checkbox"
                      checked={hasMemoryCard}
                      onChange={(e) => setHasMemoryCard(e.target.checked)}
                      className="h-4 w-4 rounded accent-emerald-600"
                    />
                    <span className="text-lg">💾</span>
                    <span className={`text-xs font-extrabold ${hasMemoryCard ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}>
                      Memory Card andar hai
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* ─── STEP 2: ISSUE & PRIORITY ─── */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Issue */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Reported Issue * <span className="text-slate-400 dark:text-slate-500 normal-case font-semibold">(kya kharab hai)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={reportedIssue}
                    onChange={(e) => setReportedIssue(e.target.value)}
                    placeholder="Screen crack hai upar side pe, touch bhi kaam nahi kar raha..."
                    className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition"
                  />
                  <div className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${
                    reportedIssue.length >= 5
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {reportedIssue.length >= 5 ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {reportedIssue.length} chars {reportedIssue.length < 5 && `(min 5)`}
                  </div>
                </div>

                {/* Quick-pick issues */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    Common Issues — quick add
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_ISSUES.map((issue) => (
                      <button
                        key={issue.text}
                        type="button"
                        onClick={() => {
                          const current = reportedIssue.trim();
                          const line = `${issue.emoji} ${issue.text}`;
                          const newVal = current ? `${current}\n• ${line}` : `• ${line}`;
                          setReportedIssue(newVal);
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-orange-500/15 text-slate-700 dark:text-slate-200 hover:text-orange-800 dark:hover:text-orange-300 hover:border-orange-300 dark:hover:border-orange-500/40 transition inline-flex items-center gap-1"
                      >
                        <span>{issue.emoji}</span> {issue.text}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    Priority
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRIORITY_OPTIONS.map((p) => {
                      const Icon = p.icon;
                      const active = priority === p.val;
                      return (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => setPriority(p.val)}
                          className={`p-3 rounded-xl border-2 transition text-center ${
                            active
                              ? `${p.bg} ${p.text} ${p.border} shadow-md scale-105`
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400'
                          }`}
                        >
                          <div className="text-xl mb-1">{p.emoji}</div>
                          <div className="text-xs font-extrabold">{p.label}</div>
                          <div className={`text-[9px] font-bold mt-0.5 ${active ? 'opacity-90' : 'opacity-60'}`}>
                            {p.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ready date + Technician + Warranty */}
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Est. Ready Date
                    </label>
                    <input
                      type="datetime-local"
                      value={estimatedReadyAt}
                      onChange={(e) => setEstimatedReadyAt(e.target.value)}
                      className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">
                      Auto-set by priority
                    </p>
                  </div>
                  <InputCompact label="Technician Name" value={technicianName} onChange={setTechnicianName} placeholder="Optional" />
                  <InputCompact label="Warranty (days)" value={warrantyDays} onChange={setWarrantyDays} placeholder="7" type="number" />
                </div>
              </div>
            )}

            {/* ─── STEP 3: CUSTOMER & PRICING ─── */}
            {step === 3 && (
              <div className="space-y-4">
                <CustomerSearchInline
                  customerId={customerId}
                  customerName={customerName}
                  customerPhone={customerPhone}
                  customerCnic={customerCnic}
                  customerAddress={customerAddress}
                  onCustomerSelect={(data) => {
                    setCustomerId(data.id);
                    setCustomerName(data.name);
                    setCustomerPhone(data.phone);
                    setCustomerCnic(data.cnic);
                    setCustomerAddress(data.address);
                  }}
                  onChangeName={setCustomerName}
                  onChangePhone={setCustomerPhone}
                  onChangeCnic={setCustomerCnic}
                  onChangeAddress={setCustomerAddress}
                />

                {/* Pricing */}
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border-2 border-emerald-200 dark:border-emerald-500/40 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-emerald-900 dark:text-emerald-200 text-sm">
                        Initial Estimate <span className="text-slate-400 dark:text-slate-500 font-semibold">(optional)</span>
                      </div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                        Advance ~20-30% recommended — customer serious hai
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <PricingInput
                      label="Estimated Cost (PKR)"
                      value={estimatedCost}
                      onChange={setEstimatedCost}
                      placeholder="5000"
                      tone="emerald"
                    />
                    <PricingInput
                      label="Advance Paid (PKR)"
                      value={advancePaid}
                      onChange={setAdvancePaid}
                      placeholder="0"
                      tone="blue"
                    />
                  </div>

                  {(Number(estimatedCost) > 0 || Number(advancePaid) > 0) && (
                    <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t-2 border-emerald-200 dark:border-emerald-500/30">
                      <ProfitStat label="Estimate" value={formatPKR(Number(estimatedCost) || 0)} tone="slate" />
                      <ProfitStat label="Advance" value={formatPKR(Number(advancePaid) || 0)} tone="emerald" />
                      <ProfitStat label="Balance Due" value={formatPKR(balanceDue)} tone="amber" big />
                    </div>
                  )}

                  {Number(estimatedCost) > 0 && advancePct > 0 && advancePct < 20 && (
                    <div className="rounded-xl bg-amber-100 dark:bg-amber-500/15 border-2 border-amber-300 dark:border-amber-500/40 p-2.5 text-xs font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Advance sirf {advancePct.toFixed(0)}% hai — 20%+ recommended
                    </div>
                  )}
                  {Number(estimatedCost) > 0 && advancePct >= 20 && (
                    <div className="rounded-xl bg-emerald-100 dark:bg-emerald-500/15 border-2 border-emerald-300 dark:border-emerald-500/40 p-2.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ✨ Advance {advancePct.toFixed(0)}% — customer committed hai
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Internal Notes <span className="text-slate-400 dark:text-slate-500 normal-case font-semibold">(private, customer nahi dekhega)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional info, deal terms, customer ne kya bola..."
                    className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition"
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
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                )}
                {step < 3 ? (
                  <Button
                    onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                    disabled={!canGoNext}
                    className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 font-extrabold shadow-lg shadow-orange-500/30"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    loading={createMutation.isPending}
                    disabled={!canGoNext}
                    className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 font-extrabold shadow-lg shadow-emerald-500/40"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Create Ticket
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BARCODE SCANNER ═══ */}
      {showScanner && (
        <BarcodeScanner
          onDetected={handleScanResult}
          onClose={() => setShowScanner(false)}
          title={`Scan IMEI ${scannerTarget === 'imei1' ? '1' : '2'}`}
        />
      )}

      {/* ═══ TEACHER MODAL ═══ */}
      {showTeacher && <RepairFormTeacher step={step} onClose={() => setShowTeacher(false)} />}
    </>
  );
}

/* ═════════════════════════════════════════════════════════════
   TEACHER MODAL — Step-aware guide
   ═════════════════════════════════════════════════════════════ */
function RepairFormTeacher({ step, onClose }: { step: 1 | 2 | 3; onClose: () => void }) {
  const CONTENT = {
    1: {
      title: 'Step 1: Device Info',
      emoji: '📱',
      color: 'from-orange-500 to-amber-600',
      tips: [
        { emoji: '📷', text: '**IMEI Scan**: Camera icon click karo → phone ka IMEI sticker ya box ka barcode scan karo' },
        { emoji: '📞', text: '**IMEI kaise nikaalein?** Phone dial pad me `*#06#` type karo — screen pe aa jayega' },
        { emoji: '🔒', text: '**Passcode zaroor lo** — customer ki ijazat se. Testing ke liye zaroori. Delivery ke baad delete' },
        { emoji: '💾', text: '**SIM/Memory check**: Andar SIM ya card hai? Note kar do — customer wapas maang sakta hai' },
        { emoji: '📝', text: '**Serial/Color**: Optional lekin helpful. Legal record ke liye achha' },
      ],
    },
    2: {
      title: 'Step 2: Issue Details',
      emoji: '🔍',
      color: 'from-amber-500 to-orange-600',
      tips: [
        { emoji: '📋', text: '**Detailed issue likho**: "Screen kharab" kam hai. Likho: "Upper right corner crack, touch nahi kar raha"' },
        { emoji: '⚡', text: '**Quick-pick chips**: Common issues pe click karo — auto add ho jayenge, phir edit kar sakte ho' },
        { emoji: '🟢', text: '**Normal (2-5 din)**: Aam repairs — screen, battery, speaker' },
        { emoji: '🟠', text: '**Urgent (24-48 hrs)**: Customer ne kaha jaldi chahiye — thora extra charge lo' },
        { emoji: '🔴', text: '**Emergency (2-6 hrs)**: Same-day service — 50-100% extra charge okay hai' },
        { emoji: '📅', text: '**Ready date auto-set** hoti hai priority pe — but tum manually change kar sakte ho' },
        { emoji: '🛡️', text: '**Warranty 7 din default** — repair pe. Customer ka trust barhta hai' },
      ],
    },
    3: {
      title: 'Step 3: Customer & Pricing',
      emoji: '💰',
      color: 'from-emerald-500 to-teal-600',
      tips: [
        { emoji: '👤', text: '**Existing customer**: Search karo naam/phone se — auto-fill ho jayega' },
        { emoji: '🆔', text: '**CNIC lo**: Chori ke phones se bachne ke liye — legal record' },
        { emoji: '💵', text: '**Estimated cost**: Initial estimate. Baad me diagnose ke baad update ho sakti hai' },
        { emoji: '💰', text: '**Advance 20-30% lo**: Kam se kam. Customer serious hai to advance dega. Kam advance = ticket abandon risk' },
        { emoji: '⚠️', text: '**Warning aayegi**: Advance <20% pe warning show hoti hai — customer ko convince karo' },
        { emoji: '📝', text: '**Internal notes**: Sirf tum dekh sakte ho. Customer ki special requests, deal terms' },
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
                dangerouslySetInnerHTML={{
                  __html: tip.text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-900 dark:text-white">$1</strong>').replace(/`(.+?)`/g, '<code class="px-1 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">$1</code>'),
                }}
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
  label, value, onChange, placeholder, type = 'text', mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
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
        className={`h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

function PricingInput({
  label, value, onChange, placeholder, tone,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  tone: 'emerald' | 'blue';
}) {
  const tones = {
    emerald: 'border-emerald-400 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10 focus:border-emerald-600 text-emerald-900 dark:text-emerald-200',
    blue: 'border-blue-400 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-500/10 focus:border-blue-600 text-blue-900 dark:text-blue-200',
  };
  const labelTones = {
    emerald: 'text-emerald-700 dark:text-emerald-400',
    blue: 'text-blue-700 dark:text-blue-400',
  };
  return (
    <div>
      <label className={`block text-[10px] font-extrabold uppercase tracking-wider mb-1 ${labelTones[tone]}`}>
        {label}
      </label>
      <div className="relative">
        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-extrabold ${labelTones[tone]}`}>Rs</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-11 w-full rounded-xl border-2 pl-9 pr-3 text-sm font-extrabold tabular-nums focus:outline-none transition ${tones[tone]}`}
        />
      </div>
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
      <div className="text-[9px] uppercase tracking-widest font-extrabold text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`font-extrabold tabular-nums ${tones[tone]} ${big ? 'text-base' : 'text-sm'} mt-0.5`}>
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
