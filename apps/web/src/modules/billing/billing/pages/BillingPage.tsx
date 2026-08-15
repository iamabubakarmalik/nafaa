import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CreditCard, FileText, Clock, CheckCircle2, XCircle,
  AlertCircle, Sparkles, ArrowRight, Receipt, Download,
  Wrench, RefreshCw, BarChart3, TrendingUp, Wallet,
  Eye, ExternalLink, Calendar, Search, Filter, X,
  ChevronRight, Award, Hash, Building2, Smartphone, Zap, Globe,
  GraduationCap, Printer, FileDown, Copy, AlertTriangle,
  User as UserIcon, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { subscriptionsApi } from '@modules/billing/subscriptions/api/subscriptions.api';
import { billingApi, type InvoiceStatus, type PaymentStatus } from '@modules/billing/billing/api/billing.api';
import { apiClient } from '@core/api/client';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import {
  invoiceStatusConfig, paymentStatusConfig, subscriptionStatusConfig,
  paymentProviderConfig, formatDate, formatDateTime, formatRelative,
  getDaysUntilDue,
} from '../components/helpers';

/* ═════════════════════════════════════════════════════════════
   NAFAA BILLING — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌙 Dark mode complete
   🎓 Teacher modal — Billing lifecycle + payment guide
   ⌨️  / search • R refresh • T guide • Esc
   🔍 Detail modals (invoice + payment)
   🧾 Thermal receipt print + 📄 Full PDF download
   ⚠️ Smart overdue warnings + due date countdown
   ═════════════════════════════════════════════════════════════ */

