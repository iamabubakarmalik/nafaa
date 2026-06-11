import { useQuery } from '@tanstack/react-query';
import { Award, Star, TrendingUp, Gift, Crown } from 'lucide-react';
import { loyaltyApi } from '@/api/loyalty.api';
import { formatPKR } from '@/lib/format';

export default function LoyaltyPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['loyalty-leaderboard'],
    queryFn: loyaltyApi.leaderboard,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-yellow-900 to-amber-700 text-white p-6 shadow-soft">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
            <Award className="h-3.5 w-3.5" />
            Customer Loyalty Program
          </div>
          <h2 className="mt-3 text-3xl font-bold">Loyalty Points</h2>
          <p className="mt-2 text-sm text-white/80">
            Apne customers ko reward karein — points earn aur redeem karne ki suvidha.
          </p>
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Total Points Earned</div>
              <div className="mt-2 text-2xl font-bold text-emerald-700">
                {data?.totalEarned?.toLocaleString() || 0}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Total Points Redeemed</div>
              <div className="mt-2 text-2xl font-bold text-rose-700">
                {data?.totalRedeemed?.toLocaleString() || 0}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <Gift className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/80">Active Customers</div>
              <div className="mt-2 text-2xl font-bold">
                {data?.topCustomers?.length || 0}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <Star className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">Top Loyalty Customers</h3>
          <p className="text-sm text-slate-500">Highest points holders</p>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading...</div>
        ) : !data?.topCustomers?.length ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
              <Award className="h-7 w-7 text-slate-400" />
            </div>
            <h4 className="mt-4 text-lg font-semibold text-slate-900">No loyalty customers yet</h4>
            <p className="mt-1 text-sm text-slate-500">
              Settings mein loyalty enable karein, customers automatically points earn karenge.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.topCustomers.map((customer, idx) => {
              const position = idx + 1;
              const isTop3 = position <= 3;
              return (
                <div key={customer.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                        position === 1 ? 'bg-amber-100 text-amber-700' :
                        position === 2 ? 'bg-slate-200 text-slate-700' :
                        position === 3 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isTop3 ? <Crown className="h-6 w-6" /> : `#${position}`}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{customer.name}</div>
                      <div className="text-xs text-slate-500">{customer.phone || 'No phone'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Total spent: {formatPKR(customer.totalSpent)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                      <span className="text-2xl font-bold text-amber-700">
                        {customer.loyaltyPoints.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">loyalty points</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-white border border-amber-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Gift className="h-5 w-5 text-amber-600" />
          How Loyalty Works
        </h3>
        <div className="mt-4 grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-semibold text-slate-900">1. Customer buys</div>
            <p className="text-slate-600 mt-1">
              Har sale par customer ko automatically points milte hain (settings mein rate set karein).
            </p>
          </div>
          <div>
            <div className="font-semibold text-slate-900">2. Points accumulate</div>
            <p className="text-slate-600 mt-1">
              Points customer ke account mein jama hote rehte hain — kabhi expire nahi hote.
            </p>
          </div>
          <div>
            <div className="font-semibold text-slate-900">3. Redeem on next sale</div>
            <p className="text-slate-600 mt-1">
              Next purchase par customer points use kar sakta hai — discount mil jata hai.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
