import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import {
  ArrowLeft, Edit3, Phone, Mail, MapPin, MessageCircle, CreditCard,
  FileText, ShoppingBag, TrendingUp, Wallet, Trash2,
  Copy, Download, Calendar, AlertTriangle, Package, Crown, Star,
  Award, Activity, BarChart3, Banknote, Smartphone, Building, Zap,
  Clock, CheckCircle2, Eye, GraduationCap, X, Printer,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { suppliersApi } from '@modules/purchasing/suppliers/api/suppliers.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA SUPPLIER DETAIL — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 GLOBAL — har industry ka supplier khata same
   🌙 Dark mode complete
   🎓 Teacher modal — "ye page kya dikhata hai" (khata logic)
   ⌨️  E = edit • W = WhatsApp • Esc = band
   🖨️ Print = khata statement • ⚠️ Delete = due warning
   ═════════════════════════════════════════════════════════════ */

const formatDateTime = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const paymentConfig: Record<string, { label: string; icon: any; hex: string }> = {
  CASH: { label: 'Cash', icon: Banknote, hex: '#10b981' },
  CARD: { label: 'Card', icon: CreditCard, hex: '#3b82f6' },
  JAZZCASH: { label: 'JazzCash', icon: Smartphone, hex: '#f97316' },
  EASYPAISA: { label: 'EasyPaisa', icon: Zap, hex: '#22c55e' },
  BANK_TRANSFER: { label: 'Bank', icon: Building, hex: '#8b5cf6' },
};

export default function SupplierDetailPage() {
  const { id } = useParams();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const [showTeacher, setShowTeacher] = useState(false);

  const { data: supplier, isLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => suppliersApi.getOne(id!),
    enabled: !!id,
  });

  const removeMutation = useMutation({
    mutationFn: () => suppliersApi.remove(id!),
    onSuccess: () => {
      toast.success('Supplier delete ho gaya');
      window.location.href = '/suppliers';
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete nahi hua — iska purchase record hai'),
  });

  const trendData = useMemo(() => {
    if (!supplier?.trend30Days) return [];
    return supplier.trend30Days.map((p: any) => {
      const d = new Date(p.date);
      return { ...p, label: `${d.getDate()}/${d.getMonth() + 1}` };
    });
  }, [supplier]);

  /* ─── Keyboard: E = edit, W = WhatsApp, Esc = teacher band ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) { setShowTeacher(false); return; }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key.toLowerCase() === 'e') window.location.href = `/suppliers/${id}/edit`;
      if (e.key.toLowerCase() === 'w' && supplier?.phone) {
        const phone = supplier.phone.replace(/[^0-9]/g, '').replace(/^0/, '92');
        window.open(`https://wa.me/${phone}`, '_blank');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, showTeacher, supplier?.phone]);

  /* Body scroll lock jab teacher khula ho */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-orange-200 dark:border-orange-800 border-t-orange-600 dark:border-t-orange-400 animate-spin" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-dashed border-slate-300 dark:border-slate-700 p-16 text-center">
        <Truck className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Supplier nahi mila</h3>
        <Link to="/suppliers" className="mt-3 inline-flex items-center gap-1 text-sm font-extrabold text-orange-600 dark:text-orange-400 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Sab suppliers pe wapas
        </Link>
      </div>
    );
  }

  const whatsappLink = supplier.phone
    ? `https://wa.me/${supplier.phone.replace(/[^0-9]/g, '').replace(/^0/, '92')}`
    : null;

  const copyDetails = () => {
    const text = [
      `Name: ${supplier.name}`,
      supplier.contactPerson && `Contact: ${supplier.contactPerson}`,
      supplier.phone && `Phone: ${supplier.phone}`,
      supplier.email && `Email: ${supplier.email}`,
      supplier.bankName && `Bank: ${supplier.bankName}`,
      supplier.accountNumber && `Account: ${supplier.accountNumber}`,
      supplier.iban && `IBAN: ${supplier.iban}`,
      supplier.paymentTerms && `Terms: ${supplier.paymentTerms}`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Supplier details copy ho gaye');
  };

  const confirmDelete = () => {
    const due = Number(stats?.outstanding || 0);
    const msg = due > 0
      ? `⚠️ "${supplier.name}" ka ${formatPKR(due)} udhaar abhi BAAKI hai!\n\nDelete karo to purchase history reh jayegi lekin supplier ka khata gum ho jayega.\n\nPakka delete karein?`
      : `"${supplier.name}" delete karein?`;
    if (confirm(msg)) removeMutation.mutate();
  };

  const exportPurchasesCSV = () => {
    if (!supplier.purchases || supplier.purchases.length === 0) return toast.error('Koi purchase nahi');
    const summaryRows = [
      [`Purchase History — ${supplier.name}`],
      [`${tenantName || 'My Store'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Total: ${(stats?.totalAmount || 0).toFixed(2)}  •  Paid: ${(stats?.totalPaid || 0).toFixed(2)}  •  Due: ${(stats?.outstanding || 0).toFixed(2)}`],
      [''],
    ];
    const headers = ['Purchase #', 'Date', 'Items', 'Total', 'Paid', 'Balance', 'Payment', 'Status'];
    const rows = supplier.purchases.map((p: any) => [
      p.purchaseNumber,
      new Date(p.purchasedAt).toLocaleString('en-PK'),
      p.items?.length || 0,
      p.total.toFixed(2),
      p.paidAmount.toFixed(2),
      Math.max(p.total - p.paidAmount, 0).toFixed(2),
      p.paymentMethod,
      p.status,
    ]);
    const csv = [...summaryRows, headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${supplier.name.replace(/\s+/g, '-')}-purchases.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${supplier.purchases.length} purchases export ho gaye`);
  };

  const sharePaymentRequest = () => {
    if (!supplier.phone || !supplier.stats?.outstanding) return;
    const phone = supplier.phone.replace(/[^0-9]/g, '').replace(/^0/, '92');
    const lines = [
      `Assalam-o-Alaikum *${supplier.contactPerson || supplier.name}*,`,
      '',
      'Hamare records ke mutabiq aap ke account me outstanding balance hai:',
      '',
      `*Total Purchased:* ${formatPKR(supplier.stats.totalAmount)}`,
      `*Paid:* ${formatPKR(supplier.stats.totalPaid)}`,
      `*Outstanding:* *${formatPKR(supplier.stats.outstanding)}*`,
      '',
      'Bank Details:',
      supplier.bankName && `*Bank:* ${supplier.bankName}`,
      supplier.accountNumber && `*Account:* ${supplier.accountNumber}`,
      supplier.iban && `*IBAN:* ${supplier.iban}`,
      '',
      'Please confirm payment at your earliest. Shukriya 🙏',
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines)}`, '_blank');
    toast.success('Payment reminder WhatsApp pe khul raha hai');
  };

  const stats = supplier.stats;
  const isVip = (stats?.totalAmount || 0) > 100000;
  const paidPct = stats?.totalAmount > 0 ? Math.round(((stats?.totalPaid || 0) / stats.totalAmount) * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {showTeacher && <SupplierDetailTeacher onClose={() => setShowTeacher(false)} supplierName={supplier.name} />}

      {/* ═══ PRINT-ONLY HEADER ═══ */}
      <div className="hidden print:block">
        <div className="border-b-4 border-orange-600 pb-3 mb-4">
          <h1 className="text-2xl font-black text-slate-900 leading-tight">
            🚚 {supplier.name} — Khata Statement
          </h1>
          <p className="text-xs text-slate-600 font-semibold mt-1">
            {tenantName || 'My Store'} • Total: {formatPKR(stats?.totalAmount || 0)} • Paid: {formatPKR(stats?.totalPaid || 0)} • Due: {formatPKR(stats?.outstanding || 0)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Generated: {new Date().toLocaleString('en-PK')}</p>
        </div>
      </div>

      {/* ═══ BACK ═══ */}
      <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
        <Link
          to="/suppliers"
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> Sab Suppliers
        </Link>
        <div className="hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center text-slate-400 dark:text-slate-500">
          <KbdLight>E</KbdLight> Edit • <KbdLight>W</KbdLight> WhatsApp
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 dark:from-slate-950 dark:via-orange-950 dark:to-amber-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-orange-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start gap-4 sm:gap-5 flex-wrap">
          <div className="relative shrink-0">
            {supplier.logoUrl ? (
              <img src={supplier.logoUrl} className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl object-cover border-4 border-white/30 shadow-2xl" alt={supplier.name} />
            ) : (
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl font-extrabold border-4 border-white/30 shadow-2xl">
                {supplier.name.charAt(0).toUpperCase()}
              </div>
            )}
            {isVip && (
              <div className="absolute -top-2 -right-2 h-9 w-9 rounded-full bg-amber-500 border-4 border-white flex items-center justify-center shadow-lg" title="VIP Supplier (1 Lakh+ business)">
                <Crown className="h-4 w-4 text-white fill-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-[250px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">{supplier.name}</h1>
              {isVip && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/30 backdrop-blur text-amber-100 text-[10px] font-extrabold uppercase tracking-wider border border-amber-300/40">
                  <Crown className="h-3 w-3" /> VIP
                </span>
              )}
              {!supplier.isActive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/30 backdrop-blur text-slate-100 text-[10px] font-extrabold uppercase">
                  Inactive
                </span>
              )}
            </div>
            {supplier.contactPerson && (
              <div className="text-sm text-white/90 mt-1 font-bold">Contact: {supplier.contactPerson}</div>
            )}
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-white/90">
              {supplier.phone && (
                <a href={`tel:${supplier.phone}`} className="inline-flex items-center gap-1.5 font-bold hover:text-white transition">
                  <Phone className="h-3.5 w-3.5" /> {supplier.phone}
                </a>
              )}
              {supplier.email && (
                <a href={`mailto:${supplier.email}`} className="inline-flex items-center gap-1.5 font-bold hover:text-white transition">
                  <Mail className="h-3.5 w-3.5" /> {supplier.email}
                </a>
              )}
              {supplier.city && (
                <span className="inline-flex items-center gap-1.5 font-bold">
                  <MapPin className="h-3.5 w-3.5" /> {supplier.city}{supplier.area && `, ${supplier.area}`}
                </span>
              )}
            </div>

            {stats?.daysSinceLastPurchase !== null && stats?.daysSinceLastPurchase !== undefined && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-white/70">
                <Clock className="h-3 w-3" />
                Aakhri purchase: {stats.daysSinceLastPurchase === 0 ? 'Aaj' : `${stats.daysSinceLastPurchase} din pehle`}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {whatsappLink && (
                <a href={whatsappLink} target="_blank" rel="noreferrer">
                  <Button className="bg-green-600 hover:bg-green-700 font-extrabold">
                    <MessageCircle className="h-4 w-4" /> WhatsApp <Kbd>W</Kbd>
                  </Button>
                </a>
              )}
              {(stats?.outstanding || 0) > 0 && supplier.phone && (
                <Button onClick={sharePaymentRequest} className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold">
                  <AlertTriangle className="h-4 w-4" /> Payment Reminder
                </Button>
              )}
              <Link to={`/suppliers/${id}/edit`}>
                <Button className="bg-white/15 hover:bg-white/25 border border-white/25 text-white font-extrabold backdrop-blur-md">
                  <Edit3 className="h-4 w-4" /> Edit <Kbd>E</Kbd>
                </Button>
              </Link>
              <button
                onClick={() => setShowTeacher(true)}
                className="h-9 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              >
                <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
              </button>
              <button
                onClick={() => window.print()}
                className="h-9 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
              >
                <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Statement</span>
              </button>
              <button
                onClick={copyDetails}
                className="h-9 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
              >
                <Copy className="h-4 w-4" /> <span className="hidden sm:inline">Copy</span>
              </button>
              <button
                onClick={confirmDelete}
                disabled={removeMutation.isPending}
                className="h-9 px-3 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ OUTSTANDING BANNER ═══ */}
      {(stats?.outstanding || 0) > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-4 print:hidden">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-500/40 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-rose-900 dark:text-rose-200 text-sm">
                💰 {formatPKR(stats.outstanding)} dena baaki hai
              </h3>
              <p className="text-xs text-rose-800 dark:text-rose-300/80 font-semibold">
                {paidPct}% paid • Payment terms: {supplier.paymentTerms || 'set nahi'}
              </p>
            </div>
            {supplier.phone && (
              <button
                onClick={sharePaymentRequest}
                className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-md transition shrink-0"
              >
                <MessageCircle className="h-4 w-4" /> Reminder bhejo
              </button>
            )}
          </div>
        </section>
      )}

      {/* ═══ STATS GRID ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 print:hidden">
        <Kpi icon={ShoppingBag} tone="orange" label="Total Orders" value={stats?.totalPurchases || 0} sub="All time" />
        <Kpi icon={TrendingUp} tone="blue" label="Total Amount" value={formatPKR(stats?.totalAmount || 0)} sub="Lifetime" small />
        <Kpi icon={Wallet} tone="emerald" label="Total Paid" value={formatPKR(stats?.totalPaid || 0)} sub={`${paidPct}% paid`} small />
        <Kpi icon={AlertTriangle} tone="rose" label="Due" value={formatPKR(stats?.outstanding || 0)} sub={stats?.outstanding > 0 ? 'Dena baaki' : 'Clear ✓'} small isAlert={(stats?.outstanding || 0) > 0} />
        <Kpi icon={Activity} tone="violet" label="Avg Order" value={formatPKR(stats?.averagePurchase || 0)} sub="Per purchase" small />
      </section>

      {/* ═══ CHARTS ═══ */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-4 print:hidden">
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">30-Day Purchase Trend</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Is supplier se daily kharidari</p>
            </div>
            <BarChart3 className="h-5 w-5 text-orange-500" />
          </div>
          {trendData.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="suppDetailGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={10} interval={3} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Area type="monotone" dataKey="total" name="Purchases" fill="url(#suppDetailGrad)" stroke="#f97316" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 font-semibold">
              Pichle 30 din me koi purchase nahi
            </div>
          )}
        </div>

        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Payment Methods</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Is supplier ko kaise pay karte ho</p>
            </div>
            <CreditCard className="h-5 w-5 text-blue-500" />
          </div>
          {supplier.paymentBreakdown && supplier.paymentBreakdown.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={supplier.paymentBreakdown.map((p: any) => ({
                      name: paymentConfig[p.paymentMethod]?.label || p.paymentMethod,
                      value: p.total,
                    }))}
                    cx="50%" cy="45%" outerRadius={80} innerRadius={40}
                    dataKey="value"
                    label={(entry: any) => {
                      const total = supplier.paymentBreakdown.reduce((s: number, p: any) => s + p.total, 0);
                      const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
                      return `${pct}%`;
                    }}
                    labelLine={false}
                  >
                    {supplier.paymentBreakdown.map((p: any) => (
                      <Cell key={p.paymentMethod} fill={paymentConfig[p.paymentMethod]?.hex || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 font-semibold">
              Abhi koi payment data nahi
            </div>
          )}
        </div>
      </section>

      {/* ═══ TOP PRODUCTS + BANKING ═══ */}
      <section className="grid lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-violet-200 dark:border-violet-500/30 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 border-b-2 border-violet-200 dark:border-violet-500/30 flex items-center gap-2">
            <Award className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            <div>
              <h3 className="font-extrabold text-violet-900 dark:text-violet-200">Top Products</h3>
              <p className="text-[11px] text-violet-700 dark:text-violet-300/80 font-bold">Is supplier se sab se zyada mangwaya</p>
            </div>
          </div>
          {supplier.topProducts && supplier.topProducts.length > 0 ? (
            <div className="divide-y divide-violet-100 dark:divide-slate-800">
              {supplier.topProducts.map((tp: any, idx: number) => {
                const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500'];
                return (
                  <Link
                    key={tp.productId}
                    to={`/products/${tp.productId}/edit`}
                    className="px-5 py-3 flex items-center gap-3 hover:bg-violet-50/40 dark:hover:bg-violet-500/5 transition"
                  >
                    <div className={`h-8 w-8 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0`}>
                      {idx < 3 ? <Star className="h-4 w-4 fill-white" /> : idx + 1}
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                      {tp.product?.images?.[0]?.url ? (
                        <img src={tp.product.images[0].url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 dark:text-white text-sm truncate">{tp.product?.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                        {tp.quantity.toFixed(tp.quantity % 1 === 0 ? 0 : 2)} {tp.product?.unit} • {tp.orderCount} orders
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-violet-700 dark:text-violet-400 text-sm tabular-nums">{formatPKR(tp.total)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <Package className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Abhi koi product data nahi</p>
            </div>
          )}
        </div>

        {/* Banking Info */}
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-emerald-200 dark:border-emerald-500/30 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200">Banking & Payment</h3>
            </div>
            <Link to={`/suppliers/${id}/edit`} className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline">
              Edit
            </Link>
          </div>

          <dl className="space-y-3">
            {supplier.bankName && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-3">
                <dt className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold uppercase tracking-wider">Bank</dt>
                <dd className="font-extrabold text-emerald-900 dark:text-emerald-200 mt-0.5">{supplier.bankName}</dd>
              </div>
            )}
            {supplier.accountNumber && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <dt className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">Account Number</dt>
                  <dd className="font-mono font-extrabold text-slate-900 dark:text-white mt-0.5 break-all">{supplier.accountNumber}</dd>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(supplier.accountNumber || ''); toast.success('Account copy ho gaya'); }}
                  className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 transition"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                </button>
              </div>
            )}
            {supplier.iban && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <dt className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">IBAN</dt>
                  <dd className="font-mono font-extrabold text-xs break-all text-slate-900 dark:text-white mt-0.5">{supplier.iban}</dd>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(supplier.iban || ''); toast.success('IBAN copy ho gaya'); }}
                  className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 transition"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                </button>
              </div>
            )}
            {supplier.paymentTerms && (
              <div>
                <dt className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider mb-1">Payment Terms</dt>
                <dd>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 text-sm font-extrabold">
                    <Wallet className="h-3.5 w-3.5" /> {supplier.paymentTerms}
                  </span>
                </dd>
              </div>
            )}
            {supplier.ntn && (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 p-3 border border-blue-200 dark:border-blue-500/30">
                <dt className="text-[10px] text-blue-700 dark:text-blue-400 font-extrabold uppercase tracking-wider">NTN</dt>
                <dd className="font-mono font-extrabold text-slate-900 dark:text-white mt-0.5">{supplier.ntn}</dd>
              </div>
            )}
            {supplier.cnic && (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 p-3 border border-blue-200 dark:border-blue-500/30">
                <dt className="text-[10px] text-blue-700 dark:text-blue-400 font-extrabold uppercase tracking-wider">CNIC</dt>
                <dd className="font-mono font-extrabold text-slate-900 dark:text-white mt-0.5">{supplier.cnic}</dd>
              </div>
            )}
            {!supplier.bankName && !supplier.accountNumber && !supplier.paymentTerms && (
              <div className="text-center py-6">
                <CreditCard className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Bank details nahi hain</p>
                <Link to={`/suppliers/${id}/edit`} className="text-xs text-orange-700 dark:text-orange-400 font-extrabold hover:underline mt-1 inline-block">
                  + Add kar do
                </Link>
              </div>
            )}
          </dl>
        </div>
      </section>

      {/* ═══ PURCHASE HISTORY ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:border-0 print:rounded-none print:shadow-none">
        <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            Purchase History
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">({supplier._count?.purchases || 0} total)</span>
          </h3>
          {supplier.purchases && supplier.purchases.length > 0 && (
            <button
              onClick={exportPurchasesCSV}
              className="text-xs font-extrabold text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1 print:hidden"
            >
              <Download className="h-3 w-3" /> Export CSV
            </button>
          )}
        </div>
        {!supplier.purchases || supplier.purchases.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="font-extrabold text-slate-700 dark:text-slate-300">Abhi koi purchase nahi</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">Pehli purchase is supplier ke sath complete karo</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {supplier.purchases.map((p: any) => {
              const PayIcon = paymentConfig[p.paymentMethod]?.icon || CreditCard;
              const balance = Math.max(p.total - p.paidAmount, 0);
              return (
                <Link
                  key={p.id}
                  to={`/purchases/${p.id}`}
                  className="block px-5 py-4 hover:bg-orange-50/40 dark:hover:bg-orange-500/5 transition group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 print:hidden">
                        <PayIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 dark:text-white font-mono text-sm">{p.purchaseNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            p.status === 'RECEIVED'
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                              : p.status === 'PENDING'
                                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          }`}>{p.status}</span>
                          {balance > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold">
                              Due {formatPKR(balance)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 font-semibold">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(p.purchasedAt)}
                          <span className="text-slate-400 dark:text-slate-600">•</span>
                          <Package className="h-3 w-3" />
                          {p.items?.length || 0} items
                        </div>
                        {p.items && p.items.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1 print:hidden">
                            {p.items.slice(0, 3).map((it: any) => (
                              <span key={it.id} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 max-w-[180px] truncate">
                                {it.product?.name} × {it.quantity}
                              </span>
                            ))}
                            {p.items.length > 3 && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                +{p.items.length - 3} aur
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-extrabold text-orange-700 dark:text-orange-400 tabular-nums">{formatPKR(p.total)}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
                        Paid: <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{formatPKR(p.paidAmount)}</span>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-orange-600 dark:text-orange-400 group-hover:text-orange-700 print:hidden">
                        <Eye className="h-3 w-3" /> Details
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ ADDRESS & NOTES ═══ */}
      {(supplier.address || supplier.notes) && (
        <section className="grid lg:grid-cols-2 gap-4 print:hidden">
          {supplier.address && (
            <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <h3 className="font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-rose-600 dark:text-rose-400" /> Address
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line font-semibold">{supplier.address}</p>
            </div>
          )}
          {supplier.notes && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/40 p-5">
              <h3 className="font-extrabold text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" /> Internal Notes
              </h3>
              <p className="text-sm text-amber-900/80 dark:text-amber-200/80 whitespace-pre-line font-semibold">{supplier.notes}</p>
            </div>
          )}
        </section>
      )}

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 10mm; }
          html, body {
            background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
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
   SUPPLIER DETAIL TEACHER — Universal guide
   ═════════════════════════════════════════════════════════════ */
function SupplierDetailTeacher({ onClose, supplierName }: { onClose: () => void; supplierName: string }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-orange-300 dark:border-orange-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-orange-200 dark:border-orange-500/30 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/15 dark:to-amber-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-orange-900 dark:text-orange-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Supplier Page — Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Ye <strong>"{supplierName}"</strong> ka poora khata hai — kitna maal liya, kitna diya,
            kitna baaki — sab ek jagah.
          </p>

          <div className="rounded-2xl border-2 border-orange-200 dark:border-orange-500/30 bg-orange-50/60 dark:bg-orange-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>💰 Khata kaise parhein?</strong> — Total Amount (sab liya) − Total Paid (sab diya) = <strong>Due</strong> (abhi dena hai)</TipRow>
            <TipRow><strong>🔴 Payment Reminder</strong> — 1 click me WhatsApp pe ready-made hisaab message supplier ko</TipRow>
            <TipRow><strong>👑 VIP badge</strong> — 1 Lakh+ business wala supplier, special treatment deserve karta hai</TipRow>
            <TipRow><strong>🏆 Top Products</strong> — is supplier se sab se zyada kya mangwaya (dobara order easy)</TipRow>
            <TipRow><strong>🖨️ Statement</strong> — Print karo aur supplier ke sath hisaab milao</TipRow>
            <TipRow><strong>⌨️ E</strong> — edit &nbsp;•&nbsp; <strong>W</strong> — WhatsApp kholo</TipRow>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            💡 <strong>Mahine ke aakhir me:</strong> Statement print karo → supplier ko dikhao → hisaab milao →
            payment record karo. Jhagra kabhi nahi hoga!
          </div>

          <Button
            className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 font-extrabold shadow-lg shadow-orange-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
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
    <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm text-[9px]">
      {children}
    </kbd>
  );
}

function KbdLight({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono font-bold shadow-sm">
      {children}
    </kbd>
  );
}

function Truck(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 13.52 8H14" />
      <circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" />
      <path d="M9 18h6" />
    </svg>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, small, isAlert }: any) {
  const tones: Record<string, string> = {
    orange: 'from-orange-500 to-orange-700 shadow-orange-500/40',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/40',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/40',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
  };
  return (
    <div className={`rounded-2xl border-2 p-3 sm:p-4 shadow-sm transition ${
      isAlert
        ? 'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10 border-rose-300 dark:border-rose-500/40'
        : 'bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-slate-200 dark:border-slate-800'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className={`mt-1.5 font-extrabold text-slate-900 dark:text-white tabular-nums truncate ${small ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'}`}>
            {value}
          </div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-4.5 w-4.5 h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
