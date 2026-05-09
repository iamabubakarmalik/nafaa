import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CreditCard, FileText, Clock, CheckCircle2, XCircle,
  AlertCircle, Sparkles, ArrowRight, Receipt, Download,
} from 'lucide-react';
import { subscriptionsApi } from '@/api/subscriptions.api';
import { billingApi, type InvoiceStatus, type PaymentStatus } from '@/api/billing.api';
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

export default function BillingPage() {
  const { data: current } = useQuery({
    queryKey: ['subscription-current'],
    queryFn: subscriptionsApi.current,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['billing-invoices'],
    queryFn: billingApi.invoices,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['billing-payments'],
    queryFn: billingApi.payments,
  });

  const pendingInvoices = invoices.filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE');

  return (
    <div className="space-y-6">
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
          <Link to="/plans">
            <Button className="bg-white text-slate-900 hover:bg-slate-100">
              <Sparkles className="h-4 w-4" />
              Upgrade Plan
            </Button>
          </Link>
        </div>
      </section>

      {current && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm text-slate-500">Current Subscription</div>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">{current.plan.name}</h3>
              <div className="mt-2 flex items-center gap-3 text-sm flex-wrap">
                <span className={`inline-flex px-2.5 py-1 rounded-full font-semibold text-xs ${
                  current.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                  current.status === 'TRIAL' ? 'bg-blue-100 text-blue-700' :
                  current.status === 'PENDING_PAYMENT' ? 'bg-amber-100 text-amber-700' :
                  'bg-rose-100 text-rose-700'
                }`}>
                  {current.status}
                </span>
                <span className="text-slate-600">
                  {formatPKR(current.amount)} / {current.interval.toLowerCase()}
                </span>
                <span className="text-slate-600">
                  Expires: {formatDate(current.currentPeriodEnd)}
                </span>
              </div>
              {current.status === 'TRIAL' && current.trialEndsAt && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
                  <AlertCircle className="h-4 w-4" />
                  Trial ends on {formatDate(current.trialEndsAt)} — upgrade to continue!
                </div>
              )}
            </div>
            <Link to="/plans">
              <Button variant="secondary">
                Change Plan
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {pendingInvoices.length > 0 && (
        <section className="rounded-3xl bg-amber-50 border-2 border-amber-300 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-amber-700 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-bold text-amber-900">
                {pendingInvoices.length} Invoice{pendingInvoices.length > 1 ? 's' : ''} Pending Payment
              </h3>
              <p className="text-sm text-amber-800 mt-1">
                Apna service active rakhne ke liye in invoices ko pay karein
              </p>
              <div className="mt-3 space-y-2">
                {pendingInvoices.map((inv) => (
                  <Link
                    key={inv.id}
                    to={`/billing/invoice/${inv.id}/pay`}
                    className="flex items-center justify-between bg-white rounded-xl px-4 py-3 hover:shadow-sm transition"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{inv.invoiceNumber}</div>
                      <div className="text-xs text-slate-500">Due: {formatDate(inv.dueDate)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-700">{formatPKR(inv.amountDue)}</div>
                      <div className="text-xs text-amber-600 inline-flex items-center gap-1">
                        Pay Now <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

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
            <div className="p-8 text-center text-sm text-slate-500">No invoices yet</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {invoices.map((inv) => {
                const cfg = invoiceStatusConfig[inv.status];
                return (
                  <Link
                    key={inv.id}
                    to={`/billing/invoice/${inv.id}/pay`}
                    className="px-6 py-4 hover:bg-slate-50 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">{inv.invoiceNumber}</div>
                      <div className="text-xs text-slate-500">
                        {inv.subscription?.plan.name || inv.description} • {formatDate(inv.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{formatPKR(inv.total)}</div>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.tone}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </Link>
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
            <div className="p-8 text-center text-sm text-slate-500">No payments yet</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {payments.map((p) => {
                const cfg = paymentStatusConfig[p.status];
                const Icon = cfg.icon;
                return (
                  <div key={p.id} className="px-6 py-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">{formatPKR(p.amount)}</div>
                      <div className="text-xs text-slate-500">
                        {p.provider} • {formatDate(p.createdAt)}
                      </div>
                      {p.invoice?.invoiceNumber && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          Invoice: {p.invoice.invoiceNumber}
                        </div>
                      )}
                      {p.rejectionReason && (
                        <div className="text-xs text-rose-700 mt-1">
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
                          <Download className="h-3 w-3" /> View receipt
                        </a>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${cfg.tone}`}>
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
