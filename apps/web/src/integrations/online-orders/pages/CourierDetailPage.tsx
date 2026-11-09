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
  BookOpen, CheckCircle2, ExternalLink, GraduationCap, KeyRound, ListFilter, PackageCheck, PenLine, Power, Printer, RefreshCw, Truck, Undo2, Unplug, UserX,
  Wallet, Zap,
} from 'lucide-react';
import { Alert, Badge, Button, Card, confirmDialog, FilterBar, FilterMenu, heroButton, heroIconButton, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Segmented, Skeleton, Table, TBody, Td, Th, THead, Tr, type BadgeVariant, ViewTabs } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { apiErrorMessage, couriersApi, type CourierAccount, type CourierShipment } from '../api/online-orders.api';
import { COURIERS_KEY, ConnectForm, CourierLogo, CourierSettingsForm } from '../components/couriers/CourierForms';
import { OrderDrawer } from '../components/orders/OrderDrawer';
import { STATUS_LABEL, timeAgo, whenText } from '../lib/labels';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { GuideBody, GuideCard } from '../components/guides/Guide';
import { courierGuide } from '../components/guides/courierGuides';
import { t as tr } from '@core/i18n';

type Tab = 'overview' | 'book' | 'parcels' | 'settings' | 'connection';

const CARD = 'rounded-3xl border-0 ring-1 ring-slate-200/80';

const COURIER_STATE: Record<string, { label: string; tone: BadgeVariant }> = {
  BOOKING: { label: tr('Book ho raha'), tone: 'default' },
  BOOKED: { label: tr('Pickup ka intezar'), tone: 'info' },
  PICKED_UP: { label: tr('Courier le gaya'), tone: 'info' },
  IN_TRANSIT: { label: tr('Raste me'), tone: 'brand' },
  OUT_FOR_DELIVERY: { label: tr('Aaj deliver'), tone: 'brand' },
  ATTEMPTED: { label: tr('Customer tak nahi pohanche'), tone: 'warning' },
  DELIVERED: { label: tr('Deliver hue'), tone: 'success' },
  RETURNING: { label: tr('Wapas aa raha'), tone: 'danger' },
  RETURNED: { label: tr('Wapas (RTO)'), tone: 'danger' },
  CANCELLED: { label: tr('Booking cancel'), tone: 'default' },
  UNKNOWN: { label: '—', tone: 'default' },
};

const PARCEL_FILTERS = [
  { value: 'active', label: tr('Raste me') },
  { value: 'booked', label: tr('Pickup baqi') },
  { value: 'attempted', label: tr('Customer tak nahi pohanche') },
  { value: 'returning', label: tr('Wapas aa rahe') },
  { value: 'cod', label: tr('Paisa baqi') },
  { value: 'delivered', label: tr('Deliver hue') },
  { value: 'returned', label: tr('RTO') },
  { value: 'all', label: tr('Sab') },
];

const PORTAL_FILTERS = [
  { value: 'all', label: tr('Sab') },
  { value: 'active', label: tr('Raste me') },
  { value: 'attempted', label: tr('Customer tak nahi pohanche') },
  { value: 'delivered', label: tr('Deliver hue') },
  { value: 'returned', label: tr('RTO') },
  { value: 'unlinked', label: tr('Nafaa order se nahi jure') },
];

