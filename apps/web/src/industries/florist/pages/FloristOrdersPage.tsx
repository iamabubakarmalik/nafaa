/**
 * Florist orders and today's deliveries. Every order comes from a counter
 * bill (money is on the bill); here the shop moves it from confirmed to
 * being made, ready, with the rider and delivered, prints the delivery
 * slip with the card message, and sees which slots and areas are busy.
 * Orders are cancelled, never deleted; a voided bill cancels its order.
 */

import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3, CheckCircle2, ChefHat, Download, Gift, GraduationCap, ListChecks, MapPin, PackageCheck, Phone, ShoppingCart, Tag, Truck, XCircle,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, Input, FilterChip, FilterMenu, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { floristOrdersApi, type FloristOrder, type FloristOrderStatus } from '../api/orders.api';
import { BarList, Empty, Info, ListCard, ListLoading, Pager, Pill, actionBtn, primaryBtn } from '../components/ui';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { FLORIST_KEYS, NEXT_STEP, ORDER_STATUS, ORDER_TYPE, SLOT, dayKey, errorText, longDate, shortDate } from '../lib/meta';
import { t as tr } from '@core/i18n';

type Tab = 'today' | 'open' | 'all' | 'analytics';
const LIMIT = 25;
const STATUS_OPTIONS = [{ value: '', label: tr('Sab halat') }, ...Object.entries(ORDER_STATUS).map(([value, s]) => ({ value, label: s.label }))];
const TYPE_OPTIONS = [{ value: '', label: tr('Har tarah') }, ...Object.entries(ORDER_TYPE).map(([value, label]) => ({ value, label }))];

