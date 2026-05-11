import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Truck, Phone, Mail, MapPin, MessageCircle,
  CreditCard, FileText, ShoppingBag, TrendingUp, Wallet, ArrowRight, Building2,
} from 'lucide-react';
import { suppliersApi } from '@/api/suppliers.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';

const formatDateTime = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

export default function SupplierDetailPage() {
  const { id } = useParams();

  const { data: supplier } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => suppliersApi.getOne(id!),
    enabled: !!id,
  });

  if (!supplier) return <div className="p-8 text-slate-500">Loading...</div>;

  const whatsappLink = supplier.phone
    ? `https://wa.me/${supplier.phone.replace(/[^0-9]/g, '')}`
    : null;

  return (
    <div className="space-y-6">
      <Link to="/suppliers" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-orange-600">
        <ArrowLeft className="h-4 w-4" /> Back to Suppliers
      </Link>

      <section className="rounded-3xl bg-gradient-to-br from-orange-900 to-amber-700 text-white p-6 shadow-soft">
        <div className="flex items-start gap-5 flex-wrap">
          {supplier.logoUrl ? (
            <img
              src={supplier.logoUrl}
              className="h-24 w-24 rounded-3xl object-cover border-4 border-white/30"
              alt={supplier.name}
            />
          ) : (
            <div className="h-24 w-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl font-bold border-4 border-white/30">
              {supplier.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-[250px]">
            <h1 className="text-3xl font-bold">{supplier.name}</h1>
            {supplier.contactPerson && (
              <div className="text-sm text-white/90 mt-1">Contact: {supplier.contactPerson}</div>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-white/90">
              {supplier.phone && (
                <a href={`tel:${supplier.phone}`} className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {supplier.phone}
                </a>
              )}
              {supplier.email && (
                <a href={`mailto:${supplier.email}`} className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {supplier.email}
                </a>
              )}
              {supplier.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {supplier.city}
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
              <Link to={`/suppliers/${id}/edit`}>
                <Button variant="secondary">
                  <Edit3 className="h-4 w-4" /> Edit
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <ShoppingBag className="h-5 w-5 text-orange-600" />
          <div className="text-xs text-slate-500 font-bold uppercase mt-2">Total Purchases</div>
          <div className="text-2xl font-bold">{supplier.stats.totalPurchases}</div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <div className="text-xs text-slate-500 font-bold uppercase mt-2">Total Amount</div>
          <div className="text-2xl font-bold text-blue-700">{formatPKR(supplier.stats.totalAmount)}</div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <Wallet className="h-5 w-5 text-emerald-600" />
          <div className="text-xs text-slate-500 font-bold uppercase mt-2">Paid</div>
          <div className="text-2xl font-bold text-emerald-700">{formatPKR(supplier.stats.totalPaid)}</div>
        </div>
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5">
          <Wallet className="h-5 w-5 text-rose-600" />
          <div className="text-xs text-rose-700 font-bold uppercase mt-2">Outstanding</div>
          <div className="text-2xl font-bold text-rose-700">{formatPKR(supplier.stats.outstanding)}</div>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Recent Purchases</h3>
          </div>
          {supplier.purchases.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No purchases yet</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {supplier.purchases.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="font-bold text-sm text-slate-900">{p.purchaseNumber}</div>
                    <div className="text-xs text-slate-500">{formatDateTime(p.purchasedAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-700">{formatPKR(p.total)}</div>
                    <div className="text-xs text-slate-500">{p.paymentMethod}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-600" /> Banking & Payment
          </h3>

          <dl className="space-y-3">
            {supplier.bankName && (
              <div>
                <dt className="text-xs text-slate-500 font-bold uppercase">Bank</dt>
                <dd className="font-bold">{supplier.bankName}</dd>
              </div>
            )}
            {supplier.accountNumber && (
              <div>
                <dt className="text-xs text-slate-500 font-bold uppercase">Account #</dt>
                <dd className="font-mono font-bold">{supplier.accountNumber}</dd>
              </div>
            )}
            {supplier.iban && (
              <div>
                <dt className="text-xs text-slate-500 font-bold uppercase">IBAN</dt>
                <dd className="font-mono font-bold text-xs break-all">{supplier.iban}</dd>
              </div>
            )}
            {supplier.paymentTerms && (
              <div>
                <dt className="text-xs text-slate-500 font-bold uppercase">Payment Terms</dt>
                <dd>
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                    {supplier.paymentTerms}
                  </span>
                </dd>
              </div>
            )}
            {supplier.ntn && (
              <div>
                <dt className="text-xs text-slate-500 font-bold uppercase">NTN</dt>
                <dd className="font-mono font-bold">{supplier.ntn}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {supplier.notes && (
        <div className="rounded-3xl bg-amber-50 border border-amber-200 p-5">
          <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Notes
          </h3>
          <p className="text-sm text-amber-900/80">{supplier.notes}</p>
        </div>
      )}
    </div>
  );
}
