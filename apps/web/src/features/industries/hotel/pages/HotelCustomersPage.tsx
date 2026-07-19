import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Bed, Calendar, Crown, Star, TrendingUp,
  Award, Filter, Home, MapPin,
} from 'lucide-react';
import { customersApi, type CustomersListParams } from '@/api/customers.api';
import { bookingsApi } from '../api/bookings.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import { CustomersHero, CustomerStatCard, CustomerCard } from '@/features/customers/components/shared/CustomerShared';

export default function HotelCustomersPage() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 24, sortBy: 'totalSpent', sortOrder: 'desc',
  });
  const [filter, setFilter] = useState<'all' | 'repeat' | 'vip' | 'active'>('all');

  const { data } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: customersApi.stats,
  });

  const { data: allBookings = [] } = useQuery({
    queryKey: ['bookings-for-hotel-customers'],
    queryFn: () => bookingsApi.list(),
  });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      toast.success('Guest deleted');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
    },
  });

  const customersWithHotelStats = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((c: any) => {
      const guestBookings = allBookings.filter((b: any) =>
        b.guestPhone === c.phone || b.primaryGuestId === c.id || b.guestName === c.name
      );
      const totalNights = guestBookings.reduce((s: number, b: any) => s + Number(b.nights || 0), 0);
      const activeBookings = guestBookings.filter((b: any) => ['CHECKED_IN', 'CONFIRMED'].includes(b.status)).length;
      const lastBooking = guestBookings[0];

      return {
        ...c,
        bookingCount: guestBookings.length,
        totalNights,
        activeBookings,
        lastBooking,
        isRepeat: guestBookings.length > 1,
      };
    });
  }, [data, allBookings]);

  const filtered = useMemo(() => {
    if (filter === 'all') return customersWithHotelStats;
    if (filter === 'repeat') return customersWithHotelStats.filter((c: any) => c.isRepeat);
    if (filter === 'vip') return customersWithHotelStats.filter((c: any) => c.isVip);
    if (filter === 'active') return customersWithHotelStats.filter((c: any) => c.activeBookings > 0);
    return customersWithHotelStats;
  }, [customersWithHotelStats, filter]);

  const repeatCount = customersWithHotelStats.filter((c: any) => c.isRepeat).length;
  const activeCount = customersWithHotelStats.filter((c: any) => c.activeBookings > 0).length;

  return (
    <div className="space-y-6">
      <CustomersHero
        gradient="from-slate-950 via-indigo-900 to-purple-800"
        emoji="🏨"
        industryLabel="Hotel"
        industryBadgeColor="bg-indigo-500/30 border border-indigo-300/40"
        title="Hotel Guests"
        subtitle="Regular guests, VIPs, repeat visitors"
        actionButton={
          <Link to="/customers/new">
            <Button className="bg-white text-slate-900 hover:bg-slate-100">
              <Plus className="h-4 w-4" /> Add Guest
            </Button>
          </Link>
        }
      />

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomerStatCard label="Total Guests" value={stats?.total ?? 0}
          sub={stats && stats.newThisMonth > 0 ? `+${stats.newThisMonth} this month` : 'All time'}
          icon={Users} color="from-indigo-500 to-purple-600" />
        <CustomerStatCard label="Repeat Guests" value={repeatCount}
          sub="Multiple stays" icon={Star} color="from-amber-500 to-orange-600" isHighlight />
        <CustomerStatCard label="Currently Checked-in" value={activeCount}
          sub="Active bookings" icon={Bed} color="from-emerald-500 to-teal-600" />
        <CustomerStatCard label="VIP Guests" value={stats?.vip ?? 0}
          sub="Premium tier" icon={Crown} color="from-amber-500 to-orange-700" />
      </section>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:border-indigo-500"
            placeholder="Search guest name, phone, CNIC..."
            value={params.search ?? ''}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { v: 'all' as const, label: 'All', count: customersWithHotelStats.length },
          { v: 'active' as const, label: '🛏️ Checked-in', count: activeCount },
          { v: 'repeat' as const, label: '⭐ Repeat', count: repeatCount },
          { v: 'vip' as const, label: '👑 VIP', count: stats?.vip ?? 0 },
        ].map((opt) => (
          <button key={opt.v} onClick={() => setFilter(opt.v)}
            className={`px-3 py-2 rounded-xl text-sm font-extrabold transition ${
              filter === opt.v ? 'bg-indigo-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'
            }`}>
            {opt.label} ({opt.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <Bed className="h-16 w-16 text-indigo-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-900">No guests</h3>
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
                  {c.bookingCount > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold">
                      <Bed className="h-3 w-3" />
                      {c.bookingCount} booking{c.bookingCount !== 1 ? 's' : ''}
                    </div>
                  )}
                  {c.totalNights > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold">
                      <Calendar className="h-3 w-3" />
                      {c.totalNights} nights
                    </div>
                  )}
                  {c.activeBookings > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                      <Home className="h-3 w-3" />
                      Active
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
