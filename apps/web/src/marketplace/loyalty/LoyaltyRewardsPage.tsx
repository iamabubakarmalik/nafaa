import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Award, Crown, Star, Users, Gift, TrendingUp, Sparkles, X,
  Search, ChevronRight, Trophy, Zap, Target, Heart, Send, Coins,
} from 'lucide-react';
import { loyaltyApi, type LoyaltyTierLevel } from '../shared/marketplace.api';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const TIER_META: Record<LoyaltyTierLevel, {
  icon: any; gradient: string; textColor: string; bgColor: string;
  badgeEmoji: string;
}> = {
  BRONZE:   { icon: Award,  gradient: 'from-amber-600 to-orange-700',    textColor: 'text-amber-800',  bgColor: 'bg-amber-100',  badgeEmoji: '🥉' },
  SILVER:   { icon: Star,   gradient: 'from-slate-400 to-slate-600',     textColor: 'text-slate-800',  bgColor: 'bg-slate-200',  badgeEmoji: '🥈' },
  GOLD:     { icon: Trophy, gradient: 'from-yellow-400 to-amber-600',    textColor: 'text-yellow-900', bgColor: 'bg-yellow-100', badgeEmoji: '🥇' },
  PLATINUM: { icon: Crown,  gradient: 'from-cyan-500 via-purple-600 to-pink-600', textColor: 'text-purple-900', bgColor: 'bg-purple-100', badgeEmoji: '💎' },
};

