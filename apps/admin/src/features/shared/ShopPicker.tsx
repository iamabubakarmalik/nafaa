/**
 * Search-as-you-type shop picker for forms. Searches on the server, so it
 * works for any number of shops. Shows the chosen shop with a Change button.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Store, X } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { adminTenantsApi } from '@/api/admin-tenants.api';
import { StatusBadge } from '@/ui';

export interface PickedShop { id: string; name: string; slug: string }

export function ShopPicker({ value, onChange, label = 'Shop' }: { value: PickedShop | null; onChange: (shop: PickedShop | null) => void; label?: string }) {
  const [q, setQ] = useState('');
  const results = useQuery({
    queryKey: ['admin', 'shop-picker', q],
    queryFn: () => adminTenantsApi.list({ search: q.trim() || undefined, limit: 6 }),
    enabled: !value,
    placeholderData: (prev) => prev,
  });

  return (
    <div>
      <div className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">{label}</div>
      {value ? (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Store className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-slate-900">{value.name}</div>
            <div className="text-[0.75rem] text-slate-500">@{value.slug}</div>
          </div>
          <button type="button" onClick={() => onChange(null)} className="flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-semibold text-slate-600 hover:bg-slate-200">
            <X className="h-3.5 w-3.5" /> Change
          </button>
        </div>
      ) : (
        <div className="rounded-xl ring-1 ring-slate-200">
          <label className="relative block">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shop name or username"
              className="h-10 w-full rounded-t-xl border-0 bg-transparent ps-9 pe-3 text-[0.875rem] outline-none focus:ring-2 focus:ring-brand-500" />
          </label>
          <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto border-t border-slate-100">
            {results.isLoading ? (
              <li className="p-2"><Skeleton className="h-9 rounded-lg" /></li>
            ) : (results.data?.items ?? []).length === 0 ? (
              <li className="p-3 text-[0.8125rem] text-slate-500">No shops found</li>
            ) : (results.data?.items ?? []).map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => onChange({ id: t.id, name: t.name, slug: t.slug })} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start hover:bg-slate-50">
                  <span className="min-w-0">
                    <span className="block truncate text-[0.875rem] font-medium text-slate-900">{t.name}</span>
                    <span className="block text-[0.75rem] text-slate-500">@{t.slug}</span>
                  </span>
                  <StatusBadge value={t.status} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
