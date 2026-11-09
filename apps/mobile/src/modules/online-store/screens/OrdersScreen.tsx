/**
 * Orders board (web OnlineOrdersPage): status tiles in one horizontal row
 * with counts, search (order #, name, phone, CN), filters (date, channel,
 * courier, city, assigned to, payment, confirmation, tag), alerts for late
 * and cancel-asked orders, order cards with the WhatsApp templates and a
 * status chip that moves the order anywhere. Long press picks several for
 * bulk move, assign, tag, follow-up, courier booking and labels.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, CalendarClock, CheckSquare, FileText, Package, PackagePlus, Printer, SlidersHorizontal, Tag, Timer, Truck, UserRound,
} from 'lucide-react-native';
import { orderNo } from '@nafaa/core/online-store';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import { Button, ChipGroup, EmptyState, IconButton, ListGroup, ListRow, ListTemplate, Sheet, Text, useDebouncedValue, useTheme } from '@/design';
import { ordersApi } from '../api/online';
import { boardApi, type BoardOrder, type BoardQuery } from '../api/board';
import { BoardBulkBar } from '../components/board/BoardBulkBar';
import { BoardCard } from '../components/board/BoardCard';
import { BoardTiles } from '../components/board/BoardTiles';
import { BookCourierSheet } from '../components/board/BookCourierSheet';
import { StatusSheet } from '../components/board/StatusSheet';
import { TeamToolSheet, useTeam, type TeamTool } from '../components/board/TeamSheets';
import { WaSheet } from '../components/board/WaSheet';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { CommerceHero } from '../components/CommerceHero';
import { ConnectOnWebCard, Note, SavedDataNote } from '../components/bits';
import { useConnectedCouriers } from '../hooks/useConnectedCouriers';
import { entryLabel, useMoveOrder } from '../hooks/useMoveOrder';
import { TILES, boardEntry, boardOf, isBoardKey } from '../lib/board';
import { CONFIRM_OPTIONS } from '../lib/labels';
import { KEYS, useOnlineGuard } from '../lib/online';
import { PERIOD_LABEL, periodOptions, periodRange, type PeriodPreset } from '../lib/period';
import { printInvoices, printLabels } from '../lib/docs';
import { useShopLanguage } from '../lib/messages';

const PAGE = 40;
type Pay = '' | 'COD' | 'PAID';
type Confirm = '' | 'CONFIRMED' | 'NO_ANSWER' | 'REFUSED' | 'NONE';
interface Filters { pay: Pay; confirm: Confirm; courier: string; city: string; assigned: string; tag: string }
const EMPTY: Filters = { pay: '', confirm: '', courier: '', city: '', assigned: '', tag: '' };

export function OrdersScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ order?: string; search?: string; channel?: string; board?: string; assignedTo?: string }>();
  const can = usePermission();
  const canManage = can(PERMISSIONS.ONLINE_ORDERS_MANAGE);
  const shopName = useAuthStore((s) => s.tenant?.name ?? '');
  const lang = useShopLanguage();
  const { guard } = useOnlineGuard();

  const [board, setBoard] = useState(() => (params.search ? 'ALL' : isBoardKey(params.board) ? params.board! : 'NEW'));
  const [search, setSearch] = useState(params.search ?? '');
  const query = useDebouncedValue(search.trim(), 300);
  const [period, setPeriod] = useState<PeriodPreset>('month');
  const [channelId, setChannelId] = useState(params.channel ?? '');
  const [filters, setFilters] = useState<Filters>(() => ({ ...EMPTY, assigned: params.assignedTo ?? '' }));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [statusFor, setStatusFor] = useState<BoardOrder | null>(null);
  const [waFor, setWaFor] = useState<BoardOrder | null>(null);
  const [menuFor, setMenuFor] = useState<BoardOrder | null>(null);
  const [tool, setTool] = useState<{ kind: TeamTool; order: BoardOrder } | null>(null);
  const [book, setBook] = useState<BoardOrder[] | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(id); }, []);
  useEffect(() => { if (params.order) router.push(`/online/orders/${params.order}` as never); }, [params.order]);
  // Home tiles and links open the board on a status.
  useEffect(() => { if (isBoardKey(params.board)) setBoard(params.board!); }, [params.board]);
  useEffect(() => { if (params.assignedTo !== undefined) setFilters((f) => ({ ...f, assigned: params.assignedTo ?? '' })); }, [params.assignedTo]);

  const range = periodRange(period);
  const custom = useQuery({ queryKey: [...KEYS.orders, 'stages'], queryFn: boardApi.stages, staleTime: 5 * 60_000 }).data ?? [];
  const entry = boardEntry(board, custom) ?? TILES[1];
  const dated = !entry.queue && !query && !!range;
  const base: BoardQuery = {
    integrationId: channelId || undefined,
    search: query || undefined,
    pay: filters.pay || undefined,
    confirm: filters.confirm || undefined,
    courierCode: filters.courier || undefined,
    city: filters.city || undefined,
    assignedTo: filters.assigned || undefined,
    tag: filters.tag || undefined,
  };
  const listQuery: BoardQuery = {
    ...base,
    board: board === 'ALL' ? undefined : board,
    payment: board === 'COD_DUE' ? 'COD_DUE' : undefined,
    ...(dated ? { from: range!.from, to: range!.to } : {}),
  };

  const listQ = useInfiniteQuery({
    queryKey: [...KEYS.orders, 'board', listQuery],
    queryFn: ({ pageParam }) => boardApi.list({ ...listQuery, limit: PAGE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((a, p) => a + p.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
    refetchInterval: 20_000,
  });
  // Tile counts: open-work tiles count every date, closed tiles follow the date.
  const allQ = useQuery({ queryKey: [...KEYS.orders, 'board-counts', base], queryFn: () => boardApi.list({ ...base, limit: 1 }), refetchInterval: 30_000 });
  const rangedQ = useQuery({
    queryKey: [...KEYS.orders, 'board-counts', base, range?.from, range?.to],
    queryFn: () => boardApi.list({ ...base, limit: 1, from: range!.from, to: range!.to }),
    refetchInterval: 30_000, enabled: !!range && !query,
  });
  const reportQ = useQuery({
    queryKey: [...KEYS.report, 'cities', range?.from ?? 'all', range?.to ?? 'all', channelId],
    queryFn: () => ordersApi.report({ ...(range ?? {}), integrationId: channelId || undefined }), staleTime: 5 * 60_000,
  });
  const channelsQ = useQuery({ queryKey: KEYS.channels, queryFn: ordersApi.channels, staleTime: 5 * 60_000 });
  const couriers = useConnectedCouriers().connected;
  const team = (useTeam().data ?? []).filter((m) => m.isActive);

  const orders = useMemo(() => listQ.data?.pages.flatMap((p) => p.items) ?? [], [listQ.data]);
  const counts = useMemo(() => {
    const all = allQ.data?.boardCounts;
    if (!all) return undefined;
    const ranged = range && !query ? rangedQ.data?.boardCounts : all;
    if (!ranged) return undefined;
    const out: Record<string, number> = {};
    for (const k of new Set([...Object.keys(all), ...Object.keys(ranged)])) out[k] = (boardEntry(k, custom)?.queue ?? true) ? all[k] ?? 0 : ranged[k] ?? 0;
    return out;
  }, [allQ.data, rangedQ.data, range, query, custom]);
  const alerts = allQ.data?.alerts;
  const channels = channelsQ.data ?? [];
  const channel = channels.find((x) => x.id === channelId);
  const cities = useMemo(() => (reportQ.data?.byCity ?? []).map((c) => c.city).filter(Boolean).slice(0, 30), [reportQ.data]);
  const tags = useMemo(() => [...new Set(orders.flatMap((o) => o.metadata?.tags ?? []))].sort(), [orders]);

  const mover = useMoveOrder(custom);
  const open = useCallback((o: BoardOrder) => router.push(`/online/orders/${o.id}` as never), []);
  const toggle = useCallback((o: BoardOrder) => setPicked((s) => { const n = new Set(s); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n; }), []);
  const startPick = useCallback((o: BoardOrder) => { if (!canManage) return; setSelecting(true); setPicked(new Set([o.id])); }, [canManage]);
  const stopPick = () => { setSelecting(false); setPicked(new Set()); };
  const refresh = () => { void listQ.refetch(); void allQ.refetch(); void rangedQ.refetch(); };
  const filtered = Object.values(filters).some(Boolean) || !!channelId;
  const firstRun = !allQ.isLoading && !!allQ.data && allQ.data.total === 0 && !query && !filtered;
  const clear = () => { setFilters(EMPTY); setChannelId(''); };
  const goBoard = (k: string) => { setBoard(k); stopPick(); };
  const later = (fn: () => void) => { setMenuFor(null); setTimeout(fn, 250); };

  const teamName = (id: string) => (id === 'me' ? t('Mere orders') : id === 'none' ? t('Kisi ke paas nahi') : team.find((m) => m.id === id)?.fullName ?? id);
  const chips = [
    channel?.displayName,
    filters.pay === 'COD' ? t('Sirf COD') : filters.pay === 'PAID' ? t('Sirf paid') : '',
    filters.confirm ? t(CONFIRM_OPTIONS.find((x) => x.value === filters.confirm)!.label) : '',
    filters.courier ? couriers.find((c) => c.code === filters.courier)?.name ?? filters.courier : '',
    filters.city, filters.assigned ? teamName(filters.assigned) : '', filters.tag ? t('Tag: {{tag}}', { tag: filters.tag }) : '',
    dated ? t(PERIOD_LABEL[period]) : entry.queue ? t('Is list par date nahi lagti') : query ? t('Talaash har date me') : '',
  ].filter(Boolean).join(' · ');

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <CommerceHero list={allQ.data} loading={allQ.isLoading} />
      <SavedDataNote query={listQ} />
      <BoardTiles value={board} counts={counts} custom={custom} onChange={goBoard} />
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: th.space(2) }}>
        <Text size="sm" weight="semibold">{entryLabel(entry, board)}</Text>
        {!!chips && <Text size="xs" tone="muted" style={{ flex: 1 }} numberOfLines={2}>· {chips}</Text>}
        {filtered && <Button size="sm" variant="ghost" onPress={clear}>{t('Filter hatayein')}</Button>}
        {selecting && <Button size="sm" variant="secondary" icon={CheckSquare} onPress={() => setPicked(new Set(orders.map((o) => o.id)))}>{t('Sab chunein')}</Button>}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ListTemplate
        title={channel ? channel.displayName : t('Orders')}
        actions={<>
          {canManage && <IconButton icon={PackagePlus} label={t('Add order')} onPress={() => router.push('/online/orders/new' as never)} />}
          {canManage && <IconButton icon={CheckSquare} label={selecting ? t('Chhoro') : t('Kai chunein')} variant={selecting ? 'primary' : 'ghost'} onPress={() => (selecting ? stopPick() : setSelecting(true))} />}
          <IconButton icon={SlidersHorizontal} label={t('Filters')} badge={filtered} onPress={() => setFiltersOpen(true)} />
          <OnlineMenuButton current="/online/orders" />
        </>}
        search={{ value: search, onChange: setSearch, placeholder: t('Order #, naam, phone ya CN…') }}
        summary={summary}
        data={firstRun ? [] : orders}
        loading={listQ.isLoading}
        error={listQ.isError && !orders.length ? listQ.error : undefined}
        onRetry={refresh}
        refreshing={listQ.isRefetching && !listQ.isFetchingNextPage}
        onRefresh={refresh}
        onEndReached={() => { if (listQ.hasNextPage && !listQ.isFetchingNextPage) void listQ.fetchNextPage(); }}
        footer={listQ.isFetchingNextPage ? <ActivityIndicator style={{ margin: th.space(4) }} color={th.colors.brand.solid} /> : selecting ? <View style={{ height: 170 }} /> : undefined}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => (
          <BoardCard order={item} now={now} custom={custom} selecting={selecting} checked={picked.has(item.id)} busy={mover.busyId === item.id}
            canManage={canManage} onOpen={open} onToggle={toggle} onLongPress={startPick}
            onStatus={guard((o: BoardOrder) => setStatusFor(o))} onWhatsApp={setWaFor} onMore={setMenuFor} />
        )}
        empty={firstRun ? (
          <View style={{ paddingHorizontal: th.space(4), gap: th.space(3) }}>
            <EmptyState icon={Package} title={channels.length ? t('Abhi koi online order nahi') : t('Abhi koi online order nahi aaya')}
              message={channels.length ? t('Channel jura hua hai — naya order aate hi yahan aayega aur ghanti bajegi.') : t('Apni website, Shopify, WooCommerce, Daraz ya Foodpanda Nafaa se jodein — 2 minute ka kaam hai. Phir har order yahan aayega, ghanti bajegi aur ek click me bill banega.')}
              action={canManage ? <Button icon={PackagePlus} onPress={() => router.push('/online/orders/new' as never)}>{t('Add order')}</Button> : undefined} />
            {!channels.length && <ConnectOnWebCard />}
          </View>
        ) : (
          <EmptyState icon={Package}
            title={query ? t('"{{query}}" se koi order nahi mila', { query }) : t('{{status}} me koi order nahi', { status: entryLabel(entry, board) })}
            message={entry.queue ? t('Yahan kaam khatam — doosra dabba dekhein.') : t('Date ya filter badal kar dekhein.')}
            action={filtered ? <Button variant="secondary" onPress={clear}>{t('Filter hatayein')}</Button> : undefined} />
        )}
      />

      {selecting && (
        <BoardBulkBar orders={orders} picked={picked} custom={custom} onClear={stopPick} onKeep={(ids) => setPicked(new Set(ids))}
          onInvoices={(ids) => printInvoices(ids, shopName, lang)} />
      )}

      {mover.ui}
      <StatusSheet open={!!statusFor} title={statusFor ? `#${orderNo(statusFor)}` : ''} current={statusFor ? boardOf(statusFor) : undefined} custom={custom}
        onClose={() => setStatusFor(null)} onPick={(to) => { const o = statusFor!; setStatusFor(null); mover.request(o, to); }} />
      <WaSheet order={waFor} onClose={() => setWaFor(null)} />
      <TeamToolSheet tool={tool?.kind ?? null} ids={tool ? [tool.order.id] : []}
        current={tool ? { assignedToId: tool.order.assignedToId, followUpAt: tool.order.followUpAt, followUpNote: tool.order.followUpNote, tags: tool.order.metadata?.tags } : undefined}
        onClose={() => setTool(null)} />
      <BookCourierSheet orders={book} onClose={() => setBook(null)} />

      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor ? `#${orderNo(menuFor)}` : undefined} description={menuFor?.customerName}>
        {menuFor && (
          <ListGroup>
            {canManage && !menuFor.courierBooked && !menuFor.dispatchedAt && !!menuFor.nafaaSaleId && (
              <ListRow icon={Truck} iconTone="info" title={t('Courier par book')} onPress={guard(() => later(() => setBook([menuFor])))} />
            )}
            {!!menuFor.trackingNumber && <ListRow icon={Printer} title={t('Airway bill / label')} onPress={() => later(() => void printLabels([menuFor.id]))} />}
            {!!menuFor.nafaaSaleId && <ListRow icon={FileText} title={t('Invoice / packing slip')} onPress={() => later(() => printInvoices([menuFor.id], shopName, lang))} />}
            {canManage && <ListRow icon={UserRound} title={t('Kis ke zimme')} subtitle={menuFor.assigneeName ?? undefined} onPress={() => later(() => setTool({ kind: 'assign', order: menuFor }))} />}
            {canManage && <ListRow icon={CalendarClock} title={t('Follow-up')} onPress={() => later(() => setTool({ kind: 'follow-up', order: menuFor }))} />}
            {canManage && <ListRow icon={Tag} title={t('Tags')} onPress={() => later(() => setTool({ kind: 'tag', order: menuFor }))} />}
            <ListRow icon={Package} title={t('Poori details')} chevron onPress={() => later(() => open(menuFor))} />
          </ListGroup>
        )}
      </Sheet>

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title={t('Filters')}
        footer={<Button fullWidth size="lg" onPress={() => setFiltersOpen(false)}>{t('Dikhayein')}</Button>}>
        <View style={{ gap: th.space(4) }}>
          <FilterBlock title={t('Date')} hint={t('Kaam wale dabbon par date nahi lagti — koi purana ruka order chhupe na.')}>
            <ChipGroup wrap value={period} onChange={(v) => setPeriod(v as PeriodPreset)} options={periodOptions(['today', 'week', 'month', 'quarter', 'all']).map((o) => ({ ...o, label: t(o.label) }))} />
          </FilterBlock>
          {channels.length > 1 && (
            <FilterBlock title={t('Channel')}>
              <ChipGroup wrap value={channelId} onChange={setChannelId}
                options={[{ value: '', label: t('Sab channels') }, ...channels.map((ch) => ({ value: ch.id, label: ch.displayName, count: ch.pendingOrders || undefined }))]} />
            </FilterBlock>
          )}
          {couriers.length > 0 && (
            <FilterBlock title={t('Courier')}>
              <ChipGroup wrap value={filters.courier} onChange={(v) => setFilters((f) => ({ ...f, courier: v }))}
                options={[{ value: '', label: t('Sab couriers') }, ...couriers.map((c) => ({ value: c.code, label: c.name }))]} />
            </FilterBlock>
          )}
          {cities.length > 0 && (
            <FilterBlock title={t('Shehar')}>
              <ChipGroup wrap value={filters.city} onChange={(v) => setFilters((f) => ({ ...f, city: v }))}
                options={[{ value: '', label: t('Sab shehar') }, ...cities.map((c) => ({ value: c, label: c }))]} />
            </FilterBlock>
          )}
          <FilterBlock title={t('Kis ke zimme')}>
            <ChipGroup wrap value={filters.assigned} onChange={(v) => setFilters((f) => ({ ...f, assigned: v }))}
              options={[{ value: '', label: t('Sab') }, { value: 'me', label: t('Mere orders') }, { value: 'none', label: t('Kisi ke paas nahi') }, ...team.map((m) => ({ value: m.id, label: m.fullName }))]} />
          </FilterBlock>
          <FilterBlock title={t('Paisa')}>
            <ChipGroup wrap value={filters.pay} onChange={(v) => setFilters((f) => ({ ...f, pay: v as Pay }))} options={[{ value: '', label: t('Sab') }, { value: 'COD', label: t('Sirf COD') }, { value: 'PAID', label: t('Sirf paid') }]} />
          </FilterBlock>
          <FilterBlock title={t('Confirm')}>
            <ChipGroup wrap value={filters.confirm} onChange={(v) => setFilters((f) => ({ ...f, confirm: v as Confirm }))} options={CONFIRM_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))} />
          </FilterBlock>
          {tags.length > 0 && (
            <FilterBlock title={t('Tag')}>
              <ChipGroup wrap value={filters.tag} onChange={(v) => setFilters((f) => ({ ...f, tag: v }))} options={[{ value: '', label: t('Sab') }, ...tags.map((x) => ({ value: x, label: x }))]} />
            </FilterBlock>
          )}
          {filtered && <Button variant="ghost" onPress={clear}>{t('Filter hatayein')}</Button>}
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
