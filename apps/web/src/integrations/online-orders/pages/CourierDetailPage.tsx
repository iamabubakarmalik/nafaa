/**
 * One courier: connect status and booking stats, then tabs for the
 * overview, bulk booking, parcels (Nafaa orders and, where the courier
 * allows it, every parcel on its portal), booking settings and the
 * connection. A manual courier shows only the overview and parcels.
 */

import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, CheckCircle2, ExternalLink, KeyRound, ListFilter, PackageCheck, PenLine, Power, Printer, RefreshCw, Truck, Unplug, UserX,
  Wallet, Zap,
} from 'lucide-react';
import {
  Alert, Badge, Button, Card, FilterBar, FilterMenu, KpiCard, KpiRow, PageHero, PageShell, SearchField, Segmented, Skeleton, ViewTabs,
  heroButton, heroIconButton, type BadgeVariant,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { apiErrorMessage, couriersApi, type CourierAccount, type CourierShipment } from '../api/online-orders.api';
import { COURIERS_KEY, ConnectForm, CourierLogo, CourierSettingsForm } from '../components/couriers/CourierForms';
import { OrderDrawer } from '../components/orders/OrderDrawer';
import { STATUS_LABEL, timeAgo, whenText } from '../lib/labels';

type Tab = 'overview' | 'book' | 'parcels' | 'settings' | 'connection';

const COURIER_STATE: Record<string, { label: string; tone: BadgeVariant }> = {
  BOOKING: { label: 'Book ho raha', tone: 'default' },
  BOOKED: { label: 'Pickup ka intezar', tone: 'info' },
  PICKED_UP: { label: 'Courier le gaya', tone: 'info' },
  IN_TRANSIT: { label: 'Raste me', tone: 'brand' },
  OUT_FOR_DELIVERY: { label: 'Aaj deliver', tone: 'brand' },
  ATTEMPTED: { label: 'Customer nahi mila', tone: 'warning' },
  DELIVERED: { label: 'Deliver', tone: 'success' },
  RETURNING: { label: 'Wapas aa raha', tone: 'danger' },
  RETURNED: { label: 'Wapas (RTO)', tone: 'danger' },
  CANCELLED: { label: 'Booking cancel', tone: 'default' },
  UNKNOWN: { label: '—', tone: 'default' },
};

const PARCEL_FILTERS = [
  { value: 'active', label: 'Raste me' },
  { value: 'booked', label: 'Pickup baqi' },
  { value: 'attempted', label: 'Customer nahi mila' },
  { value: 'returning', label: 'Wapas aa rahe' },
  { value: 'cod', label: 'Paisa baqi' },
  { value: 'delivered', label: 'Deliver' },
  { value: 'returned', label: 'RTO' },
  { value: 'all', label: 'Sab' },
];

const PORTAL_FILTERS = [
  { value: 'all', label: 'Sab' },
  { value: 'active', label: 'Raste me' },
  { value: 'attempted', label: 'Customer nahi mila' },
  { value: 'delivered', label: 'Deliver' },
  { value: 'returned', label: 'RTO' },
  { value: 'unlinked', label: 'Nafaa order se nahi jure' },
];

export default function CourierDetailPage() {
  const { code: raw = '' } = useParams();
  const code = raw.toUpperCase();
  const [params, setParams] = useSearchParams();
  const { sales: money } = useMasked();
  const [parcelFilter, setParcelFilter] = useState('active');
  const [orderId, setOrderId] = useState<string | null>(null);
  const { data, isLoading, error, isFetching } = useQuery({ queryKey: COURIERS_KEY, queryFn: couriersApi.list, refetchInterval: 60_000 });
  const c = data?.find((x) => x.code === code);

  const isApi = c?.mode === 'api';
  const tabs: Array<{ id: Tab; label: string; count?: number | null }> = c
    ? isApi && c.connected
      ? [
          { id: 'overview', label: 'Overview' },
          { id: 'book', label: 'Book karein' },
          { id: 'parcels', label: 'Parcels', count: c.stats.active || null },
          { id: 'settings', label: 'Settings' },
          { id: 'connection', label: 'Connection' },
        ]
      : isApi
        ? [{ id: 'connection', label: 'Jorein' }, { id: 'parcels', label: 'Parcels' }]
        : [{ id: 'overview', label: 'Overview' }, { id: 'parcels', label: 'Parcels', count: c.stats.active || null }]
    : [];
  const want = params.get('tab') as Tab | null;
  const tab: Tab = want && tabs.some((t) => t.id === want) ? want : tabs[0]?.id ?? 'overview';
  const setTab = (t: Tab) => setParams((p) => { const n = new URLSearchParams(p); n.set('tab', t); return n; }, { replace: true });
  const showParcels = (filter: string) => { setParcelFilter(filter); setTab('parcels'); };

  if (isLoading) {
    return <PageShell><Skeleton className="h-36 rounded-3xl" /><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-64 rounded-3xl" /></PageShell>;
  }
  if (error || !c) {
    return (
      <PageShell>
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">{error ? 'Courier nahi khula' : 'Ye courier list me nahi'}</p>
          {error && <p className="mt-1 text-[0.8125rem] text-slate-500">{apiErrorMessage(error)}</p>}
          <Link to="/online-store/couriers"><Button className="mt-3" variant="secondary">Sab couriers</Button></Link>
        </div>
      </PageShell>
    );
  }

  const s = c.stats;
  const statusText = c.connected ? (c.lastError ? 'Masla' : c.active ? 'Jura hua' : 'Band') : isApi ? 'Ek click connect' : 'Manual';

  return (
    <PageShell>
      <PageHero
        title={<span className="inline-flex items-center gap-3"><span className="rounded-lg bg-white p-0.5"><CourierLogo c={c} size={32} /></span>{c.name}</span>}
        chip={<><Truck />{statusText}</>}
        meta={c.connected
          ? `Key ${c.maskedKey ?? ''}${c.lastSyncAt ? ` · aakhri sync ${timeAgo(c.lastSyncAt)}` : ''}`
          : isApi ? 'API key paste karein — booking, label, tracking aur RTO sab khud' : 'CN khud likhein — tracking link, COD hisaab aur RTO Nafaa sambhalta hai'}
        busy={isFetching}
        actions={<HeaderActions c={c} />}
        stats={[
          { label: 'Raste me', value: String(s.active), hint: s.awaitingPickup ? `${s.awaitingPickup} pickup baqi` : undefined },
          { label: 'Deliver (30 din)', value: String(s.delivered30), hint: `${s.dispatched30} bheje` },
          { label: 'RTO (30 din)', value: `${s.rtoRate}%`, hint: `${s.returned30} wapas` },
          { label: 'Courier ke paas (COD)', value: money(s.codPendingValue), hint: `${s.codPending} parcel` },
        ]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={Zap} color="#2563eb" label="Book (30 din)" value={s.booked30} hint="Nafaa se book hue" />
        <KpiCard icon={Printer} color="#d97706" label="Pickup ka intezar" value={s.awaitingPickup} hint="Label print karke parcel dein" onClick={() => showParcels('booked')} />
        <KpiCard icon={UserX} color="#e11d48" label="Customer nahi mila" value={s.attempted} hint="Call karein warna RTO" onClick={() => showParcels('attempted')} />
        <KpiCard icon={Wallet} color="#ea580c" label="COD paas" value={money(s.codPendingValue)} hint={`${s.codPending} parcel · dabayein`} onClick={() => showParcels('cod')} />
      </KpiRow>

      {c.connected && c.lastError && (
        <Alert tone="danger" title={`${c.name} se rabta nahi ho raha`} action={<Button size="sm" variant="secondary" onClick={() => setTab('connection')}>Key check karein</Button>}>
          {c.lastError}
        </Alert>
      )}
      {c.connected && c.missingSettings.length > 0 && tab !== 'settings' && (
        <Alert tone="warning" title="Booking se pehle settings poori karein" action={<Button size="sm" variant="secondary" onClick={() => setTab('settings')}>Settings</Button>}>
          Khali hain: {c.missingSettings.join(', ')}
        </Alert>
      )}

      <ViewTabs value={tab} onChange={setTab} tabs={tabs} />

      {tab === 'overview' && <Overview c={c} onTab={setTab} onParcels={showParcels} />}
      {tab === 'book' && <BookTab c={c} money={money} onOpen={setOrderId} />}
      {tab === 'parcels' && <ParcelsTab c={c} money={money} filter={parcelFilter} setFilter={setParcelFilter} onOpen={setOrderId} />}
      {tab === 'settings' && <Card className="rounded-2xl" title="Booking settings" description="Har nayi booking par yahi lagengi — booking ke waqt badal bhi sakte hain."><CourierSettingsForm c={c} /></Card>}
      {tab === 'connection' && <ConnectionTab c={c} onConnected={() => setTab('overview')} />}

      {orderId && <OrderDrawer orderId={orderId} onClose={() => setOrderId(null)} />}
    </PageShell>
  );
}

function HeaderActions({ c }: { c: CourierAccount }) {
  const qc = useQueryClient();
  const sync = useMutation({
    mutationFn: () => couriersApi.sync(c.code),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: COURIERS_KEY });
      qc.invalidateQueries({ queryKey: ['courier-shipments', c.code] });
      qc.invalidateQueries({ queryKey: ['courier-portal', c.code] });
      if (r.lastError) toast.error(r.lastError); else toast.success('Sab parcels ka taaza status aa gaya');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const setActive = useMutation({
    mutationFn: (active: boolean) => couriersApi.update(c.code, { active }),
    onSuccess: (_r, active) => { qc.invalidateQueries({ queryKey: COURIERS_KEY }); toast.success(active ? `${c.name} chalu` : `${c.name} band — nayi booking nahi hogi`); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <>
      <Link to="/online-store/couriers" title="Sab couriers" className={heroIconButton}><ArrowLeft className="h-4 w-4" /></Link>
      {c.site && <a href={c.site} target="_blank" rel="noreferrer" className={heroButton}><ExternalLink className="h-4 w-4" /> <span className="hidden sm:inline">Website</span></a>}
      {c.connected && (
        <>
          <button type="button" onClick={() => sync.mutate()} disabled={sync.isPending} className={heroButton}>
            <RefreshCw className={cn('h-4 w-4', sync.isPending && 'animate-spin')} /> Abhi sync
          </button>
          <button type="button" onClick={() => setActive.mutate(!c.active)} disabled={setActive.isPending} className={heroButton}
            title={c.active ? 'Band karne par nayi booking nahi hogi' : 'Dobara chalu karein'}>
            <Power className="h-4 w-4" /> {c.active ? 'Band karein' : 'Chalu karein'}
          </button>
        </>
      )}
    </>
  );
}

function Overview({ c, onTab, onParcels }: { c: CourierAccount; onTab: (t: Tab) => void; onParcels: (f: string) => void }) {
  const s = c.stats;
  const isApi = c.mode === 'api';
  return (
    <div className="space-y-4">
      {s.attempted > 0 && (
        <Alert tone="warning" title={`${s.attempted} parcel — customer nahi mila`} action={<Button size="sm" variant="secondary" onClick={() => onParcels('attempted')}>Dekhein</Button>}>
          Customer ko call ya WhatsApp karein — warna parcel wapas (RTO) aa jayega.
        </Alert>
      )}
      {isApi ? (
        <Card className="rounded-2xl" title="Kya kya khud hota hai">
          <ul className="grid gap-2 text-[0.8125rem] text-slate-700 sm:grid-cols-2">
            <Li>Order par &quot;{c.name} par book&quot; — CN khud</Li>
            {c.connect?.features.label
              ? <Li>{c.connect.labelKind === 'pdf' ? 'Label PDF' : 'Label link'} ek click me print</Li>
              : <Li>Label {c.name} portal se (CN Nafaa me khud aata hai)</Li>}
            <Li>Courier utha le → order &quot;Raste me&quot;</Li>
            <Li>Deliver → &quot;Courier ke paas&quot; (COD)</Li>
            <Li>Wapas (RTO) → bill void, stock wapas</Li>
            {c.connect?.features.settlement
              ? <Li>COD ka paisa aaya → khud &quot;Paisa mil gaya&quot;</Li>
              : <Li>COD settlement: COD safhe par chun kar &quot;mil gaya&quot;</Li>}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => onTab('book')} leftIcon={<Zap className="h-4 w-4" />}>Orders book karein</Button>
            <Button variant="secondary" onClick={() => onParcels('active')} leftIcon={<Truck className="h-4 w-4" />}>Parcels</Button>
            <Link to="/online-orders/cod"><Button variant="secondary" leftIcon={<Wallet className="h-4 w-4" />}>COD hisaab</Button></Link>
          </div>
        </Card>
      ) : (
        <Card className="rounded-2xl" title={`${c.name} kaise chalayein`}>
          <ol className="space-y-2 text-[0.8125rem] text-slate-700">
            <li>1. {c.name} ke portal par parcel book karein, CN lein</li>
            <li>2. Nafaa me order kholein → &quot;Rider/courier ko de diya&quot; → {c.name} chunein, CN daalein</li>
            <li>3. Deliver ho to &quot;Deliver ho gaya&quot;, wapas aaye to &quot;Wapas aaya (RTO)&quot; — stock khud wapas</li>
            <li>4. {c.name} paisa jama karwaye → COD safhe par chun kar &quot;Paisa mil gaya&quot;</li>
          </ol>
          <p className="mt-3 text-[0.8125rem] text-slate-500">{c.name} ka merchant API account hai? Hamein batayein — isay bhi ek click wala bana denge.</p>
        </Card>
      )}
    </div>
  );
}

const Li = ({ children }: { children: React.ReactNode }) => (
  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{children}</span></li>
);

/** Accepted orders not yet handed to any courier: pick and book together. */
function BookTab({ c, money, onOpen }: { c: CourierAccount; money: (n: number) => string; onOpen: (id: string) => void }) {
  const qc = useQueryClient();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [weight, setWeight] = useState('');
  const [failed, setFailed] = useState<Record<string, string>>({});
  const { data, isLoading, error } = useQuery({
    queryKey: ['courier-shipments', c.code, 'to-book'],
    queryFn: () => couriersApi.shipments(c.code, { filter: 'to-book', limit: 200 }),
  });
  const rows = data?.rows ?? [];

  const bulk = useMutation({
    mutationFn: () => couriersApi.bulkBook(c.code, { orderIds: [...picked], weightKg: weight ? Number(weight) : undefined }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['courier-shipments', c.code] });
      qc.invalidateQueries({ queryKey: COURIERS_KEY });
      qc.invalidateQueries({ queryKey: ['online-orders'] });
      setFailed(Object.fromEntries(r.results.filter((x) => !x.ok).map((x) => [x.orderId, x.error ?? 'Nahi hua'])));
      setPicked(new Set(r.results.filter((x) => !x.ok).map((x) => x.orderId)));
      if (r.booked) toast.success(`${r.booked} order ${c.name} par book`, { description: 'Parcels tab se label print karein' });
      if (r.failed) toast.error(`${r.failed} order book nahi hue — wajah neeche likhi hai`);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <header className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <h2 className="text-[0.9375rem] font-semibold text-slate-900">Book hone ke liye tayyar</h2>
        <p className="text-[0.8125rem] text-slate-500">Accept ho chuke orders jo abhi kisi courier ko nahi diye. Chunein → ek click me sab book — shehar khud milta hai.</p>
      </header>
      {picked.size > 0 && (
        <div className="sticky top-2 z-10 mx-3 mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-white shadow-lg sm:mx-4">
          <span className="text-[0.8125rem] font-semibold">{picked.size} chune</span>
          <input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" min="0.01" step="0.1"
            placeholder={`Wazan (default ${c.settings?.defaultWeightKg ?? 0.5} kg)`}
            className="h-8 w-44 rounded-lg border border-white/20 bg-white/10 px-2.5 text-[0.8125rem] text-white placeholder:text-white/50 outline-none" />
          <span className="flex-1" />
          <button type="button" onClick={() => setPicked(new Set())} className="h-8 rounded-lg px-3 text-[0.8125rem] font-semibold hover:bg-white/10">Chhoro</button>
          <Button size="sm" variant="success" loading={bulk.isPending} onClick={() => bulk.mutate()} leftIcon={<Zap className="h-4 w-4" />}>{c.name} par book</Button>
        </div>
      )}
      {isLoading ? <div className="p-4"><Skeleton className="h-32 rounded-xl" /></div>
        : error ? <Empty title="List nahi khuli" text={apiErrorMessage(error)} />
          : !rows.length ? <Empty title="Sab bhej diye" text="Koi accept hua order courier ka intezar nahi kar raha." />
            : (
              <ul className="divide-y divide-slate-100">
                <li className="flex items-center gap-3 px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400 sm:px-5">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" aria-label="Sab chunein" checked={rows.every((r) => picked.has(r.id))}
                    onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
                  <span className="flex-1">Order · customer · shehar</span><span className="hidden w-16 text-right sm:block">Pieces</span><span className="w-24 text-right">COD</span>
                </li>
                {rows.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/80 sm:px-5">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={picked.has(o.id)} onChange={() => toggle(o.id)} aria-label={`#${o.externalOrderNumber ?? o.externalOrderId} chunein`} />
                    <button type="button" onClick={() => onOpen(o.id)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[0.875rem]"><b className="font-semibold text-slate-900">#{o.externalOrderNumber ?? o.externalOrderId}</b> <span className="text-slate-600">· {o.customerName}{o.customerCity ? ` · ${o.customerCity}` : ' · shehar nahi likha'}</span></span>
                      {failed[o.id] && <span className="block text-[0.75rem] font-medium text-rose-600">{failed[o.id]}</span>}
                    </button>
                    <span className="hidden w-16 text-right text-[0.8125rem] tabular-nums text-slate-600 sm:block">{o.pieces || 1}</span>
                    <span className="w-24 text-right text-[0.875rem] font-semibold tabular-nums text-slate-900">{o.paymentStatus === 'PAID' ? 'Paid' : money(o.total)}</span>
                  </li>
                ))}
              </ul>
            )}
    </section>
  );
}

function ParcelsTab({ c, money, filter, setFilter, onOpen }: {
  c: CourierAccount; money: (n: number) => string; filter: string; setFilter: (f: string) => void; onOpen: (id: string) => void;
}) {
  const portal = !!(c.connected && c.connect?.features.portal);
  const [src, setSrc] = useState<'portal' | 'nafaa'>('nafaa');
  return (
    <div className="space-y-3">
      {portal && (
        <Segmented value={src} onChange={setSrc} items={[
          { value: 'nafaa', label: 'Nafaa orders' },
          { value: 'portal', label: `${c.name} portal (sab)` },
        ]} />
      )}
      {src === 'portal' && portal ? <PortalParcels c={c} money={money} onOpen={onOpen} /> : <NafaaParcels c={c} money={money} filter={filter} setFilter={setFilter} onOpen={onOpen} />}
    </div>
  );
}

/** Every parcel on the courier's portal, including ones booked outside Nafaa. */
function PortalParcels({ c, money, onOpen }: { c: CourierAccount; money: (n: number) => string; onOpen: (id: string) => void }) {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const limit = 50;
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['courier-portal', c.code, filter, q.trim(), page],
    queryFn: () => couriersApi.portalParcels(c.code, { filter, search: q.trim() || undefined, limit, offset: page * limit }),
    placeholderData: (prev) => prev,
  });
  const rows = data?.rows ?? [];
  const pages = Math.ceil((data?.total ?? 0) / limit);
  const labels = useMutation({
    mutationFn: () => couriersApi.openLabels(c.code, [...picked]),
    onError: (e) => toast.error(apiErrorMessage(e, 'Labels nahi khule')),
  });
  const toggle = (tn: string) => setPicked((s) => { const n = new Set(s); if (n.has(tn)) n.delete(tn); else n.add(tn); return n; });

  return (
    <>
      <FilterBar search={<SearchField value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="CN ya shehar…" label="Parcel dhoondein" />}>
        <FilterMenu icon={ListFilter} label="Parcel" value={filter} active={filter !== 'all'} onChange={(v) => { setFilter(v); setPage(0); }} options={PORTAL_FILTERS} align="right" />
      </FilterBar>
      <section className={cn('rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80', isFetching && 'opacity-80')}>
        {picked.size > 0 && c.connect?.features.label && (
          <div className="mx-3 mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-white sm:mx-4">
            <span className="text-[0.8125rem] font-semibold">{picked.size} chune</span>
            <span className="flex-1" />
            <button type="button" onClick={() => setPicked(new Set())} className="h-8 rounded-lg px-3 text-[0.8125rem] font-semibold hover:bg-white/10">Chhoro</button>
            <Button size="sm" variant="success" loading={labels.isPending} onClick={() => labels.mutate()} leftIcon={<Printer className="h-4 w-4" />}>Labels print</Button>
          </div>
        )}
        {isLoading ? <div className="p-4"><Skeleton className="h-32 rounded-xl" /></div>
          : error ? <Empty title="Parcels nahi khule" text={apiErrorMessage(error)} />
            : !rows.length ? (
              <Empty title={c.lastSyncAt ? 'Yahan koi parcel nahi' : `${c.name} se parcels abhi nahi aaye`}
                text={c.lastSyncAt ? 'Pichhle 30 din me is filter ka koi parcel nahi.' : 'Upar "Abhi sync" dabayein — pichhle 30 din ke saare parcels aa jayenge.'} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[46rem] text-[0.8125rem]">
                  <thead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="w-10 px-4 py-2 sm:px-5">
                        <input type="checkbox" className="h-4 w-4 rounded border-slate-300" aria-label="Sab chunein" checked={rows.every((r) => picked.has(r.trackingNumber))}
                          onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.trackingNumber)) : new Set())} />
                      </th>
                      <th className="px-3 py-2">CN</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Nafaa order</th>
                      <th className="px-4 py-2 text-right sm:px-5">COD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => {
                      const st = COURIER_STATE[r.state] ?? COURIER_STATE.UNKNOWN;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-2.5 sm:px-5"><input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={picked.has(r.trackingNumber)} onChange={() => toggle(r.trackingNumber)} aria-label={`${r.trackingNumber} chunein`} /></td>
                          <td className="px-3 py-2.5">
                            <CopyCn cn={r.trackingNumber} />
                            <div className="text-[0.75rem] text-slate-400">{whenText(r.bookedAt)}{r.orderRef ? ` · ref ${r.orderRef}` : ''}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="max-w-[12rem] truncate text-slate-800">{r.customerName ?? '—'}</div>
                            <div className="text-[0.75rem] text-slate-500">{[r.customerPhone, r.city].filter(Boolean).join(' · ') || '—'}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge variant={st.tone}>{st.label}</Badge>
                            {r.statusLabel && <div className="mt-0.5 max-w-[11rem] truncate text-[0.6875rem] text-slate-400" title={r.statusLabel}>{r.statusLabel}</div>}
                          </td>
                          <td className="px-3 py-2.5">
                            {r.order
                              ? <button type="button" onClick={() => onOpen(r.order!.id)} className="font-semibold text-brand-700 hover:underline">#{r.order.number}</button>
                              : <span className="text-[0.75rem] text-slate-400">Portal se book</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900 sm:px-5">{money(r.codAmount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        <Pager total={data?.total ?? 0} page={page} pages={pages} setPage={setPage} />
      </section>
    </>
  );
}

