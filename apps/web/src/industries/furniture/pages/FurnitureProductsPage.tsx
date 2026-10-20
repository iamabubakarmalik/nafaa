/**
 * Furniture on the shared products page: type, wood and condition under
 * every name (Double bed · Sheesham · Display piece), fitting and order-made
 * marks, and links to custom orders and deliveries.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Hammer, Palette, Sofa, Truck } from 'lucide-react';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import type { FurnitureProductProfile } from '../api/products.api';
import { useFurnitureProfiles } from '../hooks/useFurnitureProfiles';
import { CONDITIONS, categoryLabel, materialOf } from '../lib/meta';

function HeroLinks() {
  return (
    <>
      <Link to="/furniture/custom-orders" className={heroButton}><ClipboardList className="h-4 w-4" /><span className="hidden sm:inline">Custom orders</span></Link>
      <Link to="/furniture/deliveries" className={heroButton}><Truck className="h-4 w-4" /><span className="hidden sm:inline">Deliveries</span></Link>
    </>
  );
}

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.625rem] font-bold';
const line = (p?: FurnitureProductProfile) => (p ? [p.categoryType ? categoryLabel(p.categoryType) : null, p.woodType || (p.primaryMaterial ? materialOf(p.primaryMaterial) : null), p.polishType || p.colorName].filter(Boolean).join(' · ') : '');

export default function FurnitureProductsPage() {
  const profiles = useFurnitureProfiles();
  const config = useMemo<ProductsPageConfig>(() => ({
    label: 'Furniture',
    noun: 'item',
    paths: { detail: (id) => `/furniture-products/${id}`, edit: (id) => `/furniture-products/${id}/edit`, create: '/furniture-products/new' },
    HeroExtra: HeroLinks,
    filters: ['tags'],
    stockChips: () => [1, 2, 4, 6],
    extras: (item) => {
      const p = profiles.get(item.id);
      if (!p) return {};
      const cond = p.conditionType !== 'BRAND_NEW' ? CONDITIONS[p.conditionType] : undefined;
      return {
        line: line(p) || undefined,
        badges: (
          <>
            {cond && <span className={`${chip} bg-amber-500 text-white`}>{cond.label}</span>}
            {p.requiresAssembly && <span className={`${chip} bg-sky-600 text-white`}><Hammer className="h-3 w-3" />Fitting</span>}
            {p.isCustomizable && <span className={`${chip} bg-violet-600 text-white`}>Order par bhi</span>}
          </>
        ),
      };
    },
    columns: [
      { id: 'wood', label: 'Lakri / material', cell: (i) => { const p = profiles.get(i.id); return p?.woodType || (p?.primaryMaterial ? materialOf(p.primaryMaterial) : null) || <span className="text-slate-400">—</span>; } },
      { id: 'condition', label: 'Halat', cell: (i) => {
        const p = profiles.get(i.id);
        const c = p ? CONDITIONS[p.conditionType] : undefined;
        return c ? <span className={`rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold ring-1 ${c.tone}`}>{c.label}</span> : <span className="text-slate-400">—</span>;
      } },
    ],
    guide: [
      { icon: Sofa, color: '#a16207', title: 'Showroom ka maal', text: 'Jo furniture tayyar pada hai wo yahan — counter par bikta hai. Order par banne wala Custom orders me.' },
      { icon: Palette, color: '#7c3aed', title: 'Rang aur kapra', text: 'Ek design kai rang me ho to Edit → Price me variants banayein — har rang ka stock alag.' },
      { icon: Truck, color: '#0891b2', title: 'Delivery', text: 'Bill ke baad counter se hi delivery banti hai — fitting aur gaari ke charges ke saath.' },
    ],
  }), [profiles]);
  return <ProductsPage config={config} />;
}
