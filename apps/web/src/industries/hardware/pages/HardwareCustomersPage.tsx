import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Package, Building, CreditCard,
  Crown, TrendingUp, Award, Truck,
} from 'lucide-react';
import { customersApi, type CustomersListParams } from '@modules/customers/customers/api/customers.api';
import { projectsApi } from '../api/projects.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import { CustomersHero, CustomerStatCard, CustomerCard } from '@modules/customers/customers/components/shared/CustomerShared';

export default function HardwareCustomersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 24, sortBy: 'totalSpent', sortOrder: 'desc',
  });
  const [filter, setFilter] = useState<'all' | 'with-project' | 'khata' | 'vip'>('all');

  const { data } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: customersApi.stats,
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects-for-customers'],
    queryFn: () => projectsApi.list({}),
  });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      toast.success('Customer deleted');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
    },
  });

  const customersWithProjectStats = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((c: any) => {
      const customerProjects = allProjects.filter((p: any) => p.customerId === c.id);
      return { ...c, projectCount: customerProjects.length };
    });
  }, [data, allProjects]);

  const filtered = useMemo(() => {
    if (filter === 'all') return customersWithProjectStats;
    if (filter === 'with-project') return customersWithProjectStats.filter((c: any) => c.projectCount > 0);
    if (filter === 'khata') return customersWithProjectStats.filter((c: any) => c.balance > 0);
    if (filter === 'vip') return customersWithProjectStats.filter((c: any) => c.isVip);
    return customersWithProjectStats;
  }, [customersWithProjectStats, filter]);

  const withProjectCount = customersWithProjectStats.filter((c: any) => c.projectCount > 0).length;
  const khataCount = customersWithProjectStats.filter((c: any) => c.balance > 0).length;

  return (
    <div className="space-y-6">
      <CustomersHero
        gradient="from-slate-950 via-amber-900 to-orange-700"
        emoji="🔨"
        industryLabel="Hardware"
        industryBadgeColor="bg-amber-500/30 border border-amber-300/40"
        title="Contractors & Customers"
        subtitle="Builder khata, project sites, bulk buyers"
        actionButton={
          <Link to="/customers/new">
            <Button className="bg-white text-slate-900 hover:bg-slate-100">
              <Plus className="h-4 w-4" /> Add Contractor
            </Button>
          </Link>
        }
      />

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomerStatCard label="Total Customers" value={stats?.total ?? 0}
          sub={stats && stats.newThisMonth > 0 ? `+${stats.newThisMonth} this month` : 'All time'}
          icon={Users} color="from-amber-500 to-orange-600" isHighlight />
        <CustomerStatCard label="With Projects" value={withProjectCount}
          sub="Active construction sites" icon={Building} color="from-blue-500 to-indigo-600" />
        <CustomerStatCard label="Khata Holders" value={khataCount}
          sub={formatPKR(stats?.totalDebt ?? 0)} icon={CreditCard} color="from-rose-500 to-red-600" />
        <CustomerStatCard label="VIP Contractors" value={stats?.vip ?? 0}
          sub="Premium tier" icon={Crown} color="from-amber-500 to-orange-700" />
      </section>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:border-amber-500"
            placeholder="Search contractor, builder, phone..."
            value={params.search ?? ''}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { v: 'all' as const, label: 'All', count: customersWithProjectStats.length },
          { v: 'with-project' as const, label: '🏗️ With Projects', count: withProjectCount },
          { v: 'khata' as const, label: '💳 Khata', count: khataCount },
          { v: 'vip' as const, label: '👑 VIP', count: stats?.vip ?? 0 },
        ].map((opt) => (
          <button key={opt.v} onClick={() => setFilter(opt.v)}
            className={`px-3 py-2 rounded-xl text-sm font-extrabold transition ${
              filter === opt.v ? 'bg-amber-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'
            }`}>
            {opt.label} ({opt.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <Building className="h-16 w-16 text-amber-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-900">No customers</h3>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c: any) => (
            <CustomerCard
              key={c.id}
              customer={c}
              themeColor="orange"
              onDelete={(id) => removeMutation.mutate(id)}
              extraBadges={
                c.projectCount > 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">
                    <Building className="h-3 w-3" />
                    {c.projectCount} project{c.projectCount !== 1 ? 's' : ''}
                  </div>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
