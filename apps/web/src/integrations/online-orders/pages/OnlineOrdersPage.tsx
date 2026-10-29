/**
 * Online orders from every channel (website, WooCommerce, Shopify, Daraz,
 * Foodpanda): status pipeline tabs, quick actions on each order, a side
 * drawer with the full order, bulk actions, alerts for late and
 * cancel-requested orders, and analytics for the same filter.
 *
 * Keys: / search · N new orders · A analytics · S select · R refresh · J/K next/previous · G guide.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, BarChart3, Bell, PhoneCall, CheckCircle2, CheckSquare, Download, Globe, GraduationCap, ListChecks, MousePointerClick,
  RefreshCw, ShoppingBag, Timer, Trophy, Truck, Wallet, XCircle, Zap,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, resolveRange,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { useReportRange } from '@modules/reports/prefs';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { onlineOrdersApi, type OnlineOrder, type OrderListQuery } from '../api/online-orders.api';
import { BulkBar } from '../components/BulkBar';
import { OnlineAnalytics } from '../components/analytics/OnlineAnalytics';
import { CancelOrderModal } from '../components/orders/CancelOrderModal';
import { OrderDrawer } from '../components/orders/OrderDrawer';
import { OrderRow } from '../components/orders/OrderRow';
import { useOrderActions } from '../components/orders/useOrderActions';
import { useLiveOnlineOrders } from '../hooks/useLiveOnlineOrders';
import { useSalesChannels } from '../hooks/useSalesChannels';
import { brandIcon, sourceOf, timeAgo } from '../lib/labels';
import { BrandLogo, brandForChannel, brandLabel } from '@/assets/brands/BrandLogo';
import { ORDER_TABS, downloadCsv, itemQty, orderNo, statusShort, tabCount, type OrderTab } from '../lib/orders';
import { ordersDoc } from '../lib/print';

type View = OrderTab | 'analytics';
type Pay = '' | 'COD' | 'PAID';
type Confirm = '' | 'CONFIRMED' | 'NO_ANSWER' | 'REFUSED' | 'NONE';
const CONFIRM_OPTIONS: Array<{ value: Confirm; label: string; hint?: string }> = [
  { value: '', label: 'Sab' },
  { value: 'NONE', label: 'Abhi poocha nahi', hint: 'Confirm karwana baqi' },
  { value: 'CONFIRMED', label: 'Confirm ho gaya', hint: 'Customer ne haan kaha' },
  { value: 'NO_ANSWER', label: 'Jawab nahi', hint: 'Dobara koshish karein' },
  { value: 'REFUSED', label: 'Mana kiya' },
];
const PAGE = 50;
const YEAR_BACK = 364;

const shift = (key: string, days: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

export default function OnlineOrdersPage() {
  const [params, setParams] = useSearchParams();
  const startHour = useBusinessDayStart();
  const { sales: money, salesHidden } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const tenantName = useAuthStore((s) => s.tenant?.name);

  // Coming from Customers (?search=phone) opens every order of that customer.
  const [view, setView] = useState<View>(() => (params.get('search') ? 'ALL' : 'PENDING'));
  const [search, setSearch] = useState(() => params.get('search') ?? '');
  const [query, setQuery] = useState(() => (params.get('search') ?? '').trim());
  const [range, setRange] = useReportRange('month');
  const [pay, setPay] = useState<Pay>('');
  const [confirm, setConfirm] = useState<Confirm>('');
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [cancelTarget, setCancelTarget] = useState<OnlineOrder | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [canNotify, setCanNotify] = useState(() => typeof Notification === 'undefined' || Notification.permission !== 'default');
  const [exporting, setExporting] = useState(false);

  const selectedId = params.get('order');
  const channelId = params.get('channel') || undefined;
  const { data: channels } = useSalesChannels();
  const channel = channels?.find((c) => c.id === channelId);
  const { data: shopsData } = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });
  const activeShops = (shopsData ?? []).filter((s) => s.isActive);
  const branchOf = (o: OnlineOrder) => (activeShops.length > 1 ? activeShops.find((s) => s.id === o.shopId)?.name : undefined);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);

  const setParam = useCallback((key: string, value?: string | null) => {
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (value) next.set(key, value); else next.delete(key);
      if (key === 'channel') next.delete('order');
      return next;
    }, { replace: true });
  }, [setParams]);
  const open = useCallback((id: string | null) => setParam('order', id), [setParam]);

  const period = resolveRange(range, startHour);
  const today = businessDayKey(new Date(), startHour);
  const reportRange = period ?? { from: shift(today, -YEAR_BACK), to: today };
  const periodText = period ? rangeLabel(period.from, period.to) : 'Pichhle 12 mahine';
  const tab: OrderTab = view === 'analytics' ? 'ALL' : view;
  const queue = ORDER_TABS.find((t) => t.id === tab)?.queue ?? false;
  // Search looks through every date; queue tabs never hide old orders.
  const dated = !queue && !query && !!period;

  const listQuery: OrderListQuery = {
    integrationId: channelId,
    status: tab === 'ALL' || tab === 'COD_DUE' ? undefined : tab,
    payment: tab === 'COD_DUE' ? 'COD_DUE' : undefined,
    search: query || undefined,
    pay: pay || undefined,
    confirm: confirm || undefined,
    ...(dated ? { from: period!.from, to: period!.to } : {}),
  };
  const listQ = useInfiniteQuery({
    queryKey: ['online-orders', 'list', listQuery],
    queryFn: ({ pageParam }) => onlineOrdersApi.list({ ...listQuery, limit: PAGE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((a, p) => a + p.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
    refetchInterval: 15_000,
    enabled: view !== 'analytics',
  });
  // Counts and alerts for the whole channel; kept fresh even on the analytics tab.
  const countsQ = useQuery({
    queryKey: ['online-orders', 'counts', channelId, period?.from, period?.to],
    queryFn: () => onlineOrdersApi.list({ integrationId: channelId, limit: 1, ...(period ? { from: period.from, to: period.to } : {}) }),
    refetchInterval: 30_000,
  });
  const reportQ = useQuery({
    queryKey: ['online-report', reportRange.from, reportRange.to, channelId],
    queryFn: () => onlineOrdersApi.report({ ...reportRange, integrationId: channelId }),
    placeholderData: (p) => p,
    refetchInterval: 60_000,
  });

  const live = useLiveOnlineOrders();
  const pendingLive = live.data?.pendingCount;
  useEffect(() => {
    if (pendingLive === undefined) return;
    void listQ.refetch(); void countsQ.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLive]);

  const orders = useMemo(() => listQ.data?.pages.flatMap((p) => p.items) ?? [], [listQ.data]);
  const total = listQ.data?.pages[0]?.total ?? 0;
  const c = countsQ.data;
  const counts = c?.counts ?? {};
  const codDue = c?.stats;
  const alerts = c?.alerts;
  const r = reportQ.data;
  const t = r?.totals;

  const actions = useOrderActions(open);
  const togglePick = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const stopSelecting = () => { setSelecting(false); setPicked(new Set()); };
  const step = useCallback((dir: 1 | -1) => {
    if (!orders.length) return;
    const i = orders.findIndex((o) => o.id === selectedId);
    const next = i === -1 ? 0 : Math.min(Math.max(i + dir, 0), orders.length - 1);
    open(orders[next].id);
  }, [orders, selectedId, open]);

  const hasFilters = !!query || !!pay || !!confirm;
  const clear = () => { setSearch(''); setPay(''); setConfirm(''); };
  const goTab = (v: View) => { setView(v); stopSelecting(); };
  const refresh = () => { void listQ.refetch(); void countsQ.refetch(); void reportQ.refetch(); };
  const listName = view === 'analytics' ? 'Analytics' : ORDER_TABS.find((x) => x.id === tab)?.label ?? '';
  const filterText = [channel?.displayName, pay === 'COD' ? 'Sirf COD' : pay === 'PAID' ? 'Sirf paid' : '', confirm && CONFIRM_OPTIONS.find((c) => c.value === confirm)?.label, query && `"${query}"`].filter(Boolean).join(' · ');

  /** Every order for the current filter, page by page (up to 1,000). */
  const fetchAll = async () => {
    const out: OnlineOrder[] = [];
    let total = 0;
    for (let offset = 0; offset < 1000; offset += 200) {
      const page = await onlineOrdersApi.list({ ...listQuery, limit: 200, offset });
      out.push(...page.items);
      total = page.total;
      if (out.length >= page.total || !page.items.length) break;
    }
    return { items: out, total };
  };
  const exportCsv = async () => {
    setExporting(true);
    try {
      const { items } = await fetchAll();
      if (!items.length) { toast.error('Is list me koi order nahi'); return; }
      downloadCsv(`online-orders-${today}.csv`, [
        [`Online orders — ${tenantName ?? ''}`],
        [`List: ${listName} · Period: ${dated ? periodText : 'Har date'}${filterText ? ` · ${filterText}` : ''}`],
        [],
        ['Order', 'Date', 'Customer', 'Phone', 'Shehar', 'Channel', 'Cheezein', 'Qty', 'Total', 'COD', 'Payment', 'Halat', 'Courier', 'CN', 'Test'],
        ...items.map((o) => [
          orderNo(o), new Date(o.receivedAt).toLocaleString('en-PK'), o.customerName, o.customerPhone ?? '', o.customerCity ?? '',
          o.integration?.displayName ?? sourceOf(o).label, o.items.length, itemQty(o), Number(o.total || 0).toFixed(2),
          o.isCod ? 'Haan' : 'Nahi', o.paymentStatus, statusShort(o.orderStatus), o.courierLabel ?? '', o.trackingNumber ?? '', o.isTest ? 'Haan' : '',
        ]),
      ]);
      toast.success(`${items.length} order CSV me`);
    } catch { toast.error('CSV nahi bani'); } finally { setExporting(false); }
  };
  const printDoc = async () => {
    const { items, total } = await fetchAll();
    return ordersDoc(items, listName, dated ? periodText : 'Har date', filterText, total);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); if (view === 'analytics') setView('ALL'); window.setTimeout(() => searchRef.current?.focus(), 0); }
      else if (k === 'a') setView((v) => (v === 'analytics' ? 'PENDING' : 'analytics'));
      else if (k === 'n') goTab('PENDING');
      else if (k === 's' && view !== 'analytics') setSelecting((v) => !v);
      else if (k === 'r') { refresh(); toast.success('Taaza kar diya'); }
      else if ((k === 'j' || k === 'k') && view !== 'analytics') { e.preventDefault(); step(k === 'j' ? 1 : -1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, step]);

  const firstRun = !countsQ.isLoading && !!c && Object.keys(counts).length === 0 && !query;
  const fetching = (listQ.isFetching && !listQ.isLoading) || countsQ.isFetching || reportQ.isFetching;

  return (
    <PageShell>
      <PageHero
        title={channel ? <span className="inline-flex min-w-0 items-center gap-2.5"><BrandLogo name={brandForChannel(channel.type, { platform: channel.platform })} size={28} /><span className="truncate">{channel.displayName}</span></span> : 'Online orders'}
        chip={<><ShoppingBag />{(counts.PENDING ?? 0) > 0 ? `${counts.PENDING} naye` : periodText}</>}
        meta="Accept karein — bill aur receipt khud banti hai, stock kam ho jata hai"
        busy={fetching}
        loading={reportQ.isLoading}
        actions={<>
          <PrivacyToggle compact />
          {!canNotify && (
            <button type="button" onClick={() => Notification.requestPermission().finally(() => setCanNotify(true))} title="Naye order par desktop alert" className={heroButton}>
              <Bell className="h-4 w-4" /> <span className="hidden sm:inline">Alert on</span>
            </button>
          )}
          <button type="button" onClick={refresh} title="Taaza (R)" className={heroIconButton}><RefreshCw className={fetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></button>
          <button type="button" onClick={() => void exportCsv()} disabled={exporting || view === 'analytics'} className={heroButton}>
            <Download className="h-4 w-4" /> {exporting ? 'Ban raha…' : 'CSV'}
          </button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={view === 'analytics'} /></span>
          <Link to="/online-store/channels" title="Channels jorein" className={heroButton}><Globe className="h-4 w-4" /> <span className="hidden sm:inline">Channels</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={t ? [
          { label: `Online sale · ${t.netOrders} order`, value: money(t.netValue) },
          { label: 'Ausat order', value: money(t.avgOrderValue), hint: `${r!.payment.cod.orders} COD` },
          { label: 'Delivered', value: money(t.deliveredValue), hint: `${t.delivered} order` },
          { label: 'RTO (wapas)', value: `${t.rtoRate}%`, hint: `${t.returned} / ${t.dispatched}` },
        ] : [{ label: 'Online sale', value: '' }, { label: 'Ausat order', value: '' }, { label: 'Delivered', value: '' }, { label: 'RTO', value: '' }]}
      />

      {firstRun ? <FirstRun hasChannels={(channels?.length ?? 0) > 0} /> : (<>
        <KpiRow>
          {!c || !t ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
            <KpiCard icon={Zap} color="#d97706" label="Naye orders" value={counts.PENDING ?? 0}
              hint={alerts?.stalePending.count ? `${alerts.stalePending.count} der se ruke` : 'Accept karne hain'}
              onClick={() => goTab('PENDING')} active={view === 'PENDING'} />
            <KpiCard icon={Truck} color="#0284c7" label="Chal rahe" value={tabCount('ACTIVE', counts, null, 0)} hint="Pack ya raste me"
              onClick={() => goTab('ACTIVE')} active={view === 'ACTIVE'} />
            <KpiCard icon={Wallet} color="#ea580c" label="COD paisa baqi" value={money(codDue?.codDueValue ?? 0)} hint={`${codDue?.codDueCount ?? 0} order · dabayein`}
              onClick={() => goTab('COD_DUE')} active={view === 'COD_DUE'} />
            <KpiCard icon={XCircle} color="#e11d48" label="Cancel / reject" value={`${t.cancelRate}%`} hint={`${t.cancelled} order is period me`}
              onClick={() => goTab('CLOSED')} active={view === 'CLOSED'} />
            <KpiCard icon={Trophy} color="#16a34a" label="Sab se bara order" value={r?.biggest ? money(r.biggest.total) : '—'}
              hint={r?.biggest ? `${r.biggest.customerName} · #${r.biggest.number}` : undefined}
              onClick={r?.biggest ? () => open(r.biggest!.id) : undefined} />
          </>}
        </KpiRow>

        {alerts && (alerts.stalePending.count > 0 || alerts.cancelRequests.count > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {alerts.stalePending.count > 0 && (
              <Alert tone="rose" icon={Timer}
                title={`${alerts.stalePending.count} naya order ${alerts.staleMinutes} minute se zyada ruka hai`}
                text="Der hone par customer cancel kar deta hai — jaldi accept karein."
                items={alerts.stalePending.oldest.map((o) => ({ id: o.id, label: `#${o.externalOrderNumber ?? o.externalOrderId} · ${timeAgo(o.receivedAt)}` }))}
                onPick={(id) => { goTab('PENDING'); open(id); }} />
            )}
            {alerts.cancelRequests.count > 0 && (
              <Alert tone="amber" icon={AlertTriangle}
                title={`${alerts.cancelRequests.count} customer ne cancel maanga hai`}
                text="Parcel bhejne se pehle dekh lein — warna courier ka expense aur return dono."
                items={alerts.cancelRequests.latest.map((o) => ({ id: o.id, label: `#${o.externalOrderNumber ?? o.externalOrderId} · ${statusShort(o.orderStatus)}` }))}
                onPick={(id) => { goTab('ALL'); open(id); }} />
            )}
          </div>
        )}

        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); if (view === 'analytics') setView('ALL'); }}
            placeholder="Order #, naam, phone ya CN…" label="Order search" />}
          chips={hasFilters ? <>
            {pay && <FilterChip onRemove={() => setPay('')}>{pay === 'COD' ? 'Sirf COD' : 'Sirf paid'}</FilterChip>}
            {confirm && <FilterChip onRemove={() => setConfirm('')}>{CONFIRM_OPTIONS.find((c) => c.value === confirm)?.label}</FilterChip>}
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}" · har date</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
          {(channels?.length ?? 0) > 1 && (
            <FilterMenu icon={Globe} label="Channel" value={channelId ?? ''} active={!!channelId} width="w-72"
              onChange={(v) => setParam('channel', v || null)}
              options={[{ value: '', label: 'Sab channels' }, ...channels!.map((ch) => ({
                value: ch.id, label: ch.displayName, icon: brandIcon(brandForChannel(ch.type, { platform: ch.platform })),
                hint: ch.pendingOrders ? `${ch.pendingOrders} naye` : brandLabel(brandForChannel(ch.type, { platform: ch.platform })),
              }))]} />
          )}
          <FilterMenu icon={Wallet} label="Paisa" value={pay} active={!!pay} onChange={setPay} align="right"
            options={[{ value: '' as Pay, label: 'Sab' }, { value: 'COD', label: 'Sirf COD', hint: 'Delivery par cash' }, { value: 'PAID', label: 'Sirf paid', hint: 'Paisa mil chuka' }]} />
          <FilterMenu icon={PhoneCall} label="Confirm" value={confirm} active={!!confirm} onChange={setConfirm} align="right" options={CONFIRM_OPTIONS} />
        </FilterBar>

        <ViewTabs value={view} onChange={goTab}
          tabs={[
            ...ORDER_TABS.map((x) => ({ id: x.id as View, label: x.label, count: c ? tabCount(x.id, counts, c.rangeCounts, codDue?.codDueCount ?? 0) : null })),
            { id: 'analytics' as View, label: 'Analytics', icon: BarChart3 },
          ]}
          right={view !== 'analytics' ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-[0.75rem] text-slate-500 lg:inline">{queue ? 'Is list par date nahi lagti' : query ? 'Talaash har date me' : periodText}</span>
              <Button size="sm" variant={selecting ? 'inverse' : 'secondary'} leftIcon={<CheckSquare className="h-4 w-4" />} onClick={() => (selecting ? stopSelecting() : setSelecting(true))}>
                {selecting ? 'Chhoro' : 'Kai chunein'}
              </Button>
            </div>
          ) : undefined} />

        {view === 'analytics' ? (
          !r ? <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
            : <OnlineAnalytics data={r} money={money} onTab={goTab} />
        ) : listQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : listQ.isError && !orders.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <p className="font-semibold text-slate-900">Orders load nahi hue</p>
            <Button className="mt-3" variant="secondary" onClick={() => listQ.refetch()}>Dobara koshish</Button>
          </div>
        ) : !orders.length ? (
          <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><ShoppingBag className="h-6 w-6" /></span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{query ? `"${query}" se koi order nahi mila` : tab === 'PENDING' ? 'Koi naya order nahi' : 'Is list me koi order nahi'}</h3>
            <p className="mt-1 text-[0.875rem] text-slate-500">{tab === 'PENDING' ? 'Naya order aate hi ghanti bajegi aur yahan dikhega.' : 'Date ya filter badal kar dekhein.'}</p>
            {hasFilters && <Button className="mt-4" variant="secondary" onClick={clear}>Filter hatayein</Button>}
          </div>
        ) : (
          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {selecting && (
              <label className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-[0.8125rem] font-medium text-slate-600 sm:px-5">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={orders.every((o) => picked.has(o.id))}
                  onChange={(e) => setPicked(e.target.checked ? new Set(orders.map((o) => o.id)) : new Set())} />
                Dikhaye gaye sab {orders.length} chunein
              </label>
            )}
            <ul className="divide-y divide-slate-100 [&>li:first-child]:rounded-t-3xl [&>li:last-child]:rounded-b-3xl">
              {orders.map((o) => (
                <OrderRow key={o.id} order={o} now={now} money={money} staleMinutes={alerts?.staleMinutes ?? 15} branchName={branchOf(o)}
                  selecting={selecting} checked={picked.has(o.id)} active={o.id === selectedId} busy={actions.busyId === o.id} couriers={actions.couriers}
                  onOpen={() => open(o.id)} onToggle={() => togglePick(o.id)} onAction={(a) => actions.run(o, a)} onCancel={() => setCancelTarget(o)} />
              ))}
            </ul>
          </section>
        )}
        {view !== 'analytics' && listQ.hasNextPage && (
          <button type="button" onClick={() => void listQ.fetchNextPage()} disabled={listQ.isFetchingNextPage}
            className="w-full rounded-2xl bg-white py-3 text-[0.875rem] font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50 disabled:opacity-60">
            {listQ.isFetchingNextPage ? 'Aa rahe hain…' : `Aur orders dikhayein (${orders.length} / ${total})`}
          </button>
        )}
        {salesHidden && <p className="text-center text-[0.75rem] text-slate-400">Amount chhupi hai — upar aankh wale button se dikhayein</p>}
      </>)}

      {selectedId && <OrderDrawer orderId={selectedId} onClose={() => open(null)} onStep={view !== 'analytics' && orders.length > 1 ? step : undefined} />}
      {cancelTarget && (
        <CancelOrderModal open hasBill={!!cancelTarget.nafaaSaleId} loading={actions.pending}
          title={cancelTarget.orderStatus === 'PENDING' ? `#${orderNo(cancelTarget)} reject karein?` : `#${orderNo(cancelTarget)} cancel karein?`}
          onClose={() => setCancelTarget(null)}
          onConfirm={(reason) => { actions.run(cancelTarget, { kind: 'cancel', reason }); setCancelTarget(null); }} />
      )}
      <BulkBar orders={orders} picked={picked} onClear={stopSelecting} onKeep={(ids) => setPicked(new Set(ids))} />

      {guide.isOpen && (
        <PageGuide title="Online orders — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Zap, color: '#d97706', title: 'Naya order', text: `Ghanti bajti hai aur "Naye" me dikhta hai. ${alerts?.staleMinutes ?? 15} minute se zyada ruka ho to laal warning aati hai.` },
            { icon: CheckCircle2, color: '#16a34a', title: 'Accept', text: 'Accept dabate hi bill aur receipt ban jati hai aur stock kam ho jata hai. Reject par kuch nahi katta.' },
            { icon: Truck, color: '#0284c7', title: 'Order ka safar', text: 'Naya → Accept → Packing → Ready → Raste me → Delivered. Har order par agla qadam ka button hai; "…" me courier booking, label aur invoice.' },
            { icon: MousePointerClick, color: '#7c3aed', title: 'Order kholein', text: 'Order par click karein: items, customer, payment, courier aur sab buttons. J aur K se agla / pichla.' },
            { icon: ListChecks, color: '#0891b2', title: 'Kai orders ek saath', text: '"Kai chunein" dabayein: accept, confirm, agla qadam, courier booking, invoice print ya cancel — ek dafa me.' },
            { icon: Wallet, color: '#ea580c', title: 'COD baqi', text: 'Parcel pohanch gaya magar paisa courier se nahi aaya — "COD baqi" me rehta hai. Settlement "COD & courier" safhe par.' },
          ]}
          tips={[
            '"Naye", "Chal rahe" aur "COD baqi" par date nahi lagti — koi purana ruka order chhupe na.',
            'Talaash (search) har date me dhoondti hai.',
            'Test order analytics aur report me nahi gine jate.',
            'Laal "Customer ne cancel maanga" wala order bhejne se pehle zaroor dekhein.',
          ]}
          shortcuts={[['/', 'dhoondein'], ['N', 'naye'], ['A', 'analytics'], ['S', 'kai chunein'], ['J', 'agla'], ['K', 'pichla'], ['R', 'taaza'], ['G', 'guide']]}
          footer={<Link to="/online-orders/reports" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Poori online report →</Link>}
        />
      )}
    </PageShell>
  );
}

