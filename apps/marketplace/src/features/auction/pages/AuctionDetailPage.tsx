import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Gavel, ArrowLeft, TrendingUp, Clock, Users, Flame,
  Trophy, AlertCircle,
} from 'lucide-react';
import { auctionApi } from '../api/auction.api';
import { useJoinRoom, useSocketEvent } from '@lib/realtime/useSocket';
import { Button } from '@shared/ui/Button';
import { Avatar } from '@shared/ui/Avatar';
import { SkeletonCard } from '@shared/ui/Skeleton';
import { cn } from '@lib/cn';

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [bidAmount, setBidAmount] = useState('');
  const [timeLeft, setTimeLeft] = useState('');

  const { data: a, isLoading } = useQuery({
    queryKey: ['auction', id],
    queryFn: () => auctionApi.detail(id!),
    enabled: !!id,
    refetchInterval: 3000, // aggressive polling for real-time feel
  });

  // Real-time updates
  useJoinRoom('auction', id);
  useSocketEvent('auction:new-bid', () => queryClient.invalidateQueries({ queryKey: ['auction', id] }), [id]);
  useSocketEvent('auction:extended', (data: any) => {
    toast.info(`Auction extended by ${data.extraMinutes || 2} minutes!`);
    queryClient.invalidateQueries({ queryKey: ['auction', id] });
  }, [id]);
  useSocketEvent('auction:ended', () => {
    queryClient.invalidateQueries({ queryKey: ['auction', id] });
  }, [id]);

  const bidMutation = useMutation({
    mutationFn: () => auctionApi.bid(id!, Number(bidAmount)),
    onSuccess: () => {
      toast.success('Bid successful! 🎯');
      setBidAmount('');
      queryClient.invalidateQueries({ queryKey: ['auction', id] });
    },
    onError: (err: any) => {
      if (err?.response?.status === 401) {
        toast.error('Pehle login karein');
        navigate('/login');
      } else {
        toast.error(err?.response?.data?.message || 'Bid fail');
      }
    },
  });

  // Countdown timer
  useEffect(() => {
    if (!a?.endsAt) return;
    const update = () => {
      const diff = Math.max(0, new Date(a.endsAt).getTime() - Date.now());
      if (diff === 0) {
        setTimeLeft('Ended');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [a?.endsAt]);

  if (isLoading || !a) return <SkeletonCard />;

  const currentBid = Number(a.currentBid || a.startingPrice);
  const minBid = currentBid + Number(a.bidIncrement || 100);
  const isEnded = new Date(a.endsAt).getTime() <= Date.now();
  const isWinning = a.myHighestBid && Number(a.myHighestBid) === currentBid;

  return (
    <div className="pb-32 space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Hero */}
      <div className="rounded-3xl overflow-hidden shadow-soft-lg bg-white dark:bg-neutral-900">
        <div className="relative aspect-square bg-slate-100 dark:bg-neutral-800 overflow-hidden">
          {a.product?.marketplaceProfile?.publicImages?.[0] && (
            <img
              src={a.product.marketplaceProfile.publicImages[0]}
              className="w-full h-full object-cover"
              alt=""
            />
          )}
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-rose-500 text-white text-sm font-black shadow-lg flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            LIVE AUCTION
          </div>
        </div>

        <div className="p-5 space-y-4">
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            {a.product?.marketplaceProfile?.publicName}
          </h1>

          {/* Current bid + timer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg">
              <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-90">
                Current Bid
              </div>
              <div className="text-2xl font-black mt-1">
                Rs {currentBid.toFixed(0)}
              </div>
              <div className="text-[10px] font-bold opacity-80 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {a.bidCount || 0} bids
              </div>
            </div>
            <div className={cn(
              'p-4 rounded-2xl shadow-lg text-white',
              isEnded ? 'bg-slate-600' : 'bg-gradient-to-br from-orange-500 to-amber-600',
            )}>
              <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-90 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Time Left
              </div>
              <div className="text-2xl font-black mt-1 tabular-nums">
                {timeLeft}
              </div>
              {!isEnded && (
                <div className="text-[10px] font-bold opacity-80 mt-1 flex items-center gap-1">
                  <Flame className="h-3 w-3" /> Live now
                </div>
              )}
            </div>
          </div>

          {/* Status alerts */}
          {isWinning && !isEnded && (
            <div className="p-3 rounded-2xl bg-gradient-to-br from-success-100 to-emerald-100 dark:from-success-900/40 dark:to-emerald-900/40 border-2 border-success-300 text-center">
              <Trophy className="h-5 w-5 text-success-600 mx-auto mb-1" />
              <div className="text-sm font-black text-success-900 dark:text-success-300">
                🎉 Aap top bidder hain!
              </div>
            </div>
          )}

          {a.myHighestBid && !isWinning && !isEnded && (
            <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-900/30 border border-amber-300 text-center">
              <AlertCircle className="h-4 w-4 text-amber-600 inline mr-1" />
              <span className="text-xs font-bold text-amber-800 dark:text-amber-400">
                Kisi ne aap se ooncha bid dediya (Rs {Number(a.myHighestBid).toFixed(0)} tha aap ka)
              </span>
            </div>
          )}

          {isEnded && (
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-neutral-800 text-center">
              <div className="text-sm font-black text-slate-900 dark:text-white">
                Auction Ended
              </div>
              {a.winner && (
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Winner: {a.winner.fullName?.split(' ')[0]}
                </div>
              )}
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800">
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Starting Price</div>
              <div className="font-black text-slate-900 dark:text-white mt-0.5">
                Rs {Number(a.startingPrice).toFixed(0)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800">
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Min Increment</div>
              <div className="font-black text-slate-900 dark:text-white mt-0.5">
                Rs {Number(a.bidIncrement || 100).toFixed(0)}
              </div>
            </div>
          </div>

          {/* Bid history */}
          {a.bids?.length > 0 && (
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
                <Users className="h-3 w-3" /> Bid History
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {a.bids.slice(0, 20).map((bid: any, i: number) => (
                  <div
                    key={bid.id}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg',
                      i === 0 ? 'bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-950/40 dark:to-pink-950/40' : 'bg-slate-50 dark:bg-neutral-800',
                    )}
                  >
                    <Avatar name={bid.customer?.fullName} size="xs" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {bid.customer?.fullName?.split(' ')[0] || 'User'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(bid.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className={cn(
                      'font-black text-sm',
                      i === 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300',
                    )}>
                      Rs {Number(bid.amount).toFixed(0)}
                    </div>
                    {i === 0 && <Trophy className="h-4 w-4 text-amber-500" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky bid bar */}
      {!isEnded && (
        <div className="fixed bottom-20 inset-x-0 z-30 bg-white dark:bg-neutral-950 border-t-2 border-rose-200 dark:border-rose-800 shadow-soft-xl">
          <div className="max-w-6xl mx-auto p-4">
            <div className="text-[10px] font-extrabold text-slate-500 mb-2 text-center">
              Minimum bid: <span className="text-rose-700 dark:text-rose-400">Rs {minBid.toFixed(0)}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`Min: Rs ${minBid.toFixed(0)}`}
                min={minBid}
                className="flex-1 h-12 px-4 rounded-2xl border-2 border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none text-lg font-black bg-white dark:bg-neutral-900"
              />
              <Button
                variant="danger"
                size="lg"
                loading={bidMutation.isPending}
                onClick={() => {
                  const amt = Number(bidAmount);
                  if (!amt || amt < minBid) return toast.error(`Minimum Rs ${minBid}`);
                  bidMutation.mutate();
                }}
                leftIcon={<Gavel className="h-4 w-4" />}
              >
                Place Bid
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[minBid, minBid + 500, minBid + 1000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBidAmount(String(amt))}
                  className="h-9 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-black hover:bg-rose-200 transition"
                >
                  Rs {amt.toFixed(0)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
