/**
 * Carpet products on the shared products page: roll goods show their rolls,
 * sqft and remnant pieces under the name; the header links to rolls, cut
 * pieces and roll import, and a banner totals the roll stock.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, Layers, Ruler, Scissors } from 'lucide-react';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { carpetRollsApi } from '../api/carpet-rolls.api';
import { SUMMARY_KEY, isCarpetUnit, unitLabel } from '../lib/meta';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold';

function useSummary() {
  return useQuery({ queryKey: [SUMMARY_KEY, 'all'], queryFn: () => carpetRollsApi.productSummary(), staleTime: 60_000 });
}

function HeroLinks() {
  return (
    <>
      <Link to="/carpet-rolls" className={heroButton}><Layers className="h-4 w-4" /><span className="hidden sm:inline">Rolls</span></Link>
      <Link to="/carpet-cut-pieces" className={heroButton}><Scissors className="h-4 w-4" /><span className="hidden sm:inline">Tukre</span></Link>
      <Link to="/carpet-bulk-import" className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">Rolls import</span></Link>
    </>
  );
}

function RollsBanner() {
  const { data = [] } = useSummary();
  if (!data.length) return null;
  const sqft = data.reduce((a, s) => a + s.totalSqft + s.cutPiecesSqft, 0);
  const rolls = data.reduce((a, s) => a + s.rollCount, 0);
  const pieces = data.reduce((a, s) => a + s.cutPiecesCount, 0);
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-white px-4 py-3 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
      <span className="inline-flex items-center gap-2 font-semibold text-slate-900"><Layers className="h-4 w-4 text-brand-600" />Rolls aur tukron ka stock</span>
      <span className="text-slate-600">Kul <strong className="tabular-nums text-slate-900">{Math.round(sqft).toLocaleString('en-PK')} sqft</strong></span>
      <span className="text-slate-600"><strong className="tabular-nums text-slate-900">{rolls}</strong> chalu roll</span>
      <span className="text-slate-600"><strong className="tabular-nums text-slate-900">{pieces}</strong> tukre</span>
      <Link to="/carpet-rolls" className="ml-auto font-semibold text-brand-700 hover:underline">Rolls dekhein</Link>
    </div>
  );
}

function RollChip({ productId }: { productId: string }) {
  const { data } = useSummary();
  const s = data?.find((x) => x.productId === productId);
  if (!s) return <span className={`${chip} bg-amber-50 text-amber-700`}>Koi roll nahi</span>;
  return (
    <Link to={`/carpet-rolls?productId=${productId}`} onClick={(e) => e.stopPropagation()} className={`${chip} bg-violet-50 text-violet-700 hover:underline`}>
      <Ruler className="h-3 w-3" />{Math.round(s.totalSqft).toLocaleString('en-PK')} sqft · {s.rollCount} roll{s.cutPiecesCount ? ` · ${s.cutPiecesCount} tukre` : ''}
    </Link>
  );
}

function RollCell({ productId, unit }: { productId: string; unit: string }) {
  const { data } = useSummary();
  if (!isCarpetUnit(unit)) return <span className="text-slate-400">—</span>;
  const s = data?.find((x) => x.productId === productId);
  return s ? <span className="tabular-nums">{s.rollCount} roll · {Math.round(s.totalSqft).toLocaleString('en-PK')} sqft</span> : <span className="text-amber-700">Koi roll nahi</span>;
}

const config: ProductsPageConfig = {
  label: 'Carpet',
  noun: 'maal',
  paths: {
    detail: (id) => `/carpet-products/${id}`,
    edit: (id) => `/carpet-products/${id}/edit`,
    create: '/carpet-products/new',
    bulkImport: '/products/bulk-import',
  },
  HeroExtra: HeroLinks,
  Banners: RollsBanner,
  filters: ['tags'],
  extras: (item) => (isCarpetUnit(item.unit)
    ? { line: `${unitLabel(item.unit)} me bikta hai`, chips: <RollChip productId={item.id} /> }
    : {}),
  columns: [
    { id: 'rolls', label: 'Rolls', cell: (i) => <RollCell productId={i.id} unit={i.unit} /> },
  ],
  stockChips: () => [1, 2, 5, 10],
  stockLocked: (item) => (isCarpetUnit(item.unit) ? 'Roll wale maal ka stock Rolls page ya purchase se aata hai' : null),
  guide: [
    { icon: Layers, color: '#059669', title: 'Roll wala maal', text: 'Sqft, sq gaz ya running ft wale carpet ka stock rolls aur tukron se banta hai — stock Rolls page se daalein ya purchase karein, yahan se nahi.' },
    { icon: Scissors, color: '#7c3aed', title: 'Tukre', text: 'Roll kaatne par bachi patti khud tukra ban jati hai; Tukre page par rate aur rack likhein.' },
    { icon: Ruler, color: '#0891b2', title: 'Rugs aur baqi maal', text: 'Rug, dari, underlay piece me bikte hain — un ka stock aam maal ki tarah hai.' },
  ],
};

export default function CarpetProducts() {
  return <ProductsPage config={config} />;
}
