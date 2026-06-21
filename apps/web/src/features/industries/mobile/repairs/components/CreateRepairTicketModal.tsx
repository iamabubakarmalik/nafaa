import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Wrench, Smartphone, AlertCircle, User, CheckCircle2,
  ChevronRight, ChevronLeft, Calendar, DollarSign,
  Flag, AlertTriangle, Zap, Lock, Unlock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { formatPKR } from '@/lib/format';
import {
  repairsApi,
  type CreateRepairTicketPayload,
  type RepairPriority,
} from '../api/repairs.api';
import { CustomerSearchInline } from './CustomerSearchInline';

interface Props {
  onSuccess?: (ticketId: string) => void;
  onClose: () => void;
}

const PRIORITY_OPTIONS: { val: RepairPriority; label: string; icon: any; color: string }[] = [
  { val: 'NORMAL', label: 'Normal', icon: Flag, color: 'slate' },
  { val: 'URGENT', label: 'Urgent', icon: AlertTriangle, color: 'orange' },
  { val: 'EMERGENCY', label: 'Emergency', icon: Zap, color: 'rose' },
];

const COMMON_BRANDS = [
  'Apple', 'Samsung', 'Oppo', 'Vivo', 'Xiaomi', 'Infinix', 'Tecno', 'Realme',
  'Huawei', 'OnePlus', 'Honor', 'Motorola', 'Nokia', 'Itel',
];

const COMMON_ISSUES = [
  'Screen broken / Display issue',
  'Battery not charging',
  'Battery drains fast',
  'Speaker not working',
  'Microphone not working',
  'Camera not working',
  'Charging port damage',
  'Water damage',
  'Software / Hang issue',
  'IMEI issue',
  'Network issue',
  'Buttons not working',
  'Face ID / Fingerprint issue',
  'Phone not turning on',
];

