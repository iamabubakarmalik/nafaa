import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Search, Beef, Weight, Building2, Crown, Star } from 'lucide-react';
import { customersApi, type CustomersListParams } from '@/api/customers.api';
import { salesApi } from '@/api/sales.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import { CustomersHero, CustomerStatCard, CustomerCard } from '@/features/customers/components/shared/CustomerShared';

const MEAT_UNITS = new Set(['kg', 'gram', 'pound', 'piece', 'dozen', 'whole', 'half', 'quarter']);

export default function MeatCustomersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 24, sortBy: 'totalSpent', sortOrder: 'desc',
  });
  const [filter, setFilter] = useState<'all' | 'retail' | 'wholesale' | 'vip'>('all');

  const { data } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: customersApi.stats,
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ['sales-for-meat-customers'],
    queryFn: () => salesApi.list(),
  });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      toast.success('Customer deleted');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
    },
  });

  const customersWithMeatStats = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((c: any) => {
      const customerSales = allSales.filter((s: any) => s.customer?.id === c.id);
      let totalKg = 0;
      let orderCount = customerSales.length;
      let isWholesale = c.totalSpent > 100000;

      customerSales.forEach((sale: any) => {
        sale.items.forEach((it: any) => {
          if (MEAT_UNITS.has(it.product?.unit || '')) {
            totalKg += Number(it.quantity || 0);
          }
        });
      });

      return { ...c, totalKg, orderCount, isWholesale };
    });
  }, [data, allSales]);

  const filtered = useMemo(() => {
    if (filter === 'all') return customersWithMeatStats;
    if (filter === 'retail') return customersWithMeatStats.filter((c: any) => !c.isWholesale);
    if (filter === 'wholesale') return customersWithMeatStats.filter((c: any) => c.isWholesale);
    if (filter === 'vip') return customersWithMeatStats.filter((c: any) => c.isVip);
    return customersWithMeatStats;
  }, [customersWithMeatStats, filter]);

  const wholesaleCount = customersWithMeatStats.filter((c: any) => c.isWholesale).length;
  const totalKgSold = customersWithMeatStats.reduce((s: number, c: any) => s + c.totalKg, 0);

  return (
    <div className="space-y-6">
      <CustomersHero
        gradient="from-slate-950 via-red-900 to-rose-800"
        emoji="🥩"
        industryLabel="Meat"
        industryBadgeColor="bg-red-500/30 border border-red-300/40"
        title="Meat Shop Customers"
        subtitle="Retail buyers, wholesale accounts, restaurant clients"
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
          icon={Users} color="from-red-500 to-rose-700" />
        <CustomerStatCard label="Total Kg Sold" value={`${totalKgSold.toFixed(0)}kg`}
          sub="Cumulative weight" icon={Weight} color="from-orange-500 to-red-600" isHighlight />
        <CustomerStatCard label="Wholesale Clients" value={wholesaleCount}
          sub="High-volume buyers" icon={Building2} color="from-amber-500 to-orange-700" />
        <CustomerStatCard label="VIP Customers" value={stats?.vip ?? 0}
          sub="Premium tier" icon={Crown} color="from-amber-500 to-orange-700" />
      </section>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:border-red-500"
            placeholder="Search customer..."
            value={params.search ?? ''}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { v: 'all' as const, label: 'All', count: customersWithMeatStats.length },
          { v: 'retail' as const, label: '🛒 Retail', count: customersWithMeatStats.length - wholesaleCount },
          { v: 'wholesale' as const, label: '🏢 Wholesale', count: wholesaleCount },
          { v: 'vip' as const, label: '👑 VIP', count: stats?.vip ?? 0 },
        ].map((opt) => (
          <button key={opt.v} onClick={() => setFilter(opt.v)}
            className={`px-3 py-2 rounded-xl text-sm font-extrabold transition ${
              filter === opt.v ? 'bg-red-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'
            }`}>
            {opt.label} ({opt.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <Beef className="h-16 w-16 text-red-400 mx-auto mb-3" />
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
                <>
                  {c.totalKg > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold">
                      <Weight className="h-3 w-3" />
                      {c.totalKg.toFixed(0)}kg
                    </div>
                  )}
                  {c.isWholesale && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-bold">
                      <Building2 className="h-3 w-3" />
                      Wholesale
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
