import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';
import { api } from '@/lib/api';
import { href, stripHtml } from '@/lib/format';
import { JsonLd, meta, pageUrl } from '@/lib/seo';
import { site, templateSections, type SiteContext, type SiteParams } from '@/lib/store';
import { Sections } from '@/components/sections/Sections';

type Props = { params: Promise<SiteParams & { handle: string }> };

const load = cache(async (ctx: SiteContext, handle: string) => api.product(ctx.storeId, handle, ctx.opts));

function productLd(ctx: SiteContext, p: NonNullable<Awaited<ReturnType<typeof api.product>>> & { product: unknown }) {
  const d = (p as { product: import('@/lib/api').ProductDetail }).product;
  if (d.jsonLd && Object.keys(d.jsonLd).length) return d.jsonLd;
  const avail = (a: string) => (a === 'in_stock' ? 'https://schema.org/InStock' : a === 'backorder' ? 'https://schema.org/BackOrder' : 'https://schema.org/OutOfStock');
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: d.title,
      description: stripHtml(d.description, 500),
      image: d.images.map((i) => i.url),
      sku: d.sku ?? undefined,
      brand: d.brand ? { '@type': 'Brand', name: d.brand } : undefined,
      aggregateRating: d.rating && d.rating.count > 0 ? { '@type': 'AggregateRating', ratingValue: d.rating.average, reviewCount: d.rating.count } : undefined,
      offers: d.variants.map((v) => ({
        '@type': 'Offer',
        url: pageUrl(ctx, d.url),
        priceCurrency: 'PKR',
        price: v.price,
        sku: v.sku ?? undefined,
        availability: avail(v.availability),
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: ctx.boot.store.name },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: d.breadcrumbs.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.title, item: pageUrl(ctx, b.url) })),
    },
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const ctx = await site(p);
  if (ctx.blocked) return {};
  const r = await load(ctx, p.handle);
  if (!r || 'redirect' in r) return {};
  const d = r.product;
  return meta(ctx, { title: d.seo.title || d.title, description: d.seo.description || stripHtml(d.description), path: d.url, image: d.seo.image || d.image?.url });
}

export default async function ProductPage({ params }: Props) {
  const p = await params;
  const ctx = await site(p);
  if (ctx.blocked) return null;
  const r = await load(ctx, p.handle);
  if (!r) notFound();
  if ('redirect' in r) permanentRedirect(href(ctx.lang, r.redirect));
  return (
    <>
      <Sections sections={templateSections(ctx, 'product')} ctx={ctx} data={{ product: r.product }} />
      <JsonLd data={productLd(ctx, r)} />
    </>
  );
}

/** Rendered on first visit, then cached and refreshed by tag (ISR). */
export async function generateStaticParams() {
  return [];
}
