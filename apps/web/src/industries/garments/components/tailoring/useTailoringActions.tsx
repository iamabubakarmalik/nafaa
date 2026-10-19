/**
 * Work steps of a stitching order shared by the list and the detail page:
 * next and previous step, money before delivery, hand-over with the bill,
 * and cancel, with their dialogs.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TakePaymentModal } from '@modules/pos/components';
import { formatPKR } from '@core/lib/format';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { tailoringApi, type TailoringOrder, type TailoringStatus } from '../../api/tailoring.api';
import { CancelModal } from '../fields';
import { MONEY_KEYS, TAILORING_KEY, TAILORING_PREV, apiError, dueOf, tailoringNext, tailoringStatus } from '../meta';

export function useTailoringActions() {
  const qc = useQueryClient();
  const [payOn, setPayOn] = useState<TailoringOrder | null>(null);
  const [deliverOn, setDeliverOn] = useState<TailoringOrder | null>(null);
  const [cancelOn, setCancelOn] = useState<TailoringOrder | null>(null);
  const refresh = () => [TAILORING_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const status = useMutation({
    mutationFn: ({ o, to }: { o: TailoringOrder; to: TailoringStatus }) => tailoringApi.updateStatus(o.id, to),
    onSuccess: (o) => { toast.success(`${o.orderNumber}: ${tailoringStatus(o.orderStatus).label}`); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Halat nahi badli')),
  });
  const pay = useMutation({
    mutationFn: ({ o, amount, method }: { o: TailoringOrder; amount: number; method: PaymentMethod }) =>
      tailoringApi.addPayment(o.id, { amount, paymentMethod: method }),
    onSuccess: (o) => { toast.success(`${o.orderNumber}: payment darj — baqi ${formatPKR(dueOf(o))}`); setPayOn(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Payment darj nahi hui')),
  });
  const deliver = useMutation({
    mutationFn: ({ o, amount, method }: { o: TailoringOrder; amount: number; method: PaymentMethod }) =>
      tailoringApi.updateStatus(o.id, 'DELIVERED', { paidNow: amount, paymentMethod: method }),
    onSuccess: (o) => {
      const left = dueOf(o);
      toast.success(`${o.orderNumber} de diya — bill ${o.bill?.saleNumber ?? 'ban gaya'}${left > 0.5 ? ` · ${formatPKR(left)} khate me` : ''}`);
      setDeliverOn(null); refresh();
    },
    onError: (e) => toast.error(apiError(e, 'Deliver nahi hua')),
  });

  const next = (o: TailoringOrder) => {
    const n = tailoringNext(o.orderStatus);
    if (!n) return;
    if (n.to === 'DELIVER') setDeliverOn(o);
    else status.mutate({ o, to: n.to });
  };
  const back = (o: TailoringOrder) => {
    const prev = TAILORING_PREV[o.orderStatus];
    if (prev) status.mutate({ o, to: prev });
  };
  const setStatus = (o: TailoringOrder, to: TailoringStatus) => status.mutate({ o, to });

  const modals = (
    <>
      {payOn && (
        <TakePaymentModal title="Advance / payment" description={`${payOn.customerName ?? ''} · ${payOn.orderNumber} · ${formatPKR(dueOf(payOn))} baqi`}
          amount={dueOf(payOn)} max={dueOf(payOn)} loading={pay.isPending}
          hint="Yeh paisa customer ke khate me advance ban kar jama hota hai; suit dete waqt bill me kat jata hai."
          onConfirm={(amount, method) => pay.mutate({ o: payOn, amount, method })} onClose={() => setPayOn(null)} />
      )}
      {deliverOn && (
        <TakePaymentModal title="Suit de diya — bill" confirmLabel="Bill banayein"
          description={`${deliverOn.customerName ?? ''} · ${deliverOn.orderNumber} · kul ${formatPKR(deliverOn.total)}, advance ${formatPKR(deliverOn.paidAmount)}`}
          amount={dueOf(deliverOn)} max={dueOf(deliverOn)} allowZero loading={deliver.isPending}
          onConfirm={(amount, method) => deliver.mutate({ o: deliverOn, amount, method })} onClose={() => setDeliverOn(null)} />
      )}
      {cancelOn && (
        <CancelModal title={`${cancelOn.customerName ?? ''} · ${cancelOn.orderNumber}`} paid={Number(cancelOn.paidAmount || 0)}
          onConfirm={(reason) => tailoringApi.updateStatus(cancelOn.id, 'CANCELLED', { cancellationReason: reason || undefined }).then(refresh)}
          onClose={() => setCancelOn(null)} />
      )}
    </>
  );

  return {
    next, back, setStatus,
    pay: setPayOn, deliver: setDeliverOn, cancel: setCancelOn,
    busyId: status.isPending ? status.variables?.o.id : undefined,
    modals,
  };
}

export type TailoringActions = ReturnType<typeof useTailoringActions>;
