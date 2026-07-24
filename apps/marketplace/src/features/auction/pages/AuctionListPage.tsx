import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import { Zap, Clock, TrendingUp, Users, Package } from 'lucide-react';
import { auctionApi } from '../api/auction.api';
import { Card, Badge, EmptyState } from '@/ui';
import { formatPrice } from '@/lib/format';
import { useCountdown, formatCountdown } from '@/hooks/useCountdown';
import { cn } from '@/lib/cn';

function AuctionCard({ a }: { a: any }) {
  const cd = useCountdown(a.endsAt);
  const isEndingSoon = !cd.expired && cd.total < 60 * 60 * 1000;
  const isLive = a.status === 'LIVE';

  return (
    <Link to={`/auctions/${a.id}`}>
      <Card className="overflow-hidden hover:shadow-soft-lg transition group card-hover">
        <div className="aspect-[4/3] bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 relative">
          {a.imageUrls?.[0] && (
            <img src={a.imageUrls[0]} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
          )}
          <div className="absolute top-2 left-2">
            {isLive ? (
              <Badge variant="danger" size="md" className="shadow-md">
                <Zap className="h-3 w-3" />
                LIVE
              </Badge>
            ) : (
              <Badge variant="warning" size="md" className="shadow-md">
                <Clock className="h-3 w-3" />
                SOON
              </Badge>
            )}
          </div>
          {isEndingSoon && isLive && (
            <div className="absolute top-2 right-2 animate-pulse-soft">
              <Badge variant="danger" size="md" className="shadow-md">
                🔥 Ending soon
              </Badge>
            </div>
          )}
        </div>

        <div className="p-3 space-y-2">
          <h3 className="font-black text-sm line-clamp-2 min-h-[2.5rem]">{a.title}</h3>

          {isLive ? (
            <>
              <div>
                <div className="text-2xs text-content-muted font-bold uppercase">Current bid</div>
                <div className="text-lg font-black gradient-text-accent">
                  {formatPrice(a.currentPrice)}
                </div>
              </div>
              <div className="flex items-center justify-between text-2xs">
                <span className="text-content-muted font-bold flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" />
                  {a.bidCount} bids
                </span>
                {!cd.expired && (
                  <span className={cn(
                    'font-black tabular-nums',
                    isEndingSoon ? 'text-danger animate-pulse' : 'text-accent-600',
                  )}>
                    ⏱ {formatCountdown(cd)}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="text-2xs text-content-muted font-bold uppercase">Starting from</div>
                <div className="text-lg font-black text-content">
                  {formatPrice(a.startingPrice)}
                </div>
              </div>
              <div className="text-2xs text-content-muted font-bold">
                Starts {new Date(a.startsAt).toLocaleString('en-PK', {
                  weekday: 'short', hour: 'numeric', minute: 'numeric',
                })}
              </div>
            </>
          )}
        </div>
      </Card>
    </Link>
  );
}

export default function AuctionListPage() {
  const [tab, setTab] = useState<'live' | 'scheduled' | 'my-bids' | 'my-wins'>('live');

  const { data: liveData, isLoading: loadingLive } = useQuery({
    queryKey: ['auctions', 'live'],
    queryFn: () => auctionApi.list({ status: 'LIVE', limit: 50 }),
    enabled: tab === 'live',
  });

  const { data: scheduledData } = useQuery({
    queryKey: ['auctions', 'scheduled'],
    queryFn: () => auctionApi.list({ status: 'SCHEDULED', limit: 50 }),
    enabled: tab === 'scheduled',
  });

  const { data: myBidsData } = useQuery({
    queryKey: ['my-bids'],
    queryFn: () => auctionApi.myBids(),
    enabled: tab === 'my-bids',
  });

  const { data: myWinsData } = useQuery({
    queryKey: ['my-wins'],
    queryFn: () => auctionApi.myWins(),
    enabled: tab === 'my-wins',
  });

  const currentData = tab === 'live' ? liveData
    : tab === 'scheduled' ? scheduledData
    : null;

  return (
    <>
      <Helmet><title>Auctions — Nafaa Bazaar</title></Helmet>

      <div className="space-y-5">
        {/* Hero */}
        <Card className="p-5 md:p-6 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-black mb-3">
              <Zap className="h-3.5 w-3.5 fill-current" />
              Live Bidding
            </div>
            <h1 className="text-2xl md:text-4xl font-black leading-tight mb-2">
              Auctions
            </h1>
            <p className="text-white/90 text-sm md:text-base">
              Bid on unique items. Highest bidder wins!
            </p>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-border">
          {([
            { key: 'live', label: '🔴 Live now' },
            { key: 'scheduled', label: '⏰ Upcoming' },
            { key: 'my-bids', label: '💰 My bids' },
            { key: 'my-wins', label: '🏆 My wins' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'shrink-0 px-4 py-3 text-sm font-black border-b-2 transition',
                tab === t.key
                  ? 'border-accent-500 text-accent-600 dark:text-accent-400'
                  : 'border-transparent text-content-muted hover:text-content',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        {(tab === 'live' || tab === 'scheduled') && (
          <>
            {loadingLive ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton aspect-[4/5] rounded-3xl" />
                ))}
              </div>
            ) : !currentData?.items.length ? (
              <EmptyState
                icon={Zap}
                title={tab === 'live' ? 'No live auctions right now' : 'No upcoming auctions'}
                description="Check back later for new items"
              />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentData.items.map((a: any) => <AuctionCard key={a.id} a={a} />)}
              </div>
            )}
          </>
        )}

        {tab === 'my-bids' && (
          <div className="space-y-3">
            {myBidsData?.items?.length ? (
              myBidsData.items.map((b: any) => (
                <Link key={b.id} to={`/auctions/${b.auction.id}`}>
                  <Card className="p-4 hover:shadow-soft-lg transition">
                    <div className="flex items-center gap-3">
                      {b.auction.imageUrls?.[0] && (
                        <img src={b.auction.imageUrls[0]} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm line-clamp-1">{b.auction.title}</div>
                        <div className="text-2xs text-content-muted mt-0.5">
                          Your bid: <span className="font-black text-accent-600">{formatPrice(b.amount)}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {b.isWinning ? (
                            <Badge variant="success" size="sm">🏆 Winning</Badge>
                          ) : b.isCurrentHighest ? (
                            <Badge variant="brand" size="sm">Highest</Badge>
                          ) : (
                            <Badge variant="warning" size="sm">Outbid</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            ) : (
              <EmptyState icon={TrendingUp} title="No bids yet" description="Bid on auctions to see them here" />
            )}
          </div>
        )}

        {tab === 'my-wins' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {myWinsData?.items?.length ? (
              myWinsData.items.map((a: any) => <AuctionCard key={a.id} a={a} />)
            ) : (
              <EmptyState icon={Package} title="No wins yet" description="Keep bidding to win!" />
            )}
          </div>
        )}
      </div>
    </>
  );
}
