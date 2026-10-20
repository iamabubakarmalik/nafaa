/**
 * Toys on the shared products page: age, type and brand under every toy,
 * badges for small parts and cells not in the box, Eid gift marks, and
 * links to gift packs and the safety review.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BatteryCharging, Gift, Moon, ShieldAlert, Sparkles, Baby } from 'lucide-react';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { cellsNeeded, factLine, useToyFacts } from '../hooks/useToyFacts';
import { AGE_GROUPS, labelOf } from '../lib/meta';

function HeroLinks() {
  return (
    <>
      <Link to="/toystore/gift-packs" className={heroButton}><Gift className="h-4 w-4" /><span className="hidden sm:inline">Gift packs</span></Link>
      <Link to="/toystore/safety-review" className={heroButton}><ShieldAlert className="h-4 w-4" /><span className="hidden sm:inline">Safety</span></Link>
    </>
  );
}

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold';

const base: Omit<ProductsPageConfig, 'extras' | 'columns'> = {
  label: 'Toy shop',
  noun: 'khilona',
  paths: {
    detail: (id) => `/toystore-products/${id}`,
    edit: (id) => `/toystore-products/${id}/edit`,
    create: '/toystore-products/new',
    bulkImport: '/products/bulk-import',
  },
  HeroExtra: HeroLinks,
  filters: ['tags'],
  stockChips: () => [1, 6, 12, 24],
  guide: [
    { icon: Baby, color: '#db2777', title: 'Umar', text: 'Har khilone par umar likhein — POS par umar ke chips se foran milta hai aur Gift finder bhi isi se chalta hai.' },
    { icon: AlertTriangle, color: '#d97706', title: 'Chhote purze', text: '3 saal se chhote bachon ke liye "Chhote purze" wale khilone POS par peeli nishani ke saath aate hain.' },
    { icon: BatteryCharging, color: '#0891b2', title: 'Cell', text: 'Jis khilone ke cell dabbe me nahi, us par "Cell alag" aata hai — customer ko cell bhi de dein.' },
    { icon: Sparkles, color: '#7c3aed', title: 'Rang aur model', text: 'Ek khilona kai rang me ho to Stock step me rang ko variant banayein — har rang ka stock alag.' },
  ],
};

export default function ToyProductsPage() {
  const facts = useToyFacts();
  const config = useMemo<ProductsPageConfig>(() => ({
    ...base,
    extras: (item) => {
      const f = facts.get(item.id);
      if (!f) return {};
      const cells = cellsNeeded(f);
      return {
        line: factLine(f),
        badges: f.chokingHazard ? <span className={`${chip} bg-amber-500 text-white`}><AlertTriangle className="h-3 w-3" />3 saal se kam nahi</span> : null,
        chips: (
          <>
            {cells && <span className={`${chip} bg-sky-50 text-sky-700`}><BatteryCharging className="h-3 w-3" />Cell alag: {cells}</span>}
            {f.isEidGift && <span className={`${chip} bg-emerald-50 text-emerald-700`}><Moon className="h-3 w-3" />Eid</span>}
            {f.isEducational && <span className={`${chip} bg-violet-50 text-violet-700`}>Educational</span>}
          </>
        ),
      };
    },
    columns: [
      { id: 'age', label: 'Umar', cell: (i) => { const f = facts.get(i.id); return f ? labelOf(AGE_GROUPS, f.ageGroup) : <span className="text-slate-400">—</span>; } },
      { id: 'brand', label: 'Brand', cell: (i) => facts.get(i.id)?.brand || <span className="text-slate-400">—</span> },
    ],
  }), [facts]);
  return <ProductsPage config={config} />;
}
