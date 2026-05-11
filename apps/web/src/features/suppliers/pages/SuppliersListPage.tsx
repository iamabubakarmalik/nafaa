import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Truck, Plus, Search, MapPin, Phone, ArrowRight } from 'lucide-react';
import { suppliersApi } from '@/api/suppliers.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';

export default function SuppliersListPage() {
  const [search, setSearch] = useState('');

  const { data } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => suppliersApi.list({ search, page: 1, limit: 50 }),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-orange-900 to-amber-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Truck className="h-3.5 w-3.5" /> Supply Chain
            </div>
            <h2 className="mt-3 text-3xl font-bold">Suppliers</h2>
            <p className="mt-2 text-sm text-white/80">Aap ke suppliers — bank info, payment terms, purchase history</p>
          </div>
          <Link to="/suppliers/new">
            <Button className="bg-white text-slate-900 hover:bg-slate-100">
              <Plus className="h-4 w-4" /> New Supplier
            </Button>
          </Link>
        </div>
      </section>

      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          placeholder="Search by name, contact person, NTN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-200 p-16 text-center">
          <Truck className="h-16 w-16 text-slate-300 mx-auto" />
          <h3 className="mt-4 text-lg font-bold text-slate-900">No suppliers yet</h3>
          <Link to="/suppliers/new">
            <Button className="mt-5">
              <Plus className="h-4 w-4" /> Add Supplier
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((s) => (
            <Link
              key={s.id}
              to={`/suppliers/${s.id}`}
              className="group rounded-2xl bg-white border border-slate-200 p-5 hover:border-orange-300 hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <div className="flex items-start gap-3">
                {s.logoUrl ? (
                  <img src={s.logoUrl} className="h-14 w-14 rounded-2xl object-cover border" alt={s.name} />
                ) : (
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 text-orange-700 flex items-center justify-center text-lg font-bold">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate group-hover:text-orange-700 transition">
                    {s.name}
                  </h3>
                  {s.contactPerson && (
                    <div className="text-xs text-slate-500 mt-0.5">{s.contactPerson}</div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <Phone className="h-3 w-3" /> {s.phone}
                    </div>
                  )}
                  {s.city && (
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" /> {s.city}
                    </div>
                  )}
                </div>
              </div>

              {s.paymentTerms && (
                <div className="mt-3 inline-flex items-center px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-bold text-orange-700">
                  {s.paymentTerms}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Total purchased</span>
                <span className="font-bold text-emerald-700">{formatPKR(s.totalPurchased)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
