/**
 * Shoe articles on the shared products page: brand and article code,
 * Gents / Ladies / Bachay and shoe type on each card, Sale (below MRP) and
 * New marks, the sizes with their pairs (empty sizes in red), and a
 * "Size reorder" tab listing the sizes running out in this branch with a
 * suggested quantity. Older shoe brands are moved to the shop's brand list
 * once per session.
 */

import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgePercent, HandMetal, PackagePlus, Ruler, Sparkles } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { Card, Skeleton, heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { CatalogItem } from '@modules/inventory/products/list/api';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { shoeProductsApi } from '../api/products.api';
import { META_KEY, genderLabel, typeLabel, type ShoeMeta } from '../components/meta';

function HeroLinks() {
  return (
    <>
      <Link to="/shoe/try-on" className={heroButton}><HandMetal className="h-4 w-4" /><span className="hidden sm:inline">Farmaish</span></Link>
      <Link to="/shoe/size-charts" className={heroButton}><Ruler className="h-4 w-4" /><span className="hidden sm:inline">Size chart</span></Link>
    </>
  );
}

/** "40 3 · 41 0 · 42 5" from the variants on the card; empty sizes in red. */
function SizeStrip({ item }: { item: CatalogItem }) {
  if (!item.hasVariants || !item.variants.length) return null;
  const shown = item.variants.slice(0, 8);
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((v) => (
        <span key={v.id} className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums ring-1', v.stock > 0 ? 'bg-white text-slate-700 ring-slate-200' : 'bg-rose-50 text-rose-700 ring-rose-200')}>
          {v.name} · {Math.round(v.stock)}
        </span>
      ))}
      {item.variants.length > shown.length && <span className="text-[0.6875rem] text-slate-500">+{item.variants.length - shown.length}</span>}
    </span>
  );
}

/** Sizes running out in this branch, with what to buy. */
function SizeReorder() {
  const q = useQuery({ queryKey: [META_KEY, 'reorder'], queryFn: () => shoeProductsApi.reorder(100), staleTime: 60_000 });
  if (q.isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  const items = q.data?.items ?? [];
  return (
    <Card className="rounded-2xl" flush title="Size ke hisaab se kya mangwana hai"
      description={items.length ? `${q.data!.products} articles · kul ${q.data!.pairs} joray mangwane ka mashwara (pichle 30 din ki Sale se)` : undefined}
      actions={<Link to="/purchases/new" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 text-[0.8125rem] font-semibold text-white hover:bg-brand-700"><PackagePlus className="h-4 w-4" />Purchase</Link>}>
      {!items.length ? <p className="px-5 py-10 text-center text-[0.875rem] text-slate-500">Koi bikne wala size khatam nahi ho raha</p> : (
        <ul className="divide-y divide-slate-100">
          {items.map((g) => (
            <li key={g.productId} className="px-4 py-3 sm:px-5">
              <div className="flex items-center justify-between gap-2">
                <Link to={`/shoe-products/${g.productId}`} className="min-w-0 truncate font-semibold text-slate-900 hover:text-brand-700">{g.name}{g.brand && <span className="ml-1.5 text-[0.75rem] font-normal text-slate-500">{g.brand}</span>}</Link>
                <span className="shrink-0 text-[0.75rem] text-slate-500">30 din me {Math.round(g.sold30)} joray bike</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {g.sizes.map((s) => (
                  <span key={s.variantId} className={cn('rounded-lg px-2 py-1 text-[0.75rem] ring-1', s.stock <= 0 ? 'bg-rose-50 text-rose-800 ring-rose-200' : 'bg-amber-50 text-amber-900 ring-amber-200')}>
                    <strong>{s.name}</strong> · {Math.round(s.stock)} bache · {Math.round(s.sold30)} bike · <strong>{s.suggest} mangwayein</strong>
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Moves older shoe brands to the shop's brand list once per session. */
let brandsSynced = false;
function useBrandSync() {
  const qc = useQueryClient();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  useEffect(() => {
    if (brandsSynced || !canEdit) return;
    brandsSynced = true;
    shoeProductsApi.syncBrands()
      .then((r) => { if (r.brands || r.products) qc.invalidateQueries({ queryKey: ['brands'] }); })
      .catch(() => { brandsSynced = false; });
  }, [canEdit, qc]);
}

export default function ShoeProductsPage() {
  useBrandSync();
  const metaQ = useQuery({ queryKey: [META_KEY], queryFn: shoeProductsApi.meta, staleTime: 60_000 });
  const config = useMemo<ProductsPageConfig>(() => {
    const byId = new Map<string, ShoeMeta>((metaQ.data?.items ?? []).map((m) => [m.productId, m]));
    return {
      label: 'Shoes',
      noun: 'joota',
      paths: { detail: (id) => `/shoe-products/${id}`, edit: (id) => `/shoe-products/${id}/edit`, create: '/shoe-products/new' },
      HeroExtra: HeroLinks,
      filters: ['tags'],
      extras: (item) => {
        const m = byId.get(item.id);
        const outSizes = item.hasVariants ? item.variants.filter((v) => v.stock <= 0).length : 0;
        const line = m ? [m.modelCode, genderLabel(m.gender) !== '—' ? genderLabel(m.gender) : null, m.categoryType ? typeLabel(m.categoryType) : null, m.season].filter(Boolean).join(' · ') : '';
        return {
          line: line || undefined,
          badges: m && (m.onSale || m.isNewArrival || m.isBridal) ? (
            <>
              {m.onSale && <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><BadgePercent className="h-3 w-3" />Sale {m.offPct}%</span>}
              {m.isNewArrival && <span className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><Sparkles className="h-3 w-3" />Naya</span>}
              {m.isBridal && <span className="rounded-md bg-pink-600 px-1.5 py-0.5 text-[0.625rem] font-bold text-white">Bridal</span>}
            </>
          ) : undefined,
          chips: <SizeStrip item={item} />,
          ribbon: outSizes > 0 && item.stock > 0 ? { text: `${outSizes} size khatam`, tone: 'amber' } : undefined,
        };
      },
      columns: [
        { id: 'article', label: 'Article', cell: (i) => byId.get(i.id)?.modelCode || '—' },
        { id: 'sizes', label: 'Sizes', cell: (i) => <SizeStrip item={i} /> },
      ],
      extraTab: { id: 'reorder', label: 'Size reorder', icon: PackagePlus, Component: SizeReorder },
      stockChips: () => [1, 2, 6, 12, 24],
      guide: [
        { icon: Ruler, color: '#ea580c', title: 'Har size ka stock', text: 'Card par har size ke joray likhe hain. Laal size khatam — "Size reorder" tab batata hai kaunsa size kitna mangwana hai.' },
        { icon: BadgePercent, color: '#e11d48', title: 'Sale / clearance', text: 'Joote ke dabbe ki MRP likhein aur rate kam rakhein — card aur POS par "Sale %" ka nishan aata hai.' },
      ],
    };
  }, [metaQ.data]);
  return <ProductsPage config={config} />;
}
