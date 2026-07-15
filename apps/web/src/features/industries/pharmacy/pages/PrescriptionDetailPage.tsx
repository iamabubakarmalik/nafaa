import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, X, Ban, ClipboardCheck, Package, Save,
  Sparkles, User, Phone, Stethoscope, Award, FileText, Repeat,
  ShieldCheck, Calendar, Pill, AlertCircle, Printer, Eye,
} from 'lucide-react';
import { prescriptionsApi } from '../api/prescriptions.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-blue-500', VERIFIED: 'bg-cyan-500', PARTIALLY_DISPENSED: 'bg-amber-500',
  DISPENSED: 'bg-emerald-600', REJECTED: 'bg-rose-500', CANCELLED: 'bg-slate-500',
};

export default function PrescriptionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDispense, setShowDispense] = useState(false);

  const { data: rx, isLoading, refetch } = useQuery({
    queryKey: ['prescription', id],
    queryFn: () => prescriptionsApi.getOne(id!),
    enabled: !!id,
  });

  const verifyMutation = useMutation({
    mutationFn: (notes?: string) => prescriptionsApi.verify(id!, notes),
    onSuccess: () => {
      toast.success('Prescription verified');
      refetch();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => prescriptionsApi.reject(id!, reason),
    onSuccess: () => {
      toast.success('Prescription rejected');
      refetch();
    },
  });

  const refillMutation = useMutation({
    mutationFn: () => prescriptionsApi.refill(id!),
    onSuccess: (newRx) => {
      toast.success('Refill created: ' + newRx.prescriptionNumber);
      navigate('/pharmacy/prescriptions/' + newRx.id);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Refill failed'),
  });

  if (isLoading || !rx) {
    return <div className="h-64 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/pharmacy/prescriptions')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                {rx.type.replace('_', ' ')}
              </div>
              <h1 className="mt-1 text-3xl font-extrabold">{rx.prescriptionNumber}</h1>
              <div className="mt-1 flex items-center gap-2 flex-wrap text-sm">
                <span className={'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase text-white ' + STATUS_COLORS[rx.status]}>
                  {rx.status}
                </span>
                <span className="text-white/80 font-semibold">
                  {format(new Date(rx.createdAt), 'dd MMM yyyy, HH:mm')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
              <Printer className="h-4 w-4" />
              Print
            </button>
            {rx.status === 'PENDING' && (
              <>
                <Button
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => {
                    const notes = prompt('Verification notes (optional):');
                    verifyMutation.mutate(notes || undefined);
                  }}
                  loading={verifyMutation.isPending}
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Verify
                </Button>
                <Button
                  variant="secondary"
                  className="bg-rose-600 text-white hover:bg-rose-700 border-rose-600"
                  onClick={() => {
                    const reason = prompt('Rejection reason:');
                    if (reason) rejectMutation.mutate(reason);
                  }}
                >
                  <Ban className="h-4 w-4" />
                  Reject
                </Button>
              </>
            )}
            {(rx.status === 'VERIFIED' || rx.status === 'PARTIALLY_DISPENSED') && (
              <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowDispense(true)}>
                <Package className="h-4 w-4" />
                Dispense
              </Button>
            )}
            {rx.status === 'DISPENSED' && rx.isRefillable && rx.refillsUsed < rx.refillsAllowed && (
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => refillMutation.mutate()}
                loading={refillMutation.isPending}
              >
                <Repeat className="h-4 w-4" />
                Create Refill
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <section className="space-y-6">
          {/* Patient & Doctor */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-violet-600" />
                Patient
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-semibold">Name:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{rx.patientName || '—'}</span>
                </div>
                {rx.patientPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <a href={'tel:' + rx.patientPhone} className="font-bold text-blue-700 hover:underline">{rx.patientPhone}</a>
                  </div>
                )}
                {rx.patientCnic && (
                  <div className="text-xs text-slate-500 font-mono font-bold">CNIC: {rx.patientCnic}</div>
                )}
                <div className="text-xs text-slate-500 font-semibold">
                  {rx.patientAge && rx.patientAge + 'y '}
                  {rx.patientGender && '• ' + rx.patientGender + ' '}
                  {rx.patientWeight && '• ' + rx.patientWeight + 'kg'}
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-emerald-600" />
                Doctor
              </h3>
              <div className="space-y-1 text-sm">
                <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  {rx.doctor?.name || rx.doctorName || '—'}
                  {rx.doctor?.isVerified && <Award className="h-3.5 w-3.5 text-emerald-500" />}
                </div>
                <div className="text-xs text-slate-500 font-mono font-bold">
                  Reg: {rx.doctor?.registrationNumber || rx.doctorRegNumber || '—'}
                </div>
                {(rx.doctor?.specialization || rx.doctorSpeciality) && (
                  <div className="text-xs text-slate-600 font-bold">{rx.doctor?.specialization || rx.doctorSpeciality}</div>
                )}
                {rx.hospitalName && (
                  <div className="text-xs text-slate-500 font-semibold">🏥 {rx.hospitalName}</div>
                )}
              </div>
            </div>
          </div>

          {/* Diagnosis */}
          {(rx.chiefComplaint || rx.diagnosis) && (
            <div className="rounded-3xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 p-4">
              {rx.chiefComplaint && (
                <div className="mb-2">
                  <div className="text-[10px] uppercase font-extrabold text-amber-700">Chief Complaint</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{rx.chiefComplaint}</div>
                </div>
              )}
              {rx.diagnosis && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-amber-700">Diagnosis</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{rx.diagnosis}</div>
                </div>
              )}
            </div>
          )}

          {/* Items */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pill className="h-5 w-5 text-violet-600" />
                Prescribed Medicines
              </h3>
              <span className="text-xs font-extrabold text-slate-500">{rx.items.length} items</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-neutral-800">
              {rx.items.map((it: any) => (
                <div key={it.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-white text-base">{it.medicineName}</span>
                        {it.strength && <span className="px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950/40 text-violet-700 text-[10px] font-extrabold">{it.strength}</span>}
                        {it.isDispensed && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                            <CheckCircle2 className="h-2 w-2" />
                            Dispensed
                          </span>
                        )}
                        {it.isSubstituted && (
                          <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 text-[10px] font-extrabold uppercase">Substituted</span>
                        )}
                      </div>
                      {it.saltName && (
                        <div className="text-xs text-slate-500 font-bold mt-0.5">{it.saltName}</div>
                      )}
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {it.dose && (
                          <div><span className="text-slate-500 font-semibold">Dose:</span> <span className="font-extrabold">{it.dose}</span></div>
                        )}
                        {it.frequency && (
                          <div><span className="text-slate-500 font-semibold">Freq:</span> <span className="font-extrabold">{it.frequency}</span></div>
                        )}
                        {it.duration && (
                          <div><span className="text-slate-500 font-semibold">Days:</span> <span className="font-extrabold">{it.duration}</span></div>
                        )}
                        {it.route && (
                          <div><span className="text-slate-500 font-semibold">Route:</span> <span className="font-extrabold">{it.route}</span></div>
                        )}
                      </div>
                      {it.instructions && (
                        <div className="mt-1 text-xs italic text-amber-700">📝 {it.instructions}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {it.dispensedQty}/{it.prescribedQty}
                      </div>
                      <div className="text-[10px] font-extrabold text-slate-500 uppercase">{it.unit}</div>
                      {it.totalPrice > 0 && (
                        <div className="mt-1 text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(it.totalPrice)}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rx Images */}
          {rx.imageUrls?.length > 0 && (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-2">Prescription Images</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {rx.imageUrls.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden border border-slate-200 hover:border-violet-500 transition">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right sidebar */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            {/* SUMMARY */}
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-violet-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3">Bill Summary</div>
              <div className="text-3xl font-extrabold tabular-nums">{formatPKR(rx.totalAmount)}</div>
              <div className="mt-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-white/70">Items dispensed</span>
                  <span className="font-extrabold">{rx.items.filter((it: any) => it.isDispensed).length}/{rx.items.length}</span>
                </div>
                {rx.isRefillable && (
                  <div className="flex justify-between">
                    <span className="text-white/70">Refills</span>
                    <span className="font-extrabold text-emerald-300">{rx.refillsAllowed - rx.refillsUsed}/{rx.refillsAllowed} left</span>
                  </div>
                )}
                {rx.isInsuranceClaim && (
                  <div className="pt-2 mt-2 border-t border-white/20">
                    <div className="text-[10px] uppercase font-extrabold text-blue-300">Insurance</div>
                    <div className="text-xs font-bold">{rx.insuranceProvider}</div>
                    {rx.insuranceApprovalCode && (
                      <div className="text-[10px] font-mono text-white/70">Code: {rx.insuranceApprovalCode}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* VERIFICATION INFO */}
            {rx.verifiedAt && (
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800 p-4">
                <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm">
                  <ClipboardCheck className="h-4 w-4" />
                  Verified
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">
                  {format(new Date(rx.verifiedAt), 'dd MMM, HH:mm')}
                </div>
                {rx.verificationNotes && (
                  <div className="mt-1 text-xs italic text-slate-700">{rx.verificationNotes}</div>
                )}
              </div>
            )}

            {/* REJECTION */}
            {rx.status === 'REJECTED' && rx.rejectionReason && (
              <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-800 p-4">
                <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm">
                  <Ban className="h-4 w-4" />
                  Rejected
                </div>
                <div className="text-xs text-rose-600 font-semibold mt-1">{rx.rejectionReason}</div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {showDispense && (
        <DispenseModal
          rx={rx}
          onClose={() => setShowDispense(false)}
          onDone={() => { setShowDispense(false); refetch(); }}
        />
      )}
    </div>
  );
}

function DispenseModal({ rx, onClose, onDone }: any) {
  const [dispenseItems, setDispenseItems] = useState<Record<string, { dispensedQty: number; unitPrice: number; productId?: string; batchId?: string }>>(() => {
    const initial: any = {};
    rx.items.forEach((it: any) => {
      if (!it.isDispensed) {
        initial[it.id] = {
          dispensedQty: it.prescribedQty - it.dispensedQty,
          unitPrice: it.unitPrice || 0,
          productId: it.productId,
          batchId: it.batchId,
        };
      }
    });
    return initial;
  });

  const dispenseMutation = useMutation({
    mutationFn: () => {
      const items = Object.entries(dispenseItems)
        .filter(([_, v]) => v.dispensedQty > 0)
        .map(([itemId, v]) => ({ itemId, ...v }));
      return prescriptionsApi.dispense(rx.id, items);
    },
    onSuccess: () => {
      toast.success('Dispensed successfully');
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const total = Object.values(dispenseItems).reduce((s, v) => s + v.dispensedQty * v.unitPrice, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-violet-50 dark:bg-violet-950/30 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">Dispense Medicines</h3>
            <p className="text-xs text-slate-500 font-semibold">{rx.prescriptionNumber} • {rx.patientName || 'Patient'}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {rx.items.map((it: any) => {
            const state = dispenseItems[it.id];
            if (!state) return (
              <div key={it.id} className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <div className="flex-1">
                  <div className="font-extrabold text-sm">{it.medicineName}</div>
                  <div className="text-xs text-emerald-700 font-bold">Already dispensed</div>
                </div>
              </div>
            );

            const remaining = it.prescribedQty - it.dispensedQty;
            return (
              <div key={it.id} className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-white">{it.medicineName} {it.strength}</div>
                    <div className="text-xs text-slate-500 font-semibold">
                      Prescribed: {it.prescribedQty} {it.unit} • Already: {it.dispensedQty} • Remaining: {remaining}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Dispense Qty</label>
                    <input
                      type="number" step="0.5" min="0" max={remaining}
                      value={state.dispensedQty}
                      onChange={(e) => setDispenseItems({
                        ...dispenseItems,
                        [it.id]: { ...state, dispensedQty: Number(e.target.value) },
                      })}
                      className="h-10 w-full rounded-lg border-2 border-violet-200 bg-violet-50 dark:bg-violet-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Unit Price (Rs)</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={state.unitPrice}
                      onChange={(e) => setDispenseItems({
                        ...dispenseItems,
                        [it.id]: { ...state, unitPrice: Number(e.target.value) },
                      })}
                      className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="text-right text-sm font-extrabold text-emerald-700 tabular-nums">
                  = {formatPKR(state.dispensedQty * state.unitPrice)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t-2 border-slate-200 dark:border-neutral-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-extrabold text-slate-600">Total</span>
            <span className="text-2xl font-extrabold text-emerald-700 tabular-nums">{formatPKR(total)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700"
              onClick={() => dispenseMutation.mutate()}
              loading={dispenseMutation.isPending}
              disabled={total <= 0}
            >
              <Package className="h-4 w-4" />
              Confirm Dispense
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
