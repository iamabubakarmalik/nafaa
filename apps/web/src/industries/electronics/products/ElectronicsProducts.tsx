/** Electronics products: condition, type, warranty, serial counts and MRP checks on the shared page. */

import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Barcode, Hash, ShieldCheck } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { ProductsPage } from '@modules/inventory/products/list/ProductsPage';
import type { ProductsPageConfig } from '@modules/inventory/products/list/types';
import { qty } from '@modules/inventory/products/list/components/ProductCard';
import { serialTrackingApi } from '../api/serial-tracking.api';
import { CATEGORY_META, CONDITION_META, type CategoryType, type ConditionType } from '../constants';

const conditionLabels = Object.fromEntries(Object.entries(CONDITION_META).map(([k, v]) => [k, `${v.emoji} ${v.label}`]));
const typeLabels = { ...Object.fromEntries(Object.entries(CATEGORY_META).map(([k, v]) => [k, `${v.emoji} ${v.label}`])), none: 'Detail nahi bhari' };

function SerialsLink() {
  return (
    <Link to="/electronics/serials" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-2.5 text-[0.8125rem] font-semibold ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25">
      <Barcode className="h-4 w-4" /><span className="hidden sm:inline">Serials</span>
    </Link>
  );
}

const config: ProductsPageConfig = {
  label: 'Electronics',
  paths: {
    detail: (id) => `/electronics-products/${id}`,
    edit: (id) => `/electronics-products/${id}/edit`,
    create: '/electronics-products/new',
  },
  HeroExtra: SerialsLink,
  filters: ['condition', 'etype', 'serial', 'tags'],
  facetLabels: { condition: conditionLabels, etype: typeLabels },
  sorts: [{ value: 'warranty', label: 'Lambi warranty pehle' }],
  extras: (item) => {
    const e = item.electronics;
    if (!e) return {};
    const gap = e.tracked ? Math.round(item.stock) - e.serials : 0;
    const cond = CONDITION_META[e.condition as ConditionType];
    const brand = item.brand?.name;
    return {
      line: [brand, e.model].filter(Boolean).join(' · ') || undefined,
      badges: (
        <>
          {e.warrantyMonths > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/90 px-1.5 py-0.5 text-[0.625rem] font-bold text-white"><ShieldCheck className="h-3 w-3" />{e.warrantyMonths}m</span>}
          {e.tracked && <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.625rem] font-bold text-white', gap ? 'bg-rose-600' : 'bg-slate-900/75')}><Hash className="h-3 w-3" />{e.serials}</span>}
          {e.mrp && item.price > e.mrp && <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[0.625rem] font-bold text-white">MRP+</span>}
        </>
      ),
      chips: (
        <>
          {cond && e.condition !== 'BRAND_NEW' && <span className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold', cond.chip)}>{cond.label}</span>}
          {e.categoryType && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-600">{CATEGORY_META[e.categoryType as CategoryType]?.label ?? e.categoryType}</span>}
        </>
      ),
      ribbon: gap ? { text: `Serial ${Math.abs(gap)} ${gap > 0 ? 'kam' : 'zyada'}`, tone: 'violet' } : undefined,
      actions: e.tracked ? (
        <Link to={`/electronics/serials?product=${item.id}`} title="Serials" aria-label="Serials" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"><Barcode className="h-4 w-4" /></Link>
      ) : undefined,
    };
  },
  columns: [
    { id: 'cond', label: 'Halat', cell: (i) => (i.electronics ? CONDITION_META[i.electronics.condition as ConditionType]?.label ?? i.electronics.condition : '—') },
    {
      id: 'serial', label: 'Serial', align: 'right', cell: (i) => {
        const e = i.electronics;
        if (!e?.tracked) return <span className="text-slate-400">—</span>;
        const gap = Math.round(i.stock) - e.serials;
        return <span className={cn('font-semibold tabular-nums', gap ? 'text-rose-600' : 'text-slate-700')}>{e.serials}{gap ? ` (${gap > 0 ? '−' : '+'}${Math.abs(gap)})` : ''}</span>;
      },
    },
    { id: 'warranty', label: 'Warranty', cell: (i) => (i.electronics?.warrantyMonths ? `${i.electronics.warrantyMonths} mahine` : '—') },
  ],
  Banners: ({ data, setFilter }) => (
    <>
      {data.alerts.mismatch.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-violet-50 px-4 py-3 ring-1 ring-violet-200/70">
          <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-violet-900"><Hash className="h-4 w-4 text-violet-600" />{data.facets.serial.mismatch} cheezon ka stock aur serial barabar nahi:</span>
          {data.alerts.mismatch.slice(0, 5).map((m) => (
            <Link key={m.id} to={`/electronics-products/${m.id}`} className="rounded-full bg-white px-2.5 py-1 text-[0.75rem] font-medium text-violet-900 ring-1 ring-violet-200 hover:bg-violet-100">
              {m.name} · {qty(m.stock)}/{m.serials}
            </Link>
          ))}
          <button type="button" onClick={() => setFilter('serial', 'mismatch')} className="ml-auto text-[0.75rem] font-semibold text-violet-800 hover:underline">Sab dekhein →</button>
        </div>
      )}
      {data.alerts.overMrp.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200/70">
          <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-rose-900"><AlertTriangle className="h-4 w-4 text-rose-600" />MRP se zyada rate:</span>
          {data.alerts.overMrp.slice(0, 5).map((m) => (
            <Link key={m.id} to={`/electronics-products/${m.id}/edit`} className="rounded-full bg-white px-2.5 py-1 text-[0.75rem] font-medium text-rose-900 ring-1 ring-rose-200 hover:bg-rose-100">
              {m.name} · {Math.round(m.price)} / MRP {Math.round(m.mrp)}
            </Link>
          ))}
        </div>
      )}
    </>
  ),
  onScanMiss: async (code, navigate) => {
    const hit = await serialTrackingApi.lookup(code).catch(() => null);
    if (!hit) return false;
    toast.success('Yeh serial/IMEI mil gaya', { action: { label: 'Kholein', onClick: () => navigate(`/electronics/serials?q=${encodeURIComponent(code)}`) } });
    return true;
  },
  guide: [
    { icon: Hash, color: '#7c3aed', title: 'Serial ki ginti', text: 'Jin cheezon ka serial/IMEI hota hai, unka stock aur serials barabar hone chahiye. Jamni patti batati hai kahan farq hai.' },
    { icon: ShieldCheck, color: '#16a34a', title: 'Warranty aur MRP', text: 'Card par warranty mahine likhe hain. Rate MRP se zyada ho to laal "MRP+" lagta hai.' },
  ],
};

export default function ElectronicsProducts() {
  return <ProductsPage config={config} />;
}
