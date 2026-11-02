/**
 * Orders by weight: a family's Eid order, a restaurant's daily chicken, a
 * home delivery. Views by step (open, today, ready, on the way, done) with
 * search and dates; each row moves the order on, takes the weighed kg, an
 * advance, the bill at hand-over (split payment, rest on khata), cancel and
 * advance refund, and prints a cutting slip. Analytics tab sums the open book.
 *
 * Keys: N new order · / search · 1 orders · 2 analytics · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowRight, BarChart3, Ban, CalendarClock, CheckCircle2, ClipboardList, FileSpreadsheet, GraduationCap, Package, Pencil, Plus,
  Receipt, Scale, Scissors, Truck, Undo2, Wallet,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { weightOrdersApi, type OrderStatus, type OrderTab, type WeightOrder } from '../api/weight-orders.api';
import { CancelModal, CheckoutModal, PayModal, RefundModal } from '../components/money';
import { ListFrame, Pager, Pill, usePageKeys, type Tone } from '../components/ui';
import { KEYS, MONEY_KEYS, apiError, dateTime, decimal, kg } from '../lib/meta';
import { t as tr } from '@core/i18n';

type View = 'orders' | 'analytics';

const TABS: Array<{ id: OrderTab; label: string }> = [
  { id: 'open', label: tr('Chal rahe') }, { id: 'today', label: tr('Aaj dene') }, { id: 'ready', label: tr('Tayyar') },
  { id: 'delivery', label: tr('Delivery') }, { id: 'delivered', label: tr('De diye') }, { id: 'cancelled', label: tr('Cancel') }, { id: 'all', label: tr('Sab') },
];
const tabLabel = (t: OrderTab) => TABS.find((x) => x.id === t)?.label ?? t;

const STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: tr('Kaccha'), tone: 'slate' }, CONFIRMED: { label: tr('Pakka'), tone: 'sky' }, PROCESSING: { label: tr('Tayyari'), tone: 'violet' },
  CUTTING: { label: tr('Cutting'), tone: 'violet' }, PACKED: { label: tr('Pack'), tone: 'amber' }, READY: { label: tr('Tayyar'), tone: 'emerald' },
  OUT_FOR_DELIVERY: { label: tr('Raste me'), tone: 'amber' }, DELIVERED: { label: tr('De diya'), tone: 'emerald' }, CANCELLED: { label: tr('Cancel'), tone: 'rose' },
};

/** The next work step of an open order. */
function nextStep(o: WeightOrder): { status: OrderStatus; label: string } | null {
  switch (o.status) {
    case 'DRAFT': return { status: 'CONFIRMED', label: tr('Pakka karein') };
    case 'CONFIRMED': case 'PROCESSING': return { status: 'CUTTING', label: tr('Cutting shuru') };
    case 'CUTTING': return { status: 'PACKED', label: tr('Pack ho gaya') };
    case 'PACKED': return { status: 'READY', label: tr('Tayyar') };
    case 'READY': return o.isDelivery ? { status: 'OUT_FOR_DELIVERY', label: tr('Rider ko diya') } : null;
    default: return null;
  }
}

const isOpen = (o: WeightOrder) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED';
const isLate = (o: WeightOrder) => isOpen(o) && !!o.neededBy && new Date(o.neededBy).getTime() < Date.now() - 3_600_000;

function slip(o: WeightOrder, money: boolean): PrintDoc {
  return {
    title: `Order ${o.orderNumber}`,
    subtitle: [o.customerName, o.customerPhone].filter(Boolean).join(' · '),
    meta: [
      ['Kab', dateTime(o.neededBy)],
      ...(o.isDelivery ? [['Pata', o.deliveryAddress ?? '—'] as [string, string]] : []),
      ...(o.cuttingStyle ? [['Cutting', o.cuttingStyle] as [string, string]] : []),
      ...(money ? [['Kul', formatPKR(o.total)] as [string, string], ['Advance', formatPKR(o.paidAmount)] as [string, string], ['Baqi', formatPKR(Math.max(o.total - o.paidAmount, 0))] as [string, string]] : []),
    ],
    sections: [
      { kind: 'table', columns: [{ label: 'Item' }, { label: 'Kg', align: 'right' }, ...(money ? [{ label: 'Rate', align: 'right' as const }, { label: 'Kul', align: 'right' as const }] : []), { label: 'Hidayat' }],
        rows: o.items.map((i) => [i.productName, String(i.actualKg ?? i.requestedKg), ...(money ? [formatPKR(i.pricePerKg), formatPKR(i.total)] : []), i.cuttingInstructions ?? '']) },
      ...(o.specialInstructions ? [{ kind: 'text' as const, title: 'Note', text: o.specialInstructions }] : []),
    ],
  };
}

