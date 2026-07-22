import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Stethoscope, Heart, Crown, Star,
  Calendar, Award, Baby, Activity,
} from 'lucide-react';
import { customersApi, type CustomersListParams } from '@modules/customers/customers/api/customers.api';
import { appointmentsApi } from '../api/appointments.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import { CustomersHero, CustomerStatCard, CustomerCard } from '@modules/customers/customers/components/shared/CustomerShared';

export default function ClinicCustomersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 24, sortBy: 'totalSpent', sortOrder: 'desc',
  });
  const [filter, setFilter] = useState<'all' | 'regular' | 'vip' | 'new'>('all');

  const { data } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: customersApi.stats,
  });

  const { data: allApts = [] } = useQuery({
    queryKey: ['clinic-apts-for-customers'],
    queryFn: () => appointmentsApi.list({}),
  });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      toast.success('Patient deleted');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const customersWithStats = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((c: any) => {
      const apts = allApts.filter((a: any) => a.patientId === c.id || a.customerId === c.id);
      const totalConsults = apts.length;
      const lastVisit = apts.length > 0
        ? apts.sort((a: any, b: any) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime())[0]
        : null;
      return { ...c, totalConsults, lastVisit };
    });
  }, [data, allApts]);

  const filtered = useMemo(() => {
    if (filter === 'all') return customersWithStats;
    if (filter === 'regular') return customersWithStats.filter((c: any) => c.totalConsults >= 3);
    if (filter === 'vip') return customersWithStats.filter((c: any) => c.isVip);
    if (filter === 'new') return customersWithStats.filter((c: any) => c.totalConsults <= 1);
    return customersWithStats;
  }, [customersWithStats, filter]);

  const regularPatients = customersWithStats.filter((c: any) => c.totalConsults >= 3).length;
  const newPatients = customersWithStats.filter((c: any) => c.totalConsults <= 1).length;

  return (
    <div className="space-y-6">
      <CustomersHero
        gradient="from-slate-950 via-cyan-900 to-blue-700"
        emoji="🩺"
        industryLabel="Clinic"
        industryBadgeColor="bg-cyan-500/30 border border-cyan-300/40"
        title="Clinic Patients"
        subtitle="Patient records, visit history, medical files"
        actionButton={
          <Link to="/customers/new">
            <Button className="bg-white text-slate-900 hover:bg-slate-100">
              <Plus className="h-4 w-4" /> Add Patient
            </Button>
          </Link>
        }
      />

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomerStatCard label="Total Patients" value={stats?.total ?? 0} sub={stats && stats.newThisMonth > 0 ? '+' + stats.newThisMonth + ' this month' : 'All time'} icon={Users} color="from-cyan-500 to-blue-600" />
        <CustomerStatCard label="Regular Patients" value={regularPatients} sub="3+ visits" icon={Heart} color="from-fuchsia-500 to-pink-600" isHighlight />
        <CustomerStatCard label="New Patients" value={newPatients} sub="First visit" icon={Baby} color="from-emerald-500 to-green-600" />
        <CustomerStatCard label="VIP" value={stats?.vip ?? 0} sub="Premium care" icon={Crown} color="from-amber-500 to-orange-700" />
      </section>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:border-cyan-500" placeholder="Search patient name, phone, MRN..." value={params.search ?? ''} onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })} />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { v: 'all' as const, label: 'All Patients', count: customersWithStats.length },
          { v: 'regular' as const, label: '❤️ Regulars', count: regularPatients },
          { v: 'new' as const, label: '👶 New', count: newPatients },
          { v: 'vip' as const, label: '👑 VIP', count: stats?.vip ?? 0 },
        ].map((opt) => (
          <button key={opt.v} onClick={() => setFilter(opt.v)} className={'px-3 py-2 rounded-xl text-sm font-extrabold transition ' + (filter === opt.v ? 'bg-cyan-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700')}>
            {opt.label} ({opt.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <Stethoscope className="h-16 w-16 text-cyan-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-900">No patients found</h3>
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
                  {c.totalConsults > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 text-[11px] font-bold">
                      <Activity className="h-3 w-3" />
                      {c.totalConsults} visit{c.totalConsults > 1 ? 's' : ''}
                    </div>
                  )}
                  {c.lastVisit && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">
                      <Calendar className="h-3 w-3" />
                      Last: {new Date(c.lastVisit.scheduledStart).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
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
