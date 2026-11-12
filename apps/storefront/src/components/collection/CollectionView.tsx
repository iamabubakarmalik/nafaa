/**
 * Product listing with filters, sort and pagination. Used by
 * `main_collection` and `main_search`.
 */
import Link from 'next/link';
import type { ProductList } from '@/lib/api';
import { t } from '@/lib/i18n';
import type { SiteContext } from '@/lib/store';
import { ProductGrid } from '../sections/ProductGrid';
import { FilterSheetButton, FilterSidebar, SortSelect } from './Filters';

function pageHref(base: string, query: Record<string, string | undefined>, page: number) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v && k !== 'page') sp.set(k, v);
  if (page > 1) sp.set('page', String(page));
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

export function CollectionView({ list, ctx, base, query, showFilters = true, showSort = true, columns = 4, mobileColumns = 2, quickAdd }: { list: ProductList; ctx: SiteContext; base: string; query: Record<string, string | undefined>; showFilters?: boolean; showSort?: boolean; columns?: number; mobileColumns?: number; quickAdd?: boolean }) {
  const hasFacets = showFilters && (list.facets.brands.length + list.facets.sizes.length + list.facets.colors.length + list.facets.categories.length > 0 || list.facets.price.max > 0);
  return (
    <div className={hasFacets ? 'grid gap-8 lg:grid-cols-[240px_1fr]' : ''}>
      {hasFacets && <FilterSidebar facets={list.facets} />}
      <div>
        <div className="mb-6 flex items-center gap-3">
          {hasFacets && <FilterSheetButton facets={list.facets} total={list.total} />}
          <p className="hidden text-[14px] text-muted sm:block">{t(ctx.lang, 'collection.products', { n: list.total })}</p>
          {showSort && (
            <span className="ms-auto">
              <SortSelect />
            </span>
          )}
        </div>
        {list.items.length ? (
          <ProductGrid items={list.items} ctx={ctx} columns={hasFacets ? Math.min(columns, 4) : columns} mobileColumns={mobileColumns} quickAdd={quickAdd} priorityCount={4} />
        ) : (
          <p className="rounded-card bg-surface px-6 py-16 text-center text-muted">{t(ctx.lang, 'collection.empty')}</p>
        )}
        {list.pages > 1 && (
          <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
            {list.page > 1 && (
              <Link href={pageHref(base, query, list.page - 1)} className="btn btn-outline btn-sm" rel="prev">
                {t(ctx.lang, 'collection.prev')}
              </Link>
            )}
            <span className="px-3 text-[14px] text-muted">{t(ctx.lang, 'collection.page', { n: list.page, total: list.pages })}</span>
            {list.page < list.pages && (
              <Link href={pageHref(base, query, list.page + 1)} className="btn btn-outline btn-sm" rel="next">
                {t(ctx.lang, 'collection.next')}
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