function WeighModal({ o, onClose, onDone }: { o: WeightOrder; onClose: () => void; onDone: () => void }) {
  const [kgs, setKgs] = useState<Record<string, string>>(() => Object.fromEntries(o.items.map((i) => [i.id!, String(i.actualKg ?? i.requestedKg)])));
  const total = o.items.reduce((s, i) => s + (Number(kgs[i.id!]) || 0) * i.pricePerKg, 0) + o.deliveryCharges - o.discount;
  const save = useMutation({
    mutationFn: () => weightOrdersApi.updateActualWeights(o.id, o.items.map((i) => ({ itemId: i.id!, actualKg: Number(kgs[i.id!]) || 0 }))),
    onSuccess: () => { toast.success(tr('Wazan likh diya')); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, tr('Wazan save nahi hua'))),
  });
  return (
    <Modal open onClose={onClose} size="md" title={tr('Asal wazan likhein')} description={tr('{{orderNumber}} · scale par jitna aaya', { orderNumber: o.orderNumber })}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button>
        <Button loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Scale className="h-4 w-4" />}>{tr('Save · {{total}}', { total: formatPKR(total) })}</Button>
      </>}>
      <ul className="divide-y divide-slate-100">
        {o.items.map((i, idx) => (
          <li key={i.id} className="flex items-center gap-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.875rem] font-medium text-slate-900">{i.productName}</span>
              <span className="text-[0.75rem] text-slate-500">{tr('Maanga {{requestedKg}} · {{pricePerKg}}/kg', { requestedKg: kg(i.requestedKg), pricePerKg: formatPKR(i.pricePerKg) })}</span>
            </span>
            <Input data-autofocus={idx === 0 ? true : undefined} inputMode="decimal" aria-label={tr('{{productName}} kg', { productName: i.productName })} value={kgs[i.id!]} onChange={(e) => setKgs((k) => ({ ...k, [i.id!]: decimal(e.target.value) }))} className="w-28 text-end font-semibold tabular-nums" />
          </li>
        ))}
      </ul>
    </Modal>
  );
}

type Dialog = { kind: 'pay' | 'weigh' | 'bill' | 'cancel' | 'refund'; o: WeightOrder } | null;