function Alert({ tone, icon: Icon, title, text, items, onPick }: {
  tone: 'rose' | 'amber'; icon: typeof Timer; title: string; text: string; items: Array<{ id: string; label: string }>; onPick: (id: string) => void;
}) {
  const box = tone === 'rose' ? 'bg-rose-50 ring-rose-100 text-rose-900' : 'bg-amber-50 ring-amber-100 text-amber-900';
  const btn = tone === 'rose' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700';
  return (
    <div className={`flex gap-3 rounded-2xl p-4 ring-1 ${box}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[0.875rem] font-semibold">{title}</p>
        <p className="mt-0.5 text-[0.8125rem] opacity-90">{text}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((it) => (
            <button key={it.id} type="button" onClick={() => onPick(it.id)} className={`h-7 rounded-lg px-2.5 text-[0.75rem] font-semibold text-white ${btn}`}>{it.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FirstRun({ hasChannels }: { hasChannels: boolean }) {
  const shopId = useAuthStore((s) => s.currentShopId);
  const { data: shops } = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });
  const branch = (shops ?? []).find((s) => s.id === shopId)?.name;
  if (hasChannels) {
    return (
      <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><ShoppingBag className="h-6 w-6" /></span>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">{branch ? `${branch} me abhi koi online order nahi` : 'Abhi koi online order nahi'}</h3>
        <p className="mt-1 max-w-lg text-[0.875rem] text-slate-500">
          Channel jura hua hai — naya order aate hi yahan aayega aur ghanti bajegi.
          {branch && (shops?.length ?? 0) > 1 && ' Doosri branch ke orders dekhne ke liye upar se branch badlein.'}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-slate-200/80">
      <span className="mx-auto flex w-fit items-center gap-2">
        {(['shopify', 'woocommerce', 'daraz', 'foodpanda', 'website'] as const).map((b) => <BrandLogo key={b} name={b} size={40} />)}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">Abhi koi online order nahi aaya</h3>
      <p className="mx-auto mt-1 max-w-lg text-[0.875rem] text-slate-500">
        Apni website, Shopify, WooCommerce, Daraz ya Foodpanda Nafaa se jodein — 2 minute ka kaam hai. Phir har order yahan aayega, ghanti bajegi aur ek click me bill banega.
      </p>
      <div className="mx-auto mt-5 grid max-w-2xl gap-2 text-left sm:grid-cols-3">
        {[['1', 'Channel jodein', 'Plugin, app ya link'], ['2', 'Test order bhejein', 'TEST ka nishan lagta hai'], ['3', 'Accept karein', 'Bill aur stock khud']].map(([n, title, d]) => (
          <div key={n} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700 ring-1 ring-inset ring-brand-100">{n}</span>
            <p className="mt-1.5 text-[0.875rem] font-semibold text-slate-900">{title}</p>
            <p className="text-[0.75rem] text-slate-500">{d}</p>
          </div>
        ))}
      </div>
      <Link to="/online-store/connect"><Button className="mt-5" leftIcon={<Globe className="h-4 w-4" />}>Channel jodein</Button></Link>
    </div>
  );
}
