import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, ArrowDownToLine, ArrowUpFromLine, Wallet, Users, AlertTriangle,
  Search, X, MessageCircle, Printer, Download, Phone, Calendar,
  TrendingUp, Sparkles, CheckCircle2, Clock, User as UserIcon,
  ChevronRight, History, Star, AlertCircle, Zap, Info,
  ChevronDown, Copy, Send, GraduationCap, FileText, FileDown,
  RefreshCw, Eye, CalendarRange, CalendarDays, Receipt, Filter,
} from 'lucide-react';
import { customerLedgerApi, type LedgerType } from '@modules/customers/khata/api/customer-ledger.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import { getKhataLedger } from '@core/lib/offline/offlineKhata';
import { useIndustryKhataPresets } from '@industries/_shared/presets';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA KHATA (UDHAAR BOOK) — FULL BEST v5
   ─────────────────────────────────────────────────────────────
   🖨️ A4 Customer Statement — colored, bank-style, signatures
   📊 A4 All-Customers Khata Summary — aging + grand total
   🧾 80mm thermal payment voucher (har payment ka receipt)
   📅 Custom date range (ledger history filter)
   🎓 Teacher modal • 🌙 Dark mode complete
   ⌨️  / = search • P = print • T = guide • Esc = band
   💬 Industry WhatsApp reminders • ⚡ Quick amounts
   ═════════════════════════════════════════════════════════════ */

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const formatDateOnly = (value: string | Date) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(value));
const formatRelative = (value: string) => {
  const d = new Date(value);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Abhi';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-PK');
};
const daysSince = (value: string) =>
  Math.floor((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24));

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const toDateInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const typeConfig: Record<LedgerType, {
  label: string; tone: string; iconBg: string; icon: any; isCredit: boolean; hex: string;
}> = {
  SALE_CREDIT:      { label: 'Udhaar (Credit)',    tone: 'text-rose-700 dark:text-rose-400',       iconBg: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',       icon: ArrowUpFromLine, isCredit: true,  hex: '#e11d48' },
  PAYMENT_RECEIVED: { label: 'Payment Received',   tone: 'text-emerald-700 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', icon: ArrowDownToLine, isCredit: false, hex: '#059669' },
  ADJUSTMENT:       { label: 'Adjustment',         tone: 'text-slate-700 dark:text-slate-300',     iconBg: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',     icon: AlertCircle,     isCredit: false, hex: '#64748b' },
  OPENING_BALANCE:  { label: 'Opening Balance',    tone: 'text-blue-700 dark:text-blue-400',       iconBg: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',       icon: BookOpen,        isCredit: true,  hex: '#2563eb' },
};

type FilterMode = 'all' | 'credit' | 'cleared';
type LedgerPeriod = 'all' | 'month' | 'custom';

export default function KhataPage() {
  const queryClient = useQueryClient();
  const industryKhata = useIndustryKhataPresets();
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name || s.tenant?.name || 'Nafaa POS');
  const shopPhone = useAuthStore((s: any) => s.user?.assignedShop?.phone || s.tenant?.phone || '');
  const shopAddress = useAuthStore((s: any) => s.user?.assignedShop?.address || s.tenant?.address || '');

  const searchRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('credit');
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showPaymentNotes, setShowPaymentNotes] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);

  // 📅 Ledger history period filter
  const [ledgerPeriod, setLedgerPeriod] = useState<LedgerPeriod>('all');
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [customFrom, setCustomFrom] = useState<string>(toDateInput(monthStart));
  const [customTo, setCustomTo] = useState<string>(toDateInput(today));

  const { data: allCustomers, refetch, isRefetching } = useQuery({
    queryKey: ['customers-for-khata'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
  });

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ['khata-ledger', selectedCustomerId],
    queryFn: () => getKhataLedger(selectedCustomerId!),
    enabled: !!selectedCustomerId,
  });

  const paymentMutation = useMutation({
    mutationFn: ({ customerId, payload }: any) =>
      customerLedgerApi.receivePayment(customerId, payload),
    onSuccess: (_, vars: any) => {
      toast.success(`✓ ${formatPKR(vars.payload.amount)} payment record ho gayi`, {
        description: 'Customer ka khata update ho gaya',
      });
      setPaymentAmount('');
      setPaymentNote('');
      queryClient.invalidateQueries({ queryKey: ['khata-summary'] });
      queryClient.invalidateQueries({ queryKey: ['khata-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['customers-for-khata'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Payment fail ho gayi');
    },
  });

  const handleReceivePayment = () => {
    if (!selectedCustomerId) return;
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return toast.error('Valid amount likhein');
    if (ledgerData && amount > ledgerData.customer.balance) {
      if (!confirm(`Amount (${formatPKR(amount)}) balance (${formatPKR(ledgerData.customer.balance)}) se zyada hai.\n\nPhir bhi continue karein?`)) {
        return;
      }
    }
    paymentMutation.mutate({
      customerId: selectedCustomerId,
      payload: { amount, note: paymentNote.trim() || undefined },
    });
  };

  const customers = allCustomers?.items || [];

  const filteredCustomers = useMemo(() => {
    let result = [...customers];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q),
      );
    }
    if (filter === 'credit') result = result.filter((c) => c.balance > 0);
    else if (filter === 'cleared') result = result.filter((c) => c.balance === 0);
    return result.sort((a, b) => b.balance - a.balance);
  }, [customers, search, filter]);

  const stats = useMemo(() => {
    const withCredit = customers.filter((c) => c.balance > 0);
    const totalOutstanding = withCredit.reduce((sum, c) => sum + c.balance, 0);
    const avgBalance = withCredit.length > 0 ? totalOutstanding / withCredit.length : 0;
    const top5 = [...withCredit].sort((a, b) => b.balance - a.balance).slice(0, 5);
    const top5Total = top5.reduce((s, c) => s + c.balance, 0);
    return {
      totalOutstanding,
      customersWithCredit: withCredit.length,
      avgBalance,
      totalCustomers: customers.length,
      top5Pct: totalOutstanding > 0 ? Math.round((top5Total / totalOutstanding) * 100) : 0,
    };
  }, [customers]);

  const selectedCustomer = ledgerData?.customer;

  const overdueDays = useMemo(() => {
    if (!ledgerData?.ledgers?.length) return 0;
    const oldestCredit = ledgerData.ledgers
      .filter((l) => l.type === 'SALE_CREDIT' || l.type === 'OPENING_BALANCE')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    return oldestCredit ? daysSince(oldestCredit.createdAt) : 0;
  }, [ledgerData]);

  /* ─── Ledger history: period filter ─── */
  const filteredLedgers = useMemo(() => {
    if (!ledgerData?.ledgers) return [];
    if (ledgerPeriod === 'all') return ledgerData.ledgers;
    if (ledgerPeriod === 'month') {
      const start = new Date(); start.setDate(start.getDate() - 30); start.setHours(0, 0, 0, 0);
      return ledgerData.ledgers.filter((l) => new Date(l.createdAt) >= start);
    }
    const from = new Date(customFrom + 'T00:00:00').getTime();
    const to = new Date(customTo + 'T23:59:59').getTime();
    return ledgerData.ledgers.filter((l) => {
      const t = new Date(l.createdAt).getTime();
      return t >= from && t <= to;
    });
  }, [ledgerData, ledgerPeriod, customFrom, customTo]);

  const ledgerPeriodLabel = useMemo(() => {
    if (ledgerPeriod === 'all') return 'All Time';
    if (ledgerPeriod === 'month') return 'Pichlay 30 Din';
    return `${formatDateOnly(customFrom)} — ${formatDateOnly(customTo)}`;
  }, [ledgerPeriod, customFrom, customTo]);

  /* ─── Customer aging buckets ─── */
  const aging = useMemo(() => {
    if (!ledgerData?.ledgers || !selectedCustomer || selectedCustomer.balance <= 0) return null;
    const credits = ledgerData.ledgers
      .filter((l) => l.type === 'SALE_CREDIT' || l.type === 'OPENING_BALANCE')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    // Simple FIFO: apply payments to oldest credits
    const totalPaid = ledgerData.ledgers
      .filter((l) => l.type === 'PAYMENT_RECEIVED')
      .reduce((s, l) => s + Math.abs(l.amount), 0);
    let remaining = totalPaid;
    const buckets = { fresh: 0, mid: 0, old: 0 }; // 0-15, 16-30, 30+
    for (const c of credits) {
      let amt = Math.abs(c.amount);
      if (remaining >= amt) { remaining -= amt; continue; }
      amt -= remaining; remaining = 0;
      const days = daysSince(c.createdAt);
      if (days <= 15) buckets.fresh += amt;
      else if (days <= 30) buckets.mid += amt;
      else buckets.old += amt;
    }
    return buckets;
  }, [ledgerData, selectedCustomer]);

  /* ═══ WhatsApp reminders (industry templates) ═══ */
  const sendWhatsAppReminder = (reminderId?: string) => {
    if (!selectedCustomer?.phone) {
      toast.error('Customer phone available nahi hai');
      return;
    }
    const template = industryKhata.reminders.find((r) => r.id === reminderId) || industryKhata.reminders[0];
    const phone = selectedCustomer.phone.replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    const msg = template.template({
      customerName: selectedCustomer.name,
      balance: formatPKR(selectedCustomer.balance),
      shopName: tenant?.name || undefined,
      daysOverdue: overdueDays,
    });
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    toast.success(`${template.emoji} ${template.label} WhatsApp pe bhej diya`);
    setShowReminderPicker(false);
  };

  const copyReminderText = (reminderId: string) => {
    if (!selectedCustomer) return;
    const template = industryKhata.reminders.find((r) => r.id === reminderId);
    if (!template) return;
    const msg = template.template({
      customerName: selectedCustomer.name,
      balance: formatPKR(selectedCustomer.balance),
      shopName: tenant?.name || undefined,
      daysOverdue: overdueDays,
    });
    navigator.clipboard.writeText(msg);
    toast.success('Reminder text copy ho gaya — kahin bhi paste karo');
  };

  /* ═════════════════════════════════════════════════════════════
     📄 A4 CUSTOMER STATEMENT — bank-style, colored, signatures
     ═════════════════════════════════════════════════════════════ */
  const printCustomerStatement = () => {
    if (!ledgerData || !selectedCustomer) return toast.error('Pehle customer select karo');
    if (filteredLedgers.length === 0) return toast.error('Is period me koi transaction nahi');

    const rowsHtml = filteredLedgers.map((l, i) => {
      const cfg = typeConfig[l.type];
      const isCredit = cfg?.isCredit;
      return `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="date">${formatDate(l.createdAt)}</td>
          <td><span class="type-pill" style="background:${cfg?.hex || '#64748b'}">${cfg?.label || l.type}</span></td>
          <td class="ref">${l.reference ? escapeHtml(l.reference) : '—'}</td>
          <td class="note">${l.note ? escapeHtml(l.note.slice(0, 60)) : '—'}</td>
          <td class="amt ${isCredit ? 'credit' : 'debit'}">${isCredit ? '+' : '−'}${formatPKR(Math.abs(l.amount))}</td>
          <td class="bal">${formatPKR(l.balanceAfter)}</td>
        </tr>`;
    }).join('');

    const totalCredit = filteredLedgers.filter((l) => typeConfig[l.type]?.isCredit).reduce((s, l) => s + Math.abs(l.amount), 0);
    const totalPaid = filteredLedgers.filter((l) => !typeConfig[l.type]?.isCredit).reduce((s, l) => s + Math.abs(l.amount), 0);

    const html = `<!doctype html>
<html><head><meta charset="utf-8"/>
<title>Khata Statement — ${escapeHtml(selectedCustomer.name)}</title>
<style>
  @page { size: A4; margin: 12mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    color: #0f172a; font-size: 10.5px; line-height: 1.45; background: #fff;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .header {
    background: linear-gradient(135deg, #0f172a 0%, #881337 50%, #be123c 100%);
    color: #fff; padding: 18px 20px; border-radius: 10px; margin-bottom: 14px;
    position: relative; overflow: hidden;
  }
  .header::before { content:''; position:absolute; top:-30px; right:-30px; width:140px; height:140px; background:rgba(255,255,255,0.08); border-radius:50%; }
  .header-inner { position: relative; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
  .header h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px; }
  .header .shop { font-size: 12px; font-weight: 600; opacity: 0.95; margin-bottom: 8px; }
  .header .meta { display: flex; gap: 14px; font-size: 10px; font-weight: 600; opacity: 0.9; flex-wrap: wrap; }
  .badge { display:inline-block; background: rgba(255,255,255,0.2); border: 1.5px solid rgba(255,255,255,0.4); padding: 4px 10px; border-radius: 20px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; }
  .print-info { text-align: right; font-size: 9.5px; opacity: 0.85; }

  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
  .kpi { border: 2px solid #e2e8f0; border-radius: 9px; padding: 10px 12px; background: linear-gradient(180deg, #f8fafc 0%, #fff 100%); }
  .kpi.highlight { background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%); border-color: #fda4af; }
  .kpi.highlight .l { color: #9f1239; }
  .kpi.highlight .v { color: #9f1239; }
  .kpi .l { font-size: 8.5px; color: #64748b; text-transform: uppercase; letter-spacing: 1.3px; font-weight: 800; margin-bottom: 4px; }
  .kpi .v { font-size: 16px; font-weight: 800; color: #0f172a; }
  .kpi .s { font-size: 9px; color: #94a3b8; font-weight: 600; margin-top: 2px; }

  .customer-box {
    border: 2px solid #e2e8f0; border-radius: 9px; padding: 12px 14px; margin-bottom: 14px;
    background: linear-gradient(135deg, #fff1f2 0%, #fff 60%); display: flex; justify-content: space-between; align-items: center; gap: 14px;
  }
  .customer-box .cname { font-size: 16px; font-weight: 800; }
  .customer-box .cphone { font-size: 10px; color: #64748b; font-weight: 600; margin-top: 2px; }
  .customer-box .cbal { text-align: right; }
  .customer-box .cbal .l { font-size: 8.5px; color: #9f1239; text-transform: uppercase; letter-spacing: 1.3px; font-weight: 800; }
  .customer-box .cbal .v { font-size: 22px; font-weight: 800; color: #9f1239; }

  .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin: 14px 0 8px; padding-bottom: 6px; border-bottom: 2.5px solid #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  thead th { background: #0f172a; color: #fff; padding: 8px 6px; text-align: left; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
  thead th.r { text-align: right; }
  tbody td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  td.num { width: 3%; color: #94a3b8; font-weight: 700; text-align: center; }
  td.date { width: 15%; font-weight: 600; color: #475569; }
  td.ref { width: 13%; font-family: 'Courier New', monospace; font-size: 9px; color: #64748b; font-weight: 700; }
  td.note { color: #475569; font-size: 9px; }
  td.amt { width: 13%; text-align: right; font-weight: 800; white-space: nowrap; }
  td.amt.credit { color: #be123c; }
  td.amt.debit { color: #059669; }
  td.bal { width: 13%; text-align: right; font-weight: 700; color: #0f172a; white-space: nowrap; }
  .type-pill { display: inline-block; padding: 3px 7px; border-radius: 4px; color: #fff; font-size: 8.5px; font-weight: 800; white-space: nowrap; }

  tr.grand td { background: linear-gradient(135deg, #0f172a, #881337) !important; color: #fff !important; font-weight: 800; font-size: 12px; padding: 10px 6px; }

  .sigs { margin-top: 30px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; page-break-inside: avoid; }
  .sig { text-align: center; font-size: 10px; font-weight: 700; color: #475569; }
  .sig .line { border-top: 1.5px solid #0f172a; margin: 32px auto 6px; }
  .sig .role { text-transform: uppercase; letter-spacing: 1.2px; font-size: 9px; color: #64748b; }

  .footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #0f172a; font-size: 8.5px; color: #64748b; text-align: center; line-height: 1.5; }
  .footer strong { color: #0f172a; }

  @media print {
    .header, .kpis, .customer-box, .sigs { break-inside: avoid; }
    tr, td, th { break-inside: avoid; }
  }
</style></head><body>
  <div class="header">
    <div class="header-inner">
      <div>
        <div class="badge">Khata Statement</div>
        <h1 style="margin-top:8px;">📒 Customer Udhaar Statement</h1>
        <div class="shop">🏪 ${escapeHtml(shopName)}${shopAddress ? ` • ${escapeHtml(shopAddress)}` : ''}</div>
        <div class="meta">
          <span>📅 <strong>Period:</strong> ${escapeHtml(ledgerPeriodLabel)}</span>
          <span>🧾 <strong>Transactions:</strong> ${filteredLedgers.length}</span>
        </div>
      </div>
      <div class="print-info">
        <div><strong>Generated:</strong></div>
        <div>${new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</div>
      </div>
    </div>
  </div>

  <div class="customer-box">
    <div>
      <div class="cname">👤 ${escapeHtml(selectedCustomer.name)}</div>
      <div class="cphone">${selectedCustomer.phone ? `📞 ${escapeHtml(selectedCustomer.phone)}` : 'No phone'}${overdueDays > 0 ? ` • ⏰ Oldest credit: ${overdueDays} din pehle` : ''}</div>
    </div>
    <div class="cbal">
      <div class="l">Current Balance</div>
      <div class="v">${formatPKR(selectedCustomer.balance)}</div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi highlight"><div class="l">💸 Outstanding</div><div class="v">${formatPKR(selectedCustomer.balance)}</div><div class="s">Abhi lena baqi</div></div>
    <div class="kpi"><div class="l">📈 Total Udhaar</div><div class="v">${formatPKR(totalCredit)}</div><div class="s">Is period me diya</div></div>
    <div class="kpi"><div class="l">📉 Total Received</div><div class="v">${formatPKR(totalPaid)}</div><div class="s">Is period me mila</div></div>
    <div class="kpi"><div class="l">🧾 Transactions</div><div class="v">${filteredLedgers.length}</div><div class="s">${escapeHtml(ledgerPeriodLabel)}</div></div>
  </div>

  <div class="section-title">📋 Transaction Ledger</div>
  <table>
    <thead>
      <tr><th>#</th><th>Date</th><th>Type</th><th>Reference</th><th>Note</th><th class="r">Amount</th><th class="r">Balance After</th></tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="grand"><td colspan="6" style="text-align:right;padding-right:14px;">CURRENT OUTSTANDING BALANCE</td><td style="text-align:right;">${formatPKR(selectedCustomer.balance)}</td></tr>
    </tbody>
  </table>

  <div class="sigs">
    <div class="sig"><div class="line"></div><div class="role">Customer Signature</div></div>
    <div class="sig"><div class="line"></div><div class="role">Prepared By</div></div>
    <div class="sig"><div class="line"></div><div class="role">Shop Owner</div></div>
  </div>

  <div class="footer">
    <strong>${escapeHtml(shopName)}</strong>${shopPhone ? ` • ${escapeHtml(shopPhone)}` : ''}<br/>
    Ye computer generated statement hai.<br/>
    Powered by <strong>Nafaa POS</strong> — ${new Date().getFullYear()}
  </div>

  <script>window.onload = function() { setTimeout(function() { window.print(); }, 400); };</script>
</body></html>`;

    const w = window.open('', '_blank', 'width=1000,height=800');
    if (!w) return toast.error('Popup blocked — allow popups!');
    w.document.open();
    w.document.write(html);
    w.document.close();
    toast.success('Statement ready — "Save as PDF" ya print karo');
    setShowPrintOptions(false);
  };

  /* ═════════════════════════════════════════════════════════════
     📊 A4 ALL-CUSTOMERS KHATA SUMMARY — aging + grand total
     ═════════════════════════════════════════════════════════════ */
  const printAllCustomersReport = () => {
    const withCredit = customers.filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance);
    if (withCredit.length === 0) return toast.error('Koi khatedar customer nahi');

    const rowsHtml = withCredit.map((c, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="name">${escapeHtml(c.name)}${(c as any).isVip ? ' ⭐' : ''}</td>
        <td class="phone">${c.phone ? escapeHtml(c.phone) : '—'}</td>
        <td class="amt">${formatPKR(c.balance)}</td>
        <td><div class="bar-bg"><div class="bar-fill" style="width:${stats.totalOutstanding > 0 ? ((c.balance / stats.totalOutstanding) * 100).toFixed(1) : 0}%"></div></div></td>
      </tr>`).join('');

    const html = `<!doctype html>
<html><head><meta charset="utf-8"/>
<title>Khata Summary — ${escapeHtml(shopName)}</title>
<style>
  @page { size: A4; margin: 12mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    color: #0f172a; font-size: 10.5px; line-height: 1.45; background: #fff;
    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
  }
  .header {
    background: linear-gradient(135deg, #0f172a 0%, #881337 50%, #be123c 100%);
    color: #fff; padding: 18px 20px; border-radius: 10px; margin-bottom: 14px;
    position: relative; overflow: hidden;
  }
  .header::before { content:''; position:absolute; top:-30px; right:-30px; width:140px; height:140px; background:rgba(255,255,255,0.08); border-radius:50%; }
  .header-inner { position: relative; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
  .header h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px; }
  .header .shop { font-size: 12px; font-weight: 600; opacity: 0.95; margin-bottom: 8px; }
  .badge { display:inline-block; background: rgba(255,255,255,0.2); border: 1.5px solid rgba(255,255,255,0.4); padding: 4px 10px; border-radius: 20px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; }
  .print-info { text-align: right; font-size: 9.5px; opacity: 0.85; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
  .kpi { border: 2px solid #e2e8f0; border-radius: 9px; padding: 10px 12px; background: linear-gradient(180deg, #f8fafc 0%, #fff 100%); }
  .kpi.highlight { background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%); border-color: #fda4af; }
  .kpi.highlight .l { color: #9f1239; } .kpi.highlight .v { color: #9f1239; }
  .kpi .l { font-size: 8.5px; color: #64748b; text-transform: uppercase; letter-spacing: 1.3px; font-weight: 800; margin-bottom: 4px; }
  .kpi .v { font-size: 16px; font-weight: 800; color: #0f172a; }
  .kpi .s { font-size: 9px; color: #94a3b8; font-weight: 600; margin-top: 2px; }
  .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin: 14px 0 8px; padding-bottom: 6px; border-bottom: 2.5px solid #0f172a; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  thead th { background: #0f172a; color: #fff; padding: 8px 6px; text-align: left; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
  thead th.r { text-align: right; }
  tbody td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  td.num { width: 4%; color: #94a3b8; font-weight: 700; text-align: center; }
  td.name { font-weight: 700; }
  td.phone { width: 18%; color: #475569; font-weight: 600; }
  td.amt { width: 15%; text-align: right; font-weight: 800; color: #be123c; white-space: nowrap; }
  .bar-bg { width: 100%; height: 10px; background: #f1f5f9; border-radius: 5px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 5px; background: linear-gradient(90deg, #fb7185, #be123c); }
  tr.grand td { background: linear-gradient(135deg, #0f172a, #881337) !important; color: #fff !important; font-weight: 800; font-size: 13px; padding: 10px 6px; }
  .insight { margin-top: 12px; padding: 10px 14px; border-radius: 8px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; font-size: 10.5px; color: #78350f; font-weight: 700; page-break-inside: avoid; }
  .sigs { margin-top: 30px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; page-break-inside: avoid; }
  .sig { text-align: center; font-size: 10px; font-weight: 700; color: #475569; }
  .sig .line { border-top: 1.5px solid #0f172a; margin: 32px auto 6px; }
  .sig .role { text-transform: uppercase; letter-spacing: 1.2px; font-size: 9px; color: #64748b; }
  .footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #0f172a; font-size: 8.5px; color: #64748b; text-align: center; line-height: 1.5; }
  .footer strong { color: #0f172a; }
  @media print { .header, .kpis, .insight, .sigs { break-inside: avoid; } tr, td, th { break-inside: avoid; } }
</style></head><body>
  <div class="header">
    <div class="header-inner">
      <div>
        <div class="badge">Khata Summary</div>
        <h1 style="margin-top:8px;">📒 Sab Khatedar Customers</h1>
        <div class="shop">🏪 ${escapeHtml(shopName)}${shopAddress ? ` • ${escapeHtml(shopAddress)}` : ''}</div>
      </div>
      <div class="print-info">
        <div><strong>Generated:</strong></div>
        <div>${new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</div>
      </div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi highlight"><div class="l">💸 Total Outstanding</div><div class="v">${formatPKR(stats.totalOutstanding)}</div><div class="s">Sab se lena baqi</div></div>
    <div class="kpi"><div class="l">👥 Khatedar</div><div class="v">${stats.customersWithCredit}</div><div class="s">of ${stats.totalCustomers} customers</div></div>
    <div class="kpi"><div class="l">📊 Average</div><div class="v">${formatPKR(stats.avgBalance)}</div><div class="s">Per khatedar</div></div>
    <div class="kpi"><div class="l">⭐ Top 5 Share</div><div class="v">${stats.top5Pct}%</div><div class="s">Concentration</div></div>
  </div>

  ${stats.top5Pct >= 60 ? `<div class="insight">⚠️ <strong>Top 5 customers pe ${stats.top5Pct}% udhaar hai</strong> — risk concentrated hai. Pehle in se wasooli karo.</div>` : ''}

  <div class="section-title">📋 Complete Khata List (High → Low)</div>
  <table>
    <thead><tr><th>#</th><th>Customer</th><th>Phone</th><th class="r">Udhaar (Rs)</th><th>Share</th></tr></thead>
    <tbody>
      ${rowsHtml}
      <tr class="grand"><td colspan="3" style="text-align:right;padding-right:14px;">GRAND TOTAL</td><td style="text-align:right;">${formatPKR(stats.totalOutstanding)}</td><td></td></tr>
    </tbody>
  </table>

  <div class="sigs">
    <div class="sig"><div class="line"></div><div class="role">Prepared By</div></div>
    <div class="sig"><div class="line"></div><div class="role">Verified By</div></div>
    <div class="sig"><div class="line"></div><div class="role">Shop Owner</div></div>
  </div>

  <div class="footer">
    <strong>${escapeHtml(shopName)}</strong>${shopPhone ? ` • ${escapeHtml(shopPhone)}` : ''}<br/>
    Powered by <strong>Nafaa POS</strong> — ${new Date().getFullYear()}
  </div>

  <script>window.onload = function() { setTimeout(function() { window.print(); }, 400); };</script>
</body></html>`;

    const w = window.open('', '_blank', 'width=1000,height=800');
    if (!w) return toast.error('Popup blocked — allow popups!');
    w.document.open();
    w.document.write(html);
    w.document.close();
    toast.success('Summary ready — "Save as PDF" ya print karo');
    setShowPrintOptions(false);
  };

  /* ═════════════════════════════════════════════════════════════
     🧾 80mm THERMAL PAYMENT VOUCHER — per payment transaction
     ═════════════════════════════════════════════════════════════ */
  const printPaymentVoucher = (l: any) => {
    if (!selectedCustomer) return;
    const cfg = typeConfig[l.type as LedgerType];
    const isCredit = cfg?.isCredit;
    const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>Voucher — ${escapeHtml(selectedCustomer.name)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 80mm; }
  body { font-family: 'Courier New', 'Consolas', monospace; padding: 5mm 4mm; color: #000; font-size: 12px; line-height: 1.4; background: #fff; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .xl { font-size: 16px; font-weight: 800; letter-spacing: 1px; }
  .huge { font-size: 22px; font-weight: 800; }
  .divider { border-top: 1px dashed #000; margin: 8px 0; }
  .double { border-top: 2px solid #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; align-items: baseline; }
  .row .k { font-weight: 600; }
  .row .v { text-align: right; font-weight: 700; word-break: break-word; }
  .badge { display: inline-block; border: 1.5px solid #000; padding: 3px 10px; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; margin: 6px 0; }
  .amount-box { border: 2.5px solid #000; padding: 10px 8px; margin: 8px 0; text-align: center; }
  .amount-box .l { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; margin-bottom: 3px; }
  .sig-line { border-bottom: 1px solid #000; height: 14px; margin: 18px 0 2px; }
  .sig-label { font-size: 9px; font-weight: 700; letter-spacing: 1px; }
  .footer { font-size: 9px; line-height: 1.3; margin-top: 10px; }
</style></head><body>
  <div class="center xl">${escapeHtml(shopName)}</div>
  ${shopAddress ? `<div class="center" style="font-size:10px;margin-top:2px;">${escapeHtml(shopAddress)}</div>` : ''}
  ${shopPhone ? `<div class="center" style="font-size:10px;">Ph: ${escapeHtml(shopPhone)}</div>` : ''}
  <div class="divider"></div>
  <div class="center"><span class="badge">KHATA VOUCHER</span></div>

  <div class="row"><span class="k">Customer:</span><span class="v">${escapeHtml(selectedCustomer.name)}</span></div>
  <div class="row"><span class="k">Date:</span><span class="v">${formatDate(l.createdAt)}</span></div>
  <div class="row"><span class="k">Type:</span><span class="v">${cfg?.label || l.type}</span></div>
  ${l.reference ? `<div class="row"><span class="k">Ref:</span><span class="v">${escapeHtml(l.reference)}</span></div>` : ''}
  ${l.note ? `<div class="row"><span class="k">Note:</span><span class="v">${escapeHtml(l.note)}</span></div>` : ''}

  <div class="divider"></div>
  <div class="amount-box">
    <div class="l">${isCredit ? 'UDHAAR DIYA' : 'PAYMENT RECEIVED'}</div>
    <div class="huge">${isCredit ? '+' : '−'}${formatPKR(Math.abs(l.amount))}</div>
  </div>
  <div class="row"><span class="k">Balance After:</span><span class="v">${formatPKR(l.balanceAfter)}</span></div>
  <div class="row"><span class="k">Current Total:</span><span class="v">${formatPKR(selectedCustomer.balance)}</span></div>

  <div class="double"></div>
  <div class="sig-line"></div>
  <div class="row"><span class="sig-label">CUSTOMER SIGN:</span><span></span></div>
  <div class="sig-line"></div>
  <div class="row"><span class="sig-label">SHOP SIGN:</span><span></span></div>

  <div class="divider"></div>
  <div class="center footer">Khata record ka saboot.<br/>Dono parties ke paas copy rakhein.</div>
  <div class="center bold" style="margin-top:8px;letter-spacing:2px;">* * SHUKRIYA * *</div>
  <script>window.onload = function() { setTimeout(function() { window.print(); setTimeout(function() { window.close(); }, 800); }, 250); };</script>
</body></html>`;

    const w = window.open('', '_blank', 'width=400,height=700');
    if (!w) return toast.error('Popup blocked — allow popups!');
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  /* ─── CSV export (period-filtered) ─── */
  const exportLedgerCSV = () => {
    if (!ledgerData || filteredLedgers.length === 0) {
      toast.error('Is period me koi transactions nahi');
      return;
    }
    const summary = [
      [`Khata Statement — ${selectedCustomer?.name}`],
      [`Shop: ${shopName}  •  Period: ${ledgerPeriodLabel}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Current Balance: ${selectedCustomer?.balance.toFixed(2)}`],
      [''],
    ];
    const headers = ['Date', 'Type', 'Amount', 'Balance After', 'Reference', 'Note', 'By'];
    const rows = filteredLedgers.map((l) => [
      new Date(l.createdAt).toLocaleString('en-PK'),
      typeConfig[l.type]?.label || l.type,
      l.amount.toFixed(2),
      l.balanceAfter.toFixed(2),
      l.reference || '',
      l.note || '',
      l.createdBy?.fullName || 'System',
    ]);
    const csv = [...summary, headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `khata-${(selectedCustomer?.name || 'customer').replace(/\s+/g, '-')}-${toDateInput(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredLedgers.length} transactions export ho gaye`);
    setShowPrintOptions(false);
  };

  const exportAllCustomersCSV = () => {
    const withCredit = customers.filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance);
    if (withCredit.length === 0) return toast.error('Koi khatedar customer nahi');
    const summary = [
      [`Khata Summary — ${shopName}`],
      [`Generated: ${new Date().toLocaleString('en-PK')}  •  Total Outstanding: ${stats.totalOutstanding.toFixed(2)}  •  Khatedar: ${withCredit.length}`],
      [''],
    ];
    const headers = ['#', 'Customer', 'Phone', 'Balance (Rs)', 'Share %'];
    const rows = withCredit.map((c, i) => [
      String(i + 1), c.name, c.phone || '', c.balance.toFixed(2),
      stats.totalOutstanding > 0 ? ((c.balance / stats.totalOutstanding) * 100).toFixed(1) : '0',
    ]);
    const csv = [...summary, headers, ...rows]
      .map((r) => r.map((c2) => `"${String(c2).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `khata-summary-${toDateInput(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${withCredit.length} customers export ho gaye`);
    setShowPrintOptions(false);
  };

  const quickAmounts = useMemo(() => {
    if (!selectedCustomer) return [];
    const bal = selectedCustomer.balance;
    if (bal <= 0) return [];
    const amts = new Set<number>();
    if (bal >= 500) amts.add(500);
    if (bal >= 1000) amts.add(1000);
    if (bal >= 2000) amts.add(2000);
    if (bal >= 5000) amts.add(5000);
    const half = Math.floor(bal / 2);
    if (half >= 100) amts.add(half);
    amts.add(bal);
    return Array.from(amts).sort((a, b) => a - b);
  }, [selectedCustomer]);

  /* ─── Keyboard: / = search, P = print, T = teacher, Esc = band ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeacher) return setShowTeacher(false);
        if (showPrintOptions) return setShowPrintOptions(false);
        if (showReminderPicker) return setShowReminderPicker(false);
        if (showPaymentNotes) return setShowPaymentNotes(false);
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'p') { e.preventDefault(); setShowPrintOptions(true); }
      if (e.key.toLowerCase() === 't') { e.preventDefault(); setShowTeacher(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, showPrintOptions, showReminderPicker, showPaymentNotes]);

  const anyModal = showTeacher || showPrintOptions;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <KhataTeacher industryEmoji={industryKhata.industryEmoji} onClose={() => setShowTeacher(false)} />}
      {showPrintOptions && (
        <KhataPrintOptionsModal
          selectedCustomer={selectedCustomer}
          filteredLedgers={filteredLedgers}
          ledgerPeriodLabel={ledgerPeriodLabel}
          khatedarCount={stats.customersWithCredit}
          totalOutstanding={stats.totalOutstanding}
          onStatement={printCustomerStatement}
          onSummary={printAllCustomersReport}
          onLedgerCSV={exportLedgerCSV}
          onAllCSV={exportAllCustomersCSV}
          onClose={() => setShowPrintOptions(false)}
        />
      )}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-rose-700 dark:from-slate-950 dark:via-rose-950 dark:to-rose-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-rose-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <BookOpen className="h-3.5 w-3.5 text-amber-300" /> Customer Credit System
              {industryKhata.industryId && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-rose-200">{industryKhata.industryEmoji} {industryKhata.industryName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">📒 Khata (Udhaar Book)</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-rose-300">{formatPKR(stats.totalOutstanding)}</strong> wasooli baqi
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-amber-300">{stats.customersWithCredit}</strong> khatedar
              {industryKhata.industryId && (
                <>
                  <span className="opacity-50 mx-1.5">•</span>
                  {industryKhata.reminders.length} reminder templates
                </>
              )}
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
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setShowPrintOptions(true)}
              className="h-11 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
            >
              <Printer className="h-4 w-4" /> Print & PDF <Kbd>P</Kbd>
            </button>
          </div>
        </div>

        {/* 💡 Smart insight */}
        {stats.top5Pct >= 60 && stats.customersWithCredit > 0 && (
          <div className="relative mt-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 shadow-lg">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">💡 Smart Insight</div>
              <div className="font-extrabold text-sm">
                Top 5 customers pe <span className="text-amber-300">{stats.top5Pct}% udhaar</span> hai — pehle in se wasooli karo
              </div>
            </div>
          </div>
        )}

        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>P</Kbd><span className="text-white/60">Print/PDF</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>T</Kbd><span className="text-white/60">Guide</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Band</span>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={Wallet} tone="rose" label="Total Outstanding" value={formatPKR(stats.totalOutstanding)} sub="Collect karna baqi" highlight />
        <Kpi icon={AlertTriangle} tone="amber" label="With Credit" value={stats.customersWithCredit} sub="Khatedar customers" />
        <Kpi icon={TrendingUp} tone="violet" label="Avg Balance" value={formatPKR(stats.avgBalance)} sub="Per khatedar" />
        <Kpi icon={Users} tone="blue" label="Total Customers" value={stats.totalCustomers} sub={`${stats.totalCustomers - stats.customersWithCredit} cleared`} />
      </section>

      {/* ═══ INDUSTRY CREDIT TERMS ═══ */}
      {industryKhata.industryId && industryKhata.creditTerms.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-blue-500/10 dark:via-indigo-500/10 dark:to-violet-500/10 border-2 border-blue-200 dark:border-blue-500/40 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-blue-900 dark:text-blue-100 text-sm sm:text-base">
                {industryKhata.industryEmoji} {industryKhata.industryName} — Credit Terms Reference
              </h3>
              <p className="text-[11px] text-blue-700 dark:text-blue-300 font-bold">
                {industryKhata.creditTerms.length} standard credit patterns
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {industryKhata.creditTerms.slice(0, 8).map((term) => (
              <div key={term.name} className="rounded-xl bg-white dark:bg-slate-800/60 border-2 p-3 flex items-start gap-2" style={{ borderColor: `${term.color}40` }}>
                <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0 text-lg" style={{ backgroundColor: term.color }}>
                  {term.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">{term.name}</div>
                  <div className="text-[9px] text-slate-600 dark:text-slate-400 font-semibold line-clamp-1">{term.description}</div>
                  <div className="text-[9px] text-blue-700 dark:text-blue-300 font-bold mt-0.5">
                    {term.daysAllowed === 0 ? 'Cash only' : `${term.daysAllowed} days`}
                    {term.isRecurring && ' • Recurring'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ MAIN LAYOUT ═══ */}
      <section className="grid xl:grid-cols-[420px_1fr] gap-4 sm:gap-5 items-start">
        {/* CUSTOMER LIST */}
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white">Customers</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold tabular-nums">
                {filteredCustomers.length} of {customers.length}
              </span>
            </div>

            <div className="relative mt-3">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-9 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition"
                placeholder="Search name or phone... (/)"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition">
                  <X className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                </button>
              )}
            </div>

            <div className="flex gap-1 mt-3 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              {[
                { v: 'credit' as FilterMode, l: 'With Credit', c: 'bg-rose-600' },
                { v: 'all' as FilterMode, l: 'All', c: 'bg-slate-900 dark:bg-white dark:text-slate-900' },
                { v: 'cleared' as FilterMode, l: 'Cleared', c: 'bg-emerald-600' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setFilter(opt.v)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition ${
                    filter === opt.v ? `${opt.c} text-white shadow-sm` : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px]">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center mb-3">
                  {filter === 'credit' ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <Users className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <p className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">
                  {filter === 'credit' ? 'Koi customer udhaar mein nahi' : search ? 'Kuch nahi mila' : 'No customers'}
                </p>
                {filter === 'credit' && !search && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">Alhamdulillah! 🎉</p>
                )}
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const isSelected = selectedCustomerId === c.id;
                const hasCredit = c.balance > 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`w-full px-5 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group ${
                      isSelected ? 'bg-rose-50 dark:bg-rose-500/10 border-l-4 border-rose-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 text-white shadow ${
                        hasCredit ? 'bg-gradient-to-br from-rose-500 to-rose-700' : 'bg-gradient-to-br from-emerald-500 to-emerald-700'
                      }`}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <div className="font-extrabold text-slate-900 dark:text-white truncate text-sm">{c.name}</div>
                          {(c as any).isVip && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                        </div>
                        {c.phone && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-semibold">
                            <Phone className="h-2.5 w-2.5" />
                            {c.phone}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {hasCredit ? (
                          <>
                            <div className="font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">{formatPKR(c.balance)}</div>
                            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">Udhaar</div>
                          </>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Cleared
                          </div>
                        )}
                      </div>
                      <ChevronRight className={`h-4 w-4 shrink-0 transition ${
                        isSelected ? 'text-rose-600 dark:text-rose-400' : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400'
                      }`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* LEDGER DETAIL */}
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {!selectedCustomerId ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-500/20 dark:to-rose-500/10 flex items-center justify-center">
                <BookOpen className="h-9 w-9 text-rose-600 dark:text-rose-400" />
              </div>
              <h4 className="mt-5 text-xl font-extrabold text-slate-900 dark:text-white">Customer select karein</h4>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto font-semibold">
                Left side se customer click karein — ledger, payment, WhatsApp reminder, statement sab milega.
              </p>
            </div>
          ) : ledgerLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-10 w-10 rounded-full border-4 border-rose-200 dark:border-rose-500/30 border-t-rose-600 dark:border-t-rose-400 animate-spin" />
            </div>
          ) : ledgerData && selectedCustomer ? (
            <>
              <div className="px-5 sm:px-6 py-5 border-b-2 border-slate-100 dark:border-slate-800 bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-rose-500/10 dark:via-slate-900/0 dark:to-amber-500/10">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center font-extrabold text-xl shadow-lg shrink-0">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white truncate">{selectedCustomer.name}</h3>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {selectedCustomer.phone ? (
                          <a href={`tel:${selectedCustomer.phone}`} className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white font-bold transition">
                            <Phone className="h-3 w-3" />
                            {selectedCustomer.phone}
                          </a>
                        ) : (
                          <span className="font-semibold">No phone</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">Outstanding</div>
                    <div className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${
                      selectedCustomer.balance > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
                    }`}>
                      {formatPKR(selectedCustomer.balance)}
                    </div>
                    {selectedCustomer.balance === 0 && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold mt-1">
                        <CheckCircle2 className="h-3 w-3" />
                        FULLY CLEARED
                      </div>
                    )}
                    {overdueDays > 30 && selectedCustomer.balance > 0 && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold mt-1">
                        <AlertTriangle className="h-3 w-3" />
                        {overdueDays} DAYS OLD
                      </div>
                    )}
                  </div>
                </div>

                {/* ⏰ AGING BAR */}
                {aging && selectedCustomer.balance > 0 && (
                  <div className="mt-4 rounded-xl bg-white dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3">
                    <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Udhaar kitna purana? (Aging)
                    </div>
                    <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                      {aging.fresh > 0 && <div className="bg-emerald-500" style={{ width: `${(aging.fresh / selectedCustomer.balance) * 100}%` }} title={`0-15 din: ${formatPKR(aging.fresh)}`} />}
                      {aging.mid > 0 && <div className="bg-amber-500" style={{ width: `${(aging.mid / selectedCustomer.balance) * 100}%` }} title={`16-30 din: ${formatPKR(aging.mid)}`} />}
                      {aging.old > 0 && <div className="bg-rose-500" style={{ width: `${(aging.old / selectedCustomer.balance) * 100}%` }} title={`30+ din: ${formatPKR(aging.old)}`} />}
                    </div>
                    <div className="flex gap-3 mt-2 flex-wrap text-[10px] font-extrabold">
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-500" />0-15 din: {formatPKR(aging.fresh)}</span>
                      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"><span className="h-2 w-2 rounded-full bg-amber-500" />16-30: {formatPKR(aging.mid)}</span>
                      <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400"><span className="h-2 w-2 rounded-full bg-rose-500" />30+ din: {formatPKR(aging.old)}</span>
                    </div>
                    {aging.old > 0 && (
                      <div className="mt-2 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 rounded-lg px-2 py-1">
                        ⚠️ {formatPKR(aging.old)} 30+ din purana hai — reminder bhejo!
                      </div>
                    )}
                  </div>
                )}

                {/* ACTIONS */}
                <div className="mt-4 flex gap-2 flex-wrap items-start">
                  {selectedCustomer.phone && selectedCustomer.balance > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowReminderPicker(!showReminderPicker)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-extrabold transition shadow-lg shadow-green-500/30"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {industryKhata.industryEmoji} Smart Reminder
                        <ChevronDown className={`h-3 w-3 transition ${showReminderPicker ? 'rotate-180' : ''}`} />
                      </button>

                      {showReminderPicker && (
                        <div className="absolute top-full left-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border-2 border-green-200 dark:border-green-500/40 rounded-2xl shadow-2xl overflow-hidden z-20">
                          <div className="px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-500/15 dark:to-emerald-500/15 border-b border-green-100 dark:border-green-500/30 flex items-center justify-between">
                            <div>
                              <div className="text-xs font-extrabold text-green-900 dark:text-green-200">
                                {industryKhata.industryName} Templates
                              </div>
                              <div className="text-[10px] text-green-700 dark:text-green-300 font-bold">
                                {industryKhata.reminders.length} options
                              </div>
                            </div>
                            <button onClick={() => setShowReminderPicker(false)} className="h-6 w-6 rounded-md hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
                              <X className="h-3 w-3 text-slate-600 dark:text-slate-300" />
                            </button>
                          </div>
                          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                            {industryKhata.reminders.map((r) => {
                              const toneColors: any = {
                                polite: 'border-blue-200 dark:border-blue-500/40 hover:bg-blue-50 dark:hover:bg-blue-500/10',
                                friendly: 'border-emerald-200 dark:border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-500/10',
                                firm: 'border-amber-200 dark:border-amber-500/40 hover:bg-amber-50 dark:hover:bg-amber-500/10',
                                urgent: 'border-rose-200 dark:border-rose-500/40 hover:bg-rose-50 dark:hover:bg-rose-500/10',
                              };
                              return (
                                <div key={r.id} className={`rounded-xl border-2 p-2.5 transition ${toneColors[r.tone] || 'border-slate-200 dark:border-slate-700'}`}>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-sm">{r.emoji}</span>
                                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">{r.label}</span>
                                      </div>
                                      <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mt-0.5">
                                        {r.tone} tone
                                        {(r as any).daysOverdue ? ` • ${(r as any).daysOverdue}+ days` : ''}
                                      </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <button
                                        onClick={() => copyReminderText(r.id)}
                                        className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition"
                                        title="Copy text"
                                      >
                                        <Copy className="h-3 w-3 text-slate-600 dark:text-slate-300" />
                                      </button>
                                      <button
                                        onClick={() => sendWhatsAppReminder(r.id)}
                                        className="h-7 w-7 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition"
                                        title="Send WhatsApp"
                                      >
                                        <Send className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setShowPrintOptions(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-extrabold transition shadow-lg"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print / PDF
                  </button>
                </div>
              </div>

              {/* 💰 PAYMENT FORM */}
              {selectedCustomer.balance > 0 && (
                <div className="px-5 sm:px-6 py-5 border-b-2 border-slate-100 dark:border-slate-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-slate-900/0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow shrink-0">
                      <ArrowDownToLine className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">Receive Payment</div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">Customer se paisay receive karein</div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
                    <input
                      ref={amountRef}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      placeholder="Amount received"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleReceivePayment(); } }}
                      className="h-11 w-full rounded-xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-white dark:bg-slate-800 px-4 text-lg font-extrabold tabular-nums text-emerald-900 dark:text-emerald-200 placeholder:text-emerald-300 dark:placeholder:text-emerald-500/50 focus:outline-none focus:border-emerald-500 transition"
                    />
                    <div className="relative">
                      <Input
                        placeholder="Note (optional)"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                      />
                      {industryKhata.paymentNotes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowPaymentNotes(!showPaymentNotes)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center transition"
                          title="Quick notes"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        </button>
                      )}
                    </div>
                    <Button
                      onClick={handleReceivePayment}
                      loading={paymentMutation.isPending}
                      className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 font-extrabold shadow-lg shadow-emerald-500/30"
                      disabled={!paymentAmount}
                    >
                      <ArrowDownToLine className="h-4 w-4" />
                      Receive
                    </Button>
                  </div>

                  {/* 👁️ Live balance preview */}
                  {Number(paymentAmount) > 0 && (
                    <div className={[
                      'mt-2 rounded-xl border-2 p-2.5 flex items-center justify-between text-xs font-extrabold',
                      Number(paymentAmount) > selectedCustomer.balance
                        ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200',
                    ].join(' ')}>
                      <span>Abhi: {formatPKR(selectedCustomer.balance)}</span>
                      <span>→</span>
                      <span className={Number(paymentAmount) > selectedCustomer.balance ? '' : 'text-emerald-700 dark:text-emerald-400'}>
                        Baqi: {formatPKR(selectedCustomer.balance - Number(paymentAmount))}
                      </span>
                      {Number(paymentAmount) > selectedCustomer.balance && <span>⚠️ zyada hai!</span>}
                      {Number(paymentAmount) === selectedCustomer.balance && <span>🎉 Full clear!</span>}
                    </div>
                  )}

                  {showPaymentNotes && industryKhata.paymentNotes.length > 0 && (
                    <div className="mt-2 p-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-emerald-200 dark:border-emerald-500/40">
                      <div className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-extrabold mb-1.5 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {industryKhata.industryEmoji} {industryKhata.industryName} Quick Notes
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {industryKhata.paymentNotes.map((note) => (
                          <button
                            key={note}
                            onClick={() => { setPaymentNote(note); setShowPaymentNotes(false); }}
                            className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold transition"
                          >
                            {note}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {quickAmounts.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold mb-1.5 flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-500" />
                        Quick amounts
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {quickAmounts.map((amt, i) => (
                          <button
                            key={i}
                            onClick={() => setPaymentAmount(String(amt))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                              amt === selectedCustomer.balance
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-800 border-2 border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                            }`}
                          >
                            {amt === selectedCustomer.balance ? 'Clear All • ' : ''}
                            {formatPKR(amt)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 🧾 TRANSACTION HISTORY + period filter */}
              <div className="px-5 sm:px-6 py-5">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <h4 className="font-extrabold text-slate-900 dark:text-white">Transaction History</h4>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold tabular-nums">
                    {filteredLedgers.length} of {ledgerData.ledgers.length}
                  </span>
                </div>

                {/* 📅 Period filter */}
                <div className="flex gap-1.5 flex-wrap items-center mb-3">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  {([
                    { v: 'all' as LedgerPeriod, l: 'Sab' },
                    { v: 'month' as LedgerPeriod, l: '30 Din' },
                  ]).map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setLedgerPeriod(opt.v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                        ledgerPeriod === opt.v
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                  <button
                    onClick={() => setLedgerPeriod('custom')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition inline-flex items-center gap-1 ${
                      ledgerPeriod === 'custom'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <CalendarRange className="h-3 w-3" />
                    Custom
                  </button>
                </div>

                {ledgerPeriod === 'custom' && (
                  <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 border-2 border-violet-300 dark:border-violet-500/40 p-3 mb-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase font-extrabold text-violet-700 dark:text-violet-300 tracking-wider mb-1">📅 From</label>
                        <input
                          type="date"
                          value={customFrom}
                          max={customTo}
                          onChange={(e) => setCustomFrom(e.target.value)}
                          className="h-10 w-full rounded-lg border-2 border-violet-300 dark:border-violet-500/40 bg-white dark:bg-slate-800 px-2.5 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-extrabold text-violet-700 dark:text-violet-300 tracking-wider mb-1">📅 To</label>
                        <input
                          type="date"
                          value={customTo}
                          min={customFrom}
                          max={toDateInput(new Date())}
                          onChange={(e) => setCustomTo(e.target.value)}
                          className="h-10 w-full rounded-lg border-2 border-violet-300 dark:border-violet-500/40 bg-white dark:bg-slate-800 px-2.5 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                        />
                      </div>
                    </div>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      <button
                        onClick={() => {
                          const now = new Date();
                          setCustomFrom(toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)));
                          setCustomTo(toDateInput(now));
                        }}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border-2 border-violet-200 dark:border-violet-500/40 text-[10px] font-extrabold text-violet-700 dark:text-violet-300 hover:border-violet-400 transition"
                      >
                        Ye Mahina
                      </button>
                      <button
                        onClick={() => {
                          const now = new Date();
                          const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                          const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                          setCustomFrom(toDateInput(last));
                          setCustomTo(toDateInput(lastEnd));
                        }}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border-2 border-violet-200 dark:border-violet-500/40 text-[10px] font-extrabold text-violet-700 dark:text-violet-300 hover:border-violet-400 transition"
                      >
                        Pichla Mahina
                      </button>
                    </div>
                  </div>
                )}

                {filteredLedgers.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
                    <Clock className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-extrabold text-slate-700 dark:text-slate-200">
                      {ledgerPeriod === 'all' ? 'No transactions yet' : 'Is period me koi transaction nahi'}
                    </p>
                    {ledgerPeriod !== 'all' && (
                      <button onClick={() => setLedgerPeriod('all')} className="mt-2 text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:underline">
                        Sab dikhao
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {filteredLedgers.map((l) => {
                      const cfg = typeConfig[l.type];
                      const Icon = cfg.icon;
                      const isOld = cfg.isCredit && daysSince(l.createdAt) > 30;
                      return (
                        <div key={l.id} className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40 p-4 transition group">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">{cfg.label}</span>
                                  {isOld && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[9px] font-extrabold">
                                      <AlertTriangle className="h-2.5 w-2.5" />
                                      30+ DIN
                                    </span>
                                  )}
                                </div>
                                {l.note && (
                                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2 font-semibold">{l.note}</div>
                                )}
                                {l.reference && (
                                  <div className="text-[11px] text-violet-700 dark:text-violet-400 font-mono font-bold mt-0.5">{l.reference}</div>
                                )}
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-2 flex-wrap font-semibold">
                                  <span className="inline-flex items-center gap-0.5">
                                    <Calendar className="h-2.5 w-2.5" />
                                    {formatDate(l.createdAt)}
                                  </span>
                                  <span>•</span>
                                  <span>{formatRelative(l.createdAt)}</span>
                                  {l.createdBy && (
                                    <>
                                      <span>•</span>
                                      <span className="inline-flex items-center gap-0.5">
                                        <UserIcon className="h-2.5 w-2.5" />
                                        {l.createdBy.fullName}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <div className={`font-extrabold text-lg tabular-nums ${cfg.tone}`}>
                                {cfg.isCredit ? '+' : '−'}{formatPKR(Math.abs(l.amount))}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                                Bal: {formatPKR(l.balanceAfter)}
                              </div>
                              <button
                                onClick={() => printPaymentVoucher(l)}
                                className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center justify-center transition opacity-0 group-hover:opacity-100"
                                title="Thermal voucher print"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-sm text-slate-500 dark:text-slate-400 font-bold">Customer data load nahi hua</div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   🖨️ KHATA PRINT OPTIONS MODAL
   ═════════════════════════════════════════════════════════════ */
function KhataPrintOptionsModal({
  selectedCustomer, filteredLedgers, ledgerPeriodLabel,
  khatedarCount, totalOutstanding,
  onStatement, onSummary, onLedgerCSV, onAllCSV, onClose,
}: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 relative bg-gradient-to-br from-slate-950 via-rose-900 to-rose-700 text-white px-5 py-4 overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-rose-400/25 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-2.5 py-0.5 text-[10px] font-extrabold border border-white/30">
                <Printer className="h-3 w-3" /> Khata Print & Export
              </div>
              <h3 className="text-xl font-extrabold mt-2">📒 Khata Nikalo</h3>
              <p className="text-xs text-white/85 font-bold mt-1">
                {khatedarCount} khatedar • {formatPKR(totalOutstanding)} total outstanding
              </p>
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center transition">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* Customer Statement */}
          <PrintOption
            icon={FileText}
            gradient="from-rose-600 to-rose-700"
            border="border-rose-300 dark:border-rose-500/40"
            bg="from-rose-50 to-rose-100/50 dark:from-rose-500/10 dark:to-rose-500/5"
            hoverBorder="hover:border-rose-500"
            title="Customer Statement (A4)"
            badge={selectedCustomer ? `${filteredLedgers.length} txns • ${ledgerPeriodLabel}` : 'Pehle customer select karo'}
            badgeTone={selectedCustomer ? 'bg-emerald-500' : 'bg-slate-400'}
            desc={selectedCustomer
              ? `${selectedCustomer.name} ka complete bank-style statement — balance box, full ledger table, signatures. Period filter jo abhi laga hai wahi print hoga.`
              : 'Left se customer select karo, phir uska full statement nikalo.'}
            tags={['Colored', 'Balance box', 'Signatures', 'Period filter']}
            disabled={!selectedCustomer || filteredLedgers.length === 0}
            onClick={onStatement}
          />

          {/* All Customers Summary */}
          <PrintOption
            icon={Users}
            gradient="from-blue-600 to-indigo-700"
            border="border-blue-300 dark:border-blue-500/40"
            bg="from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/5"
            hoverBorder="hover:border-blue-500"
            title="Sab Khatedar Summary (A4)"
            badge={`${khatedarCount} customers`}
            badgeTone="bg-blue-500"
            desc="Sab khatedar customers ki list — high to low, share bars, grand total. Wasooli planning ke liye best."
            tags={['Aging insight', 'Grand total', 'Share bars']}
            disabled={khatedarCount === 0}
            onClick={onSummary}
          />

          {/* CSV row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onLedgerCSV}
              disabled={!selectedCustomer || filteredLedgers.length === 0}
              className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 hover:border-emerald-500 p-4 text-left transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileDown className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mb-2" />
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">Ledger CSV</div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Selected customer • Excel</div>
            </button>
            <button
              onClick={onAllCSV}
              disabled={khatedarCount === 0}
              className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 hover:border-emerald-500 p-4 text-left transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mb-2" />
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">Summary CSV</div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Sab khatedar • Excel</div>
            </button>
          </div>

          {/* Tips */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-500 dark:text-slate-400 mb-1">💡 Print Tips</div>
            <TipRow><strong>PDF banane ke liye:</strong> print dialog me destination "<strong>Save as PDF</strong>" choose karo</TipRow>
            <TipRow><strong>Colored print:</strong> browser print settings me "<strong>Background graphics</strong>" ON karo — warna header/table colors nahi ayenge</TipRow>
            <TipRow><strong>Custom period statement:</strong> history me "Custom" chuno → From-To set karo → phir statement print — usi period ka aye ga</TipRow>
            <TipRow><strong>Har payment ka voucher:</strong> history me transaction pe hover → 🖨️ button → 80mm thermal voucher</TipRow>
          </div>
        </div>

        <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-4">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            <X className="h-4 w-4" /> Band Karo
          </Button>
        </div>
      </div>
    </div>
  );
}

function PrintOption({ icon: Icon, gradient, border, bg, hoverBorder, title, badge, badgeTone, desc, tags, disabled, onClick }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full group rounded-2xl border-2 ${border} bg-gradient-to-br ${bg} ${hoverBorder} hover:shadow-xl transition-all p-5 text-left active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none`}
    >
      <div className="flex items-start gap-4">
        <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition`}>
          <Icon className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white">{title}</h4>
            <span className={`px-2 py-0.5 rounded-full ${badgeTone} text-white text-[9px] font-extrabold uppercase`}>{badge}</span>
          </div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">{desc}</p>
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {tags.map((t: string) => (
              <span key={t} className="inline-block px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[10px] font-extrabold text-slate-700 dark:text-slate-200">
                {t}
              </span>
            ))}
          </div>
        </div>
        <ChevronRight className="h-6 w-6 text-slate-400 dark:text-slate-500 shrink-0 self-center group-hover:translate-x-1 transition" />
      </div>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════
   🎓 KHATA TEACHER
   ═════════════════════════════════════════════════════════════ */
function KhataTeacher({ industryEmoji, onClose }: { industryEmoji?: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-rose-200 dark:border-rose-500/30 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-500/15 dark:to-red-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-rose-900 dark:text-rose-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Khata — Complete Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Khata = <strong>digital udhaar register</strong>. Har udhaar sale aur har payment ka hisaab —
            kaagaz wali khata se zyada accurate, kabhi gum nahi hoti.
          </p>

          <div className="rounded-2xl border-2 border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-rose-700 dark:text-rose-300 mb-1 flex items-center gap-1">
              <Printer className="h-3 w-3" /> 🖨️ Print & PDF (Sab Se Zaroori!)
            </div>
            <TipRow><strong>Upar "Print & PDF" dabao</strong> → 4 options milenge:</TipRow>
            <TipRow>📄 <strong>Customer Statement</strong> — ek customer ka bank-style A4 statement, signatures ke saath. Customer ko dikhao ya do.</TipRow>
            <TipRow>👥 <strong>Sab Khatedar Summary</strong> — poori dukaan ka udhaar 1 page pe, wasooli planning ke liye</TipRow>
            <TipRow>📊 <strong>CSV</strong> — Excel me kholo, accountant ko do</TipRow>
            <TipRow>🧾 <strong>Payment voucher</strong> — history me transaction pe hover → 🖨️ → 80mm thermal receipt</TipRow>
            <TipRow>⚠️ <strong>Colored print?</strong> Print dialog me "<strong>Background graphics</strong>" ON karo</TipRow>
          </div>

          <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-violet-700 dark:text-violet-300 mb-1 flex items-center gap-1">
              <CalendarRange className="h-3 w-3" /> 📅 Custom Date Range
            </div>
            <TipRow>History ke upar <strong>"Custom"</strong> dabao → From-To dates chuno</TipRow>
            <TipRow>Phir statement print karo — <strong>usi period ka</strong> statement banega (mahina-end hisaab ke liye perfect)</TipRow>
          </div>

          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-300 mb-1 flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> 💬 Wasooli Tips
            </div>
            <TipRow><strong>Smart Reminder</strong> — {industryEmoji || '🏪'} industry templates: polite → friendly → firm → urgent. WhatsApp ya copy-paste.</TipRow>
            <TipRow><strong>Aging bar</strong> — dekho udhaar kitna purana: 🟢 0-15 din OK, 🟡 16-30 dekhlo, 🔴 30+ urgent reminder bhejo</TipRow>
            <TipRow><strong>Payment type karte hi</strong> dikhta hai naya balance kya hoga — "Full clear" pe 🎉</TipRow>
            <TipRow><strong>Quick amounts</strong> — 1 click me half / full balance</TipRow>
          </div>

          <div className="rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-700 p-3 text-xs font-semibold text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-300 mb-2">⌨️ Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">/</kbd> Search customers</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">P</kbd> Print / PDF</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">T</kbd> Guide (ye)</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">Esc</kbd> Modal band</div>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 font-extrabold shadow-lg shadow-rose-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya — Wasooli Shuru!
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ══════════ Helpers ══════════ */

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
    <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm text-[9px]">
      {children}
    </kbd>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, highlight }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/40',
    amber: 'from-amber-500 to-amber-700 shadow-amber-500/40',
    violet: 'from-violet-500 to-purple-700 shadow-violet-500/40',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/40',
  };
  return (
    <div className={`rounded-2xl border-2 p-3 sm:p-4 shadow-sm transition ${
      highlight
        ? `bg-gradient-to-br ${tones[tone]} text-white border-transparent shadow-lg`
        : 'bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-slate-200 dark:border-slate-800'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] uppercase tracking-widest font-extrabold ${highlight ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>{label}</div>
          <div className={`mt-1.5 text-lg sm:text-xl lg:text-2xl font-extrabold tabular-nums truncate ${highlight ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{value}</div>
          {sub && <div className={`text-[10px] font-bold mt-0.5 truncate ${highlight ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
          highlight ? 'bg-white/20 backdrop-blur text-white' : `bg-gradient-to-br ${tones[tone]} text-white shadow-lg`
        }`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
