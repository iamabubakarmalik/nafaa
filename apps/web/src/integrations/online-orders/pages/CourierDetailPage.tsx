import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, CheckCircle2, ExternalLink, KeyRound, PenLine, Printer, RefreshCw, Search, Truck, Unplug, Zap,
} from 'lucide-react';
import { apiErrorMessage, couriersApi, type CourierAccount, type CourierShipment } from '../api/online-orders.api';
import { COURIERS_KEY, ConnectForm, CourierLogo, CourierSettingsForm } from '../components/couriers/CourierForms';
import { STATUS_LABEL, rs, timeAgo, whenText } from '../lib/labels';
import { Badge, Banner, Btn, Card, EmptyState, Page, Stat, Tabs, Toggle, inputCls } from '../components/ui/kit';
import { cn } from '@core/lib/cn';

/* ═════════════════════════════════════════════════════════════
   EK COURIER KA SAFHA — Overview · Book karein · Parcels ·
   Settings · Connection. Manual courier: sirf Overview + Parcels.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'overview' | 'book' | 'parcels' | 'settings' | 'connection';

const COURIER_STATE: Record<string, { label: string; tone: 'success' | 'warning' | 'critical' | 'info' | 'neutral' | 'attention' }> = {
  BOOKING: { label: 'Book ho raha', tone: 'neutral' },
  BOOKED: { label: 'Pickup ka intezar', tone: 'info' },
  PICKED_UP: { label: 'Courier le gaya', tone: 'info' },
  IN_TRANSIT: { label: 'Raste me', tone: 'attention' },
  OUT_FOR_DELIVERY: { label: 'Aaj deliver', tone: 'attention' },
  ATTEMPTED: { label: 'Customer nahi mila', tone: 'warning' },
  DELIVERED: { label: 'Deliver', tone: 'success' },
  RETURNING: { label: 'Wapas aa raha', tone: 'critical' },
  RETURNED: { label: 'Wapas (RTO)', tone: 'critical' },
  CANCELLED: { label: 'Booking cancel', tone: 'neutral' },
  UNKNOWN: { label: '—', tone: 'neutral' },
};

export default function CourierDetailPage() {
  const { code: raw = '' } = useParams();
  const code = raw.toUpperCase();
  const [params, setParams] = useSearchParams();
  const { data, isLoading, error } = useQuery({ queryKey: COURIERS_KEY, queryFn: couriersApi.list, refetchInterval: 60_000 });
  const c = data?.find((x) => x.code === code);

  const isApi = c?.mode === 'api';
  const tabs: { value: Tab; label: string; count?: number }[] = c
    ? isApi && c.connected
      ? [
          { value: 'overview', label: 'Overview' },
          { value: 'book', label: 'Book karein' },
          { value: 'parcels', label: 'Parcels', count: c.stats.active || undefined },
          { value: 'settings', label: 'Settings' },
          { value: 'connection', label: 'Connection' },
        ]
      : isApi
        ? [{ value: 'connection', label: 'Jorein' }, { value: 'parcels', label: 'Parcels' }]
        : [{ value: 'overview', label: 'Overview' }, { value: 'parcels', label: 'Parcels' }]
    : [];
  const want = params.get('tab') as Tab | null;
  const tab: Tab = want && tabs.some((t) => t.value === want) ? want : tabs[0]?.value ?? 'overview';
  const setTab = (t: Tab) => setParams((p) => { p.set('tab', t); return p; }, { replace: true });

  if (isLoading) return <Page back={{ to: '/online-store/couriers', label: 'Couriers' }} title="…"><div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" /></Page>;
  if (error || !c) {
    return (
      <Page back={{ to: '/online-store/couriers', label: 'Couriers' }} title="Courier nahi mila">
        <Card><EmptyState title="Ye courier list me nahi">{error ? apiErrorMessage(error) : <Link to="/online-store/couriers" className="underline">Sab couriers dekhein</Link>}</EmptyState></Card>
      </Page>
    );
  }

  return (
    <Page
      back={{ to: '/online-store/couriers', label: 'Couriers' }}
      icon={<CourierLogo c={c} size={44} />}
      title={c.name}
      badge={c.connected
        ? c.lastError ? <Badge tone="critical" dot>Masla</Badge> : <Badge tone={c.active ? 'success' : 'neutral'} dot>{c.active ? 'Jura hua' : 'Band'}</Badge>
        : isApi ? <Badge tone="info">Ek click connect</Badge> : <Badge>Manual</Badge>}
      subtitle={c.connected
        ? `Key ${c.maskedKey ?? ''}${c.lastSyncAt ? ` · aakhri sync ${timeAgo(c.lastSyncAt)}` : ''}`
        : isApi ? 'API key paste karein — booking, label, tracking aur RTO sab khud' : 'CN khud likhein — Nafaa tracking link, COD hisaab aur RTO sambhalta hai'}
      actions={<HeaderActions c={c} />}
      tabs={<Tabs value={tab} onChange={setTab} items={tabs} />}
    >
      {c.connected && c.lastError && (
        <Banner tone="critical" title={`${c.name} se rabta nahi ho raha`} icon={<AlertTriangle className="h-4 w-4" />}
          action={<Btn size="sm" onClick={() => setTab('connection')}>Key check karein</Btn>}>
          {c.lastError}
        </Banner>
      )}
      {c.connected && c.missingSettings.length > 0 && tab !== 'settings' && (
        <Banner tone="warning" title="Booking se pehle settings poori karein" action={<Btn size="sm" onClick={() => setTab('settings')}>Settings</Btn>}>
          Khali hain: {c.missingSettings.join(', ')}
        </Banner>
      )}
      {tab === 'overview' && <Overview c={c} onTab={setTab} />}
      {tab === 'book' && <BookTab c={c} />}
      {tab === 'parcels' && <ParcelsTab c={c} />}
      {tab === 'settings' && <Card title="Booking settings" description="Har nayi booking par yahi lagengi — booking ke waqt badal bhi sakte hain."><CourierSettingsForm c={c} /></Card>}
      {tab === 'connection' && <ConnectionTab c={c} onConnected={() => setTab('overview')} />}
    </Page>
  );
}

function HeaderActions({ c }: { c: CourierAccount }) {
  const qc = useQueryClient();
  const sync = useMutation({
    mutationFn: () => couriersApi.sync(c.code),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: COURIERS_KEY });
      qc.invalidateQueries({ queryKey: ['courier-shipments', c.code] });
      r.lastError ? toast.error(r.lastError) : toast.success('Sab parcels ka taaza status aa gaya');
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
      {c.site && <a href={c.site} target="_blank" rel="noreferrer"><Btn variant="plain" icon={<ExternalLink className="h-4 w-4" />}>Website</Btn></a>}
      {c.connected && (
        <>
          <Btn loading={sync.isPending} onClick={() => sync.mutate()} icon={<RefreshCw className="h-4 w-4" />}>Abhi sync</Btn>
          <span className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300">
            <Toggle checked={c.active} onChange={(v) => setActive.mutate(v)} disabled={setActive.isPending} /> Chalu
          </span>
        </>
      )}
    </>
  );
}

function Overview({ c, onTab }: { c: CourierAccount; onTab: (t: Tab) => void }) {
  const s = c.stats;
  const isApi = c.mode === 'api';
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Raste me" value={s.active} hint={s.awaitingPickup ? `${s.awaitingPickup} pickup ka intezar` : 'abhi'} />
        <Stat label="Deliver (30 din)" value={s.delivered30} hint={`${s.dispatched30} bheje`} />
        <Stat label="RTO (30 din)" value={`${s.rtoRate}%`} hint={`${s.returned30} wapas`} tone={s.rtoRate >= 20 ? 'attention' : undefined} />
        <Stat label="Courier ke paas (COD)" value={rs(s.codPendingValue)} hint={`${s.codPending} parcel`} tone={s.codPendingValue > 0 ? 'attention' : undefined} />
      </div>

      {s.attempted > 0 && (
        <Banner tone="warning" title={`${s.attempted} parcel — customer nahi mila`} action={<Btn size="sm" onClick={() => onTab('parcels')}>Dekhein</Btn>}>
          Customer ko call ya WhatsApp karein — warna parcel wapas (RTO) aa jayega.
        </Banner>
      )}

      {isApi ? (
        <Card title="Kya kya khud hota hai">
          <ul className="grid gap-2 text-[13px] text-slate-700 dark:text-slate-200 sm:grid-cols-2">
            <Li>Order par &quot;{c.name} par book&quot; — CN khud</Li>
            {c.connect?.features.label
              ? <Li>{c.connect?.labelKind === 'pdf' ? 'Label PDF' : 'Label link'} ek click me print</Li>
              : <Li>Label {c.name} portal se (CN Nafaa me khud aata hai)</Li>}
            <Li>Courier utha le → order &quot;Raste me&quot;</Li>
            <Li>Deliver → &quot;Courier ke paas&quot; (COD)</Li>
            <Li>Wapas (RTO) → bill void, stock wapas</Li>
            {c.connect?.features.settlement
              ? <Li>COD ka paisa aaya → khud &quot;Paisa mil gaya&quot;</Li>
              : <Li>COD settlement: COD safhe par chun kar &quot;mil gaya&quot;</Li>}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn variant="primary" onClick={() => onTab('book')} icon={<Zap className="h-4 w-4" />}>Orders book karein</Btn>
            <Link to="/online-orders/cod"><Btn>COD hisaab</Btn></Link>
          </div>
        </Card>
      ) : (
        <Card title={`${c.name} kaise chalayein`}>
          <ol className="space-y-2 text-[13px] text-slate-700 dark:text-slate-200">
            <li>1. {c.name} ke portal par parcel book karein, CN lein</li>
            <li>2. Nafaa me order kholein → &quot;Rider/courier ko de diya&quot; → {c.name} chunein, CN daalein</li>
            <li>3. Deliver ho to &quot;Deliver ho gaya&quot;, wapas aaye to &quot;Wapas aaya (RTO)&quot; — stock khud wapas</li>
            <li>4. {c.name} paisa jama karwaye → COD safhe par chun kar &quot;Paisa mil gaya&quot;</li>
          </ol>
          <p className="mt-3 text-[12.5px] text-slate-500">{c.name} ka merchant API account hai? Hamein batayein — isay bhi ek click wala bana denge.</p>
        </Card>
      )}
    </>
  );
}

const Li = ({ children }: { children: React.ReactNode }) => (
  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{children}</span></li>
);

/** Accept ho chuke orders — chuno aur ek saath book karo */
function BookTab({ c }: { c: CourierAccount }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
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
      if (r.booked) toast.success(`${r.booked} order ${c.name} par book ✓`, { description: 'Parcels tab se label print karein' });
      if (r.failed) toast.error(`${r.failed} order book nahi hue — wajah neeche likhi hai`);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <Card flush title="Book hone ke liye tayyar" description="Accept ho chuke orders jo abhi kisi courier ko nahi diye. Chunein → ek click me sab book — shehar khud milta hai.">
      {picked.size > 0 && (
        <div className="mx-4 mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-white sm:mx-5">
          <span className="text-[13px] font-semibold">{picked.size} chune</span>
          <input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" min="0.01" step="0.1"
            placeholder={`Wazan (default ${c.settings?.defaultWeightKg ?? 0.5} kg)`}
            className="h-8 w-44 rounded-md border border-white/20 bg-white/10 px-2.5 text-[12.5px] text-white placeholder:text-white/50 outline-none" />
          <span className="flex-1" />
          <Btn size="sm" variant="plain" className="text-white hover:bg-white/10" onClick={() => setPicked(new Set())}>Chhoro</Btn>
          <Btn size="sm" variant="success" loading={bulk.isPending} onClick={() => bulk.mutate()} icon={<Zap className="h-3.5 w-3.5" />}>{c.name} par book</Btn>
        </div>
      )}
      <div className="border-t border-slate-100 dark:border-slate-800">
        {isLoading ? (
          <div className="p-5"><div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></div>
        ) : error ? (
          <EmptyState title="List nahi khuli">{apiErrorMessage(error)}</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="Sab bhej diye">Koi accept hua order courier ka intezar nahi kar raha.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            <li className="flex items-center gap-3 bg-slate-50 px-4 py-2 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/40 sm:px-5">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" aria-label="Sab chuno"
                checked={rows.every((r) => picked.has(r.id))}
                onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
              <span className="w-20">Order</span>
              <span className="flex-1">Customer · shehar</span>
              <span className="hidden w-16 text-right sm:block">Pieces</span>
              <span className="w-24 text-right">COD</span>
            </li>
            {rows.map((o) => (
              <li key={o.id}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 sm:px-5">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={picked.has(o.id)} onChange={() => toggle(o.id)} />
                  <button type="button" onClick={(e) => { e.preventDefault(); navigate(`/online-orders?order=${o.id}`); }}
                    className="w-20 text-left text-[13px] font-semibold text-slate-900 hover:underline dark:text-white">
                    #{o.externalOrderNumber ?? o.externalOrderId}
                  </button>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-slate-700 dark:text-slate-200">{o.customerName}{o.customerCity ? ` · ${o.customerCity}` : ' · shehar nahi likha'}</span>
                    {failed[o.id] && <span className="block text-[12px] font-medium text-rose-600">{failed[o.id]}</span>}
                  </span>
                  <span className="hidden w-16 text-right text-[13px] tabular-nums text-slate-600 sm:block">{o.pieces || 1}</span>
                  <span className="w-24 text-right text-[13px] font-semibold tabular-nums text-slate-900 dark:text-white">{o.paymentStatus === 'PAID' ? 'Paid' : rs(o.total)}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

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

function ParcelsTab({ c }: { c: CourierAccount }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('active');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['courier-shipments', c.code, filter, q, page],
    queryFn: () => couriersApi.shipments(c.code, { filter, search: q.trim() || undefined, limit, offset: page * limit }),
    placeholderData: (prev) => prev,
  });
  const rows = data?.rows ?? [];
  const pages = Math.ceil((data?.total ?? 0) / limit);

  return (
    <Card flush>
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4 sm:px-5">
        <div className="flex flex-wrap gap-1">
          {PARCEL_FILTERS.map((f) => (
            <button key={f.value} onClick={() => { setFilter(f.value); setPage(0); }}
              className={cn('rounded-md px-2.5 py-1 text-[12.5px] font-medium',
                filter === f.value ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="CN, order #, customer, phone…" className={cn(inputCls, 'pl-8')} />
        </div>
      </div>
      <div className={cn('mt-3 border-t border-slate-100 dark:border-slate-800', isFetching && 'opacity-70')}>
        {isLoading ? (
          <div className="p-5"><div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></div>
        ) : error ? (
          <EmptyState title="Parcels nahi khule">{apiErrorMessage(error)}</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Truck className="h-5 w-5" />} title="Yahan koi parcel nahi">{q ? 'Is talaash se kuch nahi mila.' : 'Is filter me abhi kuch nahi.'}</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead className="bg-slate-50 text-left text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/40">
                <tr>
                  <th className="px-4 py-2 sm:px-5">Order</th>
                  <th className="px-3 py-2">CN</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Courier status</th>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2 text-right">Raqam</th>
                  <th className="px-4 py-2 sm:px-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((o) => <ParcelRow key={o.id} o={o} c={c} onOpen={() => navigate(`/online-orders?order=${o.id}`)} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[12.5px] text-slate-500 dark:border-slate-800 sm:px-5">
          <span>{data?.total} parcels</span>
          <div className="flex gap-1">
            <Btn size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Pichhe</Btn>
            <Btn size="sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Aage</Btn>
          </div>
        </div>
      )}
    </Card>
  );
}

function ParcelRow({ o, c, onOpen }: { o: CourierShipment; c: CourierAccount; onOpen: () => void }) {
  const st = o.courierStatus ? COURIER_STATE[o.courierStatus] ?? COURIER_STATE.UNKNOWN : null;
  const ord = STATUS_LABEL[o.orderStatus];
  const label = useMutation({
    mutationFn: () => couriersApi.openLabel(o.id),
    onError: (e) => toast.error(apiErrorMessage(e, 'Label nahi khula')),
  });
  const copy = () => o.trackingNumber && navigator.clipboard?.writeText(o.trackingNumber).then(() => toast.success('CN copy ho gaya'));
  const waitingDays = o.courierStatus === 'BOOKED' && o.courierBookedAt ? Math.floor((Date.now() - new Date(o.courierBookedAt).getTime()) / 86_400_000) : 0;
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
      <td className="px-4 py-2.5 sm:px-5">
        <button onClick={onOpen} className="font-semibold text-slate-900 hover:underline dark:text-white">#{o.externalOrderNumber ?? o.externalOrderId}</button>
        <div className="text-[11.5px] text-slate-400">{whenText(o.courierBookedAt ?? o.dispatchedAt)}</div>
      </td>
      <td className="px-3 py-2.5">
        <button onClick={copy} className="font-mono text-[12.5px] text-slate-700 hover:underline dark:text-slate-200">{o.trackingNumber ?? '—'}</button>
        {!o.viaApi && <div className="text-[11px] text-slate-400"><PenLine className="mr-0.5 inline h-3 w-3" />manual</div>}
      </td>
      <td className="px-3 py-2.5">
        <div className="max-w-[180px] truncate text-slate-800 dark:text-slate-100">{o.customerName}</div>
        <div className="text-[11.5px] text-slate-500">{o.customerCity ?? '—'}</div>
      </td>
      <td className="px-3 py-2.5">
        {st ? <Badge tone={st.tone}>{st.label}</Badge> : <span className="text-slate-400">—</span>}
        {o.courierLabel && <div className="mt-0.5 max-w-[180px] truncate text-[11px] text-slate-400" title={o.courierLabel}>{o.courierLabel}</div>}
        {waitingDays >= 2 && <div className="mt-0.5 text-[11px] font-medium text-amber-600">{waitingDays} din se pickup nahi hua</div>}
      </td>
      <td className="px-3 py-2.5"><span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-semibold', ord?.tone)}>{ord?.short ?? o.orderStatus}</span></td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        <div className="font-semibold text-slate-900 dark:text-white">{rs(o.total)}</div>
        <div className="text-[11px] text-slate-400">{o.paymentStatus === 'PAID' ? 'mil gaya' : o.paymentStatus === 'COLLECTED' ? 'courier ke paas' : o.paymentStatus === 'NOT_COLLECTED' ? 'nahi aayega' : 'COD'}</div>
      </td>
      <td className="px-4 py-2.5 text-right sm:px-5">
        {o.viaApi && c.connected && c.connect?.features.label && o.orderStatus !== 'RETURNED' && (
          <Btn size="sm" variant="plain" loading={label.isPending} onClick={() => label.mutate()} icon={<Printer className="h-3.5 w-3.5" />}>Label</Btn>
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
    <>
      {c.connected && (
        <Card title="Connection" description={`${since ? `Jura: ${since}` : ''}${c.lastTestedAt ? ` · aakhri check ${timeAgo(c.lastTestedAt)}` : ''}`}>
          <div className="flex flex-wrap items-center gap-3">
            <KeyRound className="h-4 w-4 text-slate-400" />
            <span className="font-mono text-[13px] text-slate-700 dark:text-slate-200">{c.maskedKey}</span>
            <span className="flex-1" />
            <Btn size="sm" loading={test.isPending} icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => test.mutate()}>Check karein</Btn>
            <Btn size="sm" variant="plain" icon={<KeyRound className="h-3.5 w-3.5" />} onClick={() => setReplace((v) => !v)}>{replace ? 'Rehne dein' : 'Nayi key'}</Btn>
            <Btn size="sm" variant="plain" className="text-rose-600" loading={disconnect.isPending} icon={<Unplug className="h-3.5 w-3.5" />}
              onClick={() => { if (window.confirm(`${c.name} hatayein? Book parcels ki tracking ruk jayegi (orders waise hi rahenge).`)) disconnect.mutate(); }}>
              Hatayein
            </Btn>
          </div>
        </Card>
      )}
      {replace && (
        <Card title={c.connected ? 'Nayi key lagayein' : `${c.name} jorein`} description="Nafaa key ko usi waqt courier se check karta hai — ghalat key save nahi hoti.">
          <ConnectForm c={c} onDone={() => { setReplace(false); if (!c.connected) onConnected(); }} />
        </Card>
      )}
    </>
  );
}
