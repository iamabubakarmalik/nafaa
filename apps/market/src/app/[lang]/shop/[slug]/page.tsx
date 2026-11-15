/**
 * Shop page: header (cover, logo, rating, delivery facts, actions), the
 * catalogue laid out by gate (ShopView), opening hours, delivery info and
 * reviews. JSON-LD LocalBusiness with the gate's schema.org type.
 */
import type { Metadata } from 'next';
import { BadgeCheck, Bike, Clock, MapPin, Star, Store, Truck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { GateIcon } from '@/components/market/GateIcon';
import { ShopActions } from '@/components/market/ShopActions';
import { ShopView } from '@/components/market/ShopView';
import { Badge, Img, RatingPill } from '@/components/ui';
import { api } from '@/lib/api';
import { dateOnly, initials, money } from '@/lib/format';
import { pageLang } from '@/lib/page';
import { JsonLd, pageMeta } from '@/lib/seo';
import { GATE_LOOK, SITE_URL } from '@/lib/site';
import type { Gate, ShopDetail } from '@/lib/types';

type Params = Promise<{ lang: string; slug: string }>;

const LD_TYPE: Record<Gate, string> = {
  FOOD: 'Restaurant', GROCERY: 'GroceryStore', PHARMACY: 'Pharmacy', SHOPPING: 'Store', BOOKING: 'LocalBusiness', WHOLESALE: 'WholesaleStore',
};
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const LD_DAY: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

async function load(slug: string): Promise<ShopDetail | null> {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(slug)) return null;
  return api.shop(slug).catch(() => null);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, t } = await pageLang(params);
  const shop = await load((await params).slug);
  if (!shop) return {};
  return pageMeta({
    lang,
    path: `/shop/${shop.slug}`,
    title: `${shop.name}${shop.area ? `, ${shop.area}` : ''} | Nafaa Market`,
    description: t('seo.shopDesc', { shop: shop.name, city: shop.city, tagline: shop.tagline ?? '' }).trim(),
    image: shop.coverUrl ?? shop.logoUrl,
  });
}

/** Today's weekday key in Pakistan time. */
function todayKey() {
  const d = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Karachi' }).format(new Date()).toLowerCase();
  return d.slice(0, 3);
}

