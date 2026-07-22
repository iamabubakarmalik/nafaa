import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Layers, Scissors, Ruler,
  Crown, TrendingUp, Award,
} from 'lucide-react';
import { customersApi, type CustomersListParams } from '@/api/customers.api';
import { salesApi } from '@/api/sales.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import { CustomersHero, CustomerStatCard, CustomerCard } from '@/features/customers/components/shared/CustomerShared';

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);

export default function CarpetCustomersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 24, sortBy: 'totalSpent', sortOrder: 'desc',
  });

  const { data } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: customersApi.stats,
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ['sales-for-carpet-customers'],
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

  const customersWithCarpetStats = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((c: any) => {
      const customerSales = allSales.filter((s: any) => s.customer?.id === c.id);
      let totalSqft = 0;
      let rollCount = 0;
      let cutPieceCount = 0;

      for (const sale of customerSales) {
        for (const item of (sale.items || [])) {
          const isCarpet = CARPET_UNITS.has(item.product?.unit || '');
          if (!isCarpet) continue;
          totalSqft += Number(item.quantity || 0);
          const note = item.note || '';
          if (note.includes('Cut from')) rollCount += 1;
          if (note.includes('Cut piece')) cutPieceCount += 1;
        }
      }

      return { ...c, totalSqft, rollCount, cutPieceCount };
    });
  }, [data, allSales]);

  const withCarpetPurchase = customersWithCarpetStats.filter((c: any) => c.totalSqft > 0).length;
  const totalSqftSold = customersWithCarpetStats.reduce((s: number, c: any) => s + c.totalSqft, 0);

  return (
    <div className="space-y-6">
      <CustomersHero
        gradient="from-slate-950 via-emerald-900 to-teal-800"
        emoji="🧶"
        industryLabel="Carpet"
        industryBadgeColor="bg-emerald-500/30 border border-emerald-300/40"
        title="Carpet Shop Customers"
        subtitle="Roll buyers, cut piece clients, bulk orders"
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
          icon={Users} color="from-emerald-500 to-teal-600" />
        <CustomerStatCard label="Carpet Buyers" value={withCarpetPurchase}
          sub="Purchased carpet/rolls" icon={Layers} color="from-teal-500 to-cyan-600" isHighlight />
        <CustomerStatCard label="Total Sqft Sold" value={totalSqftSold.toFixed(0)}
          sub="Cumulative area" icon={Ruler} color="from-blue-500 to-cyan-600" />
        <CustomerStatCard label="VIP Buyers" value={stats?.vip ?? 0}
          sub="Premium tier" icon={Crown} color="from-amber-500 to-orange-700" />
      </section>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:border-emerald-500"
            placeholder="Search customer name, phone..."
            value={params.search ?? ''}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
        </div>
      </div>

      {customersWithCarpetStats.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <Layers className="h-16 w-16 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-900">No customers</h3>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {customersWithCarpetStats.map((c: any) => (
            <CustomerCard
              key={c.id}
              customer={c}
              themeColor="emerald"
              onDelete={(id) => removeMutation.mutate(id)}
              extraBadges={
                <>
                  {c.totalSqft > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                      <Ruler className="h-3 w-3" />
                      {c.totalSqft.toFixed(0)} sqft
                    </div>
                  )}
                  {c.rollCount > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[11px] font-bold">
                      <Layers className="h-3 w-3" />
                      {c.rollCount} rolls
                    </div>
                  )}
                  {c.cutPieceCount > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold">
                      <Scissors className="h-3 w-3" />
                      {c.cutPieceCount} pieces
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
