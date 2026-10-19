/**
 * The raw material an add-on uses up when sold (extra cheese 30 g): pick
 * the item, write how much one portion takes in a unit that fits its stock
 * unit. Empty means the add-on takes nothing from stock.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { catalogApi } from '@modules/inventory/products/list/api';
import { cookUnit, unitChoices } from '../lib/recipeUnits';

export interface AddOnStock {
  ingredient: { id: string; name: string; unit: string } | null;
  qty: number | null;
  unit: string | null;
}

const fieldCls = 'h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[0.8125rem] text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

export function AddOnIngredient({ value, onChange, invalid }: { value: AddOnStock; onChange: (v: AddOnStock) => void; invalid?: boolean }) {
  const [q, setQ] = useState('');
  const term = q.trim();
  const search = useQuery({
    queryKey: ['restaurant-ingredient-search', term, false],
    queryFn: () => catalogApi.list({ search: term || undefined, stock: 'all', active: 'active', sort: 'name', kindOf: 'raw' }, 1, 40),
    enabled: !value.ingredient,
    staleTime: 30_000,
  });

  if (value.ingredient) {
    const units = unitChoices(value.ingredient.unit);
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 text-[0.8125rem] font-semibold text-amber-900 ring-1 ring-amber-200">
          {value.ingredient.name}
          <button type="button" onClick={() => onChange({ ingredient: null, qty: null, unit: null })} aria-label="Saamaan hatayein" className="text-amber-700 hover:text-amber-900"><X className="h-3.5 w-3.5" /></button>
        </span>
        <input inputMode="decimal" value={value.qty || ''} placeholder="Kitna" aria-label="Ek portion me kitna"
          onChange={(e) => onChange({ ...value, qty: Number(e.target.value.replace(/[^\d.]/g, '')) || null })}
          className={cn(fieldCls, 'w-20 text-right tabular-nums', invalid && 'border-rose-400')} />
        <select value={value.unit ?? value.ingredient.unit} onChange={(e) => onChange({ ...value, unit: e.target.value })} aria-label="Unit" className={cn(fieldCls, 'w-24')}>
          {units.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <span className="text-[0.6875rem] text-slate-500">ek portion me — bikne par stock se nikalta hai</span>
      </div>
    );
  }

  const options = (search.data?.items ?? []).slice(0, 8);
  return (
    <div className="space-y-1.5">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Raw material dhoondein: cheese, anda…" aria-label="Add-on ka saamaan"
          className={cn(fieldCls, 'w-full pl-8')} />
      </label>
      <div className="flex flex-wrap gap-1.5">
        {search.isLoading && <span className="text-[0.75rem] text-slate-400">Dhoond rahe hain…</span>}
        {!search.isLoading && !options.length && <span className="text-[0.75rem] text-slate-500">{term ? `"${term}" nahi mila` : 'Koi raw material nahi'}</span>}
        {options.map((i) => (
          <button key={i.id} type="button" onClick={() => onChange({ ingredient: { id: i.id, name: i.name, unit: i.unit }, qty: null, unit: cookUnit(i.unit) })}
            className="h-7 rounded-full bg-slate-100 px-2.5 text-[0.75rem] font-medium text-slate-800 hover:bg-brand-50 hover:text-brand-800">
            {i.name}
          </button>
        ))}
      </div>
    </div>
  );
}
