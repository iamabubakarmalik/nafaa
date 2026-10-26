/**
 * Florist items on the shared products page: flower, colour and stem
 * count under every name, a freshness ribbon (wilted, last day), and links
 * to freshness, combos (bouquet recipes) and delivery orders.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Flower2, Layers, Leaf, Truck } from 'lucide-react';
import { Badge, heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { floristProductsApi, type FloristProductProfile } from '../api/products.api';
import { FLORIST_KEYS, categoryLabel, daysFromToday } from '../lib/meta';

function HeroLinks() {
  return (
    <>
      <Link to="/florist/freshness" className={heroButton}><Leaf className="h-4 w-4" /><span className="hidden sm:inline">Freshness</span></Link>
      <Link to="/combos" className={heroButton}><Layers className="h-4 w-4" /><span className="hidden sm:inline">Bouquet recipe</span></Link>
      <Link to="/florist/orders" className={heroButton}><Truck className="h-4 w-4" /><span className="hidden sm:inline">Orders</span></Link>
    </>
  );
}

const line = (p?: FloristProductProfile) => (p ? [p.flowerType, p.color, p.stemCount ? `${p.stemCount} phool` : null, p.bouquetSize].filter(Boolean).join(' · ') : '');

function useFloristProfiles() {
  const q = useQuery({ queryKey: [FLORIST_KEYS.profiles], queryFn: () => floristProductsApi.list(), staleTime: 60_000 });
  return useMemo(() => new Map((q.data ?? []).map((p) => [p.productId, p])), [q.data]);
}

export default function FloristProductsPage() {
  const profiles = useFloristProfiles();
  const config = useMemo<ProductsPageConfig>(() => ({
    label: 'Florist',
    noun: 'cheez',
    paths: { detail: (id) => `/florist-products/${id}`, edit: (id) => `/florist-products/${id}/edit`, create: '/florist-products/new' },
    HeroExtra: HeroLinks,
    filters: ['tags'],
    stockChips: () => [10, 25, 50, 100],
    extras: (item) => {
      const p = profiles.get(item.id);
      const left = daysFromToday(p?.freshUntil);
      return {
        line: line(p) || undefined,
        ribbon: left === null ? undefined : left < 0 ? { text: 'Murjha gaya', tone: 'red' } : left <= 1 ? { text: left === 0 ? 'Aaj tak fresh' : 'Kal tak fresh', tone: 'amber' } : undefined,
        badges: p?.isPreArranged ? <Badge size="xs" variant="brand" className="gap-1 shadow-sm"><Flower2 className="h-3 w-3" />Tayyar</Badge> : undefined,
        chips: p?.categoryType ? <span className="rounded-md bg-pink-50 px-1.5 py-0.5 text-[0.6875rem] text-pink-700">{categoryLabel(p.categoryType)}</span> : undefined,
      };
    },
    columns: [
      { id: 'flower', label: 'Phool', cell: (i) => line(profiles.get(i.id)) || <span className="text-slate-400">—</span> },
      { id: 'fresh', label: 'Fresh tak', cell: (i) => {
        const p = profiles.get(i.id);
        const left = daysFromToday(p?.freshUntil);
        if (left === null) return <span className="text-slate-400">—</span>;
        return <span className={left < 0 ? 'font-semibold text-rose-700' : left <= 1 ? 'font-semibold text-amber-700' : 'text-slate-700'}>{left < 0 ? `${-left} din pehle` : left === 0 ? 'Aaj' : `${left} din`}</span>;
      } },
    ],
    guide: [
      { icon: Leaf, color: '#16a34a', title: 'Taazgi', text: 'Phool ki "kitne din chalta hai" likhein; naya maal aaye to Freshness page par "Naya maal aaya" dabayein — murjhane wale khud upar aate hain.' },
      { icon: Layers, color: '#db2777', title: 'Bouquet recipe', text: 'Bouquet ko Combo banayein (12 gulab + 1 wrapping). Counter par bouquet bikte hi har phool stock se nikal jata hai.' },
      { icon: Truck, color: '#0891b2', title: 'Delivery', text: 'Counter par bill ke saath "Delivery / order" bharein — Orders page par tayyari se delivery tak chalta hai.' },
    ],
  }), [profiles]);
  return <ProductsPage config={config} />;
}
