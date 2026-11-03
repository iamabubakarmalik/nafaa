/**
 * Order desk: every booked order with tabs for status and filters for route
 * and booker. Long-press an order to tick several; the bar at the bottom
 * approves, invoices, loads or cancels them together. Orders over the credit
 * limit ask for the manager PIN once per run.
 */

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, BadgeCheck, ClipboardList, Receipt, SlidersHorizontal, Truck, X, XCircle } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, EmptyState, IconButton, ListRow, ListTemplate, Row, Select, Sheet, Text, toast, useDebouncedValue, useTheme } from '@/design';
import { DIST_KEY, distError, distributionApi, type OrderRow } from '../api/distribution.api';
import { CachedNote, ReasonSheet, StatusChip, useRefreshDistribution } from '../components/parts';
import { DistributionGate } from '../components/DistributionGate';
import { LoadSheetSheet } from '../components/LoadSheetSheet';
import { approveOrInvoice, type RunResult } from '../lib/actions';
import { dayLabel, ORDER_STATUS, partyName, partySub, rs } from '../lib/meta';

type Tab = 'BOOKED' | 'APPROVED' | 'INVOICED' | 'LOADED' | 'DONE' | 'ALL';
const TAB_STATUS: Record<Tab, string | undefined> = {
  BOOKED: 'BOOKED', APPROVED: 'APPROVED,INVOICING', INVOICED: 'INVOICED', LOADED: 'LOADED', DONE: 'DELIVERED,PARTIAL,RETURNED', ALL: undefined,
};
const PAGE = 30;

export function OrdersScreen() {
  return <DistributionGate title={t('Orders')}><Desk /></DistributionGate>;
}

