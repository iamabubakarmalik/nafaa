import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Car, Wrench, Wallet,
  Crown, Award,
} from 'lucide-react';
import { customersApi, type CustomersListParams } from '@/api/customers.api';
import { customerVehiclesApi } from '../api/customer-vehicles.api';
import { workshopJobsApi } from '../api/workshop-jobs.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import { CustomersHero, CustomerStatCard, CustomerCard } from '@/features/customers/components/shared/CustomerShared';

export default function AutoPartsCustomersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 24, sortBy: 'totalSpent', sortOrder: 'desc',
  });
  const [filter, setFilter] = useState<'all' | 'with-vehicle' | 'with-job' | 'vip'>('all');

  const { data } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: customersApi.stats,
  });

  const { data: allVehicles = [] } = useQuery({
    queryKey: ['vehicles-for-customers'],
    queryFn: () => customerVehiclesApi.list({}),
  });

  const { data: allJobs = [] } = useQuery({
    queryKey: ['jobs-for-customers'],
    queryFn: () => workshopJobsApi.list({}),
  });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      toast.success('Customer deleted');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
    },
  });

  const customersWithAutoStats = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((c: any) => {
      const customerVehicles = (allVehicles as any[]).filter((v) => v.customerId === c.id);
      const customerJobs = (allJobs as any[]).filter((j) => j.customerId === c.id);
      const activeJobs = customerJobs.filter((j: any) => !['DELIVERED', 'CANCELLED'].includes(j.status)).length;
      return { ...c, vehicleCount: customerVehicles.length, jobCount: customerJobs.length, activeJobs };
    });
  }, [data, allVehicles, allJobs]);

  const filtered = useMemo(() => {
    if (filter === 'all') return customersWithAutoStats;
    if (filter === 'with-vehicle') return customersWithAutoStats.filter((c: any) => c.vehicleCount > 0);
    if (filter === 'with-job') return customersWithAutoStats.filter((c: any) => c.jobCount > 0);
    if (filter === 'vip') return customersWithAutoStats.filter((c: any) => c.isVip);
    return customersWithAutoStats;
  }, [customersWithAutoStats, filter]);

  const withVehicleCount = customersWithAutoStats.filter((c: any) => c.vehicleCount > 0).length;
  const withJobCount = customersWithAutoStats.filter((c: any) => c.jobCount > 0).length;

  return (
    <div className="space-y-6">
      <CustomersHero
        gradient="from-slate-950 via-slate-800 to-slate-700"
        emoji="🔧"
        industryLabel="Auto Parts"
        industryBadgeColor="bg-slate-500/30 border border-slate-300/40"
        title="Workshop Customers"
        subtitle="Vehicle owners, job history, service reminders"
        actionButton={
          <Link to="/customers/new">
            <Button className="bg-white text-slate-900 hover:bg-slate-100">
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          </Link>
        }
      />

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomerStatCard label="Total Customers" value={stats?.total ?? 0}
          sub={stats && stats.newThisMonth > 0 ? `+${stats.newThisMonth} this month` : 'All time'}
          icon={Users} color="from-slate-500 to-slate-700" />
        <CustomerStatCard label="Vehicle Owners" value={withVehicleCount}
          sub="Registered vehicles" icon={Car} color="from-fuchsia-500 to-pink-600" isHighlight />
        <CustomerStatCard label="Job Customers" value={withJobCount}
          sub="Repair/service history" icon={Wrench} color="from-orange-500 to-red-600" />
        <CustomerStatCard label="VIP" value={stats?.vip ?? 0}
          sub="Premium tier" icon={Crown} color="from-amber-500 to-orange-700" />
      </section>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:border-slate-700"
            placeholder="Search customer, phone, vehicle reg #..."
            value={params.search ?? ''}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { v: 'all' as const, label: 'All', count: customersWithAutoStats.length },
          { v: 'with-vehicle' as const, label: '🚗 With Vehicle', count: withVehicleCount },
          { v: 'with-job' as const, label: '🔧 Has Jobs', count: withJobCount },
          { v: 'vip' as const, label: '👑 VIP', count: stats?.vip ?? 0 },
        ].map((opt) => (
          <button key={opt.v} onClick={() => setFilter(opt.v)}
            className={`px-3 py-2 rounded-xl text-sm font-extrabold transition ${
              filter === opt.v ? 'bg-slate-800 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'
            }`}>
            {opt.label} ({opt.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <Wrench className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-900">No customers</h3>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c: any) => (
            <CustomerCard
              key={c.id}
              customer={c}
              themeColor="blue"
              onDelete={(id) => removeMutation.mutate(id)}
              extraBadges={
                <>
                  {c.vehicleCount > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700 text-[11px] font-bold">
                      <Car className="h-3 w-3" />
                      {c.vehicleCount} vehicles
                    </div>
                  )}
                  {c.activeJobs > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-bold">
                      <Wrench className="h-3 w-3" />
                      {c.activeJobs} active
                    </div>
                  )}
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
