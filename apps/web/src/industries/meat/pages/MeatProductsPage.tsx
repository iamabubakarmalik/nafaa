/**
 * Meat items on the shared products page: animal and cut under every name,
 * the restaurant rate, and links to today's rates, mandi and cutting.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Beef, Building2, Gauge, Scale, Scissors, Truck } from 'lucide-react';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { useMeatProfiles } from '../hooks/useMeatProfiles';
import { animalOf, cutLabel } from '../lib/meta';

function HeroLinks() {
  return (
    <>
      <Link to="/meat/rates" className={heroButton}><Gauge className="h-4 w-4" /><span className="hidden sm:inline">Aaj ka rate</span></Link>
      <Link to="/meat/live-animals" className={heroButton}><Truck className="h-4 w-4" /><span className="hidden sm:inline">Mandi</span></Link>
      <Link to="/meat/cutting" className={heroButton}><Scissors className="h-4 w-4" /><span className="hidden sm:inline">Cutting</span></Link>
    </>
  );
}

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold';

const base: Omit<ProductsPageConfig, 'extras' | 'columns'> = {
  label: 'Meat',
  noun: 'item',
  paths: { detail: (id) => `/meat-products/${id}`, edit: (id) => `/meat-products/${id}/edit`, create: '/meat-products/new' },
  HeroExtra: HeroLinks,
  filters: ['tags'],
  stockChips: () => [1, 5, 10, 25, 50],
  guide: [
    { icon: Beef, color: '#dc2626', title: 'Janwar aur cut', text: 'Har item par janwar (murgi, mutton, beef) aur cut (qeema, boneless, chaanp) dikhta hai — POS par inhi se filter hota hai.' },
    { icon: Scale, color: '#0891b2', title: 'Kg me stock', text: 'Gosht ka unit kg rakhein. POS par wazan ya "Rs 500 ka" likhne se kg khud ban jata hai; scale lagi ho to wazan seedha aata hai.' },
    { icon: Building2, color: '#a16207', title: 'Restaurant rate', text: 'Wholesale qeemat restaurant aur hotel ke liye — POS par "Restaurant rate" chunne se lagti hai.' },
    { icon: Gauge, color: '#16a34a', title: 'Aaj ka rate', text: 'Murgi ka rate roz badalta hai — "Aaj ka rate" se sab items ke rate ek jagah badlein.' },
  ],
};

export default function MeatProductsPage() {
  const profiles = useMeatProfiles();
  const config = useMemo<ProductsPageConfig>(() => ({
    ...base,
    extras: (item, { money }) => {
      const p = profiles.get(item.id);
      const a = p ? animalOf(p.animalType) : null;
      const wholesale = Number(item.wholesalePrice) || 0;
      return {
        line: p ? [`${a?.emoji} ${a?.label}`, cutLabel(p.cutCategory)].filter(Boolean).join(' · ') : undefined,
        badges: p?.isHalalCertified ? <span className={`${chip} bg-emerald-600 text-white`}>Halal</span> : null,
        chips: wholesale > 0 ? <span className={`${chip} bg-amber-50 text-amber-800`}><Building2 className="h-3 w-3" />Restaurant {money(wholesale)}</span> : null,
      };
    },
    columns: [
      { id: 'animal', label: 'Janwar / cut', cell: (i) => { const p = profiles.get(i.id); return p ? `${animalOf(p.animalType).label} · ${cutLabel(p.cutCategory)}` : <span className="text-slate-400">—</span>; } },
    ],
  }), [profiles]);
  return <ProductsPage config={config} />;
}