type Tab = 'overview' | 'invoices' | 'payments';
type InvoiceFilter = 'all' | 'pending' | 'paid' | 'overdue';
type PaymentFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function BillingPage() {
  const queryClient = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('overview');
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [search, setSearch] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<any>(null);
  const [detailPayment, setDetailPayment] = useState<any>(null);

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

  const pendingInvoices = invoices.filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE');
  const paidInvoices = invoices.filter((i) => i.status === 'PAID');
  const showCleanup = pendingInvoices.length > 1;

  const stats = useMemo(() => {
    const totalPaid = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const totalDue = pendingInvoices.reduce((s, i) => s + (i.amountDue || 0), 0);
    const pendingPayments = payments.filter((p) => p.status === 'PENDING').length;
    const overdue = invoices.filter((i) => i.status === 'OVERDUE').length;
    return {
      totalPaid,
      totalDue,
      totalInvoices: invoices.length,
      paidCount: paidInvoices.length,
      pendingCount: pendingInvoices.length,
      pendingPayments,
      overdue,
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

  /* 🧾 THERMAL RECEIPT PRINT — Invoice */
  const printInvoiceReceipt = (inv: any) => {
    const cfg = invoiceStatusConfig[inv.status as InvoiceStatus];
    const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>Invoice ${inv.invoiceNumber}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; width: 80mm; padding: 4mm 3mm; margin: 0; color: #000; font-size: 11px; line-height: 1.3; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .big { font-size: 14px; }
  .huge { font-size: 18px; font-weight: 800; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .double-divider { border-top: 2px solid #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; margin: 2px 0; }
  .row .value { text-align: right; font-weight: 700; word-break: break-word; }
  .badge { display: inline-block; border: 1.5px solid #000; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 700; letter-spacing: 1px; margin: 4px 0; }
  .amount-box { border: 2px solid #000; padding: 6px; margin: 6px 0; text-align: center; }
  .footer { font-size: 9px; margin-top: 8px; }
  @media print { body { padding: 3mm 2mm; } }
</style></head><body>
  <div class="center bold big">Nafaa POS</div>
  <div class="center" style="font-size: 9px;">Subscription Invoice</div>
  <div class="divider"></div>
  <div class="center"><span class="badge">${cfg.label.toUpperCase()}</span></div>
  <div class="row"><span>Invoice #:</span><span class="value">${inv.invoiceNumber}</span></div>
  <div class="row"><span>Date:</span><span class="value">${formatDate(inv.createdAt)}</span></div>
  ${inv.dueDate ? `<div class="row"><span>Due Date:</span><span class="value">${formatDate(inv.dueDate)}</span></div>` : ''}
  ${inv.paidAt ? `<div class="row"><span>Paid On:</span><span class="value">${formatDate(inv.paidAt)}</span></div>` : ''}
  <div class="divider"></div>
  <div class="bold">Description:</div>
  <div style="margin: 3px 0; word-break: break-word;">${inv.subscription?.plan?.name || inv.description || 'Subscription'}</div>
  ${inv.subscription?.interval ? `<div class="row"><span>Billing:</span><span class="value">${inv.subscription.interval}</span></div>` : ''}
  <div class="divider"></div>
  <div class="row"><span>Subtotal:</span><span class="value">${formatPKR(inv.subtotal || inv.total)}</span></div>
  ${inv.tax ? `<div class="row"><span>Tax:</span><span class="value">${formatPKR(inv.tax)}</span></div>` : ''}
  ${inv.discount ? `<div class="row"><span>Discount:</span><span class="value">−${formatPKR(inv.discount)}</span></div>` : ''}
  <div class="amount-box">
    <div style="font-size: 10px;">${inv.status === 'PAID' ? 'AMOUNT PAID' : 'AMOUNT DUE'}</div>
    <div class="huge">${formatPKR(inv.status === 'PAID' ? inv.total : inv.amountDue)}</div>
  </div>
  <div class="double-divider"></div>
  <div class="center footer">Ye ek official invoice hai.<br/>Isay safely rakhein.</div>
  <div class="center footer bold" style="margin-top: 4px;">* * * SHUKRIYA * * *</div>
  <div class="center" style="font-size: 8px; margin-top: 6px;">Printed: ${new Date().toLocaleString('en-PK')}</div>
  <script>window.onload = function() { setTimeout(function() { window.print(); setTimeout(function() { window.close(); }, 500); }, 200); };</script>
</body></html>`;
    const w = window.open('', '_blank', 'width=380,height=700');
    if (!w) return toast.error('Popup blocked');
    w.document.write(html); w.document.close();
  };

  /* 📄 FULL PDF DOWNLOAD */
  const downloadFullPDF = () => {
    if (invoices.length === 0) return toast.error('Koi data nahi');
    const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>Billing Report — Nafaa POS</title>
<style>
  @page { size: A4; margin: 15mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; margin: 0; color: #0f172a; font-size: 11px; }
  .header { background: linear-gradient(135deg, #1e293b, #4c1d95); color: white; padding: 20px; border-radius: 10px; margin-bottom: 15px; }
  .header h1 { margin: 0; font-size: 22px; }
  .header .sub { font-size: 11px; opacity: 0.9; margin-top: 4px; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 15px; }
  .kpi { border: 2px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #f8fafc; }
  .kpi .lbl { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
  .kpi .val { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 3px; }
  .kpi .sub { font-size: 9px; color: #64748b; margin-top: 2px; }
  h3 { margin: 15px 0 8px 0; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 10px; }
  th { background: #0f172a; color: white; padding: 8px 6px; text-align: left; font-size: 9px; text-transform: uppercase; }
  th.right, td.right { text-align: right; }
  td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: 700; }
  .b-paid { background: #dcfce7; color: #166534; }
  .b-pending { background: #fef3c7; color: #92400e; }
  .b-overdue { background: #fee2e2; color: #991b1b; }
  .b-cancelled { background: #f1f5f9; color: #475569; }
  .footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #0f172a; font-size: 9px; color: #64748b; text-align: center; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
  <div class="header">
    <h1>💳 Billing Report</h1>
    <div class="sub">Nafaa POS • Generated: ${new Date().toLocaleString('en-PK')}</div>
  </div>
  <div class="meta">
    <div class="kpi"><div class="lbl">Total Paid</div><div class="val">${formatPKR(stats.totalPaid)}</div><div class="sub">${stats.paidCount} invoices</div></div>
    <div class="kpi"><div class="lbl">Amount Due</div><div class="val">${formatPKR(stats.totalDue)}</div><div class="sub">${stats.pendingCount} pending</div></div>
    <div class="kpi"><div class="lbl">Total Invoices</div><div class="val">${stats.totalInvoices}</div><div class="sub">All time</div></div>
    <div class="kpi"><div class="lbl">Overdue</div><div class="val">${stats.overdue}</div><div class="sub">Need attention</div></div>
  </div>
  <h3>📄 All Invoices</h3>
  <table>
    <thead><tr><th style="width:5%">#</th><th style="width:18%">Invoice</th><th style="width:15%">Date</th><th style="width:25%">Plan/Description</th><th style="width:12%">Status</th><th class="right" style="width:12%">Amount</th><th class="right" style="width:13%">Due</th></tr></thead>
    <tbody>
      ${invoices.map((i: any, idx: number) => {
        const statusClass = i.status === 'PAID' ? 'b-paid' : i.status === 'PENDING' ? 'b-pending' : i.status === 'OVERDUE' ? 'b-overdue' : 'b-cancelled';
        return `<tr>
          <td>${idx + 1}</td>
          <td style="font-family: 'Courier New', monospace; font-weight: 700;">${i.invoiceNumber}</td>
          <td>${formatDate(i.createdAt)}</td>
          <td>${(i.subscription?.plan?.name || i.description || 'Subscription').replace(/</g, '&lt;')}</td>
          <td><span class="badge ${statusClass}">${i.status}</span></td>
          <td class="right">${formatPKR(i.total)}</td>
          <td class="right">${i.status === 'PAID' ? '—' : formatPKR(i.amountDue)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
  ${payments.length > 0 ? `
  <h3>💰 Payment History</h3>
  <table>
    <thead><tr><th style="width:5%">#</th><th style="width:18%">Date</th><th style="width:15%">Provider</th><th style="width:22%">Transaction</th><th style="width:15%">Invoice</th><th style="width:12%">Status</th><th class="right" style="width:13%">Amount</th></tr></thead>
    <tbody>
      ${payments.map((p: any, idx: number) => {
        const statusClass = p.status === 'APPROVED' ? 'b-paid' : p.status === 'PENDING' ? 'b-pending' : 'b-overdue';
        return `<tr>
          <td>${idx + 1}</td>
          <td>${formatDateTime(p.createdAt)}</td>
          <td>${p.provider || '—'}</td>
          <td style="font-family: 'Courier New', monospace; font-size: 9px;">${p.transactionId || '—'}</td>
          <td style="font-family: 'Courier New', monospace; font-size: 9px;">${p.invoice?.invoiceNumber || '—'}</td>
          <td><span class="badge ${statusClass}">${p.status}</span></td>
          <td class="right">${formatPKR(p.amount)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>` : ''}
  <div class="footer"><strong>Nafaa POS</strong> • Official Billing Report • Powered by Nafaa POS</div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return toast.error('Popup blocked');
    w.document.write(html); w.document.close();
    toast.success('PDF ready — "Save as PDF" choose karo');
  };

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeacher) return setShowTeacher(false);
        if (detailInvoice) return setDetailInvoice(null);
        if (detailPayment) return setDetailPayment(null);
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); setTab('invoices'); setTimeout(() => searchRef.current?.focus(), 50); }
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); handleRefresh(); }
      if (e.key.toLowerCase() === 't') { e.preventDefault(); setShowTeacher(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, detailInvoice, detailPayment]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = (showTeacher || detailInvoice || detailPayment) ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher, detailInvoice, detailPayment]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <BillingTeacher onClose={() => setShowTeacher(false)} />}
      {detailInvoice && (
        <InvoiceDetailModal
          invoice={detailInvoice}
          onClose={() => setDetailInvoice(null)}
          onPrint={() => printInvoiceReceipt(detailInvoice)}
        />
      )}
      {detailPayment && (
        <PaymentDetailModal
          payment={detailPayment}
          onClose={() => setDetailPayment(null)}
        />
      )}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 dark:from-slate-950 dark:via-brand-950 dark:to-brand-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <CreditCard className="h-3.5 w-3.5 text-amber-300" />
              Billing & Subscription
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">💳 Billing Center</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-emerald-300">{formatPKR(stats.totalPaid)}</strong> paid
              <span className="opacity-50 mx-1.5">•</span>
              {stats.totalDue > 0 && (<>
                <strong className="text-amber-300">{formatPKR(stats.totalDue)}</strong> due
                <span className="opacity-50 mx-1.5">•</span>
              </>)}
              <strong>{stats.totalInvoices}</strong> invoices
              {stats.overdue > 0 && (<>
                <span className="opacity-50 mx-1.5">•</span>
                <strong className="text-rose-300">⚠️ {stats.overdue} overdue</strong>
              </>)}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
            >
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={refetchingInvoices}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${refetchingInvoices ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={downloadFullPDF}
              disabled={invoices.length === 0}
              className="h-11 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg disabled:opacity-50 transition"
            >
              <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">Full PDF</span>
            </button>
            <Link to="/plan">
              <button className="h-11 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-sm font-extrabold inline-flex items-center gap-1.5 shadow-lg transition">
                <Sparkles className="h-4 w-4" />
                {current?.status === 'TRIAL' ? 'Upgrade' : 'Plans'}
              </button>
            </Link>
          </div>
        </div>

        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>R</Kbd><span className="text-white/60">Refresh</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>T</Kbd><span className="text-white/60">Guide</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Band</span>
        </div>
      </section>

      {/* ═══ TABS ═══ */}
      <section className="flex gap-2 overflow-x-auto pb-1 print:hidden">
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
                  : 'bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-500/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.count !== undefined && (
                <span className={`px-1.5 rounded-full text-[10px] font-extrabold ${
                  active ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </section>

      {/* ═══ STATS ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard label="Total Paid" value={formatPKR(stats.totalPaid)} sub={`${stats.paidCount} invoices`} icon={CheckCircle2} color="emerald" isText />
        <StatCard label="Amount Due" value={formatPKR(stats.totalDue)} sub={`${stats.pendingCount} pending`} icon={Clock} color="amber" isText isAlert={stats.totalDue > 0} />
        <StatCard label="Total Invoices" value={String(stats.totalInvoices)} sub="All time" icon={Receipt} color="blue" />
        <StatCard label="Pending Reviews" value={String(stats.pendingPayments)} sub="Under review" icon={FileText} color="violet" />
      </section>

      {/* ═══ CLEANUP WARNING ═══ */}
      {showCleanup && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 border-2 border-orange-300 dark:border-orange-500/40 p-4 sm:p-5 shadow-sm">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/30">
              <Wrench className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-widest font-extrabold text-orange-700 dark:text-orange-300 mb-1">
                Action Required
              </div>
              <h3 className="font-extrabold text-orange-900 dark:text-orange-200 text-lg">
                {pendingInvoices.length} Pending Invoices — Cleanup Needed
              </h3>
              <p className="text-xs text-orange-800 dark:text-orange-300 mt-1 font-semibold">
                Duplicate pending payments hain. Latest rakho aur baqi automatic cancel kar do.
              </p>
            </div>
            <Button
              onClick={() => cleanupMutation.mutate()}
              loading={cleanupMutation.isPending}
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-lg shadow-orange-500/30 font-extrabold"
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
            <div className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 p-6 animate-pulse h-48" />
          ) : current && current.plan && currentCfg ? (
            <section className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/50 border-2 ${currentCfg.borderTone} dark:border-brand-500/40 shadow-lg`}>
              <div
                className="absolute -top-12 -right-12 h-48 w-48 rounded-full opacity-10 dark:opacity-20 blur-3xl"
                style={{ backgroundColor: currentCfg.hex }}
              />
              <div className="relative p-5 sm:p-6">
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
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">
                        Current Subscription
                      </div>
                      <h3 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                        {current.plan.name}
                      </h3>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-extrabold text-xs ${currentCfg.tone}`}>
                          <CurrentIcon className="h-3 w-3" />
                          {currentCfg.label}
                        </span>
                        {current.amount > 0 && (
                          <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
                            {formatPKR(current.amount)}
                            <span className="text-slate-500 dark:text-slate-400 font-semibold"> / {current.interval?.toLowerCase()}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-semibold">
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
                      return days > 0 ? `${days} din baaki` : days === 0 ? 'Aaj' : `${Math.abs(days)} din pehle`;
                    })()}
                  />
                  <InfoBox
                    icon={Wallet}
                    label="Billing"
                    value={current.interval || '—'}
                    color="violet"
                    sub={current.autoRenew ? '✓ Auto-renew on' : 'Manual'}
                  />
                </div>
              </div>
            </section>
          ) : null}

          {/* Pending upgrade */}
          {pendingUpgrade && (
            <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-5 sm:p-6 shadow-lg">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30">
                  <Clock className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300 mb-1">
                    Upgrade Pending Payment
                  </div>
                  <h3 className="text-xl font-extrabold text-amber-900 dark:text-amber-200">
                    {pendingUpgrade.subscription.plan.name}
                    <span className="text-amber-700 dark:text-amber-400 ml-2 text-base">
                      {formatPKR(pendingUpgrade.subscription.amount)}
                    </span>
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-300 mt-1 font-semibold">
                    Payment karne ke baad ye plan activate ho jayega. Current{' '}
                    {current?.status === 'TRIAL' ? 'trial' : 'plan'} chalta rahega.
                  </p>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Link to={`/billing/invoice/${pendingUpgrade.invoice.id}/pay`}>
                      <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30 font-extrabold">
                        <CreditCard className="h-4 w-4" />
                        Pay {formatPKR(pendingUpgrade.invoice.amountDue)}
                      </Button>
                    </Link>
                    <span className="text-xs text-amber-700 dark:text-amber-300 font-mono font-bold bg-amber-100 dark:bg-amber-500/20 px-2 py-1 rounded-lg">
                      {pendingUpgrade.invoice.invoiceNumber}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Recent Invoices */}
          {invoices.length > 0 && (
            <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-md">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white">Recent Invoices</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Latest 5 entries</p>
                  </div>
                </div>
                <button
                  onClick={() => setTab('invoices')}
                  className="text-xs font-extrabold text-brand-700 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
                >
                  View All <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.slice(0, 5).map((inv) => (
                  <InvoiceRow key={inv.id} invoice={inv} onView={() => setDetailInvoice(inv)} />
                ))}
              </div>
            </section>
          )}

          {/* Recent Payments */}
          {payments.length > 0 && (
            <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white">Recent Payments</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Latest 5 entries</p>
                  </div>
                </div>
                <button
                  onClick={() => setTab('payments')}
                  className="text-xs font-extrabold text-brand-700 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
                >
                  View All <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.slice(0, 5).map((p) => (
                  <PaymentRow key={p.id} payment={p} onView={() => setDetailPayment(p)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ═══ INVOICES TAB ═══ */}
      {tab === 'invoices' && (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-5 border-b-2 border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">All Invoices</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    {filteredInvoices.length} of {invoices.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Invoice #, description, plan dhundo... (/)"
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            <div className="flex gap-1 flex-wrap">
              {[
                { v: 'all' as InvoiceFilter, l: 'All', count: invoices.length, c: 'bg-slate-900 dark:bg-white dark:text-slate-900' },
                { v: 'pending' as InvoiceFilter, l: 'Pending', count: invoices.filter(i => i.status === 'PENDING').length, c: 'bg-amber-600' },
                { v: 'paid' as InvoiceFilter, l: 'Paid', count: invoices.filter(i => i.status === 'PAID').length, c: 'bg-emerald-600' },
                { v: 'overdue' as InvoiceFilter, l: 'Overdue', count: invoices.filter(i => i.status === 'OVERDUE').length, c: 'bg-rose-600' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setInvoiceFilter(opt.v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition inline-flex items-center gap-1.5 ${
                    invoiceFilter === opt.v ? `${opt.c} text-white shadow-sm` : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {opt.l}
                  <span className={`px-1.5 rounded-full text-[10px] font-extrabold ${
                    invoiceFilter === opt.v ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
                  }`}>
                    {opt.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Receipt className="h-10 w-10 text-slate-400 dark:text-slate-500" />
              </div>
              <h4 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
                {search || invoiceFilter !== 'all' ? 'Kuch nahi mila' : 'Abhi koi invoice nahi'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                {search ? 'Filter change karo' : 'Plan subscribe karo — invoices milna shuru hongi'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.map((inv) => (
                <InvoiceRow key={inv.id} invoice={inv} onView={() => setDetailInvoice(inv)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═══ PAYMENTS TAB ═══ */}
      {tab === 'payments' && (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-5 border-b-2 border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Payment History</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  {filteredPayments.length} of {payments.length}
                </p>
              </div>
            </div>

            <div className="flex gap-1 flex-wrap">
              {[
                { v: 'all' as PaymentFilter, l: 'All', count: payments.length, c: 'bg-slate-900 dark:bg-white dark:text-slate-900' },
                { v: 'pending' as PaymentFilter, l: 'Pending', count: payments.filter(p => p.status === 'PENDING').length, c: 'bg-amber-600' },
                { v: 'approved' as PaymentFilter, l: 'Approved', count: payments.filter(p => p.status === 'APPROVED').length, c: 'bg-emerald-600' },
                { v: 'rejected' as PaymentFilter, l: 'Rejected', count: payments.filter(p => p.status === 'REJECTED').length, c: 'bg-rose-600' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setPaymentFilter(opt.v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition inline-flex items-center gap-1.5 ${
                    paymentFilter === opt.v ? `${opt.c} text-white shadow-sm` : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {opt.l}
                  <span className={`px-1.5 rounded-full text-[10px] font-extrabold ${
                    paymentFilter === opt.v ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
                  }`}>
                    {opt.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h4 className="font-extrabold text-slate-900 dark:text-white">
                {paymentFilter !== 'all' ? 'Kuch nahi mila' : 'Abhi koi payment nahi'}
              </h4>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPayments.map((p) => (
                <PaymentRow key={p.id} payment={p} onView={() => setDetailPayment(p)} />
              ))}
            </div>
          )}
        </section>
      )}

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm 10mm; }
          html, body { background: white !important; color: #0f172a !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   INVOICE DETAIL MODAL
   ═════════════════════════════════════════════════════════════ */
function InvoiceDetailModal({ invoice, onClose, onPrint }: any) {
  const cfg = invoiceStatusConfig[invoice.status as InvoiceStatus];
  const Icon = cfg.icon;
  const daysUntilDue = getDaysUntilDue(invoice.dueDate);
  const isPayable = invoice.status === 'PENDING' || invoice.status === 'OVERDUE';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative overflow-hidden top-0 z-10">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-extrabold border border-white/30 mb-2">
                <Icon className="h-3 w-3" />
                {cfg.label}
              </div>
              <h3 className="text-lg font-extrabold leading-tight font-mono">{invoice.invoiceNumber}</h3>
              <div className="text-xs text-white/80 mt-1 font-semibold">
                {invoice.subscription?.plan?.name || invoice.description || 'Subscription'}
              </div>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className={`rounded-2xl p-4 text-center border-2 ${
            invoice.status === 'PAID'
              ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border-emerald-200 dark:border-emerald-500/40'
              : invoice.status === 'OVERDUE'
                ? 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-500/10 dark:to-red-500/10 border-rose-200 dark:border-rose-500/40'
                : 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-amber-200 dark:border-amber-500/40'
          }`}>
            <div className={`text-[10px] uppercase tracking-widest font-extrabold ${
              invoice.status === 'PAID' ? 'text-emerald-700 dark:text-emerald-300' :
              invoice.status === 'OVERDUE' ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'
            }`}>
              {invoice.status === 'PAID' ? 'Amount Paid' : 'Amount Due'}
            </div>
            <div className={`text-4xl font-extrabold tabular-nums mt-1 ${
              invoice.status === 'PAID' ? 'text-emerald-700 dark:text-emerald-400' :
              invoice.status === 'OVERDUE' ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'
            }`}>
              {formatPKR(invoice.status === 'PAID' ? invoice.total : invoice.amountDue)}
            </div>
            {invoice.status === 'OVERDUE' && (
              <div className="mt-2 text-xs font-extrabold text-rose-700 dark:text-rose-400 inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {Math.abs(daysUntilDue)} din overdue
              </div>
            )}
            {invoice.status === 'PENDING' && daysUntilDue > 0 && (
              <div className="mt-2 text-xs font-extrabold text-amber-700 dark:text-amber-400">
                ⏱️ Due in {daysUntilDue} din
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-800/40 border-2 border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
            <DetailRow icon={Hash} label="Invoice #" value={invoice.invoiceNumber} mono />
            <DetailRow icon={Calendar} label="Issue Date" value={formatDate(invoice.createdAt)} />
            {invoice.dueDate && <DetailRow icon={Clock} label="Due Date" value={formatDate(invoice.dueDate)} />}
            {invoice.paidAt && <DetailRow icon={CheckCircle2} label="Paid On" value={formatDateTime(invoice.paidAt)} />}
            {invoice.subscription?.plan?.name && <DetailRow icon={Award} label="Plan" value={invoice.subscription.plan.name} />}
            {invoice.subscription?.interval && <DetailRow icon={Wallet} label="Billing Cycle" value={invoice.subscription.interval} />}
          </div>

          {(invoice.subtotal || invoice.tax || invoice.discount) && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-sm font-semibold">
              {invoice.subtotal && <div className="flex justify-between text-slate-700 dark:text-slate-200"><span>Subtotal</span><span className="tabular-nums">{formatPKR(invoice.subtotal)}</span></div>}
              {invoice.tax > 0 && <div className="flex justify-between text-slate-700 dark:text-slate-200"><span>Tax</span><span className="tabular-nums">+{formatPKR(invoice.tax)}</span></div>}
              {invoice.discount > 0 && <div className="flex justify-between text-emerald-700 dark:text-emerald-400"><span>Discount</span><span className="tabular-nums">−{formatPKR(invoice.discount)}</span></div>}
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold text-base"><span>Total</span><span className="tabular-nums">{formatPKR(invoice.total)}</span></div>
            </div>
          )}

          {invoice.description && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-3">
              <div className="text-[10px] uppercase tracking-widest font-extrabold text-blue-700 dark:text-blue-300 mb-1">📝 Description</div>
              <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold">{invoice.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onPrint}
              className="h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition"
            >
              <Printer className="h-4 w-4" /> Print Receipt
            </button>
            {isPayable ? (
              <Link to={`/billing/invoice/${invoice.id}/pay`}>
                <button className="h-11 w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-lg shadow-brand-500/30 transition">
                  <CreditCard className="h-4 w-4" /> Pay Now
                </button>
              </Link>
            ) : (
              <button
                onClick={() => { navigator.clipboard.writeText(invoice.invoiceNumber); toast.success('Copied'); }}
                className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition"
              >
                <Copy className="h-4 w-4" /> Copy Invoice #
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   PAYMENT DETAIL MODAL
   ═════════════════════════════════════════════════════════════ */
function PaymentDetailModal({ payment, onClose }: any) {
  const cfg = paymentStatusConfig[payment.status as PaymentStatus];
  const Icon = cfg.icon;
  const providerCfg = paymentProviderConfig[payment.provider as keyof typeof paymentProviderConfig];
  const ProviderIcon = providerCfg?.icon || CreditCard;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-violet-300 dark:border-violet-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-br from-violet-600 to-purple-700 text-white relative overflow-hidden top-0 z-10">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-extrabold border border-white/30 mb-2">
                <Icon className="h-3 w-3" />
                {cfg.label}
              </div>
              <h3 className="text-lg font-extrabold leading-tight">Payment Details</h3>
              <div className="text-xs text-white/80 mt-1 font-semibold flex items-center gap-1">
                <ProviderIcon className="h-3 w-3" />
                {providerCfg?.label || payment.provider}
              </div>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 border-2 border-violet-200 dark:border-violet-500/40 p-4 text-center">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-violet-700 dark:text-violet-300">Amount</div>
            <div className="text-4xl font-extrabold text-violet-700 dark:text-violet-400 tabular-nums mt-1">
              {formatPKR(payment.amount)}
            </div>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-800/40 border-2 border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
            <DetailRow icon={Clock} label="Date & Time" value={formatDateTime(payment.createdAt)} />
            <DetailRow icon={ProviderIcon} label="Provider" value={providerCfg?.label || payment.provider} />
            {payment.transactionId && <DetailRow icon={Hash} label="Transaction ID" value={payment.transactionId} mono />}
            {payment.invoice?.invoiceNumber && <DetailRow icon={Receipt} label="Invoice" value={payment.invoice.invoiceNumber} mono />}
            {payment.approvedAt && <DetailRow icon={CheckCircle2} label="Approved At" value={formatDateTime(payment.approvedAt)} />}
            {payment.approvedBy?.fullName && <DetailRow icon={UserIcon} label="Approved By" value={payment.approvedBy.fullName} />}
          </div>

          {payment.rejectionReason && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/40 p-3">
              <div className="text-[10px] uppercase tracking-widest font-extrabold text-rose-700 dark:text-rose-300 mb-1 flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Rejection Reason
              </div>
              <p className="text-sm text-rose-900 dark:text-rose-200 font-semibold">{payment.rejectionReason}</p>
            </div>
          )}

          {payment.notes && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3">
              <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300 mb-1">📝 Notes</div>
              <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold whitespace-pre-wrap">{payment.notes}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {payment.upload?.url && (
              <a
                href={payment.upload.url}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-lg transition"
              >
                <Download className="h-4 w-4" /> Receipt
              </a>
            )}
            {payment.transactionId && (
              <button
                onClick={() => { navigator.clipboard.writeText(payment.transactionId); toast.success('TXN copied'); }}
                className="h-11 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-lg transition"
              >
                <Copy className="h-4 w-4" /> Copy TXN
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, mono }: any) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-extrabold uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-sm font-extrabold text-slate-900 dark:text-white text-right break-words min-w-0 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   BILLING TEACHER
   ═════════════════════════════════════════════════════════════ */
function BillingTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-brand-300 dark:border-brand-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-brand-200 dark:border-brand-500/30 bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-brand-500/15 dark:to-indigo-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-brand-900 dark:text-brand-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Billing — Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Billing center = tumhari subscription ka control panel.</strong> Plans, invoices, payments — sab yahan. Transparent, tracked, auditable.
          </p>

          {/* Invoice lifecycle */}
          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Receipt className="h-3 w-3" /> Invoice Lifecycle
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 p-2">
                🟡 <strong>PENDING:</strong> Invoice ban gaya, payment ka intezaar. Due date se pehle pay kar do.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 p-2">
                🔴 <strong>OVERDUE:</strong> Due date guzar gaya. Warning aayegi. Foran pay karo warna service band ho sakti hai.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 p-2">
                🟢 <strong>PAID:</strong> Payment approve ho gaya. Print karke record rakh lo.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 p-2">
                ⚫ <strong>CANCELLED:</strong> Invoice cancel ho gaya (upgrade/downgrade ki wajah se). No action needed.
              </div>
            </div>
          </div>

          {/* Payment lifecycle */}
          <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-violet-700 dark:text-violet-300 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Payment Lifecycle
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-500/30 p-2">
                🟡 <strong>PENDING:</strong> Payment submit ho gayi, review me hai (usually 1-24 hrs manual review).
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-500/30 p-2">
                🟢 <strong>APPROVED:</strong> Payment verify ho gayi. Invoice auto-mark ho gayi paid.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-500/30 p-2">
                🔴 <strong>REJECTED:</strong> Ghalat proof/transaction ID. Rejection reason padho, dobara submit karo.
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>🔍 Detail View:</strong> Kisi bhi row pe click karo → full details modal (invoice + payment dono).</TipRow>
            <TipRow><strong>🧾 Print Receipt:</strong> Invoice detail me "Print Receipt" — 80mm thermal POS printer format.</TipRow>
            <TipRow><strong>📄 Full PDF:</strong> Hero me "Full PDF" — poori billing history ka A4 professional report.</TipRow>
            <TipRow><strong>⏱️ Due countdown:</strong> Pending invoices pe "Due in Xd" ya "Xd overdue" auto-show.</TipRow>
            <TipRow><strong>⚠️ Cleanup:</strong> Multiple pending invoices ho to auto-warning + cleanup button.</TipRow>
            <TipRow><strong>🎯 Filters:</strong> Status chips (Pending/Paid/Overdue/Approved/Rejected) — one-click filter.</TipRow>
            <TipRow><strong>💡 Auto-renew:</strong> Overview me current plan pe "Auto-renew on/Manual" show hota hai.</TipRow>
          </div>

          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            💡 <strong>Pro tip:</strong> Har payment ke baad receipt file me rakho (print karke ya PDF). Sal ke end tax filing ya audit ke time kaam ata hai. Digital + physical dono record — best practice!
          </div>

          <Button
            className="w-full bg-gradient-to-r from-brand-600 to-indigo-700 hover:from-brand-700 hover:to-indigo-800 font-extrabold shadow-lg shadow-brand-500/40 h-12"
            onClick={onClose}
          >
            <ShieldCheck className="h-4 w-4" /> Samajh Gaya — Manage Karo!
          </Button>
        </div>
      </div>
    </div>
  );
}

function TipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm">
      {children}
    </kbd>
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
    <div className={`rounded-2xl border-2 p-3 sm:p-4 shadow-sm hover:shadow-md transition ${
      isAlert
        ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-amber-300 dark:border-amber-500/40'
        : 'bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-slate-200 dark:border-slate-800'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className={`mt-1.5 font-extrabold text-slate-900 dark:text-white tabular-nums truncate ${isText ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}`}>
            {value}
          </div>
          {sub && <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function InfoBox({ icon: Icon, label, value, color, sub }: any) {
  const colors: any = {
    slate: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
    blue: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    violet: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300',
  };
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`h-7 w-7 rounded-lg ${colors[color]} flex items-center justify-center`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-600 dark:text-slate-400">{label}</span>
      </div>
      <div className="font-extrabold text-slate-900 dark:text-white text-sm">{value}</div>
      {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">{sub}</div>}
    </div>
  );
}

function InvoiceRow({ invoice, onView }: { invoice: any; onView: () => void }) {
  const cfg = invoiceStatusConfig[invoice.status as InvoiceStatus];
  const Icon = cfg.icon;
  const isPayable = invoice.status === 'PENDING' || invoice.status === 'OVERDUE';
  const daysUntilDue = getDaysUntilDue(invoice.dueDate);

  return (
    <div
      onClick={onView}
      className="px-5 sm:px-6 py-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`h-11 w-11 rounded-xl ${cfg.tone} flex items-center justify-center shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-slate-900 dark:text-white font-mono text-sm">{invoice.invoiceNumber}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${cfg.tone}`}>
              {cfg.label}
            </span>
            {invoice.status === 'PENDING' && daysUntilDue > 0 && (
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-extrabold">⏱️ Due in {daysUntilDue}d</span>
            )}
            {invoice.status === 'OVERDUE' && (
              <span className="text-[10px] text-rose-700 dark:text-rose-400 font-extrabold">⚠️ {Math.abs(daysUntilDue)}d overdue</span>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate font-semibold">
            {invoice.subscription?.plan?.name || invoice.description || 'Subscription'}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-bold">
            {formatDate(invoice.createdAt)}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0 flex items-center gap-2">
        <div>
          <div className="font-extrabold text-slate-900 dark:text-white text-lg tabular-nums">{formatPKR(invoice.total)}</div>
          {isPayable && (
            <div className="text-[10px] text-amber-700 dark:text-amber-400 font-extrabold mt-0.5">
              Due: {formatPKR(invoice.amountDue)}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onView}
            className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-500/30 flex items-center justify-center transition"
            title="View details"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          {isPayable && (
            <Link
              to={`/billing/invoice/${invoice.id}/pay`}
              className="h-8 w-8 rounded-lg bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-500/30 flex items-center justify-center transition"
              title="Pay"
            >
              <CreditCard className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentRow({ payment, onView }: { payment: any; onView: () => void }) {
  const cfg = paymentStatusConfig[payment.status as PaymentStatus];
  const Icon = cfg.icon;
  const providerCfg = paymentProviderConfig[payment.provider as keyof typeof paymentProviderConfig];
  const ProviderIcon = providerCfg?.icon || CreditCard;

  return (
    <div
      onClick={onView}
      className="px-5 sm:px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`h-11 w-11 rounded-xl ${providerCfg?.bgClass || 'bg-slate-100 dark:bg-slate-700'} text-white flex items-center justify-center shrink-0 shadow-md`}>
            <ProviderIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(payment.amount)}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${cfg.tone}`}>
                <Icon className="h-2.5 w-2.5" />
                {cfg.label}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
              {providerCfg?.label || payment.provider} • {formatDateTime(payment.createdAt)}
            </div>
            {payment.invoice?.invoiceNumber && (
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono font-bold">
                Invoice: {payment.invoice.invoiceNumber}
              </div>
            )}
            {payment.transactionId && (
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                TXN: {payment.transactionId}
              </div>
            )}
            {payment.rejectionReason && (
              <div className="mt-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 px-2 py-1 text-[10px] text-rose-800 dark:text-rose-300 font-bold inline-flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {payment.rejectionReason}
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0 flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onView}
            className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-500/30 flex items-center justify-center transition"
            title="View details"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          {payment.upload?.url && (
            <a
              href={payment.upload.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/30 flex items-center justify-center transition"
              title="Receipt"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
