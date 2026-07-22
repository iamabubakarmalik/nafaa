import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Pill, FileText, ShieldAlert,
  Crown, Star, TrendingUp, Award, Filter, Stethoscope,
} from 'lucide-react';
import { customersApi, type CustomersListParams } from '@modules/customers/customers/api/customers.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import { CustomersHero, CustomerStatCard, CustomerCard } from '@modules/customers/customers/components/shared/CustomerShared';

export default function PharmacyCustomersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 24, sortBy: 'totalSpent', sortOrder: 'desc',
  });
  const [filter, setFilter] = useState<'all' | 'with-cnic' | 'khata' | 'vip'>('all');

  const { data } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: customersApi.stats,
  });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      toast.success('Patient deleted');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
    },
  });

  const items = data?.items ?? [];
  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'with-cnic') return items.filter((c: any) => c.cnic);
    if (filter === 'khata') return items.filter((c: any) => c.balance > 0);
    if (filter === 'vip') return items.filter((c: any) => c.isVip);
    return items;
  }, [items, filter]);

  const withCnicCount = items.filter((c: any) => c.cnic).length;
  const khataCount = items.filter((c: any) => c.balance > 0).length;

  return (
    <div className="space-y-6">
      <CustomersHero
        gradient="from-slate-950 via-teal-900 to-cyan-700"
        emoji="💊"
        industryLabel="Pharmacy"
        industryBadgeColor="bg-teal-500/30 border border-teal-300/40"
        title="Pharmacy Patients"
        subtitle="Regular patients, chronic care, prescription holders"
        actionButton={
          <Link to="/customers/new">
            <Button className="bg-white text-slate-900 hover:bg-slate-100">
              <Plus className="h-4 w-4" /> Add Patient
            </Button>
          </Link>
        }
      />

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomerStatCard label="Total Patients" value={stats?.total ?? 0}
          sub={stats && stats.newThisMonth > 0 ? `+${stats.newThisMonth} this month` : 'All time'}
          icon={Users} color="from-teal-500 to-cyan-600" isHighlight />
        <CustomerStatCard label="With CNIC" value={withCnicCount}
          sub="Required for narcotics" icon={FileText} color="from-emerald-500 to-teal-600" />
        <CustomerStatCard label="Khata Holders" value={khataCount}
          sub={formatPKR(stats?.totalDebt ?? 0)} icon={TrendingUp} color="from-amber-500 to-orange-600" />
        <CustomerStatCard label="VIP" value={stats?.vip ?? 0}
          sub="Premium tier" icon={Crown} color="from-amber-500 to-orange-700" />
      </section>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:border-teal-500"
            placeholder="Search patient name, phone, CNIC..."
            value={params.search ?? ''}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { v: 'all' as const, label: 'All Patients', count: items.length },
          { v: 'with-cnic' as const, label: '🆔 With CNIC', count: withCnicCount },
          { v: 'khata' as const, label: '💳 Khata', count: khataCount },
          { v: 'vip' as const, label: '👑 VIP', count: stats?.vip ?? 0 },
        ].map((opt) => (
          <button key={opt.v} onClick={() => setFilter(opt.v)}
            className={`px-3 py-2 rounded-xl text-sm font-extrabold transition ${
              filter === opt.v ? 'bg-teal-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'
            }`}>
            {opt.label} ({opt.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <Pill className="h-16 w-16 text-teal-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-900">No patients</h3>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c: any) => (
            <CustomerCard
              key={c.id}
              customer={c}
              themeColor="emerald"
              onDelete={(id) => removeMutation.mutate(id)}
              extraBadges={c.cnic && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[11px] font-bold">
                  <FileText className="h-3 w-3" />
                  CNIC verified
                </div>
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
