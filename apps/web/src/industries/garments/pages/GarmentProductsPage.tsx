/**
 * Garments products on the shared products page: gender, garment type,
 * season and Sale/New marks on each card, sizes with their stock (empty
 * sizes in red), the collection, and a "Size reorder" tab listing sizes and
 * colours running out in this branch with a suggested quantity.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BadgePercent, Palette, PackagePlus, Ruler, Sparkles, Table2 } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { Card, Skeleton, heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { CatalogItem } from '@modules/inventory/products/list/api';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { garmentProductsApi, type GarmentMeta } from '../api/products.api';
import { META_KEY, garmentLabel, genderLabel, seasonLabel } from '../components/meta';

function HeroLinks() {
  return (
    <>
      <Link to="/garments/collections" className={heroButton}><Palette className="h-4 w-4" /><span className="hidden sm:inline">Collections</span></Link>
      <Link to="/garments/size-charts" className={heroButton}><Table2 className="h-4 w-4" /><span className="hidden sm:inline">Size charts</span></Link>
    </>
  );
}

/** "S 3 · M 0 · L 5" from the variants on the card; empty sizes in red. */
function SizeStrip({ item }: { item: CatalogItem }) {
  if (!item.hasVariants || !item.variants.length) return null;
  const shown = item.variants.slice(0, 6);
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((v) => (
        <span key={v.id} className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums ring-1', v.stock > 0 ? 'bg-white text-slate-700 ring-slate-200' : 'bg-rose-50 text-rose-700 ring-rose-200')}>
          {v.name} {Math.round(v.stock)}
        </span>
      ))}
      {item.variants.length > shown.length && <span className="text-[0.6875rem] text-slate-500">+{item.variants.length - shown.length}</span>}
    </span>
  );
}

/** Sizes and colours running out in this branch, with what to buy. */
function SizeReorder() {
  const q = useQuery({ queryKey: [META_KEY, 'reorder'], queryFn: () => garmentProductsApi.reorder(100), staleTime: 60_000 });
  if (q.isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  const items = q.data?.items ?? [];
  return (
    <Card className="rounded-2xl" flush title="Size ke hisaab se kya mangwana hai" description={items.length ? `${q.data!.products} products · kul ${q.data!.pieces} piece mangwane ka mashwara (pichle 30 din ki Sale se)` : undefined}
      actions={<Link to="/purchases/new" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 text-[0.8125rem] font-semibold text-white hover:bg-brand-700"><PackagePlus className="h-4 w-4" />Purchase</Link>}>
      {!items.length ? <p className="px-5 py-10 text-center text-[0.875rem] text-slate-500">Koi size khatam nahi ho raha — shabash</p> : (
        <ul className="divide-y divide-slate-100">
          {items.map((g) => (
            <li key={g.productId} className="px-4 py-3 sm:px-5">
              <div className="flex items-center justify-between gap-2">
                <Link to={`/garment-products/${g.productId}`} className="truncate font-semibold text-slate-900 hover:text-brand-700">{g.name}</Link>
                <span className="shrink-0 text-[0.75rem] text-slate-500">30 din me {Math.round(g.sold30)} bike</span>
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

export default function GarmentProductsPage() {
  const metaQ = useQuery({ queryKey: [META_KEY], queryFn: garmentProductsApi.meta, staleTime: 60_000 });
  const config = useMemo<ProductsPageConfig>(() => {
    const byId = new Map<string, GarmentMeta>((metaQ.data?.items ?? []).map((m) => [m.productId, m]));
    const collection = new Map((metaQ.data?.collections ?? []).map((c) => [c.id, c.name]));
    return {
      label: 'Garments',
      noun: 'kapra',
      paths: { detail: (id) => `/garment-products/${id}`, edit: (id) => `/garment-products/${id}/edit`, create: '/garment-products/new' },
      HeroExtra: HeroLinks,
      filters: ['tags'],
      extras: (item) => {
        const g = byId.get(item.id);
        const outSizes = item.hasVariants ? item.variants.filter((v) => v.stock <= 0).length : 0;
        return {
          line: g ? [genderLabel(g.gender) !== '—' ? genderLabel(g.gender) : null, g.categoryType ? garmentLabel(g.categoryType) : null, g.season && g.season !== 'ALL_SEASON' ? seasonLabel(g.season) : null].filter(Boolean).join(' · ') || undefined : undefined,
          badges: g && (g.isOnSale || g.isNewArrival || g.isFabricOnly) ? (
            <>
              {g.isOnSale && <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><BadgePercent className="h-3 w-3" />Sale</span>}
              {g.isNewArrival && <span className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><Sparkles className="h-3 w-3" />Naya</span>}
              {g.isFabricOnly && <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><Ruler className="h-3 w-3" />Kapra</span>}
            </>
          ) : undefined,
          chips: <><SizeStrip item={item} />{g?.collectionId && collection.get(g.collectionId) && <span className="rounded-md bg-pink-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-pink-700">{collection.get(g.collectionId)}</span>}</>,
          ribbon: outSizes > 0 && item.stock > 0 ? { text: `${outSizes} size khatam`, tone: 'amber' } : undefined,
        };
      },
      columns: [
        { id: 'sizes', label: 'Sizes', cell: (i) => <SizeStrip item={i} /> },
        { id: 'collection', label: 'Collection', cell: (i) => { const c = byId.get(i.id)?.collectionId; return (c && collection.get(c)) || '—'; } },
      ],
      extraTab: { id: 'reorder', label: 'Size reorder', icon: PackagePlus, Component: SizeReorder },
      stockChips: () => [1, 3, 6, 12, 24],
      guide: [
        { icon: Ruler, color: '#7c3aed', title: 'Sizes ka stock', text: 'Card par har size aur rang ka stock likha hai. Laal size khatam ho chuka — "Size reorder" tab me batata hai kitna mangwana hai.' },
        { icon: BadgePercent, color: '#e11d48', title: 'Sale aur collection', text: 'Collection "Sale" par lagayein to uske products par Sale ka nishan aata hai aur POS par "Sale" filter me dikhte hain.' },
      ],
    };
  }, [metaQ.data]);
  return <ProductsPage config={config} />;
}
