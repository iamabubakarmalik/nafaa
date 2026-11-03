/**
 * Work steps of cake and bulk orders shared by the lists and the detail
 * screen: next and previous step, money received, cancel, the advance
 * refund and the bill at hand-over, with their sheets.
 */

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { BULK_PREV, CAKE_PREV, bulkLines, bulkNext, bulkPrice, cakeNext, dueOf, type BakeryOrderStatus } from '@nafaa/core/bakery';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { haptic } from '@/core/device/haptics';
import { toast } from '@/design';
import { bulkOrdersApi, cakeOrdersApi, type BulkOrder, type CakeOrder } from '../api';
import { BULK_KEY, CAKE_KEY, cakeLine, refreshBakery, statusOf } from '../meta';
import { CancelSheet, DeliverSheet, PaySheet, RefundSheet, type OrderForBill } from './OrderSheets';

function cakeBill(o: CakeOrder): OrderForBill {
  return {
    kind: 'cake', id: o.id, orderNumber: o.orderNumber, customerName: o.customerName, customerPhone: o.customerPhone,
    total: Number(o.total || 0), paid: Number(o.paidAmount || 0), customerId: o.customerId ?? null,
    lines: [{ productId: o.productId ?? undefined, name: `${t('Cake')} — ${cakeLine(o)}`, qty: 1, rate: Number(o.total || 0) }],
  };
}

function bulkBill(o: BulkOrder): OrderForBill {
  const lines = bulkLines(o.items);
  const total = bulkPrice(o);
  return {
    kind: 'bulk', id: o.id, orderNumber: o.orderNumber, customerName: o.organizationName || o.contactPerson || undefined, customerPhone: o.contactPhone,
    total, paid: Number(o.paidAmount || 0), customerId: o.customerId ?? null,
    lines: lines.length ? lines : [{ name: t('{{name}} ka order', { name: o.organizationName }), qty: 1, rate: total }],
  };
}

type Sheet<T> = { kind: 'pay' | 'cancel' | 'deliver' | 'refund'; o: T } | null;

function useGuard() {
  const online = useOnlineStatus();
  return (run: () => void) => { if (!online) { toast.warning(onlineNeededText('bakeryOrders')); return; } run(); };
}

