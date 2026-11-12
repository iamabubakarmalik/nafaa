/**
 * `featured_collection`: a grid of products from one collection (empty =
 * all products, newest first). `product_carousel`: a swipeable row from a
 * collection, newest, best selling, on sale, or hand-picked products.
 */
import { api, type ProductCard } from '@/lib/api';
import { href } from '@/lib/format';
import { t } from '@/lib/i18n';
import { collectionRef, reader } from '@/lib/settings';
import { ProductGrid, ProductRow } from './ProductGrid';
import { SectionHeading } from './SectionHeading';
import type { SectionProps } from './types';

export async function FeaturedCollection({ section, ctx, index }: SectionProps) {
  const r = reader(section, ctx.lang);
  const all = await api.collections(ctx.storeId, ctx.opts);
  const handle = collectionRef(r.text('collection'), all);
  const limit = Math.max(2, Math.min(24, r.num('limit', 8)));
  const list = await api.products(ctx.storeId, { collection: handle ?? undefined, limit, sort: handle ? undefined : 'newest' }, ctx.opts);
  if (!list.items.length) return null;
  return (
    <section className="section-y">
      <div className="page">
        <SectionHeading title={r.text('heading')} text={r.text('subheading') || r.text('text')} link={r.bool('showViewAll', true) ? href(ctx.lang, `/collections/${handle ?? 'all'}`) : null} linkLabel={t(ctx.lang, 'common.viewAll')} />
        <ProductGrid items={list.items} ctx={ctx} columns={r.num('columns', 4)} mobileColumns={r.num('mobileColumns', 2)} quickAdd={r.bool('quickAdd', ctx.theme.layout.quickAdd)} priorityCount={index < 2 ? 2 : 0} />
      </div>
    </section>
  );
}

export async function ProductCarousel({ section, ctx }: SectionProps) {
  const r = reader(section, ctx.lang);
  const limit = Math.max(2, Math.min(24, r.num('limit', 12)));
  const source = r.pick('source', ['collection', 'newest', 'best_selling', 'on_sale', 'manual'] as const, 'collection');
  let items: ProductCard[] = [];
  let link = '/collections/all';
  if (source === 'manual') {
    const ids = r.raw('products');
    items = Array.isArray(ids) ? await api.productsByIds(ctx.storeId, ids.map(String).slice(0, 24), ctx.opts) : [];
  } else if (source === 'on_sale') {
    items = (await api.products(ctx.storeId, { limit: 48, sort: 'best_selling' }, ctx.opts)).items.filter((p) => p.onSale).slice(0, limit);
  } else if (source === 'newest' || source === 'best_selling') {
    items = (await api.products(ctx.storeId, { limit, sort: source }, ctx.opts)).items;
    link = `/collections/all?sort=${source}`;
  } else {
    const handle = collectionRef(r.text('collection'), await api.collections(ctx.storeId, ctx.opts));
    items = (await api.products(ctx.storeId, { collection: handle ?? undefined, limit, sort: handle ? undefined : 'newest' }, ctx.opts)).items;
    link = `/collections/${handle ?? 'all'}`;
  }
  if (!items.length) return null;
  return (
    <section className="section-y overflow-hidden">
      <div className="page">
        <SectionHeading title={r.text('heading')} text={r.text('subheading')} link={href(ctx.lang, link)} linkLabel={t(ctx.lang, 'common.viewAll')} />
        <ProductRow items={items} ctx={ctx} />
      </div>
    </section>
  );
}
