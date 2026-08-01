import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, FlaskConical, User, Phone, Calendar, DollarSign,
  Send, CheckCircle2, XCircle, Package, Truck, FileText, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { lensOrdersApi } from '../api/lens-orders.api';
import { formatPKR } from '@core/lib/format';

const STATUS_STEPS = ['ORDERED', 'SENT_TO_LAB', 'AT_LAB', 'RECEIVED', 'QC_PASSED', 'FITTED', 'READY', 'DELIVERED'];

export default function LensOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['lens-order', id],
    queryFn: () => lensOrdersApi.getOne(id!),
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => lensOrdersApi.updateStatus(id!, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['lens-order', id] });
    },
  });

  const deliver = useMutation({
    mutationFn: () => lensOrdersApi.deliver(id!),
    onSuccess: () => {
      toast.success('Order delivered');
      qc.invalidateQueries({ queryKey: ['lens-order', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delivery failed'),
  });

  if (isLoading || !order) {
    return <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
    </div>;
  }

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="space-y-5 pb-10">
      {showPayment && (
        <PaymentModal order={order}
          onClose={() => setShowPayment(false)}
          onPaid={() => {
            setShowPayment(false);
            qc.invalidateQueries({ queryKey: ['lens-order', id] });
          }} />
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate('/optical/lens-orders')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600 font-bold">
          <ArrowLeft className="h-4 w-4" /> All Lens Orders
        </button>
        <div className="flex gap-2 flex-wrap">
          {order.remainingAmount > 0 && (
            <button onClick={() => setShowPayment(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-sm font-extrabold">
              <DollarSign className="h-4 w-4" /> Record Payment
            </button>
          )}
          {['FITTED', 'READY'].includes(order.status) && (
            <button onClick={() => { if (confirm('Mark as delivered? Requires full payment.')) deliver.mutate(); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-sm font-extrabold shadow-md">
              <Truck className="h-4 w-4" /> Deliver
            </button>
          )}
        </div>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <FlaskConical className="h-3.5 w-3.5 text-amber-300" /> {order.status.replace(/_/g, ' ')}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight font-mono">{order.orderNumber}</h1>
          <div className="mt-2 flex items-center gap-4 flex-wrap text-sm">
            <span className="inline-flex items-center gap-1"><User className="h-4 w-4" /> {order.customerName}</span>
            <span className="inline-flex items-center gap-1"><Phone className="h-4 w-4" /> {order.customerPhone}</span>
          </div>
        </div>
      </section>

      {/* Workflow Timeline */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
        <h3 className="font-extrabold text-slate-900 text-lg mb-4">Lab Workflow</h3>
        <div className="flex items-center justify-between gap-1 overflow-x-auto">
          {STATUS_STEPS.map((step, i) => {
            const isPast = i < currentStepIndex;
            const isCurrent = i === currentStepIndex;
            const canAdvance = i === currentStepIndex + 1;
            return (
              <div key={step} className="flex items-center gap-1 shrink-0">
                <div className={`flex flex-col items-center gap-1 min-w-[70px]`}>
                  <button
                    disabled={!canAdvance && !isCurrent}
                    onClick={() => canAdvance && updateStatus.mutate(step)}
                    className={`h-10 w-10 rounded-full flex items-center justify-center transition ${
                      isPast || isCurrent ? 'bg-violet-600 text-white shadow-md' :
                      canAdvance ? 'bg-violet-100 text-violet-700 hover:bg-violet-200 cursor-pointer' :
                      'bg-slate-100 text-slate-400'}`}>
                    {isPast ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-xs font-extrabold">{i + 1}</span>}
                  </button>
                  <div className={`text-[9px] font-extrabold text-center leading-tight ${isPast || isCurrent ? 'text-violet-800' : 'text-slate-500'}`}>
                    {step.replace(/_/g, ' ')}
                  </div>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`h-1 w-6 sm:w-10 rounded ${isPast ? 'bg-violet-500' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Order Info */}
      <section className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <h3 className="font-extrabold text-slate-900 text-lg mb-3">Frame & Lens</h3>
          <div className="space-y-2 text-sm">
            <Row label="Frame" value={order.frameName} />
            <Row label="Lens Type" value={order.lensType} />
            {order.lensMaterial && <Row label="Material" value={order.lensMaterial} />}
            {order.lensIndex && <Row label="Index" value={order.lensIndex} />}
            {order.pupilDistance && <Row label="PD" value={`${order.pupilDistance} mm`} />}
          </div>
          {order.lensCoatings?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1.5">Coatings</div>
              <div className="flex flex-wrap gap-1.5">
                {order.lensCoatings.map((c) => (
                  <span key={c} className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-[10px] font-extrabold">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <h3 className="font-extrabold text-slate-900 text-lg mb-3">Lab & Dates</h3>
          <div className="space-y-2 text-sm">
            {order.labName && <Row label="Lab Name" value={order.labName} />}
            {order.labOrderRef && <Row label="Lab Ref" value={order.labOrderRef} mono />}
            <Row label="Ordered" value={new Date(order.orderedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })} />
            {order.expectedDate && <Row label="Expected" value={new Date(order.expectedDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })} />}
            {order.receivedAt && <Row label="Received" value={new Date(order.receivedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} />}
            {order.deliveredAt && <Row label="Delivered" value={new Date(order.deliveredAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} />}
          </div>
        </div>
      </section>

      {/* Prescription Values */}
      {(order.rightSph != null || order.leftSph != null) && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <h3 className="font-extrabold text-slate-900 text-lg mb-3">Prescription Values</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <RxCard side="OD" sph={order.rightSph} cyl={order.rightCyl} axis={order.rightAxis} add={order.rightAdd} tone="blue" />
            <RxCard side="OS" sph={order.leftSph} cyl={order.leftCyl} axis={order.leftAxis} add={order.leftAdd} tone="emerald" />
          </div>
        </section>
      )}

      {/* Financial */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-300 shadow-sm p-5">
        <h3 className="font-extrabold text-emerald-900 text-lg mb-3">💰 Financial Summary</h3>
        <div className="space-y-2">
          <Row label="Frame Price" value={formatPKR(order.framePrice)} />
          <Row label="Lens Price" value={formatPKR(order.lensPrice)} />
          {order.fittingCharge > 0 && <Row label="Fitting Charge" value={formatPKR(order.fittingCharge)} />}
        </div>
        <div className="mt-3 pt-3 border-t-2 border-emerald-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold uppercase text-slate-700">Total</span>
            <span className="text-2xl font-extrabold text-emerald-700 tabular-nums">{formatPKR(order.totalPrice)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-slate-600">Paid</span>
            <span className="font-extrabold text-blue-700 tabular-nums">{formatPKR(order.paidAmount)}</span>
          </div>
          {order.remainingAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-600">Remaining</span>
              <span className="font-extrabold text-rose-700 tabular-nums">{formatPKR(order.remainingAmount)}</span>
            </div>
          )}
        </div>
      </section>

      {(order.notes || order.qcNotes || order.fittingNotes) && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="font-extrabold text-slate-900 text-lg">Notes</h3>
          {order.notes && (
            <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-slate-500 mb-1">General</div>
              <div className="text-sm font-semibold text-slate-700 whitespace-pre-wrap">{order.notes}</div>
            </div>
          )}
          {order.qcNotes && (
            <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-blue-700 mb-1">QC Notes</div>
              <div className="text-sm font-semibold text-blue-900 whitespace-pre-wrap">{order.qcNotes}</div>
            </div>
          )}
          {order.fittingNotes && (
            <div className="rounded-xl bg-violet-50 border-2 border-violet-200 p-3">
              <div className="text-[10px] uppercase font-extrabold text-violet-700 mb-1">Fitting Notes</div>
              <div className="text-sm font-semibold text-violet-900 whitespace-pre-wrap">{order.fittingNotes}</div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function PaymentModal({ order, onClose, onPaid }: any) {
  const [amount, setAmount] = useState(order.remainingAmount);
  const [method, setMethod] = useState('CASH');

  const pay = useMutation({
    mutationFn: () => lensOrdersApi.recordPayment(order.id, { amount: Number(amount), paymentMethod: method }),
    onSuccess: () => {
      toast.success('Payment recorded');
      onPaid();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Payment failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">💰 Record Payment</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-slate-500 font-bold">Total</span><span className="font-extrabold tabular-nums">{formatPKR(order.totalPrice)}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500 font-bold">Already Paid</span><span className="font-extrabold text-blue-700 tabular-nums">{formatPKR(order.paidAmount)}</span></div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200"><span className="font-extrabold text-slate-700">Remaining</span><span className="font-extrabold text-rose-700 tabular-nums text-lg">{formatPKR(order.remainingAmount)}</span></div>
          </div>
          <Input label="Payment Amount" type="number" step="0.01" value={amount}
            onChange={(e) => setAmount(e.target.value)} />
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Method</label>
            <div className="grid grid-cols-4 gap-1.5">
              {['CASH', 'CARD', 'MOBILE', 'CREDIT'].map((m) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={`h-11 rounded-xl text-xs font-extrabold ${method === m ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700"
            onClick={() => pay.mutate()} loading={pay.isPending}
            disabled={Number(amount) <= 0 || Number(amount) > order.remainingAmount}>
            Record {formatPKR(Number(amount) || 0)}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600 font-semibold">{label}</span>
      <span className={`font-extrabold text-slate-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function RxCard({ side, sph, cyl, axis, add, tone }: any) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    emerald: 'bg-emerald-50 border-emerald-200',
  };
  const s = (v: number) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
  return (
    <div className={`rounded-2xl border-2 p-3 ${tones[tone]}`}>
      <div className="font-extrabold text-slate-900 mb-2">{side}</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {sph != null && <div><span className="text-slate-500 font-bold">SPH:</span> <span className="font-mono font-extrabold">{s(sph)}</span></div>}
        {cyl != null && <div><span className="text-slate-500 font-bold">CYL:</span> <span className="font-mono font-extrabold">{s(cyl)}</span></div>}
        {axis != null && <div><span className="text-slate-500 font-bold">AXIS:</span> <span className="font-mono font-extrabold">{axis}°</span></div>}
        {add != null && add !== 0 && <div><span className="text-slate-500 font-bold">ADD:</span> <span className="font-mono font-extrabold">{s(add)}</span></div>}
      </div>
    </div>
  );
}
