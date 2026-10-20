/**
 * Optical stock on the shared products page: frames show brand, model,
 * colour and size; stock lenses their index and coating; contact lenses
 * their fit and the nearest expiry. Links to orders and nuskhe.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, FileText, Glasses, Palette, Ruler } from 'lucide-react';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { factLine, kindOf, typeLabel, useOpticalFacts } from '../hooks/useOpticalFacts';

function HeroLinks() {
  return (
    <>
      <Link to="/optical/lens-orders" className={heroButton}><Glasses className="h-4 w-4" /><span className="hidden sm:inline">Orders</span></Link>
      <Link to="/optical/prescriptions" className={heroButton}><FileText className="h-4 w-4" /><span className="hidden sm:inline">Nuskhe</span></Link>
    </>
  );
}

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold';

const base: Omit<ProductsPageConfig, 'extras' | 'columns'> = {
  label: 'Optical',
  noun: 'item',
  paths: { detail: (id) => `/optical-products/${id}`, edit: (id) => `/optical-products/${id}/edit`, create: '/optical-products/new' },
  HeroExtra: HeroLinks,
  filters: ['tags'],
  stockChips: () => [1, 5, 10, 20],
  guide: [
    { icon: Ruler, color: '#0891b2', title: 'Frame ki pehchan', text: 'Har frame par brand, model, rang aur size (52-18-145) naam ke neeche — customer ka purana frame dhoondna aasaan.' },
    { icon: Palette, color: '#7c3aed', title: 'Rang', text: 'Ek model ke kai rang hon to rang variant banayein — har rang ka stock alag.' },
    { icon: CalendarClock, color: '#e11d48', title: 'Contact lens expiry', text: 'Contact lens aur solution ki expiry batch me — qareeb expiry wale upar "Expiry" filter me.' },
  ],
};

export default function OpticalProductsPage() {
  const facts = useOpticalFacts();
  const config = useMemo<ProductsPageConfig>(() => ({
    ...base,
    extras: (item) => {
      const f = facts.get(item.id);
      const kind = kindOf(f?.categoryType);
      return {
        line: factLine(f),
        badges: (
          <>
            {f?.hasBlueCut && <span className={`${chip} bg-sky-600 text-white`}>Blue cut</span>}
            {f?.isPolarized && <span className={`${chip} bg-slate-800 text-white`}>Polarized</span>}
          </>
        ),
        chips: (
          <>
            {f?.categoryType && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-600">{typeLabel(f.categoryType)}</span>}
            {f?.colorHex && kind !== 'contact' && <span className={`${chip} bg-white ring-1 ring-slate-200`}><span className="h-2.5 w-2.5 rounded-full ring-1 ring-slate-300" style={{ backgroundColor: f.colorHex }} />{f.colorName}</span>}
            {f?.warrantyMonths ? <span className={`${chip} bg-emerald-50 text-emerald-700`}>{f.warrantyMonths} mahine warranty</span> : null}
          </>
        ),
      };
    },
    columns: [
      { id: 'kind', label: 'Type', cell: (i) => typeLabel(facts.get(i.id)?.categoryType) || <span className="text-slate-400">—</span> },
      { id: 'facts', label: 'Brand / size', cell: (i) => factLine(facts.get(i.id)) || <span className="text-slate-400">—</span> },
    ],
  }), [facts]);
  return <ProductsPage config={config} />;
}
