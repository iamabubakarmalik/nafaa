/**
 * Product page: images, price, lines (size/colour), flow-driven options and
 * add to cart (ProductOptions), the shop card and more from the shop.
 * JSON-LD Product with an Offer per line.
 */
import type { Metadata } from 'next';
import { ChevronRight, Store } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/market/ProductCard';
import { ProductGallery } from '@/components/market/ProductGallery';
import { ProductOptions } from '@/components/market/ProductOptions';
import { Section } from '@/components/market/Section';
import { WishToggle } from '@/components/market/WishToggle';
import { Badge, Price, RatingPill } from '@/components/ui';
import { api } from '@/lib/api';
import { initials, money } from '@/lib/format';
import { pageLang } from '@/lib/page';
import { JsonLd, pageMeta } from '@/lib/seo';
import { GATE_LOOK, SITE_URL } from '@/lib/site';

type Params = Promise<{ lang: string; id: string }>;

async function load(id: string) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
  return api.product(id).catch(() => null);
}

const SCHEMA_AVAIL = { in_stock: 'https://schema.org/InStock', out_of_stock: 'https://schema.org/OutOfStock', backorder: 'https://schema.org/BackOrder' } as const;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, t } = await pageLang(params);
  const p = await load((await params).id);
  if (!p) return {};
  return pageMeta({
    lang,
    path: `/p/${p.productId}`,
    title: `${p.name} | ${p.shop.name} | Nafaa Market`,
    description: p.description || t('seo.productDesc', { product: p.name, shop: p.shop.name, price: money(p.price) }),
    image: p.image,
  });
}

export default async function ProductPage({ params }: { params: Params }) {
  const { t, h } = await pageLang(params);
  const p = await load((await params).id);
  if (!p) notFound();
  const color = GATE_LOOK[p.shop.gate].color;
  const url = `${SITE_URL}${h(`/p/${p.productId}`)}`;
  const offers = (p.lines.length ? p.lines : [{ price: p.price, availability: p.availability, name: null, variantId: null }]).map((l) => ({
    '@type': 'Offer',
    price: l.price,
    priceCurrency: 'PKR',
    availability: SCHEMA_AVAIL[l.availability] ?? SCHEMA_AVAIL.in_stock,
    url,
    name: l.name ?? undefined,
    seller: { '@type': 'Organization', name: p.shop.name },
  }));

  return (
    <div className="container-page pt-4 md:pt-8">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: p.name,
          description: p.description ?? undefined,
          image: p.images.length ? p.images : undefined,
          brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
          category: p.category ?? undefined,
          aggregateRating: p.ratingCount ? { '@type': 'AggregateRating', ratingValue: p.rating.toFixed(1), reviewCount: p.ratingCount } : undefined,
          offers,
        }}
      />
      <nav aria-label="breadcrumb" className="mb-4 flex items-center gap-1 text-xs text-gray-500">
        <Link href={h('/')} className="hover:text-brand-700">Nafaa Market</Link>
        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        <Link href={h(`/shop/${p.shop.slug}`)} className="hover:text-brand-700">{p.shop.name}</Link>
        {p.category && (<><ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" /><span className="truncate">{p.category}</span></>)}
      </nav>

      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <div className="relative">
          <ProductGallery images={p.images} name={p.name} gate={p.shop.gate} />
          <div className="absolute end-3 top-3"><WishToggle productId={p.productId} /></div>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {p.requiresPrescription && <Badge tone="red">{t('common.rxNeeded')}</Badge>}
            {p.availability === 'backorder' ? <Badge tone="blue">{t('product.backorder')}</Badge> : p.inStock ? <Badge tone="green">{t('product.inStock')}</Badge> : <Badge tone="gray">{t('common.outOfStock')}</Badge>}
            {p.brand && <Badge>{p.brand}</Badge>}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900 md:text-3xl">{p.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <Price value={p.price} compareAt={p.compareAt} max={p.priceMax} size="lg" />
            <RatingPill value={p.rating} count={p.ratingCount} />
          </div>
          {p.description && (
            <div className="mt-4">
              <h2 className="text-sm font-bold text-gray-900">{t('product.description')}</h2>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-700">{p.description}</p>
            </div>
          )}
          <div className="mt-6">
            <ProductOptions product={p} flow={p.shop.flow} sticky />
          </div>

          <Link href={h(`/shop/${p.shop.slug}`)} className="card mt-6 flex items-center gap-3 p-3 transition hover:shadow-card-lg">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gray-50 text-sm font-bold" style={{ color }}>{initials(p.shop.name) || <Store className="h-5 w-5" />}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-2xs text-gray-500">{t('product.soldBy')}</span>
              <span className="block truncate font-bold text-gray-900">{p.shop.name}</span>
              <span className="num block text-xs text-gray-500">
                {[p.shop.etaMinutes ? t('common.eta', { min: p.shop.etaMinutes }) : null, p.shop.deliveryFee ? t('common.deliveryFee', { amount: money(p.shop.deliveryFee) }) : t('common.freeDelivery'), p.shop.open ? t('common.open') : t('common.closed')].filter(Boolean).join(' · ')}
              </span>
            </span>
            <span className="text-sm font-semibold text-brand-700">{t('product.visitShop')}</span>
          </Link>
        </div>
      </div>

      {p.related.length > 0 && (
        <Section title={t('product.related')} more={{ href: h(`/shop/${p.shop.slug}`), label: t('common.seeAll') }}>
          <div className="scroll-x">
            {p.related.map((r) => (
              <ProductCard key={r.productId} product={r} gate={p.shop.gate} needsOptions={!!(p.shop.flow.sizeColour || p.shop.flow.modifiers)} className="w-[160px] shrink-0 md:w-[180px]" />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
