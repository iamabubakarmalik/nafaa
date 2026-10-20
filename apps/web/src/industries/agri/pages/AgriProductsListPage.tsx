/**
 * Agri products (ProductsListGate entry) on the shared products page:
 * kind, pack weight and active ingredient on every card, the registration
 * state of seeds, fertilizer and sprays, bulk rates, and warnings for
 * expired registrations and spray batches close to expiry.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CalendarX, ShieldAlert, Sprout, Tags, Tractor } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { factLine, useAgriFacts } from '../hooks/useAgriFacts';
import { deriveAgriKind, needsGovtReg, prettyAgriKind, type AgriKind } from '../lib/agriCategory';
import { certStatus } from '../lib/agriUnits';
import { seasonLabel } from '../lib/meta';

function HeroLinks() {
  return (
    <>
      <Link to="/agri/seasonal-plans" className={heroButton}><CalendarDays className="h-4 w-4" /><span className="hidden sm:inline">Fasal calendar</span></Link>
      <Link to="/agri/farmers" className={heroButton}><Tractor className="h-4 w-4" /><span className="hidden sm:inline">Farmers</span></Link>
    </>
  );
}

const pill = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.625rem] font-bold';

export default function AgriProductsListPage() {
  const facts = useAgriFacts();
  const expired = useMemo(() => [...facts.values()].filter((f) => needsGovtReg(f.category as AgriKind) && certStatus(f.govtRegExpiry).state === 'expired').length, [facts]);
  const config = useMemo<ProductsPageConfig>(() => ({
    label: 'Agri',
    noun: 'maal',
    paths: {
      detail: (id) => `/agri-products/${id}`,
      edit: (id) => `/agri-products/${id}/edit`,
      create: '/agri-products/new',
    },
    HeroExtra: HeroLinks,
    filters: ['tags'],
    stockChips: () => [1, 10, 50, 100],
    Banners: ({ data, setFilter }) => (expired > 0 || data.stats.expiring > 0 ? (
      <div className="flex flex-col gap-2">
        {expired > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200/70">
            <ShieldAlert className="h-4 w-4 text-rose-600" />
            <span className="text-[0.8125rem] font-semibold text-rose-900">{expired} cheezon ki sarkari registration khatam — POS par nahi bikengi jab tak nayi date na likhein</span>
          </div>
        )}
        {data.stats.expiring > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200/70">
            <CalendarX className="h-4 w-4 text-amber-600" />
            <span className="text-[0.8125rem] font-semibold text-amber-900">{data.stats.expiring} cheezon ka batch {data.stats.expiryDays} din me expire hoga</span>
            <button type="button" onClick={() => setFilter('stock', 'expiring')} className="ml-auto text-[0.75rem] font-semibold text-amber-900 hover:underline">Dikhayein →</button>
          </div>
        )}
      </div>
    ) : null),
    extras: (item) => {
      const f = facts.get(item.id);
      const kind = (f?.category as AgriKind | undefined) ?? deriveAgriKind(item.category?.name, item.name);
      const cert = needsGovtReg(kind) ? certStatus(f?.govtRegExpiry) : null;
      return {
        line: factLine(f),
        badges: (
          <>
            {cert?.state === 'expired' && <span className={cn(pill, 'bg-rose-600 text-white')}><ShieldAlert className="h-3 w-3" />Reg khatam</span>}
            {cert?.state === 'soon' && <span className={cn(pill, 'bg-amber-500 text-white')}><ShieldAlert className="h-3 w-3" />Reg {cert.days} din</span>}
            {Number(f?.bulkDiscountThreshold) > 0 && Number(f?.bulkDiscountPct) > 0 && <span className={cn(pill, 'bg-emerald-600 text-white')}><Tags className="h-3 w-3" />Bulk</span>}
          </>
        ),
        chips: kind !== 'OTHER' || f?.season ? (
          <>
            {kind !== 'OTHER' && <span className="rounded-md bg-lime-50 px-1.5 py-0.5 text-[0.6875rem] font-medium text-lime-800">{prettyAgriKind(kind)}</span>}
            {f?.season && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-600">{seasonLabel(f.season)}</span>}
          </>
        ) : undefined,
      };
    },
    columns: [
      { id: 'kind', label: 'Type', cell: (i) => { const f = facts.get(i.id); const k = (f?.category as AgriKind | undefined) ?? deriveAgriKind(i.category?.name, i.name); return k === 'OTHER' ? <span className="text-slate-400">—</span> : prettyAgriKind(k); } },
      { id: 'pack', label: 'Pack / formula', cell: (i) => factLine(facts.get(i.id)) ?? <span className="text-slate-400">—</span> },
      {
        id: 'reg', label: 'Registration', cell: (i) => {
          const f = facts.get(i.id);
          if (!f?.govtRegExpiry) return <span className="text-slate-400">—</span>;
          const c = certStatus(f.govtRegExpiry);
          return <span className={cn('text-[0.75rem] font-medium', c.state === 'expired' ? 'text-rose-600' : c.state === 'soon' ? 'text-amber-700' : 'text-emerald-700')}>{c.state === 'expired' ? 'Khatam' : `${c.days} din`}</span>;
        },
      },
    ],
    guide: [
      { icon: Sprout, color: '#65a30d', title: 'Bori aur kilo', text: 'Base unit bori rakhein aur pack me "50 kg" likhein. Khula kilo bechna ho to Price step me "Kilo" pack jorein — stock bori ke hisaab se ghatta hai.' },
      { icon: ShieldAlert, color: '#e11d48', title: 'Sarkari registration', text: 'Beej, khaad aur spray ki registration ki aakhri date likhein. Date guzar jaye to POS par nahi bikti.' },
      { icon: CalendarX, color: '#d97706', title: 'Spray ka batch', text: 'Company se maal lete waqt Purchase me batch aur expiry likhein. POS pehle jaldi expire hone wala batch bechta hai.' },
    ],
  }), [facts, expired]);
  return <ProductsPage config={config} />;
}
