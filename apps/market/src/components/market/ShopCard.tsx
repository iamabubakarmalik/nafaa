/** Shop card for lists and carousels: cover, logo, rating, ETA, fee, min order, open state. */
import { Bike, Clock, Store } from 'lucide-react';
import Link from 'next/link';
import { Badge, Img, RatingPill, cn } from '@/components/ui';
import { money, initials } from '@/lib/format';
import type { TFn } from '@/lib/i18n';
import { GATE_LOOK } from '@/lib/site';
import type { ShopSummary } from '@/lib/types';
import { GateIcon } from './GateIcon';

export function ShopCard({ shop, t, href, compact, priority }: { shop: ShopSummary; t: TFn; href: (p: string) => string; compact?: boolean; priority?: boolean }) {
  const color = GATE_LOOK[shop.gate]?.color ?? '#9333ea';
  const closed = !shop.open || shop.paused;
  return (
    <Link
      href={href(`/shop/${shop.slug}`)}
      className={cn('card group block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-card-lg', compact && 'w-[260px] shrink-0 sm:w-[280px]')}
    >
      <div className="relative">
        <Img
          src={shop.coverUrl}
          alt=""
          color={color}
          priority={priority}
          sizes={compact ? '280px' : '(max-width: 768px) 100vw, 33vw'}
          className={cn('aspect-[16/8]', closed && 'grayscale-[60%]')}
          fallback={<GateIcon gate={shop.gate} className="h-10 w-10 opacity-60" />}
        />
        {closed && (
          <span className="absolute inset-0 grid place-items-center bg-black/35">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-900">{t('common.closed')}</span>
          </span>
        )}
        {shop.freeDeliveryAbove !== null || shop.deliveryFee === 0 ? (
          <span className="absolute start-2 top-2"><Badge tone="brand" className="shadow-card">{t('common.freeDelivery')}</Badge></span>
        ) : null}
        <span className="absolute -bottom-5 start-3 grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-white text-sm font-bold shadow-card ring-2 ring-white" style={{ color }}>
          {shop.logoUrl ? <Img src={shop.logoUrl} alt="" sizes="48px" className="h-full w-full" /> : initials(shop.name) || <Store className="h-5 w-5" />}
        </span>
      </div>
      <div className="px-3 pb-3 pt-6">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-bold text-gray-900 group-hover:text-brand-700">{shop.name}</h3>
          <RatingPill value={shop.rating} count={shop.ratingCount} className="shrink-0" />
        </div>
        <p className="line-clamp-1 text-xs text-gray-500">{shop.tagline || [shop.area, shop.city].filter(Boolean).join(', ')}</p>
        <div className="num mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
          {shop.etaMinutes ? (
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{t('common.eta', { min: `${shop.etaMinutes}–${shop.etaMinutes + 10}` })}</span>
          ) : null}
          {shop.gate !== 'BOOKING' && (
            <span className="inline-flex items-center gap-1">
              <Bike className="h-3.5 w-3.5" aria-hidden />
              {shop.deliveryFee ? money(shop.deliveryFee) : t('common.free')}
            </span>
          )}
          {shop.minOrder > 0 && <span>{t('common.minOrder', { amount: money(shop.minOrder) })}</span>}
          {shop.distanceKm !== null && <span>{t('common.km', { km: shop.distanceKm })}</span>}
        </div>
      </div>
    </Link>
  );
}
