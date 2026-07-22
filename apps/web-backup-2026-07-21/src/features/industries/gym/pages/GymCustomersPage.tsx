import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Dumbbell, Heart, Crown, Flame, Award, Target,
} from 'lucide-react';
import { customersApi, type CustomersListParams } from '@/api/customers.api';
import { gymMembersApi } from '../api/members.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import { CustomersHero, CustomerStatCard, CustomerCard } from '@/features/customers/components/shared/CustomerShared';

export default function GymCustomersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 24, sortBy: 'totalSpent', sortOrder: 'desc',
  });
  const [filter, setFilter] = useState<'all' | 'members' | 'streak' | 'vip'>('all');

  const { data } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: customersApi.stats,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ['members-for-customers'],
    queryFn: () => gymMembersApi.list({}),
  });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      toast.success('Customer deleted');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const customersWithGymStats = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((c: any) => {
      const member = allMembers.find((m: any) => m.customerId === c.id);
      return {
        ...c,
        isGymMember: !!member,
        memberId: member?.id,
        currentStreak: member?.currentStreak || 0,
        totalVisits: member?.totalVisits || 0,
        memberNumber: member?.memberNumber,
        primaryGoal: member?.primaryGoal,
      };
    });
  }, [data, allMembers]);

  const filtered = useMemo(() => {
    if (filter === 'all') return customersWithGymStats;
    if (filter === 'members') return customersWithGymStats.filter((c: any) => c.isGymMember);
    if (filter === 'streak') return customersWithGymStats.filter((c: any) => c.currentStreak >= 7);
    if (filter === 'vip') return customersWithGymStats.filter((c: any) => c.isVip);
    return customersWithGymStats;
  }, [customersWithGymStats, filter]);

  const gymMembers = customersWithGymStats.filter((c: any) => c.isGymMember).length;
  const streakers = customersWithGymStats.filter((c: any) => c.currentStreak >= 7).length;

  return (
    <div className="space-y-6">
      <CustomersHero
        gradient="from-slate-950 via-red-900 to-orange-700"
        emoji="💪"
        industryLabel="Gym"
        industryBadgeColor="bg-red-500/30 border border-red-300/40"
        title="Gym Customers"
        subtitle="Members, walk-ins, potential leads"
        actionButton={
          <Link to="/gym-members/new">
            <Button className="bg-white text-slate-900 hover:bg-slate-100">
              <Plus className="h-4 w-4" /> Enroll Member
            </Button>
          </Link>
        }
      />

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomerStatCard label="Total Customers" value={stats?.total ?? 0} sub={stats && stats.newThisMonth > 0 ? '+' + stats.newThisMonth + ' this month' : 'All time'} icon={Users} color="from-red-500 to-orange-600" />
        <CustomerStatCard label="Gym Members" value={gymMembers} sub="Enrolled" icon={Dumbbell} color="from-orange-500 to-red-600" isHighlight />
        <CustomerStatCard label="On Streak (7d+)" value={streakers} sub="Consistent trainers" icon={Flame} color="from-amber-500 to-orange-700" />
        <CustomerStatCard label="VIP" value={stats?.vip ?? 0} sub="Premium tier" icon={Crown} color="from-fuchsia-500 to-purple-600" />
      </section>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:border-red-500" placeholder="Search customer name, phone..." value={params.search ?? ''} onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })} />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { v: 'all' as const, label: 'All', count: customersWithGymStats.length },
          { v: 'members' as const, label: '💪 Members', count: gymMembers },
          { v: 'streak' as const, label: '🔥 Streakers', count: streakers },
          { v: 'vip' as const, label: '👑 VIP', count: stats?.vip ?? 0 },
        ].map((opt) => (
          <button key={opt.v} onClick={() => setFilter(opt.v)} className={'px-3 py-2 rounded-xl text-sm font-extrabold transition ' + (filter === opt.v ? 'bg-red-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700')}>
            {opt.label} ({opt.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <Dumbbell className="h-16 w-16 text-red-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-900">No customers found</h3>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c: any) => (
            <CustomerCard
              key={c.id}
              customer={c}
              themeColor="red"
              onDelete={(id) => removeMutation.mutate(id)}
              extraBadges={
                <>
                  {c.isGymMember && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold">
                      <Dumbbell className="h-3 w-3" />
                      Member
                    </div>
                  )}
                  {c.currentStreak >= 7 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-bold">
                      🔥 {c.currentStreak}d streak
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
