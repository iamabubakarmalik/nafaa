import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Crown, Phone, Mail, MapPin, Calendar, FileText,
  Wallet, ShoppingBag, Star, MessageCircle, TrendingUp, ArrowRight,
  Receipt, ArrowUpFromLine, ArrowDownToLine, Cake,
} from 'lucide-react';
import { customersApi } from '@/api/customers.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));

const formatDateTime = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

export default function CustomerDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: customer } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getOne(id!),
    enabled: !!id,
  });

  const toggleVipMutation = useMutation({
    mutationFn: () => customersApi.toggleVip(id!),
    onSuccess: () => {
      toast.success('VIP status updated');
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  if (!customer) {
    return <div className="p-8 text-slate-500">Loading customer...</div>;
  }

  const whatsappLink = customer.phone
    ? `https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`
    : null;

  return (
    <div className="space-y-6">
      <Link to="/customers" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600">
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </Link>

      {/* Hero card */}
      <section className="rounded-3xl bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-600 text-white p-6 shadow-soft">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="relative">
            {customer.avatarUrl ? (
              <img
                src={customer.avatarUrl}
                className="h-24 w-24 rounded-3xl object-cover border-4 border-white/30"
                alt={customer.name}
              />
            ) : (
              <div className="h-24 w-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl font-bold border-4 border-white/30">
                {customer.name.charAt(0).toUpperCase()}
              </div>
            )}
            {customer.isVip && (
              <div className="absolute -top-2 -right-2 h-9 w-9 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                <Crown className="h-4 w-4 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-[250px]">
            <h1 className="text-3xl font-bold">{customer.name}</h1>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-white/90">
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 hover:text-white">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone}
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 hover:text-white">
                  <Mail className="h-3.5 w-3.5" />
                  {customer.email}
                </a>
              )}
              {customer.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {customer.city}{customer.area && `, ${customer.area}`}
                </span>
              )}
              {customer.dateOfBirth && (
                <span className="flex items-center gap-1.5">
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
              >
                <Crown className="h-4 w-4" />
                {customer.isVip ? 'Remove VIP' : 'Make VIP'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase">Total Sales</div>
              <div className="text-2xl font-bold">{customer.stats.totalSales}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase">Total Spent</div>
              <div className="text-2xl font-bold text-emerald-700">{formatPKR(customer.stats.totalSpent)}</div>
            </div>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Avg: {formatPKR(customer.stats.averageSale)}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
              customer.balance > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
            }`}>
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase">Khata</div>
              <div className={`text-2xl font-bold ${customer.balance > 0 ? 'text-rose-700' : ''}`}>
                {formatPKR(customer.balance)}
              </div>
            </div>
          </div>
          {customer.creditLimit > 0 && (
            <div className="mt-1 text-xs text-slate-500">
              Limit: {formatPKR(customer.creditLimit)}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Star className="h-5 w-5 fill-white" />
            </div>
            <div>
              <div className="text-xs text-white/80 font-bold uppercase">Loyalty</div>
              <div className="text-2xl font-bold">{customer.loyaltyPoints}</div>
            </div>
          </div>
          <div className="mt-1 text-xs text-white/70">points earned</div>
        </div>
      </section>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-600" />
              Recent Sales
            </h3>
            <span className="text-xs text-slate-500">{customer._count.sales} total</span>
          </div>
          {customer.sales.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No sales yet</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {customer.sales.map((s) => (
                <Link
                  key={s.id}
                  to={`/sales/${s.id}/receipt`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition"
                >
                  <div>
                    <div className="font-bold text-sm text-slate-900">{s.saleNumber}</div>
                    <div className="text-xs text-slate-500">{formatDateTime(s.soldAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-700">{formatPKR(s.total)}</div>
                    <div className="text-xs text-slate-500">{s.paymentMethod}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 ml-3" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Khata ledger */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-rose-600" />
              Khata Ledger
            </h3>
            <Link to="/khata" className="text-xs text-blue-600 font-bold hover:underline">
              Receive Payment →
            </Link>
          </div>
          {customer.ledgers.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No transactions yet</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {customer.ledgers.map((l) => {
                const isCredit = l.amount > 0;
                const Icon = isCredit ? ArrowUpFromLine : ArrowDownToLine;
                return (
                  <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
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
                      <div className="text-[10px] text-slate-400">
                        {formatDateTime(l.createdAt)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-bold text-sm ${isCredit ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {isCredit ? '+' : ''}{formatPKR(l.amount)}
                      </div>
                      <div className="text-xs text-slate-500">
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

      {/* Notes */}
      {customer.notes && (
        <div className="rounded-3xl bg-amber-50 border border-amber-200 p-5">
          <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Notes
          </h3>
          <p className="text-sm text-amber-900/80">{customer.notes}</p>
        </div>
      )}

      {/* CNIC + meta */}
      {(customer.cnic || customer.gender) && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-3">Additional Info</h3>
          <dl className="grid sm:grid-cols-2 gap-3 text-sm">
            {customer.cnic && (
              <div>
                <dt className="text-xs text-slate-500 font-bold uppercase">CNIC</dt>
                <dd className="font-mono font-bold">{customer.cnic}</dd>
              </div>
            )}
            {customer.gender && (
              <div>
                <dt className="text-xs text-slate-500 font-bold uppercase">Gender</dt>
                <dd className="font-bold capitalize">{customer.gender.toLowerCase()}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-slate-500 font-bold uppercase">Customer Since</dt>
              <dd className="font-bold">{formatDate(customer.createdAt)}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
