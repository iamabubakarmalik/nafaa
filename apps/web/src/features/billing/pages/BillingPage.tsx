import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CreditCard, FileText, Clock, CheckCircle2, XCircle,
  AlertCircle, Sparkles, ArrowRight, Receipt, Download,
  Wrench, RefreshCw, BarChart3, TrendingUp, Wallet,
  Eye, ExternalLink, Calendar, Search, Filter, X,
  ChevronRight, Award, Hash, Building2, Smartphone, Zap, Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { subscriptionsApi } from '@/api/subscriptions.api';
import { billingApi, type InvoiceStatus, type PaymentStatus } from '@/api/billing.api';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import {
  invoiceStatusConfig, paymentStatusConfig, subscriptionStatusConfig,
  paymentProviderConfig, formatDate, formatDateTime, formatRelative,
  getDaysUntilDue,
} from '../components/helpers';

type Tab = 'overview' | 'invoices' | 'payments';
type InvoiceFilter = 'all' | 'pending' | 'paid' | 'overdue';
type PaymentFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [search, setSearch] = useState('');

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

  const pendingUpgrade =
    pendingUpgradeRaw?.subscription?.plan && pendingUpgradeRaw?.invoice
      ? pendingUpgradeRaw
      : null;

  const { data: invoices = [], isRefetching: refetchingInvoices } = useQuery({
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
  const paidInvoices = invoices.filter((i) => i.status === 'PAID');
  const showCleanup = pendingInvoices.length > 1;

  // Stats
  const stats = useMemo(() => {
    const totalPaid = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const totalDue = pendingInvoices.reduce((s, i) => s + (i.amountDue || 0), 0);
    const pendingPayments = payments.filter((p) => p.status === 'PENDING').length;
    return {
      totalPaid,
      totalDue,
      totalInvoices: invoices.length,
      paidCount: paidInvoices.length,
      pendingCount: pendingInvoices.length,
      pendingPayments,
    };
  }, [invoices, paidInvoices, pendingInvoices, payments]);

  const filteredInvoices = useMemo(() => {
    let list = [...invoices];
    if (invoiceFilter === 'pending') list = list.filter((i) => i.status === 'PENDING');
    else if (invoiceFilter === 'paid') list = list.filter((i) => i.status === 'PAID');
    else if (invoiceFilter === 'overdue') list = list.filter((i) => i.status === 'OVERDUE');

    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q) ||
          (i.subscription?.plan?.name || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [invoices, invoiceFilter, search]);

  const filteredPayments = useMemo(() => {
    let list = [...payments];
    if (paymentFilter === 'pending') list = list.filter((p) => p.status === 'PENDING');
    else if (paymentFilter === 'approved') list = list.filter((p) => p.status === 'APPROVED');
    else if (paymentFilter === 'rejected') list = list.filter((p) => p.status === 'REJECTED');
    return list;
  }, [payments, paymentFilter]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
    queryClient.invalidateQueries({ queryKey: ['subscription-pending'] });
    queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['billing-payments'] });
    toast.success('Refreshed');
  };

  const currentCfg = current ? subscriptionStatusConfig[current.status] : null;
  const CurrentIcon = currentCfg?.icon || Clock;

  return (
    <div className="space-y-6">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/15">
              <CreditCard className="h-3.5 w-3.5 text-amber-300" />
              Billing & Subscription
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Billing Center</h2>
            <p className="mt-2 text-sm text-white/80 max-w-xl">
              Aap ke plans, invoices aur payments — sab ek jagah, full transparency
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleRefresh}
              variant="secondary"
              className="bg-white/15 hover:bg-white/25 text-white border-white/20 backdrop-blur"
            >
              <RefreshCw className={`h-4 w-4 ${refetchingInvoices ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link to="/plan">
              <Button className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl">
                <Sparkles className="h-4 w-4" />
                {current?.status === 'TRIAL' ? 'Upgrade Plan' : 'View Plans'}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ TABS ═══ */}
      <section className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview' as Tab, label: 'Overview', icon: BarChart3, count: undefined },
          { id: 'invoices' as Tab, label: 'Invoices', icon: Receipt, count: invoices.length },
          { id: 'payments' as Tab, label: 'Payments', icon: FileText, count: payments.length },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold whitespace-nowrap transition border-2 ${
                active
                  ? 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-500/30'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.count !== undefined && (
                <span className={`px-1.5 rounded-full text-[10px] font-extrabold ${
                  active ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </section>

      {/* ═══ STATS ═══ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Paid"
          value={formatPKR(stats.totalPaid)}
          sub={`${stats.paidCount} invoices`}
          icon={CheckCircle2}
          color="emerald"
          isText
        />
        <StatCard
          label="Amount Due"
          value={formatPKR(stats.totalDue)}
          sub={`${stats.pendingCount} pending`}
          icon={Clock}
          color="amber"
          isText
          isAlert={stats.totalDue > 0}
        />
        <StatCard
          label="Total Invoices"
          value={String(stats.totalInvoices)}
          sub="All time"
          icon={Receipt}
          color="blue"
        />
        <StatCard
          label="Pending Reviews"
          value={String(stats.pendingPayments)}
          sub="Payments under review"
          icon={FileText}
          color="violet"
        />
      </section>

      {/* ═══ CLEANUP WARNING ═══ */}
      {showCleanup && (
        <section className="rounded-3xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 p-5 shadow-sm">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/30">
              <Wrench className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-orange-700 mb-1">
                Action Required
              </div>
              <h3 className="font-extrabold text-orange-900 text-lg">
                {pendingInvoices.length} Pending Invoices — Cleanup Needed
              </h3>
              <p className="text-xs text-orange-800 mt-1 font-semibold">
                Duplicate pending payments hain. Latest rakho aur baqi cancel kar do automatic.
              </p>
            </div>
            <Button
              onClick={() => cleanupMutation.mutate()}
              loading={cleanupMutation.isPending}
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-lg shadow-orange-500/30"
            >
              <Wrench className="h-4 w-4" />
              Clean Up Duplicates
            </Button>
          </div>
        </section>
      )}

      {/* ═══ OVERVIEW TAB ═══ */}
      {tab === 'overview' && (
        <>
          {/* Current subscription */}
          {loadingCurrent ? (
            <div className="rounded-3xl bg-white border border-slate-200 p-6 animate-pulse h-48" />
          ) : current && current.plan && currentCfg ? (
            <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-white to-slate-50 border-2 ${currentCfg.borderTone} shadow-lg`}>
              <div
                className="absolute -top-12 -right-12 h-48 w-48 rounded-full opacity-10 blur-3xl"
                style={{ backgroundColor: currentCfg.hex }}
              />

              <div className="relative p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div
                      className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-xl shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${currentCfg.hex}, ${currentCfg.hex}dd)`,
                        boxShadow: `0 12px 32px -8px ${currentCfg.hex}80`,
                      }}
                    >
                      <Award className="h-8 w-8 text-white" />
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">
                        Current Subscription
                      </div>
                      <h3 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
                        {current.plan.name}
                      </h3>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-extrabold text-xs ${currentCfg.tone}`}>
                          <CurrentIcon className="h-3 w-3" />
                          {currentCfg.label}
                        </span>
                        {current.amount > 0 && (
                          <span className="text-sm font-bold text-slate-700">
                            {formatPKR(current.amount)}
                            <span className="text-slate-500 font-semibold"> / {current.interval?.toLowerCase()}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-2 font-semibold">
                        {currentCfg.description}
                      </p>
                    </div>
                  </div>

                  <Link to="/plan" className="shrink-0">
                    <Button variant="secondary">
                      {current.status === 'TRIAL' ? 'Upgrade' : 'Change Plan'}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                {/* Period info cards */}
                <div className="mt-5 grid sm:grid-cols-3 gap-3">
                  <InfoBox
                    icon={Calendar}
                    label="Started"
                    value={formatDate(current.currentPeriodStart)}
                    color="slate"
                  />
                  <InfoBox
                    icon={Clock}
                    label={current.status === 'TRIAL' ? 'Trial Ends' : 'Expires'}
                    value={formatDate(current.status === 'TRIAL' && current.trialEndsAt ? current.trialEndsAt : current.currentPeriodEnd)}
                    color={current.status === 'TRIAL' ? 'blue' : current.status === 'PAST_DUE' ? 'amber' : 'emerald'}
                    sub={(() => {
                      const days = getDaysUntilDue(current.status === 'TRIAL' ? current.trialEndsAt : current.currentPeriodEnd);
                      return days > 0 ? `${days} days left` : days === 0 ? 'Today' : `${Math.abs(days)} days ago`;
                    })()}
                  />
                  <InfoBox
                    icon={Wallet}
                    label="Billing"
                    value={current.interval || '—'}
                    color="violet"
                    sub={current.autoRenew ? 'Auto-renew on' : 'Manual'}
                  />
                </div>
              </div>
            </section>
          ) : null}

          {/* Pending upgrade */}
          {pendingUpgrade && (
            <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 p-6 shadow-lg">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30">
                  <Clock className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 mb-1">
                    Upgrade Pending Payment
                  </div>
                  <h3 className="text-xl font-extrabold text-amber-900">
                    {pendingUpgrade.subscription.plan.name}
                    <span className="text-amber-700 ml-2 text-base">
                      {formatPKR(pendingUpgrade.subscription.amount)}
                    </span>
                  </h3>
                  <p className="text-sm text-amber-800 mt-1 font-semibold">
                    Payment karne ke baad ye plan activate ho jayega. Current{' '}
                    {current?.status === 'TRIAL' ? 'trial' : 'plan'} chalta rahega.
                  </p>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Link to={`/billing/invoice/${pendingUpgrade.invoice.id}/pay`}>
                      <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30">
                        <CreditCard className="h-4 w-4" />
                        Pay {formatPKR(pendingUpgrade.invoice.amountDue)}
                      </Button>
                    </Link>
                    <span className="text-xs text-amber-700 font-mono font-bold bg-amber-100 px-2 py-1 rounded-lg">
                      {pendingUpgrade.invoice.invoiceNumber}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Quick Invoices preview */}
          {invoices.length > 0 && (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-md">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Recent Invoices</h3>
                    <p className="text-xs text-slate-500 font-semibold">Latest 5 entries</p>
                  </div>
                </div>
                <button
                  onClick={() => setTab('invoices')}
                  className="text-xs font-extrabold text-brand-700 hover:underline inline-flex items-center gap-1"
                >
                  View All <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {invoices.slice(0, 5).map((inv) => (
                  <InvoiceRow key={inv.id} invoice={inv} />
                ))}
              </div>
            </section>
          )}

          {/* Quick Payments preview */}
          {payments.length > 0 && (
            <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Recent Payments</h3>
                    <p className="text-xs text-slate-500 font-semibold">Latest 5 entries</p>
                  </div>
                </div>
                <button
                  onClick={() => setTab('payments')}
                  className="text-xs font-extrabold text-brand-700 hover:underline inline-flex items-center gap-1"
                >
                  View All <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {payments.slice(0, 5).map((p) => (
                  <PaymentRow key={p.id} payment={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ═══ INVOICES TAB ═══ */}
      {tab === 'invoices' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">All Invoices</h3>
                  <p className="text-sm text-slate-500">
                    {filteredInvoices.length} of {invoices.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice #, description, plan..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            <div className="flex gap-1 flex-wrap">
              {[
                { v: 'all' as InvoiceFilter, l: 'All', count: invoices.length, c: 'bg-slate-900' },
                { v: 'pending' as InvoiceFilter, l: 'Pending', count: invoices.filter(i => i.status === 'PENDING').length, c: 'bg-amber-600' },
                { v: 'paid' as InvoiceFilter, l: 'Paid', count: invoices.filter(i => i.status === 'PAID').length, c: 'bg-emerald-600' },
                { v: 'overdue' as InvoiceFilter, l: 'Overdue', count: invoices.filter(i => i.status === 'OVERDUE').length, c: 'bg-rose-600' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setInvoiceFilter(opt.v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 ${
                    invoiceFilter === opt.v ? `${opt.c} text-white shadow-sm` : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {opt.l}
                  <span className={`px-1.5 rounded-full text-[10px] font-extrabold ${
                    invoiceFilter === opt.v ? 'bg-white/20' : 'bg-slate-200'
                  }`}>
                    {opt.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-slate-100 flex items-center justify-center">
                <Receipt className="h-10 w-10 text-slate-400" />
              </div>
              <h4 className="mt-4 text-lg font-bold text-slate-900">
                {search || invoiceFilter !== 'all' ? 'No matches' : 'No invoices yet'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 font-semibold">
                {search ? 'Try different search' : 'Subscribe to a plan to get invoices'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => (
                <InvoiceRow key={inv.id} invoice={inv} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═══ PAYMENTS TAB ═══ */}
      {tab === 'payments' && (
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Payment History</h3>
                <p className="text-sm text-slate-500">
                  {filteredPayments.length} of {payments.length}
                </p>
              </div>
            </div>

            <div className="flex gap-1 flex-wrap">
              {[
                { v: 'all' as PaymentFilter, l: 'All', count: payments.length, c: 'bg-slate-900' },
                { v: 'pending' as PaymentFilter, l: 'Pending', count: payments.filter(p => p.status === 'PENDING').length, c: 'bg-amber-600' },
                { v: 'approved' as PaymentFilter, l: 'Approved', count: payments.filter(p => p.status === 'APPROVED').length, c: 'bg-emerald-600' },
                { v: 'rejected' as PaymentFilter, l: 'Rejected', count: payments.filter(p => p.status === 'REJECTED').length, c: 'bg-rose-600' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setPaymentFilter(opt.v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 ${
                    paymentFilter === opt.v ? `${opt.c} text-white shadow-sm` : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {opt.l}
                  <span className={`px-1.5 rounded-full text-[10px] font-extrabold ${
                    paymentFilter === opt.v ? 'bg-white/20' : 'bg-slate-200'
                  }`}>
                    {opt.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-16 w-16 text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-slate-900">
                {paymentFilter !== 'all' ? 'No matches' : 'No payments yet'}
              </h4>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredPayments.map((p) => (
                <PaymentRow key={p.id} payment={p} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ─── Helper components ─────────────────

function StatCard({ label, value, sub, icon: Icon, color, isAlert, isText }: any) {
  const colors: any = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    violet: 'from-violet-500 to-purple-700 shadow-violet-500/30',
  };
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${
      isAlert ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className={`mt-2 font-extrabold text-slate-900 tabular-nums truncate ${isText ? 'text-xl' : 'text-2xl'}`}>
            {value}
          </div>
          {sub && <div className="text-xs text-slate-600 font-semibold mt-1">{sub}</div>}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function InfoBox({ icon: Icon, label, value, color, sub }: any) {
  const colors: any = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    violet: 'bg-violet-100 text-violet-700',
  };
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`h-7 w-7 rounded-lg ${colors[color]} flex items-center justify-center`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600">{label}</span>
      </div>
      <div className="font-extrabold text-slate-900 text-sm">{value}</div>
      {sub && <div className="text-[10px] text-slate-500 font-bold mt-0.5">{sub}</div>}
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: any }) {
  const cfg = invoiceStatusConfig[invoice.status as InvoiceStatus];
  const Icon = cfg.icon;
  const isPayable = invoice.status === 'PENDING' || invoice.status === 'OVERDUE';
  const daysUntilDue = getDaysUntilDue(invoice.dueDate);

  const content = (
    <div className={`px-6 py-4 flex items-center justify-between gap-3 ${
      isPayable ? 'hover:bg-slate-50 transition group cursor-pointer' : ''
    }`}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`h-11 w-11 rounded-xl ${cfg.tone} flex items-center justify-center shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-slate-900 font-mono text-sm">{invoice.invoiceNumber}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${cfg.tone}`}>
              {cfg.label}
            </span>
            {invoice.status === 'PENDING' && daysUntilDue > 0 && (
              <span className="text-[10px] text-amber-700 font-bold">Due in {daysUntilDue}d</span>
            )}
            {invoice.status === 'OVERDUE' && (
              <span className="text-[10px] text-rose-700 font-extrabold">⚠️ {Math.abs(daysUntilDue)}d overdue</span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 truncate">
            {invoice.subscription?.plan?.name || invoice.description || 'Subscription'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-bold">
            {formatDate(invoice.createdAt)}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-extrabold text-slate-900 text-lg tabular-nums">{formatPKR(invoice.total)}</div>
        {isPayable && (
          <div className="text-[10px] text-amber-700 font-extrabold mt-0.5">
            Due: {formatPKR(invoice.amountDue)}
          </div>
        )}
        {isPayable && (
          <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold text-brand-700 group-hover:text-brand-800">
            Pay now
            <ArrowRight className="h-3 w-3" />
          </div>
        )}
      </div>
    </div>
  );

  return isPayable ? (
    <Link to={`/billing/invoice/${invoice.id}/pay`}>{content}</Link>
  ) : (
    <div>{content}</div>
  );
}

function PaymentRow({ payment }: { payment: any }) {
  const cfg = paymentStatusConfig[payment.status as PaymentStatus];
  const Icon = cfg.icon;
  const providerCfg = paymentProviderConfig[payment.provider as keyof typeof paymentProviderConfig];
  const ProviderIcon = providerCfg?.icon || CreditCard;

  return (
    <div className="px-6 py-4 hover:bg-slate-50 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`h-11 w-11 rounded-xl ${providerCfg?.bgClass || 'bg-slate-100'} text-white flex items-center justify-center shrink-0 shadow-md`}>
            <ProviderIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900">{formatPKR(payment.amount)}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${cfg.tone}`}>
                <Icon className="h-2.5 w-2.5" />
                {cfg.label}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-semibold">
              {providerCfg?.label || payment.provider} • {formatDateTime(payment.createdAt)}
            </div>
            {payment.invoice?.invoiceNumber && (
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono font-bold">
                Invoice: {payment.invoice.invoiceNumber}
              </div>
            )}
            {payment.transactionId && (
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                TXN: {payment.transactionId}
              </div>
            )}
            {payment.rejectionReason && (
              <div className="mt-2 rounded-lg bg-rose-50 border border-rose-200 px-2 py-1 text-[10px] text-rose-800 font-bold inline-flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {payment.rejectionReason}
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {payment.upload?.url && (
            <a
              href={payment.upload.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-extrabold transition"
            >
              <Download className="h-3 w-3" /> Receipt
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