export function useCakeActions() {
  const guard = useGuard();
  const [sheet, setSheet] = useState<Sheet<CakeOrder>>(null);
  const refresh = () => refreshBakery([CAKE_KEY]);
  const status = useMutation({
    mutationFn: ({ o, to }: { o: CakeOrder; to: BakeryOrderStatus }) => cakeOrdersApi.updateStatus(o.id, to),
    onSuccess: (o) => { haptic('success'); toast.success(`${o.orderNumber}: ${t(statusOf(o.status).label)}`); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Halat nahi badli'))),
  });
  const next = (o: CakeOrder) => guard(() => {
    const n = cakeNext(o);
    if (!n) return;
    if (n.to === 'DELIVER') setSheet({ kind: 'deliver', o });
    else status.mutate({ o, to: n.to });
  });
  const back = (o: CakeOrder) => guard(() => { const prev = CAKE_PREV[o.status]; if (prev) status.mutate({ o, to: prev }); });
  const confirmAgain = (o: CakeOrder) => guard(() => status.mutate({ o, to: 'CONFIRMED' }));
  const open = (kind: 'pay' | 'cancel' | 'refund') => (o: CakeOrder) => guard(() => setSheet({ kind, o }));
  const close = () => setSheet(null);
  const o = sheet?.o;

  const sheets = o ? (
    <>
      <PaySheet open={sheet?.kind === 'pay'} name={`${o.customerName} · ${o.orderNumber}`} due={dueOf(o)}
        advanceLeft={Math.max(Number(o.advanceRequired || 0) - Number(o.paidAmount || 0), 0)}
        onPay={(amount, method) => cakeOrdersApi.addPayment(o.id, amount, o.paidAmount, { method })}
        onClose={close} onDone={() => { close(); refresh(); }} />
      <CancelSheet open={sheet?.kind === 'cancel'} title={`${o.customerName} · ${o.orderNumber}`} paid={Number(o.paidAmount || 0)}
        onConfirm={(reason) => cakeOrdersApi.updateStatus(o.id, 'CANCELLED', reason || undefined).then(refresh)} onClose={close} />
      <RefundSheet open={sheet?.kind === 'refund'} title={`${o.customerName} · ${o.orderNumber}`} loadMoney={() => cakeOrdersApi.getOne(o.id)}
        onRefund={(pin) => cakeOrdersApi.refund(o.id, pin)} onClose={close} onDone={() => { close(); refreshBakery([CAKE_KEY], true); }} />
      <DeliverSheet open={sheet?.kind === 'deliver'} order={cakeBill(o)} onClose={close} onDone={close}
        loadMoney={() => cakeOrdersApi.getOne(o.id)}
        recordPayment={(amount, expectedPaid, method) => cakeOrdersApi.addPayment(o.id, amount, expectedPaid, { method, withBill: true })}
        markDelivered={() => cakeOrdersApi.updateStatus(o.id, 'DELIVERED')}
        findBill={() => cakeOrdersApi.bill(o.id)} />
    </>
  ) : null;

  return {
    next, back, confirmAgain, pay: open('pay'), cancel: open('cancel'), refund: open('refund'),
    busyId: status.isPending ? status.variables?.o.id : undefined,
    sheets,
  };
}

export function useBulkActions() {
  const guard = useGuard();
  const [sheet, setSheet] = useState<Sheet<BulkOrder>>(null);
  const refresh = () => refreshBakery([BULK_KEY]);
  const status = useMutation({
    mutationFn: ({ o, to }: { o: BulkOrder; to: BakeryOrderStatus }) => bulkOrdersApi.updateStatus(o.id, to),
    onSuccess: (o) => { haptic('success'); toast.success(`${o.orderNumber}: ${t(statusOf(o.status).label)}`); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Halat nahi badli'))),
  });
  const next = (o: BulkOrder) => guard(() => {
    const n = bulkNext(o.status);
    if (!n) return;
    if (n.to === 'DELIVER') setSheet({ kind: 'deliver', o });
    else status.mutate({ o, to: n.to });
  });
  const back = (o: BulkOrder) => guard(() => { const prev = BULK_PREV[o.status]; if (prev) status.mutate({ o, to: prev }); });
  const open = (kind: 'pay' | 'cancel' | 'refund') => (o: BulkOrder) => guard(() => setSheet({ kind, o }));
  const close = () => setSheet(null);
  const o = sheet?.o;
  const total = o ? bulkPrice(o) : 0;

  const sheets = o ? (
    <>
      <PaySheet open={sheet?.kind === 'pay'} name={`${o.organizationName} · ${o.orderNumber}`} due={Math.max(total - o.paidAmount, 0)}
        advanceLeft={Math.max(Math.round(total * 0.5) - o.paidAmount, 0)}
        onPay={(amount, method) => bulkOrdersApi.payment(o.id, amount, o.paidAmount, { method })}
        onClose={close} onDone={() => { close(); refresh(); }} />
      <CancelSheet open={sheet?.kind === 'cancel'} askReason={false} title={`${o.organizationName} · ${o.orderNumber}`} paid={Number(o.paidAmount || 0)}
        onConfirm={() => bulkOrdersApi.updateStatus(o.id, 'CANCELLED').then(refresh)} onClose={close} />
      <RefundSheet open={sheet?.kind === 'refund'} title={`${o.organizationName} · ${o.orderNumber}`} loadMoney={() => bulkOrdersApi.getOne(o.id)}
        onRefund={(pin) => bulkOrdersApi.refund(o.id, pin)} onClose={close} onDone={() => { close(); refreshBakery([BULK_KEY], true); }} />
      <DeliverSheet open={sheet?.kind === 'deliver'} order={bulkBill(o)} onClose={close} onDone={close}
        loadMoney={() => bulkOrdersApi.getOne(o.id)}
        recordPayment={(amount, expectedPaid, method) => bulkOrdersApi.payment(o.id, amount, expectedPaid, { method, withBill: true })}
        markDelivered={() => bulkOrdersApi.updateStatus(o.id, 'DELIVERED')}
        findBill={() => bulkOrdersApi.bill(o.id)} />
    </>
  ) : null;

  return {
    next, back, pay: open('pay'), cancel: open('cancel'), refund: open('refund'),
    busyId: status.isPending ? status.variables?.o.id : undefined,
    sheets,
  };
}
