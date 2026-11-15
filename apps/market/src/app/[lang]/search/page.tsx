/**
 * Search: shops and products tabs with quick filters, all as links so the
 * result pages render on the server. Not indexed (thin, query-driven pages).
 */
import type { Metadata } from 'next';
import { Search as SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { SearchBox } from '@/components/layout/Header';
import { ProductCard } from '@/components/market/ProductCard';
import { ShopCard } from '@/components/market/ShopCard';
import { EmptyState, tabClass } from '@/components/ui';
import { api } from '@/lib/api';
import { pageLang, readLoc, type LangParams } from '@/lib/page';
import { pageMeta } from '@/lib/seo';

type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: LangParams }): Promise<Metadata> {
  const { lang, t } = await pageLang(params);
  return pageMeta({ lang, path: '/search', title: t('seo.searchTitle'), description: t('seo.homeDesc'), noindex: true });
}

const POPULAR = ['Biryani', 'Pizza', 'Atta', 'Doodh', 'Panadol', 'Lawn', 'Cake', 'Haircut'];

export default async function SearchPage({ params, searchParams }: { params: LangParams; searchParams: Search }) {
  const { t, h } = await pageLang(params);
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string).slice(0, 80) : undefined);
  const q = one('q')?.trim() ?? '';
  const sale = one('sale') === '1';
  const stock = one('stock') === '1';
  const tab = one('tab') === 'products' || (sale && !q) ? 'products' : 'shops';
  const loc = await readLoc();

  const [shops, products] = await Promise.all([
    q ? api.shops({ q, city: loc?.city, lat: loc?.lat, lng: loc?.lng, limit: 30 }).catch(() => null) : Promise.resolve(null),
    q || sale ? api.products({ q: q || undefined, onDiscount: sale, inStockOnly: stock, limit: 40 }).catch(() => null) : Promise.resolve(null),
  ]);

  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { q: q || undefined, tab, sale: sale ? '1' : undefined, stock: stock ? '1' : undefined, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    return `${h('/search')}?${p}`;
  };

  return (
    <div className="container-page pt-4 md:pt-8">
      <SearchBox initial={q} autoFocus={!q} className="md:max-w-xl" />
      {!q && !sale ? (
        <>
          <EmptyState icon={<SearchIcon />} title={t('search.start')} body={t('search.startSub')} />
          <h2 className="mb-2 text-sm font-bold text-gray-900">{t('search.popular')}</h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map((w) => (
              <Link key={w} href={`${h('/search')}?q=${encodeURIComponent(w)}`} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50">{w}</Link>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {q && <Link href={link({ tab: 'shops' })} className={tabClass(tab === 'shops')}>{t('search.shopsTab')} <span className="num opacity-60">{shops?.items.length ?? 0}</span></Link>}
            <Link href={link({ tab: 'products' })} className={tabClass(tab === 'products')}>{t('search.productsTab')} <span className="num opacity-60">{products?.items.length ?? 0}</span></Link>
            {tab === 'products' && (
              <>
                <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />
                <Link href={link({ stock: stock ? undefined : '1' })} aria-pressed={stock} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ${stock ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-gray-700 ring-gray-200'}`}>{t('search.inStockOnly')}</Link>
                <Link href={link({ sale: sale ? undefined : '1' })} aria-pressed={sale} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ${sale ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-gray-700 ring-gray-200'}`}>{t('search.onSale')}</Link>
              </>
            )}
          </div>
          {tab === 'shops' ? (
            shops?.items.length ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shops.items.map((s) => <ShopCard key={s.shopId} shop={s} t={t} href={h} />)}
              </div>
            ) : (
              <EmptyState icon={<SearchIcon />} title={t('search.noResults', { q })} body={t('search.noResultsSub')} />
            )
          ) : products?.items.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {products.items.map((p) => <ProductCard key={p.productId} product={p} showShop />)}
            </div>
          ) : (
            <EmptyState icon={<SearchIcon />} title={t('search.noResults', { q })} body={t('search.noResultsSub')} />
          )}
        </>
      )}
    </div>
  );
}
