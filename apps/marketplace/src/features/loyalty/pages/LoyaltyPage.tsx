import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, Award, Sparkles, Crown, Star, TrendingUp, Gift,
  Bike, ShieldCheck, Zap, RefreshCw,
} from 'lucide-react';
import { loyaltyApi } from '../api/loyalty.api';
import { Button, Card, Badge } from '@/ui';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';

const TIER_STYLES: Record<string, { gradient: string; icon: string; color: string }> = {
  BRONZE:   { gradient: 'from-orange-400 to-amber-700',   icon: '🥉', color: 'orange' },
  SILVER:   { gradient: 'from-slate-300 to-slate-500',    icon: '🥈', color: 'slate' },
  GOLD:     { gradient: 'from-amber-300 to-yellow-600',   icon: '🥇', color: 'amber' },
  PLATINUM: { gradient: 'from-slate-100 to-slate-400',    icon: '💎', color: 'gray' },
};

export default function LoyaltyPage() {
  const navigate = useNavigate();

  const { data: state, isLoading } = useQuery({
    queryKey: ['loyalty-state'],
    queryFn: loyaltyApi.me,
  });

  const { data: configs } = useQuery({
    queryKey: ['loyalty-configs'],
    queryFn: loyaltyApi.configs,
  });

  const recomputeMutation = useMutation({
    mutationFn: loyaltyApi.recompute,
    onSuccess: () => toast.success('Tier updated!'),
  });

  if (isLoading) return <div className="skeleton h-96 rounded-3xl" />;

  const current = TIER_STYLES[state?.state?.currentTier || 'BRONZE'];

  return (
    <>
      <Helmet><title>Loyalty Rewards — Nafaa Bazaar</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>

        {/* Current tier hero */}
        <Card className={`p-6 md:p-8 bg-gradient-to-br ${current.gradient} text-white border-0 relative overflow-hidden`}>
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{current.icon}</span>
              <div>
                <div className="text-2xs opacity-75 font-black uppercase tracking-wider">Your tier</div>
                <div className="text-2xl md:text-3xl font-black">{state?.state?.currentTier || 'BRONZE'}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <div className="text-2xs opacity-75 font-bold uppercase">Lifetime spent</div>
                <div className="text-lg font-black">{formatPrice(state?.state?.lifetimeSpend || 0)}</div>
              </div>
              <div>
                <div className="text-2xs opacity-75 font-bold uppercase">Total orders</div>
                <div className="text-lg font-black">{state?.state?.lifetimeOrders || 0}</div>
              </div>
              <div>
                <div className="text-2xs opacity-75 font-bold uppercase">Points</div>
                <div className="text-lg font-black">{state?.state?.lifetimePoints || 0}</div>
              </div>
            </div>

            {/* Progress to next */}
            {state?.state?.nextTier && (
              <div className="mt-5">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-bold opacity-90">Progress to {state.state.nextTier}</span>
                  <span className="font-black">{(state.state.progressToNext || 0).toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all"
                    style={{ width: `${state.state.progressToNext || 0}%` }}
                  />
                </div>
                {state.state.amountToNextTier && (
                  <div className="text-2xs opacity-90 mt-1.5">
                    Spend {formatPrice(state.state.amountToNextTier)} more to unlock {state.state.nextTier}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <Button
          variant="ghost"
          size="sm"
          fullWidth
          onClick={() => recomputeMutation.mutate()}
          loading={recomputeMutation.isPending}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Refresh tier
        </Button>

        {/* All tiers */}
        <div className="space-y-3">
          <h3 className="font-black text-lg">All tiers</h3>
          {configs?.map((cfg: any) => {
            const styles = TIER_STYLES[cfg.level];
            const isCurrent = state?.state?.currentTier === cfg.level;
            const isUnlocked = Number(state?.state?.lifetimeSpend || 0) >= Number(cfg.minLifetimeSpend);
            return (
              <Card key={cfg.level} className={cn(
                'p-5 relative overflow-hidden',
                isCurrent && 'ring-2 ring-brand-500 shadow-brand',
                !isUnlocked && 'opacity-70',
              )}>
                <div className="flex items-start gap-3">
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${styles.gradient} flex items-center justify-center text-3xl shrink-0`}>
                    {styles.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-lg">{cfg.displayName}</h4>
                      {isCurrent && <Badge variant="brand" size="sm">Current</Badge>}
                      {!isUnlocked && !isCurrent && <Badge variant="default" size="sm">🔒 Locked</Badge>}
                    </div>
                    <div className="text-xs text-content-muted mt-0.5">
                      Spend {formatPrice(cfg.minLifetimeSpend)}+ · {cfg.minOrdersCount}+ orders
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-2xs">
                      {[
                        { icon: Sparkles, label: `${cfg.pointsMultiplier}x points on orders` },
                        { icon: Gift, label: `${cfg.cashbackPercent}% cashback` },
                        cfg.freeDeliveryAbove && { icon: Bike, label: `Free delivery above ${formatPrice(cfg.freeDeliveryAbove)}` },
                        cfg.prioritySupport && { icon: ShieldCheck, label: 'Priority support' },
                        cfg.earlyAccessDrops && { icon: Zap, label: 'Early access to drops' },
                        cfg.exclusiveDeals && { icon: Star, label: 'Exclusive member deals' },
                        cfg.birthdayBonusPoints > 0 && { icon: Gift, label: `${cfg.birthdayBonusPoints} birthday bonus points` },
                      ].filter(Boolean).map((b: any, i) => {
                        const Icon = b.icon;
                        return (
                          <div key={i} className="flex items-center gap-1.5 text-content-muted">
                            <Icon className="h-3 w-3 text-brand-600 shrink-0" />
                            <span>{b.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