export default function CourierDetailPage() {
  const { code: raw = '' } = useParams();
  const code = raw.toUpperCase();
  const [params, setParams] = useSearchParams();
  const { sales: money } = useMasked();
  const guide = usePageGuide();
  const [parcelFilter, setParcelFilter] = useState('active');
  const [orderId, setOrderId] = useState<string | null>(null);
  const { data, isLoading, error, isFetching } = useQuery({ queryKey: COURIERS_KEY, queryFn: couriersApi.list, refetchInterval: 60_000 });
  const c = data?.find((x) => x.code === code);

  const isApi = c?.mode === 'api';
  const tabs: Array<{ id: Tab; label: string; count?: number | null }> = c
    ? isApi && c.connected
      ? [
          { id: 'overview', label: tr('Overview') },
          { id: 'book', label: tr('Book karein') },
          { id: 'parcels', label: tr('Parcels'), count: c.stats.active || null },
          { id: 'settings', label: tr('Settings') },
          { id: 'connection', label: tr('Connection') },
        ]
      : isApi
        ? [{ id: 'connection', label: tr('Jorein') }, { id: 'parcels', label: tr('Parcels') }]
        : [{ id: 'overview', label: tr('Overview') }, { id: 'parcels', label: tr('Parcels'), count: c.stats.active || null }]
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
          <p className="font-semibold text-slate-900">{error ? tr('Courier nahi khula') : tr('Ye courier list me nahi')}</p>
          {error && <p className="mt-1 text-[0.8125rem] text-slate-500">{apiErrorMessage(error)}</p>}
          <Link to="/online-store/couriers"><Button className="mt-3" variant="secondary">{tr('Sab couriers')}</Button></Link>
        </div>
      </PageShell>
    );
  }

  const s = c.stats;
  const statusText = c.connected ? (c.lastError ? tr('Masla') : c.active ? tr('Jura hua') : tr('Band')) : isApi ? tr('Ek click connect') : tr('Manual');

  return (
    <PageShell>
      <PageHero
        back="/online-store/couriers"
        backLabel={tr('Sab couriers')}
        title={<span className="inline-flex items-center gap-3"><span className="inline-flex rounded-[28%] bg-white"><CourierLogo c={c} size={32} /></span>{c.name}</span>}
        chip={<><Truck />{statusText}</>}
        meta={c.connected
          ? tr('Key {{value}}{{value2}}', { value: c.maskedKey ?? '', value2: c.lastSyncAt ? tr(' · aakhri sync {{lastSyncAt}}', { lastSyncAt: timeAgo(c.lastSyncAt) }) : '' })
          : isApi ? tr('{{name}} ki details paste karein — booking, label, tracking aur RTO sab khud', { name: c.name }) : c.code === 'RIDER' ? tr('Order ka safar aur COD ka paisa Nafaa sambhalta hai') : tr('CN khud likhein — tracking link, COD hisaab aur RTO Nafaa sambhalta hai')}
        busy={isFetching}
        actions={<HeaderActions c={c} onGuide={guide.open} />}
        stats={[
          { label: tr('Raste me'), value: String(s.active), hint: s.awaitingPickup ? tr('{{awaitingPickup}} pickup baqi', { awaitingPickup: s.awaitingPickup }) : undefined },
          { label: tr('Deliver (30 din)'), value: String(s.delivered30), hint: tr('{{dispatched30}} bheje', { dispatched30: s.dispatched30 }) },
          { label: tr('RTO (30 din)'), value: `${s.rtoRate}%`, hint: tr('{{returned30}} wapas', { returned30: s.returned30 }) },
          { label: tr('Courier ke paas (COD)'), value: money(s.codPendingValue), hint: tr('{{codPending}} parcel', { codPending: s.codPending }) },
        ]}
      />

      {isApi ? (
        <KpiRow cols={4}>
          <KpiCard icon={Zap} color="#2563eb" label={tr('Book (30 din)')} value={s.booked30} hint={tr('Nafaa se book hue')} />
          <KpiCard icon={Printer} color="#d97706" label={tr('Pickup ka intezar')} value={s.awaitingPickup} hint={tr('Label print karke parcel dein')} onClick={() => showParcels('booked')} />
          <KpiCard icon={UserX} color="#e11d48" label={tr('Customer tak nahi pohanche')} value={s.attempted} hint={tr('Call karein warna RTO')} onClick={() => showParcels('attempted')} />
          <KpiCard icon={Wallet} color="#ea580c" label={tr('COD paas')} value={money(s.codPendingValue)} hint={tr('{{codPending}} parcel · dabayein', { codPending: s.codPending })} onClick={() => showParcels('cod')} />
        </KpiRow>
      ) : (
        <KpiRow cols={3}>
          <KpiCard icon={UserX} color="#e11d48" label={tr('Customer tak nahi pohanche')} value={s.attempted} hint={tr('Call karein warna RTO')} onClick={() => showParcels('attempted')} />
          <KpiCard icon={Wallet} color="#ea580c" label={tr('COD paas')} value={money(s.codPendingValue)} hint={tr('{{codPending}} parcel · dabayein', { codPending: s.codPending })} onClick={() => showParcels('cod')} />
          <KpiCard icon={Undo2} color="#c026d3" label={tr('Wapas (30 din)')} value={s.returned30} hint={tr('{{dispatched30}} bheje · dabayein', { dispatched30: s.dispatched30 })} onClick={() => showParcels('returned')} />
        </KpiRow>
      )}

      {c.connected && c.lastError && (
        <Alert tone="danger" title={tr('{{name}} se rabta nahi ho raha', { name: c.name })} action={<Button size="sm" variant="secondary" onClick={() => setTab('connection')}>{tr('Key check karein')}</Button>}>
          {c.lastError}
        </Alert>
      )}
      {c.connected && c.missingSettings.length > 0 && tab !== 'settings' && (
        <Alert tone="warning" title={tr('Booking se pehle settings poori karein')} action={<Button size="sm" variant="secondary" onClick={() => setTab('settings')}>{tr('Settings')}</Button>}>
          {tr('Khali hain: {{value}}', { value: c.missingSettings.join(', ') })}
        </Alert>
      )}

      <ViewTabs value={tab} onChange={setTab} tabs={tabs} />

      {tab === 'overview' && <Overview c={c} onTab={setTab} onParcels={showParcels} />}
      {tab === 'book' && <BookTab c={c} money={money} onOpen={setOrderId} />}
      {tab === 'parcels' && <ParcelsTab c={c} money={money} filter={parcelFilter} setFilter={setParcelFilter} onOpen={setOrderId} />}
      {tab === 'settings' && <Card className={CARD} title={tr('Booking settings')} description={tr('Har nayi booking par yahi lagengi — booking ke waqt badal bhi sakte hain.')}><CourierSettingsForm c={c} /></Card>}
      {tab === 'connection' && <ConnectionTab c={c} onConnected={() => setTab('overview')} />}

      {orderId && <OrderDrawer orderId={orderId} onClose={() => setOrderId(null)} />}
      {guide.isOpen && (
        <PageGuide title={c.name} onClose={guide.close}
          flow={[
            { label: tr('Book karein'), hint: tr('CN khud'), icon: Zap, color: '#16a34a' },
            { label: tr('Raste me'), icon: Truck, color: '#0284c7' },
            { label: 'Delivered', hint: tr('COD courier ke paas'), icon: CheckCircle2, color: '#7c3aed' },
          ]}
          steps={[
            { icon: KeyRound, color: '#2563eb', title: tr('Connection'), text: tr('Courier ki key yahan jorein — Nafaa usi waqt check karta hai.') },
            { icon: Zap, color: '#16a34a', title: tr('Book karein'), text: tr('Accept hue orders chunein aur ek saath book karein, label print karein.') },
            { icon: Wallet, color: '#ea580c', title: tr('COD'), text: tr('Deliver hone ke baad paisa courier ke paas rehta hai — COD hisaab me "Paisa mil gaya" karein.') },
          ]}
          shortcuts={[['G', tr('guide')]]}
        />
      )}
    </PageShell>
  );
}

