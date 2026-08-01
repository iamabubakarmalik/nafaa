import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Play, CheckCircle2, XCircle, Eye, Calendar,
  User, Phone, UserCog, Save, FileText, DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { eyeTestsApi } from '../api/eye-tests.api';
import { formatPKR } from '@core/lib/format';

export default function EyeTestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showResults, setShowResults] = useState(false);

  const { data: test, isLoading } = useQuery({
    queryKey: ['eye-test', id],
    queryFn: () => eyeTestsApi.getOne(id!),
    enabled: !!id,
  });

  const start = useMutation({
    mutationFn: () => eyeTestsApi.start(id!),
    onSuccess: () => {
      toast.success('Test started');
      qc.invalidateQueries({ queryKey: ['eye-test', id] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: (status: any) => eyeTestsApi.updateStatus(id!, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['eye-test', id] });
    },
  });

  if (isLoading || !test) {
    return <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
    </div>;
  }

  return (
    <div className="space-y-5 pb-10">
      {showResults && (
        <RecordResultsModal test={test}
          onClose={() => setShowResults(false)}
          onSaved={() => {
            setShowResults(false);
            qc.invalidateQueries({ queryKey: ['eye-test', id] });
          }} />
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate('/optical/eye-tests')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600 font-bold">
          <ArrowLeft className="h-4 w-4" /> All Eye Tests
        </button>
        <div className="flex gap-2 flex-wrap">
          {test.status === 'SCHEDULED' && (
            <>
              <button onClick={() => updateStatus.mutate('CONFIRMED')}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border-2 border-blue-200 hover:bg-blue-100 text-blue-700 text-sm font-extrabold">
                <CheckCircle2 className="h-4 w-4" /> Confirm
              </button>
              <button onClick={() => updateStatus.mutate('CANCELLED')}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border-2 border-rose-200 hover:bg-rose-100 text-rose-700 text-sm font-extrabold">
                <XCircle className="h-4 w-4" /> Cancel
              </button>
            </>
          )}
          {(test.status === 'SCHEDULED' || test.status === 'CONFIRMED') && (
            <button onClick={() => start.mutate()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-sm font-extrabold shadow-md">
              <Play className="h-4 w-4" /> Start Test
            </button>
          )}
          {test.status === 'IN_PROGRESS' && (
            <Button className="bg-gradient-to-r from-emerald-600 to-teal-700" onClick={() => setShowResults(true)}>
              <FileText className="h-4 w-4" /> Record Results
            </Button>
          )}
        </div>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <Eye className="h-3.5 w-3.5 text-amber-300" /> {test.status.replace(/_/g, ' ')}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight font-mono">{test.testNumber}</h1>
          <div className="mt-2 flex items-center gap-4 flex-wrap text-sm">
            <span className="inline-flex items-center gap-1"><User className="h-4 w-4" /> {test.customerName}</span>
            <span className="inline-flex items-center gap-1"><Phone className="h-4 w-4" /> {test.customerPhone}</span>
            {test.optometristName && <span className="inline-flex items-center gap-1"><UserCog className="h-4 w-4" /> Dr. {test.optometristName}</span>}
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <InfoBox icon={Calendar} label="Appointment"
          value={`${new Date(test.appointmentDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}${test.scheduledSlot ? ` @ ${test.scheduledSlot}` : ''}`}
          tone="emerald" />
        <InfoBox icon={DollarSign} label="Test Fee" value={formatPKR(test.testFee)} tone="blue" />
        <InfoBox icon={CheckCircle2} label="Paid" value={formatPKR(test.paidAmount)} tone={test.paidAmount >= test.testFee ? 'emerald' : 'amber'} />
        <InfoBox icon={FileText} label="Rx Issued" value={test.prescriptionIssued ? '✓ Yes' : '— No'} tone={test.prescriptionIssued ? 'blue' : 'slate'} />
      </section>

      {test.chiefComplaint && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <h3 className="font-extrabold text-slate-900 text-lg mb-3">Chief Complaint</h3>
          <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-4 text-sm font-semibold text-slate-700">
            {test.chiefComplaint}
          </div>
        </section>
      )}

      {test.status === 'COMPLETED' && (test.rightSph != null || test.leftSph != null) && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <h3 className="font-extrabold text-slate-900 text-lg mb-3">Test Results</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <ResultBox side="OD (Right)" sph={test.rightSph} cyl={test.rightCyl} axis={test.rightAxis} add={test.rightAdd} tone="blue" />
            <ResultBox side="OS (Left)" sph={test.leftSph} cyl={test.leftCyl} axis={test.leftAxis} add={test.leftAdd} tone="emerald" />
          </div>
          {test.diagnosis && (
            <div className="mt-4 rounded-xl bg-amber-50 border-2 border-amber-200 p-4">
              <div className="text-[10px] uppercase font-extrabold text-amber-700 mb-1">Diagnosis</div>
              <div className="text-sm font-semibold text-amber-900">{test.diagnosis}</div>
            </div>
          )}
          {test.recommendation && (
            <div className="mt-3 rounded-xl bg-blue-50 border-2 border-blue-200 p-4">
              <div className="text-[10px] uppercase font-extrabold text-blue-700 mb-1">Recommendation</div>
              <div className="text-sm font-semibold text-blue-900">{test.recommendation}</div>
            </div>
          )}
          {test.prescriptionId && (
            <Link to={`/optical/prescriptions/${test.prescriptionId}`}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold">
              <FileText className="h-4 w-4" /> View Issued Prescription
            </Link>
          )}
        </section>
      )}
    </div>
  );
}

function RecordResultsModal({ test, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    rightSph: '', rightCyl: '', rightAxis: '', rightAdd: '', rightVa: '',
    leftSph: '', leftCyl: '', leftAxis: '', leftAdd: '', leftVa: '',
    pupilDistance: '',
    diagnosis: '', recommendation: '',
    requiresFollowUp: false, followUpDate: '',
    issuePrescription: true,
  });

  const save = useMutation({
    mutationFn: () => {
      const payload: any = { ...form };
      ['rightSph', 'rightCyl', 'rightAdd', 'leftSph', 'leftCyl', 'leftAdd', 'pupilDistance'].forEach((k) => {
        payload[k] = payload[k] === '' ? undefined : Number(payload[k]);
      });
      ['rightAxis', 'leftAxis'].forEach((k) => {
        payload[k] = payload[k] === '' ? undefined : parseInt(payload[k], 10);
      });
      return eyeTestsApi.recordResults(test.id, payload);
    },
    onSuccess: () => {
      toast.success('Test results recorded');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">📝 Record Test Results</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-2xl border-2 border-blue-300 bg-blue-50/50 p-4 space-y-3">
            <h4 className="font-extrabold text-blue-900">OD — Right Eye</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <Input label="SPH" type="number" step="0.25" value={form.rightSph} onChange={(e) => setForm({ ...form, rightSph: e.target.value })} />
              <Input label="CYL" type="number" step="0.25" value={form.rightCyl} onChange={(e) => setForm({ ...form, rightCyl: e.target.value })} />
              <Input label="AXIS" type="number" value={form.rightAxis} onChange={(e) => setForm({ ...form, rightAxis: e.target.value })} />
              <Input label="ADD" type="number" step="0.25" value={form.rightAdd} onChange={(e) => setForm({ ...form, rightAdd: e.target.value })} />
              <Input label="VA" value={form.rightVa} onChange={(e) => setForm({ ...form, rightVa: e.target.value })} placeholder="6/6" />
            </div>
          </div>

          <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 p-4 space-y-3">
            <h4 className="font-extrabold text-emerald-900">OS — Left Eye</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <Input label="SPH" type="number" step="0.25" value={form.leftSph} onChange={(e) => setForm({ ...form, leftSph: e.target.value })} />
              <Input label="CYL" type="number" step="0.25" value={form.leftCyl} onChange={(e) => setForm({ ...form, leftCyl: e.target.value })} />
              <Input label="AXIS" type="number" value={form.leftAxis} onChange={(e) => setForm({ ...form, leftAxis: e.target.value })} />
              <Input label="ADD" type="number" step="0.25" value={form.leftAdd} onChange={(e) => setForm({ ...form, leftAdd: e.target.value })} />
              <Input label="VA" value={form.leftVa} onChange={(e) => setForm({ ...form, leftVa: e.target.value })} placeholder="6/6" />
            </div>
          </div>

          <Input label="Pupil Distance (mm)" type="number" step="0.5" value={form.pupilDistance}
            onChange={(e) => setForm({ ...form, pupilDistance: e.target.value })} placeholder="64" />

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Diagnosis</label>
            <textarea rows={2} value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
              placeholder="Myopia, astigmatism, presbyopia..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Recommendation</label>
            <textarea rows={2} value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })}
              placeholder="Progressive lenses recommended, blue cut coating..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
          </div>

          <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-blue-300 bg-blue-50 cursor-pointer">
            <input type="checkbox" checked={form.issuePrescription}
              onChange={(e) => setForm({ ...form, issuePrescription: e.target.checked })}
              className="h-5 w-5 rounded" />
            <FileText className="h-5 w-5 text-blue-700" />
            <div>
              <div className="font-extrabold text-blue-900 text-sm">Auto-issue Prescription</div>
              <div className="text-xs text-blue-700 font-semibold">Creates a new Rx from these results</div>
            </div>
          </label>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700"
            onClick={() => save.mutate()} loading={save.isPending}>
            <Save className="h-4 w-4" /> Complete Test
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResultBox({ side, sph, cyl, axis, add, tone }: any) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    emerald: 'bg-emerald-50 border-emerald-200',
  };
  const s = (v: number) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
  return (
    <div className={`rounded-2xl border-2 p-4 ${tones[tone]}`}>
      <div className="font-extrabold text-slate-900 mb-2">{side}</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {sph != null && <div><span className="text-slate-500 font-bold">SPH:</span> <span className="font-mono font-extrabold">{s(sph)}</span></div>}
        {cyl != null && <div><span className="text-slate-500 font-bold">CYL:</span> <span className="font-mono font-extrabold">{s(cyl)}</span></div>}
        {axis != null && <div><span className="text-slate-500 font-bold">AXIS:</span> <span className="font-mono font-extrabold">{axis}°</span></div>}
        {add != null && <div><span className="text-slate-500 font-bold">ADD:</span> <span className="font-mono font-extrabold">{s(add)}</span></div>}
      </div>
    </div>
  );
}

function InfoBox({ icon: Icon, label, value, tone }: any) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    slate: 'bg-slate-50 border-slate-200 text-slate-800',
  };
  return (
    <div className={`rounded-xl border-2 p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold opacity-75">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-sm font-extrabold mt-1">{value}</div>
    </div>
  );
}
