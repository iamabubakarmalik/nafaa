import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, ArrowDownToLine, ArrowUpFromLine, Wallet, Users, AlertTriangle,
  Search, X, MessageCircle, Printer, Download, Phone, Calendar,
  TrendingUp, Sparkles, CheckCircle2, Clock, User as UserIcon,
  ChevronRight, Filter, History, Star, AlertCircle,
} from 'lucide-react';
import { customerLedgerApi, type LedgerType } from '@/api/customer-ledger.api';
import { customersApi } from '@/api/customers.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import { getKhataCustomers, getKhataLedger } from '@/lib/offline/offlineKhata';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const formatRelative = (value: string) => {
  const d = new Date(value);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
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

type Filter = 'all' | 'credit' | 'cleared' | 'overdue';

export default function KhataPage() {
  const queryClient = useQueryClient();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('credit');

  const { data: summary } = useQuery({
    queryKey: ['khata-summary'],
    queryFn: customerLedgerApi.summary,
  });

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

  // Filter + sort customers
  const customers = allCustomers?.items || [];

  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // Search
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q),
      );
    }

    // Filter
    if (filter === 'credit') {
      result = result.filter((c) => c.balance > 0);
    } else if (filter === 'cleared') {
      result = result.filter((c) => c.balance === 0);
    } else if (filter === 'overdue') {
      // Will be filtered after we have lastActivity info
      result = result.filter((c) => c.balance > 0);
    }

    // Sort by balance descending
    return result.sort((a, b) => b.balance - a.balance);
  }, [customers, search, filter]);

  // Stats
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

  // WhatsApp reminder
  const sendWhatsAppReminder = () => {
    if (!selectedCustomer?.phone) {
      toast.error('Customer phone available nahi hai');
      return;
    }
    const phone = selectedCustomer.phone.replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;

    const msg = [
      `Assalam o Alaikum *${selectedCustomer.name}*,`,
      '',
      `Aap ke account mein *${formatPKR(selectedCustomer.balance)}* ka udhaar baqi hai.`,
      'Bharai karne ki guzarish hai.',
      '',
      'Shukriya 🙏',
    ].join('\n');

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // CSV Export
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

  const printLedger = () => {
    window.print();
  };

  // Quick payment amounts
  const quickAmounts = useMemo(() => {
    if (!selectedCustomer) return [];
    const bal = selectedCustomer.balance;
    if (bal <= 0) return [];
    const amts = new Set<number>();
    if (bal >= 500) amts.add(500);
    if (bal >= 1000) amts.add(1000);
    if (bal >= 2000) amts.add(2000);
    const half = Math.floor(bal / 2);
    if (half >= 100) amts.add(half);
    amts.add(bal); // Clear all
    return Array.from(amts).sort((a, b) => a - b);
  }, [selectedCustomer]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-rose-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <BookOpen className="h-3.5 w-3.5 text-amber-300" />
              Customer Credit System
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Khata (Udhaar Book)</h2>
            <p className="mt-2 text-sm text-white/80">
              Customers ka udhaar track karein, payments receive karein, WhatsApp reminders bhejein.
            </p>
          </div>
        </div>
      </section>

      {/* STATS — 4 CARDS */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Outstanding</div>
              <div className="mt-2 text-2xl font-extrabold text-rose-700">
                {formatPKR(stats.totalOutstanding)}
              </div>
              <div className="text-xs text-rose-600 font-semibold mt-1">
                Collect karna baqi
              </div>
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
              <div className="mt-2 text-2xl font-extrabold text-amber-700">
                {stats.customersWithCredit}
              </div>
              <div className="text-xs text-amber-600 font-semibold mt-1">
                Khatedar customers
              </div>
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
              <div className="mt-2 text-2xl font-extrabold text-violet-700">
                {formatPKR(stats.avgBalance)}
              </div>
              <div className="text-xs text-violet-600 font-semibold mt-1">
                Per khatedar
              </div>
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
              <div className="mt-2 text-2xl font-extrabold text-blue-700">
                {stats.totalCustomers}
              </div>
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

      {/* MAIN: 2 COLUMN LAYOUT */}
      <section className="grid xl:grid-cols-[420px_1fr] gap-6">
        {/* ===== LEFT: CUSTOMER LIST ===== */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* List header */}
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Customers</h3>
              <span className="text-xs text-slate-500 font-bold">
                {filteredCustomers.length} of {customers.length}
              </span>
            </div>

            {/* Search */}
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

            {/* Filter tabs */}
            <div className="flex gap-1 mt-3 bg-slate-100 rounded-xl p-1">
              {[
                { v: 'credit' as Filter, l: 'With Credit', c: 'bg-rose-600' },
                { v: 'all' as Filter, l: 'All', c: 'bg-slate-900' },
                { v: 'cleared' as Filter, l: 'Cleared', c: 'bg-emerald-600' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setFilter(opt.v)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    filter === opt.v
                      ? `${opt.c} text-white shadow-sm`
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          {/* Customer list */}
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
                  {filter === 'credit'
                    ? 'Koi customer udhaar mein nahi'
                    : search
                    ? 'No matches'
                    : 'No customers'}
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
                      {/* Avatar */}
                      <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                        hasCredit
                          ? 'bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow'
                          : 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow'
                      }`}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <div className="font-bold text-slate-900 truncate text-sm">
                            {c.name}
                          </div>
                          {c.isVip && (
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </div>
                        {c.phone && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="h-2.5 w-2.5" />
                            {c.phone}
                          </div>
                        )}
                      </div>

                      {/* Balance */}
                      <div className="text-right shrink-0">
                        {hasCredit ? (
                          <>
                            <div className="font-extrabold text-rose-700">
                              {formatPKR(c.balance)}
                            </div>
                            <div className="text-[10px] text-rose-600 font-semibold">
                              Udhaar
                            </div>
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

        {/* ===== RIGHT: LEDGER DETAIL ===== */}
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
              {/* Customer card */}
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
                          <a
                            href={`tel:${selectedCustomer.phone}`}
                            className="inline-flex items-center gap-1 hover:text-slate-900 font-semibold"
                          >
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
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex gap-2 flex-wrap">
                  {selectedCustomer.phone && (
                    <button
                      onClick={sendWhatsAppReminder}
                      disabled={selectedCustomer.balance === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp Reminder
                    </button>
                  )}
                  <button
                    onClick={printLedger}
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

              {/* Payment receive form (only if has balance) */}
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
                    <Input
                      placeholder="Note (optional)"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                    />
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

                  {/* Quick amounts */}
                  {quickAmounts.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-500" />
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

              {/* Transaction timeline */}
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
                    <p className="text-xs text-slate-500 mt-1">
                      Customer ki transactions yahan show hongi
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {ledgerData.ledgers.map((l, idx) => {
                      const cfg = typeConfig[l.type];
                      const Icon = cfg.icon;
                      const isOverdue = cfg.isCredit && daysSince(l.createdAt) > 30;

                      return (
                        <div
                          key={l.id}
                          className="rounded-2xl border-2 border-slate-200 hover:border-slate-300 bg-white p-4 transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 text-sm">
                                    {cfg.label}
                                  </span>
                                  {isOverdue && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-bold">
                                      <AlertTriangle className="h-2.5 w-2.5" />
                                      OVERDUE
                                    </span>
                                  )}
                                </div>
                                {l.note && (
                                  <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                                    {l.note}
                                  </div>
                                )}
                                {l.reference && (
                                  <div className="text-[11px] text-violet-700 font-mono font-bold mt-0.5">
                                    {l.reference}
                                  </div>
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
            <div className="p-12 text-center text-sm text-slate-500">
              Failed to load customer data
            </div>
          )}
        </div>
      </section>

      {/* Print styles */}
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