function HeaderActions({ c, onGuide }: { c: CourierAccount; onGuide: () => void }) {
  const qc = useQueryClient();
  const sync = useMutation({
    mutationFn: () => couriersApi.sync(c.code),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: COURIERS_KEY });
      qc.invalidateQueries({ queryKey: ['courier-shipments', c.code] });
      qc.invalidateQueries({ queryKey: ['courier-portal', c.code] });
      if (r.lastError) toast.error(r.lastError); else toast.success(tr('Sab parcels ka taaza status aa gaya'));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const setActive = useMutation({
    mutationFn: (active: boolean) => couriersApi.update(c.code, { active }),
    onSuccess: (_r, active) => { qc.invalidateQueries({ queryKey: COURIERS_KEY }); toast.success(active ? `${c.name} chalu` : tr('{{name}} band — nayi booking nahi hogi', { name: c.name })); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <>
      <HeroGuideButton c={c} />
      {c.site && <a href={c.site} target="_blank" rel="noreferrer" className={heroButton}><ExternalLink className="h-4 w-4" /> <span className="hidden sm:inline">{tr('Website')}</span></a>}
      {c.connected && (
        <>
          <button type="button" onClick={() => sync.mutate()} disabled={sync.isPending} className={heroButton}>
            <RefreshCw className={cn('h-4 w-4', sync.isPending && 'animate-spin')} /> {' '}{tr('Abhi sync')}
          </button>
          <button type="button" onClick={() => setActive.mutate(!c.active)} disabled={setActive.isPending} className={heroButton}
            title={c.active ? tr('Band karne par nayi booking nahi hogi') : tr('Dobara chalu karein')}>
            <Power className="h-4 w-4" /> {c.active ? tr('Band karein') : tr('Chalu karein')}
          </button>
        </>
      )}
      <button type="button" onClick={onGuide} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
    </>
  );
}

/** "Guide" in the header: the courier's step-by-step guide in a dialog. */
function HeroGuideButton({ c }: { c: CourierAccount }) {
  const [open, setOpen] = useState(false);
  const guide = courierGuide(c);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={heroButton}><BookOpen className="h-4 w-4" /> {' '}{tr('Guide')}</button>
      <Modal open={open} onClose={() => setOpen(false)} size="lg" title={<span className="flex items-center gap-2.5"><CourierLogo c={c} size={28} />{guide.title}</span>}>
        <GuideBody guide={guide} />
      </Modal>
    </>
  );
}

function Overview({ c, onTab, onParcels }: { c: CourierAccount; onTab: (t: Tab) => void; onParcels: (f: string) => void }) {
  const s = c.stats;
  const isApi = c.mode === 'api';
  return (
    <div className="space-y-4">
      {s.attempted > 0 && (
        <Alert tone="warning" title={tr('{{attempted}} parcel — customer nahi mila', { attempted: s.attempted })} action={<Button size="sm" variant="secondary" onClick={() => onParcels('attempted')}>{tr('Dekhein')}</Button>}>
          {tr('Customer ko call ya WhatsApp karein — warna parcel wapas (RTO) aa jayega.')}
        </Alert>
      )}
      {isApi ? (
        <Card className={CARD} title={tr('Kya kya khud hota hai')}>
          <ul className="grid gap-2 text-[0.8125rem] text-slate-700 sm:grid-cols-2">
            <Li>{tr('Order par "{{name}} par book" — CN khud', { name: c.name })}</Li>
            {c.connect?.features.label
              ? <Li>{tr('{{value}} ek click me print', { value: c.connect.labelKind === 'pdf' ? tr('Label PDF') : tr('Label link') })}</Li>
              : <Li>{tr('Label {{name}} portal se (CN Nafaa me khud aata hai)', { name: c.name })}</Li>}
            <Li>{tr('Courier utha le → order "Raste me"')}</Li>
            <Li>{tr('Deliver → "Courier ke paas" (COD)')}</Li>
            <Li>{tr('Wapas (RTO) → bill void, stock wapas')}</Li>
            {c.connect?.features.settlement
              ? <Li>{tr('COD ka paisa aaya → khud "Paisa mil gaya"')}</Li>
              : <Li>{tr('COD settlement: COD safhe par chun kar "mil gaya"')}</Li>}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => onTab('book')} leftIcon={<Zap className="h-4 w-4" />}>{tr('Orders book karein')}</Button>
            <Button variant="secondary" onClick={() => onParcels('active')} leftIcon={<Truck className="h-4 w-4" />}>{tr('Parcels')}</Button>
            <Link to="/online-orders/cod"><Button variant="secondary" leftIcon={<Wallet className="h-4 w-4" />}>{tr('COD hisaab')}</Button></Link>
          </div>
        </Card>
      ) : (
        <GuideCard guide={courierGuide(c)} />
      )}
    </div>
  );
}

