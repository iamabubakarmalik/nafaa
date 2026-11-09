/**
 * Orders board for every channel (manual, website, WooCommerce, Shopify,
 * Daraz, Foodpanda): status tiles with counts, filters, a dense list where
 * each order can jump to any status, row and bulk actions, the side drawer
 * with the full order, alerts for late and cancel-requested orders, and
 * analytics for the same filter.
 *
 * URL: ?board=<tile> ?channel=<id> ?search=<text> ?order=<id>
 * Keys: / search · N new orders · A analytics · S pick all · R refresh · J/K next/previous · G guide.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, BadgeCheck, BarChart3, Bell, CalendarClock, Download, Globe, GraduationCap, Inbox, ListChecks, MessageCircle, PackageCheck, Plus,
  RefreshCw, Settings2, ShoppingBag, Timer, Truck, Wallet, X,
} from 'lucide-react';
import {
  Button, PageHero, PageShell, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton, resolveRange,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { PrintButton } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { useReportRange } from '@modules/reports/prefs';
import { BrandLogo, brandForChannel } from '@/assets/brands/BrandLogo';
import { onlineOrdersApi, type OnlineOrder, type OnlineOrdersList, type OrderListQuery } from '../api/online-orders.api';
import { orderBoardApi } from '../api/order-board.api';
import { OnlineAnalytics } from '../components/analytics/OnlineAnalytics';
import { BoardFilters, CONFIRM_OPTIONS, EMPTY_FILTERS, hasBoardFilters, type BoardFilterState } from '../components/orders/BoardFilters';
import { BulkMoveBar } from '../components/orders/BulkMoveBar';
import { OrderDrawer } from '../components/orders/OrderDrawer';
import { useTeam } from '../components/orders/OrderTools';
import { OrdersTable } from '../components/orders/OrdersTable';
import { STAGES_KEY, StagesModal } from '../components/orders/StagesModal';
import { StatusTiles } from '../components/orders/StatusTiles';
import { useOrderActions } from '../components/orders/useOrderActions';
import { useLiveOnlineOrders } from '../hooks/useLiveOnlineOrders';
import { useSalesChannels } from '../hooks/useSalesChannels';
import { timeAgo } from '../lib/labels';
import { BOARD, boardEntry, downloadCsv, ordersCsvRows, statusShort } from '../lib/orders';
import { ordersDoc } from '../lib/print';
import { t as tr } from '@core/i18n';

type View = 'orders' | 'analytics';
const PAGE = 50;
const YEAR_BACK = 364;
const MANAGERS = ['OWNER', 'MANAGER', 'SUPER_ADMIN'];

const shift = (key: string, days: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

/** Tile counts from the older list answer (status counts only), used until the API sends boardCounts. */
function legacyCounts(c: OnlineOrdersList): Record<string, number> {
  const s = c.counts ?? {};
  const n = (...k: string[]) => k.reduce((a, x) => a + (s[x] ?? 0), 0);
  return {
    NEW: n('PENDING'), CONFIRMED: n('CONFIRMED', 'PREPARING'), PACKED: n('READY'), DISPATCHED: n('OUT_FOR_DELIVERY'), DELIVERED: n('DELIVERED'),
    RETURNED: n('RETURNED'), CANCELLED: n('CANCELLED', 'REJECTED'), ALL: Object.values(s).reduce((a, x) => a + x, 0),
    TODAY: c.stats?.todayOrders ?? 0, COD_DUE: c.stats?.codDueCount ?? 0,
  };
}
const countsOf = (c?: OnlineOrdersList) => (c ? c.boardCounts ?? legacyCounts(c) : undefined);

