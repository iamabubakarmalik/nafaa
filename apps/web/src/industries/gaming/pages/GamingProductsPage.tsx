/**
 * Gaming products on the shared products page: platform, condition and
 * category under every name (PS5 · Used · Game CD), rentable and pre-order
 * marks, and links to stations, cards and rentals.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Gamepad2, PackageOpen, Recycle, Timer } from 'lucide-react';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import type { GamingProductProfile } from '../api/products.api';
import { useGamingProfiles } from '../hooks/useGamingProfiles';
import { CONDITIONS, PLATFORMS, TIME_SKU, categoryLabel } from '../lib/meta';

function HeroLinks() {
  return (
    <>
      <Link to="/gaming/topups" className={heroButton}><CreditCard className="h-4 w-4" /><span className="hidden sm:inline">Top-up cards</span></Link>
      <Link to="/gaming/rentals" className={heroButton}><PackageOpen className="h-4 w-4" /><span className="hidden sm:inline">Rentals</span></Link>
    </>
  );
}

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.625rem] font-bold';
const line = (p?: GamingProductProfile) => (p ? [PLATFORMS[p.platform] ?? p.platform, p.categoryType ? categoryLabel(p.categoryType) : null, p.region].filter(Boolean).join(' · ') : '');

export default function GamingProductsPage() {
  const profiles = useGamingProfiles();
  const config = useMemo<ProductsPageConfig>(() => ({
    label: 'Gaming',
    noun: 'item',
    paths: { detail: (id) => `/gaming-products/${id}`, edit: (id) => `/gaming-products/${id}/edit`, create: '/gaming-products/new' },
    HeroExtra: HeroLinks,
    filters: ['tags'],
    stockChips: () => [1, 2, 5, 10],
    extras: (item) => {
      const p = profiles.get(item.id);
      if (item.sku === TIME_SKU) return { line: 'Station ka waqt — rate har session par lagta hai' };
      if (!p) return {};
      const cond = p.conditionType !== 'NEW_SEALED' ? CONDITIONS[p.conditionType] : undefined;
      return {
        line: line(p) || undefined,
        badges: (
          <>
            {cond && <span className={`${chip} bg-amber-500 text-white`}><Recycle className="h-3 w-3" />{cond.label}</span>}
            {p.isPreOrder && <span className={`${chip} bg-violet-600 text-white`}>Pre-order</span>}
            {p.isRentable && <span className={`${chip} bg-sky-600 text-white`}><Timer className="h-3 w-3" />Kiraye par</span>}
          </>
        ),
      };
    },
    columns: [
      { id: 'platform', label: 'Platform', cell: (i) => { const p = profiles.get(i.id); return p ? PLATFORMS[p.platform] ?? p.platform : <span className="text-slate-400">—</span>; } },
      { id: 'condition', label: 'Halat', cell: (i) => {
        const p = profiles.get(i.id);
        const c = p ? CONDITIONS[p.conditionType] : undefined;
        return c ? <span className={`rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold ring-1 ${c.tone}`}>{c.label}</span> : <span className="text-slate-400">—</span>;
      } },
    ],
    guide: [
      { icon: Gamepad2, color: '#7c3aed', title: 'Platform aur halat', text: 'Har game/console ka platform (PS5, PS4, PC) aur halat (naya, used) likhein — counter par card par dikhta hai aur "Used" filter chalta hai.' },
      { icon: CreditCard, color: '#d97706', title: 'Top-up cards', text: 'PUBG UC, PSN jaise card Top-ups page par daalein — counter par khud tile ban jati hai, yahan product banane ki zaroorat nahi.' },
      { icon: Timer, color: '#0891b2', title: 'Kiraye wala saman', text: 'Console kiraye par dete hain to Edit → "Rental" me rate aur deposit likhein; Rentals page par wahi rate aata hai.' },
    ],
  }), [profiles]);
  return <ProductsPage config={config} />;
}
