/**
 * Online orders from every channel (website, WooCommerce, Shopify, Daraz,
 * Foodpanda): status tabs with counts, search (order #, name, phone, CN),
 * filters, alerts for late and cancel-asked orders, one-tap next steps,
 * long press to pick several for bulk actions. Mirrors the web order desk
 * (integrations/online-orders/pages/OnlineOrdersPage).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, CheckSquare, ShoppingBag, SlidersHorizontal, Timer, Trophy, Truck, Wallet, XCircle, Zap,
} from 'lucide-react-native';
import {
  ORDER_TAB_IDS, isQueueTab, orderNo, tabCount, tabQuery, type OnlineOrder, type OrderListQuery, type OrderTab,
} from '@nafaa/core/online-store';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { useApiQuery } from '@/core/offline';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import {
  Amount, Button, ChipGroup, EmptyState, IconButton, ListTemplate, Sheet, Text, useDebouncedValue, useTheme,
} from '@/design';
import { ordersApi } from '../api/online';
import { BulkBar, OrderMenuSheet, ReasonSheet } from '../components/OrderSheets';
import { OrderRow } from '../components/OrderRow';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { ConnectOnWebCard, KpiStrip, Note, SavedDataNote } from '../components/bits';
import { ChannelLogo } from '../components/BrandLogo';
import { useOrderActions } from '../hooks/useOrderActions';
import { CANCEL_REASONS, CONFIRM_OPTIONS, TAB_LABEL } from '../lib/labels';
import { KEYS, useOnlineGuard } from '../lib/online';
import { PERIOD_LABEL, periodOptions, periodRange, type PeriodPreset } from '../lib/period';
import { printInvoices } from '../lib/docs';
import { useShopLanguage } from '../lib/messages';

const PAGE = 40;
type Pay = '' | 'COD' | 'PAID';
type Confirm = '' | 'CONFIRMED' | 'NO_ANSWER' | 'REFUSED' | 'NONE';

export function OrdersScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ order?: string; search?: string; channel?: string; tab?: string }>();
  const can = usePermission();
  const canManage = can(PERMISSIONS.ONLINE_ORDERS_MANAGE);
  const shopName = useAuthStore((s) => s.tenant?.name ?? '');
  const lang = useShopLanguage();
  const { guard } = useOnlineGuard();

  const [tab, setTab] = useState<OrderTab>(() => (params.search ? 'ALL' : (ORDER_TAB_IDS.some((x) => x.id === params.tab) ? params.tab as OrderTab : 'PENDING')));
  const [search, setSearch] = useState(params.search ?? '');
  const query = useDebouncedValue(search.trim(), 300);
  const [period, setPeriod] = useState<PeriodPreset>('month');
  const [channelId, setChannelId] = useState(params.channel ?? '');
  const [pay, setPay] = useState<Pay>('');
  const [confirm, setConfirm] = useState<Confirm>('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<OnlineOrder | null>(null);
  const [cancelFor, setCancelFor] = useState<OnlineOrder | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(id); }, []);
  // A push or link with ?order=<id> opens that order.
  useEffect(() => {
    if (params.order) router.push(`/online/orders/${params.order}` as never);
  }, [params.order]);

  const range = periodRange(period);
  const dated = !isQueueTab(tab) && !query && !!range;
  const listQuery: OrderListQuery = {
    integrationId: channelId || undefined,
    ...tabQuery(tab),
    search: query || undefined,
    pay: pay || undefined,
    confirm: confirm || undefined,
    ...(dated ? { from: range!.from, to: range!.to } : {}),
  };

  const listQ = useInfiniteQuery({
    queryKey: [...KEYS.orders, 'list', listQuery],
    queryFn: ({ pageParam }) => ordersApi.list({ ...listQuery, limit: PAGE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((a, p) => a + p.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
    refetchInterval: 20_000,
  });
  const countsQ = useQuery({
    queryKey: [...KEYS.orders, 'counts', channelId, range?.from, range?.to],
    queryFn: () => ordersApi.list({ integrationId: channelId || undefined, limit: 1, ...(range ? { from: range.from, to: range.to } : {}) }),
    refetchInterval: 30_000,
  });
  const reportQ = useQuery({
    queryKey: [...KEYS.report, range?.from ?? 'all', range?.to ?? 'all', channelId],
    queryFn: () => ordersApi.report({ ...(range ?? {}), integrationId: channelId || undefined }),
    staleTime: 60_000,
  });
  const channelsQ = useQuery({ queryKey: KEYS.channels, queryFn: ordersApi.channels, staleTime: 5 * 60_000 });
  const shopsQ = useApiQuery<Array<{ id: string; name: string; isActive?: boolean }>>('/shops');

  const orders = useMemo(() => listQ.data?.pages.flatMap((p) => p.items) ?? [], [listQ.data]);
  const c = countsQ.data;
  const counts = c?.counts ?? {};
  const alerts = c?.alerts;
  const r = reportQ.data;
  const channels = channelsQ.data ?? [];
  const channel = channels.find((x) => x.id === channelId);
  const activeShops = (Array.isArray(shopsQ.data) ? shopsQ.data : []).filter((s) => s.isActive !== false);
  const branchOf = useCallback((o: OnlineOrder) => (activeShops.length > 1 ? activeShops.find((s) => s.id === o.shopId)?.name : undefined), [activeShops]);

  const actions = useOrderActions();
  const open = useCallback((o: OnlineOrder) => router.push(`/online/orders/${o.id}` as never), []);
  const toggle = useCallback((o: OnlineOrder) => setPicked((s) => { const n = new Set(s); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n; }), []);
  const startPick = useCallback((o: OnlineOrder) => { if (!canManage) return; setSelecting(true); setPicked(new Set([o.id])); }, [canManage]);
  const stopPick = () => { setSelecting(false); setPicked(new Set()); };
  const refresh = () => { void listQ.refetch(); void countsQ.refetch(); void reportQ.refetch(); };
  const filtered = !!pay || !!confirm || !!channelId;
  const firstRun = !countsQ.isLoading && !!c && Object.keys(counts).length === 0 && !query && !filtered;

  const tabOptions = ORDER_TAB_IDS.map((x) => ({
    value: x.id, label: t(TAB_LABEL[x.id]), count: c ? tabCount(x.id, counts, c.rangeCounts, c.stats.codDueCount) : undefined,
  }));

  const totals = r?.totals;
  const summary = (
    <View style={{ gap: th.space(3) }}>
      <SavedDataNote query={listQ} />
      {!firstRun && (
        <KpiStrip items={[
          { key: 'new', label: t('Naye orders'), icon: Zap, tone: 'warning', loading: !c, value: String(counts.PENDING ?? 0),
            hint: alerts?.stalePending.count ? t('{{count}} der se ruke', { count: alerts.stalePending.count }) : t('Accept karne hain'), onPress: () => setTab('PENDING') },
          { key: 'active', label: t('Chal rahe'), icon: Truck, tone: 'info', loading: !c, value: String(c ? tabCount('ACTIVE', counts, null, 0) : 0), hint: t('Pack ya raste me'), onPress: () => setTab('ACTIVE') },
          { key: 'cod', label: t('COD paisa baqi'), icon: Wallet, tone: 'warning', loading: !c, value: <Amount value={c?.stats.codDueValue ?? 0} size="lg" weight="bold" />,
            hint: t('{{value}} order · dabayein', { value: c?.stats.codDueCount ?? 0 }), onPress: () => setTab('COD_DUE') },
          { key: 'sale', label: t('Online sale · {{netOrders}} order', { netOrders: totals?.netOrders ?? 0 }), icon: ShoppingBag, tone: 'success', loading: !totals,
            value: <Amount value={totals?.netValue ?? 0} size="lg" weight="bold" />, hint: range ? t(PERIOD_LABEL[period]) : t('Har date') },
          { key: 'rto', label: t('RTO (wapas)'), icon: XCircle, tone: 'danger', loading: !totals, value: `${totals?.rtoRate ?? 0}%`, hint: `${totals?.returned ?? 0} / ${totals?.dispatched ?? 0}`, onPress: () => setTab('CLOSED') },
          ...(r?.biggest ? [{ key: 'big', label: t('Sab se bara order'), icon: Trophy, tone: 'brand' as const, value: <Amount value={r.biggest.total} size="lg" weight="bold" />,
            hint: `${r.biggest.customerName} · #${r.biggest.number}`, onPress: () => router.push(`/online/orders/${r.biggest!.id}` as never) }] : []),
        ]} />
      )}
      {alerts && alerts.stalePending.count > 0 && (
        <Note tone="danger" icon={Timer}
          title={t('{{count}} naya order {{staleMinutes}} minute se zyada ruka hai', { count: alerts.stalePending.count, staleMinutes: alerts.staleMinutes })}
          action={<ChipGroup wrap value="" onChange={(id) => router.push(`/online/orders/${id}` as never)}
            options={alerts.stalePending.oldest.map((o) => ({ value: o.id, label: `#${o.externalOrderNumber ?? o.externalOrderId}` }))} />}>
          {t('Der hone par customer cancel kar deta hai — jaldi accept karein.')}
        </Note>
      )}
      {alerts && alerts.cancelRequests.count > 0 && (
        <Note tone="warning" icon={AlertTriangle}
          title={t('{{count}} customer ne cancel maanga hai', { count: alerts.cancelRequests.count })}
          action={<ChipGroup wrap value="" onChange={(id) => router.push(`/online/orders/${id}` as never)}
            options={alerts.cancelRequests.latest.map((o) => ({ value: o.id, label: `#${o.externalOrderNumber ?? o.externalOrderId}` }))} />}>
          {t('Parcel bhejne se pehle dekh lein — warna courier ka expense aur return dono.')}
        </Note>
      )}
      {(filtered || dated || selecting) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: th.space(2) }}>
          {channel && <ChannelLogo type={channel.type} platform={channel.platform} size={20} />}
          <Text size="xs" tone="muted" style={{ flex: 1 }}>
            {[channel?.displayName, pay === 'COD' ? t('Sirf COD') : pay === 'PAID' ? t('Sirf paid') : '', confirm ? t(CONFIRM_OPTIONS.find((x) => x.value === confirm)!.label) : '',
              dated ? t(PERIOD_LABEL[period]) : isQueueTab(tab) ? t('Is list par date nahi lagti') : query ? t('Talaash har date me') : ''].filter(Boolean).join(' · ')}
          </Text>
          {selecting && <Button size="sm" variant="secondary" icon={CheckSquare} onPress={() => setPicked(new Set(orders.map((o) => o.id)))}>{t('Sab chunein')}</Button>}
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ListTemplate
        title={channel ? channel.displayName : t('Online orders')}
        actions={<>
          {canManage && <IconButton icon={CheckSquare} label={selecting ? t('Chhoro') : t('Kai chunein')} variant={selecting ? 'primary' : 'ghost'} onPress={() => (selecting ? stopPick() : setSelecting(true))} />}
          <IconButton icon={SlidersHorizontal} label={t('Filters')} badge={filtered} onPress={() => setFiltersOpen(true)} />
          <OnlineMenuButton current="/online" />
        </>}
        search={{ value: search, onChange: setSearch, placeholder: t('Order #, naam, phone ya CN…') }}
        filters={{ value: tab, onChange: (v) => { setTab(v as OrderTab); stopPick(); }, options: tabOptions }}
        summary={summary}
        data={firstRun ? [] : orders}
        loading={listQ.isLoading}
        error={listQ.isError && !orders.length ? listQ.error : undefined}
        onRetry={refresh}
        refreshing={listQ.isRefetching && !listQ.isFetchingNextPage}
        onRefresh={refresh}
        onEndReached={() => { if (listQ.hasNextPage && !listQ.isFetchingNextPage) void listQ.fetchNextPage(); }}
        footer={listQ.isFetchingNextPage ? <ActivityIndicator style={{ margin: th.space(4) }} color={th.colors.brand.solid} /> : undefined}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => (
          <OrderRow order={item} now={now} staleMinutes={alerts?.staleMinutes ?? 15} branchName={branchOf(item)} selecting={selecting}
            checked={picked.has(item.id)} busy={actions.busyId === item.id} canManage={canManage}
            onOpen={open} onToggle={toggle} onLongPress={startPick}
            onAccept={guard((o: OnlineOrder) => actions.run(o, { kind: 'accept' }))}
            onNext={guard((o: OnlineOrder) => (o.nextStatus === 'OUT_FOR_DELIVERY' && !o.courierBooked ? open(o) : actions.run(o, { kind: 'next' })))}
            onMore={setMenuFor} />
        )}
        empty={firstRun ? (
          <View style={{ paddingHorizontal: th.space(4), gap: th.space(3) }}>
            <EmptyState icon={ShoppingBag} title={channels.length ? t('Abhi koi online order nahi') : t('Abhi koi online order nahi aaya')}
              message={channels.length ? t('Channel jura hua hai — naya order aate hi yahan aayega aur ghanti bajegi.') : t('Apni website, Shopify, WooCommerce, Daraz ya Foodpanda Nafaa se jodein — 2 minute ka kaam hai. Phir har order yahan aayega, ghanti bajegi aur ek click me bill banega.')} />
            {!channels.length && <ConnectOnWebCard />}
          </View>
        ) : (
          <EmptyState icon={ShoppingBag}
            title={query ? t('"{{query}}" se koi order nahi mila', { query }) : tab === 'PENDING' ? t('Koi naya order nahi') : t('Is list me koi order nahi')}
            message={tab === 'PENDING' ? t('Naya order aate hi ghanti bajegi aur yahan dikhega.') : t('Date ya filter badal kar dekhein.')}
            action={filtered ? <Button variant="secondary" onPress={() => { setPay(''); setConfirm(''); setChannelId(''); }}>{t('Filter hatayein')}</Button> : undefined} />
        )}
      />

      {selecting && (
        <BulkBar orders={orders} picked={picked} couriers={actions.couriers} onClear={stopPick} onKeep={(ids) => setPicked(new Set(ids))}
          onInvoices={(ids) => printInvoices(ids, shopName, lang)} />
      )}

      <OrderMenuSheet order={menuFor} couriers={actions.couriers} canManage={canManage} onClose={() => setMenuFor(null)}
        onAction={guard((o: OnlineOrder, a: Parameters<typeof actions.run>[1]) => actions.run(o, a))}
        onOpen={open} onCancel={setCancelFor} onInvoice={(o) => printInvoices([o.id], shopName, lang)} />

      <ReasonSheet open={!!cancelFor} reasons={CANCEL_REASONS}
        title={cancelFor ? (cancelFor.orderStatus === 'PENDING' ? t('#{{cancelTarget}} reject karein?', { cancelTarget: orderNo(cancelFor) }) : t('#{{cancelTarget}} cancel karein?', { cancelTarget: orderNo(cancelFor) })) : ''}
        description={cancelFor?.nafaaSaleId ? t('Bill void ho jayega aur saara stock wapas inventory me aa jayega.') : t('Order cancel list me chala jayega.')}
        confirmLabel={t('Haan, cancel')} loading={actions.pending}
        onClose={() => setCancelFor(null)}
        onConfirm={guard((reason: string) => { actions.run(cancelFor!, { kind: 'cancel', reason }); setCancelFor(null); })} />

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title={t('Filters')}
        footer={<Button fullWidth size="lg" onPress={() => setFiltersOpen(false)}>{t('Dikhayein')}</Button>}>
        <View style={{ gap: th.space(4) }}>
          <FilterBlock title={t('Date')} hint={t('"Naye", "Chal rahe" aur "COD baqi" par date nahi lagti — koi purana ruka order chhupe na.')}>
            <ChipGroup wrap value={period} onChange={(v) => setPeriod(v as PeriodPreset)} options={periodOptions(['today', 'week', 'month', 'quarter', 'all']).map((o) => ({ ...o, label: t(o.label) }))} />
          </FilterBlock>
          {channels.length > 1 && (
            <FilterBlock title={t('Channel')}>
              <ChipGroup wrap value={channelId} onChange={setChannelId}
                options={[{ value: '', label: t('Sab channels') }, ...channels.map((ch) => ({ value: ch.id, label: ch.displayName, count: ch.pendingOrders || undefined }))]} />
            </FilterBlock>
          )}
          <FilterBlock title={t('Paisa')}>
            <ChipGroup wrap value={pay} onChange={(v) => setPay(v as Pay)} options={[{ value: '', label: t('Sab') }, { value: 'COD', label: t('Sirf COD') }, { value: 'PAID', label: t('Sirf paid') }]} />
          </FilterBlock>
          <FilterBlock title={t('Confirm')}>
            <ChipGroup wrap value={confirm} onChange={(v) => setConfirm(v as Confirm)} options={CONFIRM_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))} />
          </FilterBlock>
          {filtered && <Button variant="ghost" onPress={() => { setPay(''); setConfirm(''); setChannelId(''); }}>{t('Filter hatayein')}</Button>}
        </View>
      </Sheet>
    </View>
  );
}

function FilterBlock({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const th = useTheme();
  return (
    <View style={{ gap: th.space(2) }}>
      <Text size="sm" weight="semibold" tone="secondary">{title}</Text>
      {children}
      {hint && <Text size="xs" tone="muted">{hint}</Text>}
    </View>
  );
}
