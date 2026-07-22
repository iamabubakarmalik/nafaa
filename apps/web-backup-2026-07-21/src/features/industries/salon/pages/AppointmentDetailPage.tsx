import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, X, Ban, Sparkles, User, Phone, Mail,
  Clock, Printer, DollarSign, CreditCard, Star, Calendar,
  Scissors, Award, Timer, MessageSquare, ArrowRight, Zap,
} from 'lucide-react';
import { appointmentsApi, type AppointmentStatus } from '../api/appointments.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format, differenceInMinutes } from 'date-fns';

const STATUS_FLOW: AppointmentStatus[] = ['CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; textColor: string; icon: any }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-500', textColor: 'text-slate-700', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-500', textColor: 'text-blue-700', icon: CheckCircle2 },
  ARRIVED: { label: 'Arrived', color: 'bg-cyan-500', textColor: 'text-cyan-700', icon: User },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-500', textColor: 'text-amber-700', icon: Timer },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-600', textColor: 'text-emerald-700', icon: CheckCircle2 },
  NO_SHOW: { label: 'No Show', color: 'bg-orange-600', textColor: 'text-orange-700', icon: Ban },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500', textColor: 'text-rose-700', icon: X },
  RESCHEDULED: { label: 'Rescheduled', color: 'bg-violet-500', textColor: 'text-violet-700', icon: Calendar },
};

