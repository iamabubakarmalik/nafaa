/**
 * Hardware items on the shared products page: size, grade or shade under
 * every name, quantity rates and "goes by truck" marks, and links to
 * brands, reorder and quotations.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Award, FileText, Paintbrush, RefreshCw, Ruler, Tags, Truck } from 'lucide-react';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { factLine, useHardwareFacts, useTiers } from '../hooks/useHardwareFacts';
import { categoryLabel, isPaint } from '../lib/meta';

function HeroLinks() {
  return (
    <>
      <Link to="/hardware/reorder-rules" className={heroButton}><RefreshCw className="h-4 w-4" /><span className="hidden sm:inline">Reorder</span></Link>
      <Link to="/hardware/brands" className={heroButton}><Award className="h-4 w-4" /><span className="hidden sm:inline">Brands</span></Link>
      <Link to="/hardware/quotations/new" className={heroButton}><FileText className="h-4 w-4" /><span className="hidden sm:inline">Quotation</span></Link>
    </>
  );
}

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold';

const base: Omit<ProductsPageConfig, 'extras' | 'columns'> = {
  label: 'Hardware',
  noun: 'item',
  paths: {
    detail: (id) => `/hardware-products/${id}`,
    edit: (id) => `/hardware-products/${id}/edit`,
    create: '/hardware-products/new',
  },
  HeroExtra: HeroLinks,
  filters: ['tags'],
  stockChips: (item) => (['bag', 'ton', 'gallon'].includes((item.unit ?? '').toLowerCase()) ? [1, 10, 50, 100] : [10, 50, 100, 500]),
  guide: [
    { icon: Ruler, color: '#0891b2', title: 'Size aur grade', text: 'Har item par size, grade ya shade naam ke neeche dikhta hai — 1/2" aur 3/4" pipe alag pehchane jate hain.' },
    { icon: Tags, color: '#16a34a', title: 'Quantity rate', text: 'Jis item par "Bulk rate" laga hai, POS par zyada quantity likhne se kam rate khud lagta hai.' },
    { icon: Truck, color: '#a16207', title: 'Gaari wala maal', text: 'Cement, sarya, ret par "Gaari" ka nishan — bill ke baad challan banana yaad rahe.' },
  ],
};

export default function HardwareProducts() {
  const facts = useHardwareFacts();
  const tiers = useTiers();
  const config = useMemo<ProductsPageConfig>(() => ({
    ...base,
    extras: (item, { money }) => {
      const f = facts.get(item.id);
      const t = tiers.get(item.id);
      return {
        line: factLine(f),
        badges: (
          <>
            {t?.length ? <span className={`${chip} bg-emerald-600 text-white`}><Tags className="h-3 w-3" />Bulk</span> : null}
            {f?.requiresTruck && <span className={`${chip} bg-amber-600 text-white`}><Truck className="h-3 w-3" />Gaari</span>}
          </>
        ),
        chips: (
          <>
            {f?.categoryType && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-600">{categoryLabel(f.categoryType)}</span>}
            {isPaint(f?.categoryType) && f?.colorCode && <span className={`${chip} bg-violet-50 text-violet-700`}><Paintbrush className="h-3 w-3" />{f.colorCode}</span>}
            {t?.[0] && <span className={`${chip} bg-emerald-50 text-emerald-700`}>{t[0].minQuantity}+ par {money(t[0].price)}</span>}
          </>
        ),
      };
    },
    columns: [
      { id: 'size', label: 'Size / shade', cell: (i) => factLine(facts.get(i.id)) || <span className="text-slate-400">—</span> },
      { id: 'bulk', label: 'Quantity rate', cell: (i) => {
        const t = tiers.get(i.id);
        return t?.length ? <span className="text-[0.8125rem] text-emerald-700">{t.map((x) => `${x.minQuantity}+ : ${x.price}`).join(' · ')}</span> : <span className="text-slate-400">—</span>;
      } },
    ],
  }), [facts, tiers]);
  return <ProductsPage config={config} />;
}
