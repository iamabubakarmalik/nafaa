/**
 * Home: location-aware gate tiles, "Order again", nearby open shops per gate,
 * deals, and top rated shops. Server rendered from cached API reads.
 */
import type { Metadata } from 'next';
import { ArrowRight, Store } from 'lucide-react';
import { GateTile } from '@/components/market/GateTile';
import { ProductCard } from '@/components/market/ProductCard';
import { ReorderRow } from '@/components/market/ReorderRow';
import { Section } from '@/components/market/Section';
import { ShopCard } from '@/components/market/ShopCard';
import { SearchBox } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { pick } from '@/lib/i18n';
import { pageLang, readLoc, type LangParams } from '@/lib/page';
import { pageMeta } from '@/lib/seo';
import { SIGNUP_URL } from '@/lib/site';
import type { DiscoverData, MarketConfig, Page, ShopSummary } from '@/lib/types';

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const { lang, t } = await pageLang(params);
  return pageMeta({ lang, path: '/', title: t('seo.homeTitle'), description: t('seo.homeDesc') });
}

const EMPTY: DiscoverData = { nearbyShops: [], featuredShops: [], trendingProducts: [] };
const NO_SHOPS: Page<ShopSummary> = { items: [], total: 0, hasMore: false };

export default async function HomePage({ params }: { params: LangParams }) {
  const { lang, t, h } = await pageLang(params);
  const loc = await readLoc();
  const where = { city: loc?.city, lat: loc?.lat, lng: loc?.lng };
  const config: MarketConfig = await api.config().catch(() => ({ gates: [], payments: ['cod'], launchCities: [] }));
  const gates = config.gates.filter((g) => !g.businessOnly);
  const [discover, topRated, ...perGate] = await Promise.all([
    api.discover(where).catch(() => EMPTY),
    api.shops({ ...where, sort: 'rating', limit: 10 }).catch(() => NO_SHOPS),
    ...gates.map((g) => api.shops({ ...where, gate: g.id, onlyOpen: true, limit: 10 }).catch(() => NO_SHOPS)),
  ]);
  const deals = discover.trendingProducts.filter((p) => p.compareAt && p.compareAt > p.price);
  const offers = deals.length >= 3 ? deals : discover.trendingProducts;

  return (
    <div className="container-page pt-4 md:pt-8">
      <section className="relative overflow-hidden rounded-3xl bg-brand-gradient px-5 py-6 text-white shadow-brand md:px-10 md:py-10">
        <div className="relative z-10 max-w-xl">
          <h1 className="text-2xl font-extrabold leading-tight md:text-4xl">{t('home.heroTitle')}</h1>
          <p className="mt-2 text-sm text-white/85 md:text-base">{t('home.heroSub')}</p>
          <SearchBox className="mt-5 hidden md:block [&_label]:bg-white [&_label]:shadow-soft" />
        </div>
        <div className="pointer-events-none absolute -end-10 -top-16 h-56 w-56 rounded-full bg-white/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 end-24 h-44 w-44 rounded-full bg-white/10" aria-hidden />
      </section>

      <Section title={t('home.gatesTitle')}>
        <div className="grid grid-cols-3 gap-2.5 md:grid-cols-6 md:gap-4">
          {config.gates.map((g) => (
            <GateTile key={g.id} gate={g} lang={lang} href={h(`/${g.slug}`)} />
          ))}
        </div>
      </Section>

      <ReorderRow />

      {discover.nearbyShops.length > 0 && (
        <Section title={t('home.nearbyTitle')}>
          <div className="scroll-x">
            {discover.nearbyShops.slice(0, 10).map((s, i) => (
              <ShopCard key={s.shopId} shop={s} t={t} href={h} compact priority={i < 2} />
            ))}
          </div>
        </Section>
      )}

      {offers.length > 0 && (
        <Section title={t('home.offersTitle')} more={{ href: h('/search?tab=products&sale=1'), label: t('common.seeAll') }}>
          <div className="scroll-x">
            {offers.slice(0, 12).map((p) => (
              <ProductCard key={p.productId} product={p} showShop className="w-[160px] shrink-0 md:w-[180px]" />
            ))}
          </div>
        </Section>
      )}

      {gates.map((g, i) => {
        const list = perGate[i]?.items ?? [];
        if (!list.length) return null;
        return (
          <Section key={g.id} title={pick(g.label, lang)} more={{ href: h(`/${g.slug}`), label: t('common.seeAll') }}>
            <div className="scroll-x">
              {list.map((s) => (
                <ShopCard key={s.shopId} shop={s} t={t} href={h} compact />
              ))}
            </div>
          </Section>
        );
      })}

      {topRated.items.length > 0 && (
        <Section title={t('home.topRatedTitle')}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topRated.items.slice(0, 6).map((s) => (
              <ShopCard key={s.shopId} shop={s} t={t} href={h} />
            ))}
          </div>
        </Section>
      )}

      <section className="mt-10 flex flex-col items-start gap-4 rounded-3xl bg-white p-6 shadow-card ring-1 ring-gray-200 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700"><Store className="h-6 w-6" /></span>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('home.sellCta')}</h2>
            <p className="mt-1 text-sm text-gray-600">{t('home.sellSub')}</p>
          </div>
        </div>
        <a href={SIGNUP_URL} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-brand hover:bg-brand-700">
          {t('home.sellBtn')}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </a>
      </section>
    </div>
  );
}
