/**
 * Restaurant orders: every order for any period with server paging, filters
 * (status, order type, waiter, date), totals for the whole filter, and the
 * end-of-day view (open orders, money by type / waiter / table). Paid
 * money is the bills' net, so it matches the day book.
 *
 * Keys: / search · N new order · D day close · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowDownWideNarrow, Ban, BarChart3, CalendarRange, CheckCircle2, ChefHat, Download, Flame, GraduationCap, ListChecks, ListFilter, Plus, ReceiptText,
  ShoppingBag, UserRound, Utensils, Wallet, type LucideIcon,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, type FilterOption,
} from '@/design-system/components';
import { PrintButton, type PrintDoc } from '@core/print';
import { DATE_PRESETS, presetRange, rangeLabel, type DatePreset } from '@core/lib/dateRange';
import { useBusinessDayStart } from '@core/lib/business-day';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { teamApi } from '@modules/organization/team/api/team.api';
import { ordersApi, type OrderMode, type OrderPageQuery, type RestaurantOrder } from '../api/orders.api';
import { DayClosePanel } from '../components/DayClosePanel';
import { MODE_META, ORDER_MODES, STATUS_META, duration, isOpenOrder, minutesSince, orderTitle } from '../lib/orderMeta';
import { t as tr } from '@core/i18n';

type Bucket = 'all' | 'open' | 'completed' | 'cancelled';
const BUCKETS: Array<FilterOption<Bucket>> = [
  { value: 'all', label: tr('Sab orders'), icon: ListChecks, color: '#475569' },
  { value: 'open', label: tr('Khule'), hint: tr('Table, kitchen ya rider ke paas'), icon: Flame, color: '#ea580c' },
  { value: 'completed', label: tr('Paid'), hint: tr('Bill ban gaya'), icon: CheckCircle2, color: '#16a34a' },
  { value: 'cancelled', label: tr('Cancel'), icon: Ban, color: '#e11d48' },
];
const SORTS: Array<FilterOption<'new' | 'old' | 'high' | 'low'>> = [
  { value: 'new', label: tr('Naye pehle') }, { value: 'old', label: tr('Purane pehle') }, { value: 'high', label: tr('Bari amount pehle') }, { value: 'low', label: tr('Chhoti amount pehle') },
];
const LIMIT = 30;

export default function RestaurantOrdersPage() {
  const navigate = useNavigate();
  const startHour = useBusinessDayStart();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'orders' | 'close'>('orders');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [bucket, setBucket] = useState<Bucket>('all');
  const [mode, setMode] = useState<OrderMode | 'all'>('all');
  const [waiterId, setWaiterId] = useState('all');
  const [preset, setPreset] = useState<DatePreset>('today');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [sort, setSort] = useState<'new' | 'old' | 'high' | 'low'>('new');
  const [page, setPage] = useState(1);
  const [guide, setGuide] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => setPage(1), [debounced, bucket, mode, waiterId, preset, custom, sort]);

  const range = presetRange(preset, startHour, custom);
  const query: OrderPageQuery = {
    search: debounced || undefined, status: bucket, mode: mode === 'all' ? undefined : mode, waiterId: waiterId === 'all' ? undefined : waiterId,
    from: range.from === 'all' ? undefined : range.from, to: range.to, sort, page, limit: LIMIT,
  };
  const q = useQuery({ queryKey: ['restaurant-orders-page', query], queryFn: () => ordersApi.page(query), placeholderData: keepPreviousData, refetchInterval: 30_000 });
  const { data: team = [] } = useQuery({ queryKey: ['team'], queryFn: () => teamApi.list().catch(() => []), staleTime: 5 * 60_000 });
  const st = q.data?.stats;
  const rows = q.data?.items ?? [];
  const pages = Math.max(1, Math.ceil((q.data?.total ?? 0) / LIMIT));
  const label = rangeLabel(range.from, range.to);
  const hasFilters = bucket !== 'all' || mode !== 'all' || waiterId !== 'all' || !!debounced || preset !== 'today';
  const clear = () => { setBucket('all'); setMode('all'); setWaiterId('all'); setSearch(''); setPreset('today'); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (k === 'n') navigate('/restaurant/orders/new');
      if (k === 'd') setTab((t) => (t === 'orders' ? 'close' : 'orders'));
      if (k === 'g') setGuide(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  /** Every order of the filter, page by page, for CSV and print. */
  const fetchAll = async () => {
    const out: RestaurantOrder[] = [];
    for (let p = 1; p <= 50; p++) {
      const r = await ordersApi.page({ ...query, page: p, limit: 200 });
      out.push(...r.items);
      if (out.length >= r.total || !r.items.length) break;
    }
    return out;
  };
  const csv = async () => {
    setExporting(true);
    try {
      const all = await fetchAll();
      if (!all.length) { toast.error(tr('Is filter me koi order nahi')); return; }
      downloadCsv(`restaurant-orders-${range.from}-${range.to}.csv`, [
        [tr('Order'), tr('Token'), tr('Tareekh'), tr('Type'), tr('Table'), tr('Customer'), tr('Waiter'), tr('Status'), tr('Bill'), tr('Total'), tr('Mila')],
        ...all.map((o) => [o.orderNumber, o.token ?? '', new Date(o.createdAt).toLocaleString('en-PK'), MODE_META[o.mode].label, o.table?.tableNumber ?? '',
          o.customerName ?? '', o.waiterName ?? '', STATUS_META[o.status].label, o.sale?.saleNumber ?? '', o.total, o.paidAmount]),
      ]);
      toast.success(tr('{{count}} order CSV me', { count: all.length }));
    } catch { toast.error(tr('Export nahi hua')); } finally { setExporting(false); }
  };
  const printDoc = async (): Promise<PrintDoc> => {
    const all = await fetchAll();
    return {
      title: tr('Restaurant orders'), subtitle: label,
      sections: [
        { kind: 'rows', rows: [
          { label: tr('Paid (bill)'), value: `${st?.completed ?? 0} · ${formatPKR(st?.completedAmount ?? 0)}`, strong: true },
          { label: tr('Khule'), value: `${st?.open ?? 0} · ${formatPKR(st?.openAmount ?? 0)}` },
          { label: tr('Cancel'), value: `${st?.cancelled ?? 0} · ${formatPKR(st?.cancelledAmount ?? 0)}` },
        ] },
        { kind: 'table', columns: [{ label: tr('Order') }, { label: tr('Type') }, { label: tr('Table / customer'), wideOnly: true }, { label: tr('Status'), wideOnly: true }, { label: tr('Total'), align: 'right' }],
          rows: all.map((o) => [o.orderNumber, MODE_META[o.mode].short, o.table ? `T ${o.table.tableNumber}` : o.customerName ?? '', STATUS_META[o.status].label, formatPKR(o.total)]) },
      ],
    };
  };

  const modeOptions = useMemo<Array<FilterOption<OrderMode | 'all'>>>(() => [
    { value: 'all', label: tr('Har type') }, ...ORDER_MODES.map((m) => ({ value: m, label: MODE_META[m].label, icon: MODE_META[m].icon, color: MODE_META[m].color })),
  ], []);

  return (
    <PageShell>
      {guide && <OrdersGuide onClose={() => setGuide(false)} />}
      <PageHero
        title={tr('Orders')}
        chip={<><CalendarRange />{label}</>}
        busy={q.isFetching && !q.isLoading}
        meta={tr('Dine-in, takeaway, delivery aur counter')}
        loading={q.isLoading}
        actions={<>
          <button type="button" onClick={() => void csv()} disabled={exporting} className={heroButton}><Download className="h-4 w-4" />{exporting ? tr('Ban raha…') : tr('CSV')}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label={tr('Print')} /></span>
          <Link to="/restaurant/tables" className={heroButton}><Utensils className="h-4 w-4" />{tr('Tables')}</Link>
          <Link to="/restaurant/orders/new" className={heroPrimaryButton}><Plus className="h-4 w-4" />{tr('Naya order')}{' '} <Kbd className="hidden md:inline-flex">N</Kbd></Link>
          <button type="button" onClick={() => setGuide(true)} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={st ? [
          { label: tr('Paid · {{completed}} bill', { completed: st.completed }), value: formatPKR(st.completedAmount), hint: st.voidedBills ? tr('{{voidedBills}} bill void', { voidedBills: st.voidedBills }) : undefined },
          { label: tr('Khule orders'), value: String(st.open), hint: formatPKR(st.openAmount) },
          { label: tr('Ausat bill'), value: formatPKR(st.averageBill) },
          { label: tr('Cancel'), value: String(st.cancelled), hint: st.cancelledAmount ? formatPKR(st.cancelledAmount) : undefined },
        ] : [{ label: tr('Paid'), value: '' }, { label: tr('Khule orders'), value: '' }, { label: tr('Ausat bill'), value: '' }, { label: tr('Cancel'), value: '' }]}
      />

      <KpiRow>
        {!st ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={ChefHat} color="#ea580c" label={tr('Kitchen me')} value={String(st.kitchen)} hint={tr('Ban rahe orders')} onClick={() => setBucket(bucket === 'open' ? 'all' : 'open')} active={bucket === 'open'} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label={tr('Tayyar')} value={String(st.ready)} hint={tr('Serve / pickup ka intezar')} />
            <KpiCard icon={ReceiptText} color="#9333ea" label={tr('Bill print ho gaya')} value={String(st.billPrinted)} hint={tr('Payment ka intezar')} />
            {st.byMode.slice(0, 2).map((m) => {
              const meta = MODE_META[m.mode];
              return <KpiCard key={m.mode} icon={meta?.icon ?? ShoppingBag} color={meta?.color ?? '#475569'} label={meta?.label ?? m.mode} value={formatPKR(m.amount)} hint={tr('{{count}} bill · dabayein', { count: m.count })}
                onClick={() => setMode(mode === m.mode ? 'all' : m.mode)} active={mode === m.mode} />;
            })}
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Order number, bill number, customer, phone ya table…')} label={tr('Order search')} />}
        chips={hasFilters ? <>
          {preset !== 'today' && <FilterChip onRemove={() => setPreset('today')}>{label}</FilterChip>}
          {bucket !== 'all' && <FilterChip onRemove={() => setBucket('all')}>{BUCKETS.find((b) => b.value === bucket)?.label}</FilterChip>}
          {mode !== 'all' && <FilterChip onRemove={() => setMode('all')}>{MODE_META[mode].label}</FilterChip>}
          {waiterId !== 'all' && <FilterChip onRemove={() => setWaiterId('all')}>{team.find((t) => t.id === waiterId)?.fullName ?? tr('Waiter')}</FilterChip>}
          {debounced && <FilterChip onRemove={() => setSearch('')}>"{debounced}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <FilterMenu icon={CalendarRange} label={tr('Date')} value={preset} active={preset !== 'today'} width="w-72"
          options={[...DATE_PRESETS.map((p) => ({ value: p.id, label: p.label })), { value: 'custom' as const, label: tr('Apni date'), hint: tr('Neeche se chunein') }]}
          onChange={setPreset}
          footer={() => (
            <div className="mt-1 grid grid-cols-2 gap-2 border-t border-slate-100 p-2 pt-3">
              {(['from', 'to'] as const).map((k) => (
                <label key={k} className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">{k === 'from' ? tr('Se') : tr('Tak')}
                  <input type="date" value={custom[k] || (range[k] === 'all' ? '' : range[k])} onChange={(e) => { setCustom({ ...custom, [k]: e.target.value }); setPreset('custom'); }}
                    className="mt-1 block h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] font-normal normal-case tracking-normal text-slate-900" />
                </label>
              ))}
            </div>
          )} />
        <FilterMenu icon={ListFilter} label={tr('Status')} value={bucket} active={bucket !== 'all'} options={BUCKETS} onChange={setBucket} />
        <FilterMenu icon={Utensils} label={tr('Type')} value={mode} active={mode !== 'all'} options={modeOptions} onChange={setMode} />
        {team.length > 1 && (
          <FilterMenu icon={UserRound} label={tr('Waiter')} value={waiterId} active={waiterId !== 'all'}
            options={[{ value: 'all', label: tr('Sab waiter') }, ...team.map((m) => ({ value: m.id, label: m.fullName }))]} onChange={setWaiterId} />
        )}
        <FilterMenu icon={ArrowDownWideNarrow} label={tr('Sort')} value={sort} options={SORTS} onChange={setSort} align="right" width="w-56" />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>D</Kbd> {' '}{tr('se badlein')}</>}
        tabs={[{ id: 'orders', label: tr('Orders'), icon: ListChecks, count: q.data?.total ?? null }, { id: 'close', label: tr('Din band'), icon: BarChart3 }]} />

      {tab === 'close' ? <DayClosePanel date={preset === 'today' ? undefined : range.to} /> : (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {q.isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : !rows.length ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg"><ShoppingBag className="h-7 w-7" /></span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{hasFilters ? tr('Is filter me koi order nahi') : tr('Aaj abhi koi order nahi')}</h3>
              <div className="mt-4">{hasFilters ? <Button variant="secondary" onClick={clear}>{tr('Filter hatayein')}</Button> : <Button onClick={() => navigate('/restaurant/orders/new')}>{tr('Pehla order lein')}</Button>}</div>
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_7rem] gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400 lg:grid">
                <span>{tr('Order')}</span><span>{tr('Type')}</span><span>{tr('Dishes')}</span><span>{tr('Status')}</span><span className="text-end">{tr('Amount')}</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {rows.map((o) => <OrderRow key={o.id} o={o} />)}
              </ul>
              {pages > 1 && (
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[0.8125rem]">
                  <span className="text-slate-500">{tr('Safha {{page}} / {{pages}} · {{total}} order', { page, pages, total: q.data?.total })}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{tr('Pichhla')}</Button>
                    <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>{tr('Agla')}</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </PageShell>
  );
}

function OrderRow({ o }: { o: RestaurantOrder }) {
  const meta = MODE_META[o.mode];
  const status = STATUS_META[o.status];
  const open = isOpenOrder(o);
  const voided = o.sale?.status === 'VOIDED';
  const Icon = meta.icon;
  return (
    <li>
      <Link to={`/restaurant/orders/${o.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-slate-50 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_7rem] lg:px-5">
        <span className="min-w-0">
          <span className="block truncate text-[0.9375rem] font-semibold text-slate-900">{orderTitle(o)}</span>
          <span className="block truncate text-[0.75rem] text-slate-500">{o.orderNumber}{o.sale ? ` · ${o.sale.saleNumber}` : ''} · {new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(o.createdAt))}</span>
        </span>
        <span className="hidden items-center gap-1.5 text-[0.8125rem] text-slate-700 lg:inline-flex"><Icon className="h-4 w-4" style={{ color: meta.color }} />{meta.label}{o.waiterName ? <span className="truncate text-slate-400">· {o.waiterName}</span> : null}</span>
        <span className="hidden truncate text-[0.8125rem] text-slate-600 lg:block">{o.items.map((i) => `${i.quantity}× ${i.product?.name ?? ''}`).join(', ')}</span>
        <span className="hidden lg:block">
          <span className={cn('inline-block rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold', voided ? 'bg-rose-50 text-rose-700' : status.tone)}>{voided ? tr('Bill void') : status.label}</span>
          {open && <span className="ms-1.5 text-[0.6875rem] text-slate-400">{duration(minutesSince(o.createdAt))}</span>}
          {(o.sale?.creditAmount ?? 0) > 0 && <span className="ms-1.5 text-[0.6875rem] font-semibold text-amber-700">{tr('udhaar')}</span>}
        </span>
        <span className="text-end">
          <span className={cn('block text-[0.9375rem] font-bold tabular-nums', voided || o.status === 'CANCELLED' ? 'text-slate-400 line-through' : 'text-slate-900')}>{formatPKR(o.total)}</span>
          <span className={cn('text-[0.6875rem] font-semibold lg:hidden', status.tone, 'rounded px-1')}>{voided ? tr('Bill void') : status.label}</span>
        </span>
      </Link>
    </li>
  );
}

function OrdersGuide({ onClose }: { onClose: () => void }) {
  const steps: Array<{ icon: LucideIcon; color: string; title: string; text: string }> = [
    { icon: Plus, color: '#2563eb', title: tr('Naya order'), text: tr('N dabayein. Dine-in me table chunein, takeaway / delivery / counter me customer.') },
    { icon: Flame, color: '#ea580c', title: tr('Khule orders'), text: tr('"Status → Khule" se wo sab jo table par, kitchen me ya rider ke paas hain.') },
    { icon: Wallet, color: '#16a34a', title: tr('Paid'), text: tr('Upar ka "Paid" bill ka net hai — void bill nikal kar, return ghata kar. Day book se milta hai.') },
    { icon: BarChart3, color: '#db2777', title: tr('Din band'), text: tr('D — khule orders ki tambeeh, rider ka cash, aur type / waiter / table war sale.') },
  ];
  return (
    <Modal open onClose={onClose} size="lg" title={tr('Orders — aasaan tareeqa')}>
      <ol className="grid gap-3 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}17`, color: s.color }}>
              <s.icon className="h-5 w-5" />
              <span className="absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[0.625rem] font-bold text-white">{i + 1}</span>
            </span>
            <div><p className="text-[0.875rem] font-semibold text-slate-900">{s.title}</p><p className="mt-0.5 text-[0.8125rem] leading-relaxed text-slate-600">{s.text}</p></div>
          </li>
        ))}
      </ol>
    </Modal>
  );
}
