import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import {
  ArrowLeft, Zap, TrendingUp, Users, Clock, Store,
  Trophy, Info, AlertTriangle, Sparkles,
} from 'lucide-react';
import { auctionApi } from '../api/auction.api';
import { useAuthStore } from '@/stores/auth.store';
import { Button, Card, Input, Badge, Avatar, EmptyState } from '@/ui';
import { formatPrice, timeAgo } from '@/lib/format';
import { useCountdown, formatCountdown } from '@/hooks/useCountdown';
import { useJoinRoom, useSocketEvent } from '@/lib/useSocket';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const customer = useAuthStore((s) => s.customer);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [autoBid, setAutoBid] = useState(false);
  const [maxAutoBid, setMaxAutoBid] = useState<string>('');
  const [flashBid, setFlashBid] = useState(false);

  useJoinRoom('auction', id);
  useSocketEvent('auction:new-bid', () => {
    qc.invalidateQueries({ queryKey: ['auction', id] });
    setFlashBid(true);
    setTimeout(() => setFlashBid(false), 1000);
  });
  useSocketEvent('auction:extended', (data: any) => {
    toast.info('⏰ Auction extended by 2 minutes!');
    qc.invalidateQueries({ queryKey: ['auction', id] });
  });
  useSocketEvent('auction:ended', () => {
    qc.invalidateQueries({ queryKey: ['auction', id] });
  });

  const { data: a, isLoading } = useQuery({
    queryKey: ['auction', id],
    queryFn: () => auctionApi.detail(id!),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.isLive ? 5000 : false),
  });

  const cd = useCountdown(a?.endsAt);
  const isEndingSoon = !cd.expired && cd.total < 60 * 60 * 1000;

  useEffect(() => {
    if (a && !bidAmount) {
      setBidAmount(String(a.nextMinBid));
    }
  }, [a]);

  const bidMutation = useMutation({
    mutationFn: () => auctionApi.bid(id!, {
      amount: Number(bidAmount),
      isAutoBid: autoBid,
      maxAutoBid: autoBid ? Number(maxAutoBid) : undefined,
    }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['auction', id] });
      toast.success(r.message || 'Bid placed!', { icon: '🎯' });
      setBidAmount(String(Number(bidAmount) + Number(a?.bidIncrement || 0)));
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Bid failed'),
  });

  if (isLoading) return <div className="skeleton h-96 rounded-3xl" />;
  if (!a) return <EmptyState icon={Zap} title="Auction not found" />;

  const shop = a.shop?.marketplaceProfile;

  return (
    <>
      <Helmet><title>{a.title} — Auction | Nafaa Bazaar</title></Helmet>

      <div className="max-w-6xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/auctions')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          All auctions
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,420px] gap-6">
          {/* LEFT: Image + Info */}
          <div className="space-y-4">
            <div className="aspect-square rounded-3xl bg-surface-muted overflow-hidden relative">
              {a.imageUrls?.[0] ? (
                <img src={a.imageUrls[0]} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Zap className="h-20 w-20 text-content-subtle" />
                </div>
              )}
              <div className="absolute top-4 left-4 flex gap-2">
                {a.isLive ? (
                  <Badge variant="danger" size="lg" className="shadow-lg">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse-soft" />
                    LIVE AUCTION
                  </Badge>
                ) : a.hasEnded ? (
                  <Badge variant="default" size="lg">ENDED</Badge>
                ) : (
                  <Badge variant="warning" size="lg">SCHEDULED</Badge>
                )}
              </div>
            </div>

            {/* Additional images */}
            {a.imageUrls?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {a.imageUrls.slice(1, 5).map((url: string, i: number) => (
                  <img key={i} src={url} alt="" className="h-20 w-20 rounded-xl object-cover shrink-0" />
                ))}
              </div>
            )}

            <div>
              <h1 className="text-2xl md:text-3xl font-black">{a.title}</h1>
              {shop && (
                <Link
                  to={`/shops/${shop.slug || a.shopId}`}
                  className="inline-flex items-center gap-2 mt-2 text-sm text-content-muted hover:text-brand-600 font-bold"
                >
                  <Store className="h-4 w-4" />
                  {shop.publicName}
                </Link>
              )}
              {a.description && (
                <p className="mt-3 text-sm text-content-muted leading-relaxed">{a.description}</p>
              )}
            </div>
          </div>

          {/* RIGHT: Bidding panel */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {/* Current bid */}
            <Card className={cn(
              'p-5 transition-all',
              flashBid && 'ring-4 ring-accent-500/40 scale-[1.02]',
            )}>
              <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-1">
                {a.isLive ? 'Current bid' : a.hasEnded ? 'Final bid' : 'Starting price'}
              </div>
              <div className="text-4xl md:text-5xl font-black gradient-text-accent">
                {formatPrice(a.currentPrice)}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="text-content-muted font-bold flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {a.bidCount} bids
                </span>
                {a.isWinning && (
                  <Badge variant="success" size="md">
                    <Trophy className="h-3 w-3" />
                    You're winning!
                  </Badge>
                )}
                {a.isWinner && a.hasEnded && (
                  <Badge variant="success" size="md">
                    🏆 You won!
                  </Badge>
                )}
              </div>
            </Card>

            {/* Countdown */}
            {a.isLive && !cd.expired && (
              <Card className={cn(
                'p-4 transition',
                isEndingSoon
                  ? 'bg-danger/10 border-danger/30 animate-pulse-soft'
                  : 'bg-gradient-to-br from-accent-50 to-amber-100 dark:from-accent-950/30 dark:to-amber-950/20 border-accent-200 dark:border-accent-800',
              )}>
                <div className={cn(
                  'text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-1',
                  isEndingSoon ? 'text-danger' : 'text-accent-700 dark:text-accent-400',
                )}>
                  <Clock className="h-3.5 w-3.5" />
                  {isEndingSoon ? 'Ending very soon!' : 'Ends in'}
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

            {/* Bid form */}
            {a.canBid && customer && (
              <Card className="p-5 space-y-3">
                <div>
                  <label className="text-xs font-black text-content-muted uppercase tracking-wider mb-1.5 block">
                    Your bid (min: {formatPrice(a.nextMinBid)})
                  </label>
                  <Input
                    type="number"
                    inputSize="lg"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={String(a.nextMinBid)}
                  />
                </div>

                {/* Quick bid buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 5].map((mult) => {
                    const amt = a.nextMinBid + (a.bidIncrement * mult);
                    return (
                      <button
                        key={mult}
                        type="button"
                        onClick={() => setBidAmount(String(amt))}
                        className="h-9 rounded-xl border-2 border-border hover:border-accent-500 text-xs font-black transition"
                      >
                        +{mult} bid{mult > 1 ? 's' : ''}
                      </button>
                    );
                  })}
                </div>

                <label className="flex items-start gap-2 p-3 rounded-xl bg-surface-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoBid}
                    onChange={(e) => setAutoBid(e.target.checked)}
                    className="h-4 w-4 mt-0.5 accent-accent-500"
                  />
                  <div className="flex-1">
                    <div className="text-xs font-black">Auto-bid</div>
                    <div className="text-2xs text-content-muted">Let us bid for you up to a max</div>
                    {autoBid && (
                      <Input
                        type="number"
                        inputSize="sm"
                        placeholder="Max auto-bid"
                        value={maxAutoBid}
                        onChange={(e) => setMaxAutoBid(e.target.value)}
                        className="mt-2"
                      />
                    )}
                  </div>
                </label>

                <Button
                  variant="accent"
                  size="lg"
                  fullWidth
                  disabled={!bidAmount || Number(bidAmount) < a.nextMinBid}
                  loading={bidMutation.isPending}
                  onClick={() => bidMutation.mutate()}
                  leftIcon={<Zap className="h-4 w-4" />}
                >
                  Place bid · {formatPrice(bidAmount ? Number(bidAmount) : 0)}
                </Button>

                <div className="text-2xs text-content-muted flex items-start gap-1">
                  <Info className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>Anti-snipe: Auction extends 2 min if bid placed near end</span>
                </div>
              </Card>
            )}

            {!customer && a.canBid && (
              <Card className="p-5 text-center">
                <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-2" />
                <div className="font-black text-sm mb-3">Login to bid</div>
                <Button variant="gradient" size="md" fullWidth onClick={() => navigate('/login')}>
                  Login
                </Button>
              </Card>
            )}

            {a.hasEnded && a.winnerId && (
              <Card className="p-5 text-center bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-950/40 dark:to-emerald-950/30">
                <Trophy className="h-8 w-8 text-brand-600 mx-auto mb-2" />
                <div className="font-black">
                  {a.isWinner ? 'Congratulations, you won! 🎉' : 'Auction ended'}
                </div>
                <div className="text-xs text-content-muted mt-1">
                  Winning bid: {formatPrice(a.currentPrice)}
                </div>
              </Card>
            )}

            {/* Recent bids */}
            {a.bids?.length > 0 && (
              <Card className="p-4">
                <h3 className="font-black text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-accent-500" />
                  Recent bids
                </h3>
                <div className="space-y-2">
                  {a.bids.slice(0, 8).map((b: any) => (
                    <div key={b.id} className="flex items-center gap-2 text-xs">
                      <Avatar name={b.customer.fullName} src={b.customer.avatarUrl} size="xs" />
                      <span className="flex-1 font-bold truncate">{b.customer.fullName}</span>
                      <span className="font-black text-accent-600">{formatPrice(b.amount)}</span>
                      <span className="text-2xs text-content-subtle">{timeAgo(b.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
