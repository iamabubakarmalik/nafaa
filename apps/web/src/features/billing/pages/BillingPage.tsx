import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CreditCard, FileText, Clock, CheckCircle2, XCircle,
  AlertCircle, Sparkles, ArrowRight, Receipt, Download,
  Wrench, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { subscriptionsApi } from '@/api/subscriptions.api';
import { billingApi, type InvoiceStatus, type PaymentStatus } from '@/api/billing.api';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(value));

const invoiceStatusConfig: Record<InvoiceStatus, { tone: string; label: string }> = {
  DRAFT: { tone: 'bg-slate-100 text-slate-700', label: 'Draft' },
  PENDING: { tone: 'bg-amber-100 text-amber-700', label: 'Pending' },
  PAID: { tone: 'bg-emerald-100 text-emerald-700', label: 'Paid' },
  OVERDUE: { tone: 'bg-rose-100 text-rose-700', label: 'Overdue' },
  CANCELLED: { tone: 'bg-slate-100 text-slate-500', label: 'Cancelled' },
  REFUNDED: { tone: 'bg-blue-100 text-blue-700', label: 'Refunded' },
};

const paymentStatusConfig: Record<PaymentStatus, { tone: string; icon: any; label: string }> = {
  PENDING: { tone: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Pending Approval' },
  APPROVED: { tone: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, label: 'Approved' },
  REJECTED: { tone: 'bg-rose-100 text-rose-700', icon: XCircle, label: 'Rejected' },
  REFUNDED: { tone: 'bg-blue-100 text-blue-700', icon: AlertCircle, label: 'Refunded' },
};

const subscriptionStatusConfig: Record<string, { tone: string; label: string; icon: any }> = {
  ACTIVE: { tone: 'bg-emerald-100 text-emerald-700', label: 'Active', icon: CheckCircle2 },
  TRIAL: { tone: 'bg-blue-100 text-blue-700', label: 'Free Trial', icon: Sparkles },
  PAST_DUE: { tone: 'bg-amber-100 text-amber-700', label: 'Past Due', icon: Clock },
  EXPIRED: { tone: 'bg-rose-100 text-rose-700', label: 'Expired', icon: XCircle },
  PENDING_PAYMENT: { tone: 'bg-amber-100 text-amber-700', label: 'Pending Payment', icon: Clock },
  CANCELLED: { tone: 'bg-slate-100 text-slate-700', label: 'Cancelled', icon: XCircle },
};

export default function BillingPage() {
  const queryClient = useQueryClient();

  const { data: current, isLoading: loadingCurrent } = useQuery({
    queryKey: ['subscription-current'],
    queryFn: subscriptionsApi.current,
  });

  const { data: pendingUpgradeRaw } = useQuery({
    queryKey: ['subscription-pending'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/subscriptions/pending-upgrade');
        return res.data?.data ?? res.data ?? null;
      } catch {
        return null;
      }
    },
  });

  // Safe-normalize pendingUpgrade to expected shape
  const pendingUpgrade =
    pendingUpgradeRaw &&
    pendingUpgradeRaw.subscription &&
    pendingUpgradeRaw.subscription.plan &&
    pendingUpgradeRaw.invoice
      ? pendingUpgradeRaw
      : null;

  const { data: invoices = [] } = useQuery({
    queryKey: ['billing-invoices'],
    queryFn: billingApi.invoices,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['billing-payments'],
    queryFn: billingApi.payments,
  });

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/subscriptions/cleanup-pending');
      return res.data?.data ?? res.data;
    },
    onSuccess: (data: any) => {
      toast.success(`${data?.cancelled || 0} duplicate pending cancel ho gaye`);
      queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-pending'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cleanup fail'),
  });

  const pendingInvoices = invoices.filter(
    (i) => i.status === 'PENDING' || i.status === 'OVERDUE',
  );

  const showCleanup = pendingInvoices.length > 1;

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 text-white p-6 shadow-soft">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <CreditCard className="h-3.5 w-3.5" />
              Billing & Subscription
            </div>
            <h2 className="mt-3 text-3xl font-bold">Billing</h2>
            <p className="mt-2 text-sm text-white/80">
              Aap ke plans, invoices aur payments
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
                queryClient.invalidateQueries({ queryKey: ['subscription-pending'] });
                queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
                queryClient.invalidateQueries({ queryKey: ['billing-payments'] });
                toast.success('Refreshed');
              }}
              className="bg-white/15 hover:bg-white/25 text-white border-white/20"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Link to="/plans">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Sparkles className="h-4 w-4" />
                Upgrade Plan
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CLEANUP WARNING */}
      {showCleanup && (
        <section className="rounded-3xl bg-orange-50 border-2 border-orange-300 p-5">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="h-11 w-11 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-orange-900">
                {pendingInvoices.length} Pending Invoices Detected — Cleanup Needed
              </h3>
              <p className="text-xs text-orange-800 mt-1">
                Aap ke account mein duplicate pending payments hain. Sirf latest rakho aur baqi cancel kar do.
              </p>
            </div>
            <Button
              onClick={() => cleanupMutation.mutate()}
              loading={cleanupMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Wrench className="h-4 w-4" />
              Clean Up Duplicates
            </Button>
          </div>
        </section>
      )}

      {/* CURRENT SUBSCRIPTION */}
      {loadingCurrent ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-6 animate-pulse h-32" />
      ) : current && current.plan ? (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm text-slate-500">Current Subscription</div>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">
                {current.plan?.name || 'Plan'}
              </h3>
              <div className="mt-2 flex items-center gap-3 text-sm flex-wrap">
                {(() => {
                  const cfg = subscriptionStatusConfig[current.status] || subscriptionStatusConfig.CANCELLED;
                  const Icon = cfg.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold text-xs ${cfg.tone}`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  );
                })()}
                {current.amount > 0 && (
                  <span className="text-slate-600">
                    {formatPKR(current.amount)} / {current.interval?.toLowerCase()}
                  </span>
                )}
                {current.currentPeriodEnd && (
                  <span className="text-slate-600">
                    {current.status === 'TRIAL' && current.trialEndsAt
                      ? `Trial ends: ${formatDate(current.trialEndsAt)}`
                      : `Expires: ${formatDate(current.currentPeriodEnd)}`}
                  </span>
                )}
              </div>

              {current.status === 'TRIAL' && current.trialEndsAt && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-900">
                  <Sparkles className="h-4 w-4" />
                  Trial active hai — abhi koi payment nahi chahiye. Upgrade jab chahein.
                </div>
              )}

              {current.status === 'ACTIVE' && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-900">
                  <CheckCircle2 className="h-4 w-4" />
                  Aap ka plan active hai — full access available
                </div>
              )}

              {current.status === 'EXPIRED' && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-900">
                  <AlertCircle className="h-4 w-4" />
                  Subscription expire ho gayi — service continue rakhne ke liye renew karein
                </div>
              )}

              {current.status === 'PAST_DUE' && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
                  <Clock className="h-4 w-4" />
                  Payment due hai — 3 din ka grace period chal raha hai
                </div>
              )}
            </div>
            <Link to="/plans">
              <Button variant="secondary">
                {current.status === 'TRIAL' ? 'Upgrade' : 'Change Plan'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      ) : null}

      {/* PENDING UPGRADE */}
      {pendingUpgrade && (
        <section className="rounded-3xl bg-amber-50 border-2 border-amber-300 p-6">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-extrabold uppercase tracking-wider text-amber-700 mb-1">
                Upgrade Pending
              </div>
              <h3 className="text-xl font-extrabold text-amber-900">
                {pendingUpgrade.subscription.plan?.name || 'Plan'} — {formatPKR(pendingUpgrade.subscription.amount)}
              </h3>
              <p className="text-sm text-amber-800 mt-1">
                Payment karne ke baad ye plan activate ho jayega. Aap ka current{' '}
                {current?.status === 'TRIAL' ? 'trial' : 'plan'} chalta rahega.
              </p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <Link to={`/billing/invoice/${pendingUpgrade.invoice.id}/pay`}>
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                    <CreditCard className="h-4 w-4" />
                    Pay {formatPKR(pendingUpgrade.invoice.amountDue)}
                  </Button>
                </Link>
                <span className="text-xs text-amber-700 font-mono">
                  {pendingUpgrade.invoice.invoiceNumber}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* INVOICES + PAYMENTS */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
            <Receipt className="h-5 w-5 text-slate-700" />
            <div>
              <h3 className="font-bold text-slate-900">Invoices</h3>
              <p className="text-xs text-slate-500">{invoices.length} total</p>
            </div>
          </div>

          {invoices.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No invoices yet
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {invoices.map((inv) => {
                const cfg = invoiceStatusConfig[inv.status];
                const isPayable = inv.status === 'PENDING' || inv.status === 'OVERDUE';
                const content = (
                  <div className={`px-6 py-4 flex items-center justify-between gap-3 ${
                    isPayable ? 'hover:bg-slate-50 cursor-pointer' : ''
                  }`}>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 font-mono text-sm">
                        {inv.invoiceNumber}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {inv.subscription?.plan?.name || inv.description} •{' '}
                        {formatDate(inv.createdAt)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-slate-900">{formatPKR(inv.total)}</div>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${cfg.tone}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
                return isPayable ? (
                  <Link key={inv.id} to={`/billing/invoice/${inv.id}/pay`}>
                    {content}
                  </Link>
                ) : (
                  <div key={inv.id}>{content}</div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
            <FileText className="h-5 w-5 text-slate-700" />
            <div>
              <h3 className="font-bold text-slate-900">Payments</h3>
              <p className="text-xs text-slate-500">{payments.length} total</p>
            </div>
          </div>

          {payments.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No payments yet
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {payments.map((p) => {
                const cfg = paymentStatusConfig[p.status];
                const Icon = cfg.icon;
                return (
                  <div key={p.id} className="px-6 py-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900">{formatPKR(p.amount)}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {p.provider} • {formatDate(p.createdAt)}
                      </div>
                      {p.invoice?.invoiceNumber && (
                        <div className="text-xs text-slate-500 mt-0.5 font-mono">
                          {p.invoice.invoiceNumber}
                        </div>
                      )}
                      {p.rejectionReason && (
                        <div className="text-xs text-rose-700 mt-1 font-semibold">
                          ✗ {p.rejectionReason}
                        </div>
                      )}
                      {p.upload && (
                        <a
                          href={p.upload.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-700 hover:underline mt-1 inline-flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" /> Receipt
                        </a>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold shrink-0 ${cfg.tone}`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
