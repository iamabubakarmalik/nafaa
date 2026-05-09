import { useQuery } from '@tanstack/react-query';
import { Gift, Crown, Users, TrendingUp, Award } from 'lucide-react';
import { adminReferralsApi } from '@/api/admin-referrals.api';
import { formatPKR } from '@/lib/format';

export default function ReferralsPage() {
  const { data: stats } = useQuery({
    queryKey: ['admin-referrals-stats'],
    queryFn: adminReferralsApi.stats,
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['admin-referrals-leaderboard'],
    queryFn: adminReferralsApi.leaderboard,
  });

  const { data: list = [] } = useQuery({
    queryKey: ['admin-referrals-list'],
    queryFn: () => adminReferralsApi.list({ limit: 30 }),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-pink-900 via-rose-800 to-pink-700 text-white p-6 shadow-soft">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
          <Gift className="h-3.5 w-3.5" />
          Referral Program
        </div>
        <h2 className="mt-3 text-3xl font-bold">Referrals Overview</h2>
        <p className="mt-2 text-sm text-white/80">
          Saare referrals — pending, converted, paid
        </p>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Total</div>
          <div className="mt-1 text-2xl font-bold">{stats?.total ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <div className="text-xs text-amber-700">Pending</div>
          <div className="mt-1 text-2xl font-bold text-amber-900">{stats?.pending ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="text-xs text-emerald-700">Converted</div>
          <div className="mt-1 text-2xl font-bold text-emerald-900">{stats?.converted ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
          <div className="text-xs text-blue-700">Paid Out</div>
          <div className="mt-1 text-2xl font-bold text-blue-900">{stats?.paid ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 text-white p-4">
          <div className="text-xs text-white/80">Total Rewards</div>
          <div className="mt-1 text-lg font-bold">{formatPKR(stats?.totalRewardsPaid ?? 0)}</div>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-600" />
            <h3 className="font-bold">Top Referrers</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {leaderboard.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 text-center">No referrers yet</div>
            ) : (
              leaderboard.map((t: any, idx: number) => (
                <div key={t.id} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' :
                      idx === 1 ? 'bg-slate-200 text-slate-700' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{t.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{t.referralCode}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-700">{formatPKR(t.totalEarned)}</div>
                    <div className="text-xs text-slate-500">{t.successfulReferrals} refs</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Users className="h-5 w-5 text-admin-600" />
            <h3 className="font-bold">Recent Referrals</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {list.map((r: any) => (
              <div key={r.id} className="px-6 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      {r.referrer.name} → {r.referee.name}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{r.code}</div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'CONVERTED' || r.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {r.status}
                    </span>
                    {r.rewardAmount > 0 && (
                      <div className="text-xs text-emerald-700 font-bold mt-1">
                        +{formatPKR(r.rewardAmount)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {list.length === 0 && (
              <div className="p-6 text-sm text-slate-500 text-center">No referrals yet</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
