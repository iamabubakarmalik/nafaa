import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BookOpen, Search, X, User, Phone, MessageCircle, DollarSign,
  TrendingDown, Users, ArrowRight, Eye, Wallet, RefreshCw,
  AlertTriangle, CheckCircle2, ShoppingCart, Calendar, Download,
  Filter, ChevronDown, ChevronUp, Banknote, Sparkles, Award,
} from 'lucide-react';
import { toast } from 'sonner';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import { AppLockGate } from '@core/security/AppLockGate';

type SortKey = 'balance-high' | 'balance-low' | 'name' | 'recent';
type FilterKey = 'all' | 'pending' | 'clear' | 'high';

export default function RetailKhataPage() {
  return (
    <AppLockGate title="Customer Khata Locked" description="PIN daalo unlock karne ke liye">
      <RetailKhataContent />
    </AppLockGate>
  );
}

function RetailKhataContent() {
  const queryClient = useQueryClient();
  const hideCost = useCostHidden();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('balance-high');
  const [filter, setFilter] = useState<FilterKey>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<any>(null);

  const { data: customersData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['khata-customers'],
    queryFn: () => customersApi.list({ page: 1, limit: 2000 }),
    staleTime: 30_000,
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ['khata-sales'],
    queryFn: () => salesApi.list(),
    staleTime: 60_000,
  });

  const customers: any[] = customersData?.items ?? [];

  const khataData = useMemo(() => {
    return customers.map((c: any) => {
      const custSales = allSales.filter((s: any) => s.customer?.id === c.id);
      const totalSales = custSales.reduce((a: number, s: any) => a + Number(s.total || 0), 0);
      const totalPaid = custSales.reduce((a: number, s: any) => a + Number(s.paidAmount || 0), 0);
      const pendingSales = custSales.filter((s: any) => Number(s.creditAmount || 0) > 0);
      const lastSaleAt = custSales.length > 0
        ? Math.max(...custSales.map((s: any) => new Date(s.soldAt).getTime()))
        : 0;
      return {
        ...c,
        balance: Number(c.balance || 0),
        totalSales,
        totalPaid,
        salesCount: custSales.length,
        pendingCount: pendingSales.length,
        pendingSales,
        allSales: custSales,
        lastSaleAt,
      };
    });
  }, [customers, allSales]);

  const filtered = useMemo(() => {
    let list = khataData;

    if (filter === 'pending') list = list.filter((c) => c.balance > 0);
    if (filter === 'clear') list = list.filter((c) => c.balance <= 0);
    if (filter === 'high') list = list.filter((c) => c.balance > 10000);

    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      if (sortKey === 'balance-high') return b.balance - a.balance;
      if (sortKey === 'balance-low') return a.balance - b.balance;
      if (sortKey === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortKey === 'recent') return b.lastSaleAt - a.lastSaleAt;
      return 0;
    });

    return list;
  }, [khataData, search, sortKey, filter]);

  const stats = useMemo(() => {
    const totalDue = khataData.reduce((a, c) => a + Math.max(c.balance, 0), 0);
    const withDues = khataData.filter((c) => c.balance > 0).length;
    const clearCustomers = khataData.filter((c) => c.balance <= 0 && c.salesCount > 0).length;
    const highDue = khataData.filter((c) => c.balance > 10000).length;
    return { totalDue, withDues, clearCustomers, highDue, totalCustomers: khataData.length };
  }, [khataData]);

  const paymentMutation = useMutation({
    mutationFn: async ({ customerId, amount, note }: { customerId: string; amount: number; note?: string }) => {
      return (customersApi as any).recordPayment(customerId, { amount, note });
    },
    onSuccess: (_, vars) => {
      toast.success(`${formatPKR(vars.amount)} received`);
      setPaymentModal(null);
      queryClient.invalidateQueries({ queryKey: ['khata-customers'] });
      queryClient.invalidateQueries({ queryKey: ['khata-sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Payment fail'),
  });

  const whatsappReminder = (c: any) => {
    if (!c.phone) return toast.error('Phone number nahi hai');
    const phone = String(c.phone).replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('92') ? phone
      : phone.startsWith('0') ? '92' + phone.slice(1)
      : '92' + phone;
    const msg = `Assalam-o-Alaikum ${c.name} bhai,\n\nAap ka humaari dukaan mein *Rs ${c.balance.toLocaleString()}* ka udhaar baqi hai.\n\nBaraye meherbani jab moqa mile ada kar dein.\n\nShukriya! 🙏`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const headers = ['Naam', 'Phone', 'Udhaar', 'Total Sales', 'Total Paid', 'Sales Count', 'Pending Bills'];
    const rows = filtered.map((c) => [
      c.name || '',
      c.phone || '',
      c.balance.toFixed(2),
      c.totalSales.toFixed(2),
      c.totalPaid.toFixed(2),
      c.salesCount,
      c.pendingCount,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `khata-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Khata export ho gaya');
  };

  return (
    <>
      {paymentModal && (
        <PaymentModal
          customer={paymentModal}
          loading={paymentMutation.isPending}
          onClose={() => setPaymentModal(null)}
          onConfirm={(amount: number, note: string) => paymentMutation.mutate({ customerId: paymentModal.id, amount, note })}
        />
      )}

      <div className="space-y-5">
        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 shadow-2xl">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-orange-400/15 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <BookOpen className="h-3.5 w-3.5 text-amber-300" /> Retail Khata
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📔 Customer Khata</h1>
              <p className="mt-2 text-sm text-white/80">
                {stats.withDues > 0 ? (
                  <>
                    <strong className="text-amber-300">{stats.withDues} customers</strong> ka total{' '}
                    <strong className="text-rose-300">{formatPKR(stats.totalDue)}</strong> udhaar
                  </>
                ) : (
                  <>Sab customers ka khata clear hai — MashaAllah!</>
                )}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold backdrop-blur disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <PrivacyToggle />
              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20"
              >
                <Download className="h-4 w-4" /> Export
              </button>
              <Link to="/pos">
                <Button className="bg-white text-slate-900 hover:bg-slate-100">
                  <ShoppingCart className="h-4 w-4" /> POS
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ KPIs ═══ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi
            icon={TrendingDown}
            label="Total Udhaar"
            value={hideCost ? '••••' : formatPKR(stats.totalDue)}
            sub={`${stats.withDues} customers`}
            tone="rose"
            highlight
          />
          <Kpi icon={Users} label="Total Customers" value={stats.totalCustomers} sub={`${stats.clearCustomers} clear`} tone="blue" />
          <Kpi
            icon={AlertTriangle}
            label="Zyada Udhaar"
            value={stats.highDue}
            sub="10K+ walay"
            tone="amber"
            onClick={() => setFilter('high')}
          />
          <Kpi icon={CheckCircle2} label="Clear Khata" value={stats.clearCustomers} sub="Payment complete" tone="emerald" />
        </section>

        {/* ═══ TOOLBAR ═══ */}
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Customer naam ya phone se dhundo..."
                className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="h-12 rounded-2xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500"
            >
              <option value="balance-high">Zyada udhaar pehle</option>
              <option value="balance-low">Kam udhaar pehle</option>
              <option value="name">Naam A-Z</option>
              <option value="recent">Nayi sales pehle</option>
            </select>
          </div>

          <div className="flex gap-1.5 flex-wrap items-center">
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {[
                { v: 'pending', l: 'Baqi Udhaar', c: stats.withDues },
                { v: 'all', l: 'Sab', c: stats.totalCustomers },
                { v: 'clear', l: 'Clear', c: stats.clearCustomers },
                { v: 'high', l: 'Zyada (10K+)', c: stats.highDue },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => setFilter(o.v as FilterKey)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-extrabold transition inline-flex items-center gap-1.5',
                    filter === o.v ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900',
                  ].join(' ')}
                >
                  {o.l}
                  <span className={['px-1.5 rounded text-[10px]', filter === o.v ? 'bg-white/20' : 'bg-slate-200 text-slate-700'].join(' ')}>
                    {o.c}
                  </span>
                </button>
              ))}
            </div>
            <div className="ml-auto text-xs font-extrabold text-slate-500">
              {filtered.length} customers
            </div>
          </div>
        </section>

        {/* ═══ CUSTOMER LIST ═══ */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-200 mx-auto flex items-center justify-center">
              {filter === 'pending' ? (
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              ) : (
                <BookOpen className="h-10 w-10 text-amber-600" />
              )}
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-slate-900">
              {filter === 'pending' && stats.withDues === 0
                ? 'MashaAllah! Sab clear hai'
                : search ? 'Koi customer nahi mila'
                : 'Khaate mein koi entry nahi'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 font-semibold">
              {filter === 'pending' && stats.withDues === 0
                ? 'Kisi customer ka koi udhaar nahi'
                : 'POS se udhaar wali sales karo — yahan aa jayega'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <CustomerKhataRow
                key={c.id}
                customer={c}
                expanded={expandedId === c.id}
                hideCost={hideCost}
                onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                onPayment={() => setPaymentModal(c)}
                onWhatsApp={() => whatsappReminder(c)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ══════════ CUSTOMER ROW ══════════ */
function CustomerKhataRow({ customer, expanded, hideCost, onToggle, onPayment, onWhatsApp }: any) {
  const hasBalance = customer.balance > 0;
  const isHigh = customer.balance > 10000;

  return (
    <div className={[
      'rounded-2xl bg-white border-2 shadow-sm transition-all',
      isHigh ? 'border-rose-300' : hasBalance ? 'border-amber-300' : 'border-slate-200',
    ].join(' ')}>
      <div className="p-4 flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <div className={[
          'h-14 w-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shrink-0 shadow',
          isHigh ? 'bg-gradient-to-br from-rose-500 to-red-700'
            : hasBalance ? 'bg-gradient-to-br from-amber-500 to-orange-700'
            : 'bg-gradient-to-br from-emerald-500 to-teal-700',
        ].join(' ')}>
          {(customer.name || '?').charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg truncate">{customer.name}</h3>
            {isHigh && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" /> Zyada
              </span>
            )}
            {!hasBalance && customer.salesCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase">
                Clear
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-600 font-bold flex-wrap">
            {customer.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {customer.phone}
              </span>
            )}
            <span>•</span>
            <span>{customer.salesCount} sales</span>
            {customer.pendingCount > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-700 inline-flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> {customer.pendingCount} pending
                </span>
              </>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Udhaar</div>
          <div className={[
            'text-2xl sm:text-3xl font-extrabold tabular-nums leading-none',
            isHigh ? 'text-rose-700' : hasBalance ? 'text-amber-700' : 'text-emerald-700',
          ].join(' ')}>
            {hideCost ? '••••' : formatPKR(customer.balance)}
          </div>
          {!hideCost && customer.totalSales > 0 && (
            <div className="text-[10px] font-bold text-slate-500 mt-0.5">
              Total {formatPKR(customer.totalSales)}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-3 flex gap-2 flex-wrap border-t border-slate-100 pt-3">
        {hasBalance && (
          <button
            onClick={onPayment}
            className="flex-1 min-w-[120px] h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
          >
            <Banknote className="h-4 w-4" /> Paisay Wasool
          </button>
        )}
        {customer.phone && hasBalance && (
          <button
            onClick={onWhatsApp}
            className="h-11 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-extrabold inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition"
          >
            <MessageCircle className="h-4 w-4" /> Reminder
          </button>
        )}
        <button
          onClick={onToggle}
          className="h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-extrabold inline-flex items-center gap-1 transition"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {expanded ? 'Chhupao' : 'Tafseel'}
        </button>
      </div>

      {expanded && (
        <div className="border-t-2 border-slate-100 p-4 bg-slate-50 space-y-2 max-h-96 overflow-y-auto">
          <div className="text-[10px] uppercase font-extrabold text-slate-600 tracking-wider mb-2">
            Sales History ({customer.allSales.length})
          </div>
          {customer.allSales.length === 0 ? (
            <p className="text-sm text-slate-500 font-semibold text-center py-4">
              Abhi tak koi sale nahi
            </p>
          ) : (
            [...customer.allSales]
              .sort((a: any, b: any) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime())
              .slice(0, 20)
              .map((sale: any) => {
                const credit = Number(sale.creditAmount || 0);
                return (
                  <Link
                    key={sale.id}
                    to={`/sales/${sale.id}/receipt`}
                    className="block rounded-xl bg-white border-2 border-slate-200 hover:border-amber-300 hover:shadow-md transition p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-extrabold text-slate-900 text-xs">{sale.saleNumber}</span>
                          {credit > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase">
                              Udhaar
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 mt-0.5 inline-flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(sale.soldAt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-slate-900 tabular-nums text-sm">
                          {hideCost ? '••••' : formatPKR(sale.total)}
                        </div>
                        {credit > 0 && (
                          <div className="text-[10px] font-extrabold text-amber-700">
                            Baqi {formatPKR(credit)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
          )}
          {customer.allSales.length > 20 && (
            <div className="text-center text-xs font-bold text-slate-500 pt-2">
              +{customer.allSales.length - 20} sales aur bhi...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════ PAYMENT MODAL ══════════ */
function PaymentModal({ customer, loading, onClose, onConfirm }: any) {
  const [amount, setAmount] = useState<string>(String(customer.balance));
  const [note, setNote] = useState('');
  const [showCalc, setShowCalc] = useState(false);

  const payAmount = Number(amount) || 0;
  const newBalance = customer.balance - payAmount;
  const isValid = payAmount > 0 && payAmount <= customer.balance;

  const QUICK = [100, 500, 1000, 2000, 5000, 10000];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in duration-200">

        <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-green-700 text-white px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase font-extrabold text-emerald-200 tracking-wider">
                Paisay Wasool
              </div>
              <div className="text-xl font-extrabold mt-1 truncate">{customer.name}</div>
              <div className="text-xs font-bold text-white/80 mt-0.5">
                Kul udhaar: <strong className="text-amber-300">{formatPKR(customer.balance)}</strong>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-90 flex items-center justify-center border-2 border-white/20 transition shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase font-extrabold text-slate-600 tracking-wider">
                Kitna paisa mila?
              </label>
              <button
                onClick={() => setShowCalc(!showCalc)}
                className="text-[10px] font-extrabold text-emerald-700 inline-flex items-center gap-1"
              >
                <DollarSign className="h-3 w-3" /> Calculator
              </button>
            </div>
            <input
              autoFocus
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              className="h-16 sm:h-20 w-full rounded-2xl border-4 border-emerald-300 bg-emerald-50 px-4 text-3xl sm:text-4xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200 text-center"
            />

            <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {QUICK.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(String((Number(amount) || 0) + amt))}
                  className="h-10 rounded-xl bg-slate-100 hover:bg-emerald-100 active:scale-95 text-xs font-extrabold text-slate-800 transition"
                >
                  +{amt}
                </button>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                onClick={() => setAmount(String(customer.balance))}
                className="h-11 rounded-xl bg-emerald-100 hover:bg-emerald-200 active:scale-95 text-sm font-extrabold text-emerald-800 transition inline-flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="h-4 w-4" /> Pura Wasool
              </button>
              <button
                onClick={() => setAmount(String(Math.floor(customer.balance / 2)))}
                className="h-11 rounded-xl bg-blue-100 hover:bg-blue-200 active:scale-95 text-sm font-extrabold text-blue-800 transition"
              >
                Aadha
              </button>
              <button
                onClick={() => setAmount('')}
                className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-sm font-extrabold text-slate-700 transition"
              >
                Clear
              </button>
            </div>

            {showCalc && (
              <div className="mt-3 grid grid-cols-4 gap-1.5 rounded-2xl bg-slate-100 p-2">
                {[7, 8, 9, 'C', 4, 5, 6, '←', 1, 2, 3, '00', 0, '.', '000', '='].map((k) => (
                  <button
                    key={String(k)}
                    onClick={() => {
                      const key = String(k);
                      if (key === 'C') return setAmount('');
                      if (key === '←') return setAmount(amount.slice(0, -1));
                      if (key === '=') return;
                      setAmount(amount + key);
                    }}
                    className={[
                      'h-11 rounded-xl font-extrabold text-lg transition active:scale-95',
                      k === 'C' ? 'bg-rose-500 text-white'
                        : k === '←' ? 'bg-amber-500 text-white'
                        : k === '=' ? 'bg-emerald-500 text-white'
                        : 'bg-white text-slate-800 hover:bg-slate-50 shadow-sm',
                    ].join(' ')}
                  >
                    {k}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 tracking-wider mb-1 block">
              Note <span className="text-slate-400 normal-case font-bold">(optional)</span>
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Cash mila, Bank transfer..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-white border-4 border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-600">Purana udhaar</span>
              <span className="font-extrabold text-slate-900 tabular-nums">{formatPKR(customer.balance)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-600">Wasool</span>
              <span className="font-extrabold text-emerald-700 tabular-nums">- {formatPKR(payAmount)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm font-extrabold text-slate-700">Baqi Udhaar</span>
              <span className={[
                'text-xl font-extrabold tabular-nums',
                newBalance <= 0 ? 'text-emerald-700' : 'text-amber-700',
              ].join(' ')}>
                {formatPKR(Math.max(newBalance, 0))}
              </span>
            </div>
            {newBalance <= 0 && payAmount > 0 && (
              <div className="rounded-xl bg-emerald-500 text-white p-2.5 mt-2 text-center text-sm font-extrabold inline-flex items-center justify-center gap-2 w-full">
                <Award className="h-4 w-4" /> Khata clear ho jayega! 🎉
              </div>
            )}
          </div>

          {!isValid && payAmount > customer.balance && (
            <div className="rounded-xl bg-rose-50 border-2 border-rose-300 p-2.5 text-xs font-extrabold text-rose-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Wasool udhaar se zyada nahi ho sakta</span>
            </div>
          )}
        </div>

        <div className="shrink-0 p-4 border-t-4 border-slate-100 bg-white">
          <button
            onClick={() => onConfirm(payAmount, note)}
            disabled={!isValid || loading}
            className={[
              'w-full h-14 sm:h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700',
              'text-white font-extrabold shadow-2xl transition active:scale-[0.98]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-between px-5',
            ].join(' ')}
          >
            <div className="text-left">
              <div className="text-[10px] uppercase font-extrabold text-white/80 tracking-wider">
                {loading ? 'Save ho raha...' : 'Payment confirm karo'}
              </div>
              <div className="text-xl sm:text-2xl tabular-nums leading-none mt-0.5">{formatPKR(payAmount)}</div>
            </div>
            <ArrowRight className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════ KPI ══════════ */
function Kpi({ icon: Icon, label, value, sub, tone, highlight, onClick }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-500 to-red-600 shadow-rose-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={[
        'rounded-2xl border-2 p-4 shadow-sm text-left w-full transition',
        highlight ? 'bg-gradient-to-br from-rose-50 to-white border-rose-300' : 'bg-white border-slate-200',
        onClick ? 'hover:border-amber-300 hover:shadow-md active:scale-95' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}
