import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Gem, ShieldCheck, Scale,
  Crown, Star, Award, Sparkles, Diamond,
} from 'lucide-react';
import { customersApi, type CustomersListParams } from '@modules/customers/customers/api/customers.api';
import { jewelrySalesApi } from '../api/sales.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import { CustomersHero, CustomerStatCard, CustomerCard } from '@modules/customers/customers/components/shared/CustomerShared';

export default function JewelryCustomersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 24, sortBy: 'totalSpent', sortOrder: 'desc',
  });
  const [filter, setFilter] = useState<'all' | 'jewelry-buyers' | 'vip' | 'high-value'>('all');

  const { data } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: customersApi.stats,
  });

  const { data: jewelrySales = [] } = useQuery({
    queryKey: ['jewelry-sales-for-customers'],
    queryFn: () => jewelrySalesApi.list(),
  });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      toast.success('Customer deleted');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const customersWithJewelryStats = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((c: any) => {
      const customerSales = jewelrySales.filter((s: any) => s.customerId === c.id);
      const jewelryPurchases = customerSales.length;
      const totalWeight = customerSales.reduce((s: number, x: any) => s + Number(x.totalWeight || 0), 0);
      const totalValue = customerSales.reduce((s: number, x: any) => s + Number(x.total || 0), 0);
      const hallmarkCount = customerSales.filter((s: any) => s.hallmarkVerified).length;
      return { ...c, jewelryPurchases, totalWeight, totalValue, hallmarkCount };
    });
  }, [data, jewelrySales]);

  const filtered = useMemo(() => {
    if (filter === 'all') return customersWithJewelryStats;
    if (filter === 'jewelry-buyers') return customersWithJewelryStats.filter((c: any) => c.jewelryPurchases > 0);
    if (filter === 'vip') return customersWithJewelryStats.filter((c: any) => c.isVip);
    if (filter === 'high-value') return customersWithJewelryStats.filter((c: any) => c.totalValue > 100000);
    return customersWithJewelryStats;
  }, [customersWithJewelryStats, filter]);

  const jewelryBuyers = customersWithJewelryStats.filter((c: any) => c.jewelryPurchases > 0).length;
  const highValue = customersWithJewelryStats.filter((c: any) => c.totalValue > 100000).length;
  const totalWeightSold = customersWithJewelryStats.reduce((s: number, c: any) => s + c.totalWeight, 0);

  return (
    <div className="space-y-6">
      <CustomersHero
        gradient="from-slate-950 via-amber-900 to-yellow-700"
        emoji="💎"
        industryLabel="Jewelry"
        industryBadgeColor="bg-amber-500/30 border border-amber-300/40"
        title="Jewelry Customers"
        subtitle="Gold buyers, VIP families, custom order clients"
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
          icon={Users} color="from-amber-500 to-yellow-600" />
        <CustomerStatCard label="Jewelry Buyers" value={jewelryBuyers}
          sub="Purchased jewelry" icon={Gem} color="from-amber-500 to-orange-600" isHighlight />
        <CustomerStatCard label="Weight Sold" value={`${totalWeightSold.toFixed(0)}g`}
          sub="Cumulative to all" icon={Scale} color="from-violet-500 to-purple-600" />
        <CustomerStatCard label="High Value (100K+)" value={highValue}
          sub="Premium buyers" icon={Crown} color="from-amber-500 to-orange-700" />
      </section>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:border-amber-500"
            placeholder="Search customer, phone, CNIC..."
            value={params.search ?? ''}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { v: 'all' as const, label: 'All', count: customersWithJewelryStats.length },
          { v: 'jewelry-buyers' as const, label: '💎 Jewelry Buyers', count: jewelryBuyers },
          { v: 'high-value' as const, label: '⭐ High Value (100K+)', count: highValue },
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
          <Diamond className="h-16 w-16 text-amber-400 mx-auto mb-3" />
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
                  {c.jewelryPurchases > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
                      <Gem className="h-3 w-3" />
                      {c.jewelryPurchases} pieces
                    </div>
                  )}
                  {c.totalWeight > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold">
                      <Scale className="h-3 w-3" />
                      {c.totalWeight.toFixed(1)}g
                    </div>
                  )}
                  {c.hallmarkCount > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                      <ShieldCheck className="h-3 w-3" />
                      {c.hallmarkCount} verified
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
