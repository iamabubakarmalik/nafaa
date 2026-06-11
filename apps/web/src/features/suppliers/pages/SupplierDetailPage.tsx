import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Truck, Phone, Mail, MapPin, MessageCircle,
  CreditCard, FileText, ShoppingBag, TrendingUp, Wallet, ArrowRight,
  Building2, Trash2, Copy, Download, Calendar, AlertTriangle,
} from 'lucide-react';
import { suppliersApi } from '@/api/suppliers.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

const formatDateTime = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));

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
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Supplier details copied');
  };

  const exportPurchasesCSV = () => {
    if (!supplier.purchases || supplier.purchases.length === 0) return toast.error('No purchases');
    const headers = ['Purchase #', 'Date', 'Items', 'Total', 'Payment', 'Status'];
    const rows = supplier.purchases.map((p: any) => [
      p.purchaseNumber,
      new Date(p.purchasedAt).toLocaleString('en-PK'),
      p.items?.length || 0,
      p.total.toFixed(2),
      p.paymentMethod,
      p.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${supplier.name.replace(/\s+/g, '-')}-purchases.csv`;
    a.click();
    toast.success('Exported');
  };

  return (
    <div className="space-y-6">
      <Link to="/suppliers" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-orange-600 font-bold">
        <ArrowLeft className="h-4 w-4" /> Back to Suppliers
      </Link>

      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white p-6 shadow-2xl">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="relative">
            {supplier.logoUrl ? (
              <img src={supplier.logoUrl} className="h-24 w-24 rounded-3xl object-cover border-4 border-white/30 shadow-lg" alt={supplier.name} />
            ) : (
              <div className="h-24 w-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl font-extrabold border-4 border-white/30 shadow-lg">
                {supplier.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-[250px]">
            <h1 className="text-3xl font-extrabold">{supplier.name}</h1>
            {supplier.contactPerson && (
              <div className="text-sm text-white/90 mt-1 font-bold">Contact: {supplier.contactPerson}</div>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-white/90">
              {supplier.phone && (
                <a href={`tel:${supplier.phone}`} className="flex items-center gap-1.5 font-bold hover:text-white">
                  <Phone className="h-3.5 w-3.5" /> {supplier.phone}
                </a>
              )}
              {supplier.altPhone && (
                <span className="flex items-center gap-1.5 text-xs text-white/70">
                  Alt: {supplier.altPhone}
                </span>
              )}
              {supplier.email && (
                <a href={`mailto:${supplier.email}`} className="flex items-center gap-1.5 font-bold hover:text-white">
                  <Mail className="h-3.5 w-3.5" /> {supplier.email}
                </a>
              )}
              {supplier.city && (
                <span className="flex items-center gap-1.5 font-bold">
                  <MapPin className="h-3.5 w-3.5" /> {supplier.city}{supplier.area && `, ${supplier.area}`}
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

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Purchases</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-2">{supplier.stats?.totalPurchases || 0}</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 text-white flex items-center justify-center shadow-lg shadow-orange-500/30">
              <ShoppingBag className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Amount</div>
              <div className="text-xl font-extrabold text-blue-700 mt-2 truncate">{formatPKR(supplier.stats?.totalAmount || 0)}</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0 ml-2">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Paid</div>
              <div className="text-xl font-extrabold text-emerald-700 mt-2 truncate">{formatPKR(supplier.stats?.totalPaid || 0)}</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0 ml-2">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className={`rounded-2xl border-2 p-5 ${
          (supplier.stats?.outstanding || 0) > 0
            ? 'bg-rose-50 border-rose-200 shadow-lg shadow-rose-500/10'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-xs uppercase tracking-wider font-bold ${
                (supplier.stats?.outstanding || 0) > 0 ? 'text-rose-700' : 'text-slate-500'
              }`}>Outstanding</div>
              <div className={`text-xl font-extrabold mt-2 truncate ${
                (supplier.stats?.outstanding || 0) > 0 ? 'text-rose-700' : 'text-slate-900'
              }`}>
                {formatPKR(supplier.stats?.outstanding || 0)}
              </div>
              {(supplier.stats?.outstanding || 0) > 0 && (
                <div className="text-xs text-rose-700 font-bold mt-1 inline-flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Pay supplier
                </div>
              )}
            </div>
            <div className={`h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow-lg shrink-0 ml-2 ${
              (supplier.stats?.outstanding || 0) > 0
                ? 'bg-gradient-to-br from-rose-500 to-rose-700 shadow-rose-500/30'
                : 'bg-gradient-to-br from-slate-500 to-slate-700'
            }`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-orange-600" />
              Recent Purchases
            </h3>
            {supplier.purchases && supplier.purchases.length > 0 && (
              <button onClick={exportPurchasesCSV} className="text-xs font-bold text-orange-600 hover:underline inline-flex items-center gap-1">
                <Download className="h-3 w-3" /> Export
              </button>
            )}
          </div>
          {!supplier.purchases || supplier.purchases.length === 0 ? (
            <div className="p-10 text-center">
              <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">No purchases yet</p>
              <p className="text-xs text-slate-500 mt-1">Purchases tab se add karein</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
              {supplier.purchases.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-slate-900 font-mono">{p.purchaseNumber}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {formatDateTime(p.purchasedAt)}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="font-extrabold text-blue-700">{formatPKR(p.total)}</div>
                    <div className="text-xs text-slate-500 font-semibold">{p.paymentMethod}</div>
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
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <dt className="text-xs text-slate-500 font-bold uppercase tracking-wider">Bank</dt>
                <dd className="font-extrabold text-slate-900 mt-0.5">{supplier.bankName}</dd>
              </div>
            )}
            {supplier.accountNumber && (
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <dt className="text-xs text-slate-500 font-bold uppercase tracking-wider">Account Number</dt>
                <dd className="font-mono font-extrabold text-slate-900 mt-0.5">{supplier.accountNumber}</dd>
              </div>
            )}
            {supplier.iban && (
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <dt className="text-xs text-slate-500 font-bold uppercase tracking-wider">IBAN</dt>
                <dd className="font-mono font-extrabold text-xs break-all text-slate-900 mt-0.5">{supplier.iban}</dd>
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
      </div>

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
            <FileText className="h-4 w-4" /> Notes
          </h3>
          <p className="text-sm text-amber-900/80 whitespace-pre-line">{supplier.notes}</p>
        </div>
      )}
    </div>
  );
}