function NafaaParcels({ c, money, filter, setFilter, onOpen }: {
  c: CourierAccount; money: (n: number) => string; filter: string; setFilter: (f: string) => void; onOpen: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['courier-shipments', c.code, filter, q.trim(), page],
    queryFn: () => couriersApi.shipments(c.code, { filter, search: q.trim() || undefined, limit, offset: page * limit }),
    placeholderData: (prev) => prev,
  });
  const rows = data?.rows ?? [];
  const pages = Math.ceil((data?.total ?? 0) / limit);

  return (
    <>
      <FilterBar search={<SearchField value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder="CN, order #, customer, phone…" label="Parcel dhoondein" />}>
        <FilterMenu icon={ListFilter} label="Parcel" value={filter} active={filter !== 'active'} onChange={(v) => { setFilter(v); setPage(0); }} options={PARCEL_FILTERS} align="right" />
      </FilterBar>
      <section className={cn('rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80', isFetching && 'opacity-80')}>
        {isLoading ? <div className="p-4"><Skeleton className="h-32 rounded-xl" /></div>
          : error ? <Empty title="Parcels nahi khule" text={apiErrorMessage(error)} />
            : !rows.length ? <Empty title="Yahan koi parcel nahi" text={q ? 'Is talaash se kuch nahi mila.' : 'Is filter me abhi kuch nahi.'} />
              : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[46rem] text-[0.8125rem]">
                    <thead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                      <tr><th className="px-4 py-2 sm:px-5">Order</th><th className="px-3 py-2">CN</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Courier status</th><th className="px-3 py-2">Order</th><th className="px-3 py-2 text-right">Raqam</th><th className="px-4 py-2 sm:px-5" /></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((o) => <ParcelRow key={o.id} o={o} c={c} money={money} onOpen={() => onOpen(o.id)} />)}
                    </tbody>
                  </table>
                </div>
              )}
        <Pager total={data?.total ?? 0} page={page} pages={pages} setPage={setPage} />
      </section>
    </>
  );
}