export default function WeightOrdersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const startHour = useBusinessDayStart();
  const guide = usePageGuide();
  const { sales } = useMasked();
  const canPos = usePermission(PERMISSIONS.POS_USE);
  const canRefund = usePermission(PERMISSIONS.RETURNS_CREATE);
  const searchRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<View>('orders');
  const [tab, setTab] = useState<OrderTab>(() => (TABS.some((t) => t.id === params.get('tab')) ? (params.get('tab') as OrderTab) : 'open'));
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [tab, range, query]);

  // A link from a bill (?open=id) shows that order.
  useEffect(() => {
    const id = params.get('open');
    if (!id) return;
    weightOrdersApi.getOne(id).then((o) => { setTab('all'); setSearch(o.orderNumber); }).catch(() => toast.error(tr('Order nahi mila')));
    params.delete('open'); setParams(params, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const period = resolveRange(range, startHour);
  const q = { tab, page, limit: 25, search: query || undefined, ...(period ?? {}) };
  const listQ = useQuery({ queryKey: [KEYS.orders, 'page', q], queryFn: () => weightOrdersApi.page(q), placeholderData: (p) => p, refetchInterval: 60_000 });
  const openQ = useQuery({ queryKey: [KEYS.orders, 'page', 'analytics'], queryFn: () => weightOrdersApi.page({ tab: 'open', limit: 100 }), enabled: view === 'analytics' });
  const data = listQ.data;
  const rows = data?.items ?? [];
  const counts = data?.counts;
  const filtered = !!query || range.preset !== 'all';
  const clear = () => { setSearch(''); setRange({ preset: 'all', custom: { from: '', to: '' } }); };
  const refresh = () => [KEYS.orders, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const step = useMutation({
    mutationFn: ({ o, status }: { o: WeightOrder; status: OrderStatus }) => weightOrdersApi.updateStatus(o.id, status),
    onSuccess: (o) => { toast.success(`${o.orderNumber}: ${STATUS[o.status].label}`); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Halat nahi badli'))),
  });

  usePageKeys({ n: canPos ? () => navigate('/meat/weight-orders/new') : undefined, '1': () => setView('orders'), '2': () => setView('analytics'), g: guide.open }, searchRef);

  const printList = async (): Promise<PrintDoc> => {
    const all = await weightOrdersApi.page({ ...q, page: 1, limit: 100 });
    return {
      title: `Wazan wale order — ${tabLabel(tab)}`,
      subtitle: period ? rangeLabel(period.from, period.to) : 'Sab tareekhen',
      meta: [['Orders', String(all.total)], ['Chalte orders ki value', formatPKR(all.openValue)], ['Advance mila', formatPKR(all.advances)]],
      sections: [{ kind: 'table', columns: [{ label: 'Order' }, { label: 'Customer' }, { label: 'Kab' }, { label: 'Items', wideOnly: true }, { label: 'Halat' }, { label: 'Kul', align: 'right' }, { label: 'Baqi', align: 'right' }],
        rows: all.items.map((o) => [o.orderNumber, `${o.customerName ?? ''} ${o.customerPhone ?? ''}`, dateTime(o.neededBy), o.items.map((i) => `${i.productName} ${i.actualKg ?? i.requestedKg}kg`).join(', '), STATUS[o.status].label, formatPKR(o.total), formatPKR(Math.max(o.total - o.paidAmount, 0))]) }],
    };
  };

  const analytics = useMemo(() => {
    const list = openQ.data?.items ?? [];
    const byItem = new Map<string, { kg: number; value: number }>();
    for (const o of list) for (const i of o.items) {
      const r = byItem.get(i.productName) ?? { kg: 0, value: 0 };
      r.kg += i.actualKg ?? i.requestedKg; r.value += i.total;
      byItem.set(i.productName, r);
    }
    return {
      items: [...byItem.entries()].sort((a, b) => b[1].kg - a[1].kg),
      late: list.filter(isLate).length,
      delivery: list.filter((o) => o.isDelivery).length,
      noAdvance: list.filter((o) => o.paidAmount <= 0).length,
      count: list.length,
    };
  }, [openQ.data]);

  return (
    <PageShell>
      <PageHero
        title={tr('Wazan wale order')}
        chip={<><Package /> {' '}{tr('Order, delivery, restaurant')}</>}
        meta={tr('Order likhein, cutting karein, asal wazan tolein aur bill bana kar dein — advance khud kat jata hai')}
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printList} disabled={!rows.length} /></span>
          <button type="button" title={tr('CSV')} className={heroIconButton} disabled={!rows.length}
            onClick={() => downloadCsv('meat-orders.csv', [[tr('Order'), tr('Customer'), tr('Phone'), tr('Kab'), tr('Halat'), tr('Delivery'), tr('Kul'), tr('Mila')], ...rows.map((o) => [o.orderNumber, o.customerName, o.customerPhone, dateTime(o.neededBy), STATUS[o.status].label, o.isDelivery ? tr('Haan') : '', o.total, o.paidAmount])])}>
            <FileSpreadsheet className="h-4 w-4" />
          </button>
          <Link to="/meat/subscriptions" className={heroButton}><CalendarClock className="h-4 w-4" /><span className="hidden sm:inline">{tr('Subscriptions')}</span></Link>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canPos && <Link to="/meat/weight-orders/new" title={tr('Naya order (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Naya order')}</Link>}
        </>}
        stats={data ? [
          { label: tr('Chal rahe'), value: counts?.open ?? 0, hint: sales(data.openValue) },
          { label: tr('Aaj dene'), value: counts?.today ?? 0 },
          { label: tr('Advance mila'), value: sales(data.advances) },
        ] : [{ label: tr('Chal rahe'), value: '—' }]}
      />

      <KpiRow cols={5}>
        {!counts ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={ClipboardList} color="#7c3aed" label={tr('Chal rahe')} value={counts.open} hint={sales(data?.openValue)} onClick={() => { setView('orders'); setTab('open'); }} active={view === 'orders' && tab === 'open'} />
          <KpiCard icon={CalendarClock} color="#d97706" label={tr('Aaj dene')} value={counts.today} hint={tr('Aaj ya pehle ka waqt')} onClick={() => { setView('orders'); setTab('today'); }} active={view === 'orders' && tab === 'today'} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label={tr('Tayyar')} value={counts.ready} hint={tr('Customer ko bulayein')} onClick={() => { setView('orders'); setTab('ready'); }} active={view === 'orders' && tab === 'ready'} />
          <KpiCard icon={Truck} color="#0891b2" label={tr('Delivery')} value={counts.delivery} hint={tr('Ghar / restaurant')} onClick={() => { setView('orders'); setTab('delivery'); }} active={view === 'orders' && tab === 'delivery'} />
          <KpiCard icon={Wallet} color="#0f766e" label={tr('Advance mila')} value={sales(data?.advances)} hint={tr('Chalte orders par')} />
        </>}
      </KpiRow>

      {view === 'orders' && (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Order #, customer, phone, pata, item…')} label={tr('Search')} />}
          chips={filtered ? <>
            {range.preset !== 'all' && period && <FilterChip onRemove={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>{tr('Order: {{from}}', { from: rangeLabel(period.from, period.to) })}</FilterChip>}
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={ClipboardList} label={tabLabel(tab)} value={tab} active={tab !== 'open'} onChange={setTab}
            options={TABS.map((t) => ({ value: t.id, label: t.label, hint: counts ? tr('{{value}} orders', { value: counts[t.id] }) : undefined }))} />
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label={tr('Order ki date')} />
        </FilterBar>
      )}

      <ViewTabs value={view} onChange={setView} hint={<>{tr('{{value}}/ search · 1-2 tabs', { value: canPos ? tr('N naya · ') : '' })}</>}
        tabs={[{ id: 'orders', label: tr('Orders'), icon: Package, count: data?.total ?? null }, { id: 'analytics', label: tr('Analytics'), icon: BarChart3 }]} />

      {view === 'analytics' ? (
        openQ.isLoading ? <Skeleton className="h-64 rounded-3xl" /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
              <h3 className="font-semibold text-slate-900">{tr('Chalte orders me kya tolna hai')}</h3>
              <p className="text-[0.8125rem] text-slate-500">{tr('Sab chalte orders ka maal jama — subah mandi / zibah ka andaza')}</p>
              <ul className="mt-3 divide-y divide-slate-100">
                {analytics.items.map(([name, r]) => (
                  <li key={name} className="flex items-center justify-between py-2 text-[0.875rem]"><span className="text-slate-700">{name}</span><span className="font-semibold tabular-nums">{kg(r.kg)} · {sales(r.value)}</span></li>
                ))}
                {!analytics.items.length && <li className="py-6 text-center text-sm text-slate-500">{tr('Koi chalta order nahi')}</li>}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3 content-start">
              {[
                { l: tr('Chalte orders'), v: analytics.count, c: 'text-slate-900' },
                { l: tr('Late'), v: analytics.late, c: analytics.late ? 'text-rose-600' : 'text-slate-900' },
                { l: tr('Delivery wale'), v: analytics.delivery, c: 'text-slate-900' },
                { l: tr('Bina advance'), v: analytics.noAdvance, c: analytics.noAdvance ? 'text-amber-700' : 'text-slate-900' },
              ].map((x) => (
                <div key={x.l} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80"><p className="text-[0.75rem] text-slate-500">{x.l}</p><p className={cn('text-2xl font-bold tabular-nums', x.c)}>{x.v}</p></div>
              ))}
            </div>
          </div>
        )
      ) : (<>
        <ListFrame loading={listQ.isLoading} error={listQ.isError && !data} onRetry={() => listQ.refetch()}
          empty={!rows.length ? {
            icon: Package, title: filtered ? tr('Is filter me koi order nahi') : tab === 'today' ? tr('Aaj dene ko koi order nahi') : tr('Koi order nahi'),
            text: tr('Shadi, Eid ya restaurant ka order — kitne kg, kab chahiye, advance. Counter par seedhi sale POS se hoti hai.'),
            actions: <>
              {canPos && <Button onClick={() => navigate('/meat/weight-orders/new')} leftIcon={<Plus className="h-4 w-4" />}>{tr('Naya order')}</Button>}
              {filtered && <Button variant="ghost" onClick={clear}>{tr('Filter saaf karein')}</Button>}
              {!filtered && tab !== 'all' && <Button variant="ghost" onClick={() => setTab('all')}>{tr('Sab orders')}</Button>}
            </>,
          } : null}>
          {rows.map((o) => {
            const nx = nextStep(o);
            const due = Math.max(o.total - o.paidAmount, 0);
            const kgs = o.items.reduce((s, i) => s + (i.actualKg ?? i.requestedKg), 0);
            return (
              <li key={o.id} className={cn('px-4 py-3.5 sm:px-5', isLate(o) && 'bg-rose-50/50')}>
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-slate-900">{o.customerName || o.customerPhone || tr('Customer')}</span>
                      <span className="text-[0.75rem] text-slate-500">{o.orderNumber}</span>
                      <Pill tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Pill>
                      {isLate(o) && <Pill tone="rose"><AlertTriangle className="h-3 w-3" />{tr('Late')}</Pill>}
                      {o.isDelivery && <Pill tone="sky"><Truck className="h-3 w-3" />{tr('Delivery')}</Pill>}
                      {o.occasion && <Pill>{o.occasion}</Pill>}
                    </div>
                    <p className="mt-1 text-[0.8125rem] text-slate-600">{o.items.map((i) => `${i.productName} ${kg(i.actualKg ?? i.requestedKg)}`).join(' · ')}</p>
                    <p className="mt-0.5 text-[0.75rem] text-slate-500">
                      {o.neededBy ? tr('Kab: {{neededBy}}', { neededBy: dateTime(o.neededBy) }) : tr('Waqt nahi likha')}{o.customerPhone ? ` · ${o.customerPhone}` : ''}{o.isDelivery && o.deliveryAddress ? ` · ${o.deliveryAddress}` : ''}
                      {o.cancellationReason ? tr(' · Wajah: {{cancellationReason}}', { cancellationReason: o.cancellationReason }) : ''}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-bold tabular-nums text-slate-900">{sales(o.total)}</p>
                    <p className="text-[0.75rem] text-slate-500">{kg(kgs)}{o.paidAmount > 0 ? tr(' · mila {{paidAmount}}', { paidAmount: sales(o.paidAmount) }) : ''}</p>
                    {isOpen(o) && due > 0 && <p className="text-[0.75rem] font-semibold text-amber-700">{tr('Baqi {{due}}', { due: sales(due) })}</p>}
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {isOpen(o) && canPos && <>
                    {nx && <Button size="sm" variant="secondary" loading={step.isPending && step.variables?.o.id === o.id} onClick={() => step.mutate({ o, status: nx.status })} rightIcon={<ArrowRight className="h-3.5 w-3.5 rtl-flip" />}>{nx.label}</Button>}
                    <Button size="sm" variant="secondary" leftIcon={<Scale className="h-3.5 w-3.5" />} onClick={() => setDialog({ kind: 'weigh', o })}>{tr('Wazan')}</Button>
                    {due > 0 && <Button size="sm" variant="secondary" leftIcon={<Wallet className="h-3.5 w-3.5" />} onClick={() => setDialog({ kind: 'pay', o })}>{tr('Paisa mila')}</Button>}
                    <Button size="sm" variant="success" leftIcon={<Receipt className="h-3.5 w-3.5" />} onClick={() => setDialog({ kind: 'bill', o })}>{tr('Bill bana kar dein')}</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => navigate(`/meat/weight-orders/new?id=${o.id}`)}>{tr('Badlein')}</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Ban className="h-3.5 w-3.5" />} onClick={() => setDialog({ kind: 'cancel', o })}>{tr('Cancel')}</Button>
                  </>}
                  {o.status === 'CANCELLED' && o.paidAmount > 0 && canRefund && <Button size="sm" variant="secondary" leftIcon={<Undo2 className="h-3.5 w-3.5" />} onClick={() => setDialog({ kind: 'refund', o })}>{tr('Advance wapas')}</Button>}
                  {o.status === 'DELIVERED' && <Link to={`/sales?search=${encodeURIComponent(o.orderNumber)}`} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('Bill dekhein →')}</Link>}
                  <span className="ms-auto flex gap-1.5">
                    <PrintButton size="sm" label={tr('Cutting parchi')} doc={() => slip(o, false)} />
                    <PrintButton size="sm" label={tr('Customer parchi')} doc={() => slip(o, true)} />
                  </span>
                </div>
              </li>
            );
          })}
        </ListFrame>
        <Pager page={page} pages={data ? Math.ceil(data.total / data.limit) : 1} onPage={setPage} />
      </>)}

      {dialog?.kind === 'weigh' && <WeighModal o={dialog.o} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog?.kind === 'pay' && (
        <PayModal title={`${dialog.o.orderNumber} · ${dialog.o.customerName ?? ''}`} due={Math.max(dialog.o.total - dialog.o.paidAmount, 0)} onClose={() => { setDialog(null); refresh(); }}
          onPay={(amount, method) => weightOrdersApi.addPayment(dialog.o.id, amount, method, dialog.o.paidAmount)} />
      )}
      {dialog?.kind === 'bill' && <BillDialog o={dialog.o} onClose={() => { setDialog(null); refresh(); }} />}
      {dialog?.kind === 'cancel' && (
        <CancelModal title={`${dialog.o.orderNumber} · ${dialog.o.customerName ?? ''}`} paid={dialog.o.paidAmount} onClose={() => { setDialog(null); refresh(); }}
          onConfirm={(reason) => weightOrdersApi.updateStatus(dialog.o.id, 'CANCELLED', reason)} />
      )}
      {dialog?.kind === 'refund' && <RefundDialog o={dialog.o} onClose={() => { setDialog(null); refresh(); }} />}

      {guide.isOpen && (
        <PageGuide title={tr('Wazan wale order — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#7c3aed', title: tr('Order likhein'), text: tr('Customer, kitne kg kaunsa cut, kab chahiye, delivery ka pata. Advance mila to usi waqt likhein — aaj ke galle me aata hai.') },
            { icon: Scissors, color: '#d97706', title: tr('Cutting aur pack'), text: tr('Row par agla qadam dabayein: Cutting → Pack → Tayyar. "Cutting parchi" kaarigar ko dein — us me rate nahi hota.') },
            { icon: Scale, color: '#0891b2', title: tr('Asal wazan'), text: tr('Tolne ke baad "Wazan" me asal kg likhein — bill asal wazan par banta hai.') },
            { icon: Receipt, color: '#16a34a', title: tr('Bill bana kar dein'), text: tr('Dete waqt bill banta hai: stock kam, Sale me, cash / card / split. Advance khate se kat jata hai, baqi udhaar khate me.') },
            { icon: Undo2, color: '#e11d48', title: tr('Cancel aur wapsi'), text: tr('Cancel ke baad advance khate me rehta hai; "Advance wapas" se cash lautayein (PIN lag sakta hai).') },
          ]}
          tips={[tr('Bill void karne se order wapas "Tayyar" ho jata hai aur dobara bill ban sakta hai.'), tr('Order likhne aur bill ke liye POS ki ijazat chahiye; advance wapsi ke liye Returns ki.')]}
          shortcuts={[['N', tr('naya order')], ['/', 'dhoondein'], ['1', 'orders'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

/** Loads the order's khata money first, then opens the hand-over bill. */
function BillDialog({ o, onClose }: { o: WeightOrder; onClose: () => void }) {
  const one = useQuery({ queryKey: [KEYS.orders, 'one', o.id], queryFn: () => weightOrdersApi.getOne(o.id), staleTime: 0 });
  if (one.isLoading) return null;
  if (!one.data) { toast.error(tr('Order load nahi hua')); onClose(); return null; }
  const d = one.data;
  return (
    <CheckoutModal title={`${d.orderNumber} · ${d.customerName ?? ''}`} total={d.total} held={d.khataPaid} legacy={d.legacyPaid} customerName={d.customerName}
      lines={[...d.items.map((i) => ({ label: `${i.productName} ${kg(i.actualKg ?? i.requestedKg)} × ${formatPKR(i.pricePerKg)}`, value: formatPKR(i.total) })),
        ...(d.deliveryCharges ? [{ label: tr('Delivery'), value: formatPKR(d.deliveryCharges) }] : []), ...(d.discount ? [{ label: tr('Discount'), value: `− ${formatPKR(d.discount)}` }] : [])]}
      onClose={onClose}
      onConfirm={async (payments) => {
        const r = await weightOrdersApi.checkout(d.id, { payments, expectedTotal: d.total });
        toast.success(tr('{{orderNumber}} de diya — bill ban gaya', { orderNumber: r.orderNumber }));
      }} />
  );
}

function RefundDialog({ o, onClose }: { o: WeightOrder; onClose: () => void }) {
  const one = useQuery({ queryKey: [KEYS.orders, 'one', o.id], queryFn: () => weightOrdersApi.getOne(o.id), staleTime: 0 });
  if (one.isLoading || !one.data) return null;
  return <RefundModal title={`${o.orderNumber} · ${o.customerName ?? ''}`} held={one.data.khataPaid} legacy={one.data.legacyPaid} onClose={onClose} onRefund={(pin) => weightOrdersApi.refund(o.id, pin)} />;
}
