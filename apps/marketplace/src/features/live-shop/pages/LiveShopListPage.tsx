import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { Radio, Eye, Clock, Heart, Play } from 'lucide-react';
import { liveShopApi } from '../api/live-shop.api';
import { EmptyState } from '@shared/ui/EmptyState';
import { SkeletonCard } from '@shared/ui/Skeleton';

export default function LiveShopListPage() {
  const { data: live, isLoading: liveLoading } = useQuery({
    queryKey: ['market-live-now'],
    queryFn: () => liveShopApi.live(),
    refetchInterval: 15_000,
  });

  const { data: upcoming } = useQuery({
    queryKey: ['market-live-upcoming'],
    queryFn: () => liveShopApi.upcoming(),
  });

  return (
    <div className="pb-20 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Radio className="h-6 w-6 text-rose-600 animate-pulse-soft" />
          Live Shopping
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">Video pe products dekho, live pucho, khareedo</p>
      </div>

      {/* Live now */}
      <section>
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          Live Abhi
        </h2>
        {liveLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <SkeletonCard /><SkeletonCard />
          </div>
        ) : !live?.items?.length ? (
          <EmptyState emoji="📺" title="Koi live nahi abhi" description="Baad mein wapas aayen" size="sm" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {live.items.map((ls: any) => <LiveCard key={ls.id} liveShop={ls} isLive />)}
          </div>
        )}
      </section>

      {/* Upcoming */}
      {upcoming?.items?.length > 0 && (
        <section>
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-600" />
            Aane Wali Live Shows
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {upcoming.items.map((ls: any) => <LiveCard key={ls.id} liveShop={ls} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function LiveCard({ liveShop: ls, isLive }: { liveShop: any; isLive?: boolean }) {
  return (
    <NavLink
      to={`/live/${ls.id}`}
      className="group relative rounded-2xl overflow-hidden bg-slate-900 shadow-soft-lg hover:scale-[1.02] transition-transform"
    >
      <div className="aspect-[9/16] relative">
        {ls.thumbnailUrl ? (
          <img src={ls.thumbnailUrl} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-rose-600 via-pink-600 to-purple-700 flex items-center justify-center">
            <Radio className="h-12 w-12 text-white/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {isLive && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-rose-500 text-white text-[10px] font-black shadow flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
        )}

        {isLive && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[10px] font-black flex items-center gap-1">
            <Eye className="h-2.5 w-2.5" />
            {ls.peakViewerCount || ls.currentViewerCount || 0}
          </div>
        )}

        {!isLive && ls.scheduledAt && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-brand-500 text-white text-[10px] font-black shadow flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {new Date(ls.scheduledAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        <div className="absolute bottom-2 left-2 right-2 text-white">
          <div className="font-extrabold text-sm line-clamp-2 leading-tight">
            {ls.title}
          </div>
          <div className="text-[10px] font-bold opacity-80 mt-0.5 truncate">
            {ls.shop?.marketplaceProfile?.publicName}
          </div>
        </div>

        {isLive && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition">
            <div className="h-14 w-14 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow-lg">
              <Play className="h-6 w-6 text-rose-600 fill-rose-600" />
            </div>
          </div>
        )}
      </div>
    </NavLink>
  );
}
