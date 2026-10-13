/**
 * One-click order actions for list rows: accept, confirm the call, next
 * step, book a courier, courier label and cancel. Each goes through the same
 * endpoints the order drawer uses, so stock, bill and courier rules stay one.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiErrorMessage, couriersApi, onlineOrdersApi, unmatchedFromError, type OnlineOrder } from '../../api/online-orders.api';
import { LIVE_ORDERS_KEY } from '../../hooks/useLiveOnlineOrders';
import { NEXT_ACTION, STATUS_LABEL } from '../../lib/labels';
import { isClosed, orderNo } from '../../lib/orders';
import { COURIERS_KEY } from '../couriers/CourierForms';

export type QuickAction =
  | { kind: 'accept' }
  | { kind: 'confirm' }
  | { kind: 'next' }
  | { kind: 'book'; courier: string }
  | { kind: 'label' }
  | { kind: 'cancel'; reason: string };

/** What a row can offer right now. */
export function orderOptions(o: OnlineOrder) {
  const closed = isClosed(o);
  return {
    accept: o.orderStatus === 'PENDING',
    confirm: o.isCod && o.paymentStatus !== 'PAID' && !closed && !o.dispatchedAt && o.confirmation?.result !== 'CONFIRMED' && o.orderStatus !== 'PENDING',
    // Handing over without a courier booking needs the CN form in the drawer.
    next: !!o.nextStatus && !!o.nafaaSaleId && !(o.nextStatus === 'OUT_FOR_DELIVERY' && !o.courierBooked),
    nextLabel: NEXT_ACTION[o.orderStatus] ?? 'Aage',
    book: !!o.nafaaSaleId && ['CONFIRMED', 'PREPARING', 'READY'].includes(o.orderStatus) && !o.courierBooked && !o.dispatchedAt && o.integration?.type !== 'DARAZ',
    label: !!o.courierBooked && o.orderStatus !== 'RETURNED',
    invoice: !!o.nafaaSaleId,
    cancel: !closed && o.orderStatus !== 'DELIVERED' && !o.dispatchedAt,
  };
}

export function useOrderActions(onNeedsDrawer: (id: string) => void) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data: accounts } = useQuery({ queryKey: COURIERS_KEY, queryFn: couriersApi.list, staleTime: 5 * 60_000 });
  const couriers = (accounts ?? []).filter((a) => a.connected && a.active);

  const refresh = (id: string) => {
    qc.invalidateQueries({ queryKey: ['online-orders'] });
    qc.invalidateQueries({ queryKey: ['online-order', id] });
    qc.invalidateQueries({ queryKey: ['online-report'] });
    qc.invalidateQueries({ queryKey: LIVE_ORDERS_KEY });
    qc.invalidateQueries({ queryKey: COURIERS_KEY });
  };

  const m = useMutation({
    mutationFn: async ({ o, a }: { o: OnlineOrder; a: QuickAction }): Promise<string> => {
      switch (a.kind) {
        case 'accept': {
          const r = await onlineOrdersApi.accept(o.id);
          return `Bill ban gaya — ${r.sale.saleNumber}`;
        }
        case 'confirm':
          await onlineOrdersApi.setConfirmation(o.id, 'CONFIRMED');
          return 'Customer ne order confirm kiya';
        case 'next': {
          const r = await onlineOrdersApi.bulk('next', [o.id]);
          if (!r.done) throw new Error(r.results[0]?.error ?? 'Agla qadam nahi hua');
          return o.nextStatus ? STATUS_LABEL[o.nextStatus].label : 'Ho gaya';
        }
        case 'book': {
          const r = await couriersApi.book(o.id, { courier: a.courier });
          return `Book ho gaya · CN ${r.trackingNumber}`;
        }
        case 'label':
          await couriersApi.openLabel(o.id);
          return '';
        case 'cancel':
          await onlineOrdersApi.cancel(o.id, a.reason);
          return o.nafaaSaleId ? 'Order cancel — bill void, stock wapas' : 'Order cancel ho gaya';
      }
    },
    onMutate: ({ o }) => setBusyId(o.id),
    onSettled: () => setBusyId(null),
    onSuccess: (msg, { o }) => { if (msg) toast.success(`#${orderNo(o)} · ${msg}`); refresh(o.id); },
    onError: (err, { o, a }) => {
      // Items not linked to Nafaa products: the drawer opens the matching screen.
      if (a.kind === 'accept' && (unmatchedFromError(err) !== null || (err as { response?: { status?: number } })?.response?.status === 409)) {
        toast.message(`#${orderNo(o)} · kuch items Nafaa product se jodne hain`);
        onNeedsDrawer(o.id);
        return;
      }
      toast.error(apiErrorMessage(err, 'Nahi hua'));
      refresh(o.id);
    },
  });

  return {
    couriers,
    busyId,
    run: (o: OnlineOrder, a: QuickAction) => m.mutate({ o, a }),
    pending: m.isPending,
  };
}
