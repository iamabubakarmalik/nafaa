/**
 * Medicines on the shared products page: schedule (Rx, register, fridge),
 * generic name and form on every card, links to expiry and salts, and a
 * warning strip for batches about to expire.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Beaker, CalendarX, FileText, ShieldAlert, Snowflake } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { heroButton } from '@/design-system/components';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { useMedicineFacts } from '../hooks/useMedicineFacts';
import { REGISTER_CLASSES, SCHEDULE_META } from '../lib/meta';

function HeroLinks() {
  return (
    <>
      <Link to="/pharmacy/expiring" className={heroButton}><CalendarX className="h-4 w-4" /><span className="hidden sm:inline">Expiry</span></Link>
      <Link to="/pharmacy/salts" className={heroButton}><Beaker className="h-4 w-4" /><span className="hidden sm:inline">Salts</span></Link>
    </>
  );
}

const base: Omit<ProductsPageConfig, 'extras' | 'columns'> = {
  label: 'Pharmacy',
  noun: 'dawai',
  paths: {
    detail: (id) => `/pharmacy-medicines/${id}`,
    edit: (id) => `/pharmacy-medicines/${id}/edit`,
    create: '/pharmacy-medicines/new',
  },
  HeroExtra: HeroLinks,
  filters: ['tags'],
  stockChips: () => [1, 10, 30, 100],
  Banners: ({ data }) => (data.stats.expiring > 0 ? (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200/70">
      <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-amber-900">
        <CalendarX className="h-4 w-4 text-amber-600" />{data.stats.expiring} dawaiyon ka batch {data.stats.expiryDays} din me expire hoga
      </span>
      <Link to="/pharmacy/expiring" className="ml-auto text-[0.75rem] font-semibold text-amber-900 hover:underline">Expiry list →</Link>
    </div>
  ) : null),
  guide: [
    { icon: Beaker, color: '#0891b2', title: 'Formula (salt)', text: 'Har dawai ka salt aur strength likhein — card par generic naam dikhta hai aur POS par salt se dhoond kar substitute milta hai.' },
    { icon: ShieldAlert, color: '#e11d48', title: 'Register wali dawai', text: 'Narcotic aur controlled dawai par laal "Register" lagta hai. POS par in ke liye doctor aur mareez ka naam poocha jata hai.' },
    { icon: CalendarX, color: '#d97706', title: 'Batch aur expiry', text: 'Purchase me har batch ka number aur expiry likhein. POS pehle jaldi expire hone wala batch bechta hai.' },
  ],
};

export default function PharmacyProducts() {
  const facts = useMedicineFacts();
  const config = useMemo<ProductsPageConfig>(() => ({
    ...base,
    extras: (item) => {
      const m = facts.get(item.id);
      if (!m) return {};
      const register = m.isNarcotic || REGISTER_CLASSES.includes(m.scheduleClass);
      return {
        line: [m.generic, m.dosageForm, m.packSize].filter(Boolean).join(' · ') || undefined,
        badges: (
          <>
            {register
              ? <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><ShieldAlert className="h-3 w-3" />Register</span>
              : m.requiresPrescription && <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><FileText className="h-3 w-3" />Rx</span>}
            {(m.requiresColdChain || m.isRefrigerated) && <span className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><Snowflake className="h-3 w-3" />Fridge</span>}
          </>
        ),
        chips: m.manufacturer ? <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-600">{m.manufacturer}</span> : undefined,
      };
    },
    columns: [
      { id: 'generic', label: 'Formula', cell: (i) => facts.get(i.id)?.generic || <span className="text-slate-400">—</span> },
      {
        id: 'schedule', label: 'Schedule', cell: (i) => {
          const m = facts.get(i.id);
          const s = m ? SCHEDULE_META[m.scheduleClass] : undefined;
          return s ? <span className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold ring-1', s.tone)}>{s.label}</span> : <span className="text-slate-400">—</span>;
        },
      },
    ],
  }), [facts]);
  return <ProductsPage config={config} />;
}
