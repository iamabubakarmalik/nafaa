/** Bakery products: made vs bought, shelf life and fridge marks, and a raw materials tab. */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Snowflake, Wheat } from 'lucide-react';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import BakeryRawMaterials from './BakeryRawMaterials';
import { t } from '@core/i18n';

const shelfLife = (days: number | null, hours: number | null) =>
  days ? t('{{count}} din', { count: days }) : hours ? t('{{count}} ghante', { count: hours }) : null;

function IngredientsLink() {
  return (
    <Link to="/bakery/ingredients" className={heroButton}>
      <Wheat className="h-4 w-4" /><span className="hidden sm:inline">{t('Raw material')}</span>
    </Link>
  );
}

const base: ProductsPageConfig = {
  label: t('Bakery'),
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
          {b.fridge && <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/90 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><Snowflake className="h-3 w-3" />{t('Fridge')}</span>}
          {life && <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><Clock className="h-3 w-3" />{life}</span>}
        </>
      ),
      chips: (
        <span className={b.kind === 'made' ? 'rounded-md bg-orange-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-orange-700' : 'rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-slate-600'}>
          {b.kind === 'made' ? t('Khud banaya') : t('Khareed kar')}
        </span>
      ),
    };
  },
  columns: [{ id: 'life', label: t('Kitne din'), cell: (i) => (i.bakery && shelfLife(i.bakery.shelfLifeDays, i.bakery.shelfLifeHours)) ?? '—' }],
  stockChips: (item) => (item.bakery?.kind === 'made' ? [1, 6, 12, 24, 50] : [1, 5, 10, 25]),
  guide: [
    { icon: Clock, color: '#ea580c', title: t('Shelf life'), text: t('Jo cheez khud banti hai uske kitne din chalne ki had likhein — card par dikhti hai, purani cheez pehle bechein.') },
    { icon: Wheat, color: '#a16207', title: t('Raw material'), text: t('"Raw material" tab mein atta, cheeni, makhan ka stock — jo had se kam ho woh peela.') },
  ],
};

export default function BakeryProducts() {
  const seeRaw = usePermission(PERMISSIONS.BAKERY_INGREDIENTS_VIEW);
  const config = useMemo<ProductsPageConfig>(() => (seeRaw
    ? { ...base, HeroExtra: IngredientsLink, extraTab: { id: 'raw', label: t('Raw material'), icon: Wheat, Component: BakeryRawMaterials } }
    : base), [seeRaw]);
  return <ProductsPage config={config} />;
}