function Desk() {
  const th = useTheme();
  const refresh = useRefreshDistribution();
  const can = usePermission();
  const canManage = can(P.DISTRIBUTION_ORDERS_MANAGE);
  const canLoad = can(P.DISTRIBUTION_LOADSHEETS_MANAGE);
  const { status } = useLocalSearchParams<{ status?: string }>();
  const [tab, setTab] = useState<Tab>('BOOKED');
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 250);
  const [routeId, setRouteId] = useState('');
  const [bookerId, setBookerId] = useState('');
  const [filters, setFilters] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [loadIds, setLoadIds] = useState<string[] | null>(null);
  const [cancelIds, setCancelIds] = useState<string[] | null>(null);
  const [failures, setFailures] = useState<RunResult[]>([]);

  useEffect(() => {
    if (!status) return;
    const hit = (Object.keys(TAB_STATUS) as Tab[]).find((k) => TAB_STATUS[k]?.startsWith(status));
    setTab(hit ?? 'ALL');
  }, [status]);
  useEffect(() => { setPicked(new Set()); setFailures([]); }, [tab, routeId, bookerId, q]);

  const params = { status: TAB_STATUS[tab], routeId: routeId || undefined, bookedById: bookerId || undefined, search: q || undefined };
  const list = useInfiniteQuery({
    queryKey: [DIST_KEY, 'orders', params],
    queryFn: ({ pageParam }) => distributionApi.orders({ ...params, page: pageParam, limit: PAGE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
  const routesQ = useQuery({ queryKey: [DIST_KEY, 'routes'], queryFn: () => distributionApi.routes(), staleTime: 5 * 60_000 });
  const rows = useMemo(() => list.data?.pages.flatMap((p) => p.orders) ?? [], [list.data]);
  const first = list.data?.pages[0];
  const bookers = useMemo(() => {
    const m = new Map<string, string>();
    (routesQ.data ?? []).forEach((r) => { if (r.bookerId) m.set(r.bookerId, r.bookerName ?? t('Booker')); });
    rows.forEach((o) => { if (o.bookedByName) m.set(o.bookedById, o.bookedByName); });
    return [...m.entries()];
  }, [routesQ.data, rows]);

  const run = useMutation({
    mutationFn: ({ kind, ids }: { kind: 'approve' | 'invoice'; ids: string[] }) => approveOrInvoice(kind, ids),
    onSuccess: (r, v) => {
      const bad = r.results.filter((x) => !x.ok);
      setFailures(bad);
      if (r.invoiced) toast.success(t('{{invoiced}} Invoice ban gaye', { invoiced: r.invoiced }));
      if (bad.length) toast.error(t('{{count}} order me masla — upar dekhein', { count: bad.length }));
      if (r.pinSkipped) toast.info(t('PIN ke bagair credit wale orders Approved par ruk gaye'));
      if (!r.invoiced && !bad.length) toast.info(v.kind === 'approve' ? t('Koi order approve nahi hua') : t('Kuch nahi badla'));
      setPicked(new Set());
      void refresh();
    },
    onError: (e) => toast.error(distError(e)),
  });
  const cancel = useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason?: string }) => distributionApi.cancel(ids, reason),
    onSuccess: (r) => {
      const ok = r.results.filter((x) => x.ok).length;
      if (ok) toast.success(t('{{ok}} order cancel', { ok }));
      r.results.filter((x) => !x.ok).forEach((b) => toast.error(`${b.orderNumber}: ${b.error}`));
      setPicked(new Set()); setCancelIds(null);
      void refresh();
    },
    onError: (e) => toast.error(distError(e)),
  });

  const sel = rows.filter((o) => picked.has(o.id));
  const selValue = sel.reduce((a, o) => a + o.total, 0);
  const pickedIds = (f: (o: OrderRow) => boolean) => sel.filter(f).map((o) => o.id);
  const doApprove = () => {
    const ids = pickedIds((o) => o.status === 'BOOKED');
    if (!ids.length) return toast.info(t('Sirf Booked orders approve hote hain'));
    run.mutate({ kind: 'approve', ids });
  };
  const doInvoice = () => {
    const ids = pickedIds((o) => o.status === 'APPROVED' || o.status === 'INVOICING');
    if (!ids.length) return toast.info(t('Invoice sirf Approved orders ka banta hai — Booked ko A se approve karein'));
    run.mutate({ kind: 'invoice', ids });
  };
  const doLoad = () => {
    const ids = pickedIds((o) => o.status === 'INVOICED' && !o.loadSheetId);
    if (!ids.length) return toast.info(t('Sirf Invoiced orders load sheet me jate hain'));
    setLoadIds(ids);
  };
  const doCancel = () => {
    const ids = pickedIds((o) => o.status === 'BOOKED' || o.status === 'APPROVED');
    if (!ids.length) return toast.info(t('Sirf Booked ya Approved order cancel hota hai'));
    setCancelIds(ids);
  };
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const TABS = [
    { value: 'BOOKED', label: t('Booked') }, { value: 'APPROVED', label: t('Approved') }, { value: 'INVOICED', label: t('Invoiced') },
    { value: 'LOADED', label: t('Gaari par') }, { value: 'DONE', label: t('Delivered') }, { value: 'ALL', label: t('Sab') },
  ] as const;
  const filtered = !!routeId || !!bookerId;

  return (
    <View style={{ flex: 1 }}>
      <ListTemplate<OrderRow>
        title={t('Orders')}
        subtitle={first ? `${first.total} · ${rs(first.totalValue)}` : undefined}
        actions={<IconButton icon={SlidersHorizontal} label={t('Filters')} badge={filtered ? 1 : undefined} onPress={() => setFilters(true)} />}
        search={{ value: search, onChange: setSearch, placeholder: t('Order, customer ya dukaan') }}
        filters={{ value: tab, onChange: (v) => setTab(v as Tab), options: TABS.map((x) => ({ value: x.value, label: x.label })) }}
        summary={<View style={{ gap: th.space(2) }}>
          <CachedNote query={list} />
          {failures.map((f) => (
            <Row key={f.id} gap={2} style={{ backgroundColor: th.colors.danger.soft, borderRadius: th.radius('lg'), padding: th.space(3) }}>
              <AlertTriangle size={16} color={th.colors.danger.text} />
              <Text size="sm" tone="danger" style={{ flex: 1 }}>{f.orderNumber}: {f.error}</Text>
            </Row>
          ))}
        </View>}
        data={rows}
        loading={list.isLoading}
        error={list.isError && !rows.length ? list.error : undefined}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        keyExtractor={(o) => o.id}
        renderItem={({ item: o }) => {
          const on = picked.has(o.id);
          return (
            <ListRow
              selected={on}
              title={partyName(o.customer)}
              subtitle={`${o.orderNumber} · ${dayLabel(o.bookedAt)}${partySub(o.customer) ? ` · ${partySub(o.customer)}` : ''}`}
              overline={o.status === 'BOOKED' && o.creditWarning ? t('Credit') : undefined}
              trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}><Amount value={o.total} weight="bold" /><StatusChip meta={ORDER_STATUS[o.status]} /></View>}
              chevron={!picked.size}
              onPress={() => (picked.size ? toggle(o.id) : router.push(`/distribution/orders/${o.id}` as never))}
              onLongPress={() => toggle(o.id)}
            />
          );
        }}
        empty={<EmptyState icon={ClipboardList} title={t('Koi order nahi')} message={t('Booker ke orders yahan aayenge.')} />}
      />

      {picked.size > 0 && (
        <View style={{ position: 'absolute', start: th.space(3), end: th.space(3), bottom: th.space(4), backgroundColor: th.colors.surface, borderWidth: 1, borderColor: th.colors.border, borderRadius: th.radius('xl'), padding: th.space(3), gap: th.space(2), shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
          <Row justify="between">
            <Text size="sm" weight="semibold">{t('{{count}} orders', { count: picked.size })} · {rs(selValue)}</Text>
            <IconButton icon={X} label={t('Band karein')} size="sm" variant="ghost" onPress={() => setPicked(new Set())} />
          </Row>
          <Row gap={2}>
            {canManage && <Button style={{ flex: 1 }} size="md" icon={BadgeCheck} loading={run.isPending} onPress={doApprove}>{t('Approve')}</Button>}
            {canManage && <Button style={{ flex: 1 }} size="md" variant="secondary" icon={Receipt} loading={run.isPending} onPress={doInvoice}>{t('Invoice')}</Button>}
          </Row>
          <Row gap={2}>
            {canLoad && <Button style={{ flex: 1 }} size="md" variant="secondary" icon={Truck} onPress={doLoad}>{t('Load sheet')}</Button>}
            {canManage && <Button style={{ flex: 1 }} size="md" variant="danger" icon={XCircle} onPress={doCancel}>{t('Cancel')}</Button>}
          </Row>
        </View>
      )}

      <Sheet open={filters} onClose={() => setFilters(false)} title={t('Filters')}
        footer={<Button fullWidth variant="secondary" onPress={() => { setRouteId(''); setBookerId(''); setFilters(false); }}>{t('Clear')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <Select label={t('Route')} value={routeId} onChange={setRouteId} placeholder={t('Sab routes')}
            options={[{ value: '', label: t('Sab routes') }, ...(routesQ.data ?? []).map((r) => ({ value: r.id, label: r.name, description: r.area ?? undefined }))]} />
          <Select label={t('Booker')} value={bookerId} onChange={setBookerId} placeholder={t('Sab')}
            options={[{ value: '', label: t('Sab') }, ...bookers.map(([id, name]) => ({ value: id, label: name }))]} />
        </View>
      </Sheet>
      <LoadSheetSheet open={!!loadIds} orderIds={loadIds ?? undefined} onClose={() => setLoadIds(null)} />
      <ReasonSheet open={!!cancelIds} title={t('{{count}} order cancel karein?', { count: cancelIds?.length ?? 0 })}
        description={t('Cancel order wapas nahi aata. Booker ko naya order book karna hoga.')} confirmLabel={t('Cancel order')} busy={cancel.isPending}
        onClose={() => setCancelIds(null)} onSubmit={(reason) => cancel.mutate({ ids: cancelIds ?? [], reason: reason || undefined })} />
    </View>
  );
}
