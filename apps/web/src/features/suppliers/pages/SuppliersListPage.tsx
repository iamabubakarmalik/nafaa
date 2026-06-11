import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck, Plus, Search, MapPin, Phone, ArrowRight, X, Filter, Mail,
  MessageCircle, Eye, Edit3, Trash2, Sparkles, Download, Wallet, TrendingUp,
  CheckCircle2, AlertTriangle, Building2,
} from 'lucide-react';
import { suppliersApi } from '@/api/suppliers.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

type Filter = 'all' | 'active' | 'with-debt';

export default function SuppliersListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const { data } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => suppliersApi.list({ search, page: 1, limit: 100 }),
  });

  const removeMutation = useMutation({
    mutationFn: suppliersApi.remove,
    onSuccess: () => {
      toast.success('Supplier deleted');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cannot delete'),
  });

  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    if (filter === 'active') return items.filter((s: any) => s.isActive);
    if (filter === 'with-debt') return items.filter((s: any) => s.outstandingDue > 0);
    return items;
  }, [items, filter]);

  const stats = useMemo(() => {
    const totalPurchased = items.reduce((s: number, sup: any) => s + (sup.totalPurchased || 0), 0);
    const outstandingDue = items.reduce((s: number, sup: any) => s + (sup.outstandingDue || 0), 0);
    const active = items.filter((s: any) => s.isActive).length;
    const withDebt = items.filter((s: any) => s.outstandingDue > 0).length;
    return { total: items.length, active, withDebt, totalPurchased, outstandingDue };
  }, [items]);

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('No data');
    const headers = ['Name', 'Contact Person', 'Phone', 'Email', 'City', 'Payment Terms', 'Total Purchased', 'Outstanding'];
    const rows = filtered.map((s: any) => [
      s.name, s.contactPerson || '', s.phone || '', s.email || '',
      s.city || '', s.paymentTerms || '',
      (s.totalPurchased || 0).toFixed(2),
      (s.outstandingDue || 0).toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suppliers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('Exported');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Truck className="h-3.5 w-3.5 text-amber-300" /> Supply Chain
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Suppliers</h2>
            <p className="mt-2 text-sm text-white/80">
              Aap ke suppliers — bank info, payment terms, purchase history sab ek jagah
            </p>
          </div>
          <Link to="/suppliers/new">
            <Button className="bg-white text-slate-900 hover:bg-slate-100">
              <Plus className="h-4 w-4" /> New Supplier
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Suppliers" value={stats.total} icon={Truck} color="orange" />
        <StatCard label="Active" value={stats.active} icon={CheckCircle2} color="emerald" />
        <StatCard label="Total Purchased" value={formatPKR(stats.totalPurchased)} icon={TrendingUp} color="blue" isText />
        <StatCard label="Outstanding Due" value={formatPKR(stats.outstandingDue)} icon={AlertTriangle} color="rose" isText hint={`${stats.withDebt} suppliers`} />
      </section>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              placeholder="Search by name, contact person, NTN, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
          {filtered.length > 0 && (
            <button onClick={exportCSV} className="h-11 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-700 inline-flex items-center gap-1.5">
              <Download className="h-4 w-4" /> Export
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {[
            { v: 'all' as Filter, l: 'All', c: 'bg-slate-900' },
            { v: 'active' as Filter, l: 'Active', c: 'bg-emerald-600' },
            { v: 'with-debt' as Filter, l: 'With Debt', c: 'bg-rose-600' },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setFilter(opt.v)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === opt.v ? `${opt.c} text-white shadow-sm` : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
            <Truck className="h-9 w-9 text-orange-600" />
          </div>
          <h3 className="mt-5 text-xl font-bold text-slate-900">
            {search || filter !== 'all' ? 'No matches' : 'No suppliers yet'}
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            {search || filter !== 'all' ? 'Try different search or filter' : 'Pehla supplier add karein'}
          </p>
          {!search && filter === 'all' && (
            <Link to="/suppliers/new">
              <Button className="mt-5">
                <Plus className="h-4 w-4" /> Add Supplier
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((s: any) => (
            <div
              key={s.id}
              className="group rounded-2xl bg-white border-2 border-slate-200 hover:border-orange-300 hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden"
            >
              <Link to={`/suppliers/${s.id}`} className="block p-5">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    {s.logoUrl ? (
                      <img src={s.logoUrl} className="h-14 w-14 rounded-2xl object-cover border shadow" alt={s.name} />
                    ) : (
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center text-lg font-extrabold shadow">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-slate-900 truncate group-hover:text-orange-700 transition">
                      {s.name}
                    </h3>
                    {s.contactPerson && (
                      <div className="text-xs text-slate-500 mt-0.5 font-semibold truncate">{s.contactPerson}</div>
                    )}
                    {s.phone && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 font-semibold">
                        <Phone className="h-3 w-3" /> {s.phone}
                      </div>
                    )}
                    {s.city && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
                        <MapPin className="h-3 w-3" /> {s.city}{s.area && `, ${s.area}`}
                      </div>
                    )}
                  </div>
                </div>

                {s.paymentTerms && (
                  <div className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-bold text-orange-700">
                    <Wallet className="h-3 w-3" />
                    {s.paymentTerms}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-blue-50 border border-blue-200 px-2 py-1.5">
                    <div className="text-[9px] text-blue-700 font-bold uppercase">Purchased</div>
                    <div className="font-extrabold text-blue-700 truncate">{formatPKR(s.totalPurchased || 0)}</div>
                  </div>
                  <div className={`rounded-lg px-2 py-1.5 border ${(s.outstandingDue || 0) > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`text-[9px] font-bold uppercase ${(s.outstandingDue || 0) > 0 ? 'text-rose-700' : 'text-slate-500'}`}>Due</div>
                    <div className={`font-extrabold truncate ${(s.outstandingDue || 0) > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                      {formatPKR(s.outstandingDue || 0)}
                    </div>
                  </div>
                </div>
              </Link>

              <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition">
                <div className="flex items-center gap-1">
                  {s.phone && (
                    <a
                      href={`https://wa.me/${s.phone.replace(/[^0-9]/g, '').replace(/^0/, '92')}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 w-7 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {s.phone && (
                    <a
                      href={`tel:${s.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 w-7 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center"
                      title="Call"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {s.email && (
                    <a
                      href={`mailto:${s.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 w-7 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 flex items-center justify-center"
                      title="Email"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    to={`/suppliers/${s.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                    title="View"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    to={`/suppliers/${s.id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 w-7 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center"
                    title="Edit"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete ${s.name}?`)) removeMutation.mutate(s.id);
                    }}
                    className="h-7 w-7 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, hint, isText }: any) {
  const colors: any = {
    orange: 'from-orange-500 to-orange-700 shadow-orange-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/30',
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className={`mt-2 font-extrabold text-slate-900 ${isText ? 'text-xl truncate' : 'text-2xl'}`}>{value}</div>
          {hint && <div className="text-xs text-slate-500 font-semibold mt-1">{hint}</div>}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0 ml-2`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