export function CreateRepairTicketModal({ onSuccess, onClose }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);

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

  const balanceDue = useMemo(() => {
    const est = Number(estimatedCost) || 0;
    const adv = Number(advancePaid) || 0;
    return Math.max(est - adv, 0);
  }, [estimatedCost, advancePaid]);

  // Validations
  const step1Valid = deviceBrand.trim() && deviceModel.trim();
  const step2Valid = reportedIssue.trim().length >= 5;
  const step3Valid = customerName.trim() && customerPhone.trim();

  const createMutation = useMutation({
    mutationFn: repairsApi.create,
    onSuccess: (ticket) => {
      toast.success(`Ticket ${ticket.ticketNumber} created`);
      queryClient.invalidateQueries({ queryKey: ['repair-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['repair-stats'] });
      onSuccess?.(ticket.id);
      onClose();
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Failed to create ticket');
    },
  });

  const handleSubmit = () => {
    if (!step1Valid) {
      toast.error('Device brand & model required');
      setStep(1);
      return;
    }
    if (!step2Valid) {
      toast.error('Issue description required (min 5 chars)');
      setStep(2);
      return;
    }
    if (!step3Valid) {
      toast.error('Customer name & phone required');
      setStep(3);
      return;
    }

    // IMEI validation if provided
    if (imei1 && imei1.length !== 15) {
      toast.error('IMEI must be exactly 15 digits');
      setStep(1);
      return;
    }

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-4xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-orange-700 font-bold">
                Repair Service
              </div>
              <h3 className="font-bold text-slate-900">New Repair Ticket</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center"
          >
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          {[
            { num: 1, label: 'Device Info', icon: Smartphone },
            { num: 2, label: 'Issue Details', icon: AlertCircle },
            { num: 3, label: 'Customer & Pricing', icon: User },
          ].map((s) => {
            const StepIcon = s.icon;
            return (
              <button
                key={s.num}
                onClick={() => setStep(s.num as 1 | 2 | 3)}
                className={`flex-1 h-11 rounded-xl font-bold text-xs transition border-2 ${
                  step === s.num
                    ? 'bg-orange-600 text-white border-orange-700 shadow'
                    : step > s.num
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {step > s.num ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">Step {s.num}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ─── STEP 1: DEVICE INFO ─── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Brand *
                  </label>
                  <input
                    autoFocus
                    list="brands-list"
                    value={deviceBrand}
                    onChange={(e) => setDeviceBrand(e.target.value)}
                    placeholder="Apple, Samsung, Oppo..."
                    className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm focus:outline-none focus:border-orange-500"
                  />
                  <datalist id="brands-list">
                    {COMMON_BRANDS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Model *
                  </label>
                  <input
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    placeholder="iPhone 12, Galaxy A52..."
                    className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <Input
                  label="Color"
                  value={deviceColor}
                  onChange={(e) => setDeviceColor(e.target.value)}
                  placeholder="Black, Blue..."
                />
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    IMEI 1 (15 digits)
                  </label>
                  <input
                    value={imei1}
                    onChange={(e) =>
                      setImei1(e.target.value.replace(/\D/g, '').slice(0, 15))
                    }
                    placeholder="354895112345678"
                    maxLength={15}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-mono focus:outline-none focus:border-orange-500"
                  />
                  {imei1.length > 0 && imei1.length !== 15 && (
                    <div className="text-[10px] text-rose-600 font-bold mt-1">
                      {imei1.length}/15 digits
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    IMEI 2 / Serial
                  </label>
                  <input
                    value={imei2}
                    onChange={(e) => setImei2(e.target.value.slice(0, 30))}
                    placeholder="Optional"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 space-y-3">
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" /> Device Access (with customer consent)
                </div>
                <Input
                  label="Passcode / Screen Lock (optional)"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Customer ne diya ho to likhein"
                  hint="Customer ki ijazat ke saath. Securely stored, deleted after delivery."
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition bg-white border-slate-200 hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={hasSimCard}
                    onChange={(e) => setHasSimCard(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm font-bold text-slate-700">SIM Card inside</span>
                </label>
                <label className="flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition bg-white border-slate-200 hover:border-slate-300">
                  <input
                    type="checkbox"
                    checked={hasMemoryCard}
                    onChange={(e) => setHasMemoryCard(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm font-bold text-slate-700">Memory Card inside</span>
                </label>
              </div>
            </div>
          )}

          {/* ─── STEP 2: ISSUE & PRIORITY ─── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reported Issue * (kya kharab hai)
                </label>
                <textarea
                  rows={3}
                  value={reportedIssue}
                  onChange={(e) => setReportedIssue(e.target.value)}
                  placeholder="Describe the issue clearly..."
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                />
                <div className="text-[10px] text-slate-500 mt-1">
                  {reportedIssue.length} chars (min 5)
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Quick-pick common issues
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_ISSUES.map((issue) => (
                    <button
                      key={issue}
                      type="button"
                      onClick={() => {
                        const current = reportedIssue.trim();
                        const newVal = current ? `${current}\n• ${issue}` : `• ${issue}`;
                        setReportedIssue(newVal);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-orange-100 text-slate-700 hover:text-orange-800 transition"
                    >
                      + {issue}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRIORITY_OPTIONS.map((p) => {
                    const Icon = p.icon;
                    const active = priority === p.val;
                    const colorMap: Record<string, string> = {
                      slate: 'bg-slate-50 border-slate-300 text-slate-700',
                      orange: 'bg-orange-50 border-orange-300 text-orange-700',
                      rose: 'bg-rose-50 border-rose-400 text-rose-700',
                    };
                    return (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setPriority(p.val)}
                        className={`p-3 rounded-xl border-2 transition ${
                          active
                            ? `${colorMap[p.color]} shadow-md`
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <Icon className={`h-5 w-5 mx-auto mb-1 ${active ? 'fill-current' : ''}`} />
                        <div className="text-xs font-extrabold">{p.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Est. Ready Date
                  </label>
                  <input
                    type="datetime-local"
                    value={estimatedReadyAt}
                    onChange={(e) => setEstimatedReadyAt(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
                <Input
                  label="Technician Name"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  placeholder="Optional"
                />
                <Input
                  label="Warranty (days)"
                  type="number"
                  value={warrantyDays}
                  onChange={(e) => setWarrantyDays(e.target.value)}
                  placeholder="7"
                />
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
              <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-3 space-y-3">
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" /> Initial Estimate (optional)
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Estimated Cost (PKR)
                    </label>
                    <input
                      type="number"
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(e.target.value)}
                      placeholder="5000"
                      className="h-10 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Advance Paid (PKR)
                    </label>
                    <input
                      type="number"
                      value={advancePaid}
                      onChange={(e) => setAdvancePaid(e.target.value)}
                      placeholder="0"
                      max={Number(estimatedCost) || 0}
                      className="h-10 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                {(Number(estimatedCost) > 0 || Number(advancePaid) > 0) && (
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-emerald-200">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Estimate</div>
                      <div className="font-extrabold text-slate-900">
                        {formatPKR(Number(estimatedCost) || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-emerald-700">Advance</div>
                      <div className="font-extrabold text-emerald-700">
                        {formatPKR(Number(advancePaid) || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-amber-700">Balance</div>
                      <div className="font-extrabold text-amber-700">{formatPKR(balanceDue)}</div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Internal Notes (private)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional info..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button
                variant="secondary"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={() => {
                  if (step === 1 && !step1Valid) {
                    toast.error('Brand & Model required');
                    return;
                  }
                  if (step === 2 && !step2Valid) {
                    toast.error('Issue description required');
                    return;
                  }
                  setStep((s) => (s + 1) as 1 | 2 | 3);
                }}
                className="bg-gradient-to-r from-orange-600 to-amber-600"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                loading={createMutation.isPending}
                disabled={!step3Valid}
                className="bg-gradient-to-r from-orange-600 to-amber-600"
              >
                <CheckCircle2 className="h-4 w-4" /> Create Ticket
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
