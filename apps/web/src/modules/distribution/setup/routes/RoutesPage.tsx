/**
 * Routes (Distribution → Routes). A route (beat) is a set of shops visited on
 * fixed weekdays by one booker, delivered by one delivery man from one
 * godown. Three views: the routes with their customers in visit order
 * (drag to reorder), the day view (which routes run on a date and how far
 * they got), and the customers that are on no route yet.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarDays, MapPin, Plus, Route as RouteIcon, UserX } from 'lucide-react';
import { EmptyState, PageHero, PageShell, Skeleton, ViewTabs, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { DIST_KEY, distError, distSetupApi, distributionApi, type Route, type SaveRoute } from '../../api/distribution.api';
import { DistributionGate } from '../../components/DistributionGate';
import { ROUTES_KEY, WEEKDAYS_SHORT, useCustomerRoster } from '../shared';
import { RouteFormModal } from './RouteFormModal';
import { RouteDetail } from './RouteDetail';
import { RouteDayView } from './RouteDayView';
import { UnroutedView } from './UnroutedView';

type Tab = 'routes' | 'day' | 'unrouted';

export default function RoutesPage() {
  return <DistributionGate><PageShell><RoutesBody /></PageShell></DistributionGate>;
}

function RoutesBody() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tab = (['routes', 'day', 'unrouted'].includes(params.get('tab') ?? '') ? params.get('tab') : 'routes') as Tab;
  const setTab = (t: Tab) => setParams((p) => { p.set('tab', t); return p; }, { replace: true });
  const routesQ = useQuery({ queryKey: ROUTES_KEY, queryFn: () => distributionApi.routes() });
  const rosterQ = useCustomerRoster();
  const routes = useMemo(() => [...(routesQ.data ?? [])].sort((a, b) => Number(b.isActive) - Number(a.isActive) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)), [routesQ.data]);
  const [form, setForm] = useState<Route | 'new' | null>(null);
  const selectedId = params.get('route') ?? routes[0]?.id ?? '';
  const selected = routes.find((r) => r.id === selectedId) ?? routes[0];
  const pick = (id: string) => setParams((p) => { p.set('route', id); p.set('tab', 'routes'); return p; }, { replace: true });

  const unrouted = useMemo(() => (rosterQ.data ?? []).filter((c) => c.isActive !== false && !c.routeId), [rosterQ.data]);
  const today = new Date().getDay();
  const todays = routes.filter((r) => r.isActive && r.visitDays.includes(today));

  const refresh = () => { qc.invalidateQueries({ queryKey: ROUTES_KEY }); qc.invalidateQueries({ queryKey: [DIST_KEY, 'route'] }); qc.invalidateQueries({ queryKey: [DIST_KEY, 'roster'] }); };
  const create = useMutation({
    mutationFn: (b: SaveRoute) => distSetupApi.createRoute(b),
    onSuccess: (r) => { refresh(); setForm(null); pick(r.id); toast.success(`${r.name} ban gaya`); },
    onError: (e) => toast.error(distError(e, 'Route nahi bana')),
  });
  const update = useMutation({
    mutationFn: (v: { id: string; body: Partial<SaveRoute> }) => distSetupApi.updateRoute(v.id, v.body),
    onSuccess: () => { refresh(); setForm(null); toast.success('Save ho gaya'); },
    onError: (e) => toast.error(distError(e, 'Save nahi hua')),
  });

  return (
    <>
      <PageHero
        title="Routes"
        chip={<><MapPin />Beat plan</>}
        meta="Kaun sa ilaqa kis din, kaun booker, kaun delivery — aur dukaanon ki tarteeb"
        loading={routesQ.isLoading}
        stats={[
          { label: 'Routes', value: String(routes.filter((r) => r.isActive).length) },
          { label: 'Customers route par', value: String(routes.reduce((s, r) => s + (r.customerCount ?? 0), 0)) },
          { label: 'Bina route', value: rosterQ.data ? String(unrouted.length) : '—' },
          { label: 'Aaj ke routes', value: String(todays.length), hint: todays.map((r) => r.name).join(', ') || 'koi nahi' },
        ]}
        actions={<button type="button" className={heroPrimaryButton} onClick={() => setForm('new')}><Plus className="h-4 w-4" />Naya route</button>}
      />

      <ViewTabs value={tab} onChange={setTab}
        tabs={[
          { id: 'routes', label: 'Routes', icon: RouteIcon, count: routes.length },
          { id: 'day', label: 'Din ka plan', icon: CalendarDays },
          { id: 'unrouted', label: 'Bina route', icon: UserX, count: rosterQ.data ? unrouted.length : null },
        ]} />

      {tab === 'day' ? <RouteDayView /> : tab === 'unrouted' ? <UnroutedView routes={routes} customers={unrouted} loading={rosterQ.isLoading} error={rosterQ.error} /> : (
        routesQ.isLoading ? (
          <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]"><Skeleton className="h-80 rounded-2xl" /><Skeleton className="h-[28rem] rounded-2xl" /></div>
        ) : !routes.length ? (
          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <EmptyState icon={<MapPin className="h-6 w-6" />} title="Abhi koi route nahi"
              description="Misal: 'Shadman - Ichhra' — Peer aur Jumeraat, booker Imran, delivery Akram. Phir us ilaqe ki dukaanein tarteeb se lagayein."
              action={<button type="button" onClick={() => setForm('new')} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-brand-fg hover:bg-brand-700"><Plus className="h-4 w-4" />Pehla route</button>} />
          </div>
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <nav aria-label="Routes" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {routes.map((r) => (
                <button key={r.id} type="button" onClick={() => pick(r.id)} aria-current={r.id === selected?.id}
                  className={cn('min-w-[14rem] shrink-0 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 transition lg:min-w-0',
                    r.id === selected?.id ? 'ring-2 ring-brand-500' : 'ring-slate-200/80 hover:ring-slate-300', !r.isActive && 'opacity-60')}>
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[0.9375rem] font-semibold text-slate-900">{r.name}</span>
                    {r.code && <span className="shrink-0 rounded bg-slate-100 px-1.5 text-[0.6875rem] font-semibold text-slate-600">{r.code}</span>}
                  </div>
                  <p className="mt-0.5 truncate text-[0.75rem] text-slate-500">{r.bookerName ?? 'Booker nahi'} · {r.customerCount ?? 0} dukaanein</p>
                  <div className="mt-2 flex gap-0.5">
                    {WEEKDAYS_SHORT.map((d, i) => (
                      <span key={d} className={cn('flex h-5 min-w-[1.75rem] items-center justify-center rounded px-0.5 text-[0.625rem] font-bold',
                        r.visitDays.includes(i) ? (i === today ? 'bg-teal-700 text-white' : 'bg-brand-100 text-brand-800') : 'text-slate-400 opacity-50')}>{d}</span>
                    ))}
                  </div>
                </button>
              ))}
            </nav>
            {selected && <RouteDetail key={selected.id} route={selected} onEdit={() => setForm(selected)} onChanged={refresh} />}
          </div>
        )
      )}

      {form && (
        <RouteFormModal route={form === 'new' ? null : form} saving={create.isPending || update.isPending} onClose={() => setForm(null)}
          onSave={(body) => (form === 'new' ? create.mutate(body) : update.mutate({ id: form.id, body }))} />
      )}
    </>
  );
}
