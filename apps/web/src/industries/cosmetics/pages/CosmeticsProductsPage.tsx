/**
 * Cosmetics stock on the shared products page: brand under every name,
 * shades as variants (swatches on the card), and the nearest batch expiry
 * with how many pieces expire soon. Links to Expiry, Testers and Deals.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Gift, Palette, TestTube2 } from 'lucide-react';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { dayOnly, daysFrom } from '../lib/meta';

function HeroLinks() {
  return (
    <>
      <Link to="/cosmetics/expiry" className={heroButton}><CalendarClock className="h-4 w-4" /><span className="hidden sm:inline">Expiry</span></Link>
      <Link to="/cosmetics/testers" className={heroButton}><TestTube2 className="h-4 w-4" /><span className="hidden sm:inline">Testers</span></Link>
      <Link to="/combos" className={heroButton}><Gift className="h-4 w-4" /><span className="hidden sm:inline">Deals</span></Link>
    </>
  );
}

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold';

export default function CosmeticsProductsPage() {
  const config = useMemo<ProductsPageConfig>(() => ({
    label: 'Cosmetics',
    noun: 'product',
    paths: { detail: (id) => `/cosmetics-products/${id}`, edit: (id) => `/cosmetics-products/${id}/edit`, create: '/cosmetics-products/new' },
    HeroExtra: HeroLinks,
    filters: ['tags'],
    stockChips: () => [1, 6, 12, 24],
    extras: (item) => {
      const d = daysFrom(item.expiry);
      const shades = item.variants.filter((v) => v.colorHex).slice(0, 6);
      return {
        line: item.brand?.name,
        ribbon: d != null && d < 0 ? { text: 'Expire ho gaya', tone: 'red' } : d != null && d <= 30 ? { text: `${d} din me expire`, tone: 'amber' } : null,
        chips: (
          <>
            {shades.length > 0 && <span className={`${chip} bg-white ring-1 ring-slate-200`}>{shades.map((v) => <span key={v.id} title={v.name} className="h-2.5 w-2.5 rounded-full ring-1 ring-slate-300" style={{ backgroundColor: v.colorHex ?? undefined }} />)}{item.variants.length > shades.length ? `+${item.variants.length - shades.length}` : ''}</span>}
            {!shades.length && item.counts.variants > 0 && <span className={`${chip} bg-violet-50 text-violet-700`}><Palette className="h-3 w-3" />{item.counts.variants} shade</span>}
            {item.expiringQty > 0 && <span className={`${chip} bg-amber-50 text-amber-800`}>{item.expiringQty} jaldi expire</span>}
          </>
        ),
      };
    },
    columns: [
      { id: 'brand', label: 'Brand', cell: (i) => i.brand?.name ?? <span className="text-slate-400">—</span> },
      { id: 'expiry', label: 'Qareeb expiry', cell: (i) => {
        const d = daysFrom(i.expiry);
        return i.expiry ? <span className={d != null && d <= 30 ? 'font-semibold text-amber-700' : ''}>{dayOnly(i.expiry)}</span> : <span className="text-slate-400">—</span>;
      } },
    ],
    guide: [
      { icon: Palette, color: '#db2777', title: 'Shade', text: 'Ek lipstick ke kai shade hon to har shade variant banayein — rang ka nishan aur stock alag.' },
      { icon: CalendarClock, color: '#e11d48', title: 'Expiry', text: 'Purchase par batch aur expiry likhein. Counter pehle purani expiry bechta hai; 30 din wale card par peele.' },
      { icon: TestTube2, color: '#7c3aed', title: 'Tester', text: 'Tester kholne par Testers page se likhein — stock se nikalta hai aur nuksan report me aata hai.' },
    ],
  }), []);
  return <ProductsPage config={config} />;
}
