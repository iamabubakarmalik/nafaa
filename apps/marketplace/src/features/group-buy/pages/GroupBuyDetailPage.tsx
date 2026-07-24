import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useEffect } from 'react';
import {
  ArrowLeft, Users, Clock, CheckCircle2, Store, ShoppingBag,
  TrendingDown, Sparkles, XCircle,
} from 'lucide-react';
import { groupBuyApi } from '../api/group-buy.api';
import { Button, Card, Badge, Avatar, EmptyState } from '@/ui';
import { formatPrice, timeAgo } from '@/lib/format';
import { useCountdown, formatCountdown } from '@/hooks/useCountdown';
import { useSocketEvent } from '@/lib/useSocket';
import { toast } from 'sonner';

export default function GroupBuyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: gb, isLoading } = useQuery({
    queryKey: ['group-buy', id],
    queryFn: () => groupBuyApi.detail(id!),
    enabled: !!id,
  });

  useSocketEvent('group-buy:progress', (data: any) => {
    if (data.groupBuyId === id) {
      qc.invalidateQueries({ queryKey: ['group-buy', id] });
    }
  });

  const cd = useCountdown(gb?.expiresAt);

  const joinMutation = useMutation({
    mutationFn: () => groupBuyApi.join(id!, 1),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-buy', id] });
      qc.invalidateQueries({ queryKey: ['cart'] });
      toast.success('You joined the group buy! 🎉');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const leaveMutation = useMutation({
    mutationFn: () => groupBuyApi.leave(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-buy', id] });
      qc.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Left the group buy');
    },
  });

  if (isLoading) return <div className="skeleton h-96 rounded-3xl" />;
  if (!gb) return <EmptyState icon={Users} title="Group buy not found" />;

  const progress = Math.min(100, gb.progressPercent || 0);
  const shop = gb.shop?.marketplaceProfile;
  const isSuccess = gb.currentCount >= gb.minParticipants;

  return (
    <>
      <Helmet><title>{gb.productName} — Group Buy | Nafaa Bazaar</title></Helmet>

      <div className="max-w-4xl mx-auto space-y-5">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="grid grid-cols-1 md:grid-cols-[1.2fr,1fr] gap-6">
          {/* Left: Image */}
          <div>
            <div className="aspect-square rounded-3xl bg-surface-muted overflow-hidden relative">
              {gb.imageUrl ? (
                <img src={gb.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <ShoppingBag className="h-20 w-20 text-content-subtle" />
                </div>
              )}
              <div className="absolute top-4 left-4">
                <Badge variant="info" size="lg" className="shadow-lg">
                  <Users className="h-4 w-4" />
                  GROUP BUY
                </Badge>
              </div>
              {gb.savingsPercent > 0 && (
                <div className="absolute top-4 right-4">
                  <Badge variant="danger" size="lg" className="shadow-lg">
                    Save {gb.savingsPercent}%
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Right: Info */}
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black">{gb.productName}</h1>
              {shop && (
                <Link
                  to={`/shops/${shop.slug || gb.shopId}`}
                  className="inline-flex items-center gap-2 mt-2 text-sm text-content-muted hover:text-brand-600 font-bold"
                >
                  <Store className="h-4 w-4" />
                  {shop.publicName}
                </Link>
              )}
            </div>

            {/* Prices */}
            <Card className="p-4 bg-gradient-to-br from-info/10 to-blue-100 dark:from-info/20 dark:to-blue-950/30 border-info/30">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl md:text-4xl font-black text-info">
                  {formatPrice(gb.groupPrice)}
                </span>
                <span className="text-xl text-content-subtle line-through font-semibold">
                  {formatPrice(gb.regularPrice)}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-sm font-black text-brand-600">
                <TrendingDown className="h-4 w-4" />
                Save {formatPrice(gb.savingsPerUnit)} per unit
              </div>
            </Card>

            {/* Progress */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-content-muted uppercase tracking-wider">
                  Progress
                </span>
                <span className="text-sm font-black">
                  {gb.currentCount}/{gb.minParticipants} joined
                </span>
              </div>
              <div className="h-3 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className={`h-full transition-all ${isSuccess ? 'bg-gradient-to-r from-brand-500 to-emerald-600' : 'bg-gradient-to-r from-info to-blue-600'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {isSuccess ? (
                <div className="mt-3 p-3 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-brand-600" />
                  <div>
                    <div className="font-black text-brand-700 dark:text-brand-400 text-sm">Target reached!</div>
                    <div className="text-xs text-content-muted">Discount confirmed for all participants</div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-xs text-content-muted font-bold">
                  Need <span className="text-info font-black">{gb.remainingToTarget}</span> more people to unlock the discount
                </div>
              )}
            </Card>

            {/* Countdown */}
            {!cd.expired && (
              <Card className="p-4 bg-gradient-to-br from-accent-50 to-amber-100 dark:from-accent-950/30 dark:to-amber-950/20 border-accent-200 dark:border-accent-800">
                <div className="text-xs font-black text-accent-700 dark:text-accent-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Ends in
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { val: cd.days, label: 'Days' },
                    { val: cd.hours, label: 'Hrs' },
                    { val: cd.minutes, label: 'Min' },
                    { val: cd.seconds, label: 'Sec' },
                  ].map((t) => (
                    <div key={t.label} className="bg-surface rounded-xl py-2">
                      <div className="text-2xl font-black text-content tabular-nums">
                        {String(t.val).padStart(2, '0')}
                      </div>
                      <div className="text-2xs text-content-muted font-bold uppercase">{t.label}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Action button */}
            {gb.hasJoined ? (
              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-brand-600" />
                  <div className="flex-1">
                    <div className="font-black text-sm">You've joined!</div>
                    <div className="text-2xs text-content-muted">
                      {gb.myQuantity} unit(s) reserved · Added to cart
                    </div>
                  </div>
                </div>
                {!isSuccess && (
                  <Button
                    variant="ghost"
                    size="md"
                    fullWidth
                    onClick={() => leaveMutation.mutate()}
                    loading={leaveMutation.isPending}
                    leftIcon={<XCircle className="h-4 w-4" />}
                    className="text-danger hover:bg-danger/10"
                  >
                    Leave group
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant="gradient"
                size="lg"
                fullWidth
                disabled={!gb.canJoin || cd.expired}
                loading={joinMutation.isPending}
                onClick={() => joinMutation.mutate()}
                leftIcon={<Users className="h-5 w-5" />}
              >
                Join for {formatPrice(gb.groupPrice)}
              </Button>
            )}
          </div>
        </div>

        {/* Participants */}
        {gb.participants && gb.participants.length > 0 && (
          <Card className="p-5">
            <h3 className="font-black text-lg mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-info" />
              {gb.participants.length} people joined
            </h3>
            <div className="flex flex-wrap gap-2">
              {gb.participants.slice(0, 20).map((p: any) => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-muted">
                  <Avatar name={p.customer?.fullName} src={p.customer?.avatarUrl} size="xs" />
                  <span className="text-xs font-bold">
                    {p.customer?.fullName?.split(' ')[0]}
                  </span>
                  <span className="text-2xs text-content-muted">
                    · {timeAgo(p.joinedAt)}
                  </span>
                </div>
              ))}
              {gb.participants.length > 20 && (
                <div className="px-3 py-1.5 rounded-full bg-surface-muted text-xs font-bold text-content-muted">
                  +{gb.participants.length - 20} more
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