export default function AppointmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);

  const { data: apt, isLoading, refetch } = useQuery({
    queryKey: ['salon-appointment', id],
    queryFn: () => appointmentsApi.getOne(id!),
    enabled: !!id,
    refetchInterval: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => appointmentsApi.updateStatus(id!, status),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['salon-appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['salon-appointments'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => appointmentsApi.updateStatus(id!, 'CANCELLED', reason),
    onSuccess: () => { toast.success('Appointment cancelled'); refetch(); },
  });

  if (isLoading || !apt) {
    return <div className="h-64 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />;
  }

  const statusCfg = STATUS_CONFIG[apt.status];
  const currentIdx = STATUS_FLOW.indexOf(apt.status);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;
  const remaining = apt.total - apt.paidAmount;
  const isFullyPaid = remaining <= 0.01;
  const startDate = new Date(apt.scheduledStart);
  const minsToStart = differenceInMinutes(startDate, new Date());

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/salon/appointments')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                {apt.appointmentNumber}
              </div>
              <h1 className="mt-1 text-3xl font-extrabold">{apt.customerName || 'Walk-in'}</h1>
              <div className="mt-1 flex items-center gap-2 flex-wrap text-sm">
                <span className={'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase text-white ' + statusCfg.color}>
                  {statusCfg.label}
                </span>
                <span className="text-white/80 font-semibold inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(startDate, 'dd MMM yyyy, HH:mm')}
                </span>
                {minsToStart > 0 && minsToStart < 120 && apt.status === 'CONFIRMED' && (
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-xs font-extrabold uppercase animate-pulse">
                    IN {minsToStart} MIN
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
              <Printer className="h-4 w-4" />
              Print
            </button>
            {['CONFIRMED', 'RESCHEDULED'].includes(apt.status) && (
              <Button variant="secondary" onClick={() => setShowReschedule(true)} className="bg-white/15 hover:bg-white/25 text-white border-white/20">
                <Calendar className="h-4 w-4" />
                Reschedule
              </Button>
            )}
            {!isFullyPaid && apt.status !== 'CANCELLED' && (
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
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Appointment Progress</h3>
          {nextStatus && !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(apt.status) && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => statusMutation.mutate(nextStatus)} loading={statusMutation.isPending} className={STATUS_CONFIG[nextStatus].color + ' text-white'}>
                <ArrowRight className="h-3.5 w-3.5" />
                Mark {STATUS_CONFIG[nextStatus].label}
              </Button>
              {apt.status !== 'COMPLETED' && (
                <>
                  <Button size="sm" variant="secondary" onClick={() => statusMutation.mutate('NO_SHOW')} className="bg-orange-50 text-orange-700 border-orange-300">
                    <Ban className="h-3.5 w-3.5" />
                    No Show
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => {
                    const reason = prompt('Cancellation reason?');
                    if (reason) cancelMutation.mutate(reason);
                  }} className="bg-rose-50 text-rose-700 border-rose-300">
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          )}
          {apt.status === 'COMPLETED' && !apt.customerRating && (
            <Button size="sm" onClick={() => setShowRating(true)} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
              <Star className="h-3.5 w-3.5" />
              Add Rating
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {STATUS_FLOW.map((s, i) => {
            const isActive = i <= currentIdx;
            const isCurrent = i === currentIdx;
            const cfg = STATUS_CONFIG[s];
            const StatusIcon = cfg.icon;
            return (
              <div key={s} className="flex items-center shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div className={
                    'h-10 w-10 rounded-full flex items-center justify-center transition ' +
                    (isCurrent ? cfg.color + ' text-white ring-4 ring-pink-200 dark:ring-pink-900 shadow' :
                     isActive ? cfg.color + ' text-white' : 'bg-slate-200 dark:bg-neutral-700 text-slate-500')
                  }>
                    {isActive && !isCurrent ? <CheckCircle2 className="h-5 w-5" /> : <StatusIcon className="h-4 w-4" />}
                  </div>
                  <span className={
                    'text-[10px] font-extrabold uppercase ' +
                    (isActive ? cfg.textColor : 'text-slate-400')
                  }>
                    {cfg.label}
                  </span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div className={'h-0.5 w-12 mx-1 ' + (i < currentIdx ? 'bg-pink-500' : 'bg-slate-200 dark:bg-neutral-700')} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <section className="space-y-4">
          {/* Customer */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-pink-600" />
              Customer Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="font-extrabold text-slate-900 dark:text-white text-base">{apt.customerName || 'Walk-in'}</div>
              {apt.customerPhone && (
                <a href={'tel:' + apt.customerPhone} className="flex items-center gap-1 text-blue-700 font-bold hover:underline">
                  <Phone className="h-3 w-3" />
                  {apt.customerPhone}
                </a>
              )}
              {apt.customerEmail && (
                <a href={'mailto:' + apt.customerEmail} className="flex items-center gap-1 text-blue-700 font-bold hover:underline">
                  <Mail className="h-3 w-3" />
                  {apt.customerEmail}
                </a>
              )}
              {apt.customerNotes && (
                <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 p-2 text-xs italic text-amber-800">
                  📝 {apt.customerNotes}
                </div>
              )}
            </div>
          </div>

          {/* Timing */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Timing
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-slate-500">Scheduled</div>
                <div className="font-extrabold">{format(startDate, 'HH:mm')} – {format(new Date(apt.scheduledEnd), 'HH:mm')}</div>
              </div>
              {apt.actualStart && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-500">Actual Start</div>
                  <div className="font-extrabold text-emerald-700">{format(new Date(apt.actualStart), 'HH:mm')}</div>
                </div>
              )}
              {apt.actualEnd && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-500">Actual End</div>
                  <div className="font-extrabold text-emerald-700">{format(new Date(apt.actualEnd), 'HH:mm')}</div>
                </div>
              )}
              {apt.arrivedAt && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-500">Arrived At</div>
                  <div className="font-extrabold text-cyan-700">{format(new Date(apt.arrivedAt), 'HH:mm')}</div>
                </div>
              )}
            </div>
          </div>

          {/* Services */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scissors className="h-5 w-5 text-fuchsia-600" />
                Services
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-xs font-extrabold">
                {apt.services.length} services
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-neutral-800">
              {apt.services.map((svc: any) => (
                <div key={svc.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-slate-900 dark:text-white">{svc.serviceName}</div>
                      {svc.staffName && (
                        <div className="mt-1 text-xs font-bold text-violet-600 inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Served by: {svc.staffName}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-slate-500 font-semibold">
                        {svc.durationMinutes} min • Base price {formatPKR(svc.price)}
                      </div>
                      {svc.commissionAmount > 0 && (
                        <div className="text-xs font-extrabold text-amber-700 inline-flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          Commission: {formatPKR(svc.commissionAmount)}
                        </div>
                      )}
                      {svc.notes && (
                        <div className="mt-1 text-xs italic text-amber-700">📝 {svc.notes}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {svc.discount > 0 && (
                        <div className="text-[10px] font-bold text-rose-700">-{formatPKR(svc.discount)} off</div>
                      )}
                      <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(svc.total)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rating & feedback */}
          {apt.customerRating && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={'h-5 w-5 ' + (n <= (apt.customerRating || 0) ? 'text-amber-500 fill-amber-500' : 'text-slate-300')} />
                  ))}
                </div>
                <span className="font-extrabold text-amber-900">{apt.customerRating}/5</span>
              </div>
              {apt.customerFeedback && (
                <p className="text-sm italic text-slate-700">"{apt.customerFeedback}"</p>
              )}
            </div>
          )}

          {/* Cancellation reason */}
          {apt.cancellationReason && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-800 p-4">
              <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm">
                <Ban className="h-4 w-4" />
                Cancelled
              </div>
              <p className="mt-1 text-xs text-slate-700">{apt.cancellationReason}</p>
            </div>
          )}
        </section>

        {/* Bill Summary sidebar */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-pink-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3">💰 Bill Summary</div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(apt.subtotal)}</span></div>
                {apt.serviceCharge > 0 && (
                  <div className="flex justify-between"><span className="text-white/70">Service Charge</span><span className="font-bold tabular-nums">{formatPKR(apt.serviceCharge)}</span></div>
                )}
                {apt.taxAmount > 0 && (
                  <div className="flex justify-between"><span className="text-white/70">Tax</span><span className="font-bold tabular-nums">{formatPKR(apt.taxAmount)}</span></div>
                )}
                {apt.tip > 0 && (
                  <div className="flex justify-between text-amber-300"><span>Tip</span><span className="font-bold tabular-nums">{formatPKR(apt.tip)}</span></div>
                )}
                {apt.discount > 0 && (
                  <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(apt.discount)}</span></div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(apt.total)}</span>
              </div>

              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/70">Paid</span>
                  <span className="font-extrabold text-emerald-300 tabular-nums">{formatPKR(apt.paidAmount)}</span>
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

              {!isFullyPaid && apt.status !== 'CANCELLED' && (
                <Button size="lg" className="w-full mt-4 bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowPayment(true)}>
                  <CreditCard className="h-4 w-4" />
                  Add Payment
                </Button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {showPayment && (
        <PaymentModal apptId={id!} remaining={remaining} onClose={() => setShowPayment(false)} onDone={() => { setShowPayment(false); refetch(); }} />
      )}
      {showRating && (
        <RatingModal apptId={id!} onClose={() => setShowRating(false)} onDone={() => { setShowRating(false); refetch(); }} />
      )}
      {showReschedule && (
        <RescheduleModal apptId={id!} scheduledStart={apt.scheduledStart} scheduledEnd={apt.scheduledEnd} onClose={() => setShowReschedule(false)} onDone={() => { setShowReschedule(false); refetch(); }} />
      )}
    </div>
  );
}

function PaymentModal({ apptId, remaining, onClose, onDone }: any) {
  const [amount, setAmount] = useState(remaining);
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');

  const payMutation = useMutation({
    mutationFn: () => appointmentsApi.addPayment(apptId, { amount, paymentMethod: method, reference }),
    onSuccess: () => { toast.success('Payment added'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-pink-50 dark:bg-pink-950/30 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 dark:text-white">Add Payment</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-pink-700 mb-1 block">Amount *</label>
            <input type="number" step="0.01" autoFocus value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-pink-300 bg-pink-50 dark:bg-pink-950/30 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-pink-500" />
            <div className="mt-1 flex gap-1">
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <button key={f} onClick={() => setAmount(Number((remaining * f).toFixed(2)))} className="flex-1 h-8 rounded-lg bg-slate-100 dark:bg-neutral-800 text-xs font-extrabold hover:bg-slate-200">
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
                  (method === m ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/40 text-pink-800' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800')
                }>{m}</button>
              ))}
            </div>
          </div>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference (optional)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-pink-600 to-rose-700" onClick={() => payMutation.mutate()} loading={payMutation.isPending} disabled={amount <= 0}>
              <CheckCircle2 className="h-4 w-4" />
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RatingModal({ apptId, onClose, onDone }: any) {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');

  const rateMutation = useMutation({
    mutationFn: () => appointmentsApi.rate(apptId, rating, feedback || undefined),
    onSuccess: () => { toast.success('Rating submitted'); onDone(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 dark:text-white">Rate Service</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-center">
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} className="transition-transform hover:scale-110">
                  <Star className={'h-12 w-12 ' + (n <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300')} />
                </button>
              ))}
            </div>
            <div className="text-2xl font-extrabold text-amber-700">{rating}/5</div>
          </div>
          <textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback (optional)..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600" onClick={() => rateMutation.mutate()} loading={rateMutation.isPending}>
              <Star className="h-4 w-4" />
              Submit Rating
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RescheduleModal({ apptId, scheduledStart, scheduledEnd, onClose, onDone }: any) {
  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);
  const [date, setDate] = useState(start.toISOString().split('T')[0]);
  const [time, setTime] = useState(start.toTimeString().slice(0, 5));
  const [reason, setReason] = useState('');

  const duration = differenceInMinutes(end, start);

  const rescheduleMutation = useMutation({
    mutationFn: () => {
      const newStart = new Date(date + 'T' + time);
      const newEnd = new Date(newStart.getTime() + duration * 60_000);
      return appointmentsApi.reschedule(apptId, {
        scheduledStart: newStart.toISOString(),
        scheduledEnd: newEnd.toISOString(),
        reason,
      });
    },
    onSuccess: () => { toast.success('Rescheduled'); onDone(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-violet-50 dark:bg-violet-950/30 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 dark:text-white">Reschedule Appointment</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">New Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="h-11 w-full rounded-xl border-2 border-violet-300 bg-violet-50 dark:bg-violet-950/30 px-3 text-sm font-extrabold focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">New Time *</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 w-full rounded-xl border-2 border-violet-300 bg-violet-50 dark:bg-violet-950/30 px-3 text-sm font-extrabold focus:outline-none focus:border-violet-500" />
            </div>
          </div>
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rescheduling..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700" onClick={() => rescheduleMutation.mutate()} loading={rescheduleMutation.isPending}>
              <Calendar className="h-4 w-4" />
              Reschedule
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
