import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, X, ChefHat, Utensils, Bike, ShoppingBag as Takeaway,
  Crown, Star, TrendingUp, Wallet, Award, Sparkles, Calendar,
  Phone, MessageCircle, ArrowRight, Filter,
} from 'lucide-react';
import { customersApi, type CustomersListParams } from '@/api/customers.api';
import { ordersApi } from '../api/orders.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import { CustomersHero, CustomerStatCard, CustomerCard } from '@/features/customers/components/shared/CustomerShared';

export default function RestaurantCustomersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 24, sortBy: 'totalSpent', sortOrder: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [modeFilter, setModeFilter] = useState<'all' | 'DINE_IN' | 'DELIVERY' | 'TAKEAWAY'>('all');

  const { data } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: customersApi.stats,
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ['restaurant-orders-all'],
    queryFn: () => ordersApi.list({}),
  });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      toast.success('Customer deleted');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
    },
  });

  // Enrich customers with order mode preferences
  const customersWithOrderStats = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((c: any) => {
      const customerOrders = allOrders.filter((o: any) => o.customerId === c.id);
      const dineInCount = customerOrders.filter((o: any) => o.mode === 'DINE_IN').length;
      const deliveryCount = customerOrders.filter((o: any) => o.mode === 'DELIVERY').length;
      const takeawayCount = customerOrders.filter((o: any) => o.mode === 'TAKEAWAY').length;
      const favoriteMode = dineInCount >= deliveryCount && dineInCount >= takeawayCount ? 'DINE_IN'
        : deliveryCount >= takeawayCount ? 'DELIVERY' : 'TAKEAWAY';
      const lastOrder = customerOrders[0];
      return { ...c, dineInCount, deliveryCount, takeawayCount, favoriteMode, lastOrder, orderCount: customerOrders.length };
    });
  }, [data, allOrders]);

  const filteredCustomers = useMemo(() => {
    if (modeFilter === 'all') return customersWithOrderStats;
    return customersWithOrderStats.filter((c) => c.favoriteMode === modeFilter);
  }, [customersWithOrderStats, modeFilter]);

  const totalDineIn = customersWithOrderStats.filter((c) => c.favoriteMode === 'DINE_IN').length;
  const totalDelivery = customersWithOrderStats.filter((c) => c.favoriteMode === 'DELIVERY').length;
  const totalTakeaway = customersWithOrderStats.filter((c) => c.favoriteMode === 'TAKEAWAY').length;

  return (
    <div className="space-y-6">
      <CustomersHero
        gradient="from-slate-950 via-orange-900 to-red-700"
        emoji="🍽️"
        industryLabel="Restaurant"
        industryBadgeColor="bg-orange-500/30 border border-orange-300/40"
        title="Restaurant Guests"
        subtitle="Regular customers, VIPs, delivery clients — sab yahan"
        actionButton={
          <Link to="/customers/new">
            <Button className="bg-white text-slate-900 hover:bg-slate-100">
              <Plus className="h-4 w-4" /> Add Guest
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomerStatCard
          label="Total Guests"
          value={stats?.total ?? 0}
          sub={stats && stats.newThisMonth > 0 ? `+${stats.newThisMonth} this month` : 'All time'}
          icon={Users}
          color="from-orange-500 to-red-600"
        />
        <CustomerStatCard
          label="VIP Diners"
          value={stats?.vip ?? 0}
          sub="Premium tier"
          icon={Crown}
          color="from-amber-500 to-orange-700"
        />
        <CustomerStatCard
          label="Delivery Regulars"
          value={totalDelivery}
          sub="Prefer home delivery"
          icon={Bike}
          color="from-violet-500 to-purple-600"
        />
        <CustomerStatCard
          label="Dine-in Regulars"
          value={totalDineIn}
          sub="Prefer sit-in"
          icon={Utensils}
          color="from-emerald-500 to-teal-600"
          isHighlight
        />
      </section>

      {/* Top Guests */}
      {stats && stats.topSpenders.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 border-2 border-orange-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-orange-600" />
            <h3 className="font-bold text-orange-900">🏆 Top Restaurant Spenders</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {stats.topSpenders.map((s: any, idx: number) => (
              <Link key={s.id} to={`/customers/${s.id}`}
                className="rounded-2xl bg-white border-2 border-orange-200 hover:border-orange-400 p-4 hover:shadow-md transition group">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {s.avatarUrl ? (
                      <img src={s.avatarUrl} className="h-11 w-11 rounded-full object-cover" alt={s.name} />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-white flex items-center justify-center font-extrabold shadow">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow ${
                      idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-500' : 'bg-slate-600'
                    }`}>#{idx + 1}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm truncate group-hover:text-orange-700">{s.name}</div>
                    <div className="text-xs text-orange-700 font-extrabold mt-0.5">{formatPKR(s.totalSpent)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:border-orange-500"
            placeholder="Search guest name, phone, table..."
            value={params.search ?? ''}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
        </div>
        <Button variant="secondary" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4" /> Filters
        </Button>
      </div>

      {/* Mode filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { v: 'all' as const, label: 'All Guests', icon: Sparkles, count: customersWithOrderStats.length },
          { v: 'DINE_IN' as const, label: 'Dine-in', icon: Utensils, count: totalDineIn },
          { v: 'DELIVERY' as const, label: 'Delivery', icon: Bike, count: totalDelivery },
          { v: 'TAKEAWAY' as const, label: 'Takeaway', icon: Takeaway, count: totalTakeaway },
        ].map((opt) => (
          <button key={opt.v} onClick={() => setModeFilter(opt.v)}
            className={`px-3 py-2 rounded-xl text-sm font-extrabold transition inline-flex items-center gap-1.5 ${
              modeFilter === opt.v ? 'bg-orange-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'
            }`}>
            <opt.icon className="h-3.5 w-3.5" />
            {opt.label} ({opt.count})
          </button>
        ))}
      </div>

      {/* Customer Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <ChefHat className="h-16 w-16 text-orange-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-900">No guests found</h3>
          <p className="text-sm text-slate-500 mt-2">Add your first guest</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCustomers.map((c: any) => {
            const ModeIcon = c.favoriteMode === 'DINE_IN' ? Utensils : c.favoriteMode === 'DELIVERY' ? Bike : Takeaway;
            const modeColor = c.favoriteMode === 'DINE_IN' ? 'text-emerald-700 bg-emerald-100'
              : c.favoriteMode === 'DELIVERY' ? 'text-violet-700 bg-violet-100'
              : 'text-blue-700 bg-blue-100';
            return (
              <CustomerCard
                key={c.id}
                customer={c}
                themeColor="orange"
                onDelete={(id) => removeMutation.mutate(id)}
                extraBadges={
                  c.orderCount > 0 && (
                    <>
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${modeColor}`}>
                        <ModeIcon className="h-3 w-3" />
                        {c.orderCount} orders
                      </div>
                      {c.lastOrder && (
                        <div className="text-[10px] text-slate-500 font-semibold">
                          Last: {new Date(c.lastOrder.createdAt).toLocaleDateString('en-PK')}
                        </div>
                      )}
                    </>
                  )
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
