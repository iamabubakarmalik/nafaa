/** Bakery products: made vs bought, shelf life and fridge marks, and a raw materials tab. */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Snowflake, Wheat } from 'lucide-react';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import BakeryRawMaterials from './BakeryRawMaterials';

const shelfLife = (days: number | null, hours: number | null) =>
  days ? `${days} din` : hours ? `${hours} ghante` : null;

function IngredientsLink() {
  return (
    <Link to="/bakery/ingredients" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-2.5 text-[0.8125rem] font-semibold ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25">
      <Wheat className="h-4 w-4" /><span className="hidden sm:inline">Kachcha maal</span>
    </Link>
  );
}

const base: ProductsPageConfig = {
  label: 'Bakery',
  paths: {
    detail: (id) => `/bakery-products/${id}`,
    edit: (id) => `/bakery-products/${id}/edit`,
    create: '/bakery-products/new',
  },
  filters: ['kind', 'tags'],
  facetLabels: { kind: { made: 'Khud banaya', bought: 'Khareed kar' } },
  extras: (item) => {
    const b = item.bakery;
    if (!b) return {};
    const life = shelfLife(b.shelfLifeDays, b.shelfLifeHours);
    return {
      badges: (
        <>
          {b.fridge && <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/90 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><Snowflake className="h-3 w-3" />Fridge</span>}
          {life && <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><Clock className="h-3 w-3" />{life}</span>}
        </>
      ),
      chips: (
        <span className={b.kind === 'made' ? 'rounded-md bg-orange-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-orange-700' : 'rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-slate-600'}>
          {b.kind === 'made' ? 'Khud banaya' : 'Khareed kar'}
        </span>
      ),
    };
  },
  columns: [{ id: 'life', label: 'Kitne din', cell: (i) => (i.bakery && shelfLife(i.bakery.shelfLifeDays, i.bakery.shelfLifeHours)) ?? '—' }],
  stockChips: (item) => (item.bakery?.kind === 'made' ? [1, 6, 12, 24, 50] : [1, 5, 10, 25]),
  guide: [
    { icon: Clock, color: '#ea580c', title: 'Shelf life', text: 'Jo cheez khud banti hai uske kitne din chalne ki had likhein — card par dikhti hai, purani cheez pehle bechein.' },
    { icon: Wheat, color: '#a16207', title: 'Kachcha maal', text: '"Kachcha maal" tab mein atta, cheeni, makhan ka stock — jo had se kam ho woh peela.' },
  ],
};

export default function BakeryProducts() {
  const seeRaw = usePermission(PERMISSIONS.BAKERY_INGREDIENTS_VIEW);
  const config = useMemo<ProductsPageConfig>(() => (seeRaw
    ? { ...base, HeroExtra: IngredientsLink, extraTab: { id: 'raw', label: 'Kachcha maal', icon: Wheat, Component: BakeryRawMaterials } }
    : base), [seeRaw]);
  return <ProductsPage config={config} />;
}
