import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Crown, Phone, Mail, MapPin, FileText, Wallet,
  ShoppingBag, Star, MessageCircle, TrendingUp, ArrowRight, Receipt,
  ArrowUpFromLine, ArrowDownToLine, Cake, Trash2, Copy, Download,
  Calendar, Award, History, Smartphone, X, CheckCircle2, AlertTriangle,
  GraduationCap, Clock, CreditCard, Printer, RefreshCw,
} from 'lucide-react';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { useBusinessFeatures } from '@core/hooks/useBusinessFeatures';
import { CustomerMobileHistory } from '@industries/mobile/components/CustomerMobileHistory';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════
   NAFAA CUSTOMER DETAIL — FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌙 Dark mode complete • 🗑️ Delete confirm modal
   💬 Smart WhatsApp (udhaar reminder vs thank-you)
   🎂 Birthday highlight • 📊 Credit limit progress bar
   ⏱️  "Kitne din se nahi aya" insight • ⌨️ E=edit, Esc=back
   📱 Mobile tab (IMEI industry) • 📥 Ledger CSV
   ═════════════════════════════════════════════════════════════ */

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));

const formatDateTime = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const formatRelative = (v: string) => {
  const d = new Date(v);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Abhi abhi';
  if (diff < 3600) return `${Math.floor(diff / 60)}m pehle`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h pehle`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d pehle`;
  return d.toLocaleDateString('en-PK');
};

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenantName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';

  const { has } = useBusinessFeatures();
  const hasMobile = has('imei');
  const [activeTab, setActiveTab] = useState<'overview' | 'mobile'>('overview');
  const [showDelete, setShowDelete] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);

  const { data: customer, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getOne(id!),
    enabled: !!id,
  });

  const toggleVipMutation = useMutation({
    mutationFn: () => customersApi.toggleVip(id!),
    onSuccess: (data: any) => {
      toast.success(data.isVip ? '👑 VIP customer ban gaya!' : 'VIP hata diya');
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
    },
    onError: () => toast.error('VIP toggle fail hua'),
  });

  const removeMutation = useMutation({
    mutationFn: () => customersApi.remove(id!),
    onSuccess: () => {
      toast.success('Customer delete ho gaya');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      navigate('/customers');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail — sales history ho sakti hai'),
  });

  /* ─── Keyboard: E = edit, Esc = back/close ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === 'Escape') {
        if (showTeacher) setShowTeacher(false);
        else if (showDelete) setShowDelete(false);
        else navigate('/customers');
      }
      if ((e.key === 'e' || e.key === 'E') && tag !== 'INPUT' && tag !== 'TEXTAREA' && !showDelete && !showTeacher) {
        navigate(`/customers/${id}/edit`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showDelete, showTeacher, id, navigate]);

  /* ─── Derived insights ─── */
  const insights = useMemo(() => {
    if (!customer) return null;
    const lastSale = customer.sales?.length
      ? Math.max(...customer.sales.map((s: any) => new Date(s.soldAt).getTime()))
      : 0;
    const daysSince = lastSale ? Math.floor((Date.now() - lastSale) / 86400000) : null;
    let isBirthday = false;
    if (customer.dateOfBirth) {
      const dob = new Date(customer.dateOfBirth);
      const now = new Date();
      isBirthday = dob.getDate() === now.getDate() && dob.getMonth() === now.getMonth();
    }
    const creditPct =
      customer.creditLimit > 0 ? Math.min(100, (Number(customer.balance) / Number(customer.creditLimit)) * 100) : null;
    return { lastSale, daysSince, isBirthday, creditPct };
  }, [customer]);

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <div className="space-y-4 pb-10">
        <div className="h-8 w-40 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="h-56 rounded-3xl bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => <div key={i} className="h-80 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-dashed border-slate-300 dark:border-slate-700 p-16 text-center">
        <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-slate-400" />
        </div>
        <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">Customer nahi mila</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-semibold">Shayad delete ho gaya ho</p>
        <Link to="/customers">
          <Button className="mt-4 bg-gradient-to-r from-blue-600 to-cyan-700 font-extrabold">
            <ArrowLeft className="h-4 w-4" /> Customers List
          </Button>
        </Link>
      </div>
    );
  }

  /* ─── Smart WhatsApp ─── */
  const whatsappCustomer = () => {
    if (!customer.phone) return toast.error('Phone number nahi hai');
    const digits = String(customer.phone).replace(/[^0-9]/g, '');
    const phone = digits.startsWith('92') ? digits : digits.startsWith('0') ? '92' + digits.slice(1) : '92' + digits;
    const msg = customer.balance > 0
      ? `Assalam-o-Alaikum ${customer.name} bhai! 🙏\n\n${tenantName} ki taraf se — aap ka *Rs ${Number(customer.balance).toLocaleString('en-PK')}* udhaar baqi hai. Jab moqa mile ada kar dein. Shukriya! 😊`
      : `Assalam-o-Alaikum ${customer.name} bhai! 🙏\n\n${tenantName} ki taraf se shukriya aap ki shopping ka. Phir tashreef layein! 😊`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const copyDetails = () => {
    const text = [
      `Name: ${customer.name}`,
      customer.phone && `Phone: ${customer.phone}`,
      customer.email && `Email: ${customer.email}`,
      customer.city && `City: ${customer.city}${customer.area ? `, ${customer.area}` : ''}`,
      customer.balance > 0 && `Khata: ${formatPKR(customer.balance)}`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Customer details copy ho gaye');
  };

  const exportLedgerCSV = () => {
    if (customer.ledgers.length === 0) return toast.error('Koi transaction nahi');
    const headers = ['Date', 'Type', 'Amount', 'Balance After', 'Reference', 'Note'];
    const rows = customer.ledgers.map((l: any) => [
      new Date(l.createdAt).toLocaleString('en-PK'),
      l.type.replace(/_/g, ' '),
      l.amount.toFixed(2),
      l.balanceAfter.toFixed(2),
      l.reference || '',
      l.note || '',
    ]);
    const csv = [
      [`Khata Ledger — ${customer.name} (${tenantName})`],
      [`Generated: ${new Date().toLocaleString('en-PK')}  •  Current balance: ${Number(customer.balance).toFixed(2)}`],
      [''],
      headers,
      ...rows,
    ].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${customer.name.replace(/\s+/g, '-')}-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Ledger export ho gaya');
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 sm:pb-10">
      {/* ═══ MODALS ═══ */}
      {showTeacher && <CustomerDetailTeacher onClose={() => setShowTeacher(false)} />}
      {showDelete && (
        <DeleteConfirmModal
          customer={customer}
          loading={removeMutation.isPending}
          onClose={() => setShowDelete(false)}
          onConfirm={() => removeMutation.mutate()}
        />
      )}

      {/* ═══ TOP BAR ═══ */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          to="/customers"
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-extrabold transition"
        >
          <ArrowLeft className="h-4 w-4" /> Customers
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTeacher(true)}
            className="h-9 px-3 rounded-xl bg-amber-100 dark:bg-amber-500/15 hover:bg-amber-200 dark:hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 text-xs font-extrabold inline-flex items-center gap-1.5 border-2 border-amber-200 dark:border-amber-500/30 transition"
          >
            <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
          </button>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-9 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5 disabled:opacity-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => window.print()}
            className="h-9 px-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5 transition"
          >
            <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 dark:from-slate-950 dark:via-blue-950 dark:to-cyan-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start gap-4 sm:gap-5 flex-wrap">
          {/* Avatar */}
          <div className="relative shrink-0">
            {customer.avatarUrl ? (
              <img src={customer.avatarUrl} className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl object-cover border-4 border-white/30 shadow-lg" alt={customer.name} />
            ) : (
              <div className={`h-20 w-20 sm:h-24 sm:w-24 rounded-3xl flex items-center justify-center text-4xl font-extrabold border-4 border-white/30 shadow-lg ${
                customer.isVip ? 'bg-gradient-to-br from-amber-400 to-orange-600' : 'bg-white/20 backdrop-blur'
              }`}>
                {customer.name.charAt(0).toUpperCase()}
              </div>
            )}
            {customer.isVip && (
              <div className="absolute -top-2 -right-2 h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg ring-4 ring-slate-950">
                <Crown className="h-4 w-4 text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold">{customer.name}</h1>
              {customer.isVip && (
                <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-lg">
                  👑 VIP
                </span>
              )}
              {!customer.isActive && (
                <span className="px-2 py-0.5 rounded-full bg-slate-700 text-white text-[10px] font-extrabold">INACTIVE</span>
              )}
              {insights?.isBirthday && (
                <span className="px-2.5 py-0.5 rounded-full bg-pink-500 text-white text-[10px] font-extrabold animate-pulse">
                  🎂 Aaj Birthday!
                </span>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-white/90">
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 hover:text-white font-bold transition">
                  <Phone className="h-3.5 w-3.5" /> {customer.phone}
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 hover:text-white font-bold transition">
                  <Mail className="h-3.5 w-3.5" /> {customer.email}
                </a>
              )}
              {customer.city && (
                <span className="flex items-center gap-1.5 font-bold">
                  <MapPin className="h-3.5 w-3.5" /> {customer.city}{customer.area && `, ${customer.area}`}
                </span>
              )}
              {customer.dateOfBirth && (
                <span className="flex items-center gap-1.5 font-bold">
                  <Cake className="h-3.5 w-3.5" /> {formatDate(customer.dateOfBirth)}
                </span>
              )}
              {insights?.daysSince !== null && insights?.daysSince !== undefined && (
                <span className={`flex items-center gap-1.5 font-bold ${insights.daysSince > 30 ? 'text-amber-300' : 'text-emerald-300'}`}>
                  <Clock className="h-3.5 w-3.5" />
                  {insights.daysSince === 0 ? 'Aaj aya tha' : `${insights.daysSince} din pehle last shopping`}
                </span>
              )}
            </div>

            {/* Credit limit bar */}
            {insights?.creditPct !== null && insights?.creditPct !== undefined && (
              <div className="mt-3 max-w-sm">
                <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-white/70 mb-1">
                  <span>Credit Limit Used</span>
                  <span className={insights.creditPct > 90 ? 'text-rose-300' : insights.creditPct > 60 ? 'text-amber-300' : 'text-emerald-300'}>
                    {formatPKR(customer.balance)} / {formatPKR(customer.creditLimit)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      insights.creditPct > 90 ? 'bg-rose-400' : insights.creditPct > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${insights.creditPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {customer.phone && (
                <button
                  onClick={whatsappCustomer}
                  className="h-10 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg shadow-green-600/40 transition"
                >
                  <MessageCircle className="h-4 w-4" />
                  {customer.balance > 0 ? 'Udhaar Reminder' : 'WhatsApp'}
                </button>
              )}
              <Link to={`/customers/${id}/edit`}>
                <button className="h-10 px-4 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition">
                  <Edit3 className="h-4 w-4" /> Edit <Kbd>E</Kbd>
                </button>
              </Link>
              <button
                onClick={() => toggleVipMutation.mutate()}
                disabled={toggleVipMutation.isPending}
                className={`h-10 px-4 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 border backdrop-blur-md transition disabled:opacity-50 ${
                  customer.isVip
                    ? 'bg-amber-400/25 border-amber-300/40 text-amber-200 hover:bg-amber-400/35'
                    : 'bg-white/15 border-white/25 hover:bg-white/25'
                }`}
              >
                <Crown className="h-4 w-4" /> {customer.isVip ? 'VIP Hatao' : 'VIP Banao'}
              </button>
              <button
                onClick={copyDetails}
                className="h-10 px-4 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
              >
                <Copy className="h-4 w-4" /> Copy
              </button>
              <button
                onClick={() => setShowDelete(true)}
                className="h-10 px-4 rounded-xl bg-rose-500/25 hover:bg-rose-500/40 border border-rose-300/30 text-rose-100 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ INSIGHT BANNERS ═══ */}
      {insights && insights.daysSince !== null && insights.daysSince > 30 && customer.balance <= 0 && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3.5 flex items-center gap-3 print:hidden">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1 text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
            Ye customer <strong>{insights.daysSince} din</strong> se nahi aya — "miss you" WhatsApp bhejo, wapas aa sakta hai!
          </div>
          {customer.phone && (
            <button
              onClick={whatsappCustomer}
              className="h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 transition"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Bhejo
            </button>
          )}
        </div>
      )}
      {insights?.isBirthday && (
        <div className="rounded-2xl bg-pink-50 dark:bg-pink-500/10 border-2 border-pink-200 dark:border-pink-500/30 p-3.5 flex items-center gap-3 print:hidden">
          <Cake className="h-5 w-5 text-pink-600 dark:text-pink-400 shrink-0" />
          <div className="flex-1 text-xs sm:text-sm font-bold text-pink-900 dark:text-pink-200">
            🎉 Aaj <strong>{customer.name}</strong> ka birthday hai! Mubarak message + chhota discount — loyal ban jayega!
          </div>
        </div>
      )}

      {/* ═══ TABS (mobile industry) ═══ */}
      {hasMobile && (
        <div className="flex gap-2 border-b-2 border-slate-200 dark:border-slate-800 print:hidden">
          {(['overview', 'mobile'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2.5 text-sm font-extrabold border-b-2 -mb-0.5 transition inline-flex items-center gap-2 ${
                activeTab === t
                  ? 'border-blue-600 text-blue-700 dark:text-blue-300'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {t === 'mobile' && <Smartphone className="h-4 w-4" />}
              {t === 'overview' ? 'Overview' : 'Mobile History'}
            </button>
          ))}
        </div>
      )}

      {hasMobile && activeTab === 'mobile' ? (
        <CustomerMobileHistory customerId={customer.id} />
      ) : (
        <>
          {/* ═══ KPIs ═══ */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <Kpi icon={ShoppingBag} label="Total Sales" value={customer.stats.totalSales} tone="blue" />
            <Kpi icon={TrendingUp} label="Total Spent" value={formatPKR(customer.stats.totalSpent)} sub={`Avg ${formatPKR(customer.stats.averageSale)} / sale`} tone="emerald" />
            <Kpi
              icon={Wallet} label="Khata" value={formatPKR(customer.balance)}
              sub={customer.creditLimit > 0 ? `Limit ${formatPKR(customer.creditLimit)}` : 'No limit'}
              tone={customer.balance > 0 ? 'rose' : 'slate'}
            />
            <Kpi icon={Star} label="Loyalty Points" value={Number(customer.loyaltyPoints).toLocaleString()} sub="points earned" tone="amber" />
          </section>

          {/* ═══ SALES + LEDGER ═══ */}
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
            {/* Recent Sales */}
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 overflow-hidden">
              <div className="px-4 sm:px-5 py-3.5 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                  <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Recent Sales
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-extrabold tabular-nums">{customer._count.sales} total</span>
              </div>
              {customer.sales.length === 0 ? (
                <div className="p-10 text-center">
                  <Receipt className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Abhi koi sale nahi</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">POS pe sale karo — yahan aa jayegi</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
                  {customer.sales.map((s: any) => (
                    <Link
                      key={s.id}
                      to={`/sales/${s.id}/receipt`}
                      className="flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-sm text-slate-900 dark:text-white font-mono">{s.saleNumber}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" /> {formatDateTime(s.soldAt)}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <div className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(s.total)}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">{s.paymentMethod}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 ml-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Khata Ledger */}
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 overflow-hidden">
              <div className="px-4 sm:px-5 py-3.5 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                  <Wallet className="h-4 w-4 text-rose-600 dark:text-rose-400" /> Khata Ledger
                </h3>
                <div className="flex items-center gap-2">
                  {customer.ledgers.length > 0 && (
                    <button
                      onClick={exportLedgerCSV}
                      className="text-xs font-extrabold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 transition"
                    >
                      <Download className="h-3 w-3" /> CSV
                    </button>
                  )}
                  <Link to="/khata" className="text-xs text-blue-600 dark:text-blue-400 font-extrabold hover:underline">
                    Payment Wusool →
                  </Link>
                </div>
              </div>
              {customer.ledgers.length === 0 ? (
                <div className="p-10 text-center">
                  <History className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Koi transaction nahi</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">Khata transactions yahan dikhengi</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
                  {customer.ledgers.map((l: any) => {
                    const isCredit = l.amount > 0;
                    const Icon = isCredit ? ArrowUpFromLine : ArrowDownToLine;
                    return (
                      <div key={l.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isCredit
                            ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400'
                            : 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-extrabold text-slate-900 dark:text-white capitalize">
                            {l.type.replace(/_/g, ' ').toLowerCase()}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold truncate">
                            {l.note || l.reference || '—'}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                            {formatRelative(l.createdAt)}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`font-extrabold text-sm tabular-nums ${isCredit ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                            {isCredit ? '+' : ''}{formatPKR(l.amount)}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tabular-nums">
                            Bal: {formatPKR(l.balanceAfter)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ═══ LOYALTY ═══ */}
          {customer.loyaltyTransactions && customer.loyaltyTransactions.length > 0 && (
            <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5 border-2 border-amber-200 dark:border-amber-500/30 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 py-3.5 border-b-2 border-amber-200 dark:border-amber-500/30 flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Loyalty Activity</h3>
                <span className="ml-auto text-xs text-amber-700 dark:text-amber-400 font-extrabold tabular-nums">{customer.loyaltyTransactions.length}</span>
              </div>
              <div className="divide-y divide-amber-100 dark:divide-amber-500/10 max-h-[300px] overflow-y-auto">
                {customer.loyaltyTransactions.map((t: any) => (
                  <div key={t.id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm capitalize">{t.type.replace(/_/g, ' ').toLowerCase()}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold truncate">
                        {formatRelative(t.createdAt)} • {t.note || t.reference || '—'}
                      </div>
                    </div>
                    <div className={`font-extrabold tabular-nums shrink-0 ${t.points >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                      {t.points >= 0 ? '+' : ''}{t.points.toLocaleString()} pts
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ NOTES ═══ */}
          {customer.notes && (
            <div className="rounded-2xl sm:rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4 sm:p-5">
              <h3 className="font-extrabold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" /> Notes
              </h3>
              <p className="text-sm text-amber-900/80 dark:text-amber-200/80 font-semibold whitespace-pre-line">{customer.notes}</p>
            </div>
          )}

          {/* ═══ ADDITIONAL INFO ═══ */}
          {(customer.cnic || customer.gender) && (
            <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm dark:shadow-black/20">
              <h3 className="font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-slate-600 dark:text-slate-400" /> Additional Info
              </h3>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                {customer.cnic && (
                  <div>
                    <dt className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">CNIC</dt>
                    <dd className="font-mono font-extrabold text-slate-900 dark:text-white mt-0.5">{customer.cnic}</dd>
                  </div>
                )}
                {customer.gender && (
                  <div>
                    <dt className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">Gender</dt>
                    <dd className="font-extrabold text-slate-900 dark:text-white mt-0.5 capitalize">{customer.gender.toLowerCase()}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">Customer Since</dt>
                  <dd className="font-extrabold text-slate-900 dark:text-white mt-0.5">{formatDate(customer.createdAt)}</dd>
                </div>
              </dl>
            </div>
          )}
        </>
      )}

      {/* ═══ STICKY ACTION BAR (mobile) ═══ */}
      <div className="fixed bottom-0 inset-x-0 z-30 sm:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t-2 border-slate-200 dark:border-slate-800 p-3 flex gap-2 print:hidden">
        {customer.phone && (
          <button
            onClick={whatsappCustomer}
            className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-lg shadow-green-500/30 transition"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </button>
        )}
        {customer.phone && (
          <a
            href={`tel:${customer.phone}`}
            className="h-11 px-4 rounded-xl bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition"
          >
            <Phone className="h-4 w-4" /> Call
          </a>
        )}
        <Link
          to={`/customers/${id}/edit`}
          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/30 transition"
        >
          <Edit3 className="h-4 w-4" /> Edit
        </Link>
      </div>

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 10mm; }
          html, body { background: white !important; color: #0f172a !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          section, div { box-shadow: none !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root, #__next { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   DELETE CONFIRM MODAL
   ═════════════════════════════════════════════════════════════ */
function DeleteConfirmModal({ customer, loading, onClose, onConfirm }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-500/40 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 text-white mx-auto flex items-center justify-center shadow-lg shadow-rose-500/40">
            <Trash2 className="h-7 w-7" />
          </div>
          <h3 className="mt-3 text-lg font-extrabold text-slate-900 dark:text-white">
            "{customer.name}" delete karein?
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
            {customer.balance > 0
              ? `⚠️ Is ka ${formatPKR(customer.balance)} udhaar baqi hai! Pehle wusooli karo.`
              : 'Ye action undo nahi ho sakta. Sales history mehfooz rahegi.'}
          </p>
          {customer.stats?.totalSales > 0 && (
            <div className="mt-2 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-2.5 py-1.5 inline-block">
              {customer.stats.totalSales} sales ka record hai — delete ki jagah "Inactive" karna behtar hai
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 bg-gradient-to-r from-rose-600 to-red-700 font-extrabold shadow-lg shadow-rose-500/40"
              onClick={onConfirm}
              loading={loading}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   🎓 DETAIL TEACHER
   ═════════════════════════════════════════════════════════════ */
function CustomerDetailTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-blue-200 dark:border-blue-500/30 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/15 dark:to-cyan-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Customer Profile Kaise Parhein?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Ye page customer ki <strong>poori kahani</strong> batata hai — kitna kharcha, kitna udhaar, kab aakhri dafa aya:
          </p>

          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>📊 Credit limit bar</strong> — udhaar limit ke kitne % pe hai (red = rok do naya udhaar!)</TipRow>
            <TipRow><strong>⏰ "X din pehle last shopping"</strong> — 30+ din pe amber warning aati hai, "miss you" bhejo</TipRow>
            <TipRow><strong>🎂 Birthday banner</strong> — aaj birthday ho to pink banner dikhega, discount do!</TipRow>
            <TipRow><strong>💬 Smart WhatsApp</strong> — udhaar wale pe reminder, clear wale pe thank-you khud banta hai</TipRow>
            <TipRow><strong>📒 Khata Ledger</strong> — har udhaar/jama transaction, running balance ke saath</TipRow>
            <TipRow><strong>⌨️ E</strong> — edit &nbsp;•&nbsp; <strong>Esc</strong> — wapas list pe</TipRow>
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 text-xs font-semibold text-amber-900 dark:text-amber-200 flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <span><strong>Sunahri usool:</strong> Delete mat karo agar sales history hai — "Inactive" flag lagao. Record kabhi kaam aa sakta hai!</span>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 font-extrabold shadow-lg shadow-blue-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */
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

function Kpi({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    blue:   'from-blue-500 to-indigo-700 shadow-blue-500/40',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/40',
    rose:   'from-rose-500 to-red-600 shadow-rose-500/40',
    amber:  'from-amber-400 to-orange-500 shadow-amber-500/40',
    slate:  'from-slate-400 to-slate-600 shadow-slate-500/30',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm dark:shadow-black/20">
      <div className="flex items-center gap-3">
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate">{sub}</div>}
        </div>
      </div>
    </div>
  );
}