const Li = ({ children }: { children: React.ReactNode }) => (
  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" /><span>{children}</span></li>
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
      setFailed(Object.fromEntries(r.results.filter((x) => !x.ok).map((x) => [x.orderId, x.error ?? tr('Nahi hua')])));
      setPicked(new Set(r.results.filter((x) => !x.ok).map((x) => x.orderId)));
      if (r.booked) toast.success(tr('{{booked}} order {{name}} par book', { booked: r.booked, name: c.name }), { description: tr('Parcels tab se label print karein') });
      if (r.failed) toast.error(tr('{{failed}} order book nahi hue — wajah neeche likhi hai', { failed: r.failed }));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <header className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <h2 className="text-[0.9375rem] font-semibold text-slate-900">{tr('Book hone ke liye tayyar')}</h2>
        <p className="text-[0.8125rem] text-slate-500">{tr('Accept ho chuke orders jo abhi kisi courier ko nahi diye. Chunein → ek click me sab book — shehar khud milta hai.')}</p>
      </header>
      {picked.size > 0 && (
        <div className="sticky top-2 z-10 mx-3 mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-white shadow-lg sm:mx-4">
          <span className="text-[0.8125rem] font-semibold">{tr('{{size}} chune', { size: picked.size })}</span>
          <input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" min="0.01" step="0.1"
            placeholder={tr('Wazan (default {{value}} kg)', { value: c.settings?.defaultWeightKg ?? 0.5 })}
            className="h-8 w-44 rounded-lg border border-white/20 bg-white/10 px-2.5 text-[0.8125rem] text-white placeholder:text-white/50 outline-none" />
          <span className="flex-1" />
          <button type="button" onClick={() => setPicked(new Set())} className="h-8 rounded-lg px-3 text-[0.8125rem] font-semibold hover:bg-white/10">{tr('Chhoro')}</button>
          <Button size="sm" variant="success" loading={bulk.isPending} onClick={() => bulk.mutate()} leftIcon={<Zap className="h-4 w-4" />}>{tr('{{name}} par book', { name: c.name })}</Button>
        </div>
      )}
      {isLoading ? <div className="p-4"><Skeleton className="h-32 rounded-xl" /></div>
        : error ? <Empty title={tr('List nahi khuli')} text={apiErrorMessage(error)} />
          : !rows.length ? <Empty title={tr('Sab bhej diye')} text={tr('Koi accept hua order courier ka intezar nahi kar raha.')} />
            : (
              <ul className="divide-y divide-slate-100">
                <li className="flex items-center gap-3 px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400 sm:px-5">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" aria-label={tr('Sab chunein')} checked={rows.every((r) => picked.has(r.id))}
                    onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
                  <span className="flex-1">{tr('Order · customer · shehar')}</span><span className="hidden w-16 text-end sm:block">{tr('Pieces')}</span><span className="w-24 text-end">{tr('COD')}</span>
                </li>
                {rows.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/80 sm:px-5">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={picked.has(o.id)} onChange={() => toggle(o.id)} aria-label={tr('#{{value}} chunein', { value: o.externalOrderNumber ?? o.externalOrderId })} />
                    <button type="button" onClick={() => onOpen(o.id)} className="min-w-0 flex-1 text-start">
                      <span className="block truncate text-[0.875rem]"><b className="font-semibold text-slate-900">#{o.externalOrderNumber ?? o.externalOrderId}</b> <span className="text-slate-600">· {o.customerName}{o.customerCity ? ` · ${o.customerCity}` : tr(' · shehar nahi likha')}</span></span>
                      {failed[o.id] && <span className="block text-[0.75rem] font-medium text-rose-600">{failed[o.id]}</span>}
                    </button>
                    <span className="hidden w-16 text-end text-[0.8125rem] tabular-nums text-slate-600 sm:block">{o.pieces || 1}</span>
                    <span className="w-24 text-end text-[0.875rem] font-semibold tabular-nums text-slate-900">{o.paymentStatus === 'PAID' ? tr('Paid') : money(o.total)}</span>
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
          { value: 'nafaa', label: tr('Nafaa orders') },
          { value: 'portal', label: tr('{{name}} portal (sab)', { name: c.name }) },
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
    onError: (e) => toast.error(apiErrorMessage(e, tr('Labels nahi khule'))),
  });
  const toggle = (tn: string) => setPicked((s) => { const n = new Set(s); if (n.has(tn)) n.delete(tn); else n.add(tn); return n; });

  return (
    <>
      <FilterBar search={<SearchField value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder={tr('CN ya shehar…')} label={tr('Parcel search')} />}>
        <FilterMenu icon={ListFilter} label={tr('Parcel')} value={filter} active={filter !== 'all'} onChange={(v) => { setFilter(v); setPage(0); }} options={PORTAL_FILTERS} align="right" />
      </FilterBar>
      <section className={cn('rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80', isFetching && 'opacity-80')}>
        {picked.size > 0 && c.connect?.features.label && (
          <div className="mx-3 mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-white sm:mx-4">
            <span className="text-[0.8125rem] font-semibold">{tr('{{size}} chune', { size: picked.size })}</span>
            <span className="flex-1" />
            <button type="button" onClick={() => setPicked(new Set())} className="h-8 rounded-lg px-3 text-[0.8125rem] font-semibold hover:bg-white/10">{tr('Chhoro')}</button>
            <Button size="sm" variant="success" loading={labels.isPending} onClick={() => labels.mutate()} leftIcon={<Printer className="h-4 w-4" />}>{tr('Labels print')}</Button>
          </div>
        )}
        {isLoading ? <div className="p-4"><Skeleton className="h-32 rounded-xl" /></div>
          : error ? <Empty title={tr('Parcels nahi khule')} text={apiErrorMessage(error)} />
            : !rows.length ? (
              <Empty title={c.lastSyncAt ? tr('Yahan koi parcel nahi') : tr('{{name}} se parcels abhi nahi aaye', { name: c.name })}
                text={c.lastSyncAt ? tr('Pichhle 30 din me is filter ka koi parcel nahi.') : tr('Upar "Abhi sync" dabayein — pichhle 30 din ke saare parcels aa jayenge.')} />
            ) : (
              <div className="overflow-x-auto">
                <Table minWidth="46rem" className="[&_table]:text-[0.8125rem]">
                  <THead className="text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                    <Tr>
                      <Th className="w-10 px-4 py-2 sm:px-5">
                        <input type="checkbox" className="h-4 w-4 rounded border-slate-300" aria-label={tr('Sab chunein')} checked={rows.every((r) => picked.has(r.trackingNumber))}
                          onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.trackingNumber)) : new Set())} />
                      </Th>
                      <Th className="px-3 py-2">{tr('CN')}</Th><Th className="px-3 py-2">{tr('Customer')}</Th><Th className="px-3 py-2">{tr('Status')}</Th><Th className="px-3 py-2">{tr('Nafaa order')}</Th>
                      <Th className="px-4 py-2 text-end sm:px-5">{tr('COD')}</Th>
                    </Tr>
                  </THead>
                  <TBody className="divide-y divide-slate-100">
                    {rows.map((r) => {
                      const st = COURIER_STATE[r.state] ?? COURIER_STATE.UNKNOWN;
                      return (
                        <Tr key={r.id} className="hover:bg-slate-50/80">
                          <Td className="px-4 py-2.5 sm:px-5"><input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={picked.has(r.trackingNumber)} onChange={() => toggle(r.trackingNumber)} aria-label={tr('{{trackingNumber}} chunein', { trackingNumber: r.trackingNumber })} /></Td>
                          <Td className="px-3 py-2.5">
                            <CopyCn cn={r.trackingNumber} />
                            <div className="text-[0.75rem] text-slate-400">{whenText(r.bookedAt)}{r.orderRef ? tr(' · ref {{orderRef}}', { orderRef: r.orderRef }) : ''}</div>
                          </Td>
                          <Td className="px-3 py-2.5">
                            <div className="max-w-[12rem] truncate text-slate-800">{r.customerName ?? '—'}</div>
                            <div className="text-[0.75rem] text-slate-500">{[r.customerPhone, r.city].filter(Boolean).join(' · ') || '—'}</div>
                          </Td>
                          <Td className="px-3 py-2.5">
                            <Badge variant={st.tone}>{st.label}</Badge>
                            {r.statusLabel && <div className="mt-0.5 max-w-[11rem] truncate text-[0.6875rem] text-slate-400" title={r.statusLabel}>{r.statusLabel}</div>}
                          </Td>
                          <Td className="px-3 py-2.5">
                            {r.order
                              ? <button type="button" onClick={() => onOpen(r.order!.id)} className="font-semibold text-brand-700 hover:underline">#{r.order.number}</button>
                              : <span className="text-[0.75rem] text-slate-400">{tr('Portal se book')}</span>}
                          </Td>
                          <Td className="px-4 py-2.5 text-end font-semibold tabular-nums text-slate-900 sm:px-5">{money(r.codAmount)}</Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
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
      <FilterBar search={<SearchField value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder={tr('CN, order #, customer, phone…')} label={tr('Parcel search')} />}>
        <FilterMenu icon={ListFilter} label={tr('Parcel')} value={filter} active={filter !== 'active'} onChange={(v) => { setFilter(v); setPage(0); }} options={PARCEL_FILTERS} align="right" />
      </FilterBar>
      <section className={cn('rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80', isFetching && 'opacity-80')}>
        {isLoading ? <div className="p-4"><Skeleton className="h-32 rounded-xl" /></div>
          : error ? <Empty title={tr('Parcels nahi khule')} text={apiErrorMessage(error)} />
            : !rows.length ? <Empty title={tr('Yahan koi parcel nahi')} text={q ? tr('Is talaash se kuch nahi mila.') : tr('Is filter me abhi kuch nahi.')} />
              : (
                <div className="overflow-x-auto">
                  <Table minWidth="46rem" className="[&_table]:text-[0.8125rem]">
                    <THead className="text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                      <Tr><Th className="px-4 py-2 sm:px-5">{tr('Order')}</Th><Th className="px-3 py-2">{tr('CN')}</Th><Th className="px-3 py-2">{tr('Customer')}</Th><Th className="px-3 py-2">{tr('Courier status')}</Th><Th className="px-3 py-2">{tr('Order')}</Th><Th className="px-3 py-2 text-end">{tr('Amount')}</Th><Th className="px-4 py-2 sm:px-5" /></Tr>
                    </THead>
                    <TBody className="divide-y divide-slate-100">
                      {rows.map((o) => <ParcelRow key={o.id} o={o} c={c} money={money} onOpen={() => onOpen(o.id)} />)}
                    </TBody>
                  </Table>
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
    onError: (e) => toast.error(apiErrorMessage(e, tr('Label nahi khula'))),
  });
  const waitingDays = o.courierStatus === 'BOOKED' && o.courierBookedAt ? Math.floor((Date.now() - new Date(o.courierBookedAt).getTime()) / 86_400_000) : 0;
  return (
    <Tr className="hover:bg-slate-50/80">
      <Td className="px-4 py-2.5 sm:px-5">
        <button type="button" onClick={onOpen} className="font-semibold text-slate-900 hover:underline">#{o.externalOrderNumber ?? o.externalOrderId}</button>
        <div className="text-[0.75rem] text-slate-400">{whenText(o.courierBookedAt ?? o.dispatchedAt)}</div>
      </Td>
      <Td className="px-3 py-2.5">
        {o.trackingNumber ? <CopyCn cn={o.trackingNumber} /> : <span className="text-slate-400">—</span>}
        {!o.viaApi && <div className="text-[0.6875rem] text-slate-400"><PenLine className="me-0.5 inline h-3 w-3" />{tr('manual')}</div>}
      </Td>
      <Td className="px-3 py-2.5">
        <div className="max-w-[11rem] truncate text-slate-800">{o.customerName}</div>
        <div className="text-[0.75rem] text-slate-500">{o.customerCity ?? '—'}</div>
      </Td>
      <Td className="px-3 py-2.5">
        {st ? <Badge variant={st.tone}>{st.label}</Badge> : <span className="text-slate-400">—</span>}
        {o.courierLabel && <div className="mt-0.5 max-w-[11rem] truncate text-[0.6875rem] text-slate-400" title={o.courierLabel}>{o.courierLabel}</div>}
        {waitingDays >= 2 && <div className="mt-0.5 text-[0.6875rem] font-medium text-amber-700">{tr('{{waitingDays}} din se pickup nahi hua', { waitingDays })}</div>}
      </Td>
      <Td className="px-3 py-2.5"><span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', ord?.tone)}>{ord?.short ?? o.orderStatus}</span></Td>
      <Td className="px-3 py-2.5 text-end tabular-nums">
        <div className="font-semibold text-slate-900">{money(o.total)}</div>
        <div className="text-[0.6875rem] text-slate-400">{o.paymentStatus === 'PAID' ? tr('mil gaya') : o.paymentStatus === 'COLLECTED' ? tr('courier ke paas') : o.paymentStatus === 'NOT_COLLECTED' ? tr('nahi aayega') : tr('COD')}</div>
      </Td>
      <Td className="px-4 py-2.5 text-end sm:px-5">
        {o.viaApi && c.connected && c.connect?.features.label && o.orderStatus !== 'RETURNED' && (
          <Button size="xs" variant="ghost" loading={label.isPending} onClick={() => label.mutate()} leftIcon={<Printer className="h-3.5 w-3.5" />}>{tr('Label')}</Button>
        )}
      </Td>
    </Tr>
  );
}

function ConnectionTab({ c, onConnected }: { c: CourierAccount; onConnected: () => void }) {
  const qc = useQueryClient();
  const [replace, setReplace] = useState(!c.connected);
  const test = useMutation({
    mutationFn: () => couriersApi.test(c.code),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: COURIERS_KEY }); toast.success(tr('{{name}} theek chal raha hai · {{cities}} shehar', { name: c.name, cities: r.cities })); },
    onError: (e) => { qc.invalidateQueries({ queryKey: COURIERS_KEY }); toast.error(apiErrorMessage(e)); },
  });
  const disconnect = useMutation({
    mutationFn: () => couriersApi.disconnect(c.code),
    onSuccess: () => { qc.invalidateQueries({ queryKey: COURIERS_KEY }); toast.success(tr('{{name}} hata diya', { name: c.name })); setReplace(true); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const since = useMemo(() => (c.connectedAt ? whenText(c.connectedAt) : null), [c.connectedAt]);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        {c.connected && (
          <Card className={CARD} title={tr('Connection')} description={[since && `Jura: ${since}`, c.lastTestedAt && `aakhri check ${timeAgo(c.lastTestedAt)}`].filter(Boolean).join(' · ')}>
            <div className="flex flex-wrap items-center gap-2">
              <KeyRound className="h-4 w-4 text-slate-400" />
              <span className="font-mono text-[0.8125rem] text-slate-700">{c.maskedKey}</span>
              <span className="flex-1" />
              <Button size="sm" variant="secondary" loading={test.isPending} leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => test.mutate()}>{tr('Check karein')}</Button>
              <Button size="sm" variant="ghost" leftIcon={<KeyRound className="h-3.5 w-3.5" />} onClick={() => setReplace((v) => !v)}>{replace ? tr('Rehne dein') : tr('Nayi key')}</Button>
              <Button size="sm" variant="critical" loading={disconnect.isPending} leftIcon={<Unplug className="h-3.5 w-3.5" />}
                onClick={async () => { if ((await confirmDialog({ title: tr('{{name}} hatayein?', { name: c.name }), text: tr('Book parcels ki tracking ruk jayegi (orders waise hi rahenge).'), danger: true }))) disconnect.mutate(); }}>
                {tr('Hatayein')}
              </Button>
            </div>
          </Card>
        )}
        {replace && (
          <Card className={CARD} title={c.connected ? tr('Nayi key lagayein') : tr('{{name}} jorein', { name: c.name })} description={tr('Nafaa details usi waqt courier se check karta hai — ghalat details save nahi hotin.')}>
            <ConnectForm c={c} onDone={() => { setReplace(false); if (!c.connected) onConnected(); }} />
          </Card>
        )}
        {!c.connected && c.connect && (
          <Card className={CARD} title={tr('Jurne ke baad kya milega')}>
            <ul className="grid gap-2 text-[0.8125rem] text-slate-700 sm:grid-cols-2">
              <Li>{tr('Ek click booking aur CN')}</Li>
              <Li>{c.connect.features.label ? tr('Label print') : tr('Tracking khud')}</Li>
              <Li>{tr('Deliver aur RTO par order khud update')}</Li>
              <Li>{c.connect.features.settlement ? tr('COD settlement khud') : tr('COD hisaab ek jagah')}</Li>
            </ul>
          </Card>
        )}
      </div>
      <GuideCard guide={courierGuide(c)} className="min-w-0" />
    </div>
  );
}

function CopyCn({ cn: value }: { cn: string }) {
  return (
    <button type="button" onClick={() => navigator.clipboard?.writeText(value).then(() => toast.success(tr('CN copy ho gaya')))}
      className="font-mono text-[0.8125rem] text-slate-800 hover:underline" title={tr('Copy')}>{value}</button>
  );
}

function Pager({ total, page, pages, setPage }: { total: number; page: number; pages: number; setPage: (fn: (p: number) => number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[0.8125rem] text-slate-500 sm:px-5">
      <span>{tr('{{total}} parcels · safha {{value}} / {{pages}}', { total, value: page + 1, pages })}</span>
      <div className="flex gap-1">
        <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>{tr('Pichhla')}</Button>
        <Button size="sm" variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>{tr('Agla')}</Button>
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

