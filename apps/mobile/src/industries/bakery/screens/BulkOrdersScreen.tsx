/**
 * Bulk orders (web BakeryBulkOrdersPage): weddings, offices, schools — open
 * orders by event date with advance and balance, what the kitchen has to make
 * for them, and analytics. Tap an order for its details and every step;
 * swipe for the next step, money or WhatsApp. Needs the server.
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Ban, BarChart3, CalendarDays, ChefHat, ListChecks, MessageCircle, Pencil, Plus, Printer, Receipt, ShoppingBag, Undo2, Wallet } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { BULK_PREV, bulkLines, bulkNext, bulkPrice, hoursTo, isClosedOrder, kitchenList, fmtQty } from '@nafaa/core/bakery';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Amount, Badge, Button, Card, ChipGroup, DetailRow, EmptyState, HBarList, ListRow, ListTemplate, Row, Segmented, Sheet, Skeleton, StatTile, SwipeRow, Text, useDebouncedValue, useTheme, type SwipeAction } from '@/design';
import { openWhatsApp } from '@/modules/customers/lib/contact';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { PERIOD_PRESETS, usePeriod } from '@/modules/sales/lib/period';
import { bulkOrdersApi, type BulkOrder, type BulkView } from '../api';
import { useBulkActions } from '../components/useOrderActions';
import { BULK_KEY, BULK_TYPES, bulkText, bulkTypeOf, dateTime, leftText, statusOf, stepLabel } from '../meta';
import { bulkSlip, sendSlip } from '../slip';

type Tab = 'orders' | 'kitchen' | 'analytics';
const VIEWS: Array<{ value: BulkView; label: string }> = [
  { value: 'active', label: msg('Chal rahe') }, { value: 'week', label: msg('Is hafte') }, { value: 'late', label: msg('Late') },
  { value: 'noAdvance', label: msg('Bina advance') }, { value: 'unpaid', label: msg('Paisa baqi') }, { value: 'done', label: msg('Poore / cancel') }, { value: 'all', label: msg('Sab') },
];

export function BulkOrdersScreen() {
  const th = useTheme();
  const can = usePermission();
  const lang = useBillLanguage();
  const shop = useAuthStore((s) => s.tenant?.name) ?? t('Bakery');
  const canManage = can(P.BAKERY_ORDERS_MANAGE);
  const canRefund = can(P.RETURNS_CREATE);
  const act = useBulkActions();
  const [tab, setTab] = useState<Tab>('orders');
  const [view, setView] = useState<BulkView>('active');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const an = usePeriod('year');
  const [open, setOpen] = useState<BulkOrder | null>(null);

  const q = { view, search: query || undefined, orderType: type || undefined, sort: 'due' as const };
  const list = useInfiniteQuery({
    queryKey: [BULK_KEY, 'page', q],
    queryFn: ({ pageParam }) => bulkOrdersApi.page({ ...q, page: pageParam, limit: 30 }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.page < l.pages ? l.page + 1 : undefined),
    placeholderData: (p) => p,
    refetchInterval: 60_000,
    enabled: tab === 'orders',
  });
  const sum = useQuery({ queryKey: [BULK_KEY, 'summary', tab === 'analytics' ? an.period : 'open'], queryFn: () => bulkOrdersApi.summary(tab === 'analytics' && an.period.from !== 'all' ? an.period : undefined), placeholderData: (p) => p, refetchInterval: 60_000 });
  const openQ = useQuery({ queryKey: [BULK_KEY, 'open'], queryFn: () => bulkOrdersApi.list({ open: 'true' }), enabled: tab === 'kitchen' });
  const o = sum.data?.open;
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const first = list.data?.pages[0];
  const kitchen = useMemo(() => kitchenList((openQ.data ?? []).filter((b) => !['DRAFT', 'QUOTED'].includes(b.status))), [openQ.data]);

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'orders', label: t('Orders'), icon: ShoppingBag }, { value: 'kitchen', label: t('Kya banana hai'), icon: ChefHat }, { value: 'analytics', label: t('Analytics'), icon: BarChart3 }]} />
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={ListChecks} label={t('Chal rahe')} loading={!o} value={String(o?.count ?? 0)} hint={formatMoney(o?.value ?? 0)} onPress={() => { setTab('orders'); setView('active'); }} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CalendarDays} tone="warning" label={t('Is hafte')} loading={!o} value={String(o?.week ?? 0)} hint={o?.late ? t('{{late}} late', { late: o.late }) : undefined} onPress={() => { setTab('orders'); setView('week'); }} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Wallet} tone="info" label={t('Lena baqi')} loading={!o} value={<Amount value={o?.due ?? 0} size="lg" weight="bold" compact />} onPress={() => { setTab('orders'); setView('unpaid'); }} />
      </Row>
      {tab === 'orders' && (
        <>
          <ChipGroup value={view} onChange={setView} style={{ marginHorizontal: -th.space(4) }} options={VIEWS.map((v) => ({ value: v.value, label: t(v.label), count: first?.counts?.[v.value] }))} />
          <ChipGroup value={type} onChange={setType} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Sab types') }, ...BULK_TYPES.map((x) => ({ value: x.value, label: `${x.emoji} ${t(x.label)}` }))]} />
          <CachedNote query={list} />
        </>
      )}
      {tab === 'kitchen' && (openQ.isLoading ? <Skeleton height={140} /> : !kitchen.length ? <EmptyState icon={ChefHat} title={t('Pakke bare orders me abhi kuch banana baqi nahi')} /> : (
        <Card flush title={t('Pakke orders ki cheezein')} description={t('Event ki date ke hisaab se — pehle wala upar')}>
          {kitchen.map((k, i) => (
            <ListRow key={k.key} divider={i < kitchen.length - 1} title={k.name} subtitle={`${dateTime(k.first)} · ${k.orders.join(', ')}`}
              trailing={<Text weight="bold" ltr>{`${fmtQty(k.qty)}${k.unit ? ` ${k.unit}` : ''}`}</Text>} />
          ))}
        </Card>
      ))}
      {tab === 'analytics' && (
        <>
          <ChipGroup value={an.preset} onChange={(v) => an.setPreset(v as typeof an.preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.filter((p) => p.value !== 'all').map((p) => ({ value: p.value, label: t(p.label) }))} />
          {!sum.data ? <Skeleton height={160} /> : (
            <>
              <Row gap={2}>
                <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Orders')} value={String(sum.data.totals.orders)} hint={t('{{delivered}} poore', { delivered: sum.data.totals.delivered })} />
                <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Kul rakam')} value={<Amount value={sum.data.totals.value} size="lg" weight="bold" compact />} hint={t('Mila {{collected}}', { collected: formatMoney(sum.data.totals.collected) })} />
              </Row>
              <Row gap={2}>
                <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="accent" label={t('Ausat order')} value={<Amount value={sum.data.totals.avgOrder} size="lg" weight="bold" compact />} />
                <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="info" label={t('Mehmaan')} value={String(sum.data.totals.guests)} />
              </Row>
              {sum.data.byType.length > 0 && <Card title={t('Type')}><HBarList rows={sum.data.byType.map((b) => ({ key: b.key, label: `${bulkTypeOf(b.key).emoji} ${t(bulkTypeOf(b.key).label)}`, value: b.value, display: <Text size="xs" tone="muted">{`${b.count} · ${formatMoney(b.value)}`}</Text> }))} /></Card>}
              {sum.data.topItems.length > 0 && <Card title={t('Sab se zyada mangi gayi cheezein')}><HBarList rows={sum.data.topItems.slice(0, 10).map((b) => ({ key: b.key, label: b.key, value: b.qty, display: <Text size="xs" tone="muted">{`${fmtQty(b.qty)} · ${formatMoney(b.value)}`}</Text> }))} /></Card>}
            </>
          )}
        </>
      )}
    </View>
  );

  return (
    <>
      <ListTemplate<BulkOrder>
        title={t('Bare orders')}
        grouped={false}
        search={tab === 'orders' ? { value: search, onChange: setSearch, placeholder: t('Naam, phone, order #…') } : undefined}
        summary={header}
        data={tab === 'orders' ? rows : []}
        loading={tab === 'orders' && list.isLoading}
        error={tab === 'orders' && !list.data ? list.error : undefined}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => { void list.refetch(); void sum.refetch(); void openQ.refetch(); }}
        onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        keyExtractor={(b) => b.id}
        renderItem={({ item: b }) => {
          const st = statusOf(b.status);
          const closed = isClosedOrder(b.status);
          const total = bulkPrice(b);
          const due = Math.max(total - b.paidAmount, 0);
          const left = hoursTo(b.eventDate);
          const next = bulkNext(b.status);
          const start: SwipeAction[] = canManage && next ? [{ icon: next.to === 'DELIVER' ? Receipt : ChefHat, label: stepLabel(next.step), tone: 'success', onPress: () => act.next(b) }] : [];
          const end: SwipeAction[] = [
            { icon: MessageCircle, label: t('WhatsApp'), tone: 'success', onPress: () => openWhatsApp(b.contactPhone, bulkText(b, shop, lang)) },
            ...(canManage && !closed && due > 0.5 ? [{ icon: Wallet, label: t('Paisa mila'), tone: 'brand' as const, onPress: () => act.pay(b) }] : []),
          ];
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
              <SwipeRow start={start} end={end}>
                <ListRow leading={<Text size="xl">{bulkTypeOf(b.orderType).emoji}</Text>}
                  title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{b.organizationName}</Text><Badge tone={st.tone}>{t(st.label)}</Badge></Row>}
                  subtitle={<View style={{ gap: 2 }}>
                    <Text size="sm" tone="muted" numberOfLines={1}>{bulkLines(b.items).map((l) => `${l.name} × ${fmtQty(l.qty)}`).join(', ')}</Text>
                    <Row gap={1.5} wrap><Text size="xs" tone="muted" ltr>{b.orderNumber}</Text>{!closed && <Badge tone={left !== null && left < 0 ? 'danger' : left !== null && left < 72 ? 'warning' : 'neutral'}>{leftText(left)}</Badge>}
                      {b.totalGuests ? <Text size="xs" tone="muted">{t('{{count}} mehmaan', { count: b.totalGuests })}</Text> : null}</Row>
                  </View>}
                  trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Amount value={total} weight="bold" />{!closed && due > 0.5 ? <Text size="2xs" tone="warning">{t('Baqi')} <Amount value={due} size="2xs" tone="warning" /></Text> : null}</View>}
                  onPress={() => setOpen(b)} />
              </SwipeRow>
            </View>
          );
        }}
        empty={tab === 'orders' ? <EmptyState icon={ShoppingBag} title={t('Koi bara order nahi')} message={t('Shadi, daftar, school — cheezein, rate, event aur advance')} /> : undefined}
        fab={canManage ? { icon: Plus, label: t('Naya bara order'), onPress: () => router.push('/bakery/bulk-orders/new' as never) } : undefined}
      />
      {act.sheets}
      {open && <BulkSheet b={open} canManage={canManage} canRefund={canRefund} shop={shop} lang={lang} act={act} onClose={() => setOpen(null)} />}
    </>
  );
}

function BulkSheet({ b, canManage, canRefund, shop, lang, act, onClose }: {
  b: BulkOrder; canManage: boolean; canRefund: boolean; shop: string; lang: ReturnType<typeof useBillLanguage>; act: ReturnType<typeof useBulkActions>; onClose: () => void;
}) {
  const th = useTheme();
  const total = bulkPrice(b);
  const due = Math.max(total - b.paidAmount, 0);
  const closed = isClosedOrder(b.status);
  const next = bulkNext(b.status);
  const lines = bulkLines(b.items);
  const go = (fn: () => void) => { onClose(); fn(); };
  return (
    <Sheet open onClose={onClose} title={b.organizationName} description={`${b.orderNumber} · ${t(statusOf(b.status).label)}`}
      footer={canManage && !closed && next ? <Button fullWidth size="lg" variant={next.to === 'DELIVER' ? 'success' : 'primary'} icon={next.to === 'DELIVER' ? Receipt : ChefHat} onPress={() => go(() => act.next(b))}>{stepLabel(next.step)}</Button> : undefined}>
      <View style={{ gap: th.space(3) }}>
        {!closed && b.paidAmount <= 0 && ['CONFIRMED', 'IN_PRODUCTION', 'READY'].includes(b.status) && <Card tone="warning"><Row gap={2}><AlertTriangle size={16} color={th.colors.warning.text} /><Text size="sm" style={{ flex: 1 }}>{t('Pakka order bina advance ke')}</Text></Row></Card>}
        <Card flush>
          <DetailRow label={t('Event')} value={`${bulkTypeOf(b.orderType).emoji} ${t(bulkTypeOf(b.orderType).label)} · ${dateTime(b.eventDate)}`} />
          {!!b.venue && <DetailRow label={t('Jagah')} value={b.venue} />}
          {!!b.totalGuests && <DetailRow label={t('Mehmaan')} value={String(b.totalGuests)} />}
          <DetailRow label={t('Rabta')} value={`${b.contactPerson ? `${b.contactPerson} · ` : ''}${b.contactPhone}`} />
          {b.requiresDelivery && <DetailRow label={t('Pahunchana')} value={b.deliveryAddress || b.venue || '—'} />}
          {b.requiresSetup && <DetailRow label={t('Setup')} value={b.setupTime || '✓'} />}
          <DetailRow last={!b.specialInstructions} label={t('Kul')} value={<Amount value={total} weight="bold" />} />
          {!!b.specialInstructions && <DetailRow last label={t('Hidayat')} value={b.specialInstructions} />}
        </Card>
        <Card flush title={t('Cheezein')}>
          {lines.map((l, i) => <ListRow key={i} dense divider={i < lines.length - 1} title={l.name} subtitle={`${fmtQty(l.qty)}${l.unit ? ` ${l.unit}` : ''} × ${formatMoney(l.rate)}`} trailing={<Amount value={l.qty * l.rate} />} />)}
        </Card>
        <Row gap={2}>
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Mila')} value={<Amount value={b.paidAmount} weight="bold" />} />
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="warning" label={t('Baqi')} value={<Amount value={due} weight="bold" />} />
        </Row>
        <View>
          <ListRow icon={MessageCircle} iconTone="success" title={t('WhatsApp')} onPress={() => openWhatsApp(b.contactPhone, bulkText(b, shop, lang))} />
          <ListRow icon={Printer} title={t('Customer parchi')} onPress={() => void sendSlip(bulkSlip(b, shop, false, lang), shop, lang)} />
          <ListRow icon={ChefHat} title={t('Kitchen parchi')} onPress={() => void sendSlip(bulkSlip(b, shop, true, lang), shop, lang)} />
          {canManage && !closed && due > 0.5 && <ListRow icon={Wallet} title={t('Paisa mila')} onPress={() => go(() => act.pay(b))} />}
          {canManage && !closed && <ListRow icon={Pencil} title={t('Badlein')} onPress={() => go(() => router.push(`/bakery/bulk-orders/${b.id}/edit` as never))} />}
          {canManage && !!BULK_PREV[b.status] && <ListRow icon={Undo2} title={t('Ek qadam peeche')} onPress={() => go(() => act.back(b))} />}
          {canManage && canRefund && b.status === 'CANCELLED' && Number(b.paidAmount) > 0 && <ListRow icon={Undo2} destructive title={t('Advance wapas')} onPress={() => go(() => act.refund(b))} />}
          {canManage && !closed && <ListRow icon={Ban} destructive title={t('Cancel')} onPress={() => go(() => act.cancel(b))} />}
        </View>
      </View>
    </Sheet>
  );
}
