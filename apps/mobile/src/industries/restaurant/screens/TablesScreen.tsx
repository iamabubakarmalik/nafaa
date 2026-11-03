/**
 * The restaurant floor (web TablesLayoutPage): every table by section with
 * what is happening on it — free, seated (timer, guests, waiter, running
 * bill, kitchen state), bill printed, needs cleaning, reserved or closed.
 * Tapping a table gives the next step: take an order, add dishes, print the
 * bill, take payment, move to its order, mark clean or reserve. "Floor
 * setup" adds and edits tables. Waiters land here. Refreshes every 15
 * seconds; offline it shows the last saved floor.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Ban, CalendarClock, CheckCircle2, ChefHat, Plus, Printer, Receipt, Settings2, Sparkles, Users, Utensils, Wallet, type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { minutesSince, type TableStatus } from '@nafaa/core/restaurant';
import { useAuthStore } from '@/core/auth/store';
import { formatDateTime, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Badge, Button, Card, ChipGroup, EmptyState, IconButton, ListRow, Row, Screen, Sheet, Skeleton, StatTile, Text, confirm, toast, useLayout, useTheme,
} from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { ordersApi, tablesApi, type FloorTable } from '../api';
import { usePayOrder } from '../components/PaySheet';
import { ReserveSheet, TableFormSheet } from '../components/TableForms';
import { TableTile } from '../components/TableTile';
import { FLOOR_KEY, STATUS_META, TABLE_META, apiError, duration, refreshOrders } from '../meta';
import { useOrderQueueSync } from '../offlineOrders';
import { printPreBill } from '../slips';

type Filter = 'all' | TableStatus | 'BILL';

export function TablesScreen() {
  const th = useTheme();
  const { isTablet, width } = useLayout();
  const can = usePermission();
  const online = useOnlineStatus();
  const shopName = useAuthStore((s) => s.tenant?.name) || t('Restaurant');
  const canManage = can(P.RESTAURANT_ORDERS_MANAGE);
  const canPay = can(P.POS_USE);
  const queue = useOrderQueueSync();
  const [section, setSection] = useState('all');
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<FloorTable | null>(null);
  const [edit, setEdit] = useState<FloorTable | 'new' | null>(null);
  const [reserve, setReserve] = useState<FloorTable | null>(null);
  const [setup, setSetup] = useState(false);
  const [, tick] = useState(0);

  const q = useQuery({ queryKey: [FLOOR_KEY], queryFn: () => tablesApi.floor(), refetchInterval: 15_000 });
  const floor = q.data;
  const st = floor?.stats;
  const payment = usePayOrder(() => setOpen(null));

  // Timers on the cards move every half minute without a refetch.
  useEffect(() => { const x = setInterval(() => tick((n) => n + 1), 30_000); return () => clearInterval(x); }, []);

  const act = useMutation({
    mutationFn: (run: () => Promise<unknown>) => run(),
    onSuccess: () => { refreshOrders(); setOpen(null); setEdit(null); setReserve(null); },
    onError: (e) => toast.error(apiError(e)),
  });
  const run = (fn: () => Promise<unknown>, ok: string) => {
    if (!online) { toast.warning(onlineNeededText('restaurantOrders')); return; }
    act.mutate(async () => { await fn(); toast.success(ok); });
  };

  const tables = useMemo(() => (floor?.tables ?? []).filter((x) => {
    if (section !== 'all' && (x.section || 'Main') !== section) return false;
    if (filter === 'BILL') return x.billPrinted;
    return filter === 'all' || x.liveStatus === filter;
  }), [floor, section, filter]);
  const bySection = useMemo(() => {
    const m = new Map<string, FloorTable[]>();
    for (const x of tables) m.set(x.section || 'Main', [...(m.get(x.section || 'Main') ?? []), x]);
    return [...m.entries()];
  }, [tables]);

  const pick = (f: Filter) => setFilter((x) => (x === f ? 'all' : f));
  const payTable = async (tb: FloorTable) => {
    if (!tb.currentOrder) return;
    if (!online) { toast.warning(onlineNeededText('restaurantOrders')); return; }
    try { payment.open(await ordersApi.getOne(tb.currentOrder.id)); } catch (e) { toast.error(apiError(e)); }
  };
  const billTable = (tb: FloorTable) => tb.currentOrder && run(async () => { const o = await ordersApi.printBill(tb.currentOrder!.id); printPreBill(o, shopName); }, t('Table {{tableNumber}} ka bill print', { tableNumber: tb.tableNumber }));

  const perRow = isTablet ? (width >= 1100 ? 6 : 4) : width >= 400 ? 3 : 2;
  const tileW = `${(100 - (perRow - 1) * 2.2) / perRow}%` as `${number}%`;

  const kpi = (icon: LucideIcon, tone: 'success' | 'danger' | 'accent' | 'info' | 'warning', label: string, value: number, f: Filter, hint?: React.ReactNode) => (
    <StatTile key={label} style={{ width: isTablet ? 180 : 148 }} icon={icon} tone={tone} label={label} value={String(value)} hint={filter === f ? t('Filter laga') : hint} onPress={() => pick(f)} />
  );

  return (
    <Screen
      tabBarSpace
      onBack={null}
      title={t('Tables')}
      subtitle={st ? `${t('{{total}} table', { total: st.total })} · ${t('Har 15 second taaza')}` : undefined}
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      actions={<>
        <IconButton icon={Plus} label={t('Takeaway')} onPress={() => router.push('/restaurant/orders/new?mode=TAKEAWAY' as never)} />
        {can(P.RESTAURANT_KITCHEN_VIEW) && <IconButton icon={ChefHat} label={t('Kitchen')} onPress={() => router.push('/kitchen' as never)} />}
        {canManage && <IconButton icon={Settings2} label={t('Floor setup')} variant={setup ? 'primary' : undefined} onPress={() => setSetup((v) => !v)} />}
      </>}
    >
      <CachedNote query={q} />
      {queue.items.length > 0 && (
        <Card tone="info" title={t('{{count}} order phone par rakhe hain', { count: queue.items.length })} description={online ? t('Bheje ja rahe hain…') : t('Internet aate hi kitchen ko jayenge')} />
      )}

      {st && (
        <Row gap={3}>
          <View style={{ flex: 1 }}><Text size="xs" tone="muted">{t('Chalta bill')}</Text><Amount value={st.runningBill} size="2xl" weight="bold" /></View>
          <View style={{ alignItems: 'flex-end' }}><Text size="xs" tone="muted">{t('Mehman')}</Text><Text size="xl" weight="bold" ltr>{String(st.guests)}</Text></View>
          {st.ready > 0 && <Badge tone="success" solid>{t('{{ready}} tayyar', { ready: st.ready })}</Badge>}
        </Row>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -th.space(4) }} contentContainerStyle={{ gap: th.space(2), paddingHorizontal: th.space(4) }}>
        {!st ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} width={148} height={84} radius={th.radius('xl')} />) : [
          kpi(CheckCircle2, 'success', t('Khaali'), st.available, 'AVAILABLE', t('Mehman bitha sakte hain')),
          kpi(Users, 'danger', t('Bhari'), st.occupied, 'OCCUPIED', <Amount value={st.runningBill} size="xs" tone="muted" />),
          kpi(Receipt, 'accent', t('Bill print ho gaya'), st.billPrinted, 'BILL', t('Payment ka intezar')),
          kpi(Sparkles, 'info', t('Safai'), st.cleaning, 'CLEANING', t('Saaf karke khaali karein')),
          kpi(CalendarClock, 'warning', t('Reserved'), st.reserved, 'RESERVED'),
        ]}
      </ScrollView>

      {(floor?.sections.length ?? 0) > 1 && (
        <ChipGroup value={section} onChange={setSection} style={{ marginHorizontal: -th.space(4) }}
          options={[{ value: 'all', label: t('Sab'), count: floor?.tables.length ?? 0 }, ...(floor?.sections ?? []).map((s) => ({ value: s, label: s, count: floor?.tables.filter((x) => (x.section || 'Main') === s).length ?? 0 }))]} />
      )}

      {setup && canManage && (
        <Card tone="brand" title={t('Floor setup: table par click karke badlein ya hatayein.')} action={<Button size="sm" icon={Plus} onPress={() => setEdit('new')}>{t('Nayi table')}</Button>} />
      )}

      {q.isLoading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>{Array.from({ length: 9 }, (_, i) => <Skeleton key={i} width={tileW} height={132} radius={th.radius('xl')} />)}</View>
      ) : !floor?.tables.length ? (
        <EmptyState icon={Utensils} title={t('Abhi koi table nahi')} message={t('Hall, Family, Rooftop — jitni tables hain bana lein. Bina table ke takeaway aur counter order chalte rehte hain.')}
          action={canManage ? <Button icon={Plus} onPress={() => setEdit('new')}>{t('Pehli table banayein')}</Button> : undefined} />
      ) : !tables.length ? (
        <EmptyState compact title={t('Is filter me koi table nahi')} action={<Button variant="soft" onPress={() => setFilter('all')}>{t('Filter hatayein')}</Button>} />
      ) : (
        bySection.map(([name, list]) => (
          <View key={name} style={{ gap: th.space(2) }}>
            <Row gap={2}><Text weight="semibold">{name}</Text><Text size="xs" tone="muted">{t('{{count}} / {{count2}} bhari', { count: list.filter((x) => x.liveStatus === 'OCCUPIED').length, count2: list.length })}</Text></Row>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
              {list.map((tb) => <TableTile key={tb.id} table={tb} width={tileW} setup={setup && canManage} onPress={() => (setup && canManage ? setEdit(tb) : setOpen(tb))} />)}
            </View>
          </View>
        ))
      )}

      <TableSheet tb={open} canManage={canManage} canPay={canPay} busy={act.isPending} onClose={() => setOpen(null)}
        onOrder={() => { const id = open?.id; setOpen(null); router.push(`/restaurant/orders/new?tableId=${id}` as never); }}
        onAdd={() => { const id = open?.currentOrder?.id; setOpen(null); if (id) router.push(`/restaurant/orders/new?orderId=${id}` as never); }}
        onOpenOrder={(id) => { setOpen(null); router.push(`/restaurant/orders/${id}` as never); }}
        onBill={() => open && billTable(open)}
        onPay={() => open && void payTable(open)}
        onStatus={(s, ok) => open && run(() => tablesApi.changeStatus(open.id, s), ok)}
        onReserve={() => { setReserve(open); setOpen(null); }}
        onCancelReserve={() => open && run(() => tablesApi.cancelReservation(open.id), t('Reservation khatam'))}
        onEdit={() => { setEdit(open); setOpen(null); }} />

      <TableFormSheet open={!!edit} table={edit && edit !== 'new' ? edit : null} sections={floor?.sections ?? []} saving={act.isPending} onClose={() => setEdit(null)}
        onSave={(d) => run(() => (edit === 'new' ? tablesApi.create(d) : tablesApi.update((edit as FloorTable).id, d)), edit === 'new' ? t('Table {{tableNumber}} ban gayi', { tableNumber: d.tableNumber }) : t('Table save ho gayi'))}
        onRemove={edit && edit !== 'new' ? async () => {
          const tb = edit;
          if (await confirm({ title: t('Table {{tableNumber}} hata dein?', { tableNumber: tb.tableNumber }), message: t('Purane orders record me rahenge.'), tone: 'danger', confirmLabel: t('Hatayein') })) {
            run(() => tablesApi.remove(tb.id), t('Table hata di'));
          }
        } : undefined} />
      <ReserveSheet table={reserve} saving={act.isPending} onClose={() => setReserve(null)}
        onSave={(d) => reserve && run(() => tablesApi.reserve(reserve.id, d), t('Table {{tableNumber}} reserve ho gayi', { tableNumber: reserve.tableNumber }))} />
      {payment.sheet}
    </Screen>
  );
}

function TableSheet({ tb, canManage, canPay, busy, onClose, onOrder, onAdd, onOpenOrder, onBill, onPay, onStatus, onReserve, onCancelReserve, onEdit }: {
  tb: FloorTable | null; canManage: boolean; canPay: boolean; busy: boolean; onClose: () => void;
  onOrder: () => void; onAdd: () => void; onOpenOrder: (id: string) => void; onBill: () => void; onPay: () => void;
  onStatus: (s: TableStatus, ok: string) => void; onReserve: () => void; onCancelReserve: () => void; onEdit: () => void;
}) {
  const th = useTheme();
  if (!tb) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const meta = TABLE_META[tb.liveStatus];
  const occupied = tb.liveStatus === 'OCCUPIED';
  const cur = tb.orders.find((o) => o.id === tb.currentOrder?.id);
  const due = cur ? cur.total - cur.paidAmount : tb.runningBill;
  const big = (icon: LucideIcon, label: string, onPress: () => void, primary = false) => (
    <Button key={label} size="lg" icon={icon} variant={primary ? 'primary' : 'secondary'} disabled={busy} onPress={onPress} style={{ width: '48.5%' }}>{label}</Button>
  );
  return (
    <Sheet open onClose={onClose}
      title={<Row gap={2}><Text size="lg" weight="bold">{t('Table {{tableNumber}}', { tableNumber: tb.tableNumber })}</Text><Badge tone={tb.billPrinted ? 'accent' : meta.tone} dot>{tb.billPrinted ? t('Bill print ho gaya') : t(meta.label)}</Badge></Row>}
      description={t('{{value}} · {{capacity}} kursiyan{{value2}}', { value: tb.section || 'Main', capacity: tb.capacity, value2: occupied ? t(' · {{duration}} se', { duration: duration(minutesSince(tb.occupiedAt ?? tb.currentOrder?.createdAt)) }) : '' })}>
      <View style={{ gap: th.space(3) }}>
        {occupied && (
          <Card flush>
            {tb.orders.map((o) => (
              <ListRow key={o.id} title={`${o.orderNumber}${o.parentOrderId ? t(' · alag bill') : ''}`} subtitle={t(STATUS_META[o.status]?.label ?? o.status)}
                trailing={<Amount value={o.total - o.paidAmount} weight="bold" />} chevron onPress={() => onOpenOrder(o.id)} />
            ))}
          </Card>
        )}
        {tb.liveStatus === 'RESERVED' && (
          <Card tone="warning">
            <Text size="sm">{[tb.reservedByName, tb.reservedByPhone, tb.reservedFor ? formatDateTime(tb.reservedFor) : ''].filter(Boolean).join(' · ')}</Text>
            {!!tb.reservationNote && <Text size="sm" tone="secondary">{tb.reservationNote}</Text>}
          </Card>
        )}
        {canManage && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2), justifyContent: 'space-between' }}>
            {occupied && [
              big(Plus, t('Aur item'), onAdd, true),
              big(Printer, t('Bill print ho gaya'), onBill),
              ...(canPay ? [big(Wallet, `${t('Payment')} · ${formatMoney(due)}`, onPay)] : []),
              ...(tb.currentOrder ? [big(Receipt, t('Order kholein'), () => onOpenOrder(tb.currentOrder!.id))] : []),
            ]}
            {tb.liveStatus === 'AVAILABLE' && [
              big(Plus, t('Order lein'), onOrder, true),
              ...(tb.isReservable ? [big(CalendarClock, t('Reserve karein'), onReserve)] : []),
              big(Ban, t('Band karein'), () => onStatus('OUT_OF_SERVICE', t('Table {{tableNumber}} band', { tableNumber: tb.tableNumber }))),
            ]}
            {tb.liveStatus === 'CLEANING' && [
              big(CheckCircle2, t('Saaf ho gayi — khaali'), () => onStatus('AVAILABLE', t('Table {{tableNumber}} khaali', { tableNumber: tb.tableNumber })), true),
              big(Plus, t('Seedha order lein'), onOrder),
            ]}
            {tb.liveStatus === 'RESERVED' && [
              big(Plus, t('Mehman aa gaye — order'), onOrder, true),
              big(Ban, t('Reservation khatam'), onCancelReserve),
            ]}
            {tb.liveStatus === 'OUT_OF_SERVICE' && big(CheckCircle2, t('Table chalu karein'), () => onStatus('AVAILABLE', t('Table {{tableNumber}} chalu', { tableNumber: tb.tableNumber })), true)}
          </View>
        )}
        {occupied && canPay && due > 0 && <Row justify="between"><Text size="sm" tone="secondary">{t('Baqi')}</Text><Amount value={due} weight="bold" /></Row>}
        {canManage && !occupied && <Button variant="ghost" onPress={onEdit}>{t('Table badlein')}</Button>}
      </View>
    </Sheet>
  );
}

/** Tables as a tab (waiters land here; restaurants see it next to the counter). */
export const TablesTab = TablesScreen;
