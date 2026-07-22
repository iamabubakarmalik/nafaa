import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Tractor, Sprout, Wheat,
  Crown, TrendingUp, Award, MapPin,
} from 'lucide-react';
import { customersApi, type CustomersListParams } from '@modules/customers/customers/api/customers.api';
import { farmersApi } from '../api/farmers.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import { CustomersHero, CustomerStatCard, CustomerCard } from '@modules/customers/customers/components/shared/CustomerShared';

export default function AgriCustomersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 24, sortBy: 'totalSpent', sortOrder: 'desc',
  });
  const [filter, setFilter] = useState<'all' | 'farmers' | 'khata' | 'vip'>('all');

  const { data } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: customersApi.stats,
  });

  const { data: farmers = [] } = useQuery({
    queryKey: ['farmers-for-customers'],
    queryFn: () => farmersApi.list({}),
  });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      toast.success('Customer deleted');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
    },
  });

  // Enrich customers with farmer data
  const customersWithFarmerData = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((c: any) => {
      const farmer = farmers.find((f: any) => f.customerId === c.id);
      return { ...c, farmer, isFarmer: !!farmer };
    });
  }, [data, farmers]);

  const filtered = useMemo(() => {
    if (filter === 'all') return customersWithFarmerData;
    if (filter === 'farmers') return customersWithFarmerData.filter((c: any) => c.isFarmer);
    if (filter === 'khata') return customersWithFarmerData.filter((c: any) => c.balance > 0);
    if (filter === 'vip') return customersWithFarmerData.filter((c: any) => c.isVip);
    return customersWithFarmerData;
  }, [customersWithFarmerData, filter]);

  const farmerCount = customersWithFarmerData.filter((c: any) => c.isFarmer).length;
  const khataCount = customersWithFarmerData.filter((c: any) => c.balance > 0).length;

  return (
    <div className="space-y-6">
      <CustomersHero
        gradient="from-slate-950 via-lime-900 to-green-800"
        emoji="🌾"
        industryLabel="Agri"
        industryBadgeColor="bg-lime-500/30 border border-lime-300/40"
        title="Farmers & Customers"
        subtitle="Registered farmers, land owners, bulk buyers"
        actionButton={
          <div className="flex gap-2">
            <Link to="/agri/farmers">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Tractor className="h-4 w-4" /> Farmers Page
              </Button>
            </Link>
            <Link to="/customers/new">
              <Button className="bg-white/90 text-slate-900 hover:bg-white">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </Link>
          </div>
        }
      />

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomerStatCard label="Total Customers" value={stats?.total ?? 0}
          sub={stats && stats.newThisMonth > 0 ? `+${stats.newThisMonth} this month` : 'All time'}
          icon={Users} color="from-lime-500 to-green-600" />
        <CustomerStatCard label="Registered Farmers" value={farmerCount}
          sub="With farmer number" icon={Tractor} color="from-emerald-500 to-teal-600" isHighlight />
        <CustomerStatCard label="Khata Holders" value={khataCount}
          sub={formatPKR(stats?.totalDebt ?? 0)} icon={Wheat} color="from-amber-500 to-orange-600" />
        <CustomerStatCard label="VIP" value={stats?.vip ?? 0}
          sub="Premium tier" icon={Crown} color="from-amber-500 to-orange-700" />
      </section>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:border-lime-500"
            placeholder="Search farmer, phone, village..."
            value={params.search ?? ''}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { v: 'all' as const, label: 'All', count: customersWithFarmerData.length },
          { v: 'farmers' as const, label: '🚜 Registered Farmers', count: farmerCount },
          { v: 'khata' as const, label: '💳 Khata', count: khataCount },
          { v: 'vip' as const, label: '👑 VIP', count: stats?.vip ?? 0 },
        ].map((opt) => (
          <button key={opt.v} onClick={() => setFilter(opt.v)}
            className={`px-3 py-2 rounded-xl text-sm font-extrabold transition ${
              filter === opt.v ? 'bg-lime-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'
            }`}>
            {opt.label} ({opt.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <Wheat className="h-16 w-16 text-lime-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-900">No customers</h3>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c: any) => (
            <CustomerCard
              key={c.id}
              customer={c}
              themeColor="emerald"
              onDelete={(id) => removeMutation.mutate(id)}
              extraBadges={
                c.isFarmer && c.farmer && (
                  <>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lime-100 text-lime-700 text-[11px] font-bold">
                      <Tractor className="h-3 w-3" />
                      {c.farmer.farmerNumber || 'Farmer'}
                    </div>
                    {c.farmer.village && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-bold">
                        <MapPin className="h-3 w-3" />
                        {c.farmer.village}
                      </div>
                    )}
                    {c.farmer.landAreaAcres && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
                        <Sprout className="h-3 w-3" />
                        {c.farmer.landAreaAcres} acres
                      </div>
                    )}
                  </>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