export default function FloristOrdersPage() {
  const { pathname } = useLocation();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const { sales: money } = useMasked();
  const canWork = usePermission(PERMISSIONS.POS_USE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>(pathname.endsWith('/deliveries') ? 'today' : 'open');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [status, setStatus] = useState('');
  const [orderType, setOrderType] = useState('');
  const [period, setPeriod] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<FloristOrder | null>(null);
  const range = resolveRange(period, startHour);
  const today = dayKey();

  const params = {
    search: q || undefined,
    orderType: orderType || undefined,
    status: status || (tab === 'today' || tab === 'open' ? 'OPEN' : undefined),
    scheduledDate: tab === 'today' ? today : undefined,
    from: range?.from, to: range?.to, page, limit: LIMIT,
  };
  const listQ = useQuery({ queryKey: [FLORIST_KEYS.orders, 'paged', params], queryFn: () => floristOrdersApi.paged(params), enabled: tab !== 'analytics', placeholderData: (p) => p });
  const todayQ = useQuery({ queryKey: [FLORIST_KEYS.orders, 'today'], queryFn: () => floristOrdersApi.paged({ status: 'OPEN', scheduledDate: today, limit: 1 }) });
  const openQ = useQuery({ queryKey: [FLORIST_KEYS.orders, 'open-counts'], queryFn: () => floristOrdersApi.paged({ status: 'OPEN', limit: 1 }) });
  const anaQ = useQuery({ queryKey: [FLORIST_KEYS.orders, 'analytics', range], queryFn: () => floristOrdersApi.analytics({ from: range?.from, to: range?.to }), enabled: tab === 'analytics' });
  const data = listQ.data;
  const counts = openQ.data?.counts ?? {};
  const openTotal = openQ.data?.total ?? 0;
  usePageKeys(searchRef, { t: () => setTab('today'), a: () => setTab('analytics') });

  const refresh = () => ['florist-dashboard-overview', FLORIST_KEYS.orders].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const step = useMutation({
    mutationFn: ({ o, to }: { o: FloristOrder; to: FloristOrderStatus }) => floristOrdersApi.updateStatus(o.id, { status: to }),
    onSuccess: (o) => { refresh(); setOpen((x) => (x?.id === o.id ? o : x)); toast.success(`${o.orderNumber}: ${ORDER_STATUS[o.status].label}`); },
    onError: (e) => toast.error(errorText(e, tr('Halat nahi badli'))),
  });
  const deliver = useMutation({
    mutationFn: ({ o, by, to }: { o: FloristOrder; by?: string; to?: string }) => floristOrdersApi.confirmDelivery(o.id, { deliveredBy: by, deliveredToName: to }),
    onSuccess: (o) => { refresh(); setOpen(null); toast.success(tr('{{orderNumber}} pohanch gaya', { orderNumber: o.orderNumber })); },
    onError: (e) => toast.error(errorText(e, tr('Delivery save nahi hui'))),
  });
  const cancel = useMutation({
    mutationFn: (o: FloristOrder) => floristOrdersApi.remove(o.id),
    onSuccess: () => { refresh(); setOpen(null); toast.success(tr('Order cancel — paisa bill par hai, wapas karna ho to bill par Return karein')); },
    onError: (e) => toast.error(errorText(e, tr('Cancel nahi hua'))),
  });

  const rows = data?.items ?? [];
  const exportCsv = () => {
    if (!rows.length) { toast.error(tr('Is filter me koi order nahi')); return; }
    downloadCsv('florist-orders.csv', [
      [tr('Order'), tr('Bill'), tr('Halat'), tr('Tarah'), tr('Customer'), tr('Lene wala'), tr('Phone'), tr('Area'), tr('Pata'), tr('Date'), tr('Waqt'), tr('Total'), tr('Mila'), tr('Card')],
      ...rows.map((o) => [o.orderNumber, o.notes ?? '', ORDER_STATUS[o.status]?.label, ORDER_TYPE[o.orderType], o.customerName, o.recipientName, o.recipientPhone, o.area, o.deliveryAddress,
        o.scheduledDeliveryDate?.slice(0, 10), o.deliveryTimeSlot ? SLOT[o.deliveryTimeSlot] : '', o.totalAmount, o.advancePaid, o.messageCard]),
    ]);
  };
  const printList = (): PrintDoc => ({
    title: tab === 'today' ? 'Aaj ki delivery' : 'Florist orders', subtitle: tab === 'today' ? longDate(today) : undefined,
    meta: [['Orders', String(rows.length)], ['Total', money(data?.totals.value ?? 0)]],
    sections: [{
      kind: 'table', title: 'Orders',
      columns: [{ label: 'Order' }, { label: 'Lene wala' }, { label: 'Area / pata', wideOnly: true }, { label: 'Waqt' }, { label: 'Baqi', align: 'right' }],
      rows: rows.map((o) => [o.orderNumber, `${o.recipientName ?? o.customerName} ${o.recipientPhone ?? ''}`.trim(), [o.area, o.deliveryAddress].filter(Boolean).join(' — '),
        `${shortDate(o.scheduledDeliveryDate)} ${o.deliveryTimeSlot ? SLOT[o.deliveryTimeSlot] : ''}`, money(Math.max(o.totalAmount - o.advancePaid, 0))]),
    }],
  });
  const clear = () => { setSearch(''); setStatus(''); setOrderType(''); setPeriod({ preset: 'all', custom: { from: '', to: '' } }); setPage(1); };
  const filtered = !!(search.trim() || status || orderType || range);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title={tr('Orders aur delivery')} onClose={guide.close}
          steps={[
            { icon: ShoppingCart, color: '#db2777', title: tr('Order kahan se'), text: tr('Counter par bill banate waqt "Delivery / order" bharein — pata, card ka message, din aur waqt. Paisa bill par hota hai, order yahan aata hai.') },
            { icon: ChefHat, color: '#d97706', title: tr('Tayyari'), text: tr('"Banana shuru" → "Tayyar hai" → "Rider ko diya". Aaj tab me sirf aaj ki delivery waqt ke hisaab se.') },
            { icon: Truck, color: '#16a34a', title: tr('Pohanch gaya'), text: tr('Rider wapas aaye to "Pohancha diya" dabayein. Baqi paisa customer ke khate me hai — Khata se wasool karein.') },
            { icon: XCircle, color: '#e11d48', title: tr('Cancel'), text: tr('Order cancel karne se paisa wapas nahi hota — bill par Return karein. Bill void ho to order khud cancel ho jata hai.') },
          ]}
          shortcuts={[['/', 'search'], ['T', 'aaj'], ['A', 'analytics'], ['G', 'guide']]} />
      )}

      <PageHero title={tab === 'today' ? tr('Aaj ki delivery') : tr('Orders aur delivery')} busy={listQ.isFetching && !listQ.isLoading} loading={openQ.isLoading}
        meta={tr('Counter ke bill se bane order — tayyari se delivery tak')}
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />{tr('CSV')}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printList} label={tr('Print')} /></span>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canWork && <Link to="/pos" className={heroPrimaryButton}><ShoppingCart className="h-4 w-4" />{tr('Naya order (counter)')}</Link>}
        </>}
        stats={[
          { label: tr('Aaj ki delivery'), value: String(todayQ.data?.total ?? 0) },
          { label: tr('Chalu orders'), value: String(openTotal) },
          { label: tr('Chalu orders ki value'), value: money(openQ.data?.totals.value ?? 0) },
        ]} />

      <KpiRow cols={5}>
        {openQ.isLoading ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          (['CONFIRMED', 'IN_PREPARATION', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY'] as FloristOrderStatus[]).map((s, i) => (
            <KpiCard key={s} icon={[Tag, ChefHat, PackageCheck, Truck][i]} color={['#0284c7', '#d97706', '#7c3aed', '#4f46e5'][i]} label={ORDER_STATUS[s].label}
              value={counts[s] ?? 0} active={status === s} onClick={() => { setStatus(status === s ? '' : s); setTab('open'); setPage(1); }} />
          )).concat(
            <KpiCard key="baqi" icon={Gift} color="#e11d48" label={tr('Baqi paisa (chalu)')} value={money(Math.max((openQ.data?.totals.value ?? 0) - (openQ.data?.totals.received ?? 0), 0))} hint={tr('Customer ke khate me')} />,
          )
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={tr('Order, bill, naam, phone ya area…')} />}
        chips={filtered ? <>
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          {status && <FilterChip onRemove={() => setStatus('')}>{ORDER_STATUS[status as FloristOrderStatus]?.label}</FilterChip>}
          {orderType && <FilterChip onRemove={() => setOrderType('')}>{ORDER_TYPE[orderType as keyof typeof ORDER_TYPE]}</FilterChip>}
          {range && <FilterChip onRemove={() => setPeriod({ preset: 'all', custom: { from: '', to: '' } })}>{range.from} → {range.to}</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <FilterMenu icon={ListChecks} label={status ? ORDER_STATUS[status as FloristOrderStatus]?.label : tr('Halat')} value={status} active={!!status} options={STATUS_OPTIONS} onChange={(v) => { setStatus(v); setPage(1); }} />
        <FilterMenu icon={Truck} label={orderType ? ORDER_TYPE[orderType as keyof typeof ORDER_TYPE] : tr('Tarah')} value={orderType} active={!!orderType} options={TYPE_OPTIONS} onChange={(v) => { setOrderType(v); setPage(1); }} />
        <DateRangeMenu value={period} onChange={(v) => { setPeriod(v); setPage(1); }} startHour={startHour} label={tr('Bill ki date')} />
      </FilterBar>

      <ViewTabs value={tab} onChange={(t) => { setTab(t); setPage(1); }} hint={tr('Order par click kar ke card, pata aur slip dekhein')}
        tabs={[
          { id: 'today', label: tr('Aaj'), icon: Truck, count: todayQ.data?.total ?? null },
          { id: 'open', label: tr('Chalu'), icon: ChefHat, count: openTotal },
          { id: 'all', label: tr('Sab'), icon: ListChecks },
          { id: 'analytics', label: tr('Analytics'), icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? (
        anaQ.isLoading || !anaQ.data ? <ListLoading /> : (
          <div className="space-y-4">
            <KpiRow cols={4}>
              <KpiCard icon={ListChecks} color="#0284c7" label={tr('Orders')} value={anaQ.data.orders} />
              <KpiCard icon={Gift} color="#db2777" label={tr('Orders ki value')} value={money(anaQ.data.value)} />
              <KpiCard icon={CheckCircle2} color="#16a34a" label={tr('Pohanch gaye')} value={anaQ.data.delivered} />
              <KpiCard icon={Truck} color="#d97706" label={tr('Delivery charges')} value={money(anaQ.data.deliveryCharges)} />
            </KpiRow>
            <div className="grid gap-4 lg:grid-cols-2">
              <BarList title={tr('Kis waqt')} money={money} rows={anaQ.data.bySlot.map((r) => ({ ...r, label: SLOT[r.key as keyof typeof SLOT] ?? tr('Waqt nahi likha') }))} />
              <BarList title={tr('Kahan (area)')} money={money} rows={anaQ.data.byArea} />
              <BarList title={tr('Order ki tarah')} money={money} rows={anaQ.data.byType.map((r) => ({ ...r, label: ORDER_TYPE[r.key as keyof typeof ORDER_TYPE] ?? r.key }))} />
              <BarList title={tr('Din ba din')} money={money} rows={anaQ.data.byDay.map((r) => ({ ...r, label: shortDate(r.key) }))} />
            </div>
          </div>
        )
      ) : (
        <ListCard footer={data && <Pager page={page} total={data.total} limit={LIMIT} onPage={setPage} />}>
          {listQ.isLoading ? <ListLoading /> : rows.length === 0 ? (
            <Empty icon={Truck} title={tab === 'today' ? tr('Aaj koi delivery nahi') : tr('Is filter me koi order nahi')}
              text={tr('Counter par bill banate waqt \'Delivery / order\' bharein — order yahan aa jayega.')}
              action={canWork ? <Link to="/pos" className={primaryBtn}><ShoppingCart className="h-4 w-4" />{tr('Counter kholein')}</Link> : undefined} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((o) => {
                const next = NEXT_STEP[o.status];
                const due = Math.max(o.totalAmount - o.advancePaid, 0);
                return (
                  <li key={o.id} className="grid gap-2 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(0,1.6fr)_11rem_9rem_auto] lg:items-center">
                    <button type="button" onClick={() => setOpen(o)} className="min-w-0 text-start">
                      <p className="truncate font-semibold text-slate-900 hover:underline">{o.recipientName || o.customerName} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{o.orderNumber}</span></p>
                      <p className="truncate text-[0.75rem] text-slate-500">{[ORDER_TYPE[o.orderType], o.area || o.deliveryAddress || o.eventVenue, o.recipientPhone].filter(Boolean).join(' · ')}</p>
                      {o.messageCard && <p className="truncate text-[0.75rem] italic text-pink-700">“{o.messageCard}”</p>}
                    </button>
                    <p className="text-[0.8125rem] text-slate-700">{shortDate(o.scheduledDeliveryDate)}<span className="block text-[0.75rem] text-slate-500">{o.deliveryTimeSlot ? SLOT[o.deliveryTimeSlot] : '—'}{o.scheduledDeliveryTime ? ` · ${o.scheduledDeliveryTime}` : ''}</span></p>
                    <p className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(o.totalAmount)}<span className={cn('block text-[0.75rem] font-medium', due > 0.009 ? 'text-rose-700' : 'text-emerald-700')}>{due > 0.009 ? tr('{{due}} baqi', { due: money(due) }) : tr('Poora mila')}</span></p>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Pill tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Pill>
                      {canWork && next && <button type="button" disabled={step.isPending} onClick={() => step.mutate({ o, to: next.to })} className={actionBtn}>{next.label}</button>}
                      {canWork && (o.status === 'OUT_FOR_DELIVERY' || o.status === 'READY_FOR_DELIVERY') && <button type="button" onClick={() => setOpen(o)} className={primaryBtn}><CheckCircle2 className="h-4 w-4" />{tr('Pohancha diya')}</button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ListCard>
      )}

      {open && <OrderModal order={open} money={money} canWork={canWork} busy={deliver.isPending || cancel.isPending || step.isPending}
        onStep={(to) => step.mutate({ o: open, to })} onDeliver={(by, to) => deliver.mutate({ o: open, by, to })}
        onCancel={() => { if (cancel.isPending) return; cancel.mutate(open); }} onClose={() => setOpen(null)} />}
    </PageShell>
  );
}

function OrderModal({ order: o, money, canWork, busy, onStep, onDeliver, onCancel, onClose }: {
  order: FloristOrder; money: (n: number) => string; canWork: boolean; busy: boolean;
  onStep: (to: FloristOrderStatus) => void; onDeliver: (by?: string, to?: string) => void; onCancel: () => void; onClose: () => void;
}) {
  const [by, setBy] = useState('');
  const [to, setTo] = useState('');
  const [sure, setSure] = useState(false);
  const next = NEXT_STEP[o.status];
  const closed = o.status === 'DELIVERED' || o.status === 'CANCELLED';
  const due = Math.max(o.totalAmount - o.advancePaid, 0);
  const slip = (): PrintDoc => ({
    title: `Delivery ${o.orderNumber}`, subtitle: `${longDate(o.scheduledDeliveryDate)} · ${o.deliveryTimeSlot ? SLOT[o.deliveryTimeSlot] : ''}`,
    meta: [['Bill', o.notes ?? '—'], ['Baqi lena hai', due > 0.009 ? money(due) : 'Kuch nahi']],
    sections: [
      { kind: 'rows', title: 'Kis ko', rows: [
        { label: 'Naam', value: o.recipientName || o.customerName }, { label: 'Phone', value: o.recipientPhone || o.customerPhone || '—' },
        { label: 'Pata', value: [o.deliveryAddress, o.area, o.landmark].filter(Boolean).join(', ') || o.eventVenue || '—' },
      ] },
      { kind: 'table', title: 'Saman', columns: [{ label: 'Cheez' }, { label: 'Qty', align: 'right' }], rows: (o.items ?? []).map((i) => [i.productName, String(i.quantity)]) },
      ...(o.messageCard ? [{ kind: 'text' as const, title: 'Card', text: `${o.messageCard}${o.isAnonymous ? '' : o.senderName ? `\n— ${o.senderName}` : ''}` }] : []),
      ...(o.specialInstructions ? [{ kind: 'text' as const, title: 'Hidayat', text: o.specialInstructions }] : []),
    ],
  });
  return (
    <Modal open onClose={onClose} size="lg" title={`${o.orderNumber} · ${ORDER_STATUS[o.status].label}`} description={`${ORDER_TYPE[o.orderType]} · ${o.notes ?? 'bill nahi juda'}`}
      footer={<div className="flex w-full flex-wrap items-center gap-2">
        <PrintButton doc={slip} label={tr('Delivery slip')} size="sm" />
        {canWork && !closed && (sure
          ? <Button variant="danger" size="sm" loading={busy} onClick={onCancel}>{tr('Haan, cancel')}</Button>
          : <Button variant="secondary" size="sm" onClick={() => setSure(true)}><XCircle className="h-4 w-4" />{tr('Cancel')}</Button>)}
        <span className="flex-1" />
        {canWork && next && <Button variant="secondary" loading={busy} onClick={() => onStep(next.to)}>{next.label}</Button>}
        {canWork && !closed && o.status !== 'DRAFT' && <Button loading={busy} onClick={() => onDeliver(by.trim() || undefined, to.trim() || undefined)}><CheckCircle2 className="h-4 w-4" />{tr('Pohancha diya')}</Button>}
      </div>}>
      <div className="space-y-4 text-[0.875rem]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Info icon={MapPin} title={tr('Kis ko, kahan')}>
            <p className="font-semibold text-slate-900">{o.recipientName || o.customerName}</p>
            {o.recipientPhone && <a href={`tel:${o.recipientPhone}`} className="inline-flex items-center gap-1 text-brand-700 hover:underline"><Phone className="h-3.5 w-3.5" />{o.recipientPhone}</a>}
            <p className="text-slate-600">{[o.deliveryAddress, o.area, o.landmark].filter(Boolean).join(', ') || o.eventVenue || '—'}</p>
          </Info>
          <Info icon={Truck} title={tr('Kab')}>
            <p className="font-semibold text-slate-900">{longDate(o.scheduledDeliveryDate)}</p>
            <p className="text-slate-600">{o.deliveryTimeSlot ? SLOT[o.deliveryTimeSlot] : '—'}{o.scheduledDeliveryTime ? ` · ${o.scheduledDeliveryTime}` : ''}</p>
            {o.actualDeliveryTime && <p className="text-emerald-700">{tr('Pohancha: {{value}}{{value2}}', { value: new Date(o.actualDeliveryTime).toLocaleString('en-PK'), value2: o.deliveredBy ? ` · ${o.deliveredBy}` : '' })}</p>}
          </Info>
        </div>
        {o.messageCard && (
          <div className="rounded-2xl bg-pink-50 px-4 py-3 ring-1 ring-pink-200">
            <p className="text-[0.75rem] font-semibold text-pink-700">{tr('Card ka message')}</p>
            <p className="mt-1 whitespace-pre-line text-pink-900">{o.messageCard}</p>
            <p className="mt-1 text-[0.75rem] text-pink-700">{o.isAnonymous ? tr('Bhejne wale ka naam nahi likhna') : o.senderName ? `— ${o.senderName}` : ''}</p>
          </div>
        )}
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <ul className="divide-y divide-slate-100">
            {(o.items ?? []).map((i, n) => <li key={n} className="flex justify-between gap-2 px-4 py-2"><span>{i.productName} × {i.quantity}</span><span className="tabular-nums">{money(i.total)}</span></li>)}
            {o.deliveryCharge > 0 && <li className="flex justify-between px-4 py-2 text-slate-600"><span>{tr('Delivery')}</span><span className="tabular-nums">{money(o.deliveryCharge)}</span></li>}
            {o.discountAmount > 0 && <li className="flex justify-between px-4 py-2 text-slate-600"><span>{tr('Discount')}</span><span className="tabular-nums">−{money(o.discountAmount)}</span></li>}
            <li className="flex justify-between bg-slate-50 px-4 py-2 font-semibold"><span>{tr('Total · mila {{advancePaid}}', { advancePaid: money(o.advancePaid) })}</span><span className="tabular-nums">{money(o.totalAmount)}</span></li>
          </ul>
        </div>
        {due > 0.009 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">{tr('{{due}} baqi customer ke khate me hai — delivery par mile to Khata se jama karein.', { due: money(due) })}</p>}
        {o.specialInstructions && <p className="text-slate-600"><span className="font-semibold">{tr('Hidayat:')}</span> {o.specialInstructions}</p>}
        {canWork && !closed && o.status !== 'DRAFT' && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Input label={tr('Rider (marzi)')} value={by} onChange={(e) => setBy(e.target.value)} hint={tr('Kis ne pohanchaya')} />
            <Input label={tr('Kis ne liya (marzi)')} value={to} onChange={(e) => setTo(e.target.value)} hint={tr('Ghar par kis ne phool liye')} />
          </div>
        )}
      </div>
    </Modal>
  );
}
