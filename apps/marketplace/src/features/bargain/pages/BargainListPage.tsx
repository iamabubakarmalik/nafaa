import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Clock, CheckCircle2, XCircle, ArrowRight, Store, TrendingDown } from 'lucide-react';
import { bargainApi } from '../api/bargain.api';
import { EmptyState } from '@shared/ui/EmptyState';
import { SkeletonCard } from '@shared/ui/Skeleton';
import { Badge } from '@shared/ui/Badge';
import { cn } from '@lib/cn';

const STATUS_CONFIG: Record<string, { label: string; color: any; icon: any; emoji: string }> = {
  PENDING:         { label: 'Waiting',        color: 'warning', icon: Clock,       emoji: '⏳' },
  COUNTER_OFFERED: { label: 'Counter Offer',  color: 'info',    icon: TrendingDown, emoji: '💬' },
  ACCEPTED:        { label: 'Accepted',       color: 'success', icon: CheckCircle2, emoji: '✅' },
  REJECTED:        { label: 'Rejected',       color: 'danger',  icon: XCircle,      emoji: '❌' },
  EXPIRED:         { label: 'Expired',        color: 'default', icon: Clock,        emoji: '⏰' },
  CONVERTED:       { label: 'Converted',      color: 'brand',   icon: CheckCircle2, emoji: '🛒' },
};

export default function BargainListPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['market-bargains'],
    queryFn: () => bargainApi.list({ limit: 50 }),
  });

  return (
    <div className="pb-20 space-y-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-purple-600" />
          Bargains
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">Aap ki mol-bhaav ki activities</p>
      </div>

      {/* How it works */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-100 via-pink-50 to-rose-50 dark:from-purple-950/30 dark:via-pink-950/20 dark:to-rose-950/20 border border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💰</div>
          <div>
            <div className="font-extrabold text-sm text-purple-900 dark:text-purple-300">
              Bargain kya hai?
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-400 mt-1 leading-relaxed">
              Product pe apna offer bhejain — shop owner accept/counter kar sakta hai. Real-time chat ke saath deal karo!
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <SkeletonCard /><SkeletonCard />
        </div>
      ) : !data?.items?.length ? (
        <EmptyState
          emoji="💬"
          title="Koi bargain nahi"
          description="Products pe 'Bargain' badge dekh kar offer bhejain"
          size="lg"
        />
      ) : (
        <div className="space-y-2">
          {data.items.map((b: any) => {
            const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.PENDING;
            const savings = ((b.originalPrice - (b.finalPrice || b.counterPrice || b.offerPrice)) / b.originalPrice) * 100;

            return (
              <button
                key={b.id}
                onClick={() => navigate(`/bargains/${b.id}`)}
                className="w-full p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 transition text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 rounded-xl bg-slate-100 dark:bg-neutral-800 overflow-hidden shrink-0">
                    {b.product?.marketplaceProfile?.publicImages?.[0] ? (
                      <img src={b.product.marketplaceProfile.publicImages[0]} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl opacity-30">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {b.product?.marketplaceProfile?.publicName || 'Product'}
                      </span>
                      <Badge variant={cfg.color} size="xs">{cfg.emoji} {cfg.label}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                      <Store className="h-2.5 w-2.5" />
                      {b.shop?.marketplaceProfile?.publicName}
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-[10px] text-slate-400 line-through">
                        Rs {Number(b.originalPrice).toFixed(0)}
                      </span>
                      <span className="text-sm font-black text-purple-700 dark:text-purple-400">
                        Rs {Number(b.finalPrice || b.counterPrice || b.offerPrice).toFixed(0)}
                      </span>
                      {savings > 0 && (
                        <span className="text-[10px] font-extrabold text-green-600 dark:text-green-400">
                          -{savings.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 self-center" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
