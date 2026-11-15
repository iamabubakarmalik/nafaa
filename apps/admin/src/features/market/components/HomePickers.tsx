/**
 * Pickers for the Market home editor: published shops and listed products,
 * searched on the server, plus the ordered list of what is already picked.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Package, Plus, Search, Store, X } from 'lucide-react';
import { IconButton, Input } from '@/design-system/components';
import { adminMarketApi } from '@/api/admin-market.api';
import { useDebounced } from './useDebounced';

export interface PickedItem { id: string; name: string; sub?: string | null; imageUrl?: string | null }

/** The picked items in order, with move and remove buttons. */
export function PickedList({ items, onChange, empty, icon: Icon }: { items: PickedItem[]; onChange: (ids: string[]) => void; empty: string; icon: typeof Store }) {
  const ids = items.map((i) => i.id);
  const move = (i: number, d: -1 | 1) => {
    const next = [...ids];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  if (!items.length) return <p className="py-2 text-[0.8125rem] text-slate-500">{empty}</p>;
  return (
    <ol className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
      {items.map((it, i) => (
        <li key={it.id} className="flex items-center gap-2.5 px-3 py-2">
          <span className="w-5 text-right text-[0.75rem] text-slate-400">{i + 1}</span>
          {it.imageUrl ? <img src={it.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" /> : <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400"><Icon className="h-4 w-4" /></div>}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[0.8125rem] font-medium text-slate-900">{it.name}</div>
            {it.sub && <div className="truncate text-[0.75rem] text-slate-500">{it.sub}</div>}
          </div>
          <IconButton label="Move up" size="sm" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></IconButton>
          <IconButton label="Move down" size="sm" onClick={() => move(i, 1)} disabled={i === items.length - 1}><ArrowDown className="h-4 w-4" /></IconButton>
          <IconButton label="Remove" size="sm" onClick={() => onChange(ids.filter((x) => x !== it.id))}><X className="h-4 w-4" /></IconButton>
        </li>
      ))}
    </ol>
  );
}

function Results({ items, picked, onAdd, loading, icon: Icon }: { items: PickedItem[]; picked: string[]; onAdd: (it: PickedItem) => void; loading: boolean; icon: typeof Store }) {
  if (loading) return <p className="px-1 py-2 text-[0.75rem] text-slate-500">Searching…</p>;
  if (!items.length) return <p className="px-1 py-2 text-[0.75rem] text-slate-500">Nothing found.</p>;
  return (
    <ul className="mt-2 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
      {items.map((it) => {
        const on = picked.includes(it.id);
        return (
          <li key={it.id}>
            <button type="button" disabled={on} onClick={() => onAdd(it)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-50">
              {it.imageUrl ? <img src={it.imageUrl} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover" /> : <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.8125rem] text-slate-900">{it.name}</span>
                {it.sub && <span className="block truncate text-[0.75rem] text-slate-500">{it.sub}</span>}
              </span>
              {on ? <span className="text-[0.75rem] text-slate-400">Added</span> : <Plus className="h-4 w-4 text-brand-600" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Search published Market shops and add one. */
export function ShopSearch({ picked, onAdd }: { picked: string[]; onAdd: (it: PickedItem) => void }) {
  const [q, setQ] = useState('');
  const search = useDebounced(q.trim(), 300);
  const { data, isFetching } = useQuery({
    queryKey: ['admin-market-shop-pick', search],
    queryFn: () => adminMarketApi.shops({ search, status: 'listed', limit: 8 }),
    enabled: search.length >= 2,
  });
  const items: PickedItem[] = (data?.items ?? []).map((s) => ({ id: s.shopId, name: s.name, sub: s.city, imageUrl: s.logoUrl }));
  return (
    <div>
      <Input size="sm" leftIcon={<Search className="h-4 w-4" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a published shop to add" aria-label="Search shops" />
      {search.length >= 2 && <Results items={items} picked={picked} onAdd={onAdd} loading={isFetching && !data} icon={Store} />}
    </div>
  );
}

/** Search listed Market products and add one. */
export function ProductSearch({ picked, onAdd }: { picked: string[]; onAdd: (it: PickedItem) => void }) {
  const [q, setQ] = useState('');
  const search = useDebounced(q.trim(), 300);
  const { data, isFetching } = useQuery({
    queryKey: ['admin-market-product-pick', search],
    queryFn: () => adminMarketApi.searchProducts(search),
    enabled: search.length >= 2,
  });
  const items: PickedItem[] = (data ?? []).map((p) => ({ id: p.productId, name: p.name, sub: p.shop, imageUrl: p.imageUrl }));
  return (
    <div>
      <Input size="sm" leftIcon={<Search className="h-4 w-4" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a listed product to add" aria-label="Search products" />
      {search.length >= 2 && <Results items={items} picked={picked} onAdd={onAdd} loading={isFetching && !data} icon={Package} />}
    </div>
  );
}