function ParcelRow({ o, c, money, onOpen }: { o: CourierShipment; c: CourierAccount; money: (n: number) => string; onOpen: () => void }) {
  const st = o.courierStatus ? COURIER_STATE[o.courierStatus] ?? COURIER_STATE.UNKNOWN : null;
  const ord = STATUS_LABEL[o.orderStatus];
  const label = useMutation({
    mutationFn: () => couriersApi.openLabel(o.id),
    onError: (e) => toast.error(apiErrorMessage(e, 'Label nahi khula')),
  });
  const waitingDays = o.courierStatus === 'BOOKED' && o.courierBookedAt ? Math.floor((Date.now() - new Date(o.courierBookedAt).getTime()) / 86_400_000) : 0;
  return (
    <tr className="hover:bg-slate-50/80">
      <td className="px-4 py-2.5 sm:px-5">
        <button type="button" onClick={onOpen} className="font-semibold text-slate-900 hover:underline">#{o.externalOrderNumber ?? o.externalOrderId}</button>
        <div className="text-[0.75rem] text-slate-400">{whenText(o.courierBookedAt ?? o.dispatchedAt)}</div>
      </td>
      <td className="px-3 py-2.5">
        {o.trackingNumber ? <CopyCn cn={o.trackingNumber} /> : <span className="text-slate-400">—</span>}
        {!o.viaApi && <div className="text-[0.6875rem] text-slate-400"><PenLine className="mr-0.5 inline h-3 w-3" />manual</div>}
      </td>
      <td className="px-3 py-2.5">
        <div className="max-w-[11rem] truncate text-slate-800">{o.customerName}</div>
        <div className="text-[0.75rem] text-slate-500">{o.customerCity ?? '—'}</div>
      </td>
      <td className="px-3 py-2.5">
        {st ? <Badge variant={st.tone}>{st.label}</Badge> : <span className="text-slate-400">—</span>}
        {o.courierLabel && <div className="mt-0.5 max-w-[11rem] truncate text-[0.6875rem] text-slate-400" title={o.courierLabel}>{o.courierLabel}</div>}
        {waitingDays >= 2 && <div className="mt-0.5 text-[0.6875rem] font-medium text-amber-700">{waitingDays} din se pickup nahi hua</div>}
      </td>
      <td className="px-3 py-2.5"><span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', ord?.tone)}>{ord?.short ?? o.orderStatus}</span></td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        <div className="font-semibold text-slate-900">{money(o.total)}</div>
        <div className="text-[0.6875rem] text-slate-400">{o.paymentStatus === 'PAID' ? 'mil gaya' : o.paymentStatus === 'COLLECTED' ? 'courier ke paas' : o.paymentStatus === 'NOT_COLLECTED' ? 'nahi aayega' : 'COD'}</div>
      </td>
      <td className="px-4 py-2.5 text-right sm:px-5">
        {o.viaApi && c.connected && c.connect?.features.label && o.orderStatus !== 'RETURNED' && (
          <Button size="xs" variant="ghost" loading={label.isPending} onClick={() => label.mutate()} leftIcon={<Printer className="h-3.5 w-3.5" />}>Label</Button>
        )}
      </td>
    </tr>
  );
}

