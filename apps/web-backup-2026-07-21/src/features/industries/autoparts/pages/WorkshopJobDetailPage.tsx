import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, X, Ban, Sparkles, Car, User, Phone,
  Clock, Printer, DollarSign, CreditCard, Star, Calendar, Wrench,
  Package, ShieldCheck, ArrowRight,
} from 'lucide-react';
import { workshopJobsApi, type JobStatus } from '../api/workshop-jobs.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_FLOW: JobStatus[] = ['DRAFT', 'QUOTED', 'APPROVED', 'IN_PROGRESS', 'READY_FOR_TEST', 'QUALITY_CHECK', 'COMPLETED', 'DELIVERED'];

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-500' },
  QUOTED: { label: 'Quoted', color: 'bg-blue-500' },
  APPROVED: { label: 'Approved', color: 'bg-cyan-500' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-500' },
  WAITING_PARTS: { label: 'Waiting Parts', color: 'bg-orange-500' },
  WAITING_APPROVAL: { label: 'Waiting Approval', color: 'bg-purple-500' },
  READY_FOR_TEST: { label: 'Ready for Test', color: 'bg-violet-500' },
  QUALITY_CHECK: { label: 'Quality Check', color: 'bg-indigo-500' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-500' },
  DELIVERED: { label: 'Delivered', color: 'bg-green-600' },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500' },
  ON_HOLD: { label: 'On Hold', color: 'bg-slate-500' },
};

export default function WorkshopJobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);

  const { data: job, isLoading, refetch } = useQuery({
    queryKey: ['workshop-job', id],
    queryFn: () => workshopJobsApi.getOne(id!),
    enabled: !!id,
    refetchInterval: 60_000,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => workshopJobsApi.updateStatus(id!, status),
    onSuccess: () => { toast.success('Status updated'); queryClient.invalidateQueries({ queryKey: ['workshop-job', id] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => workshopJobsApi.updateStatus(id!, 'CANCELLED', { cancellationReason: reason }),
    onSuccess: () => { toast.success('Job cancelled'); refetch(); },
  });

  if (isLoading || !job) {
    return <div className="h-64 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />;
  }

  const statusCfg = STATUS_CONFIG[job.status];
  const currentIdx = STATUS_FLOW.indexOf(job.status);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;
  const remaining = job.total - job.paidAmount;
  const isFullyPaid = remaining <= 0.01;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/autoparts/jobs')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                {job.priority} priority
              </div>
              <h1 className="mt-1 text-3xl font-extrabold">{job.jobNumber}</h1>
              <div className="mt-1 flex items-center gap-2 flex-wrap text-sm">
                <span className={'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase text-white ' + statusCfg.color}>{statusCfg.label}</span>
                <span className="text-white/80 font-semibold">{format(new Date(job.receivedAt), 'dd MMM yyyy, HH:mm')}</span>
                {job.promisedAt && <span className="text-white/80 font-semibold">• Due: {format(new Date(job.promisedAt), 'dd MMM')}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
              <Printer className="h-4 w-4" />
              Print
            </button>
            {!isFullyPaid && job.status !== 'CANCELLED' && (
              <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowPayment(true)}>
                <DollarSign className="h-4 w-4" />
                Add Payment
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Status flow */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Job Workflow</h3>
          {nextStatus && !['CANCELLED'].includes(job.status) && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => statusMutation.mutate(nextStatus)} loading={statusMutation.isPending} className={STATUS_CONFIG[nextStatus].color + ' text-white'}>
                <ArrowRight className="h-3.5 w-3.5" />
                Mark {STATUS_CONFIG[nextStatus].label}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => statusMutation.mutate('WAITING_PARTS')} className="bg-orange-50 text-orange-700 border-orange-300">
                Waiting Parts
              </Button>
              <Button size="sm" variant="secondary" onClick={() => {
                const reason = prompt('Cancellation reason?');
                if (reason) cancelMutation.mutate(reason);
              }} className="bg-rose-50 text-rose-700 border-rose-300">
                <Ban className="h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STATUS_FLOW.map((s, i) => {
            const isActive = i <= currentIdx;
            const isCurrent = i === currentIdx;
            const cfg = STATUS_CONFIG[s];
            return (
              <div key={s} className="flex items-center shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div className={
                    'h-8 w-8 rounded-full flex items-center justify-center text-xs font-extrabold ' +
                    (isCurrent ? cfg.color + ' text-white ring-4 ring-orange-200 shadow' :
                     isActive ? cfg.color + ' text-white' : 'bg-slate-200 text-slate-500')
                  }>
                    {isActive && !isCurrent ? '✓' : i + 1}
                  </div>
                  <span className={'text-[9px] font-extrabold uppercase ' + (isActive ? 'text-slate-800' : 'text-slate-400')}>{cfg.label}</span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div className={'h-0.5 w-6 mx-1 ' + (i < currentIdx ? 'bg-orange-500' : 'bg-slate-200')} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <section className="space-y-4">
          {/* Vehicle */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border p-5">
            <h3 className="text-sm font-extrabold mb-3 flex items-center gap-2"><Car className="h-4 w-4 text-blue-600" />Vehicle</h3>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white">{job.registrationNumber}</div>
            <div className="text-sm font-bold text-slate-600">{job.makeName} {job.modelName} {job.year}</div>
            {job.odometerKm && <div className="text-xs text-slate-500 font-semibold">Odometer: {job.odometerKm} km</div>}
          </div>

          {/* Customer */}
          {(job.customerName || job.customerPhone) && (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border p-5">
              <h3 className="text-sm font-extrabold mb-3 flex items-center gap-2"><User className="h-4 w-4 text-emerald-600" />Customer</h3>
              <div className="font-extrabold text-slate-900 dark:text-white">{job.customerName}</div>
              {job.customerPhone && (
                <a href={'tel:' + job.customerPhone} className="flex items-center gap-1 text-blue-700 font-bold hover:underline">
                  <Phone className="h-3 w-3" />
                  {job.customerPhone}
                </a>
              )}
            </div>
          )}

          {/* Description */}
          {(job.customerComplaint || job.diagnosis || job.workDescription) && (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border p-5 space-y-3">
              <h3 className="text-sm font-extrabold flex items-center gap-2"><Wrench className="h-4 w-4 text-orange-600" />Job Description</h3>
              {job.customerComplaint && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-600">Complaint</div>
                  <p className="text-sm italic text-slate-700">{job.customerComplaint}</p>
                </div>
              )}
              {job.diagnosis && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-600">Diagnosis</div>
                  <p className="text-sm text-slate-700">{job.diagnosis}</p>
                </div>
              )}
              {job.workDescription && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-600">Work Description</div>
                  <p className="text-sm text-slate-700">{job.workDescription}</p>
                </div>
              )}
            </div>
          )}

          {/* Labor */}
          {job.laborItems?.length > 0 && (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border overflow-hidden">
              <div className="px-5 py-3 border-b bg-orange-50 dark:bg-orange-950/30">
                <h3 className="text-sm font-extrabold flex items-center gap-2"><Wrench className="h-4 w-4 text-orange-600" />Labor Items</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {job.laborItems.map((l: any) => (
                  <div key={l.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white">{l.description}</div>
                      <div className="text-xs text-slate-500 font-bold">
                        {l.hours} hr × {formatPKR(l.ratePerHour)}
                        {l.mechanicName && ' • ' + l.mechanicName}
                      </div>
                    </div>
                    <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(l.total)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parts */}
          {job.partsUsed?.length > 0 && (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border overflow-hidden">
              <div className="px-5 py-3 border-b bg-amber-50 dark:bg-amber-950/30">
                <h3 className="text-sm font-extrabold flex items-center gap-2"><Package className="h-4 w-4 text-amber-600" />Parts Used</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {job.partsUsed.map((p: any) => (
                  <div key={p.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold">{p.partName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-extrabold uppercase">{p.condition}</span>
                        {p.warrantyMonths > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                            <ShieldCheck className="h-2 w-2" />
                            {p.warrantyMonths}m
                          </span>
                        )}
                      </div>
                      {p.partNumber && <div className="text-[10px] font-mono font-bold text-slate-500">#{p.partNumber}</div>}
                      <div className="text-xs text-slate-500 font-bold">Qty {p.quantity} × {formatPKR(p.unitPrice)}</div>
                    </div>
                    <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.total)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External */}
          {job.externalWork?.length > 0 && (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border overflow-hidden">
              <div className="px-5 py-3 border-b bg-violet-50 dark:bg-violet-950/30">
                <h3 className="text-sm font-extrabold">🏢 External Work</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {job.externalWork.map((e: any) => (
                  <div key={e.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-extrabold">{e.description}</div>
                      {e.vendorName && <div className="text-xs text-slate-500 font-bold">Vendor: {e.vendorName}</div>}
                    </div>
                    <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(e.total)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-orange-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase font-extrabold text-white/70 mb-3">💰 Bill Summary</div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Labor</span><span className="font-bold tabular-nums">{formatPKR(job.laborTotal)}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Parts</span><span className="font-bold tabular-nums">{formatPKR(job.partsTotal)}</span></div>
                <div className="flex justify-between"><span className="text-white/70">External</span><span className="font-bold tabular-nums">{formatPKR(job.externalTotal)}</span></div>
                {job.taxAmount > 0 && <div className="flex justify-between"><span className="text-white/70">Tax</span><span className="font-bold tabular-nums">{formatPKR(job.taxAmount)}</span></div>}
                {job.discount > 0 && <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(job.discount)}</span></div>}
              </div>
              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(job.total)}</span>
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/70">Paid</span>
                  <span className="font-extrabold text-emerald-300 tabular-nums">{formatPKR(job.paidAmount)}</span>
                </div>
                {remaining > 0 && (
                  <div className="flex justify-between">
                    <span className="text-amber-300 font-extrabold">Remaining</span>
                    <span className="font-extrabold text-amber-300 tabular-nums">{formatPKR(remaining)}</span>
                  </div>
                )}
                {isFullyPaid && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/30 text-emerald-200 text-xs font-extrabold">
                    <CheckCircle2 className="h-3 w-3" />
                    PAID IN FULL
                  </div>
                )}
              </div>
              {!isFullyPaid && job.status !== 'CANCELLED' && (
                <Button size="lg" className="w-full mt-4 bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowPayment(true)}>
                  <CreditCard className="h-4 w-4" />
                  Add Payment
                </Button>
              )}
            </div>

            {(job.payments?.length ?? 0) > 0 && (
              <div className="rounded-3xl bg-white dark:bg-neutral-900 border overflow-hidden">
                <div className="px-4 py-3 border-b">
                  <h3 className="text-sm font-bold">Payment History</h3>
                </div>
                <div className="divide-y">
                  {(job.payments ?? []).map((p: any) => (
                    <div key={p.id} className="p-3 text-xs">
                      <div className="flex justify-between font-bold">
                        <span>{p.paymentMethod}</span>
                        <span className="text-emerald-700 tabular-nums">{formatPKR(p.amount)}</span>
                      </div>
                      <div className="text-slate-500 mt-0.5">{format(new Date(p.paidAt), 'dd MMM, HH:mm')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {showPayment && (
        <PaymentModal jobId={id!} remaining={remaining} onClose={() => setShowPayment(false)} onDone={() => { setShowPayment(false); refetch(); }} />
      )}
    </div>
  );
}

function PaymentModal({ jobId, remaining, onClose, onDone }: any) {
  const [amount, setAmount] = useState(remaining);
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');

  const payMutation = useMutation({
    mutationFn: () => workshopJobsApi.addPayment(jobId, { amount, paymentMethod: method, reference }),
    onSuccess: () => { toast.success('Payment added'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-orange-50 dark:bg-orange-950/30 flex items-center justify-between">
          <h3 className="font-extrabold">Add Payment</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-orange-700 mb-1 block">Amount *</label>
            <input type="number" step="0.01" autoFocus value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-orange-300 bg-orange-50 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-orange-500" />
            <div className="mt-1 flex gap-1">
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <button key={f} onClick={() => setAmount(Number((remaining * f).toFixed(2)))} className="flex-1 h-8 rounded-lg bg-slate-100 text-xs font-extrabold hover:bg-slate-200">
                  {(f * 100).toFixed(0)}%
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Method</label>
            <div className="grid grid-cols-3 gap-2">
              {['CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK', 'OTHER'].map((m) => (
                <button key={m} onClick={() => setMethod(m)} className={
                  'p-2 rounded-lg border-2 text-xs font-extrabold ' +
                  (method === m ? 'border-orange-500 bg-orange-50 text-orange-800' : 'border-slate-200 bg-white')
                }>{m}</button>
              ))}
            </div>
          </div>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference (optional)" className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-orange-600 to-red-700" onClick={() => payMutation.mutate()} loading={payMutation.isPending} disabled={amount <= 0}>
              <CheckCircle2 className="h-4 w-4" />
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