export default async function ShopPage({ params }: { params: Params }) {
  const { lang, t, h } = await pageLang(params);
  const shop = await load((await params).slug);
  if (!shop) notFound();
  const products = await api.shopProducts(shop.shopId, { limit: 100 }).catch(() => ({ items: [], total: 0, hasMore: false, categories: [] }));
  const color = GATE_LOOK[shop.gate].color;
  const today = todayKey();
  const hours = shop.workingHours;
  const url = `${SITE_URL}${h(`/shop/${shop.slug}`)}`;

  return (
    <div className="container-page pt-4 md:pt-6">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': LD_TYPE[shop.gate],
          name: shop.name,
          description: shop.description ?? shop.tagline ?? undefined,
          url,
          image: shop.coverUrl ?? shop.logoUrl ?? undefined,
          telephone: shop.phone ?? undefined,
          address: { '@type': 'PostalAddress', streetAddress: shop.address ?? undefined, addressLocality: shop.city, addressCountry: 'PK' },
          geo: shop.lat && shop.lng ? { '@type': 'GeoCoordinates', latitude: shop.lat, longitude: shop.lng } : undefined,
          aggregateRating: shop.ratingCount ? { '@type': 'AggregateRating', ratingValue: shop.rating.toFixed(1), reviewCount: shop.ratingCount } : undefined,
          openingHoursSpecification: hours
            ? DAYS.filter((d) => hours[d] && !hours[d]!.closed).map((d) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: LD_DAY[d], opens: hours[d]!.open, closes: hours[d]!.close }))
            : undefined,
        }}
      />

      <section className="card overflow-hidden">
        <Img src={shop.coverUrl} alt="" color={color} priority sizes="(max-width: 1152px) 100vw, 1152px" className="aspect-[16/7] md:aspect-[16/5]" fallback={<GateIcon gate={shop.gate} className="h-16 w-16 opacity-50" />} />
        <div className="relative px-4 pb-4 md:px-6 md:pb-6">
          <div className="-mt-10 flex items-end gap-4">
            <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-xl font-extrabold shadow-card-lg ring-4 ring-white" style={{ color }}>
              {shop.logoUrl ? <Img src={shop.logoUrl} alt={shop.name} sizes="80px" className="h-full w-full" /> : initials(shop.name) || <Store />}
            </span>
            <div className="min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                {shop.open && !shop.paused ? <Badge tone="green">{t('common.open')}</Badge> : <Badge tone="red">{t('common.closed')}</Badge>}
                {(shop.verification === 'GOLD' || shop.verification === 'PLATINUM') && <BadgeCheck className="h-5 w-5 text-blue-600" aria-label="Verified" />}
              </div>
            </div>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold text-gray-900 md:text-3xl">{shop.name}</h1>
          {shop.tagline && <p className="mt-0.5 text-sm text-gray-600">{shop.tagline}</p>}
          <div className="num mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-700">
            <RatingPill value={shop.rating} count={shop.ratingCount} className="text-sm" />
            {shop.etaMinutes ? <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-gray-400" />{t('common.eta', { min: `${shop.etaMinutes}–${shop.etaMinutes + 10}` })}</span> : null}
            {shop.gate !== 'BOOKING' && <span className="inline-flex items-center gap-1.5"><Bike className="h-4 w-4 text-gray-400" />{shop.deliveryFee ? t('common.deliveryFee', { amount: money(shop.deliveryFee) }) : t('common.freeDelivery')}</span>}
            {shop.minOrder > 0 && <span>{t('shop.minNote', { amount: money(shop.minOrder) })}</span>}
            {shop.flow.courier && <span className="inline-flex items-center gap-1.5"><Truck className="h-4 w-4 text-gray-400" />{t('shop.courier')}</span>}
            {shop.area && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-gray-400" />{[shop.area, shop.city].join(', ')}</span>}
          </div>
          <div className="mt-4">
            <ShopActions shopId={shop.shopId} name={shop.name} phone={shop.phone} whatsapp={shop.whatsapp} />
          </div>
        </div>
      </section>

      <ShopView shop={shop} products={products.items} />

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <section className="card p-5" aria-labelledby="hours">
          <h2 id="hours" className="text-lg font-bold text-gray-900">{t('shop.hours')}</h2>
          {hours === null ? (
            <p className="mt-2 text-sm text-gray-700">{t('shop.allDay')}</p>
          ) : (
            <dl className="mt-3 divide-y divide-gray-100 text-sm">
              {DAYS.map((d) => {
                const v = hours[d];
                return (
                  <div key={d} className={`flex justify-between py-2 ${d === today ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                    <dt>{t(`shop.days.${d}`)}{d === today ? ` · ${t('shop.today')}` : ''}</dt>
                    <dd className="num">{!v || v.closed ? t('common.closed') : `${v.open} – ${v.close}`}</dd>
                  </div>
                );
              })}
            </dl>
          )}
        </section>
        <section className="card p-5" aria-labelledby="info">
          <h2 id="info" className="text-lg font-bold text-gray-900">{t('shop.info')}</h2>
          <dl className="mt-3 space-y-3 text-sm">
            {shop.gate !== 'BOOKING' && (
              <div className="flex items-start gap-3">
                <Bike className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div>
                  <dt className="font-semibold text-gray-900">{t('shop.delivery')}</dt>
                  <dd className="num text-gray-600">
                    {[shop.deliveryFee ? t('common.deliveryFee', { amount: money(shop.deliveryFee) }) : t('common.freeDelivery'), shop.freeDeliveryAbove ? t('cart.freeFrom', { amount: money(shop.freeDeliveryAbove) }) : null, shop.minOrder ? t('shop.minNote', { amount: money(shop.minOrder) }) : null].filter(Boolean).join(' · ')}
                  </dd>
                </div>
              </div>
            )}
            {shop.offersPickup && shop.gate !== 'BOOKING' && (
              <div className="flex items-start gap-3">
                <Store className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div>
                  <dt className="font-semibold text-gray-900">{t('shop.pickup')}</dt>
                  {shop.pickupMinutes ? <dd className="num text-gray-600">{t('common.eta', { min: shop.pickupMinutes })}</dd> : null}
                </div>
              </div>
            )}
            {shop.address && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div>
                  <dt className="font-semibold text-gray-900">{t('shop.address')}</dt>
                  <dd className="text-gray-600">
                    {shop.lat && shop.lng ? (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lng}`} target="_blank" rel="noopener noreferrer" className="hover:text-brand-700 hover:underline">{shop.address}</a>
                    ) : shop.address}
                  </dd>
                </div>
              </div>
            )}
          </dl>
          {shop.description && <p className="mt-4 border-t border-gray-100 pt-4 text-sm text-gray-600">{shop.description}</p>}
        </section>
      </div>

      <section className="mt-4 card p-5" aria-labelledby="reviews">
        <div className="flex items-center justify-between">
          <h2 id="reviews" className="text-lg font-bold text-gray-900">{t('shop.reviews')}</h2>
          {shop.ratingCount > 0 && (
            <span className="num inline-flex items-center gap-1 text-lg font-bold"><Star className="h-5 w-5 fill-amber-400 text-amber-400" />{shop.rating.toFixed(1)}<span className="text-sm font-normal text-gray-500">· {t('common.reviews', { count: shop.ratingCount })}</span></span>
          )}
        </div>
        {shop.reviews.length ? (
          <ul className="mt-3 divide-y divide-gray-100">
            {shop.reviews.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-900">{r.customerName ?? 'Customer'}</span>
                  <span className="text-xs text-gray-400">{dateOnly(r.createdAt, lang)}</span>
                </div>
                <RatingPill value={r.rating} />
                {r.comment && <p className="mt-1 text-sm text-gray-700">{r.comment}</p>}
                {r.reply && <p className="mt-2 rounded-xl bg-gray-50 p-2.5 text-xs text-gray-600"><span className="font-semibold">{shop.name}:</span> {r.reply}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-500">{t('shop.noReviews')}</p>
        )}
      </section>
    </div>
  );
}
