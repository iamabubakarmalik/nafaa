/**
 * Bulk orders: a farmer's season order (bags of seed, fertilizer, spray)
 * booked ahead, with advance taken on the farmer's khata the day it comes
 * in. "Pahunch gaya" makes the normal bill: stock goes out and the full
 * amount lands on the khata, where the advance already covers its part.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight, BarChart3, Boxes, CheckCircle2, Download, GraduationCap, ListChecks, Plus, Receipt, Truck, Wallet, X, XCircle, CalendarDays,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, type FilterOption,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { bulkOrdersApi, type BulkOrder, type OrderStatus } from '../api/bulk-orders.api';
import { Pager } from '../components/Pager';
import { PayModal } from '../components/PayModal';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { NEXT_STATUS, ORDER_STATUS, SEASON_LABEL, errorText, qty, seasonLabel, shortDate, isoDay } from '../lib/meta';

type View = 'OPEN' | 'DELIVERED' | 'CANCELLED' | 'all' | 'analytics';
const KEY = 'agri-bulk-orders';
const SEASON_OPTIONS: Array<FilterOption<string>> = [{ value: '', label: 'Har season' }, ...['RABI', 'KHARIF', 'ZAID'].map((v) => ({ value: v, label: SEASON_LABEL[v] }))];

const who = (o: BulkOrder) => o.customerName || 'Customer';
const remaining = (o: BulkOrder) => Math.max(o.total - o.paidAmount, 0);

function orderDoc(o: BulkOrder, money: (n: number) => string): PrintDoc {
  return {
    title: `Bulk order ${o.orderNumber}`,
    subtitle: [who(o), o.customerPhone, seasonLabel(o.season), o.cropTarget].filter((x) => x && x !== '—').join(' · '),
    meta: [['Date', shortDate(o.orderDate)], ['Delivery', o.deliveryDate ? shortDate(o.deliveryDate) : '—']],
    sections: [
      { kind: 'table', columns: [{ label: 'Cheez' }, { label: 'Qty', align: 'right' }, { label: 'Rate', align: 'right', wideOnly: true }, { label: 'Total', align: 'right' }], rows: o.items.map((i) => [i.productName, `${qty(i.quantity)} ${i.unit}`, money(i.pricePerUnit), money(i.total)]) },
      {
        kind: 'rows', rows: [
          { label: 'Maal', value: money(o.subtotal) },
          ...(o.bulkDiscount ? [{ label: 'Discount', value: `-${money(o.bulkDiscount)}` }] : []),
          ...(o.deliveryCharges ? [{ label: 'Delivery', value: money(o.deliveryCharges) }] : []),
          ...(o.otherCharges ? [{ label: 'Doosre charges', value: money(o.otherCharges) }] : []),
          { label: 'Kul', value: money(o.total), strong: true },
          { label: 'Advance', value: money(o.paidAmount) },
          { label: 'Baqi', value: money(remaining(o)), strong: true },
        ],
      },
    ],
    footer: o.isCredit ? 'Baqi amount farmer ke khate me season ke udhaar me jayegi.' : undefined,
  };
}

export default function BulkOrdersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canManage = usePermission(PERMISSIONS.AGRI_ORDERS_MANAGE);
  const [params, setParams] = useSearchParams();
  const farmerId = params.get('farmer') ?? undefined;
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('OPEN');
  const [season, setSeason] = useState('');
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<BulkOrder | null>(null);
  const q = useDebounced(search.trim());
  const status = view === 'analytics' || view === 'all' ? undefined : view;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [KEY, 'page', q, status, season, farmerId, page],
    queryFn: () => bulkOrdersApi.page({ search: q || undefined, status, season: season || undefined, farmerId, page, limit: 25 }),
    placeholderData: keepPreviousData,
  });
  usePageKeys(searchRef, canManage ? { n: () => navigate('/agri/bulk-orders/new') } : {});
  const rows = data?.items ?? [];
  const s = data?.stats;
  const c = data?.counts ?? {};
  const openCount = (['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY'] as OrderStatus[]).reduce((a, k) => a + (c[k] ?? 0), 0);
  const total = Object.values(c).reduce((a, n) => a + (n ?? 0), 0);
  const setTab = (v: View) => { setView(v); setPage(1); };

  const exportCsv = () => {
    if (!rows.length) { toast.error('Is list me koi order nahi'); return; }
    downloadCsv('bulk-orders.csv', [
      ['Order', 'Date', 'Farmer', 'Phone', 'Season', 'Fasal', 'Cheezein', 'Kul', 'Advance', 'Baqi', 'Status', 'Bill'],
      ...rows.map((o) => [o.orderNumber, isoDay(o.orderDate), who(o), o.customerPhone, seasonLabel(o.season), o.cropTarget, o.items.map((i) => `${i.productName} x${qty(i.quantity)}`).join(' / '), o.total, o.paidAmount, remaining(o), ORDER_STATUS[o.status].label, o.bill?.saleNumber]),
    ]);
  };
  const listDoc = (): PrintDoc => ({
    title: 'Bulk orders', subtitle: view === 'OPEN' ? 'Khule orders' : view === 'DELIVERED' ? 'Pahunch gaye' : 'Sab',
    meta: [['Kul', money(s?.value)], ['Advance', money(s?.advance)]],
    sections: [{ kind: 'table', columns: [{ label: 'Order' }, { label: 'Farmer' }, { label: 'Delivery', wideOnly: true }, { label: 'Kul', align: 'right' }, { label: 'Baqi', align: 'right' }], rows: rows.map((o) => [o.orderNumber, who(o), o.deliveryDate ? shortDate(o.deliveryDate) : '—', money(o.total), money(remaining(o))]) }],
  });

  const chips = (search.trim() || season || farmerId) ? (
    <>
      {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
      {season && <FilterChip onRemove={() => setSeason('')}>{SEASON_LABEL[season]}</FilterChip>}
      {farmerId && <FilterChip onRemove={() => { params.delete('farmer'); setParams(params); }}>Ek farmer</FilterChip>}
    </>
  ) : undefined;

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Bulk orders — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Order likhein', text: 'Farmer, season aur fasal chunein, maal aur rate likhein. Stock abhi nahi ghatta.' },
            { icon: Wallet, color: '#16a34a', title: 'Advance', text: 'Advance farmer ke khate me usi din jama hota hai — day book aur drawer me dikhta hai.' },
            { icon: Truck, color: '#7c3aed', title: 'Pahunch gaya', text: 'Maal dene par "Pahunch gaya" dabayein — bill ban jata hai, stock ghatta hai aur baqi season ke udhaar me jata hai.' },
            { icon: XCircle, color: '#e11d48', title: 'Cancel', text: 'Bill se pehle cancel ho sakta hai. Advance farmer ke khate me jama rehta hai — wapas dena ho to khate se dein.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya order'], ['G', 'guide']]} />
      )}

      <PageHero title="Bulk orders" chip={`${openCount} khule`} busy={isFetching && !isLoading} loading={isLoading}
        meta="Season ka maal pehle se book — advance khate me"
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={listDoc} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <Link to={`/agri/bulk-orders/new${farmerId ? `?farmer=${farmerId}` : ''}`} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya order</Link>}
        </>}
        stats={[
          { label: 'Kul orders ki value', value: money(s?.value) },
          { label: 'Advance mila', value: money(s?.advance) },
          { label: 'Khule orders', value: money(s?.openValue) },
        ]} />

      <KpiRow cols={4}>
        {isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={ListChecks} color="#2563eb" label="Khule" value={openCount} onClick={() => setTab('OPEN')} active={view === 'OPEN'} />
            <KpiCard icon={Truck} color="#7c3aed" label="Raste me" value={c.OUT_FOR_DELIVERY ?? 0} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Pahunch gaye" value={c.DELIVERED ?? 0} onClick={() => setTab('DELIVERED')} active={view === 'DELIVERED'} />
            <KpiCard icon={Wallet} color="#d97706" label="Baqi (orders par)" value={money(s?.pending)} />
          </>
        )}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Order number, farmer, phone, fasal ya maal…" />}
        chips={chips} onClear={() => { setSearch(''); setSeason(''); if (farmerId) { params.delete('farmer'); setParams(params); } }}>
        <FilterMenu icon={CalendarDays} label={season ? SEASON_LABEL[season] : 'Season'} value={season} options={SEASON_OPTIONS} onChange={(v) => { setSeason(v); setPage(1); }} active={!!season} align="right" />
      </FilterBar>

      <ViewTabs value={view} onChange={setTab} tabs={[
        { id: 'OPEN', label: 'Khule', icon: ListChecks, count: openCount },
        { id: 'DELIVERED', label: 'Pahunch gaye', icon: CheckCircle2, count: c.DELIVERED ?? 0 },
        { id: 'CANCELLED', label: 'Cancel', icon: XCircle, count: c.CANCELLED ?? 0 },
        { id: 'all', label: 'Sab', icon: Boxes, count: total },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      ]} />

      {view === 'analytics' ? (
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <h3 className="mb-3 text-[0.9375rem] font-semibold text-slate-900">Season ke hisaab se orders</h3>
          {(data?.analytics.seasons ?? []).length === 0 ? <p className="py-6 text-center text-[0.8125rem] text-slate-500">Abhi koi order nahi</p> : (() => {
            const list = data!.analytics.seasons;
            const max = Math.max(1, ...list.map((x) => x.value));
            return (
              <ul className="space-y-2">{list.map((x) => (
                <li key={x.season ?? 'none'} className="text-[0.8125rem]">
                  <div className="flex justify-between"><span className="font-medium text-slate-700">{seasonLabel(x.season)} · {x.orders} order</span><span className="tabular-nums text-slate-600">{money(x.value)}</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-lime-500" style={{ width: `${(x.value / max) * 100}%` }} /></div>
                </li>
              ))}</ul>
            );
          })()}
        </section>
      ) : (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            : rows.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-50 text-lime-700"><Boxes className="h-7 w-7" /></span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{search ? 'Is search me koi order nahi' : 'Is list me koi order nahi'}</h3>
                <p className="mt-1 text-[0.875rem] text-slate-500">Bijai se pehle farmer ka poore season ka maal yahan book karein.</p>
                {canManage && <Link to="/agri/bulk-orders/new" className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-brand-fg"><Plus className="h-4 w-4" />Naya order</Link>}
              </div>
            ) : (
              <>
                <Table minWidth="58rem">
                  <THead><Tr><Th>Order</Th><Th>Farmer</Th><Th>Maal</Th><Th>Delivery</Th><Th align="right">Kul / baqi</Th><Th>Status</Th></Tr></THead>
                  <TBody>{rows.map((o) => (
                    <Tr key={o.id} interactive onClick={() => setOpen(o)}>
                      <Td><p className="font-semibold text-slate-900">{o.orderNumber}</p><p className="text-[0.75rem] text-slate-500">{shortDate(o.orderDate)}</p></Td>
                      <Td><p className="font-medium text-slate-900">{who(o)}</p><p className="text-[0.75rem] text-slate-500">{[o.customerPhone, seasonLabel(o.season) !== '—' ? seasonLabel(o.season) : '', o.cropTarget].filter(Boolean).join(' · ')}</p></Td>
                      <Td className="max-w-[18rem] text-[0.8125rem] text-slate-600"><p className="truncate">{o.items.map((i) => `${i.productName} × ${qty(i.quantity)}`).join(', ')}</p></Td>
                      <Td className="text-[0.8125rem] text-slate-600">{o.deliveryDate ? shortDate(o.deliveryDate) : '—'}{o.isDelivery && <Truck className="ml-1 inline h-3.5 w-3.5 text-violet-600" />}</Td>
                      <Td align="right"><p className="font-bold">{money(o.total)}</p><p className={cn('text-[0.75rem]', remaining(o) > 0 ? 'text-amber-700' : 'text-emerald-700')}>{remaining(o) > 0 ? `baqi ${money(remaining(o))}` : 'poora mila'}</p></Td>
                      <Td>
                        <span className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold ring-1', ORDER_STATUS[o.status].tone)}>{ORDER_STATUS[o.status].label}</span>
                        {o.bill && <p className="mt-1 text-[0.6875rem] text-slate-500">Bill {o.bill.saleNumber}</p>}
                      </Td>
                    </Tr>
                  ))}</TBody>
                </Table>
                <Pager page={data?.page ?? 1} limit={data?.limit ?? 25} total={data?.total ?? 0} onPage={setPage} />
              </>
            )}
        </section>
      )}

      {open && <OrderModal order={open} canManage={canManage} money={money} onClose={() => setOpen(null)} onChanged={(o) => { setOpen(o); qc.invalidateQueries({ queryKey: [KEY] }); }} />}
    </PageShell>
  );
}

function OrderModal({ order: o, canManage, money, onClose, onChanged }: {
  order: BulkOrder; canManage: boolean; money: (n: number) => string; onClose: () => void; onChanged: (o: BulkOrder) => void;
}) {
  const qc = useQueryClient();
  const [pay, setPay] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [reason, setReason] = useState('');
  const next = NEXT_STATUS[o.status];
  const closed = o.status === 'DELIVERED' || o.status === 'CANCELLED' || o.status === 'RETURNED';
  const move = useMutation({
    mutationFn: (v: { status: OrderStatus; reason?: string }) => bulkOrdersApi.updateStatus(o.id, v.status, v.reason),
    onSuccess: (r, v) => {
      onChanged({ ...o, ...r });
      if (v.status === 'DELIVERED') { qc.invalidateQueries({ queryKey: ['products-for-pos'] }); qc.invalidateQueries({ queryKey: ['agri-farmers'] }); toast.success('Bill ban gaya — stock ghat gaya aur baqi khate me'); }
      else toast.success(v.status === 'CANCELLED' ? 'Order cancel' : `Ab: ${ORDER_STATUS[v.status].label}`);
      setCancel(false);
    },
    onError: (e) => toast.error(errorText(e, 'Status nahi badla')),
  });
  const advance = useMutation({
    mutationFn: (v: { amount: number; method: string }) => bulkOrdersApi.addPayment(o.id, v.amount, v.method),
    onSuccess: (r, v) => { onChanged({ ...o, ...r }); qc.invalidateQueries({ queryKey: ['agri-farmers'] }); toast.success(`${money(v.amount)} advance khate me jama`); setPay(false); },
    onError: (e) => toast.error(errorText(e, 'Advance nahi likha')),
  });
  const useful = useMemo(() => [o.isDelivery && o.deliveryAddress ? `Delivery: ${o.deliveryAddress}` : '', o.vehicleNumber ? `Gaari ${o.vehicleNumber}` : '', o.farmerNotes, o.advisorNotes].filter(Boolean), [o]);

  return (
    <Modal open onClose={onClose} size="lg" title={`${o.orderNumber} · ${who(o)}`} description={[o.customerPhone, seasonLabel(o.season) !== '—' ? seasonLabel(o.season) : '', o.cropTarget, o.landAreaAcres ? `${o.landAreaAcres} acre` : ''].filter(Boolean).join(' · ')}
      footer={<>
        <span className="mr-auto"><PrintButton doc={() => orderDoc(o, money)} label="Print" /></span>
        {canManage && !closed && <Button variant="ghost" onClick={() => setCancel(true)} leftIcon={<X className="h-4 w-4" />}>Cancel</Button>}
        {canManage && !closed && remaining(o) > 0 && <Button variant="secondary" onClick={() => setPay(true)} leftIcon={<Wallet className="h-4 w-4" />}>Advance</Button>}
        {canManage && next && <Button loading={move.isPending} onClick={() => move.mutate({ status: next })} leftIcon={next === 'DELIVERED' ? <Receipt className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}>{next === 'DELIVERED' ? 'Pahunch gaya — bill banayein' : ORDER_STATUS[next].label}</Button>}
        {o.bill && <Link to={`/sales?search=${o.bill.saleNumber}`} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[0.875rem] font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-slate-50"><Receipt className="h-4 w-4" />Bill {o.bill.saleNumber}</Link>}
      </>}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('rounded-md px-2 py-0.5 text-[0.75rem] font-semibold ring-1', ORDER_STATUS[o.status].tone)}>{ORDER_STATUS[o.status].label}</span>
          <span className="text-[0.8125rem] text-slate-500">Order {shortDate(o.orderDate)} · Delivery {o.deliveryDate ? shortDate(o.deliveryDate) : '—'}</span>
          {o.isCredit && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[0.75rem] font-semibold text-amber-800">Baqi season ke udhaar me</span>}
        </div>
        <Table>
          <THead><Tr><Th>Cheez</Th><Th align="right">Qty</Th><Th align="right">Rate</Th><Th align="right">Total</Th></Tr></THead>
          <TBody>{o.items.map((i, n) => (
            <Tr key={i.id ?? n}><Td>{i.productName}{!i.productId && <span className="ml-1 text-[0.6875rem] text-slate-500">(catalog ke bagair)</span>}</Td><Td align="right">{qty(i.quantity)} {i.unit}</Td><Td align="right">{money(i.pricePerUnit)}</Td><Td align="right" className="font-semibold">{money(i.total)}</Td></Tr>
          ))}</TBody>
        </Table>
        <dl className="ml-auto max-w-xs space-y-1 text-[0.875rem]">
          <div className="flex justify-between"><dt className="text-slate-500">Maal</dt><dd className="tabular-nums">{money(o.subtotal)}</dd></div>
          {o.bulkDiscount > 0 && <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="tabular-nums">-{money(o.bulkDiscount)}</dd></div>}
          {o.deliveryCharges > 0 && <div className="flex justify-between"><dt className="text-slate-500">Delivery</dt><dd className="tabular-nums">{money(o.deliveryCharges)}</dd></div>}
          {o.otherCharges > 0 && <div className="flex justify-between"><dt className="text-slate-500">Doosre charges</dt><dd className="tabular-nums">{money(o.otherCharges)}</dd></div>}
          <div className="flex justify-between border-t border-slate-200 pt-1 font-bold"><dt>Kul</dt><dd className="tabular-nums">{money(o.total)}</dd></div>
          <div className="flex justify-between text-emerald-700"><dt>Advance</dt><dd className="tabular-nums">{money(o.paidAmount)}</dd></div>
          <div className="flex justify-between font-semibold text-amber-800"><dt>Baqi</dt><dd className="tabular-nums">{money(remaining(o))}</dd></div>
        </dl>
        {useful.length > 0 && <ul className="space-y-1 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">{useful.map((u) => <li key={u}>{u}</li>)}</ul>}
        {o.status === 'CANCELLED' && o.cancellationReason && <p className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800">Cancel: {o.cancellationReason}</p>}
      </div>
      {pay && <PayModal title={`${o.orderNumber} — advance`} description="Farmer ke khate me aaj jama hoga" max={remaining(o)} suggest={[Math.round(remaining(o) / 2), remaining(o)]} withNote={false} busy={advance.isPending} onClose={() => setPay(false)} onPay={(v) => advance.mutate(v)} />}
      {cancel && (
        <Modal open onClose={() => setCancel(false)} size="sm" title="Order cancel karein?"
          description={o.paidAmount > 0 ? `${money(o.paidAmount)} advance farmer ke khate me jama rahega — wapas dena ho to khate se dein.` : 'Stock aur khata nahi badlenge.'}
          footer={<><Button variant="secondary" onClick={() => setCancel(false)}>Wapas</Button><Button variant="danger" disabled={!reason.trim()} loading={move.isPending} onClick={() => move.mutate({ status: 'CANCELLED', reason: reason.trim() })}>Cancel karein</Button></>}>
          <label className="block">
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Wajah</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Farmer ne mana kar diya, rate ka masla…" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-[0.875rem] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" data-autofocus />
          </label>
        </Modal>
      )}
    </Modal>
  );
}
