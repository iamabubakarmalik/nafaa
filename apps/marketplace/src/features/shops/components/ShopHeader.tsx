import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Star, MapPin, Clock, Phone, MessageCircle, Share2, Heart,
  ShieldCheck, Bike, Users, Zap,
} from 'lucide-react';
import { Button, Badge, Avatar } from '@/ui';
import { formatDistance, formatDuration } from '@/lib/format';
import { shopsApi } from '../api/shops.api';
import { shopChatApi } from '@/features/shop-chat/api/shop-chat.api';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import type { Shop } from '@/types';

const verifBadge: Record<string, { label: string; color: string }> = {
  GOLD:     { label: 'Gold verified',     color: 'bg-amber-500 text-white' },
  PLATINUM: { label: 'Platinum partner',  color: 'bg-slate-800 text-white' },
  SILVER:   { label: 'Silver verified',   color: 'bg-slate-400 text-white' },
  BRONZE:   { label: 'Bronze verified',   color: 'bg-orange-600 text-white' },
};

export function ShopHeader({ shop }: { shop: Shop & { isFollowing?: boolean } }) {
  const navigate = useNavigate();
  const messageShop = useMutation({
    mutationFn: () => shopChatApi.getOrCreate(shop.shopId),
    onSuccess: (c) => navigate(`/messages/${c.id}`),
    onError: () => toast.error('Please login first'),
  });
  const qc = useQueryClient();
  const badge = verifBadge[shop.verificationLevel];
  const isOpen = shop.currentlyOpen ?? shop.isOpen;

  const followMutation = useMutation({
    mutationFn: () => shop.isFollowing ? shopsApi.unfollow(shop.shopId) : shopsApi.follow(shop.shopId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shop', shop.shopId] });
      qc.invalidateQueries({ queryKey: ['shop', shop.slug] });
      toast.success(shop.isFollowing ? 'Unfollowed' : 'Following! 💚');
    },
    onError: () => toast.error('Please login first'),
  });

  const shareShop = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: shop.publicName, text: shop.tagline || '', url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  return (
    <div className="relative">
      {/* Cover */}
      <div className="relative h-48 md:h-64 rounded-3xl overflow-hidden bg-gradient-brand">
        {shop.coverUrl && (
          <img src={shop.coverUrl} alt={shop.publicName} className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <button
          onClick={shareShop}
          className="absolute top-4 right-4 h-10 w-10 rounded-2xl bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* Info card */}
      <div className="relative -mt-16 md:-mt-20 mx-4 md:mx-6 bg-surface rounded-3xl border border-border shadow-soft-lg p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {/* Logo */}
          <div className="h-20 w-20 md:h-24 md:w-24 rounded-3xl bg-surface p-1 shadow-soft ring-2 ring-surface -mt-16 md:-mt-20 shrink-0">
            {shop.logoUrl ? (
              <img src={shop.logoUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
            ) : (
              <div className="h-full w-full rounded-2xl bg-gradient-brand flex items-center justify-center text-white font-black text-3xl">
                {shop.publicName[0]}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-black text-content">{shop.publicName}</h1>
                  {badge && (
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-black', badge.color)}>
                      <ShieldCheck className="h-3 w-3" />
                      {badge.label}
                    </span>
                  )}
                </div>
                {shop.tagline && (
                  <p className="text-sm text-content-muted mt-1 line-clamp-2">{shop.tagline}</p>
                )}
              </div>
            </div>

            {/* Rating + stats */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm">
              {shop.ratingCount > 0 && (
                <div className="flex items-center gap-1 font-black">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span>{shop.ratingAverage.toFixed(1)}</span>
                  <span className="text-content-subtle font-medium">({shop.ratingCount} reviews)</span>
                </div>
              )}
              {shop.distanceKm != null && (
                <div className="flex items-center gap-1 text-content-muted font-semibold">
                  <MapPin className="h-4 w-4" />
                  {formatDistance(shop.distanceKm)}
                </div>
              )}
              {shop.estimatedDeliveryMinutes && (
                <div className="flex items-center gap-1 text-content-muted font-semibold">
                  <Bike className="h-4 w-4" />
                  {formatDuration(shop.estimatedDeliveryMinutes)}
                </div>
              )}
              <div className="flex items-center gap-1 text-content-muted font-semibold">
                <Users className="h-4 w-4" />
                {shop.followerCount.toLocaleString()} followers
              </div>
              <div className={cn(
                'flex items-center gap-1 font-black',
                isOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-danger',
              )}>
                <Clock className="h-4 w-4" />
                {isOpen ? 'Open now' : 'Closed'}
              </div>
            </div>

            {/* Feature badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {shop.freeDeliveryAbove && Number(shop.freeDeliveryAbove) > 0 && (
                <Badge variant="brand" size="md">
                  <Zap className="h-3 w-3" />
                  Free delivery above PKR {shop.freeDeliveryAbove}
                </Badge>
              )}
              {shop.bargainEnabled && <Badge variant="accent" size="md">💬 Bargain</Badge>}
              {shop.groupBuyEnabled && <Badge variant="info" size="md">👥 Group buy</Badge>}
              {shop.auctionEnabled && <Badge variant="warning" size="md">⚡ Auctions</Badge>}
              {shop.acceptsCod && <Badge size="md">💵 COD</Badge>}
              {shop.acceptsJazzcash && <Badge size="md">JazzCash</Badge>}
              {shop.acceptsEasypaisa && <Badge size="md">EasyPaisa</Badge>}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Button
                variant={shop.isFollowing ? 'outline' : 'primary'}
                size="md"
                onClick={() => followMutation.mutate()}
                loading={followMutation.isPending}
                leftIcon={<Heart className={cn('h-4 w-4', shop.isFollowing && 'fill-current')} />}
              >
                {shop.isFollowing ? 'Following' : 'Follow'}
              </Button>
              <Button
                variant="secondary"
                size="md"
                leftIcon={<MessageCircle className="h-4 w-4" />}
                onClick={() => messageShop.mutate()}
                loading={messageShop.isPending}
              >
                Message
              </Button>
              {shop.whatsappNumber && (
                <a
                  href={`https://wa.me/${shop.whatsappNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
              {shop.publicPhone && (
                <a
                  href={`tel:${shop.publicPhone}`}
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl bg-surface hover:bg-surface-muted border border-border text-content font-bold text-sm transition"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
