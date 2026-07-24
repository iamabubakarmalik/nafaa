import { Link } from 'react-router-dom';
import { Star, Clock, MapPin, Zap, ShieldCheck, Users, Bike } from 'lucide-react';
import { Badge } from '@/ui';
import { formatDistance, formatDuration } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Shop } from '@/types';

interface ShopCardProps {
  shop: Shop;
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
}

const verificationBadges: Record<string, { label: string; color: string; icon?: any }> = {
  GOLD:     { label: 'Gold',     color: 'bg-amber-500/90 text-white' },
  PLATINUM: { label: 'Platinum', color: 'bg-slate-800 text-white' },
  SILVER:   { label: 'Silver',   color: 'bg-slate-400 text-white' },
  BRONZE:   { label: 'Bronze',   color: 'bg-orange-600 text-white' },
};

export function ShopCard({ shop, variant = 'default', className }: ShopCardProps) {
  const link = `/shops/${shop.slug || shop.shopId}`;
  const badge = verificationBadges[shop.verificationLevel];
  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured';

  const isOpen = shop.currentlyOpen ?? shop.isOpen;
  const showFreeDelivery = shop.freeDeliveryAbove && Number(shop.freeDeliveryAbove) > 0;

  return (
    <Link
      to={link}
      className={cn(
        'group relative block bg-surface rounded-3xl border border-border overflow-hidden card-hover',
        isFeatured && 'shadow-soft-lg',
        className,
      )}
    >
      {/* Cover / Logo Header */}
      <div className={cn('relative overflow-hidden bg-gradient-brand', isCompact ? 'h-24' : 'h-32')}>
        {shop.coverUrl && (
          <img src={shop.coverUrl} alt={shop.publicName} className="h-full w-full object-cover" loading="lazy" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Top-left: Verification badge */}
        {badge && (
          <div className={cn('absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-full text-2xs font-black shadow-lg', badge.color)}>
            <ShieldCheck className="h-3 w-3" />
            {badge.label}
          </div>
        )}

        {/* Top-right: Open/Closed */}
        <div className={cn(
          'absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-full text-2xs font-black shadow',
          isOpen ? 'bg-emerald-500/90 text-white' : 'bg-slate-800/80 text-white',
        )}>
          <span className={cn('h-1.5 w-1.5 rounded-full', isOpen ? 'bg-white animate-pulse-soft' : 'bg-white/60')} />
          {isOpen ? 'Open' : 'Closed'}
        </div>

        {/* Logo */}
        <div className="absolute -bottom-6 left-4">
          <div className="h-14 w-14 rounded-2xl bg-surface p-1 shadow-lg ring-2 ring-surface">
            {shop.logoUrl ? (
              <img src={shop.logoUrl} alt="" className="h-full w-full rounded-xl object-cover" />
            ) : (
              <div className="h-full w-full rounded-xl bg-gradient-brand flex items-center justify-center text-white font-black text-lg">
                {shop.publicName?.[0] ?? '?'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={cn('px-4 pt-8 pb-4', isCompact && 'pb-3')}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-black text-content text-sm md:text-base leading-tight line-clamp-1">
            {shop.publicName}
          </h3>
          {shop.ratingCount > 0 && (
            <div className="flex items-center gap-0.5 shrink-0 text-2xs font-black text-content">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span>{shop.ratingAverage.toFixed(1)}</span>
              <span className="text-content-subtle font-medium">({shop.ratingCount})</span>
            </div>
          )}
        </div>

        {shop.tagline && !isCompact && (
          <p className="text-xs text-content-muted line-clamp-1 mb-2">{shop.tagline}</p>
        )}

        {/* Meta row: Distance, delivery time */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs font-semibold text-content-subtle mb-2.5">
          {shop.distanceKm != null && (
            <div className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {formatDistance(shop.distanceKm)}
            </div>
          )}
          {shop.estimatedDeliveryMinutes && (
            <div className="inline-flex items-center gap-1">
              <Bike className="h-3 w-3" />
              {formatDuration(shop.estimatedDeliveryMinutes)}
            </div>
          )}
          {shop.followerCount > 100 && (
            <div className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {shop.followerCount > 1000 ? `${(shop.followerCount / 1000).toFixed(1)}k` : shop.followerCount}
            </div>
          )}
        </div>

        {/* Bottom badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {showFreeDelivery && (
            <Badge variant="brand" size="sm">
              <Zap className="h-2.5 w-2.5" />
              Free delivery
            </Badge>
          )}
          {shop.bargainEnabled && (
            <Badge variant="accent" size="sm">Bargain</Badge>
          )}
          {shop.groupBuyEnabled && (
            <Badge variant="info" size="sm">Group Buy</Badge>
          )}
          {shop.liveShopEnabled && (
            <Badge variant="danger" size="sm">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse-soft" />
              Live
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ShopCardSkeleton() {
  return (
    <div className="bg-surface rounded-3xl border border-border overflow-hidden">
      <div className="h-32 skeleton" />
      <div className="px-4 pt-8 pb-4 space-y-2">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-6 w-24 mt-2" />
      </div>
    </div>
  );
}
