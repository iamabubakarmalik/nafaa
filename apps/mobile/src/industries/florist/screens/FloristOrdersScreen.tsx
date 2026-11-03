/**
 * Orders and delivery (web FloristOrdersPage): today, open, all and analytics.
 * Orders come from the counter bill; the step button moves an order from
 * preparation to the rider, and "delivered" closes it. Needs the server.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, ChefHat, Gift, PackageCheck, ShoppingCart, Tag, Truck, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { nextStatus, orderDue } from '@nafaa/core/industries/florist';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, ChipGroup, DetailRow, EmptyState, HBarList, Input, ListRow, ListTemplate, Row, Segmented, Sheet, Skeleton, StatTile, SwipeRow, Text, confirm, toast, useTheme, type SwipeAction } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { PERIOD_PRESETS, shortKey, usePeriod } from '@/modules/sales/lib/period';
import { OfflineNote, errorText, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { floristOrdersApi, type FloristOrder, type OrderStatus } from '../api';
import { FLORIST_KEYS, NEXT_LABEL, ORDER_STATUS, ORDER_TYPE, orderTypeLabel, refreshFlorist, slotLabel, SLOT } from '../meta';

type Tab = 'today' | 'open' | 'all' | 'analytics';
const LIMIT = 25;

export function FloristOrdersScreen() {
  const th = useTheme();
  const can = usePermission();
  const canWork = can(P.POS_USE);
  const { guard } = useDeskOnline('floristOrders');
  const { tab: tabParam, q: openWith } = useLocalSearchParams<{ tab?: string; q?: string }>();
  const [tab, setTab] = useState<Tab>(tabParam === 'today' ? 'today' : 'open');
  const [search, setSearch] = useState(openWith ?? '');
  const [status, setStatus] = useState('');
  const [orderType, setOrderType] = useState('');
  const [open, setOpen] = useState<FloristOrder | null>(null);
  const per = usePeriod('month');
  const today = todayKey();

  const params = { search: search.trim() || undefined, orderType: orderType || undefined, status: status || (tab === 'today' || tab === 'open' ? 'OPEN' : undefined), scheduledDate: tab === 'today' ? today : undefined, ...(tab === 'all' ? per.period : {}), limit: LIMIT };
  const list = usePaged([FLORIST_KEYS.orders, 'paged', tab, params], (page) => floristOrdersApi.paged({ ...params, page }).then((r) => ({ ...r, pages: Math.max(Math.ceil(r.total / LIMIT), 1) })), tab !== 'analytics');
  const todayQ = useQuery({ queryKey: [FLORIST_KEYS.orders, 'today'], queryFn: () => floristOrdersApi.paged({ status: 'OPEN', scheduledDate: today, limit: 1 }) });
  const openQ = useQuery({ queryKey: [FLORIST_KEYS.orders, 'open-counts'], queryFn: () => floristOrdersApi.paged({ status: 'OPEN', limit: 1 }) });
  const ana = useQuery({ queryKey: [FLORIST_KEYS.orders, 'analytics', per.period], queryFn: () => floristOrdersApi.analytics(per.period), enabled: tab === 'analytics' });
  const counts = openQ.data?.counts ?? {};

  const step = useMutation({
    mutationFn: ({ o, to }: { o: FloristOrder; to: OrderStatus }) => floristOrdersApi.updateStatus(o.id, { status: to }),
    onSuccess: (o) => { refreshFlorist([FLORIST_KEYS.orders]); setOpen((x) => (x?.id === o.id ? o : x)); toast.success(`${o.orderNumber}: ${t(ORDER_STATUS[o.status].label)}`); },
    onError: (e) => toast.error(errorText(e, t('Halat nahi badli'))),
  });

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Truck} tone="brand" label={t('Aaj ki delivery')} loading={todayQ.isLoading} value={String(todayQ.data?.total ?? 0)} onPress={() => setTab('today')} />
        <StatTile style={{ flex: 1 }} icon={ChefHat} tone="info" label={t('Chalu orders')} loading={openQ.isLoading} value={String(openQ.data?.total ?? 0)} hint={formatMoney(openQ.data?.totals.value ?? 0)} onPress={() => setTab('open')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={PackageCheck} tone="accent" label={t('Tayyar')} loading={openQ.isLoading} value={String(counts.READY_FOR_DELIVERY ?? 0)} onPress={() => { setTab('open'); setStatus('READY_FOR_DELIVERY'); }} />
        <StatTile style={{ flex: 1 }} icon={Gift} tone="danger" label={t('Baqi paisa (chalu)')} loading={openQ.isLoading} value={formatMoney(Math.max((openQ.data?.totals.value ?? 0) - (openQ.data?.totals.received ?? 0), 0))} />
      </Row>
      <Segmented value={tab} onChange={(v) => { setTab(v); setStatus(''); }} options={[{ value: 'today', label: t('Aaj') }, { value: 'open', label: t('Chalu') }, { value: 'all', label: t('Sab') }, { value: 'analytics', label: t('Analytics') }]} />
      {tab !== 'analytics' && (
        <>
          <ChipGroup value={status} onChange={setStatus} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Sab halat') }, ...Object.entries(ORDER_STATUS).map(([value, s]) => ({ value, label: t(s.label) }))]} />
          <ChipGroup value={orderType} onChange={setOrderType} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Har tarah') }, ...Object.entries(ORDER_TYPE).map(([value, label]) => ({ value, label: t(label) }))]} />
        </>
      )}
      {(tab === 'all' || tab === 'analytics') && <ChipGroup value={per.preset} onChange={(v) => per.setPreset(v as typeof per.preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.filter((p) => p.value !== 'all').map((p) => ({ value: p.value, label: t(p.label) }))} />}
      <OfflineNote feature="floristOrders" />
      <CachedNote query={openQ} />
      {tab === 'analytics' && <Analytics data={ana.data} loading={ana.isLoading} />}
    </View>
  );

  return (
    <>
      <ListTemplate<FloristOrder>
        title={tab === 'today' ? t('Aaj ki delivery') : t('Orders aur delivery')}
        grouped={false}
        search={tab !== 'analytics' ? { value: search, onChange: setSearch, placeholder: t('Order, bill, naam, phone ya area…') } : undefined}
        summary={header}
        data={tab === 'analytics' ? [] : list.items}
        loading={tab !== 'analytics' && list.loading}
        error={tab !== 'analytics' ? list.error : undefined}
        onRetry={list.refetch}
        refreshing={list.refreshing}
        onRefresh={() => { list.refetch(); void todayQ.refetch(); void openQ.refetch(); }}
        onEndReached={list.loadMore}
        keyExtractor={(o) => o.id}
        renderItem={({ item: o }) => {
          const next = nextStatus(o.status);
          const due = orderDue(o);
          const st = ORDER_STATUS[o.status];
          const end: SwipeAction[] = canWork && next ? [{ icon: CheckCircle2, label: t(NEXT_LABEL[o.status] ?? ''), tone: 'brand', onPress: () => guard(() => step.mutate({ o, to: next })) }] : [];
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
              <SwipeRow end={end}>
                <ListRow
                  icon={Truck} iconTone={st.tone}
                  title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{o.recipientName || o.customerName}</Text><Badge tone={st.tone}>{t(st.label)}</Badge></Row>}
                  subtitle={<View style={{ gap: 2 }}>
                    <Text size="xs" tone="muted" numberOfLines={1}>{[o.orderNumber, orderTypeLabel(o.orderType), o.area || o.deliveryAddress || o.eventVenue].filter(Boolean).join(' · ')}</Text>
                    <Text size="xs" tone="secondary">{`${o.scheduledDeliveryDate ? formatDate(o.scheduledDeliveryDate) : ''}${o.deliveryTimeSlot ? ` · ${slotLabel(o.deliveryTimeSlot)}` : ''}`}</Text>
                    {!!o.messageCard && <Text size="xs" tone="muted" numberOfLines={1} style={{ fontStyle: 'italic' }}>{`“${o.messageCard}”`}</Text>}
                  </View>}
                  trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={o.totalAmount} weight="bold" /><Text size="2xs" tone={due > 0.009 ? 'danger' : 'success'}>{due > 0.009 ? t('{{owed}} baqi', { owed: formatMoney(due) }) : t('Poora mila')}</Text></View>}
                  chevron onPress={() => setOpen(o)} />
              </SwipeRow>
            </View>
          );
        }}
        empty={tab === 'analytics' ? undefined : <EmptyState icon={Truck} title={tab === 'today' ? t('Aaj koi delivery nahi') : t('Is filter me koi order nahi')} message={t("Counter par bill banate waqt 'Delivery / order' bharein — order yahan aa jayega.")}
          action={canWork ? <Button icon={ShoppingCart} onPress={() => router.push('/pos' as never)}>{t('Counter kholein')}</Button> : undefined} />}
      />
      <OrderSheet o={open} canWork={canWork} onClose={() => setOpen(null)} onStep={(o, to) => guard(() => step.mutate({ o, to }))} />
    </>
  );
}

function OrderSheet({ o, canWork, onClose, onStep }: { o: FloristOrder | null; canWork: boolean; onClose: () => void; onStep: (o: FloristOrder, to: OrderStatus) => void }) {
  const th = useTheme();
  const { guard } = useDeskOnline('floristOrders');
  const [by, setBy] = useState('');
  const [to, setTo] = useState('');
  const [delivering, setDelivering] = useState(false);
  const deliver = useMutation({
    mutationFn: () => floristOrdersApi.confirmDelivery(o!.id, { deliveredBy: by.trim() || undefined, deliveredToName: to.trim() || undefined }),
    onSuccess: (r) => { refreshFlorist([FLORIST_KEYS.orders]); setDelivering(false); toast.success(t('{{orderNumber}} pohanch gaya', { orderNumber: r.orderNumber })); onClose(); },
    onError: (e) => toast.error(errorText(e, t('Delivery save nahi hui'))),
  });
  const cancel = async () => {
    if (!o || !(await confirm({ title: t('Order cancel?'), message: t('Order cancel karne se paisa wapas nahi hota — bill par Return karein.'), tone: 'danger', confirmLabel: t('Haan, cancel') }))) return;
    try { await floristOrdersApi.remove(o.id); refreshFlorist([FLORIST_KEYS.orders], true); toast.success(t('Order cancel — paisa bill par hai, wapas karna ho to bill par Return karein')); onClose(); }
    catch (e) { toast.error(errorText(e, t('Cancel nahi hua'))); }
  };
  if (!o) return <Sheet open={false} onClose={onClose}><View /></Sheet>;
  const next = nextStatus(o.status);
  const open = o.status !== 'DELIVERED' && o.status !== 'CANCELLED';
  const due = orderDue(o);
  const st = ORDER_STATUS[o.status];
  return (
    <Sheet open onClose={onClose} title={`${o.orderNumber} · ${t(st.label)}`} description={`${orderTypeLabel(o.orderType)}${o.scheduledDeliveryDate ? ` · ${formatDate(o.scheduledDeliveryDate)}` : ''}${o.deliveryTimeSlot ? ` · ${slotLabel(o.deliveryTimeSlot)}` : ''}`}
      footer={canWork && open ? (
        <Row gap={2}>
          {next && <Button style={{ flex: 1 }} icon={CheckCircle2} onPress={() => onStep(o, next)}>{t(NEXT_LABEL[o.status] ?? '')}</Button>}
          {o.status === 'OUT_FOR_DELIVERY' && <Button style={{ flex: 1 }} icon={Truck} onPress={() => setDelivering(true)}>{t('Pohancha diya')}</Button>}
        </Row>
      ) : undefined}>
      <View style={{ gap: th.space(3) }}>
        <Card flush>
          <DetailRow label={t('Lene wala')} value={`${o.recipientName || o.customerName}${o.recipientPhone ? ` · ${o.recipientPhone}` : ''}`} />
          {!!(o.deliveryAddress || o.area) && <DetailRow label={t('Pata')} value={[o.deliveryAddress, o.area, o.landmark].filter(Boolean).join(', ')} />}
          {!!o.eventVenue && <DetailRow label={t('Jagah')} value={`${o.eventName ? `${o.eventName} · ` : ''}${o.eventVenue}`} />}
          <DetailRow label={t('Customer')} value={`${o.customerName} · ${o.customerPhone}`} />
          {!!o.senderName && !o.isAnonymous && <DetailRow label={t('Bhejne wala')} value={o.senderName} />}
          {o.isAnonymous && <DetailRow label={t('Bhejne wala')} value={t('Naam nahi batana')} />}
          <DetailRow label={t('Total · mila {{paidAmount}}', { paidAmount: formatMoney(o.advancePaid) })} value={<Text weight="bold" ltr>{formatMoney(o.totalAmount)}</Text>} last />
        </Card>
        {!!o.messageCard && <Card tone="muted"><Text size="sm" style={{ fontStyle: 'italic' }}>{`“${o.messageCard}”`}</Text></Card>}
        {!!o.specialInstructions && <Text size="sm" tone="secondary">{o.specialInstructions}</Text>}
        {o.items?.length > 0 && (
          <Card flush>
            {o.items.map((i, k) => <ListRow key={k} divider={k < o.items.length - 1} title={i.productName} subtitle={i.customization} trailing={<Text size="sm" ltr>{`${i.quantity} × ${formatMoney(i.unitPrice)}`}</Text>} />)}
          </Card>
        )}
        {o.status === 'DELIVERED' && <Text size="sm" tone="success">{[t('Pohanch gaya'), o.deliveredToName, o.deliveredBy].filter(Boolean).join(' · ')}</Text>}
        {due > 0.009 && open && <Text size="xs" tone="muted">{t('Baqi paisa customer ke khate me hai — Khata se wasool karein.')}</Text>}
        {canWork && open && <Button variant="secondary" size="sm" icon={XCircle} onPress={() => guard(() => void cancel())}>{t('Cancel')}</Button>}
        {delivering && (
          <Sheet open onClose={() => setDelivering(false)} title={t('Pohancha diya')} description={o.orderNumber}
            footer={<Button fullWidth size="lg" loading={deliver.isPending} onPress={() => guard(() => deliver.mutate())}>{t('Haan, pohancha diya')}</Button>}>
            <View style={{ gap: 12 }}>
              <Input label={t('Kis ne pohanchaya (marzi)')} value={by} onChangeText={setBy} placeholder={t('Rider ka naam')} />
              <Input label={t('Kis ko diya (marzi)')} value={to} onChangeText={setTo} placeholder={t('Lene wale ka naam')} />
            </View>
          </Sheet>
        )}
      </View>
    </Sheet>
  );
}

function Analytics({ data, loading }: { data?: import('../api').OrdersAnalytics; loading: boolean }) {
  const th = useTheme();
  if (loading || !data) return <Skeleton height={200} />;
  const rows = (list: Array<{ key: string; count: number; value: number }>, label: (k: string) => string) =>
    list.map((r) => ({ key: r.key, label: label(r.key), value: r.value, display: <Text size="xs" tone="muted">{`${r.count} · ${formatMoney(r.value)}`}</Text> }));
  return (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Tag} tone="info" label={t('Orders')} value={String(data.orders)} />
        <StatTile style={{ flex: 1 }} icon={Gift} tone="accent" label={t('Orders ki value')} value={formatMoney(data.value)} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={CheckCircle2} tone="success" label={t('Pohanch gaye')} value={String(data.delivered)} />
        <StatTile style={{ flex: 1 }} icon={Truck} tone="warning" label={t('Delivery charges')} value={formatMoney(data.deliveryCharges)} />
      </Row>
      {data.bySlot.length > 0 && <Card title={t('Kis waqt')}><HBarList colorful rows={rows(data.bySlot, (k) => (k in SLOT ? t(SLOT[k as keyof typeof SLOT]) : t('Waqt nahi likha')))} /></Card>}
      {data.byArea.length > 0 && <Card title={t('Kahan (area)')}><HBarList colorful rows={rows(data.byArea, (k) => k)} /></Card>}
      {data.byType.length > 0 && <Card title={t('Order ki tarah')}><HBarList colorful rows={rows(data.byType, orderTypeLabel)} /></Card>}
      {data.byDay.length > 0 && <Card title={t('Din ba din')}><HBarList rows={rows(data.byDay, shortKey)} /></Card>}
    </View>
  );
}
