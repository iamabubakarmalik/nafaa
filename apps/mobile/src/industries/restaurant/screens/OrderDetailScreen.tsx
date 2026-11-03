/**
 * One restaurant order (web OrderDetailPage): dishes with their kitchen
 * state, kitchen tickets, the bill with charges, and every action a running
 * table needs — add dishes, send to kitchen, void a dish, pre-bill, take
 * payment (split by method or equal shares), move or merge tables, split the
 * bill by dishes, assign a rider, cancel. A paid order links to its bill.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Ban, Bike, ChefHat, Clock, Combine, MapPin, MoveRight, Percent, Phone, Plus, Printer, Receipt, Send, Split, Trash2, UserRound, Users, Wallet,
} from 'lucide-react-native';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { canSplitItems, equalShares, isOpenOrder, minutesSince } from '@nafaa/core/restaurant';
import { useAuthStore } from '@/core/auth/store';
import { formatDateTime, formatMoney, formatTime } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { PinCancelled, withManagerPin } from '@/core/security/ManagerPin';
import {
  Amount, Badge, Button, DetailRow, DetailSection, DetailTemplate, HeroAmount, Icon, IconButton, ListRow, PageHero, Row, StatusPill, Text, toast, useTheme,
} from '@/design';
import { Stepper } from '@/modules/pos/components/parts';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { deliveryApi, ordersApi, type OrderItem } from '../api';
import { CancelOrderSheet, ChargesSheet, MergeSheet, RiderSheet, SplitItemsSheet, VoidItemSheet } from '../components/OrderSheets';
import { usePayOrder } from '../components/PaySheet';
import { TablePickerSheet } from '../components/TablePickerSheet';
import { ITEM_STATE, MODE_META, ORDER_KEY, STATUS_META, apiError, duration, itemName, lineExtras, orderTitle, refreshOrders } from '../meta';
import { printKot, printPreBill, snapshotOf } from '../slips';

type SheetName = 'cancel' | 'charges' | 'merge' | 'split' | 'move' | 'rider' | null;

export function OrderDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const online = useOnlineStatus();
  const shopName = useAuthStore((s) => s.tenant?.name) || t('Restaurant');
  const canManage = can(P.RESTAURANT_ORDERS_MANAGE);
  const canPay = can(P.POS_USE);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [voidItem, setVoidItem] = useState<OrderItem | null>(null);
  const [people, setPeople] = useState(2);

  const q = useQuery({ queryKey: [ORDER_KEY, id], queryFn: () => ordersApi.getOne(id!), enabled: !!id, refetchInterval: 20_000 });
  const o = q.data;
  const payment = usePayOrder();

  const act = useMutation({
    mutationFn: (run: () => Promise<unknown>) => run(),
    onSuccess: () => { refreshOrders(); setSheet(null); setVoidItem(null); },
    onError: (e) => { if (!(e instanceof PinCancelled)) toast.error(apiError(e)); },
  });
  const run = (fn: () => Promise<unknown>, ok?: string) => {
    if (!online) { toast.warning(onlineNeededText('restaurantOrders')); return; }
    act.mutate(async () => { const r = await fn(); if (ok) toast.success(ok); return r; });
  };

  const open = !!o && isOpenOrder(o);
  const live = o?.items.filter((it) => !it.isReturned) ?? [];
  const voided = o?.items.filter((it) => it.isReturned) ?? [];
  const unsent = live.filter((it) => !it.sentToKitchenAt).length;
  const due = o ? Math.max(o.total - o.paidAmount, 0) : 0;
  const age = minutesSince(o?.placedAt ?? o?.createdAt);

  const sendKitchen = () => o && run(async () => {
    const before = (o.kots ?? []).map((k) => k.id);
    const res = await ordersApi.sendToKitchen(o.id);
    (res.order.kots ?? []).filter((k) => !before.includes(k.id)).forEach((k) => printKot(k, shopName));
    toast.success(t('{{count}} ticket kitchen ko gaye', { count: res.kots.length }));
  });
  const preBill = () => o && run(async () => { const r = await ordersApi.printBill(o.id); printPreBill(r, shopName); }, t('Bill print — table payment ka intezar'));
  const pay = () => {
    if (!o) return;
    if (!online) { toast.warning(onlineNeededText('restaurantOrders')); return; }
    payment.open(o, o.customerId ? { id: o.customerId, name: o.customerName ?? t('Customer') } : null);
  };

  const status = o ? STATUS_META[o.status] : null;
  const mode = o ? MODE_META[o.mode] : null;

  const summary = o && status && mode ? (
    <PageHero
      title={orderTitle(o)}
      chip={`${t(mode.label)} · ${t(status.label)}`}
      meta={`${o.orderNumber} · ${formatDateTime(o.createdAt)}${o.waiter ? ` · ${o.waiter.fullName}` : ''}`}
      stats={[
        { label: t('Kul bill'), value: <HeroAmount value={o.total} size="xl" /> },
        { label: o.saleId ? t('Mila') : t('Baqi'), value: <HeroAmount value={o.saleId ? o.paidAmount : due} size="xl" /> },
        { label: t('Dishes'), value: String(live.reduce((s, it) => s + it.quantity, 0)) },
        { label: open ? t('Waqt') : t('Token'), value: open ? duration(age) : o.token ? `#${o.token}` : '—' },
      ]}
    />
  ) : undefined;

  const bottom = o && open && canManage ? (
    <>
      <IconButton icon={Plus} label={t('Aur item')} variant="secondary" size="lg" onPress={() => router.push(`/restaurant/orders/new?orderId=${o.id}` as never)} />
      {unsent > 0
        ? <Button variant="secondary" icon={Send} style={{ flex: 1 }} loading={act.isPending} onPress={sendKitchen}>{t('Kitchen ({{unsent}})', { unsent })}</Button>
        : <Button variant="secondary" icon={Printer} style={{ flex: 1 }} loading={act.isPending} onPress={preBill}>{t('Bill')}</Button>}
      {canPay && <Button icon={Wallet} style={{ flex: 1.3 }} onPress={pay}>{formatMoney(due)}</Button>}
    </>
  ) : o?.saleId ? (
    <Button icon={Receipt} style={{ flex: 1 }} onPress={() => router.push(`/pos/receipt/${o.saleId}` as never)}>{t('Bill {{saleNumber}}', { saleNumber: o.sale?.saleNumber ?? '' })}</Button>
  ) : undefined;

  return (
    <>
      <DetailTemplate
        title={o ? orderTitle(o) : t('Order')}
        subtitle={o?.orderNumber}
        actions={o && open && canManage ? <IconButton icon={Printer} label={t('Bill print ho gaya')} onPress={preBill} /> : undefined}
        summary={summary}
        loading={q.isLoading}
        error={!o ? q.error : undefined}
        onRetry={() => void q.refetch()}
        onRefresh={() => void q.refetch()}
        refreshing={q.isRefetching}
        bottomActions={bottom}
      >
        {o && (
          <>
            <CachedNote query={q} />
            {o.status === 'CANCELLED' && (
              <Row gap={2} style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.danger.soft }}>
                <Icon icon={Ban} size={16} color={th.colors.danger.text} />
                <Text size="sm" color={th.colors.danger.text}>{t('Cancel: {{value}}', { value: o.cancellationReason || '—' })}</Text>
              </Row>
            )}
            {(o.parentOrder || (o.splitOrders?.length ?? 0) > 0) && (
              <DetailSection title={t('Alag bill')}>
                {o.parentOrder && <ListRow icon={Split} title={t('Ye bill {{order}} se alag hua', { order: o.parentOrder.orderNumber })} chevron onPress={() => router.push(`/restaurant/orders/${o.parentOrder!.id}` as never)} />}
                {o.splitOrders?.map((c) => (
                  <ListRow key={c.id} icon={Split} title={c.orderNumber} subtitle={t(STATUS_META[c.status].label)} trailing={<Amount value={c.total} weight="bold" />} chevron onPress={() => router.push(`/restaurant/orders/${c.id}` as never)} />
                ))}
              </DetailSection>
            )}

            <DetailSection title={t('Dishes')} action={open && canManage ? <Button size="sm" variant="ghost" icon={Plus} onPress={() => router.push(`/restaurant/orders/new?orderId=${o.id}` as never)}>{t('Aur item')}</Button> : undefined}>
              {!live.length ? <View style={{ padding: th.space(6), alignItems: 'center' }}><Text size="sm" tone="muted">{t('Koi dish nahi')}</Text></View> : live.map((it, i) => {
                const st = ITEM_STATE[it.sentToKitchenAt ? (it.status ?? 'PLACED') : 'UNSENT'] ?? ITEM_STATE.PLACED;
                return (
                  <Row key={it.id ?? i} gap={3} align="start" style={{ padding: th.space(3), borderBottomWidth: i === live.length - 1 ? 0 : 1, borderBottomColor: th.colors.divider }}>
                    <View style={{ minWidth: 32, height: 32, borderRadius: th.radius('md'), alignItems: 'center', justifyContent: 'center', backgroundColor: th.colors.surfaceMuted }}>
                      <Text weight="bold" ltr>{String(it.quantity)}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text weight="semibold">{itemName(it)}</Text>
                      {!!lineExtras(it) && <Text size="xs" tone="muted">{lineExtras(it)}</Text>}
                      {!!it.specialInstructions && <Text size="xs" italic color={th.colors.warning.text}>“{it.specialInstructions}”</Text>}
                      <View style={{ alignSelf: 'flex-start' }}><StatusPill tone={st.tone}>{t(st.label)}</StatusPill></View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Amount value={it.total ?? 0} weight="bold" />
                      {(it.itemDiscount ?? 0) > 0 && <Text size="xs" ltr color={th.colors.danger.text}>{`−${formatMoney(it.itemDiscount ?? 0)}`}</Text>}
                      {open && canManage && <Button size="sm" variant="ghost" icon={Trash2} onPress={() => setVoidItem(it)}>{it.sentToKitchenAt ? t('Void') : t('Hatayein')}</Button>}
                    </View>
                  </Row>
                );
              })}
              {voided.length > 0 && (
                <View style={{ padding: th.space(3), borderTopWidth: 1, borderTopColor: th.colors.divider, gap: 4 }}>
                  <Text size="xs" weight="semibold" tone="muted">{t('{{count}} item void / hataye', { count: voided.length })}</Text>
                  {voided.map((it) => <Row key={it.id} justify="between" gap={2}><Text size="xs" tone="muted" style={{ textDecorationLine: 'line-through', flex: 1 }}>{`${it.quantity}× ${it.product?.name ?? ''}`}</Text><Text size="xs" tone="muted">{it.returnReason ?? ''}</Text></Row>)}
                </View>
              )}
            </DetailSection>

            <DetailSection title={t('Kitchen tickets (KOT)')}>
              {!(o.kots ?? []).length ? <View style={{ padding: th.space(5), alignItems: 'center' }}><Text size="sm" tone="muted">{t('Abhi kitchen ko kuch nahi gaya')}</Text></View> : (o.kots ?? []).map((k) => {
                const snap = snapshotOf(k);
                const cancel = k.status === 'CANCELLED';
                return (
                  <ListRow key={k.id} icon={ChefHat} iconTone={cancel ? 'danger' : 'neutral'} title={`${k.kotNumber}${k.station ? ` · ${k.station}` : ''}`}
                    subtitle={(snap.items ?? []).map((x) => `${x.quantity}× ${x.name}`).join(', ')}
                    trailing={<Row gap={1}>
                      <Badge tone={cancel ? 'danger' : k.status === 'READY' || k.status === 'SERVED' ? 'success' : 'neutral'}>{cancel ? t('Cancel') : k.status === 'READY' ? t('Tayyar') : k.status === 'SERVED' ? t('Serve') : k.status === 'COOKING' ? t('Ban raha') : t('Naya')}</Badge>
                      <IconButton icon={Printer} label={t('Dobara print')} onPress={() => printKot(k, shopName)} />
                    </Row>} />
                );
              })}
            </DetailSection>

            <DetailSection title={t('Bill')} action={open && canManage ? <Button size="sm" variant="ghost" icon={Percent} onPress={() => setSheet('charges')}>{t('Badlein')}</Button> : undefined}>
              <DetailRow label={t('Dishes')} value={<Amount value={o.subtotal} />} />
              {o.serviceCharge > 0 && <DetailRow label={t('Service {{serviceChargePct}}%', { serviceChargePct: o.serviceChargePct })} value={<Amount value={o.serviceCharge} />} />}
              {o.taxAmount > 0 && <DetailRow label={t('Tax {{taxPct}}%', { taxPct: o.taxPct })} value={<Amount value={o.taxAmount} />} />}
              {o.deliveryFee > 0 && <DetailRow label={t('Delivery')} value={<Amount value={o.deliveryFee} />} />}
              {o.packagingFee > 0 && <DetailRow label={t('Packing')} value={<Amount value={o.packagingFee} />} />}
              {o.tip > 0 && <DetailRow label={t('Tip')} value={<Amount value={o.tip} />} />}
              {o.discount > 0 && <DetailRow label={t('Discount')} value={<Text size="sm" ltr color={th.colors.danger.text}>{`−${formatMoney(o.discount)}`}</Text>} />}
              <DetailRow label={t('Kul')} value={<Amount value={o.total} size="lg" weight="bold" />} />
              {o.paidAmount > 0 && <DetailRow label={t('Mila')} value={<Amount value={o.paidAmount} tone="success" />} />}
              {!!o.sale?.creditAmount && <DetailRow label={t('Udhaar (khata)')} value={<Amount value={o.sale.creditAmount} tone="warning" />} />}
              {(o.payments ?? []).map((p) => <DetailRow key={p.id} label={`${p.paymentMethod}${p.paidBy ? ` · ${p.paidBy}` : ''}`} value={<Amount value={p.amount} size="sm" />} />)}
              {open && due > 0 && (
                <Row justify="between" gap={2} style={{ padding: th.space(3) }}>
                  <Stepper compact value={people} unit={t('mehman')} onMinus={() => setPeople((n) => Math.max(2, n - 1))} onPlus={() => setPeople((n) => Math.min(50, n + 1))} />
                  <Text size="sm" weight="bold" ltr>{t('{{each}} har ek', { each: formatMoney(equalShares(due, people)[0]) })}</Text>
                </Row>
              )}
            </DetailSection>

            <DetailSection title={t('Order')}>
              {o.table && <ListRow dense icon={Users} title={t('Table {{tableNumber}}{{value}}{{value2}}', { tableNumber: o.table.tableNumber, value: o.table.section ? ` · ${o.table.section}` : '', value2: o.numberOfGuests ? t(' · {{numberOfGuests}} mehman', { numberOfGuests: o.numberOfGuests }) : '' })} />}
              {!!o.token && <ListRow dense icon={Receipt} title={t('Token #{{token}}', { token: o.token })} />}
              {!!o.customerName && <ListRow dense icon={UserRound} title={o.customerName} />}
              {!!o.customerPhone && <ListRow dense icon={Phone} title={o.customerPhone} chevron onPress={() => void Linking.openURL(`tel:${o.customerPhone}`)} />}
              {!!o.deliveryAddress && <ListRow dense icon={MapPin} title={o.deliveryAddress} subtitle={o.deliveryNotes ?? undefined} />}
              {!!o.specialRequests && <ListRow dense icon={Receipt} title={o.specialRequests} />}
              <ListRow dense icon={Clock} title={`${formatTime(o.createdAt)}${open ? t(' · {{age}} se', { age: duration(age) }) : ''}`} />
            </DetailSection>

            {o.mode === 'DELIVERY' && (
              <DetailSection title={t('Delivery')} action={o.status !== 'CANCELLED' && canManage ? <Button size="sm" variant="ghost" icon={Bike} onPress={() => setSheet('rider')}>{o.delivery?.rider ? t('Badlein') : t('Rider lagayein')}</Button> : undefined}>
                {o.delivery?.rider
                  ? <ListRow icon={Bike} title={o.delivery.rider.name} subtitle={o.delivery.rider.phone} trailing={<Badge tone="info">{o.delivery.status}</Badge>} />
                  : <ListRow icon={Bike} title={t('Abhi rider nahi laga')} />}
                <ListRow title={t('Delivery board →')} chevron onPress={() => router.push('/restaurant/delivery' as never)} />
              </DetailSection>
            )}

            {open && canManage && (
              <DetailSection title={t('Aur kaam')}>
                {o.mode === 'DINE_IN' && <ListRow icon={MoveRight} title={t('Table badlein')} chevron onPress={() => setSheet('move')} />}
                <ListRow icon={Combine} title={t('Order milayein')} chevron onPress={() => setSheet('merge')} />
                <ListRow icon={Split} title={t('Bill alag karein')} chevron disabled={!canSplitItems(o, live)} onPress={() => setSheet('split')} />
                <ListRow icon={Ban} title={t('Order cancel karein')} destructive onPress={() => setSheet('cancel')} />
              </DetailSection>
            )}
          </>
        )}
      </DetailTemplate>

      {o && (
        <>
          <VoidItemSheet item={voidItem} saving={act.isPending} onClose={() => setVoidItem(null)}
            onConfirm={(d) => run(() => withManagerPin(t('Kitchen ja chuka item hatane ke liye PIN'), (managerPin) => ordersApi.voidItem(o.id, voidItem!.id!, { ...d, ...(managerPin && { managerPin }) }), 'void'), t('Item hata diya'))} />
          <CancelOrderSheet order={o} open={sheet === 'cancel'} saving={act.isPending} onClose={() => setSheet(null)}
            onConfirm={(reason) => run(() => withManagerPin(t('Order cancel ke liye PIN'), (managerPin) => ordersApi.updateStatus(o.id, 'CANCELLED', { cancellationReason: reason, ...(managerPin && { managerPin }) }), 'void'), t('Order cancel ho gaya'))} />
          <ChargesSheet order={o} open={sheet === 'charges'} saving={act.isPending} onClose={() => setSheet(null)} onSave={(d) => run(() => ordersApi.update(o.id, d), t('Bill badal gaya'))} />
          <MergeSheet order={o} open={sheet === 'merge'} saving={act.isPending} onClose={() => setSheet(null)} onConfirm={(from) => run(() => ordersApi.merge(o.id, from), t('Order mil gaye'))} />
          <SplitItemsSheet order={o} open={sheet === 'split'} saving={act.isPending} onClose={() => setSheet(null)}
            onConfirm={(lines) => run(async () => {
              const r = await ordersApi.splitItems(o.id, lines);
              toast.success(t('Alag bill {{orderNumber}} ban gaya', { orderNumber: r.child.orderNumber }));
              router.push(`/restaurant/orders/${r.child.id}` as never);
            })} />
          <RiderSheet order={o} open={sheet === 'rider'} saving={act.isPending} onClose={() => setSheet(null)} onConfirm={(riderId) => run(() => deliveryApi.assign(o.id, { riderId }), t('Rider lag gaya'))} />
          <TablePickerSheet open={sheet === 'move'} value={o.tableId} onClose={() => setSheet(null)}
            onPick={(tb) => run(() => ordersApi.moveTable(o.id, tb.id), t('Table {{tableNumber}} par chale gaye', { tableNumber: tb.tableNumber }))} />
          {payment.sheet}
        </>
      )}
    </>
  );
}
