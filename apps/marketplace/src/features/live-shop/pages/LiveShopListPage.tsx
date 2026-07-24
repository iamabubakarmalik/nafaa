import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Video, Users, Clock, Sparkles } from 'lucide-react';
import { liveShopApi } from '../api/live-shop.api';
import { Card, Badge, EmptyState } from '@/ui';
import { timeAgo } from '@/lib/format';

function LiveCard({ live }: { live: any }) {
  return (
    <Link to={`/live/${live.id}`} className="relative rounded-3xl overflow-hidden group border border-border shadow-soft-lg block card-hover">
      <div className="aspect-[4/5] relative bg-gradient-to-br from-rose-500 to-danger">
        {live.coverImageUrl && (
          <img src={live.coverImageUrl} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {live.isLive ? (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-danger text-white text-2xs font-black shadow-lg">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse-soft" />
            LIVE
          </div>
        ) : (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-2xs font-black backdrop-blur-sm">
            <Clock className="h-3 w-3" />
            SOON
          </div>
        )}

        <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-2xs font-bold backdrop-blur-sm">
          <Users className="h-3 w-3" />
          {live.peakViewerCount || 0}
        </div>

        <div className="absolute bottom-4 inset-x-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            {live.shopProfile?.logoUrl && (
              <img src={live.shopProfile.logoUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-white" />
            )}
            <div className="text-xs font-black">{live.shopProfile?.publicName}</div>
          </div>
          <div className="text-base font-black line-clamp-2">{live.title}</div>
          {live.isStartingSoon && !live.isLive && (
            <div className="mt-1 text-2xs bg-accent-500 text-white px-2 py-0.5 rounded-full inline-block font-black">
              Starting soon
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function LiveShopListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['live-shops'],
    queryFn: () => liveShopApi.list({ limit: 50 }),
  });

  const liveNow = data?.items?.filter((l: any) => l.isLive) || [];
  const upcoming = data?.items?.filter((l: any) => !l.isLive) || [];

  return (
    <>
      <Helmet><title>Live Shops — Nafaa Bazaar</title></Helmet>

      <div className="space-y-6">
        {/* Hero */}
        <Card className="p-5 md:p-6 bg-gradient-to-br from-rose-500 via-red-500 to-pink-600 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-black mb-3">
              <Video className="h-3.5 w-3.5" />
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse-soft" />
              Live streaming
            </div>
            <h1 className="text-2xl md:text-4xl font-black leading-tight mb-2">
              Live Shopping
            </h1>
            <p className="text-white/90 text-sm md:text-base">
              Watch shop hosts showcase products live. Chat, ask, and buy in real-time!
            </p>
          </div>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[4/5] rounded-3xl" />
            ))}
          </div>
        ) : (
          <>
            {liveNow.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg md:text-xl font-black text-content flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-danger animate-pulse-soft" />
                  Live Now
                  <Badge variant="danger" size="lg">{liveNow.length}</Badge>
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {liveNow.map((l: any) => <LiveCard key={l.id} live={l} />)}
                </div>
              </div>
            )}

            {upcoming.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg md:text-xl font-black text-content flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent-500" />
                  Upcoming
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {upcoming.map((l: any) => <LiveCard key={l.id} live={l} />)}
                </div>
              </div>
            )}

            {!liveNow.length && !upcoming.length && (
              <EmptyState
                icon={Video}
                title="No live shows right now"
                description="Follow shops to get notified when they go live"
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
