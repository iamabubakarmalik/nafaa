/**
 * Work steps of a bulk order shared by its screens: next and previous
 * step, money received, cancel and the bill at hand-over, with the dialogs.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { bulkOrdersApi, type BulkOrder } from '../../api/bulk-orders.api';
import type { BakeryOrderStatus } from '../../api/cake-orders.api';
import { OrderDeliverModal, type OrderForBill } from '../OrderDeliverModal';
import { CancelModal, PayModal } from '../OrderModals';
import { BULK_KEY, BULK_PREV, apiError, bulkNext, bulkPrice, statusOf } from '../meta';

export function bulkLines(o: BulkOrder) {
  return (Array.isArray(o.items) ? o.items : []).map((i: Record<string, unknown>) => ({
    productId: typeof i.productId === 'string' ? i.productId : undefined,
    name: String(i.name ?? i.productName ?? 'Cheez'),
    qty: Number(i.qty ?? i.quantity ?? 0) || 0,
    rate: Number(i.rate ?? i.price ?? 0) || 0,
    unit: typeof i.unit === 'string' ? i.unit : undefined,
  }));
}

function bulkBill(o: BulkOrder): OrderForBill {
  const lines = bulkLines(o);
  const total = bulkPrice(o);
  return {
    kind: 'bulk', id: o.id, orderNumber: o.orderNumber, customerName: o.organizationName || o.contactPerson, customerPhone: o.contactPhone,
    total, paid: Number(o.paidAmount || 0), customerId: o.customerId ?? null,
    lines: lines.length ? lines : [{ name: `${o.organizationName} ka order`, qty: 1, rate: total }],
    deliveryAddress: o.requiresDelivery ? o.deliveryAddress || o.venue || undefined : undefined,
  };
}

export function useBulkActions(shopName: string) {
  const qc = useQueryClient();
  const [payOn, setPayOn] = useState<BulkOrder | null>(null);
  const [cancelOn, setCancelOn] = useState<BulkOrder | null>(null);
  const [deliverOn, setDeliverOn] = useState<BulkOrder | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: [BULK_KEY] });

  const status = useMutation({
    mutationFn: ({ o, to }: { o: BulkOrder; to: BakeryOrderStatus }) => bulkOrdersApi.updateStatus(o.id, to),
    onSuccess: (o) => { toast.success(`${o.orderNumber}: ${statusOf(o.status).label}`); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Halat nahi badli')),
  });
  const next = (o: BulkOrder) => {
    const n = bulkNext(o.status);
    if (!n) return;
    if (n.to === 'DELIVER') setDeliverOn(o);
    else status.mutate({ o, to: n.to });
  };
  const back = (o: BulkOrder) => {
    const prev = BULK_PREV[o.status as BakeryOrderStatus];
    if (prev) status.mutate({ o, to: prev });
  };

  const modals = (
    <>
      {payOn && (
        <PayModal name={`${payOn.organizationName} · ${payOn.orderNumber}`} due={Math.max(bulkPrice(payOn) - payOn.paidAmount, 0)}
          advanceLeft={Math.max(Math.round(bulkPrice(payOn) * 0.5) - payOn.paidAmount, 0)}
          onPay={(amount, method) => bulkOrdersApi.payment(payOn.id, amount, payOn.paidAmount, { method })}
          onClose={() => setPayOn(null)} onDone={() => { setPayOn(null); refresh(); }} />
      )}
      {cancelOn && (
        <CancelModal title={`${cancelOn.organizationName} · ${cancelOn.orderNumber}`} paid={Number(cancelOn.paidAmount || 0)} askReason={false}
          onConfirm={() => bulkOrdersApi.updateStatus(cancelOn.id, 'CANCELLED').then(refresh)} onClose={() => setCancelOn(null)} />
      )}
      {deliverOn && (
        <OrderDeliverModal order={bulkBill(deliverOn)} shopName={shopName}
          onClose={() => setDeliverOn(null)} onDone={() => setDeliverOn(null)}
          loadMoney={() => bulkOrdersApi.getOne(deliverOn.id)}
          recordPayment={(amount, expectedPaid, method) => bulkOrdersApi.payment(deliverOn.id, amount, expectedPaid, { method, withBill: true })}
          markDelivered={() => bulkOrdersApi.updateStatus(deliverOn.id, 'DELIVERED')}
          findBill={() => bulkOrdersApi.bill(deliverOn.id)} />
      )}
    </>
  );

  return { next, back, pay: setPayOn, cancel: setCancelOn, busyId: status.isPending ? status.variables?.o.id : undefined, modals };
}
