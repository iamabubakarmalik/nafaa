/**
 * Jewelry pieces on the shared products page: karat, weight and today's
 * price at the current rate on every card, links to rates and metal stock,
 * and a warning when a karat on sale has no rate set.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Coins, Gem, Scale, TrendingUp } from 'lucide-react';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { KaratPill } from '../components/ui';
import { useJewelryFacts } from '../hooks/useJewelryFacts';
import { categoryLabel, grams, purityLabel } from '../lib/meta';

function HeroLinks() {
  return (
    <>
      <Link to="/jewelry/metal-rates" className={heroButton}><TrendingUp className="h-4 w-4" /><span className="hidden sm:inline">Aaj ka rate</span></Link>
      <Link to="/jewelry/metal-stock" className={heroButton}><Coins className="h-4 w-4" /><span className="hidden sm:inline">Metal stock</span></Link>
    </>
  );
}

const base: Omit<ProductsPageConfig, 'extras' | 'columns' | 'Banners'> = {
  label: 'Jewelry',
  noun: 'zewar',
  paths: {
    detail: (id) => `/jewelry-items/${id}`,
    edit: (id) => `/jewelry-items/${id}/edit`,
    create: '/jewelry-items/new',
  },
  HeroExtra: HeroLinks,
  filters: ['tags'],
  stockChips: () => [1, 2, 5, 10],
  guide: [
    { icon: Scale, color: '#d97706', title: 'Wazan aur karat', text: 'Har zewar ka asal (net) wazan aur karat likhein. Card par aaj ke rate se qeemat dikhti hai.' },
    { icon: TrendingUp, color: '#16a34a', title: 'Aaj ka rate', text: 'Subah "Aaj ka rate" me 24K likhein — baqi karat khud ban jate hain. POS par qeemat usi se lagti hai.' },
    { icon: Gem, color: '#7c3aed', title: 'Banwai aur nag', text: 'Banwai (per gram ya fixed), kaat/wastage aur nag ki qeemat zewar me likhein — bill par alag alag chhapti hai.' },
  ],
};

export default function JewelryProductsPage() {
  const { byProduct } = useJewelryFacts();
  const config = useMemo<ProductsPageConfig>(() => {
    const missing = new Set<string>();
    for (const f of byProduct.values()) if (!f.price) missing.add(purityLabel(f.purity));
    return {
      ...base,
      Banners: () => (missing.size ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200/70">
          <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-amber-900">
            <TrendingUp className="h-4 w-4 text-amber-600" />{[...missing].join(', ')} ka aaj ka rate set nahi — in zewar ki qeemat POS par khud likhni paregi
          </span>
          <Link to="/jewelry/metal-rates" className="ml-auto text-[0.75rem] font-semibold text-amber-900 hover:underline">Rate likhein →</Link>
        </div>
      ) : null),
      extras: (item, { money }) => {
        const f = byProduct.get(item.id);
        if (!f) return {};
        return {
          line: [categoryLabel(f.category), grams(f.netWeight), f.price ? `Aaj ${money(f.price.total)}` : null].filter(Boolean).join(' · '),
          badges: <KaratPill purity={f.purity} className="bg-white/95" />,
          chips: f.hallmarkNumber ? <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-emerald-700">Hallmark</span> : undefined,
        };
      },
      columns: [
        { id: 'karat', label: 'Karat', cell: (i) => { const f = byProduct.get(i.id); return f ? <KaratPill purity={f.purity} /> : <span className="text-slate-400">—</span>; } },
        { id: 'weight', label: 'Wazan', align: 'right', cell: (i) => { const f = byProduct.get(i.id); return f ? <span className="tabular-nums">{grams(f.netWeight)}</span> : <span className="text-slate-400">—</span>; } },
        {
          id: 'today', label: 'Aaj ki qeemat', align: 'right', cell: (i) => {
            const f = byProduct.get(i.id);
            return f?.price ? <span className="font-semibold tabular-nums">Rs {Math.round(f.price.total).toLocaleString('en-PK')}</span> : <span className="text-slate-400">—</span>;
          },
        },
      ],
    };
  }, [byProduct]);
  return <ProductsPage config={config} />;
}
