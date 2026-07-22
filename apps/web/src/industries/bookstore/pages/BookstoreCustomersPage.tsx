import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, BookOpen, GraduationCap, School,
  Crown, Star, Filter, Award,
} from 'lucide-react';
import { customersApi, type CustomersListParams } from '@modules/customers/customers/api/customers.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import { CustomersHero, CustomerStatCard, CustomerCard } from '@modules/customers/customers/components/shared/CustomerShared';

export default function BookstoreCustomersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 24, sortBy: 'totalSpent', sortOrder: 'desc',
  });
  const [filter, setFilter] = useState<'all' | 'loyalty' | 'khata' | 'vip'>('all');

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
      toast.success('Customer deleted');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
    },
  });

  const items = data?.items ?? [];
  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'loyalty') return items.filter((c: any) => c.loyaltyPoints > 0);
    if (filter === 'khata') return items.filter((c: any) => c.balance > 0);
    if (filter === 'vip') return items.filter((c: any) => c.isVip);
    return items;
  }, [items, filter]);

  const loyaltyCount = items.filter((c: any) => c.loyaltyPoints > 0).length;
  const khataCount = items.filter((c: any) => c.balance > 0).length;
  const totalLoyaltyPoints = items.reduce((s: number, c: any) => s + (c.loyaltyPoints || 0), 0);

  return (
    <div className="space-y-6">
      <CustomersHero
        gradient="from-slate-950 via-amber-900 to-orange-700"
        emoji="📚"
        industryLabel="Bookstore"
        industryBadgeColor="bg-amber-500/30 border border-amber-300/40"
        title="Bookstore Customers"
        subtitle="Regular readers, students, school buyers, VIPs"
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
          icon={Users} color="from-amber-500 to-orange-600" isHighlight />
        <CustomerStatCard label="Regular Readers" value={loyaltyCount}
          sub={`${totalLoyaltyPoints.toLocaleString()} points`} icon={Star} color="from-amber-500 to-orange-700" />
        <CustomerStatCard label="Khata Holders" value={khataCount}
          sub={formatPKR(stats?.totalDebt ?? 0)} icon={BookOpen} color="from-rose-500 to-red-600" />
        <CustomerStatCard label="VIP Customers" value={stats?.vip ?? 0}
          sub="Premium tier" icon={Crown} color="from-violet-500 to-purple-600" />
      </section>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:border-amber-500"
            placeholder="Search customer, phone, school..."
            value={params.search ?? ''}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { v: 'all' as const, label: 'All', count: items.length },
          { v: 'loyalty' as const, label: '⭐ Loyalty', count: loyaltyCount },
          { v: 'khata' as const, label: '📖 Khata', count: khataCount },
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
          <BookOpen className="h-16 w-16 text-amber-400 mx-auto mb-3" />
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
