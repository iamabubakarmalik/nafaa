/**
 * Customers on no route. Tick shops (grouped by area, so one ilaqa goes
 * together) and put them on a route in one step.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MapPin, Search } from 'lucide-react';
import { Alert, Button, Input, Select, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { DIST_KEY, distError, distSetupApi, type Route } from '../../api/distribution.api';
import type { RosterCustomer } from '../shared';
import { partyName, rs } from '../../lib/meta';

export function UnroutedView({ routes, customers, loading, error }: { routes: Route[]; customers: RosterCustomer[]; loading: boolean; error: unknown }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [routeId, setRouteId] = useState('');
  const active = routes.filter((r) => r.isActive);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const m = new Map<string, RosterCustomer[]>();
    for (const c of customers) {
      if (q && !`${c.name} ${c.businessName ?? ''} ${c.phone ?? ''} ${c.area ?? ''} ${c.city ?? ''}`.toLowerCase().includes(q)) continue;
      const k = c.area?.trim() || c.city?.trim() || 'Ilaqa nahi likha';
      m.set(k, [...(m.get(k) ?? []), c]);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [customers, search]);

  const save = useMutation({
    mutationFn: () => distSetupApi.setRouteCustomers(routeId, picked),
    onSuccess: () => {
      const r = routes.find((x) => x.id === routeId);
      toast.success(`${picked.length} dukaanein ${r?.name ?? 'route'} par lag gayin`);
      setPicked([]);
      qc.invalidateQueries({ queryKey: [DIST_KEY] });
    },
    onError: (e) => toast.error(distError(e, 'Save nahi hua')),
  });
  const toggleAll = (ids: string[]) => setPicked((p) => (ids.every((id) => p.includes(id)) ? p.filter((x) => !ids.includes(x)) : [...new Set([...p, ...ids])]));

  if (error) return <Alert tone="warning">{distError(error, 'Customers nahi aaye')}</Alert>;
  if (loading) return <Skeleton className="h-72 rounded-2xl" />;
  if (!customers.length) {
    return <div className="rounded-2xl bg-white px-5 py-12 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200/80">Har customer kisi route par hai.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80">
        <Input size="sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Naam, dukaan, phone ya ilaqa" aria-label="Dhoondein"
          leftIcon={<Search className="h-4 w-4" />} wrapperClassName="min-w-[12rem] flex-1" />
        <Select size="sm" aria-label="Route" value={routeId} onChange={(e) => setRouteId(e.target.value)} wrapperClassName="w-56"
          options={[{ value: '', label: '— Route chunein —' }, ...active.map((r) => ({ value: r.id, label: r.name }))]} />
        <Button size="sm" disabled={!picked.length || !routeId} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<MapPin className="h-4 w-4" />}>
          {picked.length ? `${picked.length} route par daalein` : 'Route par daalein'}
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {groups.map(([area, list]) => {
          const ids = list.map((c) => c.id);
          const all = ids.every((id) => picked.includes(id));
          return (
            <section key={area} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <header className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                <input type="checkbox" checked={all} onChange={() => toggleAll(ids)} aria-label={`${area} sab`} className="h-4 w-4 rounded border-slate-300 accent-brand-600" />
                <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-slate-900">{area}</span>
                <span className="rounded-full bg-slate-100 px-2 text-[0.6875rem] font-semibold text-slate-600">{list.length}</span>
              </header>
              <ul className="divide-y divide-slate-100">
                {list.slice(0, 100).map((c) => {
                  const on = picked.includes(c.id);
                  return (
                    <li key={c.id}>
                      <label className={cn('flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50', on && 'bg-brand-50/50')}>
                        <input type="checkbox" checked={on} onChange={() => toggleAll([c.id])} className="h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-600" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{partyName(c)}</span>
                          <span className="block truncate text-[0.6875rem] text-slate-500">{[c.businessName ? c.name : null, c.phone].filter(Boolean).join(' · ') || '—'}</span>
                        </span>
                        {Number(c.balance) > 0 && <span className="shrink-0 text-[0.75rem] font-semibold tabular-nums text-rose-700">{rs(c.balance)}</span>}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
