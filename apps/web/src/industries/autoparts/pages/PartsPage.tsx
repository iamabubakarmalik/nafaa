/**
 * Auto parts on the shared products page: part number, brand and the
 * vehicles each part fits on every card, genuine/local/used marks, and
 * links to the vehicle list and workshop jobs.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Car, Hash, Wrench, Zap } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { categoryOf, conditionOf } from '../components/meta';
import { usePartFacts } from '../hooks/usePartFacts';

function HeroLinks() {
  return (
    <>
      <Link to="/autoparts/makes" className={heroButton}><Car className="h-4 w-4" /><span className="hidden sm:inline">Gaariyan</span></Link>
      <Link to="/autoparts/jobs" className={heroButton}><Wrench className="h-4 w-4" /><span className="hidden sm:inline">Workshop</span></Link>
    </>
  );
}

const base: Omit<ProductsPageConfig, 'extras' | 'columns'> = {
  label: 'Auto Parts',
  noun: 'part',
  paths: {
    detail: (id) => `/autoparts-parts/${id}`,
    edit: (id) => `/autoparts-parts/${id}/edit`,
    create: '/autoparts-parts/new',
  },
  HeroExtra: HeroLinks,
  filters: ['tags'],
  stockChips: () => [1, 2, 5, 10, 20],
  guide: [
    { icon: Hash, color: '#2563eb', title: 'Part number', text: 'Har part ka number likhein — SKU wahi banta hai aur search me milta hai. OEM aur doosre number counter par dhoondne ke kaam aate hain.' },
    { icon: Car, color: '#0891b2', title: 'Kis gaari ka', text: 'Part kholein → Edit → "Gaari" step. Card par likha aata hai aur counter par "corolla brake" se part milta hai.' },
    { icon: BadgeCheck, color: '#16a34a', title: 'Genuine / local / used', text: 'Card par harra nishan genuine, peela local, sleti used. Grahak ko sach batayein — wapsi kam hoti hai.' },
  ],
};

export default function PartsPage() {
  const facts = usePartFacts();
  const config = useMemo<ProductsPageConfig>(() => ({
    ...base,
    extras: (item) => {
      const f = facts.get(item.id);
      if (!f) return {};
      const c = conditionOf(f.condition);
      return {
        line: [f.partNumber, f.brand, f.universal ? 'Har gaari' : f.fitment].filter(Boolean).join(' · ') || undefined,
        badges: (
          <>
            {f.condition !== 'NEW' && <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.625rem] font-bold text-white" style={{ backgroundColor: c.color }}>{c.label}</span>}
            {f.isFastMoving && <span className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><Zap className="h-3 w-3" />Zyada bikta</span>}
          </>
        ),
        chips: f.category !== 'OTHER' ? <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-600">{categoryOf(f.category)}</span> : undefined,
      };
    },
    columns: [
      { id: 'partNumber', label: 'Part #', cell: (i) => facts.get(i.id)?.partNumber || <span className="text-slate-400">—</span> },
      {
        id: 'fits', label: 'Gaari', cell: (i) => {
          const f = facts.get(i.id);
          return f ? <span className={cn('line-clamp-1 max-w-[14rem]', !f.fitment && 'text-slate-400')}>{f.universal ? 'Har gaari' : f.fitment || '—'}</span> : <span className="text-slate-400">—</span>;
        },
      },
      {
        id: 'condition', label: 'Quality', cell: (i) => {
          const f = facts.get(i.id);
          return f ? <span className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold ring-1', conditionOf(f.condition).tone)}>{conditionOf(f.condition).label}</span> : <span className="text-slate-400">—</span>;
        },
      },
    ],
  }), [facts]);
  return <ProductsPage config={config} />;
}
