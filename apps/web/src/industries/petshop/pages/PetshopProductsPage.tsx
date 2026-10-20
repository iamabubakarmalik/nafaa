/**
 * Pet shop items on the shared products page: animal, brand and pack under
 * every name, an expiry ribbon for medicine and food, and links to live
 * animals and grooming. A live animal's counter line shows with a ribbon.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarX, PawPrint, Pill, Scissors } from 'lucide-react';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { petProductsApi, type PetProductProfile } from '../api/products.api';
import { LIFE_STAGE, PET_KEYS, categoryLabel, daysFromToday, speciesLabel } from '../lib/meta';

function HeroLinks() {
  return (
    <>
      <Link to="/petshop/live-animals" className={heroButton}><PawPrint className="h-4 w-4" /><span className="hidden sm:inline">Live animals</span></Link>
      <Link to="/petshop/grooming" className={heroButton}><Scissors className="h-4 w-4" /><span className="hidden sm:inline">Grooming</span></Link>
    </>
  );
}

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold';
const line = (p?: PetProductProfile) => (p ? [p.brand, p.species ? speciesLabel(p.species) : null, p.lifeStage ? LIFE_STAGE[p.lifeStage] : null, p.packSize].filter(Boolean).join(' · ') : '');

function usePetProfiles() {
  const q = useQuery({ queryKey: [PET_KEYS.profiles], queryFn: () => petProductsApi.list(), staleTime: 60_000 });
  return useMemo(() => new Map((q.data ?? []).map((p) => [p.productId, p])), [q.data]);
}

export default function PetshopProductsPage() {
  const profiles = usePetProfiles();
  const config = useMemo<ProductsPageConfig>(() => ({
    label: 'Pet shop',
    noun: 'cheez',
    paths: { detail: (id) => `/petshop-products/${id}`, edit: (id) => `/petshop-products/${id}/edit`, create: '/petshop-products/new' },
    HeroExtra: HeroLinks,
    filters: ['tags'],
    stockChips: () => [5, 10, 20, 50],
    extras: (item) => {
      // An animal's own counter line (made when it goes on sale); its record lives in Live animals.
      if (item.productType === 'PET_ANIMAL') return { ribbon: { text: 'Zinda janwar', tone: 'violet' }, line: 'Record "Live animals" me hai' };
      const p = profiles.get(item.id);
      const left = daysFromToday(p?.expiryDate);
      return {
        line: line(p) || undefined,
        ribbon: left === null ? undefined : left < 0 ? { text: 'Expire', tone: 'red' } : left <= 30 ? { text: `${left} din me expire`, tone: 'amber' } : undefined,
        badges: p?.isPrescriptionOnly ? <span className={`${chip} bg-sky-600 text-white`}><Pill className="h-3 w-3" />Parchi</span> : undefined,
        chips: p?.categoryType ? <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[0.6875rem] text-amber-800">{categoryLabel(p.categoryType)}</span> : undefined,
      };
    },
    columns: [
      { id: 'pet', label: 'Kis ke liye', cell: (i) => line(profiles.get(i.id)) || <span className="text-slate-400">—</span> },
      { id: 'expiry', label: 'Expiry', cell: (i) => {
        const left = daysFromToday(profiles.get(i.id)?.expiryDate);
        if (left === null) return <span className="text-slate-400">—</span>;
        return <span className={left < 0 ? 'font-semibold text-rose-700' : left <= 30 ? 'font-semibold text-amber-700' : 'text-slate-700'}>{left < 0 ? `${-left} din pehle` : `${left} din`}</span>;
      } },
    ],
    guide: [
      { icon: PawPrint, color: '#0284c7', title: 'Kis janwar ke liye', text: 'Har cheez par janwar aur umar likhein — counter par "billi" ya "kutta" likhne se wahi cheezein aati hain.' },
      { icon: CalendarX, color: '#e11d48', title: 'Expiry', text: 'Dawai, vaccine aur khane ki batch ki expiry likhein — expire hone wali cheez par laal patti aati hai.' },
    ],
  }), [profiles]);
  return <ProductsPage config={config} />;
}
