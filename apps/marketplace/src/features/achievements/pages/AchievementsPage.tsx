import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, Trophy, Lock, Sparkles, Award, Flame, Star,
  Zap, Gift, Users, ShoppingBag, Heart, MessageCircle,
} from 'lucide-react';
import { achievementsApi } from '../api/achievements.api';
import { Card, Badge, EmptyState, Button } from '@/ui';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

const CATEGORY_ICONS: Record<string, any> = {
  ORDERS: ShoppingBag,
  SOCIAL: Users,
  BARGAIN: MessageCircle,
  REVIEWS: Star,
  LOYALTY: Award,
  MILESTONES: Trophy,
  SPECIAL: Sparkles,
};

const RARITY_STYLES: Record<string, { gradient: string; icon: string; label: string }> = {
  COMMON:    { gradient: 'from-slate-400 to-slate-600',      icon: '⚪', label: 'Common' },
  RARE:      { gradient: 'from-blue-400 to-blue-700',        icon: '🔵', label: 'Rare' },
  EPIC:      { gradient: 'from-purple-500 to-pink-600',      icon: '🟣', label: 'Epic' },
  LEGENDARY: { gradient: 'from-amber-400 via-orange-500 to-red-600', icon: '🟡', label: 'Legendary' },
};

export default function AchievementsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['achievements-mine'],
    queryFn: achievementsApi.mine,
  });

  const claimMutation = useMutation({
    mutationFn: (id: string) => achievementsApi.claim(id),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['achievements-mine'] });
      toast.success(`🎉 Claimed! +${r.pointsAwarded || 0} points`);
    },
  });

  if (isLoading) return <div className="skeleton h-96 rounded-3xl" />;

  return (
    <>
      <Helmet><title>Achievements — Nafaa Bazaar</title></Helmet>

      <div className="max-w-4xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>

        {/* Hero */}
        <Card className="p-6 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-5xl">
                🏆
              </div>
              <div>
                <div className="text-2xs opacity-90 font-black uppercase tracking-wider">Your level</div>
                <div className="text-4xl md:text-5xl font-black">Level {data?.level || 1}</div>
                <div className="text-sm opacity-90 mt-1">
                  <Sparkles className="h-4 w-4 inline mr-1" />
                  {data?.totalPoints?.toLocaleString() || 0} achievement points
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-white/15 backdrop-blur">
                <div className="text-lg font-black">{data?.earned?.length || 0}</div>
                <div className="text-2xs opacity-90 font-bold uppercase">Earned</div>
              </div>
              <div className="p-2 rounded-xl bg-white/15 backdrop-blur">
                <div className="text-lg font-black">{data?.inProgress?.length || 0}</div>
                <div className="text-2xs opacity-90 font-bold uppercase">In progress</div>
              </div>
              <div className="p-2 rounded-xl bg-white/15 backdrop-blur">
                <div className="text-lg font-black">{data?.locked?.length || 0}</div>
                <div className="text-2xs opacity-90 font-bold uppercase">Locked</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Earned */}
        {data?.earned && data.earned.length > 0 && (
          <section>
            <h3 className="text-lg font-black mb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Earned achievements ({data.earned.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.earned.map((a: any) => {
                const rarity = RARITY_STYLES[a.rarity] || RARITY_STYLES.COMMON;
                return (
                  <Card key={a.id} className={cn(
                    `p-4 text-center bg-gradient-to-br ${rarity.gradient} text-white border-0 relative overflow-hidden`,
                    !a.isClaimed && 'ring-4 ring-brand-500 ring-offset-2 animate-pulse-soft',
                  )}>
                    <div className="text-4xl mb-2">{a.icon || '🏅'}</div>
                    <div className="font-black text-sm line-clamp-2">{a.title}</div>
                    <div className="text-2xs opacity-90 mt-1 line-clamp-2">{a.description}</div>
                    <Badge variant="glass" size="sm" className="mt-2 backdrop-blur">
                      +{a.points} pts
                    </Badge>
                    {!a.isClaimed && (
                      <Button
                        variant="glass"
                        size="xs"
                        fullWidth
                        className="mt-2"
                        onClick={() => claimMutation.mutate(a.id)}
                        loading={claimMutation.isPending}
                        leftIcon={<Gift className="h-3 w-3" />}
                      >
                        Claim
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* In progress */}
        {data?.inProgress && data.inProgress.length > 0 && (
          <section>
            <h3 className="text-lg font-black mb-3 flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              In progress ({data.inProgress.length})
            </h3>
            <div className="space-y-2">
              {data.inProgress.map((a: any) => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{a.icon || '🎯'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-sm">{a.title}</div>
                      <div className="text-2xs text-content-muted mt-0.5">{a.description}</div>
                      <div className="mt-2">
                        <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                          <div
                            className="h-full bg-gradient-brand transition-all"
                            style={{ width: `${(a.progress / a.target) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-2xs mt-1 font-bold">
                          <span className="text-content-muted">
                            {a.progress}/{a.target}
                          </span>
                          <span className="text-brand-600">+{a.points} pts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Locked */}
        {data?.locked && data.locked.length > 0 && (
          <section>
            <h3 className="text-lg font-black mb-3 flex items-center gap-2">
              <Lock className="h-5 w-5 text-content-subtle" />
              Locked ({data.locked.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.locked.map((a: any) => (
                <Card key={a.id} className="p-4 text-center opacity-60 relative">
                  <div className="text-4xl mb-2 grayscale">{a.icon || '❓'}</div>
                  <Lock className="h-4 w-4 mx-auto text-content-subtle mb-1" />
                  <div className="font-black text-xs line-clamp-2">{a.title}</div>
                  <div className="text-2xs text-content-muted mt-1 line-clamp-2">{a.description}</div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {(!data?.earned?.length && !data?.inProgress?.length && !data?.locked?.length) && (
          <EmptyState
            icon={Trophy}
            title="Start earning achievements!"
            description="Complete actions like placing orders, writing reviews, and referring friends"
          />
        )}
      </div>
    </>
  );
}
