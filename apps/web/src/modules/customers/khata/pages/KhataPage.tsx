import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, ArrowDownToLine, ArrowUpFromLine, Wallet, Users, AlertTriangle,
  Search, X, MessageCircle, Printer, Download, Phone, Calendar,
  TrendingUp, Sparkles, CheckCircle2, Clock, User as UserIcon,
  ChevronRight, History, Star, AlertCircle, Zap, Info,
  ChevronDown, Copy, Send,
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

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const formatRelative = (value: string) => {
  const d = new Date(value);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Abhi';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-PK');
};

const daysSince = (value: string) => {
  return Math.floor((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24));
};

const typeConfig: Record<LedgerType, {
  label: string;
  tone: string;
  iconBg: string;
  icon: any;
  isCredit: boolean;
}> = {
  SALE_CREDIT: {
    label: 'Udhaar (Credit)',
    tone: 'text-rose-700',
    iconBg: 'bg-rose-100 text-rose-700',
    icon: ArrowUpFromLine,
    isCredit: true,
  },
  PAYMENT_RECEIVED: {
    label: 'Payment Received',
    tone: 'text-emerald-700',
    iconBg: 'bg-emerald-100 text-emerald-700',
    icon: ArrowDownToLine,
    isCredit: false,
  },
  ADJUSTMENT: {
    label: 'Adjustment',
    tone: 'text-slate-700',
    iconBg: 'bg-slate-100 text-slate-700',
    icon: AlertCircle,
    isCredit: false,
  },
  OPENING_BALANCE: {
    label: 'Opening Balance',
    tone: 'text-blue-700',
    iconBg: 'bg-blue-100 text-blue-700',
    icon: BookOpen,
    isCredit: true,
  },
};

type FilterMode = 'all' | 'credit' | 'cleared' | 'overdue';

