import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CreditCard, User, Phone, Calendar, DollarSign,
  CheckCircle2, AlertTriangle, Clock, Ban, Trash2, Printer,
  MessageCircle, AlertCircle, Banknote,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import {
  emiApi,
  type EmiInstallmentStatus,
  EMI_STATUS_LABELS,
  EMI_STATUS_COLORS,
  INSTALLMENT_STATUS_LABELS,
  INSTALLMENT_STATUS_COLORS,
} from '../api/emi.api';
import { RecordEmiPaymentModal } from '../components/RecordEmiPaymentModal';

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(iso));

export default function EmiPlanDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [paymentInstallment, setPaymentInstallment] = useState<{
    id: string;
    number: number;
    amount: number;
    paid: number;
  } | null>(null);

  const { data: plan, isLoading } = useQuery({
    queryKey: ['emi-plan', id],
    queryFn: () => emiApi.getOne(id!),
    enabled: !!id,
  });

  const waiveMutation = useMutation({
    mutationFn: ({ installmentId, reason }: { installmentId: string; reason?: string }) =>
      emiApi.waiveInstallment(id!, installmentId, reason),
    onSuccess: () => {
      toast.success('Installment waived');
      queryClient.invalidateQueries({ queryKey: ['emi-plan', id] });
      queryClient.invalidateQueries({ queryKey: ['emi-plans'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const defaultMutation = useMutation({
    mutationFn: (reason?: string) => emiApi.markDefaulted(id!, reason),
    onSuccess: () => {
      toast.success('Plan marked as defaulted');
      queryClient.invalidateQueries({ queryKey: ['emi-plan', id] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => emiApi.cancel(id!, reason),
    onSuccess: () => {
      toast.success('Plan cancelled');
      queryClient.invalidateQueries({ queryKey: ['emi-plan', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="inline-block h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-3xl bg-white border border-slate-200 p-12 text-center">
        <AlertCircle className="h-12 w-12 text-rose-400 mx-auto" />
        <h3 className="mt-3 font-bold text-slate-900">Plan not found</h3>
        <Link to="/emi-plans" className="mt-4 text-sm font-bold text-indigo-600 hover:underline inline-block">
          ← Back to EMI Plans
        </Link>
      </div>
    );
  }

  const statusColors = EMI_STATUS_COLORS[plan.status];
  const progressPercent = plan.financedAmount > 0
    ? Math.min(((plan.paidAmount - plan.downPayment) / plan.financedAmount) * 100, 100)
    : 0;

  const sendReminder = () => {
    if (!plan.customerPhone) return toast.error('Customer phone not available');
    const phone = plan.customerPhone.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    const msg = `*EMI Reminder*\n\nAssalamu Alaikum ${plan.customerName},\n\nPlan: *${plan.planNumber}*\n${plan.overdueAmount > 0 ? `Overdue: *${formatPKR(plan.overdueAmount)}*\n` : ''}Remaining: *${formatPKR(plan.remainingAmount)}*\nNext Due: ${plan.nextDueDate ? formatDate(plan.nextDueDate) : '—'}\n\nShukriya!`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <Link to="/emi-plans" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600">
          <ArrowLeft className="h-4 w-4" /> Back to EMI Plans
        </Link>
        <div className="flex gap-2 flex-wrap">
          {plan.customerPhone && (
            <Button variant="secondary" onClick={sendReminder}>
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
          )}
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <CreditCard className="h-3 w-3" /> EMI Plan
            </div>
            <h1 className="mt-3 text-3xl font-extrabold font-mono">{plan.planNumber}</h1>
            <div className="mt-2 text-sm text-white/80 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> {plan.customerName}
              </span>
              {plan.customerPhone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {plan.customerPhone}
                </span>
              )}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
            {EMI_STATUS_LABELS[plan.status]}
          </span>
        </div>
      </section>

      {/* Action bar — Status transitions */}
      {plan.status === 'ACTIVE' && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 p-4">
          <div className="text-xs font-bold text-slate-600 uppercase mb-2">Quick Actions</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const reason = prompt('Reason for default?');
                if (reason !== null) defaultMutation.mutate(reason || undefined);
              }}
              className="px-3 py-2 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold inline-flex items-center gap-1"
            >
              <AlertTriangle className="h-3 w-3" /> Mark Defaulted
            </button>
            <button
              onClick={() => {
                const reason = prompt('Reason for cancellation?');
                if (reason !== null) cancelMutation.mutate(reason || undefined);
              }}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1"
            >
              <Ban className="h-3 w-3" /> Cancel Plan
            </button>
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr_400px] gap-4">
        {/* Main column — Installments */}
        <div className="space-y-4">
          <div className="rounded-3xl bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                Installments ({plan.paidInstallmentCount}/{plan.installmentCount} paid)
              </h3>
            </div>

            <div className="space-y-2">
              {plan.installments.map((inst) => {
                const status = inst.status as EmiInstallmentStatus;
                const colors = INSTALLMENT_STATUS_COLORS[status];
                const balance = Number(inst.amount) - Number(inst.paidAmount);
                const isPaid = status === 'PAID';
                const isWaived = status === 'WAIVED';
                const isOverdue = status === 'OVERDUE' || (
                  status === 'PENDING' && new Date(inst.dueDate) < new Date()
                );

                return (
                  <div
                    key={inst.id}
                    className={`rounded-xl border-2 p-3 ${colors.bg} ${colors.border}`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                          isPaid
                            ? 'bg-emerald-600 text-white'
                            : isWaived
                              ? 'bg-slate-400 text-white'
                              : isOverdue
                                ? 'bg-rose-600 text-white'
                                : 'bg-white border-2 border-current text-current'
                        } ${colors.text}`}>
                          {isPaid || isWaived ? <CheckCircle2 className="h-4 w-4" /> : inst.installmentNumber}
                        </div>
                        <div className="min-w-0">
                          <div className={`font-bold text-sm ${colors.text}`}>
                            Installment #{inst.installmentNumber}
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            Due: <strong>{formatDate(inst.dueDate)}</strong>
                            {inst.paidDate && isPaid && (
                              <span className="ml-2 text-emerald-700">
                                · Paid: {formatDate(inst.paidDate)}
                              </span>
                            )}
                          </div>
                          {inst.notes && (
                            <div className="text-[10px] text-slate-500 mt-0.5 italic">{inst.notes}</div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[9px] uppercase font-bold text-slate-500">Amount</div>
                        <div className="font-extrabold text-slate-900">{formatPKR(inst.amount)}</div>
                        {Number(inst.paidAmount) > 0 && !isPaid && (
                          <div className="text-[10px] text-emerald-700 font-bold">
                            Paid: {formatPKR(inst.paidAmount)} · Bal: {formatPKR(balance)}
                          </div>
                        )}
                        <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${colors.bg} ${colors.text} ${colors.border}`}>
                          {INSTALLMENT_STATUS_LABELS[status]}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {plan.status === 'ACTIVE' && !isPaid && !isWaived && (
                      <div className="mt-2 pt-2 border-t border-current/10 flex gap-1.5">
                        <button
                          onClick={() => setPaymentInstallment({
                            id: inst.id,
                            number: inst.installmentNumber,
                            amount: Number(inst.amount),
                            paid: Number(inst.paidAmount),
                          })}
                          className="flex-1 px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1"
                        >
                          <Banknote className="h-3 w-3" /> Record Payment
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Reason for waiving?');
                            if (reason !== null) waiveMutation.mutate({ installmentId: inst.id, reason: reason || undefined });
                          }}
                          className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center justify-center gap-1"
                          title="Waive this installment"
                        >
                          <Ban className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {plan.notes && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm">
              <div className="font-bold text-amber-900 mb-1">Notes</div>
              <div className="whitespace-pre-line text-amber-900">{plan.notes}</div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Pricing summary */}
          <div className="rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 border-2 border-indigo-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-5 w-5 text-indigo-700" />
              <h3 className="font-bold text-indigo-900">Financial Summary</h3>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Amount</span>
                <span className="font-bold text-slate-900">{formatPKR(plan.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700">Down Payment</span>
                <span className="font-bold text-emerald-700">{formatPKR(plan.downPayment)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-indigo-200">
                <span className="font-bold text-indigo-700">Financed</span>
                <span className="font-extrabold text-indigo-700">{formatPKR(plan.financedAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Per Month</span>
                <span className="font-bold text-slate-900">{formatPKR(plan.installmentAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tenure</span>
                <span className="font-bold text-slate-900">{plan.installmentCount} months</span>
              </div>

              {/* Progress */}
              <div className="pt-2 border-t border-indigo-200 space-y-1">
                <div className="flex justify-between text-[11px] font-bold">
                  <span>Progress</span>
                  <span>{progressPercent.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full ${
                      progressPercent >= 100 ? 'bg-emerald-500' :
                      plan.overdueCount > 0 ? 'bg-rose-500' :
                      'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.max(progressPercent, 3)}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-2 border-t border-indigo-200">
                <span className="text-emerald-700 font-bold">Total Paid</span>
                <span className="font-extrabold text-emerald-700">{formatPKR(plan.paidAmount)}</span>
              </div>
              <div className="rounded-lg bg-amber-100 border border-amber-300 px-3 py-2 flex justify-between">
                <span className="font-bold text-amber-900">Remaining</span>
                <span className="font-extrabold text-amber-900">{formatPKR(plan.remainingAmount)}</span>
              </div>
              {plan.overdueAmount > 0 && (
                <div className="rounded-lg bg-rose-100 border border-rose-300 px-3 py-2 flex justify-between">
                  <span className="font-bold text-rose-900">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    Overdue
                  </span>
                  <span className="font-extrabold text-rose-900">{formatPKR(plan.overdueAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer */}
          {plan.customer && (
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-violet-600" /> Customer
                </h3>
                <Link
                  to={`/customers/${plan.customer.id}`}
                  className="text-xs font-bold text-violet-700 hover:underline"
                >
                  View →
                </Link>
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-bold text-slate-900">{plan.customer.name}</div>
                {plan.customer.phone && <div className="text-slate-600">📞 {plan.customer.phone}</div>}
                {plan.customer.cnic && <div className="text-slate-600 font-mono">CNIC: {plan.customer.cnic}</div>}
                {plan.customer.address && <div className="text-slate-600">📍 {plan.customer.address}</div>}
                {(plan.customer.balance ?? 0) > 0 && (
                  <div className="mt-2 text-amber-700 font-bold">
                    Outstanding: {formatPKR(plan.customer.balance ?? 0)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Next Due Card */}
          {plan.nextDueDate && plan.status === 'ACTIVE' && (
            <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-4">
              <div className="text-[10px] uppercase font-bold text-blue-700">Next Due</div>
              <div className="text-2xl font-extrabold text-blue-900 mt-1">
                {formatPKR(plan.nextDueAmount)}
              </div>
              <div className="text-xs text-blue-700 font-bold mt-1">
                <Calendar className="h-3 w-3 inline mr-1" />
                {formatDate(plan.nextDueDate)}
              </div>
            </div>
          )}
        </aside>
      </div>

      {paymentInstallment && (
        <RecordEmiPaymentModal
          planId={plan.id}
          planNumber={plan.planNumber}
          installmentId={paymentInstallment.id}
          installmentNumber={paymentInstallment.number}
          installmentAmount={paymentInstallment.amount}
          alreadyPaid={paymentInstallment.paid}
          onClose={() => setPaymentInstallment(null)}
        />
      )}
    </div>
  );
}
