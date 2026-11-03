/**
 * Delivery board (web DeliveryTrackingPage): delivery orders by stage —
 * needs a rider, rider assigned, on the way, cash with the rider — with the
 * next step on each card, and the cash hand-over that turns delivered orders
 * into cash bills (optionally paying the rider's fee from the drawer).
 * Needs the server; the last board stays readable offline.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bike, CheckCircle2, HandCoins, MapPin, Navigation, PackageCheck, Phone, Plus, Users, XCircle } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { minutesSince, settleTotals } from '@nafaa/core/restaurant';
import { apiErrorMessage } from '@/core/api/errors';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Badge, Button, Card, Checkbox, Chip, ChipGroup, EmptyState, IconButton, Input, ListRow, Row, Screen, Sheet, Skeleton, StatTile, Text, toast, useLayout, useTheme,
} from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { duration, refreshOrders } from '../../meta';
import { deliveryBoardApi, ridersManageApi, type BoardOrder, type DeliveryStage, type RiderCash } from '../api';
import { MENU_KEYS, STAGES } from '../meta';

export function DeliveryScreen() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const can = usePermission();
  const canManage = can(P.RESTAURANT_ORDERS_MANAGE);
  const canPay = can(P.POS_USE);
  const online = useOnlineStatus();
  const [stage, setStage] = useState<Exclude<DeliveryStage, 'done'> | 'done'>('needsRider');
  const [assign, setAssign] = useState<BoardOrder | null>(null);
  const [fail, setFail] = useState<BoardOrder | null>(null);
  const [settle, setSettle] = useState<RiderCash | null>(null);
  const board = useQuery({ queryKey: [MENU_KEYS.delivery], queryFn: () => deliveryBoardApi.board(), refetchInterval: 15_000 });
  const cash = useQuery({ queryKey: [MENU_KEYS.riderCash], queryFn: () => deliveryBoardApi.riderCash(), refetchInterval: 30_000 });
  const rows = board.data ?? [];
  const by = (s: DeliveryStage) => rows.filter((o) => o.stage === s);
  const cashTotal = (cash.data ?? []).reduce((n, r) => n + r.amount, 0);
  const guard = (run: () => void) => { if (!online) { toast.warning(onlineNeededText('restaurantOrders')); return; } run(); };
  const step = useMutation({
    mutationFn: ({ id, status, failureReason }: { id: string; status: string; failureReason?: string }) => deliveryBoardApi.updateStatus(id, { status, failureReason }),
    onSuccess: () => { refreshOrders(); setFail(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const card = (o: BoardOrder) => <DeliveryCard key={o.id} o={o} canManage={canManage} busy={step.isPending && step.variables?.id === o.id}
    onAssign={() => guard(() => setAssign(o))} onFail={() => guard(() => setFail(o))} onStep={(status) => guard(() => step.mutate({ id: o.id, status }))} />;

  return (
    <>
      <Screen title={t('Delivery')} subtitle={t('Har 15 second taaza')} onRefresh={() => { void board.refetch(); void cash.refetch(); }} refreshing={board.isRefetching}
        actions={<Row gap={1}>
          <IconButton icon={Users} label={t('Riders')} onPress={() => router.push('/restaurant/riders' as never)} />
          <IconButton icon={Plus} label={t('Delivery order')} onPress={() => router.push('/restaurant/orders/new?mode=DELIVERY' as never)} />
        </Row>}>
        <View style={{ gap: th.space(3) }}>
          <Row gap={2}>
            <StatTile style={{ flex: 1 }} icon={HandCoins} tone="warning" label={t('Riders ke paas cash')} loading={cash.isLoading} value={<Amount value={cashTotal} size="lg" weight="bold" />} hint={t('{{count}} rider', { count: (cash.data ?? []).length })} />
            <StatTile style={{ flex: 1 }} icon={Bike} tone="danger" label={t('Rider chahiye')} loading={board.isLoading} value={String(by('needsRider').length)} onPress={() => setStage('needsRider')} />
          </Row>
          <Row gap={2}>
            <StatTile style={{ flex: 1 }} icon={Navigation} tone="accent" label={t('Raste me')} loading={board.isLoading} value={String(by('onTheWay').length + by('assigned').length)} onPress={() => setStage('onTheWay')} />
            <StatTile style={{ flex: 1 }} icon={CheckCircle2} tone="success" label={t('Aaj deliver hue')} loading={board.isLoading} value={String(by('done').length + by('cash').length)} onPress={() => setStage('done')} />
          </Row>
          {(cash.data ?? []).length > 0 && (
            <Card flush title={t('Cash rider ke paas')}>
              {(cash.data ?? []).map((r, i, a) => (
                <ListRow key={r.rider.id} divider={i < a.length - 1} icon={HandCoins} iconTone="warning" title={r.rider.name}
                  subtitle={canPay ? t('{{count}} order · cash lein', { count: r.orders.length }) : t('{{count}} order', { count: r.orders.length })}
                  trailing={<Amount value={r.amount} weight="bold" />} chevron={canPay} onPress={canPay ? () => guard(() => setSettle(r)) : undefined} />
              ))}
            </Card>
          )}
          <CachedNote query={board} />
          {board.isLoading ? <Skeleton height={220} /> : !rows.length ? (
            <EmptyState icon={Bike} title={t('Abhi koi delivery nahi')} action={<Button icon={Plus} onPress={() => router.push('/restaurant/orders/new?mode=DELIVERY' as never)}>{t('Delivery order lein')}</Button>} />
          ) : isTablet ? (
            <Row gap={3} align="start">
              {STAGES.map((s) => (
                <View key={s.id} style={{ flex: 1, gap: th.space(2) }}>
                  <Row justify="between"><Badge tone={s.tone}>{t(s.label)}</Badge><Text size="sm" tone="muted">{by(s.id).length}</Text></Row>
                  {by(s.id).length ? by(s.id).map(card) : <Text size="sm" tone="subtle" align="center">{t('{{hint}} — koi nahi', { hint: t(s.hint) })}</Text>}
                </View>
              ))}
            </Row>
          ) : (
            <>
              <ChipGroup value={stage} onChange={setStage} style={{ marginHorizontal: -th.space(4) }}
                options={[...STAGES.map((s) => ({ value: s.id, label: t(s.label), count: by(s.id).length })), { value: 'done' as const, label: t('Mukammal'), count: by('done').length }]} />
              {stage === 'done'
                ? (by('done').length ? <Card flush>{by('done').map((o, i, a) => (
                  <ListRow key={o.id} dense divider={i < a.length - 1} title={`${o.token ? `#${o.token} · ` : ''}${o.customerName ?? o.orderNumber}`} subtitle={o.delivery?.rider?.name ?? '—'}
                    trailing={<Amount value={o.total} />} onPress={() => router.push(`/restaurant/orders/${o.id}` as never)} />
                ))}</Card> : <Text tone="muted" align="center">{t('Koi nahi')}</Text>)
                : by(stage).length ? by(stage).map(card) : <Text tone="muted" align="center">{t('{{hint}} — koi nahi', { hint: t(STAGES.find((s) => s.id === stage)?.hint ?? '') })}</Text>}
            </>
          )}
        </View>
      </Screen>
      {assign && <AssignSheet order={assign} onClose={() => setAssign(null)} onDone={() => { refreshOrders(); setAssign(null); }} />}
      {fail && <FailSheet order={fail} saving={step.isPending} onClose={() => setFail(null)} onConfirm={(reason) => step.mutate({ id: fail.id, status: 'FAILED', failureReason: reason })} />}
      {settle && <SettleSheet rider={settle} onClose={() => setSettle(null)} onDone={() => { refreshOrders(true); setSettle(null); }} />}
    </>
  );
}

function DeliveryCard({ o, canManage, busy, onAssign, onFail, onStep }: {
  o: BoardOrder; canManage: boolean; busy: boolean; onAssign: () => void; onFail: () => void; onStep: (s: string) => void;
}) {
  const th = useTheme();
  const rider = o.delivery?.rider;
  const ready = o.items.length > 0 && o.items.every((i) => i.status === 'READY' || i.status === 'SERVED');
  const age = minutesSince(o.createdAt);
  return (
    <Card onPress={() => router.push(`/restaurant/orders/${o.id}` as never)}>
      <View style={{ gap: th.space(1.5) }}>
        <Row justify="between" gap={2}>
          <Text weight="bold" numberOfLines={1} style={{ flex: 1 }}>{o.token ? `#${o.token} · ` : ''}{o.customerName || o.orderNumber}</Text>
          <Badge tone={age > 45 ? 'danger' : 'neutral'}>{duration(age)}</Badge>
        </Row>
        {o.deliveryAddress && <Row gap={1.5} align="start"><MapPin size={14} color={th.colors.textMuted} /><Text size="sm" tone="secondary" numberOfLines={2} style={{ flex: 1 }}>{o.deliveryAddress}</Text></Row>}
        <Text size="xs" tone="muted" numberOfLines={1}>{o.items.map((i) => `${i.quantity}× ${i.product?.name ?? ''}`).join(', ')}</Text>
        <Row justify="between">
          <Text size="xs" tone={rider ? 'secondary' : ready ? 'success' : 'muted'} weight={ready && !rider ? 'semibold' : 'regular'}>{rider ? `🛵 ${rider.name}` : ready ? t('Khana tayyar') : t('Kitchen me')}</Text>
          <Amount value={o.due || o.total} weight="bold" />
        </Row>
        {canManage && o.stage !== 'done' && (
          <Row gap={1.5} wrap>
            {o.customerPhone && <IconButton icon={Phone} label={t('Customer ko call')} size="sm" variant="soft" onPress={() => void Linking.openURL(`tel:${o.customerPhone}`)} />}
            {(o.stage === 'needsRider' || o.stage === 'assigned') && <Button size="sm" variant={o.stage === 'needsRider' ? 'primary' : 'ghost'} icon={Bike} onPress={onAssign}>{rider ? t('Badlein') : t('Rider lagayein')}</Button>}
            {o.stage === 'assigned' && <Button size="sm" icon={Navigation} loading={busy} onPress={() => onStep('PICKED_UP')}>{t('Nikal gaya')}</Button>}
            {o.stage === 'onTheWay' && <Button size="sm" variant="success" icon={PackageCheck} loading={busy} onPress={() => onStep('DELIVERED')}>{t('Deliver')}</Button>}
            {(o.stage === 'assigned' || o.stage === 'onTheWay') && <IconButton icon={XCircle} label={t('Delivery nahi hui')} size="sm" variant="danger" onPress={onFail} />}
            {o.stage === 'cash' && <Text size="xs" weight="medium" tone="warning">{t('Rider se cash lena hai')}</Text>}
          </Row>
        )}
      </View>
    </Card>
  );
}

function AssignSheet({ order, onClose, onDone }: { order: BoardOrder; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const { data: riders = [], isLoading } = useQuery({ queryKey: [MENU_KEYS.riders, 'active'], queryFn: () => ridersManageApi.list() });
  const [riderId, setRiderId] = useState(order.delivery?.riderId ?? '');
  const [fee, setFee] = useState<number | null>(null);
  const save = useMutation({
    mutationFn: () => deliveryBoardApi.assign(order.id, { riderId, ...(fee && fee > 0 ? { riderCommission: fee } : {}) }),
    onSuccess: () => { toast.success(t('Rider lag gaya')); onDone(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const usable = riders.filter((r) => r.status === 'ACTIVE' || r.status === 'BUSY');
  return (
    <Sheet open onClose={onClose} title={t('{{value}} — rider', { value: order.customerName || order.orderNumber })} description={order.deliveryAddress ?? undefined}
      footer={<Button size="lg" fullWidth disabled={!riderId} loading={save.isPending} onPress={() => save.mutate()}>{t('Rider lagayein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {isLoading ? <Skeleton height={120} /> : !usable.length ? (
          <EmptyState icon={Bike} title={t('Koi rider duty par nahi.')} action={<Button variant="secondary" onPress={() => { onClose(); router.push('/restaurant/riders' as never); }}>{t('Riders')}</Button>} />
        ) : (
          <Card flush>
            {usable.map((r, i) => (
              <ListRow key={r.id} divider={i < usable.length - 1} title={r.name} selected={riderId === r.id} onPress={() => setRiderId(r.id)}
                subtitle={`${r.phone}${r.vehicleNumber ? ` · ${r.vehicleNumber}` : ''}${r.cashDue ? t(' · cash {{cashDue}}', { cashDue: formatPKR(r.cashDue) }) : ''}`}
                trailing={<Badge tone={r.status === 'BUSY' ? 'warning' : 'success'}>{r.status === 'BUSY' ? t('{{value}} trip', { value: r.activeTrips ?? 1 }) : t('Free')}</Badge>} />
            ))}
          </Card>
        )}
        <NumberInput label={t('Rider ka kiraya (marzi)')} value={fee} onChangeValue={setFee} prefix="Rs" hint={t('Cash lete waqt drawer se de sakte hain — tab yeh Expense me khud likh jata hai')} />
      </View>
    </Sheet>
  );
}

function FailSheet({ order, saving, onConfirm, onClose }: { order: BoardOrder; saving: boolean; onConfirm: (reason: string) => void; onClose: () => void }) {
  const th = useTheme();
  const [reason, setReason] = useState('');
  const reasons = [t('Customer ne phone nahi uthaya'), t('Ghalat pata'), t('Customer ne lene se mana kiya'), t('Bike kharab')];
  return (
    <Sheet open onClose={onClose} title={t('Delivery nahi hui')} description={t('Rider free ho jata hai. Order khula rehta hai — naya rider lagayein ya order cancel karein.')}
      footer={<Button size="lg" fullWidth variant="danger" loading={saving} disabled={reason.trim().length < 3} onPress={() => onConfirm(reason.trim())}>{t('Save karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Row gap={1.5} wrap>{reasons.map((r) => <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />)}</Row>
        <Input label={t('Wajah')} value={reason} onChangeText={(v) => setReason(v.slice(0, 300))} placeholder={t('Wajah')} />
        <Text size="xs" tone="muted" ltr>{order.orderNumber}</Text>
      </View>
    </Sheet>
  );
}

function SettleSheet({ rider, onClose, onDone }: { rider: RiderCash; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const can = usePermission();
  const canExpense = can(P.EXPENSES_CREATE);
  const [pick, setPick] = useState<Set<string>>(() => new Set(rider.orders.filter((o) => o.status === 'DELIVERED').map((o) => o.id)));
  const [payFee, setPayFee] = useState(true);
  const totals = useMemo(() => settleTotals(rider.orders, pick, canExpense && payFee), [rider.orders, pick, canExpense, payFee]);
  const paying = canExpense && payFee && totals.fee > 0;
  const save = useMutation({
    mutationFn: () => deliveryBoardApi.settle(rider.rider.id, [...pick], paying),
    onSuccess: (r) => {
      if (r.settled.length) toast.success(t('{{amount}} cash mila — {{count}} bill ban gaye', { amount: formatPKR(r.amount), count: r.settled.length }));
      if (r.riderFee?.error) toast.error(r.riderFee.error);
      else if (r.riderFee?.amount) toast.success(t('Rider ko {{amount}} kiraya diya — Expense {{value}}', { amount: formatPKR(r.riderFee.amount), value: r.riderFee.expenseNumbers.join(', ') }));
      r.failed.forEach((f) => toast.error(`${f.orderNumber}: ${f.error}`));
      onDone();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const toggle = (id: string) => setPick((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <Sheet open onClose={onClose} title={t('{{name}} se cash lein', { name: rider.rider.name })} description={t('Har chuna hua order cash bill ban jata hai — drawer aur day book me abhi jata hai')} height={0.85}
      footer={<View style={{ gap: th.space(2) }}>
        <Row justify="between"><Text tone="secondary">{paying ? t('Drawer me') : t('Lena hai')}</Text><Amount value={totals.drawer} size="xl" weight="bold" /></Row>
        <Button size="lg" fullWidth icon={CheckCircle2} disabled={!pick.size} loading={save.isPending} onPress={() => save.mutate()}>{t('Cash mil gaya')}</Button>
      </View>}>
      <View style={{ gap: th.space(3) }}>
        <Card flush>
          {rider.orders.map((o, i) => (
            <ListRow key={o.id} divider={i < rider.orders.length - 1} selected={pick.has(o.id)} onPress={() => toggle(o.id)}
              title={o.customerName || o.orderNumber} subtitle={`${o.orderNumber} · ${o.status === 'DELIVERED' ? t('deliver ho gaya') : t('abhi raste me')}`}
              trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={o.due} weight="bold" />{(o.riderFee ?? 0) > 0 && <Text size="2xs" tone="muted">{t('kiraya {{formatPKR}}', { formatPKR: formatPKR(o.riderFee ?? 0) })}</Text>}</View>} />
          ))}
        </Card>
        {totals.fee > 0 && (canExpense ? (
          <Card tone="warning">
            <Checkbox value={payFee} onChange={setPayFee} label={t('Rider ka kiraya {{fee}} abhi drawer se dein', { fee: formatPKR(totals.fee) })} description={t('Cash Expense ban jata hai, taake drawer aur profit dono sahi rahein')} />
          </Card>
        ) : <Text size="xs" tone="muted">{t('Rider ka kiraya {{fee}} — drawer se dene ke liye Expense likhne ki permission chahiye', { fee: formatPKR(totals.fee) })}</Text>)}
      </View>
    </Sheet>
  );
}

