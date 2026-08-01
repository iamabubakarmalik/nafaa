import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save, FileText, Glasses, DollarSign, User, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { lensOrdersApi } from '../api/lens-orders.api';
import { prescriptionsApi } from '../api/prescriptions.api';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { formatPKR } from '@core/lib/format';

const LENS_TYPES = ['Single Vision', 'Bifocal', 'Progressive', 'Reading', 'Computer', 'Driving'];
const LENS_MATERIALS = ['CR-39', 'Polycarbonate', 'Trivex', 'High Index 1.60', 'High Index 1.67', 'High Index 1.74'];
const LENS_COATINGS = ['Anti-Reflective', 'Blue Cut', 'UV Protection', 'Anti-Scratch', 'Water Repellent', 'Photochromic'];

export default function LensOrderFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledRxId = searchParams.get('prescriptionId') || '';

  const [form, setForm] = useState<any>({
    customerId: '', customerName: '', customerPhone: '',
    prescriptionId: prefilledRxId,
    frameName: '', lensType: 'Single Vision', lensMaterial: 'CR-39', lensIndex: '1.50',
    lensCoatings: [],
    rightSph: '', rightCyl: '', rightAxis: '', rightAdd: '',
    leftSph: '', leftCyl: '', leftAxis: '', leftAdd: '',
    pupilDistance: '',
    labName: '', labOrderRef: '', expectedDate: '',
    framePrice: '', lensPrice: '', fittingCharge: 0, paidAmount: 0,
    notes: '',
  });

  const { data: customersData } = useQuery({ queryKey: ['customers-for-pos'], queryFn: () => customersApi.list({ page: 1, limit: 500 }) });
  const customers = customersData?.items ?? [];

  const { data: rx } = useQuery({
    queryKey: ['prescription', form.prescriptionId],
    queryFn: () => prescriptionsApi.getOne(form.prescriptionId),
    enabled: !!form.prescriptionId,
  });

  const { data: customerRxs = [] } = useQuery({
    queryKey: ['customer-prescriptions', form.customerId],
    queryFn: () => prescriptionsApi.byCustomer(form.customerId),
    enabled: !!form.customerId,
  });

  useEffect(() => {
    if (rx) {
      setForm((f: any) => ({
        ...f,
        customerName: f.customerName || rx.customerName,
        customerPhone: f.customerPhone || rx.customerPhone,
        rightSph: rx.rightSph ?? '', rightCyl: rx.rightCyl ?? '', rightAxis: rx.rightAxis ?? '', rightAdd: rx.rightAdd ?? '',
        leftSph: rx.leftSph ?? '', leftCyl: rx.leftCyl ?? '', leftAxis: rx.leftAxis ?? '', leftAdd: rx.leftAdd ?? '',
        pupilDistance: rx.pupilDistance ?? '',
      }));
    }
  }, [rx]);

  const framePrice = Number(form.framePrice || 0);
  const lensPrice = Number(form.lensPrice || 0);
  const fittingCharge = Number(form.fittingCharge || 0);
  const totalPrice = framePrice + lensPrice + fittingCharge;
  const paidAmount = Number(form.paidAmount || 0);
  const remaining = totalPrice - paidAmount;

  const create = useMutation({
    mutationFn: () => {
      const payload: any = { ...form };
      ['rightSph', 'rightCyl', 'rightAdd', 'leftSph', 'leftCyl', 'leftAdd', 'pupilDistance', 'framePrice', 'lensPrice', 'fittingCharge', 'paidAmount'].forEach((k) => {
        if (payload[k] === '' || payload[k] == null) delete payload[k];
        else payload[k] = Number(payload[k]);
      });
      ['rightAxis', 'leftAxis'].forEach((k) => {
        if (payload[k] === '' || payload[k] == null) delete payload[k];
        else payload[k] = parseInt(payload[k], 10);
      });
      Object.keys(payload).forEach((k) => { if (payload[k] === '') delete payload[k]; });
      return lensOrdersApi.create(payload);
    },
    onSuccess: (o) => {
      toast.success('Lens order created');
      navigate(`/optical/lens-orders/${o.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const canSave = form.customerName?.trim() && form.customerPhone?.trim() && form.frameName?.trim() && form.lensType && totalPrice > 0;

  const togCoating = (c: string) => {
    const cur = form.lensCoatings ?? [];
    setForm({ ...form, lensCoatings: cur.includes(c) ? cur.filter((x: string) => x !== c) : [...cur, c] });
  };

  return (
    <div className="space-y-5 pb-24">
      <button onClick={() => navigate('/optical/lens-orders')}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600 font-bold">
        <ArrowLeft className="h-4 w-4" /> Back to Lens Orders
      </button>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <FlaskConical className="h-3.5 w-3.5 text-amber-300" /> New Lens Order
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🔬 Create Lens Order</h1>
        </div>
      </section>

      {/* Customer */}
      <section className="rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-white p-5 space-y-4">
        <SectionHead icon={User} title="Customer" tone="violet" />
        <div>
          <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Existing Customer</label>
          <select value={form.customerId} onChange={(e) => {
            const c = customers.find((x: any) => x.id === e.target.value);
            setForm({ ...form, customerId: e.target.value, customerName: c?.name || form.customerName, customerPhone: c?.phone || form.customerPhone });
          }}
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
            <option value="">-- Or enter manually below --</option>
            {customers.map((c: any) => (<option key={c.id} value={c.id}>{c.name} ({c.phone})</option>))}
          </select>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Customer Name *" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <Input label="Phone *" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
        </div>
      </section>

      {/* Prescription */}
      <section className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
        <SectionHead icon={FileText} title="Prescription" tone="blue" />
        {form.customerId && customerRxs.length > 0 && (
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Link Prescription</label>
            <select value={form.prescriptionId} onChange={(e) => setForm({ ...form, prescriptionId: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-blue-300 bg-blue-50 px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
              <option value="">-- Enter Rx values manually --</option>
              {customerRxs.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.prescriptionNumber} — {new Date(r.prescriptionDate).toLocaleDateString('en-PK')}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-extrabold uppercase text-blue-700 mb-1.5">OD (Right Eye)</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Input label="SPH" type="number" step="0.25" value={form.rightSph} onChange={(e) => setForm({ ...form, rightSph: e.target.value })} />
            <Input label="CYL" type="number" step="0.25" value={form.rightCyl} onChange={(e) => setForm({ ...form, rightCyl: e.target.value })} />
            <Input label="AXIS" type="number" value={form.rightAxis} onChange={(e) => setForm({ ...form, rightAxis: e.target.value })} />
            <Input label="ADD" type="number" step="0.25" value={form.rightAdd} onChange={(e) => setForm({ ...form, rightAdd: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-extrabold uppercase text-emerald-700 mb-1.5">OS (Left Eye)</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Input label="SPH" type="number" step="0.25" value={form.leftSph} onChange={(e) => setForm({ ...form, leftSph: e.target.value })} />
            <Input label="CYL" type="number" step="0.25" value={form.leftCyl} onChange={(e) => setForm({ ...form, leftCyl: e.target.value })} />
            <Input label="AXIS" type="number" value={form.leftAxis} onChange={(e) => setForm({ ...form, leftAxis: e.target.value })} />
            <Input label="ADD" type="number" step="0.25" value={form.leftAdd} onChange={(e) => setForm({ ...form, leftAdd: e.target.value })} />
          </div>
        </div>
        <Input label="Pupil Distance" type="number" step="0.5" value={form.pupilDistance}
          onChange={(e) => setForm({ ...form, pupilDistance: e.target.value })} placeholder="64" />
      </section>

      {/* Frame & Lens */}
      <section className="rounded-2xl border-2 border-cyan-300 bg-gradient-to-br from-cyan-50 to-white p-5 space-y-4">
        <SectionHead icon={Glasses} title="Frame & Lens Details" tone="cyan" />
        <Input label="Frame Name / Model *" value={form.frameName}
          onChange={(e) => setForm({ ...form, frameName: e.target.value })} placeholder="Ray-Ban RB3025 Aviator Gold" />
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Lens Type *</label>
            <select value={form.lensType} onChange={(e) => setForm({ ...form, lensType: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
              {LENS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Material</label>
            <select value={form.lensMaterial} onChange={(e) => setForm({ ...form, lensMaterial: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
              {LENS_MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <Input label="Refractive Index" value={form.lensIndex}
            onChange={(e) => setForm({ ...form, lensIndex: e.target.value })} placeholder="1.56" />
        </div>
        <div>
          <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Coatings</label>
          <div className="flex flex-wrap gap-1.5">
            {LENS_COATINGS.map((c) => {
              const a = form.lensCoatings?.includes(c);
              return (
                <button key={c} type="button" onClick={() => togCoating(c)}
                  className={`px-3 py-1.5 rounded-full border-2 text-xs font-extrabold ${
                    a ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300'}`}>
                  {a ? '✓ ' : '+ '}{c}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Lab */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={FlaskConical} title="Lab Info" tone="amber" />
        <div className="grid sm:grid-cols-3 gap-3">
          <Input label="Lab Name" value={form.labName}
            onChange={(e) => setForm({ ...form, labName: e.target.value })} placeholder="Karachi Optical Lab" />
          <Input label="Lab Order Ref" value={form.labOrderRef}
            onChange={(e) => setForm({ ...form, labOrderRef: e.target.value })} placeholder="LAB-2026-001" />
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Expected Date</label>
            <input type="date" value={form.expectedDate}
              onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHead icon={DollarSign} title="Pricing" tone="emerald" />
        <div className="grid sm:grid-cols-3 gap-3">
          <Input label="Frame Price *" type="number" step="0.01" value={form.framePrice}
            onChange={(e) => setForm({ ...form, framePrice: e.target.value })} />
          <Input label="Lens Price *" type="number" step="0.01" value={form.lensPrice}
            onChange={(e) => setForm({ ...form, lensPrice: e.target.value })} />
          <Input label="Fitting Charge" type="number" step="0.01" value={form.fittingCharge}
            onChange={(e) => setForm({ ...form, fittingCharge: e.target.value })} />
        </div>

        <div className="rounded-2xl bg-white border-2 border-emerald-200 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 font-bold">Frame</span>
            <span className="font-extrabold tabular-nums">{formatPKR(framePrice)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 font-bold">Lens</span>
            <span className="font-extrabold tabular-nums">{formatPKR(lensPrice)}</span>
          </div>
          {fittingCharge > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-bold">Fitting</span>
              <span className="font-extrabold tabular-nums">{formatPKR(fittingCharge)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-sm font-extrabold text-slate-900 uppercase">Total</span>
            <span className="text-2xl font-extrabold text-emerald-700 tabular-nums">{formatPKR(totalPrice)}</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Advance Payment" type="number" step="0.01" value={form.paidAmount}
            onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} />
          <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-amber-700">Remaining Balance</div>
            <div className="text-2xl font-extrabold text-amber-900 tabular-nums">{formatPKR(Math.max(remaining, 0))}</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5">
        <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Notes</label>
        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Special instructions for the lab..."
          className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-slate-200 bg-white/95 backdrop-blur px-4 py-3 lg:pl-[300px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => navigate('/optical/lens-orders')}>Cancel</Button>
          <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-700"
            onClick={() => create.mutate()} loading={create.isPending} disabled={!canSave}>
            <Save className="h-4 w-4" /> Create Lens Order
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ icon: Icon, title, tone }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-fuchsia-700',
    blue: 'from-blue-500 to-cyan-700',
    cyan: 'from-cyan-500 to-sky-700',
    emerald: 'from-emerald-500 to-teal-700',
    amber: 'from-amber-500 to-orange-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-extrabold text-slate-900">{title}</h3>
    </div>
  );
}