export default function OnlineOrdersPage() {
  const [params, setParams] = useSearchParams();
  const startHour = useBusinessDayStart();
  const { sales: money, salesHidden } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const role = useAuthStore((s) => s.user?.role);

  const [view, setView] = useState<View>('orders');
  const [search, setSearch] = useState(() => params.get('search') ?? '');
  const [query, setQuery] = useState(() => (params.get('search') ?? '').trim());
  const [range, setRange] = useReportRange('month');
  // `?assignedTo=` comes from the dashboard's team panel.
  const [filters, setFilters] = useState<BoardFilterState>(() => ({ ...EMPTY_FILTERS, assigned: params.get('assignedTo') ?? '' }));
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [canNotify, setCanNotify] = useState(() => typeof Notification === 'undefined' || Notification.permission !== 'default');
  const [exporting, setExporting] = useState(false);
  const [stagesOpen, setStagesOpen] = useState(false);

  // Coming from Customers (?search=phone) opens every order of that customer.
  const board = params.get('board') || (params.get('search') ? 'ALL' : 'NEW');
  const selectedId = params.get('order');
  const channelId = params.get('channel') || undefined;
  const { data: channels = [] } = useSalesChannels();
  const channel = channels.find((c) => c.id === channelId);
  const { data: team = [] } = useTeam();
  const { data: custom = [] } = useQuery({ queryKey: STAGES_KEY, queryFn: () => orderBoardApi.stages().catch(() => []), staleTime: 5 * 60_000 });

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 300); return () => clearTimeout(t); }, [search]);

  const setParam = useCallback((key: string, value?: string | null) => {
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (value) next.set(key, value); else next.delete(key);
      if (key === 'channel') next.delete('order');
      return next;
    }, { replace: true });
  }, [setParams]);
  const open = useCallback((id: string | null) => setParam('order', id), [setParam]);
  const goBoard = useCallback((key: string) => { setParam('board', key); setView('orders'); setPicked(new Set()); }, [setParam]);

  const period = resolveRange(range, startHour);
  const today = businessDayKey(new Date(), startHour);
  const reportRange = period ?? { from: shift(today, -YEAR_BACK), to: today };
  const periodText = period ? rangeLabel(period.from, period.to) : tr('Pichhle 12 mahine');
  const entry = boardEntry(board, custom) ?? BOARD[1];
  // Search looks through every date; open-work tiles never hide old orders.
  const dated = !entry.queue && !query && !!period;

  const base: OrderListQuery = {
    integrationId: channelId,
    search: query || undefined,
    pay: filters.pay || undefined,
    confirm: filters.confirm || undefined,
    courierCode: filters.courier || undefined,
    city: filters.city || undefined,
    assignedTo: filters.assigned || undefined,
    tag: filters.tag || undefined,
  };
  const listQuery: OrderListQuery = {
    ...base,
    board: board === 'ALL' ? undefined : board,
    payment: board === 'COD_DUE' ? 'COD_DUE' : undefined,
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
    enabled: view === 'orders',
  });
  // Tile counts: open-work tiles count every date, closed tiles follow the date range.
  const allQ = useQuery({
    queryKey: ['online-orders', 'counts', base],
    queryFn: () => onlineOrdersApi.list({ ...base, limit: 1 }),
    refetchInterval: 30_000,
  });
  const rangedQ = useQuery({
    queryKey: ['online-orders', 'counts', base, period?.from, period?.to],
    queryFn: () => onlineOrdersApi.list({ ...base, limit: 1, from: period!.from, to: period!.to }),
    refetchInterval: 30_000,
    enabled: !!period && !query,
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
    void listQ.refetch(); void allQ.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLive]);

  const orders = useMemo(() => listQ.data?.pages.flatMap((p) => p.items) ?? [], [listQ.data]);
  const total = listQ.data?.pages[0]?.total ?? 0;
  const tileCounts = useMemo(() => {
    const all = countsOf(allQ.data);
    if (!all) return undefined;
    const ranged = period && !query ? countsOf(rangedQ.data) : all;
    if (!ranged) return undefined;
    const out: Record<string, number> = {};
    for (const k of new Set([...Object.keys(all), ...Object.keys(ranged)])) out[k] = (boardEntry(k, custom)?.queue ?? true) ? all[k] ?? 0 : ranged[k] ?? 0;
    return out;
  }, [allQ.data, rangedQ.data, period, query, custom]);
  const alerts = allQ.data?.alerts;
  const r = reportQ.data;
  const tot = r?.totals;
  const cities = useMemo(() => (r?.byCity ?? []).map((c) => c.city).filter(Boolean).slice(0, 30), [r]);
  const tags = useMemo(() => [...new Set(orders.flatMap((o) => o.metadata?.tags ?? []))].sort(), [orders]);

  const actions = useOrderActions(open);
  const togglePick = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const step = useCallback((dir: 1 | -1) => {
    if (!orders.length) return;
    const i = orders.findIndex((o) => o.id === selectedId);
    const next = i === -1 ? 0 : Math.min(Math.max(i + dir, 0), orders.length - 1);
    open(orders[next].id);
  }, [orders, selectedId, open]);

  const filtered = hasBoardFilters(filters) || !!query;
  const clear = () => { setSearch(''); setFilters(EMPTY_FILTERS); };
  const refresh = () => { void listQ.refetch(); void allQ.refetch(); void rangedQ.refetch(); void reportQ.refetch(); };
  const filterText = [
    channel?.displayName, filters.pay === 'COD' ? tr('Sirf COD') : filters.pay === 'PAID' ? tr('Sirf paid') : '',
    filters.confirm && CONFIRM_OPTIONS.find((c) => c.value === filters.confirm)?.label, filters.city, filters.tag, query && `"${query}"`,
  ].filter(Boolean).join(' · ');

  /** Every order for the current filter, page by page (up to 1,000). */
  const fetchAll = async () => {
    const out: OnlineOrder[] = [];
    let all = 0;
    for (let offset = 0; offset < 1000; offset += 200) {
      const page = await onlineOrdersApi.list({ ...listQuery, limit: 200, offset });
      out.push(...page.items);
      all = page.total;
      if (out.length >= page.total || !page.items.length) break;
    }
    return { items: out, total: all };
  };
  const exportCsv = async () => {
    setExporting(true);
    try {
      const { items } = await fetchAll();
      if (!items.length) { toast.error(tr('Is list me koi order nahi')); return; }
      downloadCsv(`online-orders-${today}.csv`, [
        [tr('Online orders — {{value}}', { value: tenantName ?? '' })],
        [tr('List: {{listName}} · Period: {{value}}{{value2}}', { listName: entry.label, value: dated ? periodText : tr('Har date'), value2: filterText ? ` · ${filterText}` : '' })],
        [],
        ...ordersCsvRows(items),
      ]);
      toast.success(tr('{{count}} order CSV me', { count: items.length }));
    } catch { toast.error(tr('CSV nahi bani')); } finally { setExporting(false); }
  };
  const printDoc = async () => {
    const { items, total: all } = await fetchAll();
    return ordersDoc(items, entry.label, dated ? periodText : tr('Har date'), filterText, all);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); setView('orders'); window.setTimeout(() => searchRef.current?.focus(), 0); }
      else if (k === 'a') setView((v) => (v === 'analytics' ? 'orders' : 'analytics'));
      else if (k === 'n') goBoard('NEW');
      else if (k === 's' && view === 'orders') setPicked((s) => (s.size ? new Set() : new Set(orders.map((o) => o.id))));
      else if (k === 'r') { refresh(); toast.success(tr('Taaza kar diya')); }
      else if ((k === 'j' || k === 'k') && view === 'orders') { e.preventDefault(); step(k === 'j' ? 1 : -1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, step, orders]);

  const firstRun = !allQ.isLoading && !!allQ.data && (allQ.data.total ?? 0) === 0 && Object.keys(allQ.data.counts ?? {}).length === 0 && !filtered;
  const fetching = (listQ.isFetching && !listQ.isLoading) || allQ.isFetching || reportQ.isFetching;
  const newCount = tileCounts?.NEW ?? 0;

  return (
    <PageShell>
      <PageHero
        title={channel ? <span className="inline-flex min-w-0 items-center gap-2.5"><BrandLogo name={brandForChannel(channel.type, { platform: channel.platform })} size={28} /><span className="truncate">{channel.displayName}</span></span> : tr('Orders')}
        chip={<><ShoppingBag />{newCount > 0 ? tr('{{count}} naye', { count: newCount }) : periodText}</>}
        meta={tr('Har order ko seedha kisi bhi status par le jayein — bill, stock aur courier khud theek rehte hain')}
        busy={fetching}
        loading={reportQ.isLoading}
        actions={<>
          <Link to="/online-orders/new" className={heroPrimaryButton}><Plus className="h-4 w-4" /> {tr('Naya order')}</Link>
          <PrivacyToggle compact />
          {!canNotify && (
            <button type="button" onClick={() => Notification.requestPermission().finally(() => setCanNotify(true))} title={tr('Naye order par desktop alert')} className={heroButton}>
              <Bell className="h-4 w-4" /> <span className="hidden sm:inline">{tr('Alert on')}</span>
            </button>
          )}
          <button type="button" onClick={refresh} title={tr('Taaza (R)')} className={heroIconButton}><RefreshCw className={fetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></button>
          <button type="button" onClick={() => void exportCsv()} disabled={exporting || view === 'analytics'} className={heroButton}>
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">{exporting ? tr('Ban raha…') : tr('Excel')}</span>
          </button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={view === 'analytics'} /></span>
          {MANAGERS.includes(role ?? '') && (
            <button type="button" onClick={() => setStagesOpen(true)} title={tr('Apne status')} className={heroIconButton}><Settings2 className="h-4 w-4" /></button>
          )}
          <Link to="/online-store/channels" title={tr('Channels jorein')} className={heroIconButton}><Globe className="h-4 w-4" /></Link>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={tot ? [
          { label: tr('Online sale · {{netOrders}} order', { netOrders: tot.netOrders }), value: money(tot.netValue) },
          { label: tr('Ausat order'), value: money(tot.avgOrderValue), hint: tr('{{orders}} COD', { orders: r!.payment.cod.orders }) },
          { label: tr('Delivered'), value: money(tot.deliveredValue), hint: tr('{{delivered}} order', { delivered: tot.delivered }) },
          { label: tr('RTO (wapas)'), value: `${tot.rtoRate}%`, hint: `${tot.returned} / ${tot.dispatched}` },
        ] : [{ label: tr('Online sale'), value: '' }, { label: tr('Ausat order'), value: '' }, { label: tr('Delivered'), value: '' }, { label: tr('RTO'), value: '' }]}
      />

      {firstRun ? <FirstRun hasChannels={channels.length > 0} /> : (<>
        <StatusTiles counts={tileCounts} active={view === 'orders' ? board : ''} custom={custom} onPick={goBoard} />

        {alerts && alerts.stalePending.count > 0 && (
          <AlertStrip id="stale" tone="rose" icon={Timer}
            title={tr('{{count}} naya order {{staleMinutes}} minute se zyada ruka hai', { count: alerts.stalePending.count, staleMinutes: alerts.staleMinutes })}
            text={tr('Der hone par customer cancel kar deta hai — jaldi confirm karein.')}
            items={alerts.stalePending.oldest.map((o) => ({ id: o.id, label: `#${o.externalOrderNumber ?? o.externalOrderId} · ${timeAgo(o.receivedAt)}` }))}
            onPick={(id) => { goBoard('NEW'); open(id); }} />
        )}
        {alerts && alerts.cancelRequests.count > 0 && (
          <AlertStrip id="cancel" tone="amber" icon={AlertTriangle}
            title={tr('{{count}} customer ne cancel maanga hai', { count: alerts.cancelRequests.count })}
            text={tr('Parcel bhejne se pehle dekh lein — warna courier ka expense aur return dono.')}
            items={alerts.cancelRequests.latest.map((o) => ({ id: o.id, label: `#${o.externalOrderNumber ?? o.externalOrderId} · ${statusShort(o.orderStatus)}` }))}
            onPick={(id) => { goBoard('ALL'); open(id); }} />
        )}

        <BoardFilters ref={searchRef} search={search} onSearch={(v) => { setSearch(v); setView('orders'); }} query={query}
          range={range} onRange={setRange} startHour={startHour} channels={channels} channelId={channelId} onChannel={(id) => setParam('channel', id)}
          couriers={actions.couriers} cities={cities} tags={tags} team={team.filter((m) => m.isActive)} value={filters} onChange={setFilters} onClear={clear} />

        <ViewTabs value={view} onChange={setView}
          tabs={[
            { id: 'orders' as View, label: entry.label, count: view === 'orders' && listQ.data ? total : null },
            { id: 'analytics' as View, label: tr('Analytics'), icon: BarChart3 },
          ]}
          right={view === 'orders' ? (
            <span className="hidden text-[0.75rem] text-slate-500 lg:inline">{entry.queue ? tr('Is list par date nahi lagti') : query ? tr('Talaash har date me') : periodText}</span>
          ) : undefined} />

        {view === 'analytics' ? (
          !r ? <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
            : <OnlineAnalytics data={r} money={money} onTab={(tab) => goBoard(tab === 'PENDING' ? 'NEW' : tab === 'ACTIVE' ? 'CONFIRMED' : tab === 'CLOSED' ? 'CANCELLED' : tab)} />
        ) : listQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : listQ.isError && !orders.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <p className="font-semibold text-slate-900">{tr('Orders load nahi hue')}</p>
            <Button className="mt-3" variant="secondary" onClick={() => listQ.refetch()}>{tr('Dobara koshish')}</Button>
          </div>
        ) : !orders.length ? (
          <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${entry.color}17`, color: entry.color }}><entry.icon className="h-6 w-6" /></span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{query ? tr('"{{query}}" se koi order nahi mila', { query }) : tr('"{{status}}" me koi order nahi', { status: entry.label })}</h3>
            <p className="mt-1 text-[0.875rem] text-slate-500">{board === 'NEW' ? tr('Naya order aate hi ghanti bajegi aur yahan dikhega.') : tr('Date ya filter badal kar dekhein.')}</p>
            {filtered && <Button className="mt-4" variant="secondary" onClick={clear}>{tr('Filter hatayein')}</Button>}
          </div>
        ) : (
          <OrdersTable orders={orders} money={money} custom={custom} channels={channels} couriers={actions.couriers} shopName={tenantName}
            selectedId={selectedId} picked={picked} quickBusyId={actions.busyId} onToggle={togglePick}
            onToggleAll={(on) => setPicked(on ? new Set(orders.map((o) => o.id)) : new Set())} onOpen={(id) => open(id)} onQuick={actions.run} />
        )}
        {view === 'orders' && listQ.hasNextPage && (
          <button type="button" onClick={() => void listQ.fetchNextPage()} disabled={listQ.isFetchingNextPage}
            className="w-full rounded-2xl bg-white py-3 text-[0.875rem] font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50 disabled:opacity-60">
            {listQ.isFetchingNextPage ? tr('Aa rahe hain…') : tr('Aur orders dikhayein ({{count}} / {{total}})', { count: orders.length, total })}
          </button>
        )}
        {salesHidden && <p className="text-center text-[0.75rem] text-slate-400">{tr('Amount chhupi hai — upar aankh wale button se dikhayein')}</p>}
      </>)}

      {selectedId && <OrderDrawer orderId={selectedId} onClose={() => open(null)} onStep={view === 'orders' && orders.length > 1 ? step : undefined} />}
      <BulkMoveBar orders={orders} picked={picked} custom={custom} deletedView={board === 'DELETED'} onClear={() => setPicked(new Set())} onKeep={(ids) => setPicked(new Set(ids))} />
      {stagesOpen && <StagesModal stages={custom} onClose={() => setStagesOpen(false)} />}

      {guide.isOpen && (
        <PageGuide title={tr('Orders board — aasaan tareeqa')} onClose={guide.close}
          flowTitle={tr('Ek order ka safar')}
          flow={[
            { label: tr('New'), hint: tr('Order aaya'), icon: Inbox, color: '#d97706' },
            { label: tr('Confirmed'), hint: tr('Bill + stock'), icon: BadgeCheck, color: '#0284c7' },
            { label: tr('Packed'), hint: tr('Parcel tayyar'), icon: PackageCheck, color: '#7c3aed' },
            { label: tr('Dispatched'), hint: tr('Courier ko diya'), icon: Truck, color: '#ea580c' },
            { label: tr('Delivered'), hint: tr('COD aaya'), icon: Wallet, color: '#16a34a' },
          ]}
          steps={[
            { icon: Inbox, color: '#d97706', title: tr('Tiles'), text: tr('Upar har status ka tile aur us ki ginti hai. Tile dabayein to wohi orders dikhte hain.') },
            { icon: BadgeCheck, color: '#0284c7', title: tr('Status seedha badlein'), text: tr('Har order par "Status" dabayein aur koi bhi status chunein. New se Confirmed par bill khud banta hai aur stock kam hota hai.') },
            { icon: MessageCircle, color: '#16a34a', title: tr('WhatsApp confirm'), text: tr('Hare button se customer ko tayyar message jata hai. Order par "Texted" lag jata hai.') },
            { icon: ListChecks, color: '#0891b2', title: tr('Kai orders ek saath'), text: tr('Checkbox lagayein: status, assign, follow-up, tag, slips, packing list, Excel ya delete — ek dafa me.') },
            { icon: CalendarClock, color: '#db2777', title: tr('Team aur follow-up'), text: tr('"⋯" se order kisi ke zimme lagayein ya follow-up ka waqt rakhein. "Follow-up" tile me waqt aane par dikhta hai.') },
            { icon: Plus, color: '#7c3aed', title: tr('Naya order'), text: tr('WhatsApp, Instagram ya phone wale order "Naya order" se likhein, message paste karein ya Excel se laayein.') },
          ]}
          tips={[
            tr('New, Confirmed, Packed aur shipping wale tiles par date nahi lagti — koi purana ruka order chhupe na.'),
            tr('Talaash (search) har date me dhoondti hai: order #, phone ya CN.'),
            tr('Delete kiya order "Deleted" tile me rehta hai, wahan se wapas la sakte hain.'),
            tr('Apne status (jaise "Call back") upar settings button se banayein.'),
          ]}
          shortcuts={[['/', tr('dhoondein')], ['N', tr('naye')], ['A', tr('analytics')], ['S', tr('sab chunein')], ['J', tr('agla')], ['K', tr('pichla')], ['R', tr('taaza')], ['G', tr('guide')]]}
          footer={<Link to="/online-orders/reports" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('Poori online report →')}</Link>}
        />
      )}
    </PageShell>
  );
}

/** One-line alert across the page with order chips; closing hides it for this browser session. */
function AlertStrip({ id, tone, icon: Icon, title, text, items, onPick }: {
  id: string; tone: 'rose' | 'amber'; icon: typeof Timer; title: string; text: string; items: Array<{ id: string; label: string }>; onPick: (id: string) => void;
}) {
  const key = `nafaa-orders-alert-${id}`;
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem(key) === '1'; } catch { return false; } });
  if (hidden) return null;
  const hide = () => { setHidden(true); try { sessionStorage.setItem(key, '1'); } catch { /* private mode */ } };
  const box = tone === 'rose' ? 'bg-rose-50 ring-rose-200/70 text-rose-900' : 'bg-amber-50 ring-amber-200/70 text-amber-900';
  const chip = tone === 'rose' ? 'bg-white text-rose-700 ring-rose-200 hover:bg-rose-100' : 'bg-white text-amber-800 ring-amber-200 hover:bg-amber-100';
  return (
    <div role="status" className={cn('flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl px-3 py-2 ring-1', box)}>
      <Icon className="h-4 w-4 shrink-0" />
      <p className="min-w-0 text-[0.8125rem]">
        <span className="font-semibold">{title}</span>
        <span className="opacity-80 max-lg:hidden"> · {text}</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <button key={it.id} type="button" onClick={() => onPick(it.id)} className={cn('h-7 rounded-lg px-2.5 text-[0.75rem] font-semibold tabular-nums ring-1 transition', chip)}>{it.label}</button>
        ))}
      </div>
      <button type="button" onClick={hide} aria-label={tr('Band karein')} title={tr('Band karein')} className="ms-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg opacity-70 hover:bg-black/5 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function FirstRun({ hasChannels }: { hasChannels: boolean }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-slate-200/80">
      <span className="mx-auto flex w-fit items-center gap-2">
        {(['shopify', 'woocommerce', 'daraz', 'foodpanda', 'website'] as const).map((b) => <BrandLogo key={b} name={b} size={40} />)}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{tr('Abhi koi order nahi aaya')}</h3>
      <p className="mx-auto mt-1 max-w-lg text-[0.875rem] text-slate-500">
        {hasChannels
          ? tr('Channel jura hua hai — naya order aate hi yahan aayega aur ghanti bajegi. WhatsApp ya phone wala order khud bhi likh sakte hain.')
          : tr('Apni website, Shopify, WooCommerce, Daraz ya Foodpanda Nafaa se jodein — ya WhatsApp, Instagram aur phone ke order khud likhein.')}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link to="/online-orders/new"><Button leftIcon={<Plus className="h-4 w-4" />}>{tr('Naya order likhein')}</Button></Link>
        {!hasChannels && <Link to="/online-store/connect"><Button variant="secondary" leftIcon={<Globe className="h-4 w-4" />}>{tr('Channel jodein')}</Button></Link>}
      </div>
    </div>
  );
}
