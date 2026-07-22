import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Wrench, Heart, Crown, Star, Shield, Briefcase,
} from 'lucide-react';
import { customersApi, type CustomersListParams } from '@/api/customers.api';
import { jobsApi } from '../api/jobs.api';
import { amcApi } from '../api/amc.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import { CustomersHero, CustomerStatCard, CustomerCard } from '@/features/customers/components/shared/CustomerShared';

export default function ServicesBizCustomersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 24, sortBy: 'totalSpent', sortOrder: 'desc',
  });
  const [filter, setFilter] = useState<'all' | 'service-clients' | 'amc' | 'vip'>('all');

  const { data } = useQuery({ queryKey: ['customers', params], queryFn: () => customersApi.list(params) });
  const { data: stats } = useQuery({ queryKey: ['customers-stats'], queryFn: customersApi.stats });
  const { data: allJobs = [] } = useQuery({
    queryKey: ['jobs-for-customers'], queryFn: () => jobsApi.list({}),
  });
  const { data: allAmc = [] } = useQuery({
    queryKey: ['amc-for-customers'], queryFn: () => amcApi.list({}),
  });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      toast.success('Customer deleted');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const withStats = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((c: any) => {
      const jobs = allJobs.filter((j: any) => j.customerId === c.id);
      const amcs = allAmc.filter((a: any) => a.customerId === c.id && a.status === 'ACTIVE');
      const jobsSpend = jobs.reduce((s: number, j: any) => s + Number(j.totalCharge || 0), 0);
      return { ...c, jobCount: jobs.length, amcCount: amcs.length, jobsSpend };
    });
  }, [data, allJobs, allAmc]);

  const filtered = useMemo(() => {
    if (filter === 'all') return withStats;
    if (filter === 'service-clients') return withStats.filter((c: any) => c.jobCount > 0);
    if (filter === 'amc') return withStats.filter((c: any) => c.amcCount > 0);
    if (filter === 'vip') return withStats.filter((c: any) => c.isVip);
    return withStats;
  }, [withStats, filter]);

  const serviceClients = withStats.filter((c: any) => c.jobCount > 0).length;
  const amcCustomers = withStats.filter((c: any) => c.amcCount > 0).length;

  return (
    <div className="space-y-6">
      <CustomersHero
        gradient="from-slate-950 via-cyan-900 to-blue-700"
        emoji="🛠️"
        industryLabel="Services"
        industryBadgeColor="bg-cyan-500/30 border border-cyan-300/40"
        title="Service Customers"
        subtitle="Service clients, AMC holders, regular customers"
        actionButton={
          <Link to="/customers/new"><Button className="bg-white text-slate-900 hover:bg-slate-100"><Plus className="h-4 w-4" /> Add Customer</Button></Link>
        }
      />

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomerStatCard label="Total" value={stats?.total ?? 0} sub={stats && stats.newThisMonth > 0 ? `+${stats.newThisMonth} this month` : 'All time'} icon={Users} color="from-cyan-500 to-blue-600" />
        <CustomerStatCard label="Service Clients" value={serviceClients} sub="With jobs" icon={Wrench} color="from-blue-500 to-cyan-700" isHighlight />
        <CustomerStatCard label="AMC Holders" value={amcCustomers} sub="Active contracts" icon={Shield} color="from-emerald-500 to-green-600" />
        <CustomerStatCard label="VIP" value={stats?.vip ?? 0} sub="Premium tier" icon={Crown} color="from-amber-500 to-orange-700" />
      </section>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:border-cyan-500" placeholder="Search customer..." value={params.search ?? ''} onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })} />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { v: 'all' as const, label: 'All', count: withStats.length },
          { v: 'service-clients' as const, label: '🛠️ Service Clients', count: serviceClients },
          { v: 'amc' as const, label: '🛡️ AMC', count: amcCustomers },
          { v: 'vip' as const, label: '👑 VIP', count: stats?.vip ?? 0 },
        ].map((opt) => (
          <button key={opt.v} onClick={() => setFilter(opt.v)} className={`px-3 py-2 rounded-xl text-sm font-extrabold transition ${filter === opt.v ? 'bg-cyan-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'}`}>
            {opt.label} ({opt.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <Wrench className="h-16 w-16 text-cyan-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-900">No customers found</h3>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c: any) => (
            <CustomerCard
              key={c.id}
              customer={c}
              themeColor="cyan"
              onDelete={(id) => removeMutation.mutate(id)}
              extraBadges={
                <>
                  {c.jobCount > 0 && <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 text-[11px] font-bold"><Briefcase className="h-3 w-3" />{c.jobCount} jobs</div>}
                  {c.amcCount > 0 && <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold"><Shield className="h-3 w-3" />{c.amcCount} AMC</div>}
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
