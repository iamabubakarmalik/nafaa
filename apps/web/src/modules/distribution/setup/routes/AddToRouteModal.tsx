/**
 * Adds shops to a route, after its current ones. Shops on no route come
 * first; a shop on another route moves to this one.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { Alert, Button, Input, Modal, Segmented, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { distError, distSetupApi, distributionApi, type Route } from '../../api/distribution.api';
import { partyName } from '../../lib/meta';
import { ROUTES_KEY, useCustomerRoster } from '../shared';

export function AddToRouteModal({ route, onClose, onDone }: { route: Route; onClose: () => void; onDone: () => void }) {
  const rosterQ = useCustomerRoster();
  const routesQ = useQuery({ queryKey: ROUTES_KEY, queryFn: () => distributionApi.routes() });
  const routeName = new Map((routesQ.data ?? []).map((r) => [r.id, r.name]));
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'free' | 'all'>('free');
  const [picked, setPicked] = useState<string[]>([]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rosterQ.data ?? [])
      .filter((c) => c.isActive !== false && c.routeId !== route.id)
      .filter((c) => view === 'all' || !c.routeId)
      .filter((c) => !q || `${c.name} ${c.businessName ?? ''} ${c.phone ?? ''} ${c.area ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => Number(!!a.routeId) - Number(!!b.routeId) || (a.area ?? '').localeCompare(b.area ?? '') || partyName(a).localeCompare(partyName(b)));
  }, [rosterQ.data, search, view, route.id]);

  const save = useMutation({
    mutationFn: () => distSetupApi.setRouteCustomers(route.id, picked),
    onSuccess: () => { toast.success(`${picked.length} dukaanein ${route.name} par lag gayin`); onDone(); },
    onError: (e) => toast.error(distError(e, 'Save nahi hua')),
  });
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Modal open onClose={onClose} size="lg" title={`${route.name} par dukaanein`} description="Jis tarteeb se nishan lagayenge usi tarteeb se aakhir me judengi."
      footer={<>
        <span className="mr-auto text-[0.8125rem] text-slate-600">{picked.length} chuni</span>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button data-save-action disabled={!picked.length} loading={save.isPending} onClick={() => save.mutate()}>Jorein</Button>
      </>}>
      {rosterQ.isError ? <Alert tone="danger">{distError(rosterQ.error, 'Customers nahi aaye')}</Alert> : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input size="sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Naam, dukaan, phone ya ilaqa" aria-label="Dukaan dhoondein"
              leftIcon={<Search className="h-4 w-4" />} wrapperClassName="min-w-[12rem] flex-1" />
            <Segmented label="Dikhayein" value={view} onChange={setView} items={[{ value: 'free', label: 'Bina route' }, { value: 'all', label: 'Sab' }]} />
          </div>
          {rosterQ.isLoading ? <Skeleton className="h-72" /> : (
            <ul className="max-h-[22rem] divide-y divide-slate-100 overflow-auto rounded-xl ring-1 ring-slate-200">
              {shown.slice(0, 300).map((c) => {
                const n = picked.indexOf(c.id);
                return (
                  <li key={c.id}>
                    <label className={cn('flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50', n >= 0 && 'bg-brand-50/50')}>
                      <input type="checkbox" checked={n >= 0} onChange={() => toggle(c.id)} className="h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-600" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{partyName(c)}</span>
                        <span className="block truncate text-[0.6875rem] text-slate-500">{[c.businessName ? c.name : null, c.area, c.phone].filter(Boolean).join(' · ') || '—'}</span>
                      </span>
                      {c.routeId && <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-800">{routeName.get(c.routeId) ?? 'Doosra route'}</span>}
                      {n >= 0 && <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[0.6875rem] font-bold text-brand-fg">{n + 1}</span>}
                    </label>
                  </li>
                );
              })}
              {!shown.length && <li className="px-3 py-8 text-center text-sm text-slate-500">{view === 'free' ? 'Sab dukaanein kisi route par hain — "Sab" dekhein' : 'Koi dukaan nahi mili'}</li>}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
