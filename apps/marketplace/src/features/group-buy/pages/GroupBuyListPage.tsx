import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { Users, TrendingDown, Clock, Sparkles } from 'lucide-react';
import { groupBuyApi } from '../api/group-buy.api';
import { EmptyState } from '@shared/ui/EmptyState';
import { SkeletonCard } from '@shared/ui/Skeleton';
import { cn } from '@lib/cn';

export default function GroupBuyListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['market-group-buys'],
    queryFn: () => groupBuyApi.active(),
  });

  return (
    <div className="pb-20 space-y-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-orange-600" />
          Group Buy
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">Milkar sasta khareedain</p>
      </div>

      {/* How it works */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-50 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-yellow-950/20 border border-orange-200 dark:border-orange-800">
        <div className="flex items-start gap-3">
          <div className="text-2xl">👥</div>
          <div>
            <div className="font-extrabold text-sm text-orange-900 dark:text-orange-300">
              Group Buy kya hai?
            </div>
            <p className="text-xs text-orange-700 dark:text-orange-400 mt-1 leading-relaxed">
              Minimum participants pura hone pe sab ko discount milta hai. Jitne zyada log join karein, utne saste products.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard /><SkeletonCard />
        </div>
      ) : !data?.items?.length ? (
        <EmptyState
          emoji="👥"
          title="Koi active group buy nahi"
          description="Baad mein wapas aayen — naye deals aate rehte hain"
          size="lg"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.items.map((gb: any) => <GroupBuyCard key={gb.id} groupBuy={gb} />)}
        </div>
      )}
    </div>
  );
}

function GroupBuyCard({ groupBuy: gb }: { groupBuy: any }) {
  const progress = Math.min(100, (gb.currentCount / gb.minParticipants) * 100);
  const savings = Math.round(((gb.regularPrice - gb.groupPrice) / gb.regularPrice) * 100);
  const hoursLeft = Math.max(0, Math.ceil((new Date(gb.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)));

  return (
    <NavLink
      to={`/group-buys/${gb.id}`}
      className="group rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-orange-200 dark:border-orange-800 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/40 dark:to-amber-950/40 overflow-hidden">
        {gb.product?.marketplaceProfile?.publicImages?.[0] ? (
          <img
            src={gb.product.marketplaceProfile.publicImages[0]}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
            alt=""
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">📦</div>
        )}
        <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-orange-500 text-white text-[10px] font-black shadow flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5" />
          -{savings}% GROUP
        </div>
        <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur text-[10px] font-black shadow flex items-center gap-1">
          <Clock className="h-2.5 w-2.5 text-orange-600" />
          {hoursLeft > 0 ? `${hoursLeft}h left` : 'Ending soon'}
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-sm line-clamp-2 leading-tight min-h-[2.5rem]">
          {gb.product?.marketplaceProfile?.publicName || gb.productName}
        </h3>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-black text-orange-700 dark:text-orange-400">
            Rs {Number(gb.groupPrice).toFixed(0)}
          </span>
          <span className="text-xs text-slate-400 line-through">
            Rs {Number(gb.regularPrice).toFixed(0)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] font-bold mb-1">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Users className="h-3 w-3" />
              {gb.currentCount}/{gb.minParticipants} joined
            </span>
            <span className="text-orange-700 dark:text-orange-400">
              {progress >= 100 ? '✅ Achieved!' : `${(100 - progress).toFixed(0)}% left`}
            </span>
          </div>
          <div className="h-2 bg-orange-100 dark:bg-orange-950/50 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500',
                progress >= 100
                  ? 'bg-gradient-to-r from-success-500 to-success-600'
                  : 'bg-gradient-to-r from-orange-500 to-amber-500',
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </NavLink>
  );
}
