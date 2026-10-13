/**
 * Work steps of a cake order shared by the list and the detail page: next
 * and previous step, money received, cancel, and the bill at hand-over,
 * with their dialogs.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cakeOrdersApi, type BakeryOrderStatus, type CakeOrder } from '../../api/cake-orders.api';
import { OrderDeliverModal, type OrderForBill } from '../OrderDeliverModal';
import { CancelModal, PayModal } from '../OrderModals';
import { CAKE_KEY, CAKE_PREV, apiError, cakeLine, cakeNext, dueOf, isDelivery, statusOf } from '../meta';

function cakeBill(o: CakeOrder): OrderForBill {
  return {
    kind: 'cake', id: o.id, orderNumber: o.orderNumber, customerName: o.customerName, customerPhone: o.customerPhone,
    total: Number(o.total || 0), paid: Number(o.paidAmount || 0),
    lines: [{ productId: o.productId ?? undefined, name: `Cake — ${cakeLine(o)}`, qty: 1, rate: Number(o.total || 0) }],
    deliveryAddress: isDelivery(o.deliveryType) ? o.deliveryAddress ?? undefined : undefined,
  };
}

export function useCakeActions(shopName: string) {
  const qc = useQueryClient();
  const [payOn, setPayOn] = useState<CakeOrder | null>(null);
  const [cancelOn, setCancelOn] = useState<CakeOrder | null>(null);
  const [deliverOn, setDeliverOn] = useState<CakeOrder | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: [CAKE_KEY] });

  const status = useMutation({
    mutationFn: ({ o, to, reason }: { o: CakeOrder; to: BakeryOrderStatus; reason?: string }) => cakeOrdersApi.updateStatus(o.id, to, reason),
    onSuccess: (o) => { toast.success(`${o.orderNumber}: ${statusOf(o.status).label}`); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Halat nahi badli')),
  });

  const next = (o: CakeOrder) => {
    const n = cakeNext(o);
    if (!n) return;
    if (n.to === 'DELIVER') setDeliverOn(o);
    else status.mutate({ o, to: n.to });
  };
  const back = (o: CakeOrder) => {
    const prev = CAKE_PREV[o.status];
    if (prev) status.mutate({ o, to: prev });
  };
  const confirm = (o: CakeOrder) => status.mutate({ o, to: 'CONFIRMED' });

  const modals = (
    <>
      {payOn && (
        <PayModal name={`${payOn.customerName} · ${payOn.orderNumber}`} due={dueOf(payOn)}
          advanceLeft={Math.max(Number(payOn.advanceRequired || 0) - Number(payOn.paidAmount || 0), 0)}
          onPay={(amount) => cakeOrdersApi.addPayment(payOn.id, amount, payOn.paidAmount)}
          onClose={() => setPayOn(null)} onDone={() => { setPayOn(null); refresh(); }} />
      )}
      {cancelOn && (
        <CancelModal title={`${cancelOn.customerName} · ${cancelOn.orderNumber}`} paid={Number(cancelOn.paidAmount || 0)}
          onConfirm={(reason) => cakeOrdersApi.updateStatus(cancelOn.id, 'CANCELLED', reason || undefined).then(refresh)}
          onClose={() => setCancelOn(null)} />
      )}
      {deliverOn && (
        <OrderDeliverModal order={cakeBill(deliverOn)} shopName={shopName}
          onClose={() => setDeliverOn(null)} onDone={() => setDeliverOn(null)}
          recordPayment={(amount) => cakeOrdersApi.addPayment(deliverOn.id, amount, deliverOn.paidAmount)}
          markDelivered={() => cakeOrdersApi.updateStatus(deliverOn.id, 'DELIVERED')}
          findBill={() => cakeOrdersApi.bill(deliverOn.id)} />
      )}
    </>
  );

  return {
    next, back, confirm,
    pay: setPayOn, cancel: setCancelOn, deliver: setDeliverOn,
    busyId: status.isPending ? status.variables?.o.id : undefined,
    modals,
  };
}
