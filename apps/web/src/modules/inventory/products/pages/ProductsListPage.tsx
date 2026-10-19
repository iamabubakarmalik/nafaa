/**
 * Products page for industries without their own config: the shared page
 * (modules/inventory/products/list), opening each industry's own product
 * editor and detail. Carpet shops also see their rolls and cut pieces.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layers, Ruler } from 'lucide-react';
import { heroButton } from '@/design-system/components';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { carpetRollsApi } from '@industries/carpet/api/carpet-rolls.api';
import { ProductsPage } from '../list/ProductsPage';
import type { ProductsPageConfig } from '../list/types';

/** Industries whose products open in their own editor and detail page. */
const PREFIX: Record<string, string> = {
  carpet: '/carpet-products', jewelry: '/jewelry-items', hardware: '/hardware-products', dairy: '/dairy-products',
  meat: '/meat-products', autoparts: '/autoparts-parts', bookstore: '/bookstore-products', salon: '/salon-services',
  clinic: '/clinic-services',
};

const pathsFor = (prefix: string | undefined): ProductsPageConfig['paths'] => prefix
  ? { detail: (id) => `${prefix}/${id}`, edit: (id) => `${prefix}/${id}/edit`, create: `${prefix}/new`, bulkImport: '/products/bulk-import' }
  : { detail: (id) => `/products/${id}`, edit: (id) => `/products/${id}/edit`, create: '/products/new', bulkImport: '/products/bulk-import' };

function useCarpetSummary() {
  return useQuery({
    queryKey: ['carpet-product-summary', 'all'],
    queryFn: () => carpetRollsApi.productSummary(),
    staleTime: 60_000,
  });
}

function RollsLink() {
  return (
    <Link to="/carpet-rolls" className={heroButton}>
      <Layers className="h-4 w-4" /><span className="hidden sm:inline">Rolls</span>
    </Link>
  );
}

function CarpetBanner() {
  const { data = [] } = useCarpetSummary();
  if (!data.length) return null;
  const sqft = data.reduce((a, s) => a + s.totalSqft, 0);
  const rolls = data.reduce((a, s) => a + s.rollCount, 0);
  const cuts = data.reduce((a, s) => a + s.cutPiecesCount, 0);
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-white px-4 py-3 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
      <span className="inline-flex items-center gap-2 font-semibold text-slate-900"><Layers className="h-4 w-4 text-brand-600" />Rolls ka stock</span>
      <span className="text-slate-600">Kul <strong className="tabular-nums text-slate-900">{Math.round(sqft).toLocaleString('en-PK')} sqft</strong></span>
      <span className="text-slate-600"><strong className="tabular-nums text-slate-900">{rolls}</strong> rolls</span>
      <span className="text-slate-600"><strong className="tabular-nums text-slate-900">{cuts}</strong> cut pieces</span>
      <span className="text-slate-600"><strong className="tabular-nums text-slate-900">{data.length}</strong> products mein stock</span>
      <Link to="/carpet-rolls" className="ml-auto font-semibold text-brand-700 hover:underline">Rolls dekhein</Link>
    </div>
  );
}

function CarpetChip({ productId }: { productId: string }) {
  const { data } = useCarpetSummary();
  const s = data?.find((x) => x.productId === productId);
  if (!s || (!s.rollCount && !s.cutPiecesCount)) return null;
  return (
    <Link to={`/carpet-rolls?productId=${productId}`} onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[0.6875rem] font-medium text-violet-700 hover:underline">
      <Ruler className="h-3 w-3" />{Math.round(s.totalSqft).toLocaleString('en-PK')} sqft · {s.rollCount} rolls{s.cutPiecesCount ? ` · ${s.cutPiecesCount} cut` : ''}
    </Link>
  );
}

export default function ProductsListPage() {
  const industry = useCurrentIndustry();
  const id = industry?.id ?? '';
  const carpet = id === 'carpet';
  const config: ProductsPageConfig = {
    label: industry?.name ?? 'Dukaan',
    paths: pathsFor(PREFIX[id]),
    filters: ['tags'],
    ...(carpet && {
      HeroExtra: RollsLink,
      Banners: CarpetBanner,
      extras: (item) => ({ chips: <CarpetChip productId={item.id} /> }),
    }),
  };
  return <ProductsPage config={config} />;
}
