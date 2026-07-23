import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { Gavel, Clock, TrendingUp, Users, Flame } from 'lucide-react';
import { auctionApi } from '../api/auction.api';
import { EmptyState } from '@shared/ui/EmptyState';
import { SkeletonCard } from '@shared/ui/Skeleton';

export default function AuctionListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['market-auctions'],
    queryFn: () => auctionApi.active(),
    refetchInterval: 5000,
  });

  return (
    <div className="pb-20 space-y-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Gavel className="h-6 w-6 text-rose-600" />
          Live Auctions
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">Live bidding — sab se ooncha wins!</p>
      </div>

      <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-100 via-red-50 to-orange-50 dark:from-rose-950/30 dark:via-red-950/20 dark:to-orange-950/20 border border-rose-200 dark:border-rose-800">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🔨</div>
          <div>
            <div className="font-extrabold text-sm text-rose-900 dark:text-rose-300">
              Auction kaise chalta hai?
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-400 mt-1 leading-relaxed">
              Real-time bidding — sab se ooncha bid dene wala jeetta hai. Bids automatic update hote hain!
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
          emoji="🔨"
          title="Koi live auction nahi"
          description="Baad mein wapas aayen"
          size="lg"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.items.map((a: any) => <AuctionCard key={a.id} auction={a} />)}
        </div>
      )}
    </div>
  );
}

function AuctionCard({ auction: a }: { auction: any }) {
  const timeLeft = Math.max(0, new Date(a.endsAt).getTime() - Date.now());
  const minutesLeft = Math.floor(timeLeft / 60000);
  const isHot = minutesLeft < 10;

  return (
    <NavLink
      to={`/auctions/${a.id}`}
      className="group rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-rose-200 dark:border-rose-800 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all"
    >
      <div className="relative aspect-square bg-slate-100 dark:bg-neutral-800 overflow-hidden">
        {a.product?.marketplaceProfile?.publicImages?.[0] ? (
          <img
            src={a.product.marketplaceProfile.publicImages[0]}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
            alt=""
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">🔨</div>
        )}
        <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-rose-500 text-white text-[10px] font-black shadow flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </div>
        {isHot && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-orange-500 text-white text-[10px] font-black shadow flex items-center gap-1 animate-pulse-soft">
            <Flame className="h-2.5 w-2.5" />
            HOT
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-sm line-clamp-2 leading-tight min-h-[2.5rem]">
          {a.product?.marketplaceProfile?.publicName}
        </h3>

        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
              Current Bid
            </div>
            <div className="text-lg font-black text-rose-700 dark:text-rose-400">
              Rs {Number(a.currentBid || a.startingPrice).toFixed(0)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
              Bids
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-rose-600" />
              {a.bidCount || 0}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-center gap-1 text-[11px] font-extrabold text-rose-700 dark:text-rose-400">
          <Clock className="h-3 w-3" />
          {minutesLeft > 60 ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m` : `${minutesLeft}m`} left
        </div>
      </div>
    </NavLink>
  );
}
