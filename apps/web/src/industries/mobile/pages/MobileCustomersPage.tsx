import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Smartphone, CreditCard, ShieldCheck,
  Crown, Star, TrendingUp, Award, Filter,
} from 'lucide-react';
import { customersApi, type CustomersListParams } from '@modules/customers/customers/api/customers.api';
import { imeiApi } from '../api/imei.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import { CustomersHero, CustomerStatCard, CustomerCard } from '@modules/customers/customers/components/shared/CustomerShared';

export default function MobileCustomersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 24, sortBy: 'totalSpent', sortOrder: 'desc',
  });
  const [filter, setFilter] = useState<'all' | 'with-imei' | 'with-emi' | 'vip'>('all');

  const { data } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: customersApi.stats,
  });

  const { data: allImeis = [] } = useQuery({
    queryKey: ['imeis-for-customers'],
    queryFn: async () => {
      const all = await imeiApi.search('');
      return all.filter((i) => i.status === 'SOLD');
    },
  });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      toast.success('Customer deleted');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
    },
  });

  const customersWithMobileStats = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((c: any) => {
      const customerImeis = (allImeis as any[]).filter((i) => i.soldToCustomerId === c.id);
      const activeWarranty = customerImeis.filter((i) => {
        if (!i.warrantyExpiry) return false;
        return new Date(i.warrantyExpiry) > new Date();
      }).length;
      return { ...c, imeiCount: customerImeis.length, activeWarranty };
    });
  }, [data, allImeis]);

  const filtered = useMemo(() => {
    if (filter === 'all') return customersWithMobileStats;
    if (filter === 'with-imei') return customersWithMobileStats.filter((c: any) => c.imeiCount > 0);
    if (filter === 'with-emi') return customersWithMobileStats.filter((c: any) => c.balance > 0);
    if (filter === 'vip') return customersWithMobileStats.filter((c: any) => c.isVip);
    return customersWithMobileStats;
  }, [customersWithMobileStats, filter]);

  const withImeiCount = customersWithMobileStats.filter((c: any) => c.imeiCount > 0).length;
  const withEmiCount = customersWithMobileStats.filter((c: any) => c.balance > 0).length;

  return (
    <div className="space-y-6">
      <CustomersHero
        gradient="from-slate-950 via-blue-900 to-indigo-800"
        emoji="📱"
        industryLabel="Mobile"
        industryBadgeColor="bg-blue-500/30 border border-blue-300/40"
        title="Mobile Shop Customers"
        subtitle="IMEI-tracked phones, EMI plans, warranty holders"
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
          icon={Users} color="from-blue-500 to-indigo-600" />
        <CustomerStatCard label="Phone Owners" value={withImeiCount}
          sub="Bought with IMEI" icon={Smartphone} color="from-cyan-500 to-blue-600" isHighlight />
        <CustomerStatCard label="EMI/Udhaar" value={withEmiCount}
          sub={formatPKR(stats?.totalDebt ?? 0)} icon={CreditCard} color="from-amber-500 to-orange-600" />
        <CustomerStatCard label="VIP Customers" value={stats?.vip ?? 0}
          sub="Premium tier" icon={Crown} color="from-amber-500 to-orange-700" />
      </section>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Search by name, phone, CNIC..."
            value={params.search ?? ''}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { v: 'all' as const, label: 'All', count: customersWithMobileStats.length },
          { v: 'with-imei' as const, label: '📱 Phone Owners', count: withImeiCount },
          { v: 'with-emi' as const, label: '💳 EMI/Udhaar', count: withEmiCount },
          { v: 'vip' as const, label: '👑 VIP', count: stats?.vip ?? 0 },
        ].map((opt) => (
          <button key={opt.v} onClick={() => setFilter(opt.v)}
            className={`px-3 py-2 rounded-xl text-sm font-extrabold transition ${
              filter === opt.v ? 'bg-blue-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'
            }`}>
            {opt.label} ({opt.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <Smartphone className="h-16 w-16 text-blue-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-900">No customers</h3>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c: any) => (
            <CustomerCard
              key={c.id}
              customer={c}
              themeColor="blue"
              onDelete={(id) => removeMutation.mutate(id)}
              extraBadges={
                <>
                  {c.imeiCount > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">
                      <Smartphone className="h-3 w-3" />
                      {c.imeiCount} phones
                    </div>
                  )}
                  {c.activeWarranty > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[11px] font-bold">
                      <ShieldCheck className="h-3 w-3" />
                      {c.activeWarranty} active warranty
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
