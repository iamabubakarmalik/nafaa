/**
 * Heavy delivery: fridges, ACs and washing machines going to homes — trips
 * booked today, trips with no vehicle, late ones, charges still to collect,
 * and the month's delivery earnings.
 *
 * Keys: N new delivery · / search · 1 list · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowRight, BarChart3, CalendarClock, CheckCircle2, Clock, Download, Filter, GraduationCap, ListChecks, MapPin, MessageCircle,
  Navigation, Plus, Receipt, Truck, Wallet,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { deliveriesApi, type ApplianceDelivery, type DeliverySummary, type DeliveryView } from '../api/deliveries.api';
import { DeliveryCard, NewDeliveryModal, deliveryMessage } from '../components/deliveryDialogs';
import { Box, Bars, ListState, Pager, Panel, Pill, Strip } from '../components/ui';
import { DELIVERY_KEY, dayOnly, deliveryStatusOf, slotLabel, waLink } from '../components/meta';

type Tab = 'list' | 'analytics';
const VIEWS: Array<{ id: DeliveryView; label: string; icon: typeof Truck }> = [
  { id: 'open', label: 'Raaste ka kaam', icon: Truck },
  { id: 'today', label: 'Aaj ki delivery', icon: CalendarClock },
  { id: 'novehicle', label: 'Gaari nahi lagi', icon: AlertTriangle },
  { id: 'late', label: 'Late', icon: Clock },
  { id: 'unpaid', label: 'Charges baqi', icon: Wallet },
  { id: 'delivered', label: 'De diya', icon: CheckCircle2 },
  { id: 'closed', label: 'Band / cancel', icon: Receipt },
  { id: 'all', label: 'Sab', icon: ListChecks },
];
const viewLabel = (v: DeliveryView) => VIEWS.find((x) => x.id === v)?.label ?? v;
const ALL_TIME: DateRangeValue = { preset: 'all', custom: { from: '', to: '' } };

export default function DeliveriesPage() {
  const [params, setParams] = useSearchParams();
  const startHour = useBusinessDayStart();
  const canManage = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'list');
  const [view, setView] = useState<DeliveryView>((params.get('view') as DeliveryView) || 'open');
  const [range, setRange] = useState<DateRangeValue>(ALL_TIME);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [query, setQuery] = useState(search.trim());
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(params.get('new') === '1');
  const [openId, setOpenId] = useState<string | null>(params.get('id'));

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, range, query]);
  useEffect(() => {
    const next = new URLSearchParams();
    if (tab !== 'list') next.set('tab', tab);
    if (view !== 'open') next.set('view', view);
    if (query) next.set('q', query);
    if (openId) next.set('id', openId);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, view, query, openId]);

  const period = resolveRange(range, startHour);
  const q = { view, page, limit: 40, search: query || undefined, ...(period && period.from !== 'all' && view !== 'today' ? { from: period.from, to: period.to } : {}) };
  const listQ = useQuery({ queryKey: [DELIVERY_KEY, 'page', q], queryFn: () => deliveriesApi.page(q), placeholderData: (p) => p, refetchInterval: 60_000, enabled: tab === 'list' });
  const statsQ = useQuery({ queryKey: [DELIVERY_KEY, 'summary'], queryFn: deliveriesApi.summary, refetchInterval: 60_000 });
  const data = listQ.data;
  const rows = data?.items ?? [];
  const s = statsQ.data;
  const filtered = !!query || range.preset !== 'all';
  const clear = () => { setSearch(''); setRange(ALL_TIME); };
  const pick = (v: DeliveryView) => { setTab('list'); setView(v); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); setCreating(true); }
      if (e.key === '1') setTab('list');
      if (e.key === '2') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('list'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  const fetchAll = () => deliveriesApi.page({ ...q, page: 1, limit: 200 });
  const printDoc = async (): Promise<PrintDoc> => {
    const all = await fetchAll();
    return {
      title: `Deliveries — ${viewLabel(view)}`,
      subtitle: period && period.from !== 'all' ? rangeLabel(period.from, period.to) : 'Sab tareekhen',
      meta: [['Trips', String(all.total)], ['Charges', sales(all.totals.charges)]],
      sections: [{
        kind: 'table',
        columns: [{ label: '#' }, { label: 'Customer' }, { label: 'Pata' }, { label: 'Date', wideOnly: true }, { label: 'Gaari', wideOnly: true }, { label: 'Halat' }, { label: 'Baqi', align: 'right' }],
        rows: all.items.map((d) => [d.deliveryNumber, `${d.customerName} ${d.customerPhone}`, [d.deliveryAddress, d.area].filter(Boolean).join(', '),
          d.scheduledDate ? `${dayOnly(d.scheduledDate)} ${slotLabel(d.scheduledSlot)}` : '—', [d.vehicleNumber, d.driverName].filter(Boolean).join(' · ') || '—', deliveryStatusOf(d.status).label, sales(d.dueAmount ?? 0)]),
      }],
    };
  };
  const exportCsv = async () => {
    const all = await fetchAll();
    downloadCsv('deliveries.csv', [
      ['Number', 'Customer', 'Phone', 'Pata', 'Ilaqa', 'Manzil', 'Lift', 'Date', 'Waqt', 'Gaari', 'Driver', 'Halat', 'Charges', 'Mila', 'Baqi'],
      ...all.items.map((d) => [d.deliveryNumber, d.customerName, d.customerPhone, d.deliveryAddress, d.area ?? '', d.floorNumber ?? '', d.hasLift ? 'Haan' : '',
        d.scheduledDate ? dayOnly(d.scheduledDate) : '', slotLabel(d.scheduledSlot), d.vehicleNumber ?? '', d.driverName ?? '', deliveryStatusOf(d.status).label, d.totalCharge, d.paidAmount ?? 0, d.dueAmount ?? 0]),
    ]);
  };

  return (
    <PageShell>
      <PageHero
        title="Deliveries"
        chip={<><Truck /> Bhari saman</>}
        meta="Gaari, driver, ghar tak saman aur delivery ke charges"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={statsQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab !== 'list' || !rows.length} /></span>
          <button type="button" onClick={() => void exportCsv()} disabled={!rows.length} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setCreating(true)} title="Nayi delivery (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Nayi delivery</button>}
        </>}
        stats={s ? [
          { label: 'Raaste ka kaam', value: s.open, hint: s.overdue ? `${s.overdue} late` : undefined },
          { label: 'Aaj', value: s.todayScheduled },
          { label: 'Is mahine charges', value: sales(s.month.revenue), hint: `${s.month.trips} trips` },
        ] : [{ label: 'Raaste ka kaam', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!s ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={CalendarClock} color="#2563eb" label="Aaj ki delivery" value={s.todayScheduled} hint={`${s.open} kul baqi`} onClick={() => pick('today')} active={tab === 'list' && view === 'today'} />
          <KpiCard icon={AlertTriangle} color={s.noVehicle ? '#ea580c' : '#64748b'} label="Gaari nahi lagi" value={s.noVehicle} hint="Driver lagayein" onClick={() => pick('novehicle')} active={tab === 'list' && view === 'novehicle'} />
          <KpiCard icon={Navigation} color="#7c3aed" label="Raaste me" value={s.dispatched + s.arrived} hint="Nikal gaye / pohanch gaye" onClick={() => pick('open')} active={tab === 'list' && view === 'open'} />
          <KpiCard icon={Clock} color={s.overdue ? '#e11d48' : '#64748b'} label="Late" value={s.overdue} hint={s.overdue ? 'Date guzar gayi' : 'Koi late nahi'} onClick={() => pick('late')} active={tab === 'list' && view === 'late'} />
          <KpiCard icon={Wallet} color="#d97706" label="Installation baqi" value={s.installationPending} hint="Saman pohancha, fitting book nahi" onClick={() => pick('delivered')} />
        </>}
      </KpiRow>

      {tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Is mahine ki deliveries — trips aur charges</p>} />
      ) : (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Number, customer, phone, pata, gaari, driver…" label="Search" />}
          chips={filtered ? <>
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
            {range.preset !== 'all' && period && <FilterChip onRemove={() => setRange(ALL_TIME)}>Date: {rangeLabel(period.from, period.to)}</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'open'} onChange={setView} width="w-60" options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon }))} />
          {view !== 'today' && <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label="Delivery ki date" />}
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> nayi · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[{ id: 'list', label: 'Trips', icon: ListChecks, count: data?.total ?? null }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }]} />

      {tab === 'analytics' ? <Analytics s={s} money={sales} /> : (<>
        {data && data.total > 0 && <Strip><span className="text-slate-500">{viewLabel(view)}</span><span className="font-semibold text-slate-900">{data.total} trips · charges {sales(data.totals.charges)}</span></Strip>}
        <ListState loading={listQ.isLoading} error={listQ.isError && !data} empty={!rows.length} onRetry={() => listQ.refetch()} icon={Truck}
          title={filtered ? 'Is filter me kuch nahi' : view === 'today' ? 'Aaj koi delivery nahi' : 'Koi delivery nahi'}
          hint="POS par bhari saman bechte waqt delivery book karein, ya yahan se nayi trip likhein."
          actions={<>{canManage && <Button onClick={() => setCreating(true)} leftIcon={<Plus className="h-4 w-4" />}>Nayi delivery</Button>}{filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}</>}>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((d) => <TripRow key={d.id} d={d} shopName={shopName} money={sales} onOpen={() => setOpenId(d.id)} />)}
          </ul>
        </ListState>
        {data && <Pager page={page} pages={data.totalPages} onPage={setPage} />}
      </>)}

      {creating && <NewDeliveryModal onClose={() => setCreating(false)} onCreated={(d) => { setCreating(false); setOpenId(d.id); }} />}
      {openId && <DeliveryCard id={openId} shopName={shopName} canManage={canManage} onClose={() => setOpenId(null)} />}

      {guide.isOpen && (
        <PageGuide title="Deliveries — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Booking', text: 'POS par bill ke saath "Delivery" book karein, ya yahan "Nayi delivery": pata, manzil, lift aur charges.' },
            { icon: Truck, color: '#7c3aed', title: 'Gaari aur driver', text: 'Trip kholein → gaari ka number, driver aur helper. Customer ko WhatsApp par waqt bhejein.' },
            { icon: Navigation, color: '#0891b2', title: 'Nikal gaya → pohanch gaya', text: 'Gaari nikle to "Nikal gaya", pohanche to "Pohanch gaya" — sab ko pata rehta hai saman kahan hai.' },
            { icon: CheckCircle2, color: '#16a34a', title: 'De diya = bill', text: '"De diya" par lene wale ka naam (aur CNIC) aur driver ne jo paisa liya. Charges ka bill Sales, galla aur khata me aata hai.' },
            { icon: MapPin, color: '#64748b', title: 'Map', text: 'Trip me "Map" se pata Google Maps par khulta hai — driver ko bhej dein.' },
          ]}
          tips={['Counter bill me delivery charge pehle le liya ho to alag bill nahi banta.', 'Saman pohanch jaye aur installation chahiye ho to wahin se booking karein.']}
          shortcuts={[['N', 'nayi delivery'], ['/', 'dhoondein'], ['1', 'trips'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function TripRow({ d, shopName, money, onOpen }: { d: ApplianceDelivery; shopName: string; money: (n: number) => string; onOpen: () => void }) {
  const wa = waLink(d.customerPhone, deliveryMessage(d, shopName));
  const due = d.dueAmount ?? 0;
  return (
    <li className="flex items-start gap-3 px-3 py-3 sm:px-4">
      <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', d.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-600' : !d.vehicleNumber ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600')}>
        <Truck className="h-5 w-5" />
      </span>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-semibold text-slate-900">{d.customerName}</span>
          <Pill meta={deliveryStatusOf(d.status)} />
          {d.requiresInstallation && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[0.6875rem] text-blue-700 ring-1 ring-blue-200">Installation</span>}
          <span className="font-mono text-[0.6875rem] text-slate-400">{d.deliveryNumber}</span>
        </div>
        <p className="mt-0.5 truncate text-[0.8125rem] text-slate-600">{d.customerPhone} — {[d.deliveryAddress, d.area].filter(Boolean).join(', ')}{d.floorNumber ? ` · ${d.floorNumber} manzil${d.hasLift ? '' : ', lift nahi'}` : ''}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.75rem] text-slate-500">
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{d.status === 'DELIVERED' ? `Diya ${dayOnly(d.deliveredAt)}` : d.scheduledDate ? `${dayOnly(d.scheduledDate)} ${slotLabel(d.scheduledSlot)}` : 'Date baqi'}</span>
          <span>· {d.vehicleNumber ? `${d.vehicleNumber} · ${d.driverName ?? ''}` : 'Gaari nahi lagi'}</span>
        </p>
      </button>
      <div className="shrink-0 text-right">
        <p className="font-semibold tabular-nums text-slate-900">{money(Number(d.totalCharge) || 0)}</p>
        {due > 0 && <p className="text-[0.75rem] font-medium tabular-nums text-amber-700">baqi {money(due)}</p>}
        <div className="mt-1 flex justify-end gap-1">
          {wa && <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp" title="WhatsApp" className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50"><MessageCircle className="h-3.5 w-3.5" /></a>}
          <button type="button" onClick={onOpen} aria-label="Kholein" title="Kholein" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </li>
  );
}

function Analytics({ s, money }: { s?: DeliverySummary; money: (n: number) => string }) {
  if (!s) return <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-60 rounded-3xl" /><Skeleton className="h-60 rounded-3xl" /></div>;
  const b = s.month.breakdown;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Is mahine" hint="Delivery ke bill Sales aur Profit me hain">
        <dl className="grid grid-cols-2 gap-3">
          <Box label="Trips" value={s.month.trips} /><Box label="Charges" value={money(s.month.revenue)} />
          <Box label="Ek trip ausat" value={money(s.month.avgTrip)} /><Box label="De diya (kul)" value={s.delivered} />
        </dl>
      </Panel>
      <Panel title="Charges kis cheez ke">
        <Bars rows={[
          { key: 'd', label: 'Gaari', value: b.delivery, color: '#2563eb', hint: money(b.delivery) },
          { key: 'l', label: 'Load', value: b.loading, color: '#7c3aed', hint: money(b.loading) },
          { key: 'u', label: 'Utarna', value: b.unloading, color: '#0891b2', hint: money(b.unloading) },
          { key: 'f', label: 'Manzil', value: b.floor, color: '#d97706', hint: money(b.floor) },
        ].filter((r) => r.value > 0)} />
      </Panel>
    </div>
  );
}