const TIER_ORDER: LoyaltyTierLevel[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

export default function LoyaltyRewardsPage() {
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);
  const [selectedTier, setSelectedTier] = useState<LoyaltyTierLevel | null>(null);
  const [showAward, setShowAward] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: overview } = useQuery({
    queryKey: ['loyalty-overview'],
    queryFn: loyaltyApi.overview,
  });

  const { data: customersData } = useQuery({
    queryKey: ['loyalty-customers', selectedTier, page, search],
    queryFn: () => loyaltyApi.listCustomers({ tier: selectedTier || undefined, search: search || undefined, page, limit: 20 }),
    enabled: !!selectedTier || search.length > 0,
  });

  return (
    <div className="space-y-5 pb-10">
      {/* HERO */}
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-yellow-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <Trophy className="h-3.5 w-3.5 text-yellow-300" />
              Loyalty & Rewards
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Reward Loyal Customers</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">
              Tiered system — points, cashback, exclusive perks. Retention badhayen.
            </p>
          </div>
        </div>

        {overview && (
          <div className="relative grid grid-cols-2 md:grid-cols-5 gap-2 mt-6">
            <HeroKpi label="Total Members" value={overview.stats.totalCustomers} icon={Users} />
            <HeroKpi label="Points Issued" value={overview.stats.totalPointsIssued.toLocaleString()} icon={Coins} />
            <HeroKpi label="Points Redeemed" value={overview.stats.totalPointsRedeemed.toLocaleString()} icon={Gift} />
            <HeroKpi label="Cashback Paid" value={`Rs ${formatPKR(overview.stats.totalCashbackPaid)}`} icon={TrendingUp} isText />
            <HeroKpi label="Active Referrals" value={overview.stats.activeReferrals} icon={Heart} highlight />
          </div>
        )}
      </section>

      {/* Tier Cards */}
      <div>
        <h2 className="text-lg font-black text-slate-900 mb-3">Tier Structure</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {overview?.tiers.map((tier) => {
            const meta = TIER_META[tier.level];
            const TierIcon = meta.icon;
            const isSelected = selectedTier === tier.level;

            return (
              <div
                key={tier.level}
                onClick={() => { setSelectedTier(isSelected ? null : tier.level); setPage(1); }}
                className={`cursor-pointer rounded-3xl overflow-hidden transition-all shadow-lg ${
                  isSelected ? 'ring-4 ring-purple-500 scale-[1.02]' : 'hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                {/* Header with gradient */}
                <div className={`relative bg-gradient-to-br ${meta.gradient} text-white p-5`}>
                  <div className="flex items-center justify-between">
                    <div className="text-4xl">{meta.badgeEmoji}</div>
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/25 backdrop-blur text-[10px] font-black`}>
                      <Users className="h-2.5 w-2.5" />
                      {tier.customerCount}
                    </div>
                  </div>
                  <h3 className="mt-3 text-2xl font-black">{tier.displayName}</h3>
                  <div className="text-xs text-white/80 font-bold mt-0.5">
                    Rs {formatPKR(tier.minLifetimeSpend)}+ · {tier.minOrdersCount}+ orders
                  </div>
                </div>

                {/* Body */}
                <div className="bg-white p-4 space-y-2">
                  <PerkRow icon={Coins} label={`${tier.pointsMultiplier}x Points`} highlight={tier.pointsMultiplier > 1} />
                  <PerkRow icon={Gift} label={`${tier.cashbackPercent}% Cashback`} highlight={tier.cashbackPercent > 0} />
                  {tier.freeDeliveryAbove !== undefined && tier.freeDeliveryAbove !== null && (
                    <PerkRow icon={Zap} label={`Free delivery > Rs ${tier.freeDeliveryAbove}`} highlight />
                  )}
                  {tier.prioritySupport && <PerkRow icon={Sparkles} label="Priority Support" highlight />}
                  {tier.earlyAccessDrops && <PerkRow icon={Star} label="Early Access" highlight />}
                  {tier.exclusiveDeals && <PerkRow icon={Trophy} label="Exclusive Deals" highlight />}
                  {tier.birthdayBonusPoints > 0 && <PerkRow icon={Heart} label={`${tier.birthdayBonusPoints} Birthday Points`} highlight />}

                  <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-bold">Revenue Contribution</span>
                    <span className="font-black text-emerald-700 tabular-nums">Rs {formatPKR(tier.totalRevenue)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Earners */}
      {overview && overview.topEarners.length > 0 && (
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h3 className="font-black text-slate-900 text-lg">Top Earners This Month</h3>
          </div>
          <div className="space-y-2">
            {overview.topEarners.slice(0, 10).map((earner, i) => {
              const meta = TIER_META[earner.tier];
              return (
                <div key={earner.customerId} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                  <div className={`w-8 text-center font-black text-lg ${i < 3 ? 'text-yellow-600' : 'text-slate-500'}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>
                  <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                    {earner.avatarUrl ? (
                      <img src={earner.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-black text-slate-600">
                        {earner.fullName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 truncate">{earner.fullName}</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${meta.bgColor} ${meta.textColor}`}>
                        {meta.badgeEmoji} {earner.tier}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                      {earner.lifetimeOrders} orders · Rs {formatPKR(earner.lifetimeSpend)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-yellow-700 tabular-nums flex items-center gap-1">
                      <Coins className="h-4 w-4" />
                      {earner.lifetimePoints.toLocaleString()}
                    </div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase">points</div>
                  </div>
                  <button
                    onClick={() => setShowAward(earner.customerId)}
                    className="h-9 px-3 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-black inline-flex items-center gap-1"
                  >
                    <Gift className="h-3 w-3" />
                    Award
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Points Activity Chart */}
      {overview && overview.pointsActivity.length > 0 && (
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="h-5 w-5 text-purple-600" />
            <h3 className="font-black text-slate-900 text-lg">Points Activity — Last 30 Days</h3>
          </div>
          <div className="space-y-1">
            {overview.pointsActivity.slice(-14).map((day) => {
              const maxVal = Math.max(...overview.pointsActivity.map((d) => Math.max(d.issued, d.redeemed)), 1);
              const issuedPct = (day.issued / maxVal) * 100;
              const redeemedPct = (day.redeemed / maxVal) * 100;
              return (
                <div key={day.date} className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-slate-600 font-bold shrink-0">
                    {new Date(day.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                  </span>
                  <div className="flex-1 h-6 rounded-lg bg-slate-100 overflow-hidden relative flex">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${issuedPct * 0.5}%` }} />
                    <div className="h-full bg-gradient-to-r from-rose-400 to-rose-600" style={{ width: `${redeemedPct * 0.5}%` }} />
                    <div className="absolute inset-0 flex items-center px-2 text-[10px] font-black text-slate-700">
                      +{day.issued} / -{day.redeemed}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-3 text-[10px] font-bold text-slate-600">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-4 rounded bg-emerald-500" /> Issued
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-4 rounded bg-rose-500" /> Redeemed
            </span>
          </div>
        </div>
      )}

      {/* Selected Tier Customers */}
      {selectedTier && (
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${TIER_META[selectedTier].gradient} text-white flex items-center justify-center shadow`}>
                {TIER_META[selectedTier].badgeEmoji}
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg">{selectedTier} Tier Customers</h3>
                <p className="text-xs text-slate-500 font-medium">{customersData?.meta.total || 0} members</p>
              </div>
            </div>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search..."
                className="h-10 pl-10 pr-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {customersData?.items.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-black text-slate-600">No customers in this tier</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customersData?.items.map((c) => {
                const meta = TIER_META[c.currentTier];
                return (
                  <div key={c.customerId} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition">
                    <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-black text-slate-600">
                          {c.fullName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-slate-900 truncate">{c.fullName}</div>
                      <div className="text-[10px] text-slate-500 font-bold">{c.phone}</div>
                    </div>
                    <div className="text-right hidden md:block">
                      <div className="text-xs font-black text-slate-700">{c.lifetimeOrders} orders</div>
                      <div className="text-[10px] text-slate-500 font-bold">Rs {formatPKR(c.lifetimeSpend)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-yellow-700 tabular-nums inline-flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        {c.lifetimePoints.toLocaleString()}
                      </div>
                      <div className="text-[9px] text-slate-500 font-bold uppercase">points</div>
                    </div>
                    {c.nextTier && (
                      <div className="hidden lg:block w-40">
                        <div className="text-[9px] text-slate-500 font-bold mb-0.5">
                          → {c.nextTier}: {c.progressToNext.toFixed(0)}%
                        </div>
                        <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${TIER_META[c.nextTier].gradient}`} style={{ width: `${c.progressToNext}%` }} />
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => setShowAward(c.customerId)}
                      className="h-9 px-3 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-black inline-flex items-center gap-1"
                    >
                      <Gift className="h-3 w-3" />
                      Award
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {customersData && customersData.meta.totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-bold">Page {customersData.meta.page} of {customersData.meta.totalPages}</span>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage(page - 1)}
                  className="h-8 px-3 rounded-lg border-2 border-slate-200 font-black disabled:opacity-40">Previous</button>
                <button disabled={page >= customersData.meta.totalPages} onClick={() => setPage(page + 1)}
                  className="h-8 px-3 rounded-lg bg-purple-600 text-white font-black disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showAward && (
        <AwardPointsModal
          customerId={showAward}
          onClose={() => setShowAward(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['loyalty-overview'] });
            qc.invalidateQueries({ queryKey: ['loyalty-customers'] });
            setShowAward(null);
          }}
        />
      )}
    </div>
  );
}

function HeroKpi({ label, value, icon: Icon, highlight, isText }: any) {
  return (
    <div className={`rounded-xl backdrop-blur border p-2.5 ${
      highlight ? 'bg-yellow-500/25 border-yellow-300/50' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-black opacity-90 truncate">{label}</div>
      </div>
      <div className={`font-black leading-none tabular-nums ${isText ? 'text-sm' : 'text-xl'}`}>{value}</div>
    </div>
  );
}

function PerkRow({ icon: Icon, label, highlight }: any) {
  return (
    <div className={`flex items-center gap-2 text-xs ${highlight ? 'font-black text-slate-900' : 'font-medium text-slate-500'}`}>
      <Icon className={`h-3.5 w-3.5 shrink-0 ${highlight ? 'text-emerald-600' : 'text-slate-400'}`} />
      <span className="truncate">{label}</span>
    </div>
  );
}

function AwardPointsModal({ customerId, onClose, onSuccess }: any) {
  const [points, setPoints] = useState(100);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return toast.error('Reason required');
    if (points < 1) return toast.error('Points must be positive');
    setProcessing(true);
    try {
      await loyaltyApi.awardPoints(customerId, points, reason);
      toast.success(`✅ ${points} points awarded!`);
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-br from-yellow-500 to-amber-600 text-white p-5 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black">
              <Gift className="h-3 w-3" />
              Award Points
            </div>
            <h2 className="mt-2 text-xl font-black">Bonus Points</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Points to Award</label>
            <input
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-full h-14 px-3 rounded-xl border-2 border-slate-200 text-3xl font-black text-center outline-none focus:border-yellow-500"
            />
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[50, 100, 250, 500].map((v) => (
                <button
                  key={v}
                  onClick={() => setPoints(v)}
                  className={`h-9 rounded-lg text-xs font-black transition ${
                    points === v ? 'bg-yellow-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-black text-slate-700 mb-1.5 block">Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Birthday bonus, apology for late delivery..."
              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-yellow-500 resize-none"
            />
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200">Cancel</button>
          <Button onClick={submit} loading={processing} className="bg-gradient-to-r from-yellow-500 to-amber-600">
            <Gift className="h-4 w-4" />
            Award {points} Points
          </Button>
        </div>
      </div>
    </div>
  );
}