export default function KhataPage() {
  const queryClient = useQueryClient();
  const industryKhata = useIndustryKhataPresets();
  const tenant = useAuthStore((s) => s.tenant);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('credit');
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showPaymentNotes, setShowPaymentNotes] = useState(false);
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);

  const { data: allCustomers } = useQuery({
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
      toast.success(`Payment of ${formatPKR(vars.payload.amount)} recorded`, {
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
      if (!confirm(`Amount (${formatPKR(amount)}) balance (${formatPKR(ledgerData.customer.balance)}) se zyada hai. Continue?`)) {
        return;
      }
    }
    paymentMutation.mutate({
      customerId: selectedCustomerId,
      payload: {
        amount,
        note: paymentNote.trim() || undefined,
      },
    });
  };

  const customers = allCustomers?.items || [];

  // Calculate overdue per customer (based on oldest SALE_CREDIT entry)
  const customerOverdueMap = useMemo(() => {
    const map = new Map<string, { days: number; oldestDate: string }>();
    // Simple approximation: use last activity date
    return map;
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    let result = [...customers];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q),
      );
    }
    if (filter === 'credit') {
      result = result.filter((c) => c.balance > 0);
    } else if (filter === 'cleared') {
      result = result.filter((c) => c.balance === 0);
    } else if (filter === 'overdue') {
      result = result.filter((c) => c.balance > 0);
    }
    return result.sort((a, b) => b.balance - a.balance);
  }, [customers, search, filter]);

  const stats = useMemo(() => {
    const withCredit = customers.filter((c) => c.balance > 0);
    const totalOutstanding = withCredit.reduce((sum, c) => sum + c.balance, 0);
    const avgBalance = withCredit.length > 0 ? totalOutstanding / withCredit.length : 0;
    return {
      totalOutstanding,
      customersWithCredit: withCredit.length,
      avgBalance,
      totalCustomers: customers.length,
    };
  }, [customers]);

  const selectedCustomer = ledgerData?.customer;

  // Calculate overdue days for selected customer (oldest unpaid SALE_CREDIT)
  const overdueDays = useMemo(() => {
    if (!ledgerData?.ledgers?.length) return 0;
    const oldestCredit = ledgerData.ledgers
      .filter((l) => l.type === 'SALE_CREDIT')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    return oldestCredit ? daysSince(oldestCredit.createdAt) : 0;
  }, [ledgerData]);

  // Industry-specific reminder templates
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
    toast.success(`${template.emoji} ${template.label} sent via WhatsApp`);
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
    toast.success('Reminder text copied — paste anywhere');
  };

  const exportLedgerCSV = () => {
    if (!ledgerData || ledgerData.ledgers.length === 0) {
      toast.error('Koi transactions nahi hain');
      return;
    }
    const headers = ['Date', 'Type', 'Amount', 'Balance After', 'Reference', 'Note', 'By'];
    const rows = ledgerData.ledgers.map((l) => [
      new Date(l.createdAt).toLocaleString('en-PK'),
      typeConfig[l.type]?.label || l.type,
      l.amount.toFixed(2),
      l.balanceAfter.toFixed(2),
      l.reference || '',
      l.note || '',
      l.createdBy?.fullName || 'System',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `khata-${selectedCustomer?.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('Ledger downloaded');
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

  return (
    <div className="space-y-6">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-rose-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold backdrop-blur">
              <BookOpen className="h-3.5 w-3.5 text-amber-300" />
              Customer Credit System
              {industryKhata.industryId && (
                <>
                  <span className="text-white/40">•</span>
                  <span>{industryKhata.industryEmoji} {industryKhata.industryName}</span>
                </>
              )}
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold">Khata (Udhaar Book)</h2>
            <p className="mt-2 text-sm text-white/80">
              {industryKhata.industryId
                ? `${industryKhata.industryName} businesses ke liye ${industryKhata.reminders.length} smart reminder templates ready`
                : 'Customers ka udhaar track karein, payments receive karein, WhatsApp reminders bhejein'}
            </p>
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Outstanding</div>
              <div className="mt-2 text-2xl font-extrabold text-rose-700">{formatPKR(stats.totalOutstanding)}</div>
              <div className="text-xs text-rose-600 font-semibold mt-1">Collect karna baqi</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">With Credit</div>
              <div className="mt-2 text-2xl font-extrabold text-amber-700">{stats.customersWithCredit}</div>
              <div className="text-xs text-amber-600 font-semibold mt-1">Khatedar customers</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Avg Balance</div>
              <div className="mt-2 text-2xl font-extrabold text-violet-700">{formatPKR(stats.avgBalance)}</div>
              <div className="text-xs text-violet-600 font-semibold mt-1">Per khatedar</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Customers</div>
              <div className="mt-2 text-2xl font-extrabold text-blue-700">{stats.totalCustomers}</div>
              <div className="text-xs text-blue-600 font-semibold mt-1">
                {stats.totalCustomers - stats.customersWithCredit} cleared
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ INDUSTRY CREDIT TERMS BANNER ═══ */}
      {industryKhata.industryId && industryKhata.creditTerms.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 border-2 border-blue-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-blue-900">
                {industryKhata.industryEmoji} {industryKhata.industryName} — Credit Terms Reference
              </h3>
              <p className="text-[11px] text-blue-700 font-bold">
                {industryKhata.creditTerms.length} standard credit patterns for your industry
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {industryKhata.creditTerms.slice(0, 8).map((term) => (
              <div
                key={term.name}
                className="rounded-xl bg-white border-2 p-3 flex items-start gap-2"
                style={{ borderColor: `${term.color}40` }}
              >
                <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0 text-lg" style={{ backgroundColor: term.color }}>
                  {term.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-extrabold text-slate-900">{term.name}</div>
                  <div className="text-[9px] text-slate-600 font-semibold line-clamp-1">{term.description}</div>
                  <div className="text-[9px] text-blue-700 font-bold mt-0.5">
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
      <section className="grid xl:grid-cols-[420px_1fr] gap-6">
        {/* CUSTOMER LIST */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Customers</h3>
              <span className="text-xs text-slate-500 font-bold">
                {filteredCustomers.length} of {customers.length}
              </span>
            </div>

            <div className="relative mt-3">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                placeholder="Search name or phone..."
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-slate-200 flex items-center justify-center"
                >
                  <X className="h-3.5 w-3.5 text-slate-500" />
                </button>
              )}
            </div>

            <div className="flex gap-1 mt-3 bg-slate-100 rounded-xl p-1">
              {[
                { v: 'credit' as FilterMode, l: 'With Credit', c: 'bg-rose-600' },
                { v: 'all' as FilterMode, l: 'All', c: 'bg-slate-900' },
                { v: 'cleared' as FilterMode, l: 'Cleared', c: 'bg-emerald-600' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setFilter(opt.v)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    filter === opt.v ? `${opt.c} text-white shadow-sm` : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center mb-3">
                  {filter === 'credit' ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <Users className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <p className="font-bold text-slate-700 text-sm">
                  {filter === 'credit' ? 'Koi customer udhaar mein nahi' : search ? 'No matches' : 'No customers'}
                </p>
                {filter === 'credit' && !search && (
                  <p className="text-xs text-slate-500 mt-1">Alhamdulillah! 🎉</p>
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
                    className={`w-full px-5 py-3.5 text-left hover:bg-slate-50 transition group ${
                      isSelected ? 'bg-rose-50 border-l-4 border-rose-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                        hasCredit
                          ? 'bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow'
                          : 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow'
                      }`}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <div className="font-bold text-slate-900 truncate text-sm">{c.name}</div>
                          {c.isVip && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                        </div>
                        {c.phone && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="h-2.5 w-2.5" />
                            {c.phone}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {hasCredit ? (
                          <>
                            <div className="font-extrabold text-rose-700">{formatPKR(c.balance)}</div>
                            <div className="text-[10px] text-rose-600 font-semibold">Udhaar</div>
                          </>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Cleared
                          </div>
                        )}
                      </div>
                      <ChevronRight className={`h-4 w-4 shrink-0 transition ${
                        isSelected ? 'text-rose-600' : 'text-slate-300 group-hover:text-slate-500'
                      }`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* LEDGER DETAIL */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {!selectedCustomerId ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center">
                <BookOpen className="h-9 w-9 text-rose-600" />
              </div>
              <h4 className="mt-5 text-xl font-bold text-slate-900">Customer select karein</h4>
              <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                Left side se customer click karein ledger, payment history, aur balance dekhne ke liye.
              </p>
            </div>
          ) : ledgerLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-10 w-10 rounded-full border-4 border-rose-200 border-t-rose-600 animate-spin" />
            </div>
          ) : ledgerData && selectedCustomer ? (
            <>
              <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-rose-50 via-white to-amber-50">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center font-extrabold text-xl shadow-lg">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-2xl font-extrabold text-slate-900">{selectedCustomer.name}</h3>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                        {selectedCustomer.phone ? (
                          <a href={`tel:${selectedCustomer.phone}`} className="inline-flex items-center gap-1 hover:text-slate-900 font-semibold">
                            <Phone className="h-3 w-3" />
                            {selectedCustomer.phone}
                          </a>
                        ) : (
                          <span>No phone</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Outstanding</div>
                    <div className={`text-3xl font-extrabold ${
                      selectedCustomer.balance > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}>
                      {formatPKR(selectedCustomer.balance)}
                    </div>
                    {selectedCustomer.balance === 0 && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold mt-1">
                        <CheckCircle2 className="h-3 w-3" />
                        FULLY CLEARED
                      </div>
                    )}
                    {overdueDays > 30 && selectedCustomer.balance > 0 && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold mt-1">
                        <AlertTriangle className="h-3 w-3" />
                        {overdueDays} DAYS OVERDUE
                      </div>
                    )}
                  </div>
                </div>

                {/* ═══ SMART REMINDER SECTION ═══ */}
                <div className="mt-4 flex gap-2 flex-wrap items-start">
                  {selectedCustomer.phone && selectedCustomer.balance > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowReminderPicker(!showReminderPicker)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {industryKhata.industryEmoji} Smart Reminder
                        <ChevronDown className="h-3 w-3" />
                      </button>

                      {showReminderPicker && (
                        <div className="absolute top-full left-0 mt-2 w-80 bg-white border-2 border-green-200 rounded-2xl shadow-2xl overflow-hidden z-20">
                          <div className="px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 flex items-center justify-between">
                            <div>
                              <div className="text-xs font-extrabold text-green-900">
                                {industryKhata.industryName} Templates
                              </div>
                              <div className="text-[10px] text-green-700 font-bold">
                                {industryKhata.reminders.length} options
                              </div>
                            </div>
                            <button onClick={() => setShowReminderPicker(false)} className="h-6 w-6 rounded-md hover:bg-white flex items-center justify-center">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                            {industryKhata.reminders.map((r) => {
                              const toneColors: any = {
                                polite: 'border-blue-200 hover:bg-blue-50',
                                friendly: 'border-emerald-200 hover:bg-emerald-50',
                                firm: 'border-amber-200 hover:bg-amber-50',
                                urgent: 'border-rose-200 hover:bg-rose-50',
                              };
                              return (
                                <div
                                  key={r.id}
                                  className={`rounded-xl border-2 p-2.5 transition ${toneColors[r.tone] || 'border-slate-200'}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-sm">{r.emoji}</span>
                                        <span className="text-xs font-extrabold text-slate-900">{r.label}</span>
                                      </div>
                                      <div className="text-[10px] font-bold uppercase text-slate-500 mt-0.5">
                                        {r.tone} tone
                                        {r.daysOverdue && ` • ${r.daysOverdue}+ days`}
                                      </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <button
                                        onClick={() => copyReminderText(r.id)}
                                        className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                                        title="Copy text"
                                      >
                                        <Copy className="h-3 w-3 text-slate-600" />
                                      </button>
                                      <button
                                        onClick={() => sendWhatsAppReminder(r.id)}
                                        className="h-7 w-7 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center justify-center"
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
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </button>
                  <button
                    onClick={exportLedgerCSV}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Payment form */}
              {selectedCustomer.balance > 0 && (
                <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-emerald-50 to-white">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow">
                      <ArrowDownToLine className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Receive Payment</div>
                      <div className="text-xs text-emerald-700">Customer se paisay receive karein</div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
                    <Input
                      type="number"
                      placeholder="Amount received"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
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
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                          title="Quick notes"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        </button>
                      )}
                    </div>
                    <Button
                      onClick={handleReceivePayment}
                      loading={paymentMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={!paymentAmount}
                    >
                      <ArrowDownToLine className="h-4 w-4" />
                      Receive
                    </Button>
                  </div>

                  {/* Payment notes suggestions */}
                  {showPaymentNotes && industryKhata.paymentNotes.length > 0 && (
                    <div className="mt-2 p-2 rounded-xl bg-white border-2 border-emerald-200">
                      <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-extrabold mb-1.5 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {industryKhata.industryEmoji} {industryKhata.industryName} Quick Notes
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {industryKhata.paymentNotes.map((note) => (
                          <button
                            key={note}
                            onClick={() => {
                              setPaymentNote(note);
                              setShowPaymentNotes(false);
                            }}
                            className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold transition"
                          >
                            {note}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {quickAmounts.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5 flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-500" />
                        Quick amounts
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {quickAmounts.map((amt, i) => (
                          <button
                            key={i}
                            onClick={() => setPaymentAmount(String(amt))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              amt === selectedCustomer.balance
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                                : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
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

              {/* Transaction history */}
              <div className="px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-slate-600" />
                    <h4 className="font-bold text-slate-900">Transaction History</h4>
                  </div>
                  <span className="text-xs text-slate-500 font-bold">
                    {ledgerData.ledgers.length} transactions
                  </span>
                </div>

                {ledgerData.ledgers.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
                    <Clock className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {ledgerData.ledgers.map((l) => {
                      const cfg = typeConfig[l.type];
                      const Icon = cfg.icon;
                      const isOverdue = cfg.isCredit && daysSince(l.createdAt) > 30;
                      return (
                        <div key={l.id} className="rounded-2xl border-2 border-slate-200 hover:border-slate-300 bg-white p-4 transition">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 text-sm">{cfg.label}</span>
                                  {isOverdue && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-bold">
                                      <AlertTriangle className="h-2.5 w-2.5" />
                                      OVERDUE
                                    </span>
                                  )}
                                </div>
                                {l.note && (
                                  <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">{l.note}</div>
                                )}
                                {l.reference && (
                                  <div className="text-[11px] text-violet-700 font-mono font-bold mt-0.5">{l.reference}</div>
                                )}
                                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
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
                            <div className="text-right shrink-0">
                              <div className={`font-extrabold text-lg ${cfg.tone}`}>
                                {cfg.isCredit ? '+' : '-'}{formatPKR(Math.abs(l.amount))}
                              </div>
                              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                Balance: {formatPKR(l.balanceAfter)}
                              </div>
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
            <div className="p-12 text-center text-sm text-slate-500">Failed to load customer data</div>
          )}
        </div>
      </section>

      <style>{`
        @media print {
          @page { size: A4; margin: 1cm; }
          body { background: white !important; }
          aside, button, .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
