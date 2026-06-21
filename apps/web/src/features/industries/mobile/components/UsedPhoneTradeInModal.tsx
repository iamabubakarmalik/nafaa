import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, Smartphone, Sparkles, Calculator, CheckCircle2, AlertCircle,
  Package, Upload, ShieldCheck, User, Phone, CreditCard, Camera,
  AlertOctagon, Star, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@/lib/format';
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
import { customersApi } from '@/api/customers.api';

interface Props {
  onSuccess?: (usedPhoneId: string) => void;
  onClose: () => void;
}

const CONDITIONS: UsedPhoneCondition[] = ['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR'];
const PTA_OPTIONS: PtaStatus[] = ['APPROVED', 'NON_PTA', 'PATCH', 'PENDING', 'EXEMPT'];

export function UsedPhoneTradeInModal({ onSuccess, onClose }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);

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

  // Step 3: Trade-In Pricing + Customer
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

  // Customer search
  const { data: customersData } = useQuery({
    queryKey: ['customers-for-tradein'],
    queryFn: () => customersApi.list({ page: 1, limit: 200 }),
  });

  // Auto-valuation
  const valuationMutation = useMutation({
    mutationFn: usedPhonesApi.estimate,
    onSuccess: (data) => {
      setBuybackPrice(String(data.suggestedBuyback));
      toast.success(`Suggested: ${formatPKR(data.suggestedBuyback)}`);
    },
    onError: () => toast.error('Valuation failed'),
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: usedPhonesApi.create,
    onSuccess: (phone) => {
      toast.success(`Used phone ${phone.usedPhoneCode} added`);
      queryClient.invalidateQueries({ queryKey: ['used-phones'] });
      queryClient.invalidateQueries({ queryKey: ['used-phones-stats'] });
      onSuccess?.(phone.id);
      onClose();
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Failed to add trade-in');
    },
  });

  const totalCost = useMemo(() => {
    return (Number(buybackPrice) || 0) + (Number(refurbishCost) || 0);
  }, [buybackPrice, refurbishCost]);

  const expectedProfit = useMemo(() => {
    return (Number(resalePrice) || 0) - totalCost;
  }, [resalePrice, totalCost]);

  const handleSubmit = () => {
    if (!imei1 || imei1.length !== 15) {
      toast.error('Valid 15-digit IMEI required');
      setStep(1);
      return;
    }
    if (!brand || !model) {
      toast.error('Brand & Model required');
      setStep(1);
      return;
    }
    if (!buybackPrice || Number(buybackPrice) <= 0) {
      toast.error('Buyback price required');
      setStep(3);
      return;
    }

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-4xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
              <RefreshCw className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-violet-700 font-bold">
                Used Phone Trade-In
              </div>
              <h3 className="font-bold text-slate-900">New Trade-In Entry</h3>
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
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              onClick={() => setStep(s as 1 | 2 | 3)}
              className={`flex-1 h-10 rounded-xl font-bold text-xs transition border-2 ${
                step === s
                  ? 'bg-violet-600 text-white border-violet-700 shadow'
                  : step > s
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    : 'bg-white text-slate-500 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : <span>{s}</span>}
                <span className="hidden sm:inline">
                  {s === 1 && 'Device Info'}
                  {s === 2 && 'Condition'}
                  {s === 3 && 'Pricing & Customer'}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ─── STEP 1: Device Info ─── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">IMEI 1 * (15 digits)</label>
                  <input
                    value={imei1}
                    onChange={(e) => setImei1(e.target.value.replace(/\D/g, '').slice(0, 15))}
                    placeholder="354895112345678"
                    maxLength={15}
                    autoFocus
                    className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono focus:outline-none focus:border-violet-500"
                  />
                  {imei1.length > 0 && imei1.length !== 15 && (
                    <div className="text-[10px] text-rose-600 font-bold mt-1">{imei1.length}/15 digits</div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">IMEI 2 (optional)</label>
                  <input
                    value={imei2}
                    onChange={(e) => setImei2(e.target.value.replace(/\D/g, '').slice(0, 15))}
                    placeholder="354895112345679"
                    maxLength={15}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Brand *</label>
                  <input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Apple, Samsung, Oppo..."
                    list="brands"
                    className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm focus:outline-none focus:border-violet-500"
                  />
                  <datalist id="brands">
                    {['Apple', 'Samsung', 'Oppo', 'Vivo', 'Xiaomi', 'Infinix', 'Tecno', 'Realme', 'Huawei', 'OnePlus'].map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Model *</label>
                  <input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="iPhone 13 Pro, Galaxy S22..."
                    className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-4 gap-3">
                <Input
                  label="Storage"
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  placeholder="128GB"
                />
                <Input
                  label="RAM"
                  value={ram}
                  onChange={(e) => setRam(e.target.value)}
                  placeholder="6GB"
                />
                <Input
                  label="Color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Black"
                />
                <Input
                  label="Year"
                  type="number"
                  value={modelYear}
                  onChange={(e) => setModelYear(e.target.value)}
                  placeholder="2022"
                />
              </div>

              {/* PTA Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">PTA Status</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {PTA_OPTIONS.map((s) => {
                    const colors = PTA_STATUS_COLORS[s];
                    const active = ptaStatus === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPtaStatus(s)}
                        className={`px-2 py-2 rounded-lg text-[10px] font-bold border-2 transition ${
                          active
                            ? `${colors.bg} ${colors.text} ${colors.border} shadow-sm`
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {PTA_STATUS_LABELS[s]}
                      </button>
                    );
                  })}
                </div>
                {(ptaStatus === 'APPROVED' || ptaStatus === 'PATCH') && (
                  <div className="mt-2">
                    <Input
                      label="PTA Tax Paid (PKR)"
                      type="number"
                      value={ptaTaxPaid}
                      onChange={(e) => setPtaTaxPaid(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── STEP 2: Condition ─── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Condition Rating *</label>
                <div className="grid grid-cols-5 gap-2">
                  {CONDITIONS.map((c) => {
                    const colors = CONDITION_COLORS[c];
                    const active = condition === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCondition(c)}
                        className={`p-3 rounded-xl border-2 transition ${
                          active
                            ? `${colors.bg} ${colors.text} ${colors.border} shadow-md`
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <Star className={`h-5 w-5 mx-auto mb-1 ${active ? 'fill-current' : ''}`} />
                        <div className="text-[10px] font-extrabold">{CONDITION_LABELS[c]}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Condition Notes</label>
                <textarea
                  rows={2}
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                  placeholder="Light scratch on left side, no other issues..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <Input
                  label="Battery Health % (if known)"
                  type="number"
                  min="0"
                  max="100"
                  value={batteryHealth}
                  onChange={(e) => setBatteryHealth(e.target.value)}
                  placeholder="85"
                />
              </div>

              {/* Accessories checklist */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Accessories Included</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'box', label: 'Original Box', val: hasOriginalBox, set: setHasOriginalBox },
                    { key: 'charger', label: 'Original Charger', val: hasOriginalCharger, set: setHasOriginalCharger },
                    { key: 'cable', label: 'Original Cable', val: hasOriginalCable, set: setHasOriginalCable },
                    { key: 'earphones', label: 'Original Earphones', val: hasOriginalEarphones, set: setHasOriginalEarphones },
                    { key: 'receipt', label: 'Original Receipt', val: hasOriginalReceipt, set: setHasOriginalReceipt },
                    { key: 'warranty', label: 'Warranty Left', val: hasWarrantyLeft, set: setHasWarrantyLeft },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition ${
                        item.val
                          ? 'bg-emerald-50 border-emerald-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.val}
                        onChange={(e) => item.set(e.target.checked)}
                        className="h-4 w-4 rounded"
                      />
                      <span className={`text-sm font-bold ${item.val ? 'text-emerald-800' : 'text-slate-700'}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Pricing + Customer ─── */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Trade-in source */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Trade-In Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { val: 'CASH_BUYBACK', label: 'Cash Buyback' },
                    { val: 'EXCHANGE', label: 'Exchange for New' },
                    { val: 'CONSIGNMENT', label: 'Consignment' },
                  ] as { val: TradeInSource; label: string }[]).map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setSource(s.val)}
                      className={`p-2 rounded-lg border-2 text-xs font-bold transition ${
                        source === s.val
                          ? 'bg-violet-50 border-violet-400 text-violet-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-valuation helper */}
              <div className="rounded-xl bg-violet-50 border-2 border-violet-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-4 w-4 text-violet-700" />
                  <div className="font-bold text-violet-900 text-sm">Auto-Valuation Helper</div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={referencePrice}
                    onChange={(e) => setReferencePrice(e.target.value)}
                    placeholder="New phone market price (e.g. 150000)"
                    className="h-10 flex-1 rounded-lg border border-violet-300 px-3 text-sm focus:outline-none focus:border-violet-500"
                  />
                  <button
                    onClick={triggerEstimate}
                    disabled={valuationMutation.isPending}
                    className="px-4 h-10 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5 inline mr-1" />
                    Estimate
                  </button>
                </div>
                {valuationMutation.data && (
                  <div className="mt-2 p-2 rounded-lg bg-white border border-violet-200">
                    <div className="text-xs font-bold text-violet-800">
                      Suggested: <span className="text-emerald-700">{formatPKR(valuationMutation.data.suggestedBuyback)}</span>
                      <span className="text-slate-500 ml-2">({(valuationMutation.data.multiplier * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-600">
                      {valuationMutation.data.reasoning.join(' · ')}
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-700 mb-1">Buyback Price * (PKR)</label>
                  <input
                    type="number"
                    value={buybackPrice}
                    onChange={(e) => setBuybackPrice(e.target.value)}
                    placeholder="80000"
                    className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Refurbish Cost (PKR)</label>
                  <input
                    type="number"
                    value={refurbishCost}
                    onChange={(e) => setRefurbishCost(e.target.value)}
                    placeholder="0"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1">Expected Resale (PKR)</label>
                  <input
                    type="number"
                    value={resalePrice}
                    onChange={(e) => setResalePrice(e.target.value)}
                    placeholder="95000"
                    className="h-11 w-full rounded-xl border-2 border-blue-300 bg-blue-50 px-3 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Profit preview */}
              {(buybackPrice || resalePrice) && (
                <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 border-2 border-emerald-200 p-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Total Cost</div>
                    <div className="font-extrabold text-slate-900">{formatPKR(totalCost)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Resale</div>
                    <div className="font-extrabold text-blue-700">{formatPKR(Number(resalePrice) || 0)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Profit</div>
                    <div className={`font-extrabold ${expectedProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatPKR(expectedProfit)}
                    </div>
                  </div>
                </div>
              )}

              {/* Customer info */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-violet-700" />
                  <div className="font-bold text-slate-900 text-sm">Customer (from whom bought)</div>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Existing Customer (optional)</label>
                  <select
                    value={fromCustomerId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setFromCustomerId(id);
                      if (id) {
                        const c = customersData?.items.find((c) => c.id === id);
                        if (c) {
                          setFromCustomerName(c.name);
                          setFromCustomerPhone(c.phone || '');
                          setFromCustomerCnic(c.cnic || '');
                        }
                      }
                    }}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="">— Or enter walk-in below —</option>
                    {customersData?.items.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `• ${c.phone}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <Input
                    label="Name"
                    value={fromCustomerName}
                    onChange={(e) => setFromCustomerName(e.target.value)}
                    placeholder="Customer name"
                  />
                  <Input
                    label="Phone"
                    value={fromCustomerPhone}
                    onChange={(e) => setFromCustomerPhone(e.target.value)}
                    placeholder="03XXXXXXXXX"
                  />
                  <Input
                    label="CNIC (13 digits)"
                    value={fromCustomerCnic}
                    onChange={(e) => setFromCustomerCnic(e.target.value.replace(/\D/g, '').slice(0, 13))}
                    placeholder="XXXXXXXXXXXXX"
                    maxLength={13}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional info..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="secondary" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600"
              >
                Next →
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                loading={createMutation.isPending}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600"
              >
                <CheckCircle2 className="h-4 w-4" /> Save Trade-In
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
