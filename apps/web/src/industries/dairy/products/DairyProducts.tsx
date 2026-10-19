/**
 * Dairy items on the shared products page: kind (doodh, dahi, makhan),
 * morning / evening rate, fridge and shelf life marks, and a link to
 * production.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Factory, Milk, Snowflake, Star, Sunset } from 'lucide-react';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { useDairyProfiles } from '../hooks/useDairyProfiles';
import { typeLabel } from '../lib/productTypes';

function HeroLinks() {
  return (
    <Link to="/dairy/production" className={heroButton}><Factory className="h-4 w-4" /><span className="hidden sm:inline">Dahi / makhan banayein</span></Link>
  );
}

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold';
const life = (h?: number | null) => (!h ? null : h >= 48 ? `${Math.round(h / 24)} din` : `${h} ghante`);

const base: Omit<ProductsPageConfig, 'extras' | 'columns'> = {
  label: 'Dairy',
  noun: 'cheez',
  paths: {
    detail: (id) => `/dairy-products/${id}`,
    edit: (id) => `/dairy-products/${id}/edit`,
    create: '/dairy-products/new',
  },
  HeroExtra: HeroLinks,
  filters: ['tags'],
  stockChips: (item) => (['kg', 'liter', 'litre', 'l'].includes((item.unit ?? '').toLowerCase()) ? [5, 10, 20, 40, 100] : [1, 5, 10, 25]),
  guide: [
    { icon: Milk, color: '#0ea5e9', title: 'Asal doodh', text: 'Jis doodh par "Asal doodh" ka sitara hai wohi gawale ki entry me stock me jata hai aur ghar delivery me bikta hai.' },
    { icon: Sunset, color: '#ea580c', title: 'Subah aur shaam rate', text: 'Edit me subah aur shaam ka rate alag likh sakte hain — counter par waqt ke hisaab se khud lagta hai.' },
    { icon: Factory, color: '#7c3aed', title: 'Dahi aur makhan', text: '"Dahi / makhan banayein" se doodh stock se nikal kar dahi stock me aata hai, doodh ki cost ke saath.' },
  ],
};

export default function DairyProducts() {
  const profiles = useDairyProfiles();
  const config = useMemo<ProductsPageConfig>(() => ({
    ...base,
    extras: (item, { money }) => {
      const p = profiles.get(item.id);
      if (!p) return {};
      const shelf = life(p.shelfLifeHours ?? p.bestBeforeHours);
      return {
        line: [typeLabel(p.productType), p.fatContent ? `Fat ${p.fatContent}%` : null].filter(Boolean).join(' · ') || undefined,
        badges: (
          <>
            {p.isFeatured && <span className={`${chip} bg-sky-600 text-white`}><Star className="h-3 w-3" />Asal doodh</span>}
            {p.requiresRefrigeration && <span className={`${chip} bg-sky-500/90 text-white`}><Snowflake className="h-3 w-3" />Fridge</span>}
            {shelf && <span className={`${chip} bg-slate-900/75 text-white`}><Clock className="h-3 w-3" />{shelf}</span>}
          </>
        ),
        chips: (
          <>
            {p.morningPrice ? <span className={`${chip} bg-amber-50 text-amber-800`}>Subah {money(p.morningPrice)}</span> : null}
            {p.eveningPrice ? <span className={`${chip} bg-orange-50 text-orange-800`}>Shaam {money(p.eveningPrice)}</span> : null}
            {p.bulkPrice && p.minBulkQty ? <span className={`${chip} bg-emerald-50 text-emerald-700`}>{p.minBulkQty}+ par {money(p.bulkPrice)}</span> : null}
          </>
        ),
      };
    },
    columns: [
      { id: 'kind', label: 'Type', cell: (i) => typeLabel(profiles.get(i.id)?.productType) || <span className="text-slate-400">—</span> },
      { id: 'slot', label: 'Subah / shaam', cell: (i) => {
        const p = profiles.get(i.id);
        return p?.morningPrice || p?.eveningPrice
          ? <span className="text-[0.8125rem] tabular-nums">{p.morningPrice ?? '—'} / {p.eveningPrice ?? '—'}</span>
          : <span className="text-slate-400">—</span>;
      } },
    ],
  }), [profiles]);
  return <ProductsPage config={config} />;
}
