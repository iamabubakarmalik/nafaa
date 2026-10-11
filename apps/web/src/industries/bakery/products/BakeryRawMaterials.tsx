/** Raw materials tab on the bakery products page: stock, reorder level and value of each ingredient. */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Search, Snowflake, Wheat } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { ingredientsApi } from '../api/ingredients.api';

const fmt = (n: number) => String(Number(Number(n).toFixed(2)));

export default function BakeryRawMaterials() {
  const { cost } = useMasked();
  const [q, setQ] = useState('');
  const { data = [], isLoading } = useQuery({ queryKey: ['bakery-ingredients-list'], queryFn: () => ingredientsApi.list({}) });
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return data
      .filter((i) => !t || [i.name, i.category, i.lastVendorName].some((v) => v?.toLowerCase().includes(t)))
      .map((i) => ({ ...i, reorder: i.reorderLevel ?? i.minStock ?? 0 }))
      .sort((a, b) => Number(a.currentStock > a.reorder) - Number(b.currentStock > b.reorder) || a.name.localeCompare(b.name));
  }, [data, q]);
  const value = data.reduce((s, i) => s + Math.max(0, i.currentStock) * i.costPerUnit, 0);
  const low = data.filter((i) => i.currentStock <= (i.reorderLevel ?? i.minStock ?? 0)).length;

  if (isLoading) return <Skeleton className="h-96 rounded-3xl" />;
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] font-semibold text-slate-900">Kachcha maal</p>
          <p className="text-[0.75rem] text-slate-500">{data.length} cheezein · qeemat {cost(value)}{low ? ` · ${low} mangwani hain` : ''}</p>
        </div>
        <label className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Atta, cheeni, makhan…" className="h-10 w-full rounded-xl bg-slate-100/80 pl-9 pr-3 text-[0.875rem] outline-none focus:bg-white focus:ring-2 focus:ring-brand-500" />
        </label>
        <Link to="/bakery/ingredients" className="inline-flex h-10 items-center rounded-xl bg-slate-900 px-3.5 text-[0.8125rem] font-semibold text-white hover:bg-slate-800">Kachcha maal sambhalein</Link>
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <Wheat className="h-8 w-8 text-slate-300" />
          <p className="mt-2 font-semibold text-slate-900">{q ? 'Kuch nahi mila' : 'Abhi kachcha maal nahi daala'}</p>
          {!q && <Link to="/bakery/ingredients" className="mt-3 text-[0.8125rem] font-semibold text-brand-700 hover:underline">Kachcha maal daalein →</Link>}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-[0.8125rem]">
            <thead>
              <tr className="bg-slate-50/70 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Cheez</th><th className="px-3 py-2.5">Category</th><th className="px-3 py-2.5 text-right">Stock</th>
                <th className="px-3 py-2.5 text-right">Mangwane ki had</th><th className="px-3 py-2.5 text-right">Rate</th><th className="px-3 py-2.5 text-right">Qeemat</th><th className="px-4 py-2.5">Supplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((i) => {
                const short = i.currentStock <= i.reorder;
                return (
                  <tr key={i.id} className={cn(short && 'bg-amber-50/50')}>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1.5 font-medium text-slate-900">
                        {i.name}
                        {i.requiresRefrigeration && <Snowflake className="h-3.5 w-3.5 text-sky-500" aria-label="Fridge" />}
                        {i.isCritical && <AlertTriangle className="h-3.5 w-3.5 text-rose-500" aria-label="Zaroori" />}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{i.category}</td>
                    <td className={cn('px-3 py-2.5 text-right font-semibold tabular-nums', short ? 'text-amber-700' : 'text-slate-900')}>{fmt(i.currentStock)} {i.unit}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{fmt(i.reorder)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{cost(i.costPerUnit)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">{cost(Math.max(0, i.currentStock) * i.costPerUnit)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{i.lastVendorName ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
