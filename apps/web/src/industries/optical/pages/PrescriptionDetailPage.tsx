import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, RotateCcw, Trash2, Eye, FileText,
  User, Phone, Calendar, Stethoscope, Clock, CheckCircle2, XCircle,
  FlaskConical, Download, Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { prescriptionsApi } from '../api/prescriptions.api';
import { formatPKR } from '@core/lib/format';

export default function PrescriptionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: rx, isLoading } = useQuery({
    queryKey: ['prescription', id],
    queryFn: () => prescriptionsApi.getOne(id!),
    enabled: !!id,
  });

  const renew = useMutation({
    mutationFn: () => prescriptionsApi.renew(id!),
    onSuccess: (newRx) => {
      toast.success('Renewed successfully');
      navigate(`/optical/prescriptions/${newRx.id}`);
    },
  });

  const deactivate = useMutation({
    mutationFn: () => prescriptionsApi.deactivate(id!),
    onSuccess: () => {
      toast.success('Prescription deactivated');
      qc.invalidateQueries({ queryKey: ['prescription', id] });
    },
  });

  const remove = useMutation({
    mutationFn: () => prescriptionsApi.remove(id!),
    onSuccess: () => {
      toast.success('Deleted');
      navigate('/optical/prescriptions');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  if (isLoading || !rx) {
    return <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
    </div>;
  }

  const isExpired = rx.computed?.isExpired;
  const isExpiringSoon = rx.computed?.isExpiringSoon;

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate('/optical/prescriptions')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 font-bold">
          <ArrowLeft className="h-4 w-4" /> All Prescriptions
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/optical/prescriptions/${id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border-2 border-blue-200 hover:bg-blue-100 text-blue-700 text-sm font-extrabold">
            <Edit3 className="h-4 w-4" /> Edit
          </Link>
          <Link to={`/optical/lens-orders/new?prescriptionId=${id}`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50 border-2 border-violet-200 hover:bg-violet-100 text-violet-700 text-sm font-extrabold">
            <FlaskConical className="h-4 w-4" /> New Lens Order
          </Link>
          <button onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border-2 border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-extrabold">
            <Printer className="h-4 w-4" /> Print
          </button>
          {(isExpiringSoon || isExpired) && (
            <button onClick={() => { if (confirm('Create renewal from this Rx?')) renew.mutate(); }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-sm font-extrabold">
              <RotateCcw className="h-4 w-4" /> Renew
            </button>
          )}
          <button onClick={() => { if (confirm('Delete this prescription?')) remove.mutate(); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border-2 border-rose-200 hover:bg-rose-100 text-rose-700 text-sm font-extrabold">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <FileText className="h-3.5 w-3.5 text-amber-300" /> Prescription
            {rx.prescriptionType && <span>• {rx.prescriptionType.replace(/_/g, ' ')}</span>}
            {isExpired && <span className="text-rose-300">• EXPIRED</span>}
            {isExpiringSoon && !isExpired && <span className="text-amber-300">• Expiring {rx.computed?.daysToExpiry}d</span>}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight font-mono">{rx.prescriptionNumber}</h1>
          <div className="mt-2 flex items-center gap-4 flex-wrap text-sm">
            <span className="inline-flex items-center gap-1"><User className="h-4 w-4" /> {rx.customerName}</span>
            {rx.customerPhone && <span className="inline-flex items-center gap-1"><Phone className="h-4 w-4" /> {rx.customerPhone}</span>}
            {rx.customerAge && <span>{rx.customerAge} years</span>}
          </div>
        </div>
      </section>

      {/* Eye Details */}
      <section className="grid lg:grid-cols-2 gap-4">
        <EyeCard side="OD (Right Eye)" tone="blue"
          sph={rx.rightSph} cyl={rx.rightCyl} axis={rx.rightAxis} add={rx.rightAdd} pd={rx.rightPd} va={rx.rightVa} />
        <EyeCard side="OS (Left Eye)" tone="emerald"
          sph={rx.leftSph} cyl={rx.leftCyl} axis={rx.leftAxis} add={rx.leftAdd} pd={rx.leftPd} va={rx.leftVa} />
      </section>

      {/* Meta */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-3">
        <h3 className="font-extrabold text-slate-900 text-lg">Prescription Info</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <InfoBox icon={Calendar} label="Issued" value={new Date(rx.prescriptionDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })} tone="blue" />
          {rx.expiryDate && (
            <InfoBox icon={Clock} label="Expires" value={new Date(rx.expiryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
              tone={isExpired ? 'rose' : isExpiringSoon ? 'amber' : 'emerald'} />
          )}
          {rx.doctorName && <InfoBox icon={Stethoscope} label="Doctor" value={rx.doctorName} tone="violet" />}
          {rx.clinicName && <InfoBox icon={FileText} label="Clinic" value={rx.clinicName} tone="slate" />}
          {rx.pupilDistance && <InfoBox icon={Eye} label="Total PD" value={`${rx.pupilDistance} mm`} tone="cyan" />}
          <InfoBox icon={rx.isActive ? CheckCircle2 : XCircle} label="Status" value={rx.isActive ? 'Active' : 'Inactive'} tone={rx.isActive ? 'emerald' : 'slate'} />
          <InfoBox icon={FlaskConical} label="Times Used" value={`${rx.timesUsed}× in orders`} tone="fuchsia" />
        </div>

        {rx.notes && (
          <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-4">
            <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">Notes</div>
            <div className="text-sm font-semibold text-slate-700 whitespace-pre-wrap">{rx.notes}</div>
          </div>
        )}
      </section>

      {rx.imageUrls?.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <h3 className="font-extrabold text-slate-900 text-lg mb-3">Attached Photos / Scans</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {rx.imageUrls.map((url: string, i: number) => (
              <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-400">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </section>
      )}

      {rx.lensOrders && rx.lensOrders.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-700 text-white flex items-center justify-center shadow-md">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">Related Lens Orders</h3>
              <p className="text-xs text-slate-500 font-bold">{rx.lensOrders.length} order(s) used this Rx</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {rx.lensOrders.map((o: any) => (
              <Link key={o.id} to={`/optical/lens-orders/${o.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-violet-50/40">
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-extrabold text-sm">{o.orderNumber}</div>
                  <div className="text-xs text-slate-500 font-bold">{o.frameName} • {o.lensType}</div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-emerald-700 text-sm tabular-nums">{formatPKR(o.totalPrice)}</div>
                  <div className="text-[10px] font-bold text-slate-500">{o.status}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EyeCard({ side, tone, sph, cyl, axis, add, pd, va }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-700 bg-blue-50 border-blue-200',
    emerald: 'from-emerald-500 to-teal-700 bg-emerald-50 border-emerald-200',
  };
  const parts = tones[tone].split(' ');
  const has = sph != null || cyl != null;
  const s = (v: number) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2));

  return (
    <div className={`rounded-3xl border-2 ${parts.slice(3).join(' ')} p-5`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${parts[0]} ${parts[1]} text-white flex items-center justify-center shadow-md`}>
          <Eye className="h-5 w-5" />
        </div>
        <h3 className="font-extrabold text-slate-900 text-lg">{side}</h3>
      </div>
      {!has ? (
        <div className="text-center py-8 text-sm font-extrabold text-slate-500">No prescription for this eye</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sph != null && <RxCell label="SPH" value={s(sph)} />}
          {cyl != null && <RxCell label="CYL" value={s(cyl)} />}
          {axis != null && <RxCell label="AXIS" value={`${axis}°`} />}
          {add != null && add !== 0 && <RxCell label="ADD" value={s(add)} />}
          {pd != null && <RxCell label="PD" value={`${pd} mm`} />}
          {va && <RxCell label="VA" value={va} />}
        </div>
      )}
    </div>
  );
}

function RxCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white border-2 border-slate-200 p-3 text-center">
      <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className="text-lg font-extrabold text-slate-900 tabular-nums font-mono mt-1">{value}</div>
    </div>
  );
}

function InfoBox({ icon: Icon, label, value, tone }: any) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    rose: 'bg-rose-50 border-rose-200 text-rose-800',
    violet: 'bg-violet-50 border-violet-200 text-violet-800',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-800',
    fuchsia: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800',
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
