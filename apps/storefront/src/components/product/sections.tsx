/**
 * Product template sections: main_product, product_recommendations,
 * bought_together, product_reviews. They read the product the page loaded
 * (data.product) and fetch their own extras.
 */
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate, href } from '@/lib/format';
import { t } from '@/lib/i18n';
import { reader } from '@/lib/settings';
import { PRODUCT_BLOCKS } from '@/lib/theme/defaults';
import { Stars } from '../ui/Stars';
import { ProductRow } from '../sections/ProductGrid';
import { SectionHeading } from '../sections/SectionHeading';
import type { SectionProps } from '../sections/types';
import { BoughtTogetherClient } from './BoughtTogether';
import { ProductMain } from './ProductMain';

export function MainProduct({ section, ctx, data }: SectionProps) {
  const p = data?.product;
  if (!p) return null;
  const r = reader(section, ctx.lang);
  const blocks = section.blocks?.length ? section.blocks : PRODUCT_BLOCKS;
  return (
    <section className="pb-12 pt-4 md:pb-20 md:pt-6">
      <div className="page">
        <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-[12.5px] text-muted md:mb-6">
          {p.breadcrumbs.map((b, i) => (
            <span key={b.url} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={13} className="rtl:rotate-180" />}
              {i < p.breadcrumbs.length - 1 ? (
                <Link href={href(ctx.lang, b.url)} className="hover:text-fg">
                  {b.url === '/' ? t(ctx.lang, 'nav.home') : b.title}
                </Link>
              ) : (
                <span className="line-clamp-1 text-fg/70">{b.title}</span>
              )}
            </span>
          ))}
        </nav>
        <ProductMain
          product={p}
          blocks={blocks}
          galleryLayout={r.pick('galleryLayout', ['thumbnails', 'grid', 'slider'] as const, r.raw('gallery') === 'grid' ? 'grid' : 'thumbnails')}
          zoom={r.bool('zoom', true)}
          stickyInfo={r.bool('stickyInfo', true)}
          variantStyle={r.pick('variantStyle', ['buttons', 'dropdown', 'swatches'] as const, 'buttons')}
          url={`${ctx.origin}${p.url}`}
        />
      </div>
    </section>
  );
}

export async function ProductRecommendations({ section, ctx, data }: SectionProps) {
  const p = data?.product;
  const r = reader(section, ctx.lang);
  const limit = Math.max(2, Math.min(12, r.num('limit', 8)));
  // Outside a product page (cart template): the shop's best sellers.
  const items = p ? p.related.slice(0, limit) : (await api.products(ctx.storeId, { sort: 'best_selling', limit }, ctx.opts)).items;
  if (!items.length) return null;
  return (
    <section className="section-y overflow-hidden border-t border-line">
      <div className="page">
        <SectionHeading title={r.text('heading', t(ctx.lang, 'product.related'))} />
        <ProductRow items={items} ctx={ctx} />
      </div>
    </section>
  );
}

export async function BoughtTogether({ section, ctx, data }: SectionProps) {
  const p = data?.product;
  if (!p || p.availability === 'out_of_stock') return null;
  const r = reader(section, ctx.lang);
  const items = (await api.together(ctx.storeId, p.handle, Math.max(1, Math.min(4, r.num('limit', 3))), ctx.opts)).filter((x) => x.availability !== 'out_of_stock');
  if (!items.length) return null;
  const main = { id: p.id, handle: p.handle, title: p.title, url: p.url, image: p.image, secondImage: null, price: p.price, compareAtPrice: p.compareAtPrice, priceMax: p.priceMax, onSale: p.onSale, badges: [], availability: p.availability, leadTime: p.leadTime, brand: p.brand, category: p.category, rating: null, hasVariants: p.hasVariants, firstVariantId: p.firstVariantId };
  return (
    <section className="section-y border-t border-line">
      <div className="page max-w-4xl">
        <SectionHeading title={r.text('heading', t(ctx.lang, 'product.boughtTogether'))} />
        <BoughtTogetherClient items={[main, ...items]} />
      </div>
    </section>
  );
}

export async function ProductReviews({ section, ctx, data }: SectionProps) {
  const p = data?.product;
  if (!p || !ctx.boot.reviews.enabled) return null;
  const r = reader(section, ctx.lang);
  const rv = await api.reviews(ctx.storeId, p.handle, 1, ctx.opts);
  const count = rv?.count ?? 0;
  if (!count && r.bool('hideWhenEmpty', true)) return null;
  const avg = rv?.average ?? 0;
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: rv?.items.filter((x) => Math.round(x.rating) === s).length ?? 0 }));
  const shown = rv?.items.length ?? 0;
  return (
    <section id="reviews" className="section-y scroll-mt-24 border-t border-line">
      <div className="page grid gap-10 md:grid-cols-[300px_1fr]">
        <div>
          <h2 className="h-section">{r.text('heading', t(ctx.lang, 'product.reviews'))}</h2>
          {count > 0 ? (
            <div className="mt-4">
              <div className="flex items-end gap-3">
                <span className="font-heading text-5xl font-semibold">{avg.toFixed(1)}</span>
                <span className="pb-1.5">
                  <Stars value={avg} size={18} />
                  <span className="mt-0.5 block text-[13px] text-muted">{t(ctx.lang, 'product.reviewsCount', { n: count })}</span>
                </span>
              </div>
              {shown > 0 && (
                <ul className="mt-5 space-y-1.5">
                  {dist.map((d) => (
                    <li key={d.s} className="flex items-center gap-2 text-[12.5px] text-muted">
                      <span className="w-3">{d.s}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-fg/10">
                        <span className="block h-full rounded-full bg-amber-500" style={{ width: `${(d.n / shown) * 100}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="mt-3 text-[14px] text-muted">{t(ctx.lang, 'product.noReviews')}</p>
          )}
        </div>
        {shown > 0 && (
          <ul className="divide-y divide-line">
            {rv!.items.map((x, i) => (
              <li key={i} className="py-5 first:pt-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-[14px] font-semibold">{x.name.slice(0, 1)}</span>
                    <span>
                      <span className="block text-[14px] font-semibold">{x.name}</span>
                      {x.verified && <span className="block text-[12px] text-ok">{t(ctx.lang, 'product.verified')}</span>}
                    </span>
                  </span>
                  <span className="text-[12.5px] text-muted">{formatDate(x.date, ctx.lang)}</span>
                </div>
                <Stars value={x.rating} size={14} className="mt-3" />
                {x.comment && <p className="mt-2 text-[15px] leading-relaxed text-fg/85">{x.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
