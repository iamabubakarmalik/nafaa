import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  ArrowLeft, Edit3, Phone, Mail, MapPin, MessageCircle, CreditCard,
  FileText, ShoppingBag, TrendingUp, Wallet, Building2, Trash2,
  Copy, Download, Calendar, AlertTriangle, Package, Crown, Star,
  Award, Activity, BarChart3, Banknote, Smartphone, Building, Zap,
  Clock, CheckCircle2, Eye, Printer, Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { suppliersApi } from '@/api/suppliers.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

const formatDateTime = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));

const paymentConfig: Record<string, { label: string; icon: any; hex: string }> = {
  CASH: { label: 'Cash', icon: Banknote, hex: '#10b981' },
  CARD: { label: 'Card', icon: CreditCard, hex: '#3b82f6' },
  JAZZCASH: { label: 'JazzCash', icon: Smartphone, hex: '#f97316' },
  EASYPAISA: { label: 'EasyPaisa', icon: Zap, hex: '#22c55e' },
  BANK_TRANSFER: { label: 'Bank', icon: Building, hex: '#8b5cf6' },
};

export default function SupplierDetailPage() {
  const { id } = useParams();

  const { data: supplier, isLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => suppliersApi.getOne(id!),
    enabled: !!id,
  });

  const removeMutation = useMutation({
    mutationFn: () => suppliersApi.remove(id!),
    onSuccess: () => {
      toast.success('Supplier deleted');
      window.location.href = '/suppliers';
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cannot delete'),
  });

  const trendData = useMemo(() => {
    if (!supplier?.trend30Days) return [];
    return supplier.trend30Days.map((p: any) => {
      const d = new Date(p.date);
      return { ...p, label: `${d.getDate()}/${d.getMonth() + 1}` };
    });
  }, [supplier]);

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block h-10 w-10 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
      </div>
    );
  }

  if (!supplier) return <div className="p-8 text-slate-500">Supplier not found</div>;

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
    toast.success('Supplier details copied');
  };

  const exportPurchasesCSV = () => {
    if (!supplier.purchases || supplier.purchases.length === 0) return toast.error('No purchases');
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
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${supplier.name.replace(/\s+/g, '-')}-purchases.csv`;
    a.click();
    toast.success('Exported');
  };

  const sharePaymentRequest = () => {
    if (!supplier.phone || !supplier.stats?.outstanding) return;
    const phone = supplier.phone.replace(/[^0-9]/g, '').replace(/^0/, '92');
    const lines = [
      `Assalam-o-Alaikum *${supplier.contactPerson || supplier.name}*,`,
      '',
      'Hamare records ke mutabiq aap ke account mein outstanding balance hai:',
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
  };

  const stats = supplier.stats;
  const isVip = (stats?.totalAmount || 0) > 100000;

  return (
    <div className="space-y-6">
      <Link to="/suppliers" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-orange-600 font-bold">
        <ArrowLeft className="h-4 w-4" /> Back to Suppliers
      </Link>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-start gap-5 flex-wrap">
          <div className="relative">
            {supplier.logoUrl ? (
              <img src={supplier.logoUrl} className="h-24 w-24 rounded-3xl object-cover border-4 border-white/30 shadow-2xl" alt={supplier.name} />
            ) : (
              <div className="h-24 w-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl font-extrabold border-4 border-white/30 shadow-2xl">
                {supplier.name.charAt(0).toUpperCase()}
              </div>
            )}
            {isVip && (
              <div className="absolute -top-2 -right-2 h-9 w-9 rounded-full bg-amber-500 border-4 border-white flex items-center justify-center shadow-lg" title="VIP Supplier">
                <Crown className="h-4 w-4 text-white fill-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-[250px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl sm:text-4xl font-extrabold">{supplier.name}</h1>
              {isVip && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/30 backdrop-blur text-amber-100 text-xs font-extrabold uppercase tracking-wider">
                  <Crown className="h-3 w-3" /> VIP
                </span>
              )}
              {!supplier.isActive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/30 backdrop-blur text-slate-100 text-xs font-extrabold uppercase">
                  Inactive
                </span>
              )}
            </div>
            {supplier.contactPerson && (
              <div className="text-sm text-white/90 mt-1 font-bold">Contact: {supplier.contactPerson}</div>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-white/90">
              {supplier.phone && (
                <a href={`tel:${supplier.phone}`} className="inline-flex items-center gap-1.5 font-bold hover:text-white">
                  <Phone className="h-3.5 w-3.5" /> {supplier.phone}
                </a>
              )}
              {supplier.altPhone && (
                <span className="inline-flex items-center gap-1.5 text-xs text-white/70 font-semibold">
                  Alt: {supplier.altPhone}
                </span>
              )}
              {supplier.email && (
                <a href={`mailto:${supplier.email}`} className="inline-flex items-center gap-1.5 font-bold hover:text-white">
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
                Last purchase: {stats.daysSinceLastPurchase === 0 ? 'Today' : `${stats.daysSinceLastPurchase} days ago`}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {whatsappLink && (
                <a href={whatsappLink} target="_blank" rel="noreferrer">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                </a>
              )}
              {(stats?.outstanding || 0) > 0 && supplier.phone && (
                <Button onClick={sharePaymentRequest} className="bg-rose-600 hover:bg-rose-700 text-white">
                  <AlertTriangle className="h-4 w-4" /> Send Payment Reminder
                </Button>
              )}
              <Link to={`/suppliers/${id}/edit`}>
                <Button variant="secondary">
                  <Edit3 className="h-4 w-4" /> Edit
                </Button>
              </Link>
              <Button variant="secondary" onClick={copyDetails}>
                <Copy className="h-4 w-4" /> Copy
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (confirm(`Delete ${supplier.name}?`)) removeMutation.mutate();
                }}
                loading={removeMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS GRID ═══ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Purchases"
          value={String(stats?.totalPurchases || 0)}
          sub="All time orders"
          icon={ShoppingBag}
          color="orange"
        />
        <StatCard
          label="Total Amount"
          value={formatPKR(stats?.totalAmount || 0)}
          sub="Lifetime spend"
          icon={TrendingUp}
          color="blue"
          isText
        />
        <StatCard
          label="Total Paid"
          value={formatPKR(stats?.totalPaid || 0)}
          sub={`${stats?.totalAmount > 0 ? (((stats?.totalPaid || 0) / stats.totalAmount) * 100).toFixed(0) : 0}% paid`}
          icon={Wallet}
          color="emerald"
          isText
        />
        <StatCard
          label="Outstanding Due"
          value={formatPKR(stats?.outstanding || 0)}
          sub={stats?.outstanding > 0 ? 'Pay supplier' : 'All clear ✓'}
          icon={AlertTriangle}
          color="rose"
          isText
          isAlert={(stats?.outstanding || 0) > 0}
        />
        <StatCard
          label="Avg Purchase"
          value={formatPKR(stats?.averagePurchase || 0)}
          sub="Per order"
          icon={Activity}
          color="violet"
          isText
        />
      </section>

      {/* ═══ CHARTS ROW ═══ */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* 30-day trend */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">30-Day Purchase Trend</h3>
              <p className="text-xs text-slate-500">Daily spending pattern with this supplier</p>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={10} interval={3} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Area type="monotone" dataKey="total" name="Purchases" fill="url(#suppDetailGrad)" stroke="#f97316" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">
              No purchase data in last 30 days
            </div>
          )}
        </div>

        {/* Payment methods */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Payment Methods</h3>
              <p className="text-xs text-slate-500">How you pay this supplier</p>
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
            <div className="h-[260px] flex items-center justify-center text-sm text-slate-500">
              No payment data yet
            </div>
          )}
        </div>
      </section>

      {/* ═══ TOP PRODUCTS + BANK INFO ═══ */}
      <section className="grid lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="rounded-3xl bg-white border-2 border-violet-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b-2 border-violet-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-violet-600" />
              <h3 className="font-extrabold text-violet-900">Top Products from this Supplier</h3>
            </div>
          </div>
          {supplier.topProducts && supplier.topProducts.length > 0 ? (
            <div className="divide-y divide-violet-100">
              {supplier.topProducts.map((tp: any, idx: number) => {
                const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-violet-500', 'bg-blue-500'];
                return (
                  <Link
                    key={tp.productId}
                    to={`/products/${tp.productId}/edit`}
                    className="px-5 py-3 flex items-center gap-3 hover:bg-violet-50/30 transition"
                  >
                    <div className={`h-8 w-8 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0`}>
                      {idx < 3 ? <Star className="h-4 w-4 fill-white" /> : idx + 1}
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                      {tp.product?.images?.[0]?.url ? (
                        <img src={tp.product.images[0].url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-sm truncate">{tp.product?.name}</div>
                      <div className="text-[11px] text-slate-500 font-semibold">
                        {tp.quantity.toFixed(tp.quantity % 1 === 0 ? 0 : 2)} {tp.product?.unit} • {tp.orderCount} orders
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-violet-700 text-sm tabular-nums">{formatPKR(tp.total)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">No product data yet</p>
            </div>
          )}
        </div>

        {/* Banking Info */}
        <div className="rounded-3xl bg-white border-2 border-emerald-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              <h3 className="font-extrabold text-emerald-900">Banking & Payment Info</h3>
            </div>
            <Link to={`/suppliers/${id}/edit`} className="text-xs font-bold text-emerald-700 hover:underline">
              Edit
            </Link>
          </div>

          <dl className="space-y-3">
            {supplier.bankName && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                <dt className="text-xs text-emerald-700 font-extrabold uppercase tracking-wider">Bank</dt>
                <dd className="font-extrabold text-emerald-900 mt-0.5">{supplier.bankName}</dd>
              </div>
            )}
            {supplier.accountNumber && (
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 flex items-center justify-between">
                <div>
                  <dt className="text-xs text-slate-500 font-bold uppercase tracking-wider">Account Number</dt>
                  <dd className="font-mono font-extrabold text-slate-900 mt-0.5">{supplier.accountNumber}</dd>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(supplier.accountNumber || '');
                    toast.success('Copied');
                  }}
                  className="h-8 w-8 rounded-lg bg-white hover:bg-slate-100 flex items-center justify-center"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-600" />
                </button>
              </div>
            )}
            {supplier.iban && (
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <dt className="text-xs text-slate-500 font-bold uppercase tracking-wider">IBAN</dt>
                  <dd className="font-mono font-extrabold text-xs break-all text-slate-900 mt-0.5">{supplier.iban}</dd>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(supplier.iban || '');
                    toast.success('Copied');
                  }}
                  className="h-8 w-8 rounded-lg bg-white hover:bg-slate-100 flex items-center justify-center shrink-0"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-600" />
                </button>
              </div>
            )}
            {supplier.paymentTerms && (
              <div>
                <dt className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Payment Terms</dt>
                <dd>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-extrabold">
                    <Wallet className="h-3.5 w-3.5" />
                    {supplier.paymentTerms}
                  </span>
                </dd>
              </div>
            )}
            {supplier.ntn && (
              <div className="rounded-xl bg-blue-50 p-3 border border-blue-200">
                <dt className="text-xs text-blue-700 font-bold uppercase tracking-wider">NTN</dt>
                <dd className="font-mono font-extrabold text-slate-900 mt-0.5">{supplier.ntn}</dd>
              </div>
            )}
            {supplier.cnic && (
              <div className="rounded-xl bg-blue-50 p-3 border border-blue-200">
                <dt className="text-xs text-blue-700 font-bold uppercase tracking-wider">CNIC</dt>
                <dd className="font-mono font-extrabold text-slate-900 mt-0.5">{supplier.cnic}</dd>
              </div>
            )}
            {!supplier.bankName && !supplier.accountNumber && !supplier.paymentTerms && (
              <div className="text-center py-6">
                <CreditCard className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No banking info yet</p>
                <Link to={`/suppliers/${id}/edit`} className="text-xs text-orange-700 font-bold hover:underline mt-1 inline-block">
                  + Add bank details
                </Link>
              </div>
            )}
          </dl>
        </div>
      </section>

      {/* ═══ RECENT PURCHASES ═══ */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-orange-600" />
            Purchase History
            <span className="text-xs font-normal text-slate-500">({supplier._count?.purchases || 0} total)</span>
          </h3>
          {supplier.purchases && supplier.purchases.length > 0 && (
            <button
              onClick={exportPurchasesCSV}
              className="text-xs font-bold text-orange-600 hover:underline inline-flex items-center gap-1"
            >
              <Download className="h-3 w-3" /> Export CSV
            </button>
          )}
        </div>
        {!supplier.purchases || supplier.purchases.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">No purchases yet</p>
            <p className="text-xs text-slate-500 mt-1">First purchase iss supplier ke saath complete karein</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {supplier.purchases.map((p: any) => {
              const PayIcon = paymentConfig[p.paymentMethod]?.icon || CreditCard;
              const balance = Math.max(p.total - p.paidAmount, 0);
              return (
                <Link
                  key={p.id}
                  to={`/purchases/${p.id}`}
                  className="block px-5 py-4 hover:bg-slate-50 transition group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <PayIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 font-mono text-sm">{p.purchaseNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            p.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700' :
                            p.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>{p.status}</span>
                          {balance > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                              Due {formatPKR(balance)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(p.purchasedAt)}
                          <span className="text-slate-400">•</span>
                          <Package className="h-3 w-3" />
                          {p.items?.length || 0} items
                        </div>
                        {p.items && p.items.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {p.items.slice(0, 3).map((it: any) => (
                              <span key={it.id} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 max-w-[180px] truncate">
                                {it.product?.name} × {it.quantity}
                              </span>
                            ))}
                            {p.items.length > 3 && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                                +{p.items.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-extrabold text-orange-700 tabular-nums">{formatPKR(p.total)}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Paid: <span className="font-extrabold text-emerald-700">{formatPKR(p.paidAmount)}</span>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-orange-600 group-hover:text-orange-700">
                        <Eye className="h-3 w-3" />
                        Details
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
        <section className="grid lg:grid-cols-2 gap-6">
          {supplier.address && (
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-rose-600" /> Address
              </h3>
              <p className="text-sm text-slate-700 whitespace-pre-line">{supplier.address}</p>
            </div>
          )}

          {supplier.notes && (
            <div className="rounded-3xl bg-amber-50 border-2 border-amber-200 p-5">
              <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Internal Notes
              </h3>
              <p className="text-sm text-amber-900/80 whitespace-pre-line">{supplier.notes}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, isText, isAlert }: any) {
  const colors: Record<string, string> = {
    orange: 'from-orange-500 to-orange-700 shadow-orange-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/30',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
  };
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${
      isAlert ? 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-300' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className={`mt-2 font-extrabold text-slate-900 tabular-nums truncate ${isText ? 'text-lg' : 'text-2xl'}`}>
            {value}
          </div>
          <div className="text-xs text-slate-600 font-semibold mt-1">{sub}</div>
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0 ml-2`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
