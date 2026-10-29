/**
 * Search box that finds catalog items as you type and hands back the one
 * picked. Used to add items to a scheme and to pick the item to test.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Search } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { useDebounced } from './shared';

export interface PickedProduct { id: string; name: string; unit?: string | null }

export function ProductSearch({ onPick, placeholder = 'Item dhoondein…', exclude = [], className }: {
  onPick: (p: PickedProduct) => void; placeholder?: string; exclude?: string[]; className?: string;
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const q = useDebounced(text.trim(), 250);
  const res = useQuery({
    queryKey: ['products', 'dist-picker', q],
    queryFn: () => productsApi.list({ search: q, limit: 8, isActive: true }),
    enabled: open && q.length >= 2,
  });
  const items = (res.data?.items ?? []).filter((p) => !exclude.includes(p.id));

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={text} onChange={(e) => { setText(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder} aria-label={placeholder}
        className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[0.8125rem] text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
      {open && q.length >= 2 && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200">
          {res.isLoading && <li className="px-3 py-2 text-sm text-slate-500">Dhoond rahe hain…</li>}
          {!res.isLoading && !items.length && <li className="px-3 py-2 text-sm text-slate-500">Koi item nahi mila</li>}
          {items.map((p) => (
            <li key={p.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick({ id: p.id, name: p.name, unit: p.unit }); setText(''); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.8125rem] hover:bg-slate-50">
                <Package className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{p.name}</span>
                {p.sku && <span className="shrink-0 font-mono text-[0.6875rem] text-slate-400">{p.sku}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
