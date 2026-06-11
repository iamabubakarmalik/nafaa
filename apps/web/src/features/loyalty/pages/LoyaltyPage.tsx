import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Award, Star, TrendingUp, Gift, Crown, Sparkles, Trophy,
  Medal, Target, Users, Zap, BookOpen,
} from 'lucide-react';
import { loyaltyApi } from '@/api/loyalty.api';
import { formatPKR } from '@/lib/format';

const TIERS = [
  { name: 'Diamond', min: 5000, color: 'from-cyan-400 to-blue-600', icon: '💎', textColor: 'text-cyan-700' },
  { name: 'Platinum', min: 2000, color: 'from-slate-400 to-slate-700', icon: '🏆', textColor: 'text-slate-700' },
  { name: 'Gold', min: 1000, color: 'from-amber-400 to-orange-600', icon: '🥇', textColor: 'text-amber-700' },
  { name: 'Silver', min: 500, color: 'from-slate-300 to-slate-500', icon: '🥈', textColor: 'text-slate-600' },
  { name: 'Bronze', min: 100, color: 'from-orange-400 to-red-600', icon: '🥉', textColor: 'text-orange-700' },
  { name: 'Starter', min: 0, color: 'from-emerald-400 to-emerald-600', icon: '⭐', textColor: 'text-emerald-700' },
];

const getTier = (points: number) => TIERS.find((t) => points >= t.min) || TIERS[TIERS.length - 1];

export default function LoyaltyPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['loyalty-leaderboard'],
    queryFn: loyaltyApi.leaderboard,
  });

  const tierStats = useMemo(() => {
    if (!data?.topCustomers) return TIERS.map((t) => ({ ...t, count: 0 }));
    return TIERS.map((tier) => ({
      ...tier,
      count: data.topCustomers.filter((c) => getTier(c.loyaltyPoints).name === tier.name).length,
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-yellow-900 to-amber-700 text-white p-6 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Award className="h-3.5 w-3.5 text-amber-300" />
            Customer Loyalty Program
          </div>
          <h2 className="mt-3 text-3xl font-extrabold">Loyalty & Rewards</h2>
          <p className="mt-2 text-sm text-white/80">
            Customers ko reward karein — har sale par points earn aur redeem karne ki suvidha.
          </p>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Earned</div>
              <div className="mt-2 text-2xl font-extrabold text-emerald-700">{data?.totalEarned?.toLocaleString() || 0}</div>
              <div className="text-xs text-emerald-600 font-semibold mt-1">Points awarded</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Redeemed</div>
              <div className="mt-2 text-2xl font-extrabold text-rose-700">{data?.totalRedeemed?.toLocaleString() || 0}</div>
              <div className="text-xs text-rose-600 font-semibold mt-1">Points used</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
              <Gift className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">Active Members</div>
              <div className="mt-2 text-2xl font-extrabold text-violet-700">{data?.topCustomers?.length || 0}</div>
              <div className="text-xs text-violet-600 font-semibold mt-1">With loyalty points</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-white/80 font-bold">Outstanding</div>
              <div className="mt-2 text-2xl font-extrabold">{((data?.totalEarned || 0) - (data?.totalRedeemed || 0)).toLocaleString()}</div>
              <div className="text-xs text-white/80 font-semibold mt-1">Points in circulation</div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-amber-600" />
          <h3 className="text-xl font-bold text-slate-900">Tier Distribution</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {tierStats.map((tier) => (
            <div key={tier.name} className={`rounded-2xl bg-gradient-to-br ${tier.color} text-white p-4 shadow-lg`}>
              <div className="text-3xl mb-1">{tier.icon}</div>
              <div className="text-xs uppercase tracking-wider font-bold opacity-90">{tier.name}</div>
              <div className="text-2xl font-extrabold mt-1">{tier.count}</div>
              <div className="text-[10px] opacity-75 mt-0.5">≥ {tier.min.toLocaleString()} pts</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="text-xl font-bold text-slate-900">Top Loyalty Customers</h3>
              <p className="text-sm text-slate-500">Sorted by points</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}</div>
        ) : !data?.topCustomers?.length ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
              <Award className="h-9 w-9 text-amber-600" />
            </div>
            <h4 className="mt-5 text-xl font-bold text-slate-900">No loyalty customers yet</h4>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
              Settings me loyalty enable karein. POS sales par customers ko automatically points milenge.
            </p>
            <Link to="/settings" className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold">
              <Zap className="h-4 w-4" /> Configure Loyalty
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.topCustomers.map((customer, idx) => {
              const position = idx + 1;
              const tier = getTier(customer.loyaltyPoints);
              const nextTier = TIERS.filter((t) => t.min > customer.loyaltyPoints).pop();
              const progress = nextTier ? (customer.loyaltyPoints / nextTier.min) * 100 : 100;
              return (
                <div key={customer.id} className="px-6 py-4 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-extrabold text-lg shrink-0 ${
                        position === 1 ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-white shadow-lg' :
                        position === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow' :
                        position === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {position <= 3 ? <Medal className="h-6 w-6" /> : `#${position}`}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-slate-900 truncate">{customer.name}</div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${tier.color} text-white text-[10px] font-bold shadow`}>
                            <span>{tier.icon}</span>
                            {tier.name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{customer.phone || 'No phone'} • Spent: {formatPKR(customer.totalSpent)}</div>
                        {nextTier && (
                          <div className="mt-1.5 max-w-xs">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                              <span>Progress to {nextTier.name}</span>
                              <span className="font-bold">{(nextTier.min - customer.loyaltyPoints).toLocaleString()} pts to go</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className={`h-full bg-gradient-to-r ${nextTier.color} transition-all`} style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                        <span className="text-2xl font-extrabold text-amber-700">{customer.loyaltyPoints.toLocaleString()}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">loyalty points</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-amber-50 via-white to-yellow-50 border-2 border-amber-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="h-5 w-5 text-amber-600" />
          <h3 className="text-lg font-bold text-slate-900">How Loyalty Works</h3>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { num: 1, title: 'Customer buys', desc: 'Har sale par automatic points milte hain (settings me rate set karein, e.g. 1 point per Rs 100).', icon: Target, color: 'emerald' },
            { num: 2, title: 'Points accumulate', desc: 'Points customer ke account me jama hote hain — kabhi expire nahi hote, lifetime valid.', icon: TrendingUp, color: 'blue' },
            { num: 3, title: 'Redeem on next sale', desc: 'Next purchase par customer points use kar sakta hai — discount auto-apply.', icon: Gift, color: 'amber' },
          ].map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="rounded-2xl bg-white border border-amber-200 p-4 shadow-sm">
                <div className={`h-10 w-10 rounded-xl bg-${step.color}-100 text-${step.color}-700 flex items-center justify-center mb-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Step {step.num}</div>
                <div className="font-bold text-slate-900 mt-0.5">{step.title}</div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between bg-white rounded-xl border border-amber-200 p-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-slate-700">Configure rates aur enable program in</span>
          </div>
          <Link to="/settings" className="text-sm font-bold text-amber-700 hover:underline">Settings →</Link>
        </div>
      </section>
    </div>
  );
}
