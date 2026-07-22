import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Cake, Heart, Crown, Star,
  TrendingUp, Award, Calendar,
} from 'lucide-react';
import { customersApi, type CustomersListParams } from '@modules/customers/customers/api/customers.api';
import { cakeOrdersApi } from '../api/cake-orders.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import { CustomersHero, CustomerStatCard, CustomerCard } from '@modules/customers/customers/components/shared/CustomerShared';

export default function BakeryCustomersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 24, sortBy: 'totalSpent', sortOrder: 'desc',
  });
  const [filter, setFilter] = useState<'all' | 'cake-customers' | 'regular' | 'vip'>('all');

  const { data } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: customersApi.stats,
  });

  const { data: allCakeOrders = [] } = useQuery({
    queryKey: ['cake-orders-for-customers'],
    queryFn: () => cakeOrdersApi.list({}),
  });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      toast.success('Customer deleted');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const customersWithBakeryStats = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((c: any) => {
      const cakeOrders = allCakeOrders.filter((o: any) => o.customerId === c.id);
      const totalCakeSpend = cakeOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
      return { ...c, cakeOrderCount: cakeOrders.length, totalCakeSpend };
    });
  }, [data, allCakeOrders]);

  const filtered = useMemo(() => {
    if (filter === 'all') return customersWithBakeryStats;
    if (filter === 'cake-customers') return customersWithBakeryStats.filter((c: any) => c.cakeOrderCount > 0);
    if (filter === 'regular') return customersWithBakeryStats.filter((c: any) => c.totalOrders >= 5);
    if (filter === 'vip') return customersWithBakeryStats.filter((c: any) => c.isVip);
    return customersWithBakeryStats;
  }, [customersWithBakeryStats, filter]);

  const cakeCustomers = customersWithBakeryStats.filter((c: any) => c.cakeOrderCount > 0).length;
  const regularCustomers = customersWithBakeryStats.filter((c: any) => c.totalOrders >= 5).length;

  return (
    <div className="space-y-6">
      <CustomersHero
        gradient="from-slate-950 via-pink-900 to-fuchsia-700"
        emoji="🍰"
        industryLabel="Bakery"
        industryBadgeColor="bg-pink-500/30 border border-pink-300/40"
        title="Bakery Customers"
        subtitle="Cake buyers, regulars, event orders"
        actionButton={
          <Link to="/customers/new">
            <Button className="bg-white text-slate-900 hover:bg-slate-100">
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          </Link>
        }
      />

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomerStatCard label="Total Customers" value={stats?.total ?? 0} sub={stats && stats.newThisMonth > 0 ? `+${stats.newThisMonth} this month` : 'All time'} icon={Users} color="from-pink-500 to-fuchsia-600" />
        <CustomerStatCard label="Cake Order Clients" value={cakeCustomers} sub="Custom cakes" icon={Cake} color="from-fuchsia-500 to-purple-600" isHighlight />
        <CustomerStatCard label="Regular Customers" value={regularCustomers} sub="5+ orders" icon={Heart} color="from-rose-500 to-pink-600" />
        <CustomerStatCard label="VIP" value={stats?.vip ?? 0} sub="Premium tier" icon={Crown} color="from-amber-500 to-orange-700" />
      </section>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:border-pink-500" placeholder="Search customer name, phone..." value={params.search ?? ''} onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })} />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { v: 'all' as const, label: 'All', count: customersWithBakeryStats.length },
          { v: 'cake-customers' as const, label: '🎂 Cake Orders', count: cakeCustomers },
          { v: 'regular' as const, label: '❤️ Regulars', count: regularCustomers },
          { v: 'vip' as const, label: '👑 VIP', count: stats?.vip ?? 0 },
        ].map((opt) => (
          <button key={opt.v} onClick={() => setFilter(opt.v)} className={`px-3 py-2 rounded-xl text-sm font-extrabold transition ${filter === opt.v ? 'bg-pink-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'}`}>
            {opt.label} ({opt.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <Cake className="h-16 w-16 text-pink-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-900">No customers found</h3>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c: any) => (
            <CustomerCard
              key={c.id}
              customer={c}
              themeColor="pink"
              onDelete={(id) => removeMutation.mutate(id)}
              extraBadges={
                <>
                  {c.cakeOrderCount > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[11px] font-bold">
                      <Cake className="h-3 w-3" />
                      {c.cakeOrderCount} cake{c.cakeOrderCount > 1 ? 's' : ''}
                    </div>
                  )}
                  {c.totalCakeSpend > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-700 text-[11px] font-bold">
                      💝 {formatPKR(c.totalCakeSpend)}
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
