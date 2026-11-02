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
import { t as tr } from '@core/i18n';

type View = OrderTab | 'analytics';
type Pay = '' | 'COD' | 'PAID';
type Confirm = '' | 'CONFIRMED' | 'NO_ANSWER' | 'REFUSED' | 'NONE';
const CONFIRM_OPTIONS: Array<{ value: Confirm; label: string; hint?: string }> = [
  { value: '', label: tr('Sab') },
  { value: 'NONE', label: tr('Abhi poocha nahi'), hint: tr('Confirm karwana baqi') },
  { value: 'CONFIRMED', label: tr('Confirm ho gaya'), hint: tr('Customer ne haan kaha') },
  { value: 'NO_ANSWER', label: tr('Jawab nahi'), hint: tr('Dobara koshish karein') },
  { value: 'REFUSED', label: tr('Mana kiya') },
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
  const periodText = period ? rangeLabel(period.from, period.to) : tr('Pichhle 12 mahine');
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
  const listName = view === 'analytics' ? tr('Analytics') : ORDER_TABS.find((x) => x.id === tab)?.label ?? '';
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
      if (!items.length) { toast.error(tr('Is list me koi order nahi')); return; }
      downloadCsv(`online-orders-${today}.csv`, [
        [tr('Online orders — {{value}}', { value: tenantName ?? '' })],
        [tr('List: {{listName}} · Period: {{value}}{{value2}}', { listName, value: dated ? periodText : tr('Har date'), value2: filterText ? ` · ${filterText}` : '' })],
        [],
        [tr('Order'), tr('Date'), tr('Customer'), tr('Phone'), tr('Shehar'), tr('Channel'), tr('Cheezein'), tr('Qty'), tr('Total'), 'COD', tr('Payment'), tr('Halat'), tr('Courier'), 'CN', tr('Test')],
        ...items.map((o) => [
          orderNo(o), new Date(o.receivedAt).toLocaleString('en-PK'), o.customerName, o.customerPhone ?? '', o.customerCity ?? '',
          o.integration?.displayName ?? sourceOf(o).label, o.items.length, itemQty(o), Number(o.total || 0).toFixed(2),
          o.isCod ? tr('Haan') : tr('Nahi'), o.paymentStatus, statusShort(o.orderStatus), o.courierLabel ?? '', o.trackingNumber ?? '', o.isTest ? tr('Haan') : '',
        ]),
      ]);
      toast.success(tr('{{count}} order CSV me', { count: items.length }));
    } catch { toast.error(tr('CSV nahi bani')); } finally { setExporting(false); }
  };
  const printDoc = async () => {
    const { items, total } = await fetchAll();
    return ordersDoc(items, listName, dated ? periodText : tr('Har date'), filterText, total);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); if (view === 'analytics') setView('ALL'); window.setTimeout(() => searchRef.current?.focus(), 0); }
      else if (k === 'a') setView((v) => (v === 'analytics' ? 'PENDING' : 'analytics'));
      else if (k === 'n') goTab('PENDING');
      else if (k === 's' && view !== 'analytics') setSelecting((v) => !v);
      else if (k === 'r') { refresh(); toast.success(tr('Taaza kar diya')); }
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
        title={channel ? <span className="inline-flex min-w-0 items-center gap-2.5"><BrandLogo name={brandForChannel(channel.type, { platform: channel.platform })} size={28} /><span className="truncate">{channel.displayName}</span></span> : tr('Online orders')}
        chip={<><ShoppingBag />{(counts.PENDING ?? 0) > 0 ? tr('{{PENDING}} naye', { PENDING: counts.PENDING }) : periodText}</>}
        meta={tr('Accept karein — bill aur receipt khud banti hai, stock kam ho jata hai')}
        busy={fetching}
        loading={reportQ.isLoading}
        actions={<>
          <PrivacyToggle compact />
          {!canNotify && (
            <button type="button" onClick={() => Notification.requestPermission().finally(() => setCanNotify(true))} title={tr('Naye order par desktop alert')} className={heroButton}>
              <Bell className="h-4 w-4" /> <span className="hidden sm:inline">{tr('Alert on')}</span>
            </button>
          )}
          <button type="button" onClick={refresh} title={tr('Taaza (R)')} className={heroIconButton}><RefreshCw className={fetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></button>
          <button type="button" onClick={() => void exportCsv()} disabled={exporting || view === 'analytics'} className={heroButton}>
            <Download className="h-4 w-4" /> {exporting ? tr('Ban raha…') : tr('CSV')}
          </button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={view === 'analytics'} /></span>
          <Link to="/online-store/channels" title={tr('Channels jorein')} className={heroButton}><Globe className="h-4 w-4" /> <span className="hidden sm:inline">{tr('Channels')}</span></Link>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={t ? [
          { label: tr('Online sale · {{netOrders}} order', { netOrders: t.netOrders }), value: money(t.netValue) },
          { label: tr('Ausat order'), value: money(t.avgOrderValue), hint: tr('{{orders}} COD', { orders: r!.payment.cod.orders }) },
          { label: tr('Delivered'), value: money(t.deliveredValue), hint: tr('{{delivered}} order', { delivered: t.delivered }) },
          { label: tr('RTO (wapas)'), value: `${t.rtoRate}%`, hint: `${t.returned} / ${t.dispatched}` },
        ] : [{ label: tr('Online sale'), value: '' }, { label: tr('Ausat order'), value: '' }, { label: tr('Delivered'), value: '' }, { label: tr('RTO'), value: '' }]}
      />

      {firstRun ? <FirstRun hasChannels={(channels?.length ?? 0) > 0} /> : (<>
        <KpiRow>
          {!c || !t ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
            <KpiCard icon={Zap} color="#d97706" label={tr('Naye orders')} value={counts.PENDING ?? 0}
              hint={alerts?.stalePending.count ? tr('{{count}} der se ruke', { count: alerts.stalePending.count }) : tr('Accept karne hain')}
              onClick={() => goTab('PENDING')} active={view === 'PENDING'} />
            <KpiCard icon={Truck} color="#0284c7" label={tr('Chal rahe')} value={tabCount('ACTIVE', counts, null, 0)} hint={tr('Pack ya raste me')}
              onClick={() => goTab('ACTIVE')} active={view === 'ACTIVE'} />
            <KpiCard icon={Wallet} color="#ea580c" label={tr('COD paisa baqi')} value={money(codDue?.codDueValue ?? 0)} hint={tr('{{value}} order · dabayein', { value: codDue?.codDueCount ?? 0 })}
              onClick={() => goTab('COD_DUE')} active={view === 'COD_DUE'} />
            <KpiCard icon={XCircle} color="#e11d48" label={tr('Cancel / reject')} value={`${t.cancelRate}%`} hint={tr('{{cancelled}} order is period me', { cancelled: t.cancelled })}
              onClick={() => goTab('CLOSED')} active={view === 'CLOSED'} />
            <KpiCard icon={Trophy} color="#16a34a" label={tr('Sab se bara order')} value={r?.biggest ? money(r.biggest.total) : '—'}
              hint={r?.biggest ? `${r.biggest.customerName} · #${r.biggest.number}` : undefined}
              onClick={r?.biggest ? () => open(r.biggest!.id) : undefined} />
          </>}
        </KpiRow>

        {alerts && (alerts.stalePending.count > 0 || alerts.cancelRequests.count > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {alerts.stalePending.count > 0 && (
              <Alert tone="rose" icon={Timer}
                title={tr('{{count}} naya order {{staleMinutes}} minute se zyada ruka hai', { count: alerts.stalePending.count, staleMinutes: alerts.staleMinutes })}
                text={tr('Der hone par customer cancel kar deta hai — jaldi accept karein.')}
                items={alerts.stalePending.oldest.map((o) => ({ id: o.id, label: `#${o.externalOrderNumber ?? o.externalOrderId} · ${timeAgo(o.receivedAt)}` }))}
                onPick={(id) => { goTab('PENDING'); open(id); }} />
            )}
            {alerts.cancelRequests.count > 0 && (
              <Alert tone="amber" icon={AlertTriangle}
                title={tr('{{count}} customer ne cancel maanga hai', { count: alerts.cancelRequests.count })}
                text={tr('Parcel bhejne se pehle dekh lein — warna courier ka expense aur return dono.')}
                items={alerts.cancelRequests.latest.map((o) => ({ id: o.id, label: `#${o.externalOrderNumber ?? o.externalOrderId} · ${statusShort(o.orderStatus)}` }))}
                onPick={(id) => { goTab('ALL'); open(id); }} />
            )}
          </div>
        )}

        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); if (view === 'analytics') setView('ALL'); }}
            placeholder={tr('Order #, naam, phone ya CN…')} label={tr('Order search')} />}
          chips={hasFilters ? <>
            {pay && <FilterChip onRemove={() => setPay('')}>{pay === 'COD' ? tr('Sirf COD') : tr('Sirf paid')}</FilterChip>}
            {confirm && <FilterChip onRemove={() => setConfirm('')}>{CONFIRM_OPTIONS.find((c) => c.value === confirm)?.label}</FilterChip>}
            {query && <FilterChip onRemove={() => setSearch('')}>{tr('"{{query}}" · har date', { query })}</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
          {(channels?.length ?? 0) > 1 && (
            <FilterMenu icon={Globe} label={tr('Channel')} value={channelId ?? ''} active={!!channelId} width="w-72"
              onChange={(v) => setParam('channel', v || null)}
              options={[{ value: '', label: tr('Sab channels') }, ...channels!.map((ch) => ({
                value: ch.id, label: ch.displayName, icon: brandIcon(brandForChannel(ch.type, { platform: ch.platform })),
                hint: ch.pendingOrders ? tr('{{pendingOrders}} naye', { pendingOrders: ch.pendingOrders }) : brandLabel(brandForChannel(ch.type, { platform: ch.platform })),
              }))]} />
          )}
          <FilterMenu icon={Wallet} label={tr('Paisa')} value={pay} active={!!pay} onChange={setPay} align="right"
            options={[{ value: '' as Pay, label: tr('Sab') }, { value: 'COD', label: tr('Sirf COD'), hint: tr('Delivery par cash') }, { value: 'PAID', label: tr('Sirf paid'), hint: tr('Paisa mil chuka') }]} />
          <FilterMenu icon={PhoneCall} label={tr('Confirm')} value={confirm} active={!!confirm} onChange={setConfirm} align="right" options={CONFIRM_OPTIONS} />
        </FilterBar>

        <ViewTabs value={view} onChange={goTab}
          tabs={[
            ...ORDER_TABS.map((x) => ({ id: x.id as View, label: x.label, count: c ? tabCount(x.id, counts, c.rangeCounts, codDue?.codDueCount ?? 0) : null })),
            { id: 'analytics' as View, label: tr('Analytics'), icon: BarChart3 },
          ]}
          right={view !== 'analytics' ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-[0.75rem] text-slate-500 lg:inline">{queue ? tr('Is list par date nahi lagti') : query ? tr('Talaash har date me') : periodText}</span>
              <Button size="sm" variant={selecting ? 'inverse' : 'secondary'} leftIcon={<CheckSquare className="h-4 w-4" />} onClick={() => (selecting ? stopSelecting() : setSelecting(true))}>
                {selecting ? tr('Chhoro') : tr('Kai chunein')}
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
            <p className="font-semibold text-slate-900">{tr('Orders load nahi hue')}</p>
            <Button className="mt-3" variant="secondary" onClick={() => listQ.refetch()}>{tr('Dobara koshish')}</Button>
          </div>
        ) : !orders.length ? (
          <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><ShoppingBag className="h-6 w-6" /></span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{query ? tr('"{{query}}" se koi order nahi mila', { query }) : tab === 'PENDING' ? tr('Koi naya order nahi') : tr('Is list me koi order nahi')}</h3>
            <p className="mt-1 text-[0.875rem] text-slate-500">{tab === 'PENDING' ? tr('Naya order aate hi ghanti bajegi aur yahan dikhega.') : tr('Date ya filter badal kar dekhein.')}</p>
            {hasFilters && <Button className="mt-4" variant="secondary" onClick={clear}>{tr('Filter hatayein')}</Button>}
          </div>
        ) : (
          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {selecting && (
              <label className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-[0.8125rem] font-medium text-slate-600 sm:px-5">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={orders.every((o) => picked.has(o.id))}
                  onChange={(e) => setPicked(e.target.checked ? new Set(orders.map((o) => o.id)) : new Set())} />
                {tr('Dikhaye gaye sab {{count}} chunein', { count: orders.length })}
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
            {listQ.isFetchingNextPage ? tr('Aa rahe hain…') : tr('Aur orders dikhayein ({{count}} / {{total}})', { count: orders.length, total })}
          </button>
        )}
        {salesHidden && <p className="text-center text-[0.75rem] text-slate-400">{tr('Amount chhupi hai — upar aankh wale button se dikhayein')}</p>}
      </>)}

      {selectedId && <OrderDrawer orderId={selectedId} onClose={() => open(null)} onStep={view !== 'analytics' && orders.length > 1 ? step : undefined} />}
      {cancelTarget && (
        <CancelOrderModal open hasBill={!!cancelTarget.nafaaSaleId} loading={actions.pending}
          title={cancelTarget.orderStatus === 'PENDING' ? tr('#{{cancelTarget}} reject karein?', { cancelTarget: orderNo(cancelTarget) }) : tr('#{{cancelTarget}} cancel karein?', { cancelTarget: orderNo(cancelTarget) })}
          onClose={() => setCancelTarget(null)}
          onConfirm={(reason) => { actions.run(cancelTarget, { kind: 'cancel', reason }); setCancelTarget(null); }} />
      )}
      <BulkBar orders={orders} picked={picked} onClear={stopSelecting} onKeep={(ids) => setPicked(new Set(ids))} />

      {guide.isOpen && (
        <PageGuide title={tr('Online orders — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Zap, color: '#d97706', title: tr('Naya order'), text: tr('Ghanti bajti hai aur "Naye" me dikhta hai. {{value}} minute se zyada ruka ho to laal warning aati hai.', { value: alerts?.staleMinutes ?? 15 }) },
            { icon: CheckCircle2, color: '#16a34a', title: tr('Accept'), text: tr('Accept dabate hi bill aur receipt ban jati hai aur stock kam ho jata hai. Reject par kuch nahi katta.') },
            { icon: Truck, color: '#0284c7', title: tr('Order ka safar'), text: tr('Naya → Accept → Packing → Ready → Raste me → Delivered. Har order par agla qadam ka button hai; "…" me courier booking, label aur invoice.') },
            { icon: MousePointerClick, color: '#7c3aed', title: tr('Order kholein'), text: tr('Order par click karein: items, customer, payment, courier aur sab buttons. J aur K se agla / pichla.') },
            { icon: ListChecks, color: '#0891b2', title: tr('Kai orders ek saath'), text: tr('"Kai chunein" dabayein: accept, confirm, agla qadam, courier booking, invoice print ya cancel — ek dafa me.') },
            { icon: Wallet, color: '#ea580c', title: tr('COD baqi'), text: tr('Parcel pohanch gaya magar paisa courier se nahi aaya — "COD baqi" me rehta hai. Settlement "COD & courier" safhe par.') },
          ]}
          tips={[
            tr('"Naye", "Chal rahe" aur "COD baqi" par date nahi lagti — koi purana ruka order chhupe na.'),
            tr('Talaash (search) har date me dhoondti hai.'),
            tr('Test order analytics aur report me nahi gine jate.'),
            tr('Laal "Customer ne cancel maanga" wala order bhejne se pehle zaroor dekhein.'),
          ]}
          shortcuts={[['/', 'dhoondein'], ['N', 'naye'], ['A', 'analytics'], ['S', tr('kai chunein')], ['J', 'agla'], ['K', 'pichla'], ['R', 'taaza'], ['G', 'guide']]}
          footer={<Link to="/online-orders/reports" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('Poori online report →')}</Link>}
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
        <h3 className="mt-4 text-lg font-semibold text-slate-900">{branch ? tr('{{branch}} me abhi koi online order nahi', { branch }) : tr('Abhi koi online order nahi')}</h3>
        <p className="mt-1 max-w-lg text-[0.875rem] text-slate-500">
          {tr('Channel jura hua hai — naya order aate hi yahan aayega aur ghanti bajegi.{{value}}', { value: branch && (shops?.length ?? 0) > 1 ? tr(' Doosri branch ke orders dekhne ke liye upar se branch badlein.') : '' })}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-slate-200/80">
      <span className="mx-auto flex w-fit items-center gap-2">
        {(['shopify', 'woocommerce', 'daraz', 'foodpanda', 'website'] as const).map((b) => <BrandLogo key={b} name={b} size={40} />)}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{tr('Abhi koi online order nahi aaya')}</h3>
      <p className="mx-auto mt-1 max-w-lg text-[0.875rem] text-slate-500">
        {tr('Apni website, Shopify, WooCommerce, Daraz ya Foodpanda Nafaa se jodein — 2 minute ka kaam hai. Phir har order yahan aayega, ghanti bajegi aur ek click me bill banega.')}
      </p>
      <div className="mx-auto mt-5 grid max-w-2xl gap-2 text-start sm:grid-cols-3">
        {[['1', tr('Channel jodein'), tr('Plugin, app ya link')], ['2', tr('Test order bhejein'), tr('TEST ka nishan lagta hai')], ['3', tr('Accept karein'), tr('Bill aur stock khud')]].map(([n, title, d]) => (
          <div key={n} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700 ring-1 ring-inset ring-brand-100">{n}</span>
            <p className="mt-1.5 text-[0.875rem] font-semibold text-slate-900">{title}</p>
            <p className="text-[0.75rem] text-slate-500">{d}</p>
          </div>
        ))}
      </div>
      <Link to="/online-store/connect"><Button className="mt-5" leftIcon={<Globe className="h-4 w-4" />}>{tr('Channel jodein')}</Button></Link>
    </div>
  );
}
