/**
 * Home delivery customers: who gets how much milk, on which route and at
 * what rate, and what each owes. Balances come from the shared khata, so
 * they match the Khata page. Tabs, counts and paging come from the server.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, Download, GraduationCap, Link2, ListChecks, PauseCircle, Plus, Route as RouteIcon, Truck, Users, Wallet, XCircle } from 'lucide-react';
import {
  FilterBar, FilterChip, FilterMenu, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { dairyCustomersApi, type CustomerQuery, type CustomerTab, type DairyCustomer } from '../api/customers.api';
import { routesApi } from '../api/routes.api';
import { Empty, ListCard, ListLoading, Pager, Pill } from '../components/ui';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { CUSTOMER_STATUS, DAIRY_KEYS, FREQUENCY, liters, shortDate } from '../lib/meta';

const LIMIT = 30;
const TABS: Array<{ id: CustomerTab; label: string; icon: typeof Users }> = [
  { id: 'active', label: 'Chalu', icon: Truck },
  { id: 'owing', label: 'Paise baqi', icon: Wallet },
  { id: 'paused', label: 'Ruke hue', icon: PauseCircle },
  { id: 'closed', label: 'Band', icon: XCircle },
  { id: 'all', label: 'Sab', icon: ListChecks },
];

async function fetchAll(q: CustomerQuery) {
  const out: DairyCustomer[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await dairyCustomersApi.page({ ...q, page, limit: 200 });
    out.push(...res.items);
    if (out.length >= res.total || !res.items.length) break;
  }
  return out;
}

export default function DairyCustomersPage() {
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const searchRef = useRef<HTMLInputElement>(null);
  const [params] = useSearchParams();
  const [tab, setTab] = useState<CustomerTab>(params.get('search') ? 'all' : 'active');
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [routeId, setRouteId] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());

  const query: CustomerQuery = useMemo(() => ({ tab, search: q || undefined, routeId: routeId || undefined }), [tab, q, routeId]);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [DAIRY_KEYS.customers, query, page],
    queryFn: () => dairyCustomersApi.page({ ...query, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });
  const routesQ = useQuery({ queryKey: [DAIRY_KEYS.routes, 'active'], queryFn: () => routesApi.all({ active: true }), staleTime: 5 * 60_000 });
  const routeName = routeId === 'none' ? 'Bina route' : routesQ.data?.find((r) => r.id === routeId)?.name;
  const c = data?.counts;
  const t = data?.totals;
  const go = (x: CustomerTab) => { setTab(x); setPage(1); };
  usePageKeys(searchRef, { n: () => navigate('/dairy/customers/new') });

  const exportCsv = async () => {
    const rows = await fetchAll(query);
    if (!rows.length) { toast.error('Is filter me koi customer nahi'); return; }
    downloadCsv('doodh-customers.csv', [
      ['Number', 'Naam', 'Phone', 'Pata', 'Area', 'Route', 'Kab', 'Subah (L)', 'Shaam (L)', 'Rate', 'Baqi', 'Status'],
      ...rows.map((r) => [r.customerNumber, r.name, r.phone, r.address, r.area, r.route?.name, FREQUENCY[r.deliveryFrequency]?.label, r.morningQuantity, r.eveningQuantity, r.customRate ?? '', r.currentBalance, CUSTOMER_STATUS[r.status]?.label]),
    ]);
  };
  const printDoc = async (): Promise<PrintDoc> => {
    const rows = await fetchAll(query);
    return {
      title: 'Doodh ke customers', subtitle: `${TABS.find((x) => x.id === tab)?.label}${routeName ? ` · ${routeName}` : ''}`,
      meta: [['Customers', String(rows.length)], ['Roz ka doodh', liters(rows.reduce((s, r) => s + (r.status === 'ACTIVE' ? r.morningQuantity + r.eveningQuantity : 0), 0))]],
      sections: [{
        kind: 'table', title: 'Customers',
        columns: [{ label: 'Customer' }, { label: 'Pata', wideOnly: true }, { label: 'Subah / shaam' }, { label: 'Baqi', align: 'right' }],
        rows: rows.map((r) => [`${r.name} (${r.customerNumber})`, [r.address, r.area].filter(Boolean).join(', '), `${r.morningQuantity} / ${r.eveningQuantity}`, money(r.currentBalance)]),
      }],
    };
  };

  const items = data?.items ?? [];
  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Doodh ke customers — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#16a34a', title: 'Naya customer', text: 'Naam, pata, roz subah aur shaam kitna doodh, aur rate. Advance liya ho to wahin likhein — khate me jama hota hai.' },
            { icon: Truck, color: '#2563eb', title: 'Roz ki list', text: 'Chalu customers Delivery page ki roz ki list me khud aate hain. Bahar gaye hon to "Rokein" se kuch din ke liye band karein.' },
            { icon: BookOpen, color: '#7c3aed', title: 'Khata', text: 'Har delivery khate me bill ban kar jati hai; baqi paisa yahan aur Khata page par ek jaisa dikhta hai.' },
            { icon: Link2, color: '#d97706', title: 'Purane customer', text: '"Khata nahi jura" wale purane customer pehli payment ya delivery par khud jur jate hain — purana baqi saath aata hai.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya customer'], ['G', 'guide']]} />
      )}

      <PageHero title="Doodh ke customers" busy={isFetching && !isLoading} loading={isLoading || !c}
        meta="Ghar delivery wale customers — roz ki quantity, route, rate aur khata"
        actions={<>
          <button type="button" onClick={() => void exportCsv()} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to="/dairy/customers/new" className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya customer</Link>
        </>}
        stats={[
          { label: 'Roz ka doodh', value: liters(t?.dailyLiters ?? 0) },
          { label: 'Lena hai', value: money(t?.owed ?? 0) },
          { label: 'Advance pada hai', value: money(t?.advance ?? 0) },
        ]} />

      <KpiRow cols={4}>
        {!c ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Truck} color="#2563eb" label="Chalu" value={c.active} hint={liters(t?.dailyLiters)} onClick={() => go('active')} active={tab === 'active'} />
            <KpiCard icon={Wallet} color="#e11d48" label="Paise baqi" value={c.owing} hint={money(t?.owed ?? 0)} onClick={() => go('owing')} active={tab === 'owing'} />
            <KpiCard icon={PauseCircle} color="#d97706" label="Ruke hue" value={c.paused} onClick={() => go('paused')} active={tab === 'paused'} />
            <KpiCard icon={Link2} color="#64748b" label="Khata nahi jura" value={t?.unlinked ?? 0} hint="Pehli delivery par jurega" />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Naam, number, phone, pata ya area…" />}
        chips={search.trim() || routeId ? <>
          {routeId && <FilterChip onRemove={() => setRouteId('')}>{routeName ?? 'Route'}</FilterChip>}
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setRouteId(''); }}>
        <FilterMenu icon={RouteIcon} label={routeName ?? 'Route'} value={routeId} active={!!routeId} onChange={(v) => { setRouteId(v); setPage(1); }}
          options={[{ value: '', label: 'Sab route' }, { value: 'none', label: 'Bina route' }, ...(routesQ.data ?? []).map((r) => ({ value: r.id, label: r.name, hint: r.areaName ?? undefined }))]} />
      </FilterBar>

      <ViewTabs value={tab} onChange={go} hint="Customer par click kar ke kholein" tabs={TABS.map((x) => ({ id: x.id, label: x.label, icon: x.icon, count: c ? c[x.id] : null }))} />

      <ListCard footer={data && <Pager page={page} total={data.total} limit={LIMIT} onPage={setPage} />}>
        {isLoading ? <ListLoading /> : items.length === 0 ? (
          <Empty icon={Users} title={search || tab !== 'all' ? 'Is filter me koi customer nahi' : 'Abhi koi delivery customer nahi'}
            text="Jo ghar roz doodh lete hain unhe yahan jorein — roz ki list unhi se banti hai."
            action={<Link to="/dairy/customers/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-brand-fg"><Plus className="h-4 w-4" />Naya customer</Link>} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((r) => {
              const st = CUSTOMER_STATUS[r.status];
              return (
                <li key={r.id}>
                  <Link to={`/dairy/customers/${r.id}`} className="grid gap-2 px-4 py-3 hover:bg-slate-50 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_9rem_9rem_7rem] lg:items-center">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{r.name} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{r.customerNumber}</span></p>
                      <p className="truncate text-[0.75rem] text-slate-500">{[r.phone, r.address, r.area].filter(Boolean).join(' · ') || '—'}</p>
                    </div>
                    <div className="min-w-0 text-[0.8125rem]">
                      <p className="truncate text-slate-700">{r.route?.name ?? 'Bina route'}</p>
                      <p className="truncate text-[0.75rem] text-slate-500">{FREQUENCY[r.deliveryFrequency]?.label}{r.status === 'SUSPENDED' && r.pausedTo ? ` · ${shortDate(r.pausedTo)} tak ruka` : ''}</p>
                    </div>
                    <p className="text-[0.8125rem] tabular-nums text-slate-700">Subah {r.morningQuantity} · Shaam {r.eveningQuantity}<span className="block text-[0.75rem] text-slate-500">{r.customRate ? `Rate ${money(r.customRate)}` : 'Dukaan ka rate'}</span></p>
                    <p className={cn('text-[0.875rem] font-semibold tabular-nums', r.currentBalance > 0.009 ? 'text-rose-700' : r.currentBalance < -0.009 ? 'text-success-700' : 'text-slate-500')}>
                      {r.currentBalance > 0.009 ? `${money(r.currentBalance)} baqi` : r.currentBalance < -0.009 ? `${money(-r.currentBalance)} advance` : 'Hisaab saaf'}
                      {!r.khataLinked && <span className="block text-[0.6875rem] font-normal text-slate-400">Khata nahi jura</span>}
                    </p>
                    <Pill tone={st?.tone ?? ''} className="lg:justify-self-end">{st?.label ?? r.status}</Pill>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </ListCard>
    </PageShell>
  );
}
