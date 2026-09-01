// apps/web/src/industries/mobile/pages/EmiPlanDetailPage.tsx
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CreditCard, User, Phone, Calendar, DollarSign,
  CheckCircle2, AlertTriangle, Clock, Ban, Printer,
  MessageCircle, AlertCircle, Banknote, RefreshCw,
  GraduationCap, X, Copy, Sparkles,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import {
  emiApi,
  type EmiInstallmentStatus,
  EMI_STATUS_LABELS,
  EMI_STATUS_COLORS,
  INSTALLMENT_STATUS_LABELS,
  INSTALLMENT_STATUS_COLORS,
} from '../api/emi.api';
import { RecordEmiPaymentModal } from '../components/emi/RecordEmiPaymentModal';

/* ═════════════════════════════════════════════════════════════
   NAFAA EMI PLAN DETAIL — FULL BEST
   ─────────────────────────────────────────────────────────────
   🌙 Dark mode complete • ⌨️ Shortcuts • 💬 WhatsApp reminder
   🖨️ Print schedule • 📋 Copy plan # • 🎓 Guide
   ═════════════════════════════════════════════════════════════ */

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(iso));

export default function EmiPlanDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [paymentInstallment, setPaymentInstallment] = useState<{
    id: string; number: number; amount: number; paid: number;
  } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const { data: plan, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['emi-plan', id],
    queryFn: () => emiApi.getOne(id!),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['emi-plan', id] });
    queryClient.invalidateQueries({ queryKey: ['emi-plans'] });
    queryClient.invalidateQueries({ queryKey: ['emi-stats'] });
  };

  const waiveMutation = useMutation({
    mutationFn: ({ installmentId, reason }: { installmentId: string; reason?: string }) =>
      emiApi.waiveInstallment(id!, installmentId, reason),
    onSuccess: () => { toast.success('✓ Installment waive ho gayi'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Fail hua'),
  });

  const defaultMutation = useMutation({
    mutationFn: (reason?: string) => emiApi.markDefaulted(id!, reason),
    onSuccess: () => { toast.success('Plan defaulted mark ho gaya'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Fail hua'),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => emiApi.cancel(id!, reason),
    onSuccess: () => { toast.success('Plan cancel ho gaya'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Fail hua'),
  });

  /* ─── Keyboard ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        if (showGuide) { setShowGuide(false); return; }
        return;
      }
      if (e.key === 'r' && !e.ctrlKey) refetch();
      if (e.key === 'i' && plan) {
        navigator.clipboard.writeText(plan.planNumber);
        toast.success('Plan # copy ho gaya');
      }
      if (e.key === 'w') sendReminder();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, showGuide]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = (showGuide || !!paymentInstallment) ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showGuide, paymentInstallment]);

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <div className="inline-block h-10 w-10 rounded-full border-4 border-indigo-200 dark:border-indigo-500/30 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
        <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400">Plan load ho raha hai...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 p-16 text-center">
        <div className="mx-auto h-16 w-16 rounded-3xl bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center mb-3">
          <AlertCircle className="h-8 w-8 text-rose-500" />
        </div>
        <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Plan nahi mila</h3>
        <Link to="/emi-plans" className="mt-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Wapis EMI Plans
        </Link>
      </div>
    );
  }

  const statusColors = EMI_STATUS_COLORS[plan.status];
  const progressPercent = plan.financedAmount > 0
    ? Math.min(Math.max(((plan.paidAmount - plan.downPayment) / plan.financedAmount) * 100, 0), 100)
    : 0;

  const sendReminder = () => {
    if (!plan.customerPhone) return toast.error('Customer ka phone nahi hai');
    const phone = plan.customerPhone.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    const msg = [
      `*💳 EMI Reminder — Plan ${plan.planNumber}*`,
      '',
      `Assalamu Alaikum ${plan.customerName},`,
      '',
      ...(plan.overdueAmount > 0 ? [`⚠️ Overdue: *${formatPKR(plan.overdueAmount)}* (${plan.overdueCount} installments)`] : []),
      `Remaining: *${formatPKR(plan.remainingAmount)}*`,
      plan.nextDueDate ? `Next Due: ${formatDate(plan.nextDueDate)} — ${formatPKR(plan.nextDueAmount)}` : '',
      '',
      'Shukriya! 🙏',
      '_Powered by Nafaa POS_',
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {showGuide && <DetailGuide onClose={() => setShowGuide(false)} />}

      {/* ═══ TOP BAR ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <Link
          to="/emi-plans"
          className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition"
        >
          <ArrowLeft className="h-4 w-4" /> Wapis EMI Plans
        </Link>
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
            title="Refresh (R)"
          >
            <RefreshCw className={`h-4 w-4 text-slate-600 dark:text-slate-300 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowGuide(true)}
            className="h-10 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
          >
            <GraduationCap className="h-4 w-4" /> Guide
          </button>
          {plan.customerPhone && (
            <button
              onClick={sendReminder}
              className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/30 transition"
            >
              <MessageCircle className="h-4 w-4" /> Reminder
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="h-10 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-md shadow-blue-500/30 transition"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-purple-700 dark:from-slate-950 dark:via-indigo-950 dark:to-purple-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-purple-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <CreditCard className="h-3.5 w-3.5 text-amber-300" /> EMI Plan
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-mono break-all">{plan.planNumber}</h1>
              <button
                onClick={() => { navigator.clipboard.writeText(plan.planNumber); toast.success('Copy ho gaya'); }}
                className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition"
                title="Copy plan # (I)"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2.5 flex items-center gap-3 text-xs sm:text-sm text-white/90 font-semibold flex-wrap">
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> {plan.customerName}
              </span>
              {plan.customerPhone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {plan.customerPhone}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Start: {formatDate(plan.startDate)}
              </span>
            </div>
          </div>
          <div className="shrink-0">
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold border-2 ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
              {EMI_STATUS_LABELS[plan.status]}
            </span>
            {plan.overdueCount > 0 && (
              <div className="mt-2 text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold animate-pulse">
                  <AlertTriangle className="h-3 w-3" /> {plan.overdueCount} OVERDUE
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="relative mt-4">
          <div className="flex justify-between text-xs mb-1.5 font-bold">
            <span className="text-white/80">Payment Progress — {plan.paidInstallmentCount}/{plan.installmentCount} installments</span>
            <span className="tabular-nums">{progressPercent.toFixed(0)}% • {formatPKR(plan.paidAmount)} / {formatPKR(plan.totalAmount)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/15 overflow-hidden border border-white/20">
            <div
              className={`h-full transition-all ${
                plan.overdueCount > 0
                  ? 'bg-gradient-to-r from-rose-400 to-red-500'
                  : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
              }`}
              style={{ width: `${Math.max(progressPercent, 2)}%` }}
            />
          </div>
        </div>
      </section>

      {/* ═══ QUICK ACTIONS (ACTIVE plan) ═══ */}
      {plan.status === 'ACTIVE' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 print:hidden">
          <div className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Plan Actions
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const reason = prompt('Default ki wajah? (customer ne pay karna band kar diya)');
                if (reason !== null) defaultMutation.mutate(reason || undefined);
              }}
              disabled={defaultMutation.isPending}
              className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border-2 border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 text-xs font-extrabold inline-flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Default Mark Karo
            </button>
            <button
              onClick={() => {
                const reason = prompt('Cancel ki wajah?');
                if (reason !== null) cancelMutation.mutate(reason || undefined);
              }}
              disabled={cancelMutation.isPending}
              className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Ban className="h-3.5 w-3.5" /> Plan Cancel Karo
            </button>
          </div>
        </div>
      )}

      {/* ═══ MAIN GRID ═══ */}
      <div className="grid xl:grid-cols-[1fr_400px] gap-4 items-start">
        {/* ── Installments ── */}
        <div className="space-y-4">
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                  <Calendar className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white">
                  Installments <span className="text-slate-500 dark:text-slate-400 font-bold tabular-nums">({plan.paidInstallmentCount}/{plan.installmentCount})</span>
                </h3>
              </div>
            </div>

            <div className="space-y-2">
              {plan.installments.map((inst) => {
                const status = inst.status as EmiInstallmentStatus;
                const colors = INSTALLMENT_STATUS_COLORS[status];
                const balance = Number(inst.amount) - Number(inst.paidAmount);
                const isPaid = status === 'PAID';
                const isWaived = status === 'WAIVED';
                const isOverdue = status === 'OVERDUE' || (status === 'PENDING' && new Date(inst.dueDate) < new Date());

                return (
                  <div
                    key={inst.id}
                    className={`rounded-xl border-2 p-3.5 transition ${colors.bg} ${colors.border} dark:bg-opacity-20`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 shadow-sm ${
                          isPaid
                            ? 'bg-emerald-600 text-white'
                            : isWaived
                              ? 'bg-slate-400 text-white'
                              : isOverdue
                                ? 'bg-rose-600 text-white'
                                : 'bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                        }`}>
                          {isPaid || isWaived ? <CheckCircle2 className="h-4 w-4" /> : inst.installmentNumber}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                            Installment #{inst.installmentNumber}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-semibold">
                            Due: <strong>{formatDate(inst.dueDate)}</strong>
                            {inst.paidDate && isPaid && (
                              <span className="ml-2 text-emerald-700 dark:text-emerald-400">
                                · Paid: {formatDate(inst.paidDate)}
                              </span>
                            )}
                          </div>
                          {inst.notes && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 italic">{inst.notes}</div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[9px] uppercase font-extrabold text-slate-500 dark:text-slate-400">Amount</div>
                        <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(inst.amount)}</div>
                        {Number(inst.paidAmount) > 0 && !isPaid && (
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                            Paid: {formatPKR(inst.paidAmount)} · Bal: {formatPKR(balance)}
                          </div>
                        )}
                        <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${colors.bg} ${colors.text} ${colors.border}`}>
                          {INSTALLMENT_STATUS_LABELS[status]}
                        </span>
                      </div>
                    </div>

                    {plan.status === 'ACTIVE' && !isPaid && !isWaived && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex gap-1.5 print:hidden">
                        <button
                          onClick={() => setPaymentInstallment({
                            id: inst.id,
                            number: inst.installmentNumber,
                            amount: Number(inst.amount),
                            paid: Number(inst.paidAmount),
                          })}
                          className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/30 transition active:scale-95"
                        >
                          <Banknote className="h-3.5 w-3.5" /> Payment Record Karo
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Waive ki wajah? (maaf karne ka reason)');
                            if (reason !== null) waiveMutation.mutate({ installmentId: inst.id, reason: reason || undefined });
                          }}
                          disabled={waiveMutation.isPending}
                          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-extrabold inline-flex items-center justify-center gap-1 transition disabled:opacity-50"
                          title="Ye installment maaf karo"
                        >
                          <Ban className="h-3.5 w-3.5" /> Waive
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {plan.notes && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/40 p-4 text-sm">
              <div className="font-extrabold text-amber-900 dark:text-amber-300 mb-1 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> Notes
              </div>
              <div className="whitespace-pre-line font-semibold text-amber-900 dark:text-amber-200">{plan.notes}</div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-4">
          {/* Financial summary */}
          <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-500/10 dark:via-slate-900/80 dark:to-purple-500/10 border-2 border-indigo-200 dark:border-indigo-500/30 shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-indigo-900 dark:text-indigo-200">Financial Summary</h3>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Total Amount</span>
                <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(plan.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Down Payment</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(plan.downPayment)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-indigo-200 dark:border-indigo-500/30">
                <span className="font-extrabold text-indigo-700 dark:text-indigo-300">Financed</span>
                <span className="font-extrabold text-indigo-700 dark:text-indigo-300 tabular-nums">{formatPKR(plan.financedAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Per Month</span>
                <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(plan.installmentAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Tenure</span>
                <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">{plan.installmentCount} months</span>
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-indigo-200 dark:border-indigo-500/30">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">Total Paid</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(plan.paidAmount)}</span>
              </div>
              <div className="rounded-xl bg-amber-100 dark:bg-amber-500/15 border-2 border-amber-300 dark:border-amber-500/40 px-3 py-2 flex justify-between">
                <span className="font-extrabold text-amber-900 dark:text-amber-200">Remaining</span>
                <span className="font-extrabold text-amber-900 dark:text-amber-200 tabular-nums">{formatPKR(plan.remainingAmount)}</span>
              </div>
              {plan.overdueAmount > 0 && (
                <div className="rounded-xl bg-rose-100 dark:bg-rose-500/15 border-2 border-rose-300 dark:border-rose-500/40 px-3 py-2 flex justify-between">
                  <span className="font-extrabold text-rose-900 dark:text-rose-200 inline-flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Overdue
                  </span>
                  <span className="font-extrabold text-rose-900 dark:text-rose-200 tabular-nums">{formatPKR(plan.overdueAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer */}
          {plan.customer && (
            <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-violet-600 dark:text-violet-400" /> Customer
                </h3>
                <Link
                  to={`/customers/${plan.customer.id}`}
                  className="text-xs font-extrabold text-violet-700 dark:text-violet-300 hover:underline"
                >
                  Profile →
                </Link>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="font-extrabold text-slate-900 dark:text-white text-sm">{plan.customer.name}</div>
                {plan.customer.phone && <div className="font-semibold text-slate-600 dark:text-slate-300 font-mono">📞 {plan.customer.phone}</div>}
                {plan.customer.cnic && <div className="font-semibold text-slate-600 dark:text-slate-300 font-mono">CNIC: {plan.customer.cnic}</div>}
                {plan.customer.address && <div className="font-semibold text-slate-600 dark:text-slate-300">📍 {plan.customer.address}</div>}
                {(plan.customer.balance ?? 0) > 0 && (
                  <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-2.5 py-1.5 text-amber-700 dark:text-amber-300 font-extrabold tabular-nums">
                    Aur udhaar: {formatPKR(plan.customer.balance ?? 0)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Next Due */}
          {plan.nextDueDate && plan.status === 'ACTIVE' && (
            <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-4">
              <div className="text-[10px] uppercase font-extrabold text-blue-700 dark:text-blue-300 tracking-wider">Next Due</div>
              <div className="text-2xl font-extrabold text-blue-900 dark:text-blue-200 mt-1 tabular-nums">
                {formatPKR(plan.nextDueAmount)}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 font-extrabold mt-1 inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
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

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm 8mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          section, div { box-shadow: none !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═══ DETAIL GUIDE ═══ */
function DetailGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-300 dark:border-indigo-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b-2 border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-500/15 dark:to-purple-500/15 flex items-center justify-between">
          <h3 className="font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Ye Page Kya Karta Hai?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <Tip><strong>Payment Record Karo</strong> — customer paisa de to installment pe click karo, method chuno, done</Tip>
          <Tip><strong>Waive</strong> — installment maaf karni ho to reason ke sath (record rehta hai)</Tip>
          <Tip><strong>💬 Reminder</strong> — customer ko WhatsApp pe remaining + next due chala jata hai</Tip>
          <Tip><strong>Default</strong> — customer ne pay karna band kar diya? Mark karo taake report sahi rahe</Tip>
          <Tip><strong>⌨️ R</strong> refresh • <strong>I</strong> plan # copy • <strong>W</strong> WhatsApp</Tip>
          <Button className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-purple-700 font-extrabold h-11" onClick={onClose}>
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya 👍
          </Button>
        </div>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2.5">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}
