import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Crown, Phone, Mail, MapPin, FileText, Wallet,
  ShoppingBag, Star, MessageCircle, TrendingUp, ArrowRight, Receipt,
  ArrowUpFromLine, ArrowDownToLine, Cake, Trash2, Copy, Download,
  Calendar, Award, History, Smartphone,
} from 'lucide-react';
import { customersApi } from '@/api/customers.api';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { CustomerMobileHistory } from '@/features/industries/mobile/components/CustomerMobileHistory';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));

const formatDateTime = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const formatRelative = (v: string) => {
  const d = new Date(v);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Abhi';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-PK');
};

export default function CustomerDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { has } = useBusinessFeatures();
  const hasMobile = has('imei');
  const [activeTab, setActiveTab] = useState<'overview' | 'mobile'>('overview');

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getOne(id!),
    enabled: !!id,
  });

  const toggleVipMutation = useMutation({
    mutationFn: () => customersApi.toggleVip(id!),
    onSuccess: (data: any) => {
      toast.success(data.isVip ? 'Now VIP customer' : 'VIP removed');
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => customersApi.remove(id!),
    onSuccess: () => {
      toast.success('Customer deleted');
      window.location.href = '/customers';
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail'),
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return <div className="p-8 text-slate-500">Customer not found</div>;
  }

  const whatsappLink = customer.phone
    ? `https://wa.me/${customer.phone.replace(/[^0-9]/g, '').replace(/^0/, '92')}`
    : null;

  const copyDetails = () => {
    const text = [
      `Name: ${customer.name}`,
      customer.phone && `Phone: ${customer.phone}`,
      customer.email && `Email: ${customer.email}`,
      customer.city && `City: ${customer.city}${customer.area ? `, ${customer.area}` : ''}`,
      customer.balance > 0 && `Khata: ${formatPKR(customer.balance)}`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Customer details copied');
  };

  const exportLedgerCSV = () => {
    if (customer.ledgers.length === 0) return toast.error('No transactions');
    const headers = ['Date', 'Type', 'Amount', 'Balance After', 'Reference', 'Note'];
    const rows = customer.ledgers.map((l: any) => [
      new Date(l.createdAt).toLocaleString('en-PK'),
      l.type.replace(/_/g, ' '),
      l.amount.toFixed(2),
      l.balanceAfter.toFixed(2),
      l.reference || '',
      l.note || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${customer.name.replace(/\s+/g, '-')}-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('Ledger exported');
  };

  return (
    <div className="space-y-6">
      <Link to="/customers" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 font-bold">
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </Link>

      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 shadow-2xl">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="relative">
            {customer.avatarUrl ? (
              <img src={customer.avatarUrl} className="h-24 w-24 rounded-3xl object-cover border-4 border-white/30 shadow-lg" alt={customer.name} />
            ) : (
              <div className="h-24 w-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl font-extrabold border-4 border-white/30 shadow-lg">
                {customer.name.charAt(0).toUpperCase()}
              </div>
            )}
            {customer.isVip && (
              <div className="absolute -top-2 -right-2 h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg ring-4 ring-slate-950">
                <Crown className="h-4 w-4 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-[250px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-extrabold">{customer.name}</h1>
              {customer.isVip && (
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-extrabold uppercase tracking-wider">
                  VIP
                </span>
              )}
              {!customer.isActive && (
                <span className="px-2 py-0.5 rounded-full bg-slate-700 text-white text-[10px] font-bold">INACTIVE</span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-white/90">
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 hover:text-white font-bold transition">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone}
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 hover:text-white font-bold transition">
                  <Mail className="h-3.5 w-3.5" />
                  {customer.email}
                </a>
              )}
              {customer.city && (
                <span className="flex items-center gap-1.5 font-bold">
                  <MapPin className="h-3.5 w-3.5" />
                  {customer.city}{customer.area && `, ${customer.area}`}
                </span>
              )}
              {customer.dateOfBirth && (
                <span className="flex items-center gap-1.5 font-bold">
                  <Cake className="h-3.5 w-3.5" />
                  {formatDate(customer.dateOfBirth)}
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {whatsappLink && (
                <a href={whatsappLink} target="_blank" rel="noreferrer">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                </a>
              )}
              <Link to={`/customers/${id}/edit`}>
                <Button variant="secondary">
                  <Edit3 className="h-4 w-4" /> Edit
                </Button>
              </Link>
              <Button
                variant="secondary"
                onClick={() => toggleVipMutation.mutate()}
                loading={toggleVipMutation.isPending}
              >
                <Crown className="h-4 w-4" />
                {customer.isVip ? 'Remove VIP' : 'Make VIP'}
              </Button>
              <Button variant="secondary" onClick={copyDetails}>
                <Copy className="h-4 w-4" /> Copy
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (confirm(`Delete ${customer.name}? Yeh action undo nahi ho sakta.`)) {
                    removeMutation.mutate();
                  }
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

      {hasMobile && (
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('mobile')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition inline-flex items-center gap-2 ${
              activeTab === 'mobile'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            Mobile History
          </button>
        </div>
      )}

      {hasMobile && activeTab === 'mobile' ? (
        <CustomerMobileHistory customerId={customer.id} />
      ) : (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Sales</div>
                  <div className="text-2xl font-extrabold text-slate-900">{customer.stats.totalSales}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Spent</div>
                  <div className="text-xl font-extrabold text-emerald-700">{formatPKR(customer.stats.totalSpent)}</div>
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-500 font-semibold">
                Avg per sale: <strong>{formatPKR(customer.stats.averageSale)}</strong>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow-lg ${
                  customer.balance > 0 ? 'bg-gradient-to-br from-rose-500 to-rose-700 shadow-rose-500/30' : 'bg-gradient-to-br from-slate-500 to-slate-700'
                }`}>
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Khata</div>
                  <div className={`text-xl font-extrabold ${customer.balance > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                    {formatPKR(customer.balance)}
                  </div>
                </div>
              </div>
              {customer.creditLimit > 0 && (
                <div className="mt-1 text-xs text-slate-500 font-semibold">
                  Limit: <strong>{formatPKR(customer.creditLimit)}</strong>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white p-5 shadow-lg shadow-amber-500/30">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Star className="h-5 w-5 fill-white" />
                </div>
                <div>
                  <div className="text-xs text-white/80 font-bold uppercase tracking-wider">Loyalty</div>
                  <div className="text-2xl font-extrabold">{customer.loyaltyPoints.toLocaleString()}</div>
                </div>
              </div>
              <div className="mt-1 text-xs text-white/70 font-semibold">points earned</div>
            </div>
          </section>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-600" />
                  Recent Sales
                </h3>
                <span className="text-xs text-slate-500 font-bold">{customer._count.sales} total</span>
              </div>
              {customer.sales.length === 0 ? (
                <div className="p-10 text-center">
                  <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No sales yet</p>
                  <p className="text-xs text-slate-500 mt-1">POS se sale add karein</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                  {customer.sales.map((s) => (
                    <Link
                      key={s.id}
                      to={`/sales/${s.id}/receipt`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-slate-900 font-mono">{s.saleNumber}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(s.soldAt)}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <div className="font-extrabold text-emerald-700">{formatPKR(s.total)}</div>
                        <div className="text-xs text-slate-500 font-semibold">{s.paymentMethod}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 ml-3 group-hover:text-blue-600 transition" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-rose-600" />
                  Khata Ledger
                </h3>
                <div className="flex items-center gap-2">
                  {customer.ledgers.length > 0 && (
                    <button onClick={exportLedgerCSV} className="text-xs font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1">
                      <Download className="h-3 w-3" /> Export
                    </button>
                  )}
                  <Link to="/khata" className="text-xs text-blue-600 font-bold hover:underline">
                    Receive Payment →
                  </Link>
                </div>
              </div>
              {customer.ledgers.length === 0 ? (
                <div className="p-10 text-center">
                  <History className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No transactions yet</p>
                  <p className="text-xs text-slate-500 mt-1">Khata transactions yahan show hongi</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                  {customer.ledgers.map((l: any) => {
                    const isCredit = l.amount > 0;
                    const Icon = isCredit ? ArrowUpFromLine : ArrowDownToLine;
                    return (
                      <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isCredit ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-900">
                            {l.type.replace(/_/g, ' ')}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {l.note || l.reference || '—'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            {formatRelative(l.createdAt)}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`font-extrabold text-sm ${isCredit ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {isCredit ? '+' : ''}{formatPKR(l.amount)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold">
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

          {customer.loyaltyTransactions && customer.loyaltyTransactions.length > 0 && (
            <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-amber-200 flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-600" />
                <h3 className="font-bold text-slate-900">Loyalty Activity</h3>
                <span className="ml-auto text-xs text-amber-700 font-bold">{customer.loyaltyTransactions.length}</span>
              </div>
              <div className="divide-y divide-amber-100 max-h-[300px] overflow-y-auto">
                {customer.loyaltyTransactions.map((t: any) => (
                  <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{t.type.replace(/_/g, ' ')}</div>
                      <div className="text-xs text-slate-500">{formatRelative(t.createdAt)} • {t.note || t.reference || '—'}</div>
                    </div>
                    <div className={`font-extrabold ${t.points >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {t.points >= 0 ? '+' : ''}{t.points.toLocaleString()} pts
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {customer.notes && (
            <div className="rounded-3xl bg-amber-50 border-2 border-amber-200 p-5">
              <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Notes
              </h3>
              <p className="text-sm text-amber-900/80 whitespace-pre-line">{customer.notes}</p>
            </div>
          )}

          {(customer.cnic || customer.gender) && (
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-600" />
                Additional Info
              </h3>
              <dl className="grid sm:grid-cols-3 gap-4 text-sm">
                {customer.cnic && (
                  <div>
                    <dt className="text-xs text-slate-500 font-bold uppercase tracking-wider">CNIC</dt>
                    <dd className="font-mono font-bold mt-0.5">{customer.cnic}</dd>
                  </div>
                )}
                {customer.gender && (
                  <div>
                    <dt className="text-xs text-slate-500 font-bold uppercase tracking-wider">Gender</dt>
                    <dd className="font-bold mt-0.5 capitalize">{customer.gender.toLowerCase()}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-slate-500 font-bold uppercase tracking-wider">Customer Since</dt>
                  <dd className="font-bold mt-0.5">{formatDate(customer.createdAt)}</dd>
                </div>
              </dl>
            </div>
          )}
        </>
      )}
    </div>
  );
}



