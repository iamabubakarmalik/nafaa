import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Users, TrendingDown, Clock, CheckCircle2 } from 'lucide-react';
import { groupBuyApi } from '../api/group-buy.api';
import { Card, Badge, EmptyState } from '@/ui';
import { formatPrice } from '@/lib/format';
import { useCountdown, formatCountdown } from '@/hooks/useCountdown';

function GroupBuyCard({ gb }: { gb: any }) {
  const cd = useCountdown(gb.expiresAt);
  const progress = Math.min(100, gb.progressPercent || 0);
  const isSuccess = gb.currentCount >= gb.minParticipants;

  return (
    <Link to={`/group-buys/${gb.id}`}>
      <Card className="overflow-hidden hover:shadow-soft-lg transition group card-hover">
        {/* Image */}
        <div className="aspect-square bg-surface-muted relative overflow-hidden">
          {gb.imageUrl && (
            <img src={gb.imageUrl} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
          )}
          <div className="absolute top-2 left-2 flex gap-1">
            <Badge variant="info" size="md" className="shadow-md">
              <Users className="h-3 w-3" />
              GROUP BUY
            </Badge>
          </div>
          {gb.savingsPercent > 0 && (
            <div className="absolute top-2 right-2">
              <Badge variant="danger" size="md" className="shadow-md">
                −{gb.savingsPercent}%
              </Badge>
            </div>
          )}
          {gb.hasJoined && (
            <div className="absolute bottom-2 right-2">
              <Badge variant="success" size="md" className="shadow-md">
                <CheckCircle2 className="h-3 w-3" />
                Joined
              </Badge>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          <h3 className="font-black text-content text-sm line-clamp-2">{gb.productName}</h3>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="font-black text-brand-600 dark:text-brand-400 text-lg">
              {formatPrice(gb.groupPrice)}
            </span>
            <span className="text-xs text-content-subtle line-through">
              {formatPrice(gb.regularPrice)}
            </span>
          </div>

          {/* Progress bar */}
          <div>
            <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
              <div
                className={`h-full transition-all ${isSuccess ? 'bg-brand-500' : 'bg-info'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-2xs font-bold">
              <span className="text-content">
                {gb.currentCount}/{gb.minParticipants} joined
              </span>
              {isSuccess ? (
                <span className="text-brand-600 dark:text-brand-400 flex items-center gap-0.5">
                  <CheckCircle2 className="h-3 w-3" />
                  Success!
                </span>
              ) : (
                <span className="text-content-muted">
                  {gb.remainingToTarget} more needed
                </span>
              )}
            </div>
          </div>

          {/* Countdown */}
          {!cd.expired && (
            <div className="flex items-center gap-1 text-2xs text-content-muted font-bold">
              <Clock className="h-3 w-3" />
              Ends in {formatCountdown(cd)}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

export default function GroupBuyListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['group-buys'],
    queryFn: () => groupBuyApi.list({ limit: 50 }),
  });

  return (
    <>
      <Helmet><title>Group Buy Deals — Nafaa Bazaar</title></Helmet>

      <div className="space-y-5">
        {/* Hero */}
        <Card className="p-5 md:p-6 bg-gradient-to-br from-info to-blue-700 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-black mb-3">
              <Users className="h-3.5 w-3.5" />
              Better together
            </div>
            <h1 className="text-2xl md:text-4xl font-black leading-tight mb-2">
              Group Buy Deals
            </h1>
            <p className="text-blue-50 text-sm md:text-base">
              Join others to unlock massive discounts. More people = lower price!
            </p>
          </div>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[3/4] rounded-3xl" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={Users}
            title="No active group buys"
            description="Check back later for new deals"
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.items.map((gb: any) => <GroupBuyCard key={gb.id} gb={gb} />)}
          </div>
        )}
      </div>
    </>
  );
}
