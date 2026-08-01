import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, User, Eye, Calendar, Info, AlertCircle,
  FileText, Stethoscope,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import { prescriptionsApi } from '../api/prescriptions.api';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';

const RX_TYPES = ['DISTANCE', 'READING', 'BIFOCAL', 'PROGRESSIVE', 'CONTACT_LENS', 'OTHER'];

export default function PrescriptionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState<any>({
    customerId: '', customerName: '', customerPhone: '', customerAge: '', customerGender: '',
    doctorName: '', clinicName: '',
    prescriptionDate: new Date().toISOString().slice(0, 10),
    expiryDate: '',
    prescriptionType: 'DISTANCE',
    rightSph: '', rightCyl: '', rightAxis: '', rightAdd: '', rightPd: '',
    leftSph: '', leftCyl: '', leftAxis: '', leftAdd: '', leftPd: '',
    pupilDistance: '',
    notes: '', imageUrls: [], documentUrls: [],
    isActive: true,
  });

  const { data: existing } = useQuery({
    queryKey: ['prescription', id],
    queryFn: () => prescriptionsApi.getOne(id!),
    enabled: isEdit,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
  });
  const customers = customersData?.items ?? [];

  useEffect(() => {
    if (existing) {
      setForm({
        customerId: existing.customerId || '',
        customerName: existing.customerName,
        customerPhone: existing.customerPhone || '',
        customerAge: existing.customerAge ?? '',
        customerGender: existing.customerGender || '',
        doctorName: existing.doctorName || '',
        clinicName: existing.clinicName || '',
        prescriptionDate: existing.prescriptionDate?.slice(0, 10),
        expiryDate: existing.expiryDate?.slice(0, 10) || '',
        prescriptionType: existing.prescriptionType || 'DISTANCE',
        rightSph: existing.rightSph ?? '', rightCyl: existing.rightCyl ?? '',
        rightAxis: existing.rightAxis ?? '', rightAdd: existing.rightAdd ?? '',
        rightPd: existing.rightPd ?? '',
        leftSph: existing.leftSph ?? '', leftCyl: existing.leftCyl ?? '',
        leftAxis: existing.leftAxis ?? '', leftAdd: existing.leftAdd ?? '',
        leftPd: existing.leftPd ?? '',
        pupilDistance: existing.pupilDistance ?? '',
        notes: existing.notes || '',
        imageUrls: existing.imageUrls || [],
        documentUrls: existing.documentUrls || [],
        isActive: existing.isActive,
      });
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {};
      Object.entries(form).forEach(([k, v]) => {
        if (v === '' || v == null) return;
        if (['rightSph', 'rightCyl', 'rightAdd', 'rightPd', 'leftSph', 'leftCyl', 'leftAdd', 'leftPd', 'pupilDistance'].includes(k)) {
          payload[k] = Number(v);
        } else if (['rightAxis', 'leftAxis', 'customerAge'].includes(k)) {
          payload[k] = parseInt(String(v), 10);
        } else {
          payload[k] = v;
        }
      });
      return isEdit ? prescriptionsApi.update(id!, payload) : prescriptionsApi.create(payload);
    },
    onSuccess: (rx) => {
      toast.success(isEdit ? 'Prescription updated' : 'Prescription created');
      qc.invalidateQueries({ queryKey: ['prescriptions-list'] });
      navigate(`/optical/prescriptions/${rx.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const canSave = form.customerName?.trim() && form.prescriptionDate;

  return (
    <div className="space-y-5 pb-24">
      <button onClick={() => navigate('/optical/prescriptions')}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 font-bold">
        <ArrowLeft className="h-4 w-4" /> Back to Prescriptions
      </button>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <FileText className="h-3.5 w-3.5 text-amber-300" />
            {isEdit ? 'Edit Prescription' : 'New Prescription'}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
            📄 {isEdit ? existing?.prescriptionNumber : 'Enter Rx Details'}
          </h1>
        </div>
      </section>

      <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <div className="font-extrabold mb-1">Medical validation active</div>
          <div className="font-semibold">If CYL is entered, AXIS becomes mandatory (0-180°). SPH range: -30 to +30.</div>
        </div>
      </div>

      {/* CUSTOMER */}
      <section className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
        <SectionHead icon={User} title="Customer Info" tone="blue" />
        <div>
          <Lbl>Existing Customer <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
          <select value={form.customerId} onChange={(e) => {
            const c = customers.find((x: any) => x.id === e.target.value);
            setForm({
              ...form,
              customerId: e.target.value,
              customerName: c?.name || form.customerName,
              customerPhone: c?.phone || form.customerPhone,
            });
          }}
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
            <option value="">-- Or enter manually below --</option>
            {customers.map((c: any) => (<option key={c.id} value={c.id}>{c.name} ({c.phone})</option>))}
          </select>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Customer Name *" value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Full name" />
          <Input label="Phone" value={form.customerPhone}
            onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="03XX XXXXXXX" />
          <Input label="Age" type="number" value={form.customerAge}
            onChange={(e) => setForm({ ...form, customerAge: e.target.value })} placeholder="35" />
          <div>
            <Lbl>Gender</Lbl>
            <select value={form.customerGender} onChange={(e) => setForm({ ...form, customerGender: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
              <option value="">Not specified</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </section>

      {/* DOCTOR & DATE */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Stethoscope} title="Doctor & Date" tone="emerald" />
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Doctor Name" value={form.doctorName}
            onChange={(e) => setForm({ ...form, doctorName: e.target.value })} placeholder="Dr. Ahmed Khan" />
          <Input label="Clinic Name" value={form.clinicName}
            onChange={(e) => setForm({ ...form, clinicName: e.target.value })} placeholder="City Eye Clinic" />
          <div>
            <Lbl>Prescription Date *</Lbl>
            <input type="date" value={form.prescriptionDate}
              onChange={(e) => setForm({ ...form, prescriptionDate: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <Lbl>Expiry Date <span className="text-slate-400 normal-case font-bold">(auto: +12 months)</span></Lbl>
            <input type="date" value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div>
          <Lbl>Prescription Type</Lbl>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {RX_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => setForm({ ...form, prescriptionType: t })}
                className={`px-3 py-2 rounded-xl border-2 text-xs font-extrabold ${
                  form.prescriptionType === t ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'}`}>
                {t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* RIGHT EYE (OD) */}
      <section className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-blue-900">OD — Right Eye</h3>
            <p className="text-xs text-blue-700 font-semibold">Oculus Dexter</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Input label="SPH" type="number" step="0.25" value={form.rightSph}
            onChange={(e) => setForm({ ...form, rightSph: e.target.value })} placeholder="-2.00" />
          <Input label="CYL" type="number" step="0.25" value={form.rightCyl}
            onChange={(e) => setForm({ ...form, rightCyl: e.target.value })} placeholder="-0.50" />
          <Input label="AXIS (0-180°)" type="number" value={form.rightAxis}
            onChange={(e) => setForm({ ...form, rightAxis: e.target.value })} placeholder="90" />
          <Input label="ADD" type="number" step="0.25" value={form.rightAdd}
            onChange={(e) => setForm({ ...form, rightAdd: e.target.value })} placeholder="+1.50" />
          <Input label="PD" type="number" step="0.5" value={form.rightPd}
            onChange={(e) => setForm({ ...form, rightPd: e.target.value })} placeholder="32" />
        </div>
      </section>

      {/* LEFT EYE (OS) */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-emerald-900">OS — Left Eye</h3>
            <p className="text-xs text-emerald-700 font-semibold">Oculus Sinister</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Input label="SPH" type="number" step="0.25" value={form.leftSph}
            onChange={(e) => setForm({ ...form, leftSph: e.target.value })} placeholder="-1.75" />
          <Input label="CYL" type="number" step="0.25" value={form.leftCyl}
            onChange={(e) => setForm({ ...form, leftCyl: e.target.value })} placeholder="-0.25" />
          <Input label="AXIS (0-180°)" type="number" value={form.leftAxis}
            onChange={(e) => setForm({ ...form, leftAxis: e.target.value })} placeholder="180" />
          <Input label="ADD" type="number" step="0.25" value={form.leftAdd}
            onChange={(e) => setForm({ ...form, leftAdd: e.target.value })} placeholder="+1.50" />
          <Input label="PD" type="number" step="0.5" value={form.leftPd}
            onChange={(e) => setForm({ ...form, leftPd: e.target.value })} placeholder="32" />
        </div>
      </section>

      {/* PD & Extras */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Info} title="Additional Info" tone="violet" />
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Total PD (Pupil Distance)" type="number" step="0.5" value={form.pupilDistance}
            onChange={(e) => setForm({ ...form, pupilDistance: e.target.value })} placeholder="64" />
        </div>
        <div>
          <Lbl>Notes</Lbl>
          <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any special instructions..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
        </div>
        <div>
          <Lbl>Attach Rx Photo / Scan</Lbl>
          <UploadDropzone purpose="prescription-image" maxFiles={5}
            onUploaded={(recs: any[]) => setForm({ ...form, imageUrls: [...form.imageUrls, ...recs.map((r) => r.url)] })} />
          {form.imageUrls.length > 0 && (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {form.imageUrls.map((url: string, i: number) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setForm({ ...form, imageUrls: form.imageUrls.filter((_: any, x: number) => x !== i) })}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-extrabold">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-slate-200 bg-white/95 backdrop-blur px-4 py-3 lg:pl-[300px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => navigate('/optical/prescriptions')}>Cancel</Button>
          <Button className="bg-gradient-to-r from-blue-600 to-cyan-700"
            onClick={() => save.mutate()} loading={save.isPending} disabled={!canSave}>
            <Save className="h-4 w-4" /> {isEdit ? 'Update Rx' : 'Create Rx'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ icon: Icon, title, tone }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-700',
    emerald: 'from-emerald-500 to-teal-700',
    violet: 'from-violet-500 to-purple-700',
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
function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