function ConnectionTab({ c, onConnected }: { c: CourierAccount; onConnected: () => void }) {
  const qc = useQueryClient();
  const [replace, setReplace] = useState(!c.connected);
  const test = useMutation({
    mutationFn: () => couriersApi.test(c.code),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: COURIERS_KEY }); toast.success(`${c.name} theek chal raha hai · ${r.cities} shehar`); },
    onError: (e) => { qc.invalidateQueries({ queryKey: COURIERS_KEY }); toast.error(apiErrorMessage(e)); },
  });
  const disconnect = useMutation({
    mutationFn: () => couriersApi.disconnect(c.code),
    onSuccess: () => { qc.invalidateQueries({ queryKey: COURIERS_KEY }); toast.success(`${c.name} hata diya`); setReplace(true); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const since = useMemo(() => (c.connectedAt ? whenText(c.connectedAt) : null), [c.connectedAt]);

  return (
    <div className="space-y-4">
      {c.connected && (
        <Card className="rounded-2xl" title="Connection" description={[since && `Jura: ${since}`, c.lastTestedAt && `aakhri check ${timeAgo(c.lastTestedAt)}`].filter(Boolean).join(' · ')}>
          <div className="flex flex-wrap items-center gap-3">
            <KeyRound className="h-4 w-4 text-slate-400" />
            <span className="font-mono text-[0.8125rem] text-slate-700">{c.maskedKey}</span>
            <span className="flex-1" />
            <Button size="sm" variant="secondary" loading={test.isPending} leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => test.mutate()}>Check karein</Button>
            <Button size="sm" variant="ghost" leftIcon={<KeyRound className="h-3.5 w-3.5" />} onClick={() => setReplace((v) => !v)}>{replace ? 'Rehne dein' : 'Nayi key'}</Button>
            <Button size="sm" variant="critical" loading={disconnect.isPending} leftIcon={<Unplug className="h-3.5 w-3.5" />}
              onClick={() => { if (window.confirm(`${c.name} hatayein? Book parcels ki tracking ruk jayegi (orders waise hi rahenge).`)) disconnect.mutate(); }}>
              Hatayein
            </Button>
          </div>
        </Card>
      )}
      {replace && (
        <Card className="rounded-2xl" title={c.connected ? 'Nayi key lagayein' : `${c.name} jorein`} description="Nafaa key ko usi waqt courier se check karta hai — ghalat key save nahi hoti.">
          <ConnectForm c={c} onDone={() => { setReplace(false); if (!c.connected) onConnected(); }} />
        </Card>
      )}
      {!c.connected && c.connect && (
        <Card className="rounded-2xl" title="Jurne ke baad kya milega">
          <ul className="grid gap-2 text-[0.8125rem] text-slate-700 sm:grid-cols-2">
            <Li>Ek click booking aur CN</Li>
            <Li>{c.connect.features.label ? 'Label print' : 'Tracking khud'}</Li>
            <Li>Deliver aur RTO par order khud update</Li>
            <Li>{c.connect.features.settlement ? 'COD settlement khud' : 'COD hisaab ek jagah'}</Li>
          </ul>
        </Card>
      )}
    </div>
  );
}

function CopyCn({ cn: value }: { cn: string }) {
  return (
    <button type="button" onClick={() => navigator.clipboard?.writeText(value).then(() => toast.success('CN copy ho gaya'))}
      className="font-mono text-[0.8125rem] text-slate-800 hover:underline" title="Copy">{value}</button>
  );
}

function Pager({ total, page, pages, setPage }: { total: number; page: number; pages: number; setPage: (fn: (p: number) => number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[0.8125rem] text-slate-500 sm:px-5">
      <span>{total} parcels · safha {page + 1} / {pages}</span>
      <div className="flex gap-1">
        <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Pichhla</Button>
        <Button size="sm" variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Agla</Button>
      </div>
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><PackageCheck className="h-5 w-5" /></span>
      <p className="mt-3 font-semibold text-slate-900">{title}</p>
      <p className="mt-1 max-w-md text-[0.8125rem] text-slate-500">{text}</p>
    </div>
  );
}

