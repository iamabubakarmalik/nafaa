import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Users, ArrowLeft, TrendingDown, Clock, Share2,
  Plus, Minus, CheckCircle2, Sparkles,
} from 'lucide-react';
import { groupBuyApi } from '../api/group-buy.api';
import { Button } from '@shared/ui/Button';
import { Avatar } from '@shared/ui/Avatar';
import { SkeletonCard } from '@shared/ui/Skeleton';
import { cn } from '@lib/cn';

export default function GroupBuyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);

  const { data: gb, isLoading } = useQuery({
    queryKey: ['group-buy', id],
    queryFn: () => groupBuyApi.detail(id!),
    enabled: !!id,
    refetchInterval: 10_000,
  });

  const joinMutation = useMutation({
    mutationFn: () => groupBuyApi.join(id!, quantity),
    onSuccess: () => {
      toast.success('Group buy join ho gaye! 🎉');
      queryClient.invalidateQueries({ queryKey: ['group-buy', id] });
    },
    onError: (err: any) => {
      if (err?.response?.status === 401) {
        toast.error('Pehle login karein');
        navigate('/login');
      } else {
        toast.error(err?.response?.data?.message || 'Error');
      }
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => groupBuyApi.leave(id!),
    onSuccess: () => {
      toast.success('Group buy se leave ho gaye');
      queryClient.invalidateQueries({ queryKey: ['group-buy', id] });
    },
  });

  if (isLoading || !gb) return <SkeletonCard />;

  const progress = Math.min(100, (gb.currentCount / gb.minParticipants) * 100);
  const savings = Math.round(((gb.regularPrice - gb.groupPrice) / gb.regularPrice) * 100);
  const hoursLeft = Math.max(0, Math.ceil((new Date(gb.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)));
  const minutesLeft = Math.max(0, Math.ceil((new Date(gb.expiresAt).getTime() - Date.now()) / (1000 * 60)));
  const isSuccessful = progress >= 100;

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
        <div className="relative aspect-square bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/40 dark:to-amber-950/40 overflow-hidden">
          {gb.product?.marketplaceProfile?.publicImages?.[0] && (
            <img
              src={gb.product.marketplaceProfile.publicImages[0]}
              className="w-full h-full object-cover"
              alt=""
            />
          )}
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-black shadow-lg flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            GROUP BUY -{savings}%
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success('Link copy ho gaya');
            }}
            className="absolute top-3 right-3 h-10 w-10 rounded-xl bg-white/95 backdrop-blur flex items-center justify-center shadow"
          >
            <Share2 className="h-4 w-4 text-slate-700" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            {gb.product?.marketplaceProfile?.publicName || gb.productName}
          </h1>

          {/* Price comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-neutral-800 text-center">
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                Regular Price
              </div>
              <div className="text-lg font-black text-slate-400 line-through">
                Rs {Number(gb.regularPrice).toFixed(0)}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/40 dark:to-amber-950/40 text-center border-2 border-orange-300">
              <div className="text-[9px] font-extrabold uppercase tracking-widest text-orange-700 dark:text-orange-400 mb-1">
                Group Price
              </div>
              <div className="text-lg font-black text-orange-700 dark:text-orange-400">
                Rs {Number(gb.groupPrice).toFixed(0)}
              </div>
            </div>
          </div>

          <div className="text-center text-sm font-extrabold text-success-700 dark:text-success-400">
            💰 Save Rs {Number(gb.regularPrice - gb.groupPrice).toFixed(0)} per item
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-sm font-bold mb-2">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-orange-600" />
                {gb.currentCount} / {gb.minParticipants} joined
              </span>
              <span className={cn(
                'font-black',
                isSuccessful ? 'text-success-600' : 'text-orange-600',
              )}>
                {isSuccessful ? '🎉 Achieved!' : `${(100 - progress).toFixed(0)}% to go`}
              </span>
            </div>
            <div className="h-3 bg-orange-100 dark:bg-orange-950/50 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-1000',
                  isSuccessful
                    ? 'bg-gradient-to-r from-success-500 via-success-600 to-emerald-600'
                    : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600',
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Timer */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 border border-rose-200 dark:border-rose-800 text-center">
            <Clock className="h-5 w-5 text-rose-600 mx-auto mb-1" />
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-rose-700 dark:text-rose-400">
              Time Left
            </div>
            <div className="text-xl font-black text-rose-700 dark:text-rose-400 mt-1">
              {hoursLeft >= 1 ? `${hoursLeft} hours` : `${minutesLeft} minutes`}
            </div>
          </div>

          {/* Participants preview */}
          {gb.participants?.length > 0 && (
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">
                Recent Joiners
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {gb.participants.slice(0, 8).map((p: any) => (
                  <div key={p.id} className="flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full bg-slate-100 dark:bg-neutral-800">
                    <Avatar name={p.customer?.fullName} size="xs" />
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {p.customer?.fullName?.split(' ')[0] || 'User'}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold">×{p.quantity}</span>
                  </div>
                ))}
                {gb.participants.length > 8 && (
                  <span className="text-[11px] font-extrabold text-slate-500">
                    +{gb.participants.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Join Bar */}
      <div className="fixed bottom-20 inset-x-0 z-30 bg-white dark:bg-neutral-950 border-t-2 border-orange-200 dark:border-orange-800 shadow-soft-xl">
        <div className="max-w-6xl mx-auto p-4">
          {gb.isJoined ? (
            <div className="space-y-2">
              <div className="text-center text-sm font-extrabold text-success-700 dark:text-success-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Aap join kar chuke hain (×{gb.myQuantity || 1})
              </div>
              <Button
                variant="outline"
                fullWidth
                onClick={() => leaveMutation.mutate()}
                loading={leaveMutation.isPending}
              >
                Leave Group Buy
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center border-2 border-orange-300 dark:border-orange-700 rounded-full">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-10 w-10 flex items-center justify-center"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center font-black tabular-nums">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-10 w-10 flex items-center justify-center"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button
                variant="gradient"
                size="lg"
                fullWidth
                loading={joinMutation.isPending}
                onClick={() => joinMutation.mutate()}
                leftIcon={<Users className="h-4 w-4" />}
              >
                Join · Rs {(gb.groupPrice * quantity).toFixed(0)}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
